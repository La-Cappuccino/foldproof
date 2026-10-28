# Changelog

All notable changes to foldproof. The format follows Keep a Changelog; versions follow SemVer.

## [0.1.0] — 2026-10-28

First public cut. Web adapter (Chromium via Playwright CDP), the Agent Skill, the sourced corpus and the
fixture benchmark.

### Added
- Transition driver owning device metrics through CDP: fold, unfold, posture, rotate, resize, split,
  keyboard-open (`keyboard-shrink` / `keyboard-overlay-approx`), keyboard-close; environment self-check
  after every change (viewport, DPR, CSS posture, segment rectangles).
- In-page recorder: sentinel media queries, node-identity stamps, mutation + per-frame continuity log,
  quiescence with `min_ms` floor.
- Oracles: `reachable` (hit-test + trial click), `state-preserved` (per-field no-loss policies, scroll anchor,
  masked evidence), `no-remount`, `not-occluded-by-hinge` (+ `straddles-fold-line` advisory),
  `no-element-loss` (scoped), `fills-viewport`, `operate`, diagnostics `no-horizontal-overflow`, `target-size`.
- Scenario DSL v1 (`foldproof: 1`): profiles or class, start, task (ready, controls with CSS or role+name,
  landmarks, state policies, setup, script), ordered steps with per-step asserts and settle, operate with
  declared outcome, static diagnostics, transient, mask, expect (fixtures).
- Evidence: coverage manifest, SARIF 2.1.0, JUnit XML, Markdown with Untested section; exit codes 0/1/2/3.
- Corpus: 18 sourced profiles (Surface Duo, Pixel 9/10 Pro Fold, Galaxy Z Fold 6/7, Zenbook Fold, AOSP
  foldables, phones, tablets, desktop ultrawide/tall, TV, Automotive, iPhone Duo inventory) with provenance,
  conflicts and unknowns; CDLA-Permissive-2.0.
- Fixtures (benchmark): draft-lost-on-unfold, orientation-locked-layout, control-under-hinge,
  stale-async-layout-after-round-trip, keyboard-covers-primary-action, rotate-loses-scroll-and-selection,
  tabbar-missing-after-keyboard-close, positive controls nav-collapses-correctly and autosave-updates-storage.
- Agent Skill `skills/foldproof` (Agent Skills spec), Claude Code plugin manifests, `skills.sh.json`,
  Codex metadata, evals.
- `foldproof quick <url>` zero-config smoke run.

### Known limits
- Chromium only; the adapter refuses Firefox and WebKit rather than reporting partial results. Node ≥ 22.12.
- Keyboard is approximated; no engine shows a real keyboard.
- Android and iOS adapters are documented recipes, not implementations (v0.2).
