# Evidence report

This reference describes the evidence record a run produces: the coverage manifest that fixes the denominator before anything executes, the five result kinds and what each permits you to say, the SARIF 2.1.0 layout, the JUnit mapping, the Markdown summary with its "Untested" section, the exit codes, and the reading discipline an agent must follow before claiming anything about a page. The shapes are those of `src/report/index.ts` as of 2026-10-28. Every record states its evidence level as `emulated`; no record is a physical-device result or a conformance claim.

Contents

1. The coverage manifest
2. Result kinds
3. SARIF 2.1.0 layout
4. JUnit mapping
5. Markdown summary and the Untested section
6. Exit codes
7. How to read a report before claiming anything
8. Sources

## 1. The coverage manifest

Before execution the runner computes every expected row `(scenario × profile × step × rule)`:

- step 0 (startup): `env-self-check`, `reachable`, `fills-viewport`, plus any rule listed under `static`;
- each later step: `env-self-check` plus the step's rules (`preset@1` expands to `reachable`, `state-preserved`, `no-remount`, `not-occluded-by-hinge`, `no-element-loss`; an `operate` step contributes `operate`).

After execution each row is reconciled with the findings. A row with no finding becomes `open: not executed`; a profile the resolver could not execute makes all its rows `notApplicable` with the resolver's reason; when several findings share a row (one per control), the worst kind wins in the order fail, open, review, pass, notApplicable. The manifest is stored in `runs[0].properties.coverage` in SARIF and drives the summary counts, so the denominator is visible and cannot shrink to fit the results. `foldproof run --plan` prints it without running.

## 2. Result kinds

| Kind | Meaning | What you may say |
|---|---|---|
| `pass` | The rule's condition held at quiescence and the environment self-check passed for that step. | "Under emulation on profile P, rule R held for this task." |
| `fail` | The condition did not hold. The message names the control and the reason. | "The task is affected: R failed because …" |
| `open` | The check was expected but could not reach a verdict: emulation not effective, did not settle, locator resolved to several elements, runner stopped early, or a resolve error. | Nothing about the page. Say the check is inconclusive and why. |
| `review` | The check ran but a human must judge: transient stamp loss, a control straddling a non-occluding fold line, or an iOS profile. | "Needs review: …" Never "pass". |
| `notApplicable` | The check has no meaning here: no occluding hinge, profile not executable on this adapter, car or TV profile. | Nothing about the page. |

A finding whose step failed the environment self-check is downgraded from `pass` to `open` with the prefix "blocked: emulation not verified". A scenario's verdict is `fail` if any required finding failed, `open` if any required finding is `open` or `review`, `notApplicable` when only the resolver spoke, else `pass`. Required excludes the diagnostics `no-horizontal-overflow`, `target-size` and the advisory `straddles-fold-line`.

Fixture scenarios carry `expect: { verdict: fail, rules: [...] }`; the result records `matchedExpectation`, true only when exactly the named rules failed.

## 3. SARIF 2.1.0 layout

One `run` per invocation. `tool.driver.rules` lists every rule from `RULE_HELP` with `shortDescription`, a `helpUri` (WCAG Understanding page, Google adaptive guideline, MDN, or a foldproof reference) and `properties.relatesTo` and `properties.diagnostic`. The relation wording is deliberate: a rule *relates to* WCAG 2.2 1.4.10 or 2.5.8 or Google `Config_Changes`; a pass is evidence, not conformance.

Each `result` carries:

- `ruleId`, `ruleIndex`, `kind` (one of the five above), `level` (`error` for a failed required rule, `warning` for a failed diagnostic, `none` otherwise);
- `message.text` prefixed `[scenarioId @ profileId / step N label]`;
- `locations[0].physicalLocation` pointing at the scenario YAML file (or `scenario://id`), and `logicalLocations[]` of kind `element` with the selector as `fullyQualifiedName`, the accessible name, and `properties.role` and `properties.rect`;
- `attachments[]` with the step screenshot when one was written;
- `fingerprints["foldproof/v1"]` = `scenario|profile|step|rule|selector`, stable across runs for baselining;
- `properties`: `scenarioId`, `scenarioHash`, `profileId`, `profileRevision`, `step`, `stepLabel`, `configuration` (panel, posture, orientation, viewport, DPR, display feature, keyboard, gaps, source refs), `expected` and `observed` self-check signals, `emulation` (for example `cdp-metrics`, `cdp-displayFeature`, `cdp-posture`, `keyboard-overlay-approx`), `evidenceLevel`, `engine`, `appBuild`, `oracleVersion`, and the masked `details`.

`invocations[0]` records `executionSuccessful` (false only on exit code 3), start time, exit code and base URL. `runs[0].properties` holds the coverage manifest and the summary counts. The document declares the SARIF 2.1.0 errata 01 schema and is uploadable to GitHub code scanning.

## 4. JUnit mapping

One `testsuite` per scenario and profile pair, with `properties` for `verdict`, `profileRevision`, `engine` and `evidenceLevel`. One `testcase` per finding named `step N label :: rule`. `fail` becomes `<failure>` with the message and the rule as type; `pass` is a bare case; `open`, `review` and `notApplicable` become `<skipped>` whose message starts with the kind. JUnit has only three states, so a CI dashboard that counts skips as fine will hide inconclusive coverage. Read the exit code or the SARIF coverage block instead of the JUnit totals when deciding.

## 5. Markdown summary and the Untested section

The Markdown record opens with the tool and oracle version, start time, base URL, app build, and the line "Evidence level: emulated (Chromium CDP). Nothing here is a physical-device result or a conformance claim." Then:

- a summary table of pass, fail, open, review and notApplicable counts taken from the coverage manifest, and the exit code with its legend;
- one section per scenario and profile with the verdict, the fixture expectation when present, and per step the findings with their kind and message plus the screenshot link; profile gaps (for example "browser UI height unknown") are listed under the scenario;
- an "Untested" section listing every manifest row that ended `open`, `review` or `notApplicable`, with the reason, or the sentence "Every expected check reached pass or fail";
- a rules table with the "relates to" column and help links.

The Untested section is the ledger the spec calls first-class. Quote it whenever you summarise a run.

## 6. Exit codes

| Code | Condition |
|---|---|
| 0 | Every required row in the manifest is `pass` or `notApplicable`. |
| 1 | Any scenario verdict is `fail`. |
| 2 | No failure, but a required row is `open` or `review`: coverage is inconclusive. |
| 3 | Runner error (a step labelled `runner-error` exists): browser launch, navigation or an exception. |

Diagnostics (`no-horizontal-overflow`, `target-size`) and the advisory `straddles-fold-line` never affect the exit code. Treat 2 as "not yet known", not as success; a CI gate that only checks for non-zero will correctly block on it.

## 7. How to read a report before claiming anything

1. Read the exit code. Only 0 permits a "held under emulation" statement, and only for the rules and profiles in the manifest.
2. Read the Untested section (Markdown) or the coverage block (SARIF). Every `open`, `review` or `notApplicable` row is something you have no evidence about. Name them in your summary.
3. For each `fail`, quote the rule, the control's accessible name or selector, the step label and the message. Attach the screenshot path.
4. Check `properties.emulation` and the self-check `expected` versus `observed` on the failing step; a `pass` cannot exist there without a passing self-check, but understanding what was emulated avoids over-reading a result.
5. Never say "passes", "works on device X" or "conforms to WCAG". Say "under Chromium emulation of profile X at revision N, rule R held for task T" and name what stayed untested.
6. Profiles with `review` results (iOS) and `notApplicable` results (car, TV, non-executable profiles) contribute no claim either way.

## 8. Sources

Inspected 2026-10-28.

- SARIF 2.1.0 errata 01 schema: https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/schemas/sarif-schema-2.1.0.json
- SARIF 2.1.0 specification (`kind`, `level`, `logicalLocations`, `fingerprints`): https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
- SARIF tutorial: https://github.com/microsoft/sarif-tutorials/blob/main/docs/2-Basics.md
- GitHub code scanning SARIF upload: https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github
- WCAG 2.2 Understanding 1.4.10 and 2.5.8: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html, https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Google adaptive Tier 3: https://developer.android.com/docs/quality-guidelines/adaptive-app-quality/tier-3
- Format evaluation: `docs/research/03-testing-and-emulation-tooling.md` section 5; implementation `src/report/index.ts`, `src/playwright/runner.ts`
