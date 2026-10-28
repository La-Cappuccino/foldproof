# Spec: foldproof v0.1 — verify that a task survives display configurations and transitions

Revision 1.1, 2026-10-28. Revision 1.0 (council input) is in git history; the council verdict and the changes it caused are in `docs/plan/council-2026-10-28.md`. Inputs: `docs/research/00–05` (verified 2026-10-28), `docs/vision.md`, `docs/validation.md`.

Working name **foldproof** (npm, GitHub, PyPI free on 2026-10-28). Allan's call; alternative `stillusable`.

## 1. Goal

Give developers and AI agents reproducible, emulated evidence that a **declared task** in a web interface still works after the interface is opened at a documented device configuration (startup class) and after it goes through display transitions — fold, unfold, posture change, rotate, resize, split, keyboard open and close — and state honestly what was *not* checked.

The decision this drives: "can we ship this UI to foldables, tablets, large screens and resizing windows?" answered by a machine-readable record of task continuity, not by a screenshot at 375 px.

Why now (research 04, corrected §2.7): >580 M large-screen Android devices; from Android 16 (API 36) orientation/resizability restrictions are ignored on sw ≥ 600 dp and the temporary opt-out ends at API 37 (Play's API 37 requirement is expected but not yet published); Apple ships iPhone Duo since 2026-10-23 and requires Duo screenshots from April 2027; 44 verified GitHub issues cluster at transitions (keyboard overlap most common, fold/unfold fastest-growing); EN 301 549 + EAA make reflow and orientation legal requirements in the EU/EEA. Of the 19 packages inspected (research 01), none executes a transition and asserts task continuity; vendors ship code-audit skills (Apple App Resizability, Google adaptive), not the verification layer.

## 2. What makes it worth a senior engineer's time (council §2)

Not the device presets, not axe, not SARIF plumbing. These four things:

1. **A task-continuity contract** that runs inside the user's own authenticated Playwright suite: `foldproof/playwright` — `attach(page, profile)`, `transition('unfold')`, `assert(task)`. YAML scenarios compile to it; it is the primary API.
2. **Transition drivers that own the browser's metrics** (CDP, never `setViewportSize`), with an environment self-check after every change so a result is never a false pass on a failed emulation.
3. **Oracles nobody ships**: anchor-based scroll continuity, stamp-based remount detection, per-frame continuity log decided at quiescence, hit-test reachability without a real click, explicit `operate` outcome.
4. **A public benchmark**: broken/fixed fixture pairs that reproduce real issues (ionic #31642, flutter #190508, Signal #15000 classes) plus positive controls, so detection *and* false-alarm rates are measurable for any tool.

The "Untested" ledger (coverage manifest with `open`/`review`/`notApplicable` reasons) stays first-class.

## 3. Non-goals (v0.1)

- Runtime AI layout generation; pixel-diff visual regression; LLM judges in the pass/fail path.
- iOS automation (Duo simulator only via private HID events) — profiles exist; results are `review`.
- Car and TV execution — profiles exist; web adapter reports `notApplicable` with the reason.
- `input-change` transitions (no driver, no rule in v0.1 → not in the schema).
- A device allowlist that drives layout. Profiles seed tests; layouts respond to space and capabilities.
- Firefox/WebKit fold emulation (no engine supports it); they get viewport/rotation/media parity, labelled.
- WCAG conformance claims. Rules link to the clause they *relate to*; a pass is evidence, not conformance.

## 4. Constraints and verified platform facts

- **Stack:** TypeScript, Node ≥ 20, ESM; `playwright` peer `>=1.64 <2` (Chromium 156 bundled). Plain-HTML fixtures served from `http://localhost` by the CLI (secure context; viewport meta declared).
- **Verified 2026-10-28 (research 00 + council corrections):**
  - Viewport segments: inline `displayFeature` on `Emulation.setDeviceMetricsOverride` works while Playwright's viewport emulation is active; the dedicated `setDisplayFeaturesOverride` is a no-op there. One feature only (crbug 40113439).
  - Posture: `Emulation.setDevicePostureOverride` flips `(device-posture: folded)` live, **if** a MediaQueryList for it exists before the override (sentinel via `addInitScript`). On localhost `navigator.devicePosture` and `navigator.virtualKeyboard` exist (the earlier "absent" finding was an about:blank artefact).
  - DPR and viewport change mid-session via CDP without reload (3 → 2, state intact). `page.setViewportSize` resets DPR and drops the display feature → foldproof owns all metrics.
  - No desktop engine shows a real keyboard. Two labelled approximations: `keyboard-shrink` (layout viewport minus height; the `interactive-widget=resizes-content` behaviour) and `keyboard-overlay-approx` (opaque fixed overlay of the keyboard height with hit-testing; the Chrome-Android/iOS default `resizes-visual` behaviour). `env(keyboard-inset-*)` cannot be injected and is not claimed.
- **Packaging:** Agent Skills spec (name = dir, SKILL.md < 500 lines, references one hop, `scripts/` `assets/` `evals/`); Claude Code `.claude-plugin/plugin.json` + `marketplace.json`, no `bin/` at plugin root, no `claude-`/`anthropic-` prefix; `skills-ref validate` + `claude plugin validate --strict` in CI.
- **Licensing:** Apache-2.0 (code), CDLA-Permissive-2.0 (`profiles/`, covers EU database rights), NOTICE for Chromium BSD-3, Playwright Apache-2.0, AOSP Apache-2.0, MDN CC0; DCO sign-off. Imported material keeps its upstream terms; transformed values are marked `derived`.
- **Evidence:** SARIF 2.1.0 canonical; JUnit XML side-channel; Markdown summary.
- No Android SDK or Xcode on the build machine: Android adapter = experimental interface + recipes in v0.1.

## 5. Product shape

```
foldproof/                                  # repo root = plugin root = marketplace root
├── .claude-plugin/{plugin.json, marketplace.json}
├── skills/foldproof/                       # Agent Skill; `npx skills add` target
│   ├── SKILL.md                            # router, < 500 lines
│   ├── references/{concepts-and-units, transitions, state-policies, evidence-report, device-profiles,
│   │               platform-boundaries, playwright-api, android, ios}.md
│   ├── scripts/foldproof.mjs               # launcher: local node_modules/.bin → ../../dist/cli.js → npx -y foldproof@<version>
│   ├── assets/{scenario.template.yaml, report-template.md}
│   ├── agents/openai.yaml
│   └── evals/evals.json
├── src/
│   ├── core/        # zod schemas, loaders, configuration resolver, provenance validator, hashing
│   ├── playwright/  # PUBLIC API: attach · transition · task · assert · operate · report (foldproof/playwright)
│   ├── adapters/web # CDP driver, recorder (addInitScript), keyboard approximations, env self-check, doctor
│   ├── oracles/     # reachable, state-policies, no-remount, hinge, element-loss(scoped), static diagnostics
│   ├── report/      # coverage manifest, SARIF 2.1.0, JUnit, Markdown
│   ├── commands/    # run · profiles · scenarios · fixtures · report · doctor
│   └── cli.ts
├── schemas/         # JSON Schema (generated from zod, committed; CI fails on drift)
├── profiles/        # sourced corpus (CDLA-Permissive-2.0) + LICENSE + README
├── engines/         # browser capability tables generated from @mdn/browser-compat-data (pinned version recorded)
├── scenarios/       # built-in scenarios (used by zero-config run) 
├── fixtures/<name>/{broken,fixed}/index.html + scenario.yaml + ISSUE.md (the real issue it reproduces)
├── tests/           # unit · adapter (localhost) · fixture matrix (broken FAILS on its rule, fixed PASSES, unrelated rules clean)
├── .github/workflows/{ci.yml, foldproof-sarif-action}   # Action uploads SARIF to code scanning
├── README.md · LICENSE · NOTICE · CONTRIBUTING.md · CHANGELOG.md · AGENTS.md · skills.sh.json · package.json
```

One npm package. `exports`: `.` (core), `./playwright` (public API). The CLI is a thin consumer of `./playwright`.

## 6. Data model

### 6.1 Profile (`profiles/*.json`)
Sourced **device and registry facts only**. Required: `id`, `revision`, `kind` (device | emulator-profile | registry-entry), `platform`, `name`, `sources[]` (id, url, publisher, inspected, licence, kind published|derived|measured, `revision` = upstream commit/version when a registry, quote?), `panels[]`, `inputs`, `unknowns[]` (typed: `{field, reason}`), and the optional geometry: `logical[]`, `usable[]`, `display_features[]`, `postures[]` (each with `web: { posture: continuous|folded, segments: 1|2 }` so the self-check expectation is data, not code), `operating_states[]`, `conflicts_with[]`, `keyboard_height_css_px` (optional, kind derived from a cited community measurement, else absent).

Removed from the profile (council): browser `capabilities` (now `engines/*.json`), illustrative window sizes, any `measured` value nobody measured.

Validator: every number has a unit; every published number a `source_ref`; derived numbers state a formula; `unknowns` present; conflicts kept; a folded posture needs a display feature; a posture's `web.segments` must be consistent with its display feature (2 iff a feature is active). A profile is **executable on web** iff it has css_px `logical` + `usable` for a panel; others are valid inventory and `run` reports them `notApplicable: profile not executable (reason)`.

### 6.2 Scenario (`*.yaml`, versioned)
```yaml
foldproof: 1
id: unfold-keeps-draft
title: Unfolding mid-draft keeps the draft; Send stays reachable and works
profiles: [microsoft-surface-duo, google-pixel-9-pro-fold]     # or { class: foldable }
start: { panel: single, posture: closed }                      # names validated against the profile
task:
  url: /compose
  ready: { selector: "#send" }                                   # readiness, bounded by settle.max_ms
  controls: ["#send", "role=button[name='Save draft']"]          # CSS or role+name; must resolve to exactly one element
  state:                                                         # preservation policies (defaults shown)
    form: all            # exact value equality (declared list or all inputs)
    focus: same-element  # same element key
    selection: exact
    scroll: anchor       # first fully visible element per scroll container stays in viewport (tolerance_px: 0)
    storage: ["draft"]   # declared keys only: present before ⇒ present after with equal value; additions allowed
    history: no-loss     # length not decreased; declared state keys equal
    media: progress      # not paused unless paused before; currentTime_after ≥ currentTime_before
    custom: "window.__app.state()"   # optional; deep-equal
  setup: [ { fill: "#body", value: "Hei Per, vedlagt er…" }, { scrollTo: "#para-12" }, { focus: "#body", select: [4, 7] } ]
  # script: ./setup.mjs   # exports setup(page, ctx) for real apps (auth, seed data)
steps:
  - transition: unfold                       # kinds: fold unfold posture rotate resize split keyboard-open keyboard-close
    assert: preset@1                         # = [reachable, state-preserved, no-remount, not-occluded-by-hinge, no-element-loss(controls)]
  - transition: { kind: keyboard-open, to: { keyboard: { height: 300 } } }   # mode chosen from <meta viewport interactive-widget> + engine default
    assert: [reachable]
  - operate: { target: "#send", expect: { visible: ".sent" } }   # explicit outcome; the only real click
settle: { quiet_frames: 2, max_ms: 3000 }
static: [no-horizontal-overflow, target-size]                     # opt-in diagnostics, level warning
expect: { verdict: fail, rules: [state-preserved, no-remount] }   # fixtures only
transient: [".toast"]                                             # excluded from element-loss
```
`steps: []` ⇒ startup-only (startup asserts: reachable, fills-viewport, static). Unknown keys are rejected. Every default is printed in the resolved plan (`--plan`).

### 6.3 Result
SARIF 2.1.0: one `rule` per assertion (`helpUri` → WCAG 1.3.4/1.4.10/2.5.8, Google `Config_Changes`/`Touch_Targets`, EN 301 549 11.1.4.10, marked "relates to"); one `result` per (scenario × profile × step × rule) with `kind` pass|fail|open|review|notApplicable, `level` error for fail else none, `locations[{ physicalLocation: scenario file + line, logicalLocations: [{ kind: element, fullyQualifiedName: selector, properties: { role, name } }] }]`, attachments (before/after PNG, continuity log, state diff with values masked), `properties` { profileId, profileRevision, panel, posture, orientation, viewport, dpr, emulation per signal, evidenceLevel, engine, engineVersion, appBuild, scenarioHash, oracleVersion, observations }. The **coverage manifest** is computed before execution; every expected (scenario × profile × step × rule) ends in exactly one kind. Exit codes: 0 all required pass · 1 any fail · 2 required coverage inconclusive (`open`) · 3 runner error.

## 7. Oracles (decided at quiescence; per-frame log attached)

| Rule | Computation |
|---|---|
| env-self-check (always, before any rule) | expected vs observed after each configuration change: innerWidth/innerHeight, DPR, CSS posture (sentinel MQL), JS posture when present, segment rects (±1 px), orientation. Mismatch ⇒ dependent results `open: emulation not effective`. |
| reachable | control resolves to exactly one element; `scrollIntoViewIfNeeded`; in viewport; `elementFromPoint` at centre + 4 inset points resolves to it or a descendant (another interactive element ⇒ `covered-by`); enabled, not `inert`, `pointer-events` not none; Playwright `click({ trial: true })`. Never a real click. |
| state-preserved | per-field policies (§6.2); raw diff kept as evidence; values masked in exports. |
| no-remount | stamp controls (`data-foldproof-stamp`) + retain node references in the recorder; after: same node identity (not just the attribute). Transient loss (stamp missing in some frames, present at quiescence) ⇒ `review`. |
| not-occluded-by-hinge | only when `maskLength > 0`: control rect ∩ mask = ∅ else fail. `maskLength == 0` ⇒ `notApplicable: no occluding hinge`. Separate advisory `straddles-fold-line` (`review`) in folded posture only. |
| no-element-loss | scoped to `controls` + declared `landmarks`; loss = no element after with the same role + accessible name and not in `transient`. Whole-page diff = diagnostic. |
| operate | the declared target gets a real click once; `expect` (visible selector / url / text / custom) within settle; before-snapshot taken first. |
| fills-viewport (startup) | `documentElement.clientWidth` within tolerance of viewport width; no letterbox. |
| static (opt-in) | `no-horizontal-overflow` = `scrollingElement.scrollWidth > documentElement.clientWidth` (elements listed as diagnostics); `target-size` via axe `target-size`. Level warning. |

Settle: `quiet_frames` consecutive animation frames with no DOM mutations and no viewport change, after `ready`, capped at `max_ms` (timeout ⇒ `open: did not settle`).

## 8. Public API (`foldproof/playwright`) — experimental in v0.1

```ts
const fp = await attach(page, { profile: 'microsoft-surface-duo', start: { posture: 'closed' } }); // before goto: installs recorder + sentinels, owns metrics
await page.goto('/compose'); /* user auth, seeding */
const task = await fp.task({ controls: ['#send'], state: { form: 'all', storage: ['draft'] } });
await task.checkpoint();                 // before-snapshot + stamps
await fp.transition('unfold');           // CDP; env self-check
const r = await task.assert('preset@1'); // findings[]
await fp.operate('#send', { expect: { visible: '.sent' } });
const sarif = fp.report();               // or fp.toSarif(), fp.toJUnit(), fp.toMarkdown()
```
The YAML runner is `runScenario(scenario, profiles, { baseUrl })` built on this API. Adapter interface for Android/iOS is internal and marked unstable.

## 9. Slices (vertical first — council)

| # | Scope | Checkpoint |
|---|---|---|
| 1 | Revised schemas + validator; profiles: Surface Duo, Pixel 9 Pro Fold (hinge data), Galaxy Z Fold 7 (no hinge → review path), Pixel 10 Pro (keyboard); recorder + sentinels; `attach/transition('unfold'/'fold')/task/assert` with env-self-check, reachable, state-preserved (form/focus/selection/scroll-anchor/storage), no-remount, hinge; fixture 2 `draft-lost-on-unfold` broken/fixed; SARIF + MD | fixture 2 broken fails `state-preserved` + `no-remount` and nothing else; fixed passes all; env self-check proves segments; Surface Duo hinge path exercised |
| 2 | rotate, resize/split, keyboard-shrink + keyboard-overlay-approx, posture; `operate`; `steps` sequences; settle; coverage manifest + exit codes; JUnit; masking; `run` + `--plan` | each transition has a passing and a failing fixture-level test; exit codes documented and tested |
| 3 | Fixtures 1 `orientation-locked-layout`, 3 `keyboard-covers-primary-action` (100vh clip + overlay), 4 `control-under-hinge` (Surface Duo), 5 `rotate-loses-scroll-and-selection`, 6 `tabbar-missing-after-keyboard-close` (round trip), 7 `stale-async-layout-after-round-trip`; positives `nav-collapses-correctly`, `autosave-updates-storage`; `fixtures serve/verify`; CI matrix (3 runs + `setCPUThrottlingRate(4)`) | every broken fails only its named rules; every fixed and every positive passes; deterministic |
| 4 | Skill (SKILL.md + 9 references + launcher + evals ≥ 5 incl. negative) + plugin manifests + `skills.sh.json`; zero-config `foldproof run <url>` | `skills-ref validate` + `claude plugin validate --strict`; skill-only install from an unrelated directory runs fixture 2 and reaches the right verdict |
| 5 | Corpus → ≥ 14 (executable count reported separately); `engines/` from BCD; README (first line says "emulated evidence"), CONTRIBUTING (DCO), CHANGELOG, NOTICE, licences; GitHub repo + CI + SARIF upload Action; `npm pack` and publish gate | Codex review + council score; README quick start (browser cached) reproduced by a fresh subagent in < 5 min |

## 10. Assumptions (⚠️ risky)
- ⚠️ Chromium-only fold emulation accepted for v0.1; other engines labelled viewport-only.
- ⚠️ The keyboard approximations are labelled and never claim real-keyboard coverage; a default fixed-footer case stays `review` for the real-keyboard class.
- ⚠️ Name foldproof, licences, single package, GitHub under `La-Cappuccino` — reversible but not free once public.
- Plain-HTML fixtures suffice to prove detection and false-alarm behaviour in v0.1.

## 11. Acceptance (feeds /verify-loop)
1. `npm test` green: unit + adapter + fixture matrix; matrix deterministic over 3 runs with 4× CPU throttle on macOS and ubuntu.
2. Mutation tests: a profile missing a unit, a source, `unknowns`, or a derivation is rejected; an inconsistent `web.segments` is rejected.
3. Every run emits SARIF valid against the 2.1.0 schema (checked in CI), JUnit, and MD with an "Untested" section; the coverage manifest denominator equals expected (scenario × profile × step × rule).
4. Env self-check: a deliberately broken emulation (test double) yields `open`, never `pass`.
5. Positive controls pass; broken fixtures fail only their named rules.
6. `skills-ref validate` + `claude plugin validate --strict` pass; SKILL.md < 500 lines; skill-only install works from an unrelated directory.
7. Codex (`cx`, flagship) review + council score recorded; no blocking finding open at tag.
8. No text in the repo claims proof, physical-device validation, or WCAG conformance.

## 12. Decisions for Allan (proceeding under these; one-line reversals)
1. Name **foldproof**. 2. Apache-2.0 + CDLA-Permissive-2.0 + DCO. 3. Web-first, Chromium fold emulation; Android v0.2. 4. Single package, Playwright peer. 5. Public repo under `La-Cappuccino/foldproof`; npm publish is the one outward step left for Allan to run. 6. The YAML in §6.2 and the API in §8 are experimental public contracts until v0.2.
