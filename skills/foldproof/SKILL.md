---
name: foldproof
description: Verify that a web task still works after display transitions (fold, unfold, posture, rotate, resize, split, soft keyboard) and at documented device sizes, with reproducible emulated evidence. Use when asked to test or audit responsiveness, foldables, large screens, split-screen, rotation, keyboard overlap, "does the draft survive unfolding", Galaxy Fold / Pixel Fold / Surface Duo / iPhone Duo support, Android adaptive quality tiers, or WCAG reflow and orientation; when a responsive bug must be reproduced in CI; or when writing a foldproof scenario or reading a foldproof report. Not for pixel-diff visual regression, native Android/iOS execution (v0.1 is web via Chromium), or performance.
license: Apache-2.0
compatibility: Node >= 22.12, Chromium via Playwright >= 1.64 (npx playwright install chromium). v0.1 runs on Chromium only (CDP emulation); Firefox and WebKit are not supported yet.
metadata:
  version: "0.1.0"
  corpus-version: "2026-10-28"
  oracle-version: "0.1.0"
  checked: "2026-10-28"
  author: "Allan Kisuule"
  homepage: "https://github.com/La-Cappuccino/foldproof"
---

# foldproof

foldproof produces **reproducible, emulated evidence** that a declared task in a web interface survives a
display transition, and states what it could not check. It is not a screenshot tool, not a proof, and not a
conformance checker. Every result is one of `pass | fail | open | review | notApplicable`; only `pass` means
the check passed. Treat anything else as "not shown to work".

## When to load what

| Situation | Read |
|---|---|
| First time, or unsure what the tool can and cannot establish | `references/platform-boundaries.md` |
| Writing or editing a scenario | `assets/scenario.template.yaml`, then `references/transitions.md`, `references/state-policies.md` |
| Picking devices / explaining a number in a profile | `references/device-profiles.md`, `references/concepts-and-units.md` |
| Reading a report, writing a summary, deciding exit status | `references/evidence-report.md`, `assets/report-template.md` |
| Using it inside an existing Playwright test suite (authenticated app) | `references/playwright-api.md` |
| Android or iOS questions | `references/android.md`, `references/ios.md` (v0.2 adapter recipes; v0.1 reports `review`/`notApplicable`) |

## Workflow

1. **Check the toolchain** once per machine:
   `node scripts/foldproof.mjs doctor` — must report `segments-via-inline-displayFeature: ok` and
   `posture-via-setDevicePostureOverride: ok`. If not, run `npx playwright install chromium` and retry.
2. **Name the task and its controls.** A task is a URL plus the controls the user must still be able to
   operate afterwards (`#send`, `role=button[name='Save draft']`). Each control must resolve to exactly
   one element. Ask the user if you cannot tell which controls matter; do not guess "all buttons".
3. **Pick profiles**: `node scripts/foldproof.mjs profiles list --executable`. Foldables with an opaque
   hinge (Surface Duo) exercise the hinge rule; Pixel Fold / Galaxy Fold have a zero-width fold line
   (hinge rule reports `notApplicable`). `profiles show <id>` prints the resolved viewport, DPR and
   segment rectangles per posture, with the source of every number.
4. **Write the scenario** from `assets/scenario.template.yaml`. Keep the first one small: one start
   configuration, one transition, `assert: preset@1`, one `operate` step that declares the real outcome.
   Validate: `node scripts/foldproof.mjs scenarios validate my.yaml`.
5. **Run**: `node scripts/foldproof.mjs run my.yaml --base-url http://localhost:3000 --out foldproof-report`
   (`--plan` prints the expanded defaults and the coverage manifest without running; `--app-build <id>`
   records the build in the evidence).
6. **Read `foldproof-report/report.md`** top to bottom, including **Untested**, before saying anything.
   Then summarise with `assets/report-template.md`. `foldproof.sarif` uploads to GitHub code scanning;
   `junit.xml` feeds CI dashboards.
7. **Zero-config first look**: `node scripts/foldproof.mjs quick http://localhost:3000` discovers visible
   controls and runs the built-in fold/unfold (or rotate) scenario across executable foldable profiles.
   It is a smoke test, not a task scenario: it has no setup and no outcome, so it cannot see lost drafts.

## Rules the oracles enforce (what a finding means)

| Rule | Passes when | Typical failure |
|---|---|---|
| `env-self-check` | observed viewport, DPR, CSS posture, segment rectangles match the profile after each change | emulation not effective → dependent results are `open`, never `pass` |
| `reachable` | control visible, in viewport after scroll, hit-test at centre + 4 corners resolves to it, enabled, not inert, trial click ok (no real click) | "covered by keyboard-overlay-approx", "not visible", "clipped" |
| `state-preserved` | form exact; focus same element; selection exact; scroll anchor still visible; declared storage keys and history not lost; media not rewound or paused | "form field #body changed", "scroll position lost" |
| `no-remount` | the stamped control is the same DOM node (identity, not attribute) | "the original node was detached" |
| `not-occluded-by-hinge` | control rect does not intersect an opaque hinge mask; `notApplicable` for zero-width fold lines (+ advisory `straddles-fold-line`) | "intersects the vertical hinge mask [540, 574]" |
| `no-element-loss` | controls and landmarks keep an element with the same role + accessible name (transient excluded) | "lost button 'Save draft'" |
| `fills-viewport` (startup) | document width matches the viewport (no letterbox) | fixed-width page |
| `operate` | the one real click produces the declared outcome | "#sent did not become visible" |
| `no-horizontal-overflow`, `target-size` (opt-in `static:`) | diagnostics, warning level, never change the verdict | |

Exit codes: `0` all required pass · `1` any fail · `2` required coverage inconclusive (`open`/`review`) · `3` runner error.

## Gotchas (learned the hard way; see `references/platform-boundaries.md`)

- **Serve from `http://localhost` or https.** On `about:blank`/`file:` the page is not a secure context and
  `navigator.devicePosture` is missing; the self-check flags it.
- **Pages must declare `<meta name="viewport" content="width=device-width">`**, else Chromium lays out
  phones at 980 px and every size check is meaningless.
- **The keyboard is approximated.** Default (`resizes-visual`, Chrome Android / iOS behaviour) = opaque
  overlay of the given height; `interactive-widget=resizes-content` in the page's viewport meta = layout
  viewport shrink. The report names the method. Nothing here shows a real keyboard.
- **Round trips and debounced handlers**: a single transition misses them. Use `steps` with `fold` →
  `unfold` and raise `settle.min_ms` (per step) so the stale job fires inside the observation window.
- **Legitimate change is not loss**: autosave may add storage keys, media may advance, reflow may change
  `scrollY`. If a correct app fails `state-preserved`, narrow the policy (`storage: [keys]`,
  `scroll_tolerance_px`), do not weaken the app.
- **Never call `page.setViewportSize` or `page.screenshot` yourself** when using the Playwright API: both make
  Playwright resend its own viewport and the emulated device silently reverts to the context size. Use
  `fp.transition(...)` and `fp.session.screenshot(file, mask)`. If it happens anyway, the next assertion's
  environment recheck reports `open`, never a false pass.
- Fixtures in `fixtures/` are the benchmark: `node scripts/foldproof.mjs fixtures verify` must report every
  broken variant failing on exactly its named rules. Use them to calibrate before trusting a new oracle.

## What to tell the user

Lead with the verdict and the exit code. List failures with scenario, profile, step, rule and the message
verbatim. Copy the Untested list. State the evidence boundary in one sentence (emulated, Chromium version,
no physical device, relates-to clauses). Propose the smallest fix, pointing at the fixture `ISSUE.md` of the
same failure class when one exists. Never write "proven", "compliant" or "works on <device>".
