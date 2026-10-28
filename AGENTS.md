# AGENTS.md — working in this repository

foldproof is a TypeScript/Node package (ESM, Node ≥ 22.12) plus an Agent Skill under `skills/foldproof/`.
The skill is the user-facing contract; the code is what it runs.

## Commands
- `npm install && npx playwright install chromium` — once.
- `npm run typecheck` · `npm run test:unit` (fast, no browser) · `npm run test:fixtures` (Chromium, ~1–2 min).
- `npx tsx src/cli.ts doctor` — probes the emulation paths; must be green before trusting any run.
- `npx tsx src/cli.ts profiles validate` · `npx tsx src/cli.ts fixtures verify` — the two gates.
- `npm run schemas` after touching `src/core/schema.ts`; commit the regenerated `schemas/*.json`.

## Invariants (do not "fix" these into the textbook version)
- Device metrics are owned by `WebSession` through CDP. Never call `page.setViewportSize`.
- Fold emulation uses the inline `displayFeature` field of `Emulation.setDeviceMetricsOverride`; the dedicated
  `setDisplayFeaturesOverride` is a verified no-op while Playwright viewport emulation is active (Chromium 156).
- Posture uses `Emulation.setDevicePostureOverride`, readable only through MediaQueryLists created before the
  override (the recorder installs sentinels via `addInitScript`).
- `reachable` never clicks for real (hit-test + `click({ trial: true })`). Only `operate` clicks.
- `state-preserved` is per-field policy (no-loss), not equality. Values are masked in exported evidence.
- A failed `env-self-check` turns dependent `pass` into `open`. Nothing may become `pass` by being skipped.
- Profiles: every number has a unit and a `source_ref`; derived values state a formula; never write `measured`
  for something this project did not measure; registry conflicts are recorded, never averaged.
- Fixtures: `broken/` must fail on exactly its named rules; `fixed/` and positive controls must pass.
- Page-side probes (`src/adapters/web/page-scripts.ts`) must be self-contained functions (Playwright serialises source only).

## Layout
`src/core` schemas + resolver · `src/adapters/web` CDP session, recorder, probes, doctor · `src/oracles` rules ·
`src/playwright` public API + runner · `src/report` manifest, SARIF, JUnit, Markdown · `src/commands` CLI ·
`profiles/` corpus (CDLA-Permissive-2.0) · `fixtures/` benchmark · `skills/foldproof` the skill · `docs/` spec + research.

## Review discipline
Before claiming anything works, run the gate commands and paste their output. Research and decisions live in
`docs/research/`, `docs/SPEC-v1.md`, `docs/plan/`. The council verdict that shaped v0.1 is `docs/plan/council-2026-10-28.md`.
