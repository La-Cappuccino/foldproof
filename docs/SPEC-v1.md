# Spec: foldproof v0.1 — prove an interface stays usable across configurations and transitions

Status: draft for council review, 2026-10-28. Supersedes `docs/plan/architecture-hypothesis.md`.
Inputs: `docs/research/00–05` (all sources verified 2026-10-28), `docs/vision.md`, `docs/validation.md`.
Working name **foldproof** (npm, GitHub handle, PyPI all free on 2026-10-28; two empty 0-star repos share the name). The name lives in one place (`package.json` + skill dir) and is Allan's call; the alternative is `stillusable`.

## 1. Goal

Give developers and AI agents a way to **prove**, with reproducible evidence, that a named task in an interface is still completable after the interface is opened at a documented device configuration (startup class) and after it goes through a transition (fold, unfold, rotate, resize, split, keyboard open/close, input change) — and to state honestly what was *not* checked.

The decision this drives: "can we ship this UI to foldables, tablets, large screens and resizing windows?" answered by a machine-readable record, not a screenshot at 375 px.

Why now (research 04): Google counts >580 M large-screen Android devices and removes the orientation/resizability opt-out at API 37 (Play deadline Aug 2027); Apple ships iPhone Duo since 2026-10-23 and requires Duo screenshots from April 2027; 44 verified GitHub issues cluster at transitions (keyboard overlap most common, fold/unfold fastest-growing); EN 301 549 + EAA make reflow and orientation legal requirements in the EU/EEA. No vendor or OSS package executes a transition and asserts state (research 01 gaps G2–G5, 04 §4.1).

## 2. Non-goals (v0.1)

- Runtime AI layout generation or per-resize model inference. foldproof verifies; it does not render.
- iOS automation (Duo simulator only via private HID events, research 01 G10) — profiles exist, results are `review: needs physical validation`.
- Car and TV *execution* — profiles and acceptance rules exist; results are `notApplicable` on the web adapter with the reason stated.
- Pixel-diff visual regression and LLM judges (ReFLAIR-style) in the pass/fail path. Both can be layered later; v0.1 oracles are deterministic.
- A device-model allowlist that drives layout. Profiles seed tests; layouts should respond to space and capabilities (concepts.md).
- Firefox/WebKit fold emulation (not available in any engine). They get viewport/rotation/media parity only, labelled as such.

## 3. Constraints

- **Stack:** TypeScript, Node ≥ 20, `@playwright/test` 1.64.x as a peer dependency (Chromium 156 bundled). ESM. No framework in fixtures (plain HTML/JS) so failures are deterministic.
- **Chromium-only fold emulation**, via CDP `Emulation.setDeviceMetricsOverride` with inline `displayFeature` + `devicePosture` (VERIFIED in research 00/03; the dedicated `setDisplayFeaturesOverride` is a no-op while Playwright's viewport emulation is active). Re-apply after every `setViewportSize`. Chromium accepts one display feature (crbug 40113439). `navigator.devicePosture` is absent in Chromium 156 → posture asserted via `matchMedia` only.
- **Virtual keyboard** cannot be shown in any desktop engine. Emulate the two documented layouts: `resizes-content` (shrink layout viewport) and `keyboard-inset` env injection; `resizes-visual` occlusion is reported as `review`.
- **Skill packaging:** Agent Skills spec (agentskills.io): `name` = directory, SKILL.md < 500 lines, references one hop, `scripts/` `assets/` `evals/`. Claude Code: `.claude-plugin/plugin.json` + `marketplace.json`, no `bin/` at plugin root, no `claude-`/`anthropic-` prefix. Validate with `skills-ref validate` and `claude plugin validate --strict`.
- **Licensing:** Apache-2.0 (code), CC BY 4.0 (profile corpus, `profiles/LICENSE`), NOTICE for Chromium (BSD-3) and Playwright (Apache-2.0) device data, DCO sign-off. Do not copy from `responsive-craft` (no licence) or `vercel-labs/agent-skills` (no root LICENSE).
- **Evidence record:** SARIF 2.1.0 canonical (`kind: pass|fail|open|review|notApplicable`), JUnit XML side-channel, Markdown summary for humans and agents.
- No Android SDK or Xcode on the build machine: the Android adapter is an interface + recipes in v0.1, implemented in v0.2 on a machine with the emulator.

## 4. Product shape

```
foldproof/                                  # repo root = plugin root = marketplace root
├── .claude-plugin/{plugin.json, marketplace.json}
├── skills/foldproof/                       # the agent skill (spec-compliant); `npx skills add` target
│   ├── SKILL.md                            # workflow router, < 500 lines
│   ├── references/{concepts-and-units, transitions, state-assertions, evidence-report,
│   │               device-profiles, platform-boundaries, android, ios}.md
│   ├── scripts/foldproof.mjs               # launcher: runs the CLI by interpreter (`node scripts/foldproof.mjs …`)
│   ├── assets/{scenario.template.yaml, report-template.md}
│   ├── agents/openai.yaml                  # Codex metadata
│   └── evals/evals.json                    # prompt → expected behaviour, with/without skill
├── src/
│   ├── core/        # schema types (zod), loaders, validators, units, provenance checks
│   ├── adapters/web # Playwright+CDP driver: open-at-profile, transitions, snapshots
│   ├── oracles/     # reachability, state-diff, overflow, overlap, clipping, target-size (axe), hinge-occlusion, element-loss
│   ├── report/      # SARIF 2.1.0, JUnit, Markdown; coverage + "untested" section
│   └── cli.ts       # run · profiles · scenarios · fixtures · report · doctor
├── schemas/         # JSON Schema for profile, scenario, result (generated from zod, committed)
├── profiles/        # sourced corpus (CC BY 4.0): one JSON per device/registry entry + scenarios
├── scenarios/       # reusable transition scenarios (YAML), validated against schemas/
├── fixtures/<name>/{broken,fixed}/index.html + scenario.yaml   # known failures, both variants
├── tests/           # unit (core, oracles, report) + fixture matrix (broken FAILS, fixed PASSES)
├── .github/workflows/ci.yml
├── README.md · LICENSE · NOTICE · CONTRIBUTING.md · CHANGELOG.md · AGENTS.md · skills.sh.json
└── package.json     # name foldproof, bin → dist/cli.js, files whitelist
```

One npm package in v0.1 (simplicity first); split into `@foldproof/*` only when the Android adapter lands.

## 5. Data model

### 5.1 Profile (`profiles/*.json`, schema `schemas/profile.schema.json`)
From research 02 §5. Required: `id`, `revision`, `kind` (device | emulator-profile | registry-entry), `platform`, `sources[]` (url, publisher, inspected, licence, kind: published | derived | measured, quote?), `panels[]`, `logical[]` (unit css_px | dp | pt, w, h, scale, derivation, source_ref), `usable` (layout viewport, insets, cutouts, unit), `inputs[]`, `capabilities` (web: device_posture_api, viewport_segments… with browser+version from BCD), `unknowns[]` (may be empty, must exist). Foldables add `display_features[]` (bounds, orientation, occlusion, source_ref) and `postures[]` (name, web_posture, android_state, hinge_angle_range?). Optional `conflicts_with[]` (never silently reconciled), `supersedes`.

Validator rules (fail the build): every numeric field has a unit; every published number has a `source_ref`; every derived number states its formula; `unknowns` present; conflicting registries both recorded.

### 5.2 v0.1 corpus (≥ 14 profiles, each with provenance per research 02 §6)
Galaxy Z Fold 7 cover + inner (Playwright, Apache-2.0); Galaxy Z Fold 6 and Pixel 9 Pro Fold (DevTools BSD-3, hinge, `conflicts_with` Playwright); Surface Duo spanned (DevTools, 34 px opaque hinge — canonical occlusion fixture); Asus Zenbook Fold (DevTools); AOSP "7.6 Fold-in with outer display" (Apache-2.0, hinge + posture angle ranges); Pixel 10 Pro Fold (vendor px, CSS unknown → `unknowns`); Pixel 10 Pro + iPhone 17 Pro keyboard-open (Playwright; keyboard height `measured`); Pixel Tablet split-screen (AOSP); iPad Pro 11 Stage Manager (Playwright; window size illustrative); ultrawide 3440×1440 and tall 1080×1920 (derived, formula shown); Android TV 1080p (AOSP + overscan); Android Automotive 1024p parked/driving (AOSP; web adapter `notApplicable`); iPhone Duo inner/outer (Apple spec px; points unknown).

### 5.3 Scenario (`scenarios/*.yaml`, schema `schemas/scenario.schema.json`)
```yaml
id: fold7-unfold-keeps-draft
title: Unfolding mid-draft keeps the draft and the Send control reachable
profile: samsung-galaxy-z-fold7            # startup configuration
start: { panel: outer, posture: closed, orientation: portrait }
task:
  url: /compose                            # resolved against --base-url
  controls: ["#send", "#save-draft"]       # must remain reachable + operable
  setup:                                   # small action vocabulary, or `script: ./setup.mjs` exporting setup(page)
    - { fill: "#body", value: "Hei Per, vedlagt er…" }
    - { scrollTo: 900 }
    - { focus: "#body", select: [4, 7] }
transition: { kind: unfold, to: { panel: inner, posture: flat } }   # kinds: fold unfold posture rotate resize split keyboard-open keyboard-close input-change
assert:                                    # defaults apply when omitted; each maps to a SARIF rule + helpUri (WCAG / Google tier)
  - reachable: controls
  - state-preserved: [form, scroll, focus, selection, history, storage, media]
  - no-remount: controls
  - no-horizontal-overflow
  - no-overlap: interactive
  - target-size: { min: 24, unit: css_px }
  - not-occluded-by-hinge: controls
  - no-element-loss
sampling: { during_ms: 600, every_ms: 50 } # observe interruption, not only the end state
```

### 5.4 Result (SARIF 2.1.0 + `schemas/result.schema.json` for the property bag)
One `rule` per assertion (`helpUri` → WCAG 1.3.4/1.4.10/2.5.8, Google `Config_Changes`/`Touch_Targets`, EN 301 549 11.1.4.10). One `result` per (scenario × assertion) with `kind`, `level`, `logicalLocations` (selector, role, accessible name), `attachments` (before/during/after PNG, state diff JSON, trace on fail), `properties` {profileId, profileRevision, transition, engine, engineVersion, emulation: 'cdp-displayFeature' | 'viewport-only', evidenceLevel: 'emulated' | 'physical', unitsDeclared}. Coverage summary lists every scenario and every assertion that was `open`/`notApplicable`/`review` with its reason. A healer-skipped or blocked check is never `pass`.

## 6. Oracles (deterministic, research 03 §4.5)

| Assertion | Computation |
|---|---|
| reachable | `scrollIntoViewIfNeeded` → in viewport → `elementFromPoint` at centre resolves to the control or a descendant → enabled → a real click dispatches (no-op handler stub tolerated) |
| state-preserved | snapshot {url, history.state, scrollY per scroll container, activeElement, selection, form values, local/sessionStorage, media currentTime/paused} before, every `every_ms` during, after; diff keyed by field; app may expose `window.__foldproofState()` for custom state |
| no-remount | stamp controls with a `data-foldproof-stamp` before; after, same selector must carry the stamp (detects unmount/remount that loses focus even when values are restored) |
| no-horizontal-overflow | `scrollingElement.scrollWidth > innerWidth` or any visible element `right > innerWidth` |
| no-overlap | pairwise intersection of visible interactive rects excluding ancestor/descendant pairs |
| clipping | `scrollWidth > clientWidth` with `overflow: hidden` on text containers of the controls |
| target-size | axe-core `target-size` (WCAG 2.5.8, 24 CSS px) via `@axe-core/playwright`, enabled explicitly |
| not-occluded-by-hinge | control rect ∩ mask region `[offset, offset+maskLength]` (vertical or horizontal) is empty |
| no-element-loss | accessible name+role set of interactive elements after ⊇ before (minus elements the scenario declares transient) |
| orientation-both | the task's controls pass `reachable` in both orientations (WCAG 1.3.4) |

## 7. Adapter contract (so Android/iOS can plug in later)

```ts
interface Adapter {
  id: 'web-chromium' | 'web-webkit' | 'web-firefox' | 'android-emulator' | 'ios-simulator';
  capabilities(profile): { fold: boolean; posture: boolean; keyboard: 'resizes-content' | 'inset' | 'real' | 'none'; rotate: boolean; split: boolean };
  open(profile, start, task): Session;        // launch at the documented configuration
  transition(session, transition): void;      // drive it; re-apply emulation after viewport changes
  snapshot(session): StateSnapshot;           // engine-agnostic shape
  geometry(session): ElementRects;            // for oracles
  close(session): Artifacts;                  // screenshots, trace
}
```
Unsupported capability ⇒ the runner emits `notApplicable` (adapter cannot) or `review` (emulation cannot prove it) with the reason text, never `pass`.

## 8. Slices (agile; each ends at a reviewable checkpoint)

| # | Scope | Output | Checkpoint / acceptance |
|---|---|---|---|
| 1 | Core: zod schemas → JSON Schema, profile + scenario loaders, provenance validator, ≥ 14 sourced profiles, CLI `profiles list/show/validate`, `scenarios validate` | `src/core`, `schemas/`, `profiles/`, `scenarios/` | `foldproof profiles validate` passes on the corpus; unit test proves a profile without a unit or source is rejected; conflicts are listed, not merged |
| 2 | Web adapter + oracles + report + `run` | `src/adapters/web`, `src/oracles`, `src/report`, `dist/cli.js` | `foldproof run` on a trivial page emits SARIF + JUnit + MD; posture/segments verified via matchMedia inside the run (self-check rule); `doctor` detects a Chromium that honours the inline override |
| 3 | Fixtures: 5 known failures × {broken, fixed} + `fixtures serve/verify` | `fixtures/`, `tests/fixtures.test.ts` | every `broken/` FAILS on its named assertion and every `fixed/` PASSES, 3 consecutive runs, in CI on macOS + ubuntu |
| 4 | Skill package: SKILL.md, 8 references, launcher script, evals.json, plugin manifests, `skills.sh.json` | `skills/foldproof/`, `.claude-plugin/` | `skills-ref validate` + `claude plugin validate --strict` pass; SKILL.md < 500 lines; an agent following SKILL.md on fixture 2 reaches the correct verdict (eval) |
| 5 | Docs + release: README quick start (timed < 5 min from clean clone), CONTRIBUTING (DCO), CHANGELOG, NOTICE, GitHub repo + CI, v0.1.0 tag | repo public under Allan's GitHub | Codex review + council verdict carry no blocking defect; README quick start reproduced by a fresh subagent |

Fixtures (slice 3): (1) `save-offscreen-at-folded-width` — fixed-width toolbar, startup class; (2) `draft-lost-on-unfold` — layout switch re-renders the editor, transition class; (3) `keyboard-covers-primary-action` — fixed footer CTA vs `resizes-content`; (4) `control-under-hinge` — button straddles the hinge at book/tabletop posture; (5) `rotate-loses-scroll-and-selection` — orientation handler re-navigates. Each `fixed/` is the minimal correct version so the diff teaches the fix.

## 9. Assumptions (risky ones flagged ⚠️)

- ⚠️ Chromium-only fold emulation is acceptable for v0.1; WebKit/Firefox parity is viewport-only and labelled.
- ⚠️ A single npm package + Playwright peer dependency is an acceptable install cost for the skill (Impeccable sets the precedent with `npx impeccable`).
- ⚠️ Name `foldproof` and Apache-2.0 / CC BY 4.0 / DCO are accepted; changing them later is a one-file edit plus a rename.
- Plain-HTML fixtures are representative enough to prove detection; framework fixtures (React/Next) come in v0.2.
- The inline `displayFeature` CDP path keeps working in Chromium ≥ 156; `doctor` probes it so a regression is reported, not hidden.
- Android adapter in v0.2 on a machine with the SDK; its interface is frozen in v0.1.

## 10. Key decisions to verify (Allan)

1. Name: **foldproof** (recommended) vs `stillusable`.
2. Licence split: Apache-2.0 code + CC BY 4.0 corpus + DCO.
3. Web-first, Chromium-only fold emulation in v0.1; Android v0.2; iOS reported as `review`.
4. TypeScript single package with Playwright as peer dependency.
5. Publish under Allan's GitHub (`La-Cappuccino`) as a public repo named after the package; npm publish deferred to a manual step.
6. The scenario DSL (§5.3) is the public contract agents write; `script:` hooks exist for real apps.

## 11. Acceptance (feeds /verify-loop)

1. `npm test` green: unit + fixture matrix; fixture matrix deterministic over 3 runs on macOS and ubuntu CI.
2. `foldproof profiles validate` passes; mutation test: removing a unit, a source or `unknowns` fails validation.
3. `foldproof run` on all 5 fixtures emits SARIF that validates against the SARIF 2.1.0 schema, plus JUnit and MD; the MD has an "Untested" section listing every `open`/`review`/`notApplicable` with a reason.
4. Live self-check inside every Chromium run: after a fold transition, `matchMedia('(horizontal-viewport-segments: 2)')` (or vertical) must match, else the run is `open: emulation not effective` — never `pass`.
5. `skills-ref validate skills/foldproof` and `claude plugin validate --strict` pass; SKILL.md < 500 lines; evals.json has ≥ 5 cases incl. one negative.
6. README quick start executed by a fresh subagent from a clean clone in < 5 minutes.
7. Second-model critic (Codex via `cx`, flagship) + quad-council: no blocking finding open at release.
8. Nothing in the repo claims physical-device validation; every emulated result says so.
