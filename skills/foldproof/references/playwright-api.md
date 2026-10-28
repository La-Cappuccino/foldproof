# Using `foldproof/playwright` inside an existing Playwright test

This reference shows how to run foldproof's task-continuity checks inside a Playwright suite you already own, with your own authentication and seed data: attach before navigation, declare the task, checkpoint, transition, assert, operate, then read the findings. It ends with a complete example and the mapping between this API and the YAML runner, so a scenario file and a test produce the same findings. The API is exported from the package's `./playwright` entry (`src/playwright/index.ts`) and is experimental until v0.2; shapes below are as of 2026-10-28.

Contents

1. Prerequisites
2. Attach before goto
3. Declare the task and checkpoint
4. Transition
5. Assert
6. Operate
7. Reading findings
8. Complete example
9. YAML runner equivalence
10. Sources

## 1. Prerequisites

Node 22.12 or later, `playwright` in the range `>=1.64 <2` as a peer dependency, a Chromium browser (the adapter throws on Firefox or WebKit contexts because it needs CDP). The page under test must be served from a secure context (`https` or `http://localhost`) so posture and segment APIs exist. Create the context with the start configuration's viewport, DPR, `isMobile` and `hasTouch` so Playwright's own emulation matches what the adapter will apply; the YAML runner does this from the resolved configuration. Load a profile with `loadProfiles(dir)` from the package root entry; `attach` takes the parsed `Profile` object, not an id.

## 2. Attach before goto

`attach(page, { profile, start, settle, mask, artifactsDir })` must be called before the first navigation. It installs the recorder (sentinel media queries for posture and segments, a `MutationObserver`, the stamp registry) with `addInitScript`, opens a CDP session, and applies the start configuration through `Emulation.setDeviceMetricsOverride`. Options: `start` is a configuration target (`panel`, `posture`, `orientation`, `viewport`, `keyboard`); `settle` defaults to two quiet frames, `min_ms` 0, `max_ms` 3000; `mask` lists selectors masked in screenshots. After `page.goto` and your own login or seeding, call `fp.verifyStart()` once: it settles, observes, and records the startup step with its environment self-check.

Never call `page.setViewportSize` after attaching; it resets DPR and removes the display feature. Use `fp.transition` for every change.

## 3. Declare the task and checkpoint

`fp.task({ controls, landmarks, state, transient })` returns a `Task`. `controls` are CSS selectors or `role=<role>[name='<accessible name>']` locators that must each resolve to exactly one element; `landmarks` are additional locators whose role and name must survive; `state` is a partial of the policies in `state-policies.md` (defaults apply to omitted fields); `transient` lists locators excluded from element-loss.

`task.checkpoint()` records the before-state: it stamps the controls (throwing if any locator resolves to zero or several elements), snapshots form values, focus, selection, scroll anchors, declared storage keys, history and media, records element identities for controls and landmarks, and evaluates the `custom` expression when declared. Do this after your setup actions and before the transition. `task.assertStartup()` runs the startup rules (`reachable`, `fills-viewport`) against the current configuration.

## 4. Transition

`fp.transition(kind)` or `fp.transition({ kind, to })` with a kind from `fold`, `unfold`, `posture`, `rotate`, `resize`, `split`, `keyboard-open`, `keyboard-close` and a `to` target as in `transitions.md`. An optional second argument overrides `quiet_frames`, `min_ms` or `max_ms` for that one transition, for example to outwait a debounced resize handler. It resolves the target against the profile (throwing on a resolve error such as a missing posture), drains recorded events, applies the new metrics, settles, observes, runs the environment self-check, and pushes a step onto `fp.steps`. The returned object carries `applied` (effective viewport, keyboard mode, emulation methods, expected signals), `selfCheck` (a finding), `settle` (settled flag, duration, per-frame log) and the page events observed during the transition.

## 5. Assert

`task.assert('preset@1')` or `task.assert([rules])` with rules from `reachable`, `state-preserved`, `no-remount`, `not-occluded-by-hinge`, `no-element-loss`, `fills-viewport`, `no-horizontal-overflow`. It takes the passive observations first (snapshot, anchors, custom state, stamp checks, identities), then the active probes (scroll into view, hit-test at five points, Playwright trial click), computes the findings, downgrades any `pass` to `open` if the step's self-check did not pass, appends the findings to the current step, and makes the after-state the baseline for the next assert. It throws if `checkpoint` was not called.

## 6. Operate

`task.operate(target, expect)` performs the only real click in a run. `expect` may contain `visible`, `hidden`, `url` (substring or `/regex/`), `text: { selector, contains }` and `custom` (a JS expression that must become truthy), each waited for up to `settle.max_ms`. It pushes an `operate` step with a single `operate` finding. Reachability checks never click for real; a dead handler would otherwise pass (council finding), so declare the outcome here.

## 7. Reading findings

Each `assert` and `operate` returns `Finding[]` or a `Finding` with `rule`, `kind` (`pass`, `fail`, `open`, `review`, `notApplicable`), `message`, `locations` (selector, role, name, rect) and masked `details`. `fp.steps` holds every step with its configuration, expected and observed signals, findings and continuity artifact. In a test, fail on `kind === 'fail'` and treat `open` or `review` as inconclusive rather than passing:

```ts
const findings = await task.assert('preset@1');
expect(findings.filter((f) => f.kind === 'fail')).toEqual([]);
expect(findings.filter((f) => f.kind === 'open' || f.kind === 'review')).toEqual([]);
```

Call `fp.detach()` in `finally`; it clears the posture and metrics overrides and closes the CDP session.

## 8. Complete example

```ts
import { test, expect } from '@playwright/test';
import { loadProfiles } from 'foldproof';
import { attach } from 'foldproof/playwright';

test('unfolding mid-draft keeps the draft and Send works', async ({ browser }) => {
  const { items } = await loadProfiles('node_modules/foldproof/profiles');
  const profile = items.find((p) => p.id === 'microsoft-surface-duo')!;
  const context = await browser.newContext({ viewport: { width: 540, height: 720 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const fp = await attach(page, { profile, start: { posture: 'closed' } });
  try {
    await page.goto('http://localhost:3000/login');
    await page.fill('#user', 'tester'); await page.fill('#pass', process.env.TEST_PASS!); await page.click('#login');
    await page.goto('http://localhost:3000/compose');
    await page.locator('#send').waitFor();
    await fp.verifyStart();

    const task = await fp.task({ controls: ['#send', "role=button[name='Save draft']"], state: { form: 'all', storage: ['draft'] } });
    await page.fill('#body', 'Hei Per, vedlagt er avtalen.');
    await page.locator('#body').evaluate((el) => (el as HTMLTextAreaElement).setSelectionRange(4, 7));
    await task.checkpoint();

    const t = await fp.transition('unfold');
    expect(t.selfCheck.kind, t.selfCheck.message).toBe('pass');

    const findings = await task.assert('preset@1');
    expect(findings.filter((f) => f.kind === 'fail').map((f) => f.message)).toEqual([]);
    expect(findings.filter((f) => f.kind === 'open' || f.kind === 'review').map((f) => f.message)).toEqual([]);

    const op = await task.operate('#send', { visible: '.sent' });
    expect(op.kind, op.message).toBe('pass');
  } finally {
    await fp.detach();
    await context.close();
  }
});
```

The browser must be Chromium. Keep the start viewport in `newContext` equal to the profile's `usable` layout viewport for the start panel; `attach` re-applies it through CDP anyway, but a matching context avoids a transient resize before the recorder is ready.

## 9. YAML runner equivalence

The CLI's `run` command executes a scenario through this same API (`src/playwright/runner.ts`, `runScenario(browser, scenario, profile, { baseUrl, artifactsDir, scenarioFile, appBuild })`): it opens a context from the resolved start configuration, calls `attach` with `start`, `settle` and `mask`, navigates to `task.url` resolved against `--base-url`, waits for `task.ready`, runs `task.script` (an ESM module exporting `setup(page, ctx)`) and the `task.setup` actions, calls `verifyStart`, creates the task from `controls`, `landmarks`, `state` and `transient`, checkpoints, runs the startup rules and opt-in static diagnostics, then for each step either `transition` plus `assert(step.assert)` or `operate`. It wraps the result into a `ScenarioResult` with the verdict, the fixture expectation match and the gaps, and the command writes SARIF, JUnit and Markdown.

Equivalence rules: `assert: preset@1` equals `task.assert('preset@1')`; a step's `to` is passed through unchanged; `setup` actions map to Playwright calls (`fill`, `type` as `pressSequentially`, `press`, `check`, `selectOption`, `focus` with `select`, `scrollTo` via `scrollIntoView`, `play` with optional `seek`, `waitFor`, `pushState`, `wait`, `evaluate`, `click`, `goto`). What a test gains over YAML is arbitrary code between `attach` and `checkpoint` (authentication, data seeding, framework-specific readiness). What YAML gains is the coverage manifest, the exit code and the report files; in v0.1 the report builders in `src/report/index.ts` and `runScenario` are not exported from the public entries, so an in-suite test reads `fp.steps` and the findings directly.

## 10. Sources

Inspected 2026-10-28.

- Playwright CDPSession: https://playwright.dev/docs/api/class-cdpsession
- Playwright `addInitScript`: https://playwright.dev/docs/api/class-browsercontext#browser-context-add-init-script
- Playwright locators and `click({ trial: true })`: https://playwright.dev/docs/api/class-locator#locator-click
- Playwright emulation: https://playwright.dev/docs/emulation
- Implementation: `src/playwright/index.ts`, `src/playwright/runner.ts`, `src/adapters/web/session.ts`, `src/core/configuration.ts`; spec `docs/SPEC-v1.md` section 8
