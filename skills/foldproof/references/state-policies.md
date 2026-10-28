# State preservation policies

This reference explains how the `state-preserved` and `no-remount` rules decide whether a user's work survived a transition: the per-field policies in `task.state`, why plain before-and-after equality is the wrong oracle, how remounts are detected by node identity rather than by attribute, how transient elements are excluded, and how values are masked in exported evidence. The semantics below are those of `src/oracles/index.ts` and `src/adapters/web/page-scripts.ts` as of 2026-10-28.

Contents

1. Why equality is wrong
2. The policies
3. Scroll anchors
4. No-remount by node identity
5. Transient elements and element loss
6. Masking in evidence
7. Sources

## 1. Why equality is wrong

The council review of the v1.0 spec (`docs/plan/council-2026-10-28.md`) rejected "snapshot before, snapshot after, assert deep-equal" with three observations:

- Reflow legitimately changes `scrollY`. Research 03 section 1.3 measured 1500 before and 1518 after a rotation in Chromium with the content intact. Equality would fail a correct page.
- Media must advance. A video that was playing at 12.0 s should be at a later time after the transition; equal `currentTime` would mean it stalled.
- Autosave legitimately writes storage. A draft editor that persists on resize adds or updates keys; that is the behaviour a positive control (`autosave-updates-storage`) must pass.

So each field class gets its own policy, declared in the scenario under `task.state` and printed in the resolved plan. Exact equality is kept only where the user's own input would change: form values, focus target, selection range.

## 2. The policies

Defaults are shown; `none` disables a check. Every loss is listed in the finding's message, and the raw before and after snapshots are kept in `details`.

| Field | Policy | What is compared | Fails when |
|---|---|---|---|
| `form` | `all` (default), `none`, or a list of locators | Every `input`, `textarea` and `select` value keyed by a stable element key; booleans for checkboxes | A field disappears, or its value differs exactly |
| `focus` | `same-element` (default), `none` | The element key of `document.activeElement` | Focus moved to another element or to nothing, when something was focused before |
| `selection` | `exact` (default), `none` | `[selectionStart, selectionEnd]` of the focused field | The range differs |
| `scroll` | `anchor` (default), `none`; `scroll_tolerance_px` (default 0) | Per scroll container, the first fully visible element before the transition | That anchor is no longer visible inside its container, beyond the tolerance (section 3) |
| `storage` | list of declared `localStorage` and `sessionStorage` keys (default empty, meaning unchecked) | Only the declared keys | A declared key present before is removed or changed. Additions are allowed |
| `history` | `no-loss` (default), `none` | `history.length`, serialised `history.state`, URL without the hash fragment | Length decreased, state changed, or the URL (minus hash) changed |
| `media` | `progress` (default), `none` | Each `video` and `audio`: `currentTime`, `paused`, `ended` | An element disappeared, was playing and is now paused without having ended, or rewound by more than 0.05 s |
| `custom` | optional JS expression | The JSON-serialisable value the expression returns, evaluated before and after | Deep inequality (JSON string comparison) |

Notes on scope: `form: all` covers native controls only; a contenteditable editor needs a `custom` expression that returns its content. `storage` is deliberately opt-in: an undeclared key list means the oracle says nothing about storage, which the report shows in the pass message's field list. `history` compares the URL without the fragment so a page that updates `#section` on reflow does not fail.

Each transition's after-state becomes the baseline for the next step, so a round trip is judged step by step rather than against the original.

## 3. Scroll anchors

At checkpoint the recorder records, for the window and for every scroll container, the first element that is fully visible in that container. After the transition the anchor check (`anchorCheckScript`) finds the same element by key and measures how much of it lies within the container's bounds, widened by `scroll_tolerance_px`. Visible overlap greater than zero passes. A missing anchor element fails with "no longer in the document"; a missing container fails with "scroll container not found"; a container that had no visible candidate before the transition yields a note, not a failure.

This is the behaviour the Google adaptive guideline describes as "scroll position maintained" without demanding a pixel-identical offset. Set a tolerance when the page has sticky headers whose height changes between layouts.

## 4. No-remount by node identity

A framework that unmounts and recreates a subtree on a size change restores values in the best case but still drops focus, selection and in-flight input. Comparing attributes cannot see that, because the new node carries the same attributes.

At checkpoint the recorder stamps each declared control with `data-foldproof-stamp` and keeps a `WeakRef` to the node. At quiescence it resolves the locator again and asks whether the resolved element *is* the retained node. The possible outcomes:

| Outcome | Kind | Message |
|---|---|---|
| Same node at quiescence, present in every observed frame | `pass` | kept node identity |
| Same node at quiescence, missing in some frames of the transition | `review` | kept identity but was missing in N frame(s) |
| Locator now resolves to several or zero elements | `fail` | locator now resolves to N elements |
| A different, connected node matches | `fail` | a different node now matches the locator |
| Original node detached but still alive | `fail` | the original node was detached |
| Original node collected | `fail` | the original node was garbage-collected |
| No controls were stamped | `open` | nothing to check |

The per-frame log (`artifacts.continuity.frames`, one entry per animation frame with viewport, DPR, posture, segment flags, mutation count and missing stamps) is attached so a reviewer can see when the loss happened.

## 5. Transient elements and element loss

`no-element-loss` is scoped to the declared `controls` and `landmarks`. For each locator it records the role and accessible name of the matched elements before, and after the transition requires an element with the same role and name. Locators listed under `transient` (toasts, skeletons, progress indicators) are skipped. A whole-page diff is not a rule because it produces false failures on correct responsive pages, for example a navigation that collapses into a menu button (council finding; ReFLAIR measured generic geometry at low precision).

## 6. Masking in evidence

Form values and storage values can contain personal data. In every exported record (`details`, SARIF `properties.details`, Markdown messages) the oracle masks them:

- A string value becomes its first and last character with the length, for example `H…n (12 chars)`; values of two characters or fewer become `**`. Boolean form values are kept.
- Storage values become `<masked>`; the key names stay visible so a reviewer can see which declared key was lost.
- Selection ranges, focus keys, scroll anchor keys, URLs and history length are not masked, because they are positions and identifiers rather than content.

Screenshots honour the scenario's `mask` selector list. The `custom` expression's return value is not masked; keep secrets out of it.

## 7. Sources

Inspected 2026-10-28.

- Council verdict: `docs/plan/council-2026-10-28.md` ("State preservation is per-field policy, not equality")
- Rotation scroll measurement: `docs/research/03-testing-and-emulation-tooling.md` sections 1.3 and 1.9
- Google adaptive Tier 3 `Config_Changes`, test T-Config_State: https://developer.android.com/docs/quality-guidelines/adaptive-app-quality/tier-3
- Android save UI states (what survives a configuration change): https://developer.android.com/topic/libraries/architecture/saving-states
- ReFLAIR (precision of generic layout oracles): https://seal.ics.uci.edu/publications/2026_FSE.pdf
- Oracle implementation: `src/oracles/index.ts`, `src/adapters/web/page-scripts.ts`, `src/adapters/web/recorder.ts`
