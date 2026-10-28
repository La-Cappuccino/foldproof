# Contributing to foldproof

Thank you. The project's value is honesty about evidence, so contributions are judged on that first.

## Ground rules
- **DCO sign-off** on every commit (`git commit -s`): you certify the Developer Certificate of Origin
  (https://developercertificate.org). No CLA.
- Code is Apache-2.0; the profile corpus is CDLA-Permissive-2.0; upstream data keeps its licence (NOTICE).
- Never write "proof", "compliant", "works on <device>" in docs or messages for emulated results.

## Adding a device profile
1. Copy the closest file in `profiles/`, keep the file name equal to `id`.
2. Every number needs a unit and a `source_ref`; every source needs `url`, `publisher`, `inspected`
   (YYYY-MM-DD), `licence`, `kind` (published | derived | measured) and ideally `revision`.
3. Derived values state the formula. Unknowns go in `unknowns[]` with a reason. If two registries disagree,
   add both profiles and link them with `conflicts_with`; do not average.
4. `postures[].web.segments` must be 2 iff the posture activates a display feature.
5. Run `npx tsx src/cli.ts profiles validate` and `profiles show <id>`; paste the output in the PR.

## Adding a fixture (benchmark case)
1. `fixtures/<name>/broken/index.html` + `scenario.yaml` (with `expect: { verdict: fail, rules: [...] }`),
   `fixed/` that passes, and `ISSUE.md` citing the real-world failure class.
2. Plain HTML/CSS/JS, viewport meta declared, served from localhost by the CLI.
3. `npx tsx src/cli.ts fixtures verify --only <name>` must print "all N fixture scenario(s) matched".
4. Positive controls (legitimate responsive behaviour that must pass) are as valuable as failures.

## Adding or changing an oracle
Write the failing fixture first. Explain in the PR what legitimate behaviour could trip the rule and how the
rule avoids it (see `docs/plan/council-2026-10-28.md` for the known traps). Bump `ORACLE_VERSION`.

## Checks before a PR
`npm run typecheck && npm run test:unit && npm run schemas && git diff --exit-code schemas/ && npx tsx src/cli.ts profiles validate && npx tsx src/cli.ts fixtures verify`
