# Task plan — build the open-source responsiveness package (v1)

Started 2026-10-28. Owner: Allan. Builder: Claude (Fable 5.1). Branch: build-v1.

## Goal (what the work must achieve)
Ship a non-generic, verifiable, open-source package that lets developers and AI agents
prove an interface stays usable across supported display configurations AND across
transitions (fold, resize, rotate, keyboard, input change) — grounded in sourced device
profiles and reproducible failure fixtures, not in a screenshot at one size.

## Phases
- [x] P0 git init + worktree isolation
- [x] P1 Research fan-out (last30days, Perplexity ×4, 4 agents) → docs/research/00–05 (all in Brain)
- [x] P2 Synthesis → docs/SPEC-v1.md (goal, non-goals, slices, acceptance) — working name foldproof
- [x] P3 Quad-council review (4/4 seats: ship with changes) → docs/plan/council-2026-10-28.md → SPEC v1.1
- [x] P4 Slice 1 (vertical) DONE 2026-10-28 12:25: fixture draft-lost-on-unfold broken fails exactly state-preserved+no-remount on Surface Duo + Pixel 9 Pro Fold; fixed passes incl. hinge + operate; exit 0
  - open item CLOSED 2026-10-28 12:40: Duo tabletop (720×1114, horizontal hinge y=540) self-checks exactly after posture.orientation landed; the 726×1124 drift came from the pre-migration profile
- [x] P5 Slice 2 DONE: rotate/resize/keyboard(shrink+overlay)/fold/unfold/posture, operate, steps + per-step settle (min_ms), coverage manifest, exit codes 0–3, JUnit, masking, axe target-size, SARIF validated against OASIS schema
- [x] P6 Slice 3 DONE: 9 fixtures / 25 scenarios all match (7 broken fail only their named rules, 2 positives + all fixed pass); CI matrix 3 runs + 4× CPU throttle in ci.yml; `npm run test:fixtures` green locally
- [x] P7 Slice 4 DONE: SKILL.md (98 lines) + launcher + plugin manifests + evals (6) + codex metadata + templates; `skills-ref validate` ✓, `claude plugin validate --strict` ✓; `quick <url>` works (3 controls discovered, pass ×2)
- [ ] P8 Slice 5: corpus (agent, parallel), engines from BCD, README/CONTRIBUTING/NOTICE/licences, GitHub repo + CI + SARIF Action, npm pack; Codex review; council score
- [ ] P9 Commit/push, Brain persist, final mark-it-down, report

## Decisions log (append as made)
- 2026-10-28 Repo initialised at /Users/echo/Projects/active/responsivness (was not git).
- 2026-10-28 VERIFIED: foldable emulation on web is feasible today via Playwright CDPSession +
  inline `displayFeature`/`devicePosture` on `Emulation.setDeviceMetricsOverride` (Chromium 156).
  Dedicated `setDisplayFeaturesOverride` is a no-op in that build; `navigator.devicePosture` absent.
  Fold→unfold mid-session works without reload (transition tests are possible). Chromium-only.
- 2026-10-28 Skill packaging follows the Agent Skills spec (agentskills.io): SKILL.md + scripts/ +
  references/ + assets/; validate with `skills-ref validate`; ship marketplace.json + npx skills add.

- 2026-10-28 Council (4/4): reachable = hit-test + trial click, never a real click; state policies per field;
  self-check expected-vs-observed; keyboard overlay approx; observers before trigger + quiescence; generic
  geometry demoted to diagnostics; DSL gets version + steps + operate; vertical slice first.
- 2026-10-28 VERIFIED after council: navigator.devicePosture + virtualKeyboard EXIST on localhost (secure
  context); sentinel MQL needed before override; DPR changes mid-session via CDP; never use setViewportSize.
- 2026-10-28 Licence: Apache-2.0 code, CDLA-Permissive-2.0 for profiles/, NOTICE for upstream data (flag for Allan).

## Open questions (resolve by research or by stated assumption)
- Package name (dir typo "responsivness" is not the public name)
- License (assume MIT unless research argues Apache-2.0 for patent grant)
- First platform (assume web via Playwright + foldable emulation; Android as 2nd adapter)
- Scenario file format (assume JSON with JSON Schema; YAML authoring optional)

## Errors / retries
(none yet)
