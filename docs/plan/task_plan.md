# Task plan — build the open-source responsiveness package (v1)

Started 2026-10-28. Owner: Allan. Builder: Claude (Fable 5.1). Branch: build-v1.

## Goal (what the work must achieve)
Ship a non-generic, verifiable, open-source package that lets developers and AI agents
prove an interface stays usable across supported display configurations AND across
transitions (fold, resize, rotate, keyboard, input change) — grounded in sourced device
profiles and reproducible failure fixtures, not in a screenshot at one size.

## Phases
- [x] P0 git init + worktree isolation
- [ ] P1 Research fan-out (last30days, Perplexity, 4 agents, Context7) → docs/research/*.md
- [ ] P2 Synthesis → SPEC-responsiveness-v1.md (goal, non-goals, slices, acceptance)
- [ ] P3 Quad-council review of the spec → fold verdict into spec → mark-it-down
- [ ] P4 Build slice 1: profiles schema + sourced profiles + fixtures + web adapter + SKILL.md
- [ ] P5 Verify: tests pass, adapter proves fail→fixed on fixtures, Codex review, council
- [ ] P6 Package hygiene: README, LICENSE, CONTRIBUTING, CI, CHANGELOG
- [ ] P7 Commit, Brain persist, mark-it-down final, report

## Decisions log (append as made)
- 2026-10-28 Repo initialised at /Users/echo/Projects/active/responsivness (was not git).

## Open questions (resolve by research or by stated assumption)
- Package name (dir typo "responsivness" is not the public name)
- License (assume MIT unless research argues Apache-2.0 for patent grant)
- First platform (assume web via Playwright + foldable emulation; Android as 2nd adapter)
- Scenario file format (assume JSON with JSON Schema; YAML authoring optional)

## Errors / retries
(none yet)
