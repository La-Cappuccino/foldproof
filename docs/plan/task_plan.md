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
- [ ] P3 Quad-council review of the spec → fold verdict into spec → mark-it-down
- [ ] P4 Build slice 1: profiles schema + sourced profiles + fixtures + web adapter + SKILL.md
- [ ] P5 Verify: tests pass, adapter proves fail→fixed on fixtures, Codex review, council
- [ ] P6 Package hygiene: README, LICENSE, CONTRIBUTING, CI, CHANGELOG
- [ ] P7 Commit, Brain persist, mark-it-down final, report

## Decisions log (append as made)
- 2026-10-28 Repo initialised at /Users/echo/Projects/active/responsivness (was not git).
- 2026-10-28 VERIFIED: foldable emulation on web is feasible today via Playwright CDPSession +
  inline `displayFeature`/`devicePosture` on `Emulation.setDeviceMetricsOverride` (Chromium 156).
  Dedicated `setDisplayFeaturesOverride` is a no-op in that build; `navigator.devicePosture` absent.
  Fold→unfold mid-session works without reload (transition tests are possible). Chromium-only.
- 2026-10-28 Skill packaging follows the Agent Skills spec (agentskills.io): SKILL.md + scripts/ +
  references/ + assets/; validate with `skills-ref validate`; ship marketplace.json + npx skills add.

## Open questions (resolve by research or by stated assumption)
- Package name (dir typo "responsivness" is not the public name)
- License (assume MIT unless research argues Apache-2.0 for patent grant)
- First platform (assume web via Playwright + foldable emulation; Android as 2nd adapter)
- Scenario file format (assume JSON with JSON Schema; YAML authoring optional)

## Errors / retries
(none yet)
