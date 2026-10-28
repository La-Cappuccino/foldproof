# Architecture hypothesis (pre-plan, 2026-10-28, before research fan-out returns)

Purpose: a concrete target to test the research against. Everything here is revisable by
`docs/research/01–05` and by the council verdict. The spec (`SPEC-v1.md`) supersedes this file.

## Product in one sentence
A standards-compliant agent skill + CLI + sourced device corpus that **proves** an interface stays
usable (controls reachable, task completable, state preserved) across documented display
configurations and across transitions, and emits an inspectable evidence record of what was and
was not checked.

## The moat (what no existing package has, per Perplexity pass + our 28 Oct research)
1. **Profiles corpus with provenance** — every number carries source URL, publisher, inspection
   date, unit, and a revision; folded/unfolded/tabletop postures with hinge geometry.
2. **Transition scenarios** — fold/unfold, rotate, resize, keyboard, split-screen as first-class
   steps, not just a list of viewports.
3. **State-preservation assertions** — form values, scroll, selection, playback, route survive the
   transition. Nothing in the market asserts this today.
4. **Evidence + coverage record** — pass/fail/skipped/unsupported per scenario with artifacts;
   "not checked" is reported, never silently green.
5. **Failure fixtures** — tiny apps that reproduce known failures (fixed and broken variants) so
   the adapter's detection is itself testable (Karpathy: prove on a tiny case first).

## Candidate repo layout (Agent Skills spec + CLI + corpus)

```
<name>/
├── skills/<name>/                 # the agent skill (spec-compliant, mirrored to harness dirs on install)
│   ├── SKILL.md                   # <500 lines: triggers, workflow, how to call the CLI, how to read reports
│   ├── references/                # prose: concepts, units, adapter boundaries, assertion catalogue (indexed)
│   ├── scripts/                   # thin launchers that call the CLI by interpreter
│   └── assets/                    # JSON Schemas, scenario templates, report template
├── packages/
│   ├── core/                      # TS: schema types, scenario loader, report model, provenance checks
│   ├── adapter-web/               # TS: Playwright + CDP fold/posture emulation, keyboard, rotation, assertions
│   └── cli/                       # TS: `<name> run|list|validate|report` (npm bin)
├── profiles/                      # sourced device + scenario profiles (JSON, schema-validated, versioned)
├── scenarios/                     # reusable scenario definitions (startup + transition), YAML/JSON
├── fixtures/                      # minimal web apps: known failures, each with broken/ and fixed/
├── reports/                       # example evidence records (committed) + schema
├── .claude-plugin/                # marketplace.json / plugin.json for Claude Code
├── .github/workflows/             # CI: schema validate, unit tests, fixture matrix (broken must FAIL, fixed must PASS)
├── README.md · LICENSE · CONTRIBUTING.md · CHANGELOG.md · AGENTS.md
```

## Slice plan (agile; each slice reviewable)
1. **Core + schema + 10 sourced profiles** (foldables ×3 postures, phone keyboard-open, tablet
   split, ultrawide, tall portrait, TV, auto placeholder marked unsupported) + validator CLI.
2. **Web adapter**: open at profile, drive transition (fold/unfold/rotate/resize/keyboard inset),
   assert reachability (target in viewport, not covered, clickable), overflow/overlap/clipping
   oracles, state preservation; evidence record (JSON + screenshots before/during/after).
3. **Fixtures**: ≥4 reproducible failures: (a) save button off-screen at folded width, (b) draft
   lost on unfold (component remount), (c) fixed-position toolbar hidden by keyboard, (d) layout
   does not re-flow on tabletop hinge / horizontal overflow at tall portrait. Each broken+fixed.
4. **SKILL.md + references** and harness install (`npx skills add`, marketplace.json).
5. **CI + docs + release**; Android adapter is v2 (needs emulator; design its interface now).

## Acceptance (feeds /verify-loop)
- `validate` rejects a profile with a missing source or unit; accepts all shipped profiles.
- Every fixture's `broken/` FAILS and `fixed/` PASSES through the adapter, in CI, deterministically (3 runs).
- Report lists every scenario as pass | fail | skipped(reason) | unsupported(reason); no silent gaps.
- Skill validates with `skills-ref validate`; installs into Claude Code and Codex; SKILL.md < 500 lines.
- README quick start works from a clean clone in < 5 minutes (timed).
- Council + Codex review find no blocking defect.

## Naming
Public name TBD from research 04 (npm + GitHub availability). Working codename: `everyscreen`?
Keep the repo folder as is until a name is chosen; the package name is what matters.
