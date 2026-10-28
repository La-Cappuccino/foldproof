/**
 * runScenario: executes a YAML scenario against one profile through the public API and returns a ScenarioResult.
 */
import type { Browser } from 'playwright';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Profile, Scenario, SetupAction, RuleId } from '../core/schema.js';
import { stepTransition, stepRules, STARTUP_RULES } from '../core/schema.js';
import { resolveConfiguration, isResolveError } from '../core/configuration.js';
import type { ScenarioResult, Finding, StepResult } from '../core/types.js';
import { Foldproof, describe } from './index.js';
import { ORACLE_VERSION, redactDeep } from '../oracles/index.js';

export interface RunOptions {
  baseUrl: string;
  artifactsDir?: string;
  scenarioFile?: string;
  appBuild?: string;
}

export function scenarioHash(s: Scenario): string {
  return createHash('sha256').update(JSON.stringify(s)).digest('hex').slice(0, 16);
}

export async function runScenario(browser: Browser, scenario: Scenario, profile: Profile, opts: RunOptions): Promise<ScenarioResult> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const base: Omit<ScenarioResult, 'steps' | 'verdict' | 'matchedExpectation' | 'durationMs' | 'gaps'> = {
    scenarioId: scenario.id,
    scenarioFile: opts.scenarioFile,
    scenarioHash: scenarioHash(scenario),
    title: scenario.title,
    profileId: profile.id,
    profileRevision: profile.revision,
    adapter: 'web-chromium',
    engine: { name: 'chromium', version: browser.version() },
    evidenceLevel: 'emulated',
    startedAt,
    expected: scenario.expect,
  };

  const startCfg = resolveConfiguration(profile, scenario.start);
  if (isResolveError(startCfg)) {
    const f: Finding = { rule: 'env-self-check', kind: startCfg.notExecutable ? 'notApplicable' : 'open', message: startCfg.error };
    const steps: StepResult[] = [{ index: 0, label: 'startup', kind: 'startup', configuration: { profileId: profile.id }, findings: [f], artifacts: {}, durationMs: 0 }];
    return finish({ ...base, steps, gaps: [startCfg.error] }, scenario, t0);
  }

  const context = await browser.newContext({ viewport: { width: startCfg.viewport.w, height: startCfg.viewport.h }, deviceScaleFactor: startCfg.deviceScaleFactor, isMobile: startCfg.isMobile, hasTouch: startCfg.hasTouch, serviceWorkers: 'block' });
  const page = await context.newPage();
  const gaps: string[] = [...startCfg.gaps];
  let fp: Foldproof | null = null;
  try {
    fp = await Foldproof.attach(page, { profile, start: scenario.start, settle: scenario.settle, mask: scenario.mask });
    const throttle = Number(process.env.FOLDPROOF_CPU_THROTTLE ?? 0);
    if (throttle > 1) await fp.session.cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
    const url = /^https?:/.test(scenario.task.url) ? scenario.task.url : new URL(scenario.task.url, opts.baseUrl).href;
    await page.goto(url, { waitUntil: 'load' });
    if (scenario.task.ready) {
      const ready = await page
        .locator(scenario.task.ready.selector)
        .first()
        .waitFor({ state: 'visible', timeout: scenario.settle.max_ms })
        .then(() => true)
        .catch(() => false);
      if (!ready) {
        // startup-class failure: the task never became available at the documented configuration
        await fp.verifyStart();
        fp.currentStep().findings.push({ rule: 'reachable', kind: 'fail', message: `task not ready at startup: "${scenario.task.ready.selector}" not visible within ${scenario.settle.max_ms} ms`, locations: [{ selector: scenario.task.ready.selector }] });
        await screenshot(fp, opts, scenario, 'startup');
        return finish({ ...base, steps: fp.steps, gaps: [...new Set(gaps)] }, scenario, t0);
      }
    }
    if (scenario.task.script) {
      const mod = (await import(pathToFileURL(path.resolve(path.dirname(opts.scenarioFile ?? '.'), scenario.task.script)).href)) as { setup?: (p: typeof page, ctx: { profile: Profile; scenario: Scenario }) => Promise<void> };
      await mod.setup?.(page, { profile, scenario });
    }
    await runSetup(page, scenario.task.setup);
    await fp.verifyStart();
    const task = await fp.task({ controls: scenario.task.controls, landmarks: scenario.task.landmarks, state: scenario.task.state, transient: scenario.transient });
    await task.checkpoint();
    // startup rules always run (reachable + fills-viewport) plus opt-in static diagnostics
    const startupRules: RuleId[] = [...STARTUP_RULES, ...scenario.static];
    if (startupRules.includes('reachable')) await task.assertStartup();
    if (scenario.static.includes('no-horizontal-overflow')) await task.assert(['no-horizontal-overflow']);
    if (scenario.static.includes('target-size')) fp.currentStep().findings.push(await targetSize(page));
    await screenshot(fp, opts, scenario, 'startup');
    for (const step of scenario.steps) {
      const tr = stepTransition(step);
      if (tr) {
        await fp.transition(tr, 'settle' in step ? step.settle : undefined);
        gaps.push(...fp.configuration.gaps);
        await task.assert(stepRules(step) as RuleId[]);
        await screenshot(fp, opts, scenario, `step-${fp.steps.length - 1}`);
      } else if ('operate' in step) {
        await task.operate(step.operate.target, step.operate.expect);
      }
    }
    return finish({ ...base, steps: fp.steps, gaps: [...new Set(gaps)] }, scenario, t0);
  } catch (e) {
    const steps = fp?.steps ?? [];
    steps.push({ index: steps.length, label: 'runner-error', kind: 'startup', configuration: describe(startCfg), findings: [{ rule: 'env-self-check', kind: 'open', message: `runner error: ${(e as Error).message.split('\n')[0]}` }], artifacts: {}, durationMs: 0 });
    return finish({ ...base, steps, gaps }, scenario, t0);
  } finally {
    await fp?.detach().catch(() => undefined);
    await context.close().catch(() => undefined);
  }
}

async function targetSize(page: import('playwright').Page): Promise<Finding> {
  try {
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    const res = await new AxeBuilder({ page }).withRules(['target-size']).analyze();
    const v = res.violations.find((x) => x.id === 'target-size');
    if (!v || v.nodes.length === 0) return { rule: 'target-size', kind: 'pass', message: `axe target-size: no violations (${res.passes.find((x) => x.id === 'target-size')?.nodes.length ?? 0} targets checked)` };
    return { rule: 'target-size', kind: 'fail', message: `axe target-size: ${v.nodes.length} target(s) under 24 CSS px: ${v.nodes.slice(0, 5).map((n) => n.target.join(' ')).join(', ')}`, locations: v.nodes.slice(0, 5).map((n) => ({ selector: n.target.join(' ') })), details: { helpUrl: v.helpUrl } };
  } catch (e) {
    return { rule: 'target-size', kind: 'open', message: `axe-core unavailable: ${(e as Error).message.split('\n')[0]}` };
  }
}

async function screenshot(fp: Foldproof, opts: RunOptions, scenario: Scenario, label: string): Promise<void> {
  if (!opts.artifactsDir) return;
  const file = path.join(opts.artifactsDir, `${scenario.id}--${fp.profile.id}--${label}.png`);
  const written = await fp.session.screenshot(file, scenario.mask);
  if (written) fp.currentStep().artifacts.screenshot = file;
  else fp.currentStep().findings.push({ rule: 'env-self-check', kind: 'review', message: `screenshot skipped: a mask could not be applied or confirmed (${scenario.mask.join(', ') || 'no mask'})` });
}

function finish(partialRaw: Omit<ScenarioResult, 'verdict' | 'matchedExpectation' | 'durationMs'>, scenario: Scenario, t0: number): ScenarioResult {
  // everything that leaves the runner is URL-redacted (Playwright error text can embed the navigated URL)
  const partial = { ...partialRaw, steps: redactDeep(partialRaw.steps), gaps: redactDeep(partialRaw.gaps) };
  const all = partial.steps.flatMap((s) => s.findings);
  const required = all.filter((f) => !['no-horizontal-overflow', 'target-size', 'straddles-fold-line'].includes(f.rule));
  const envNotApplicable = required.length === 1 && required[0]!.rule === 'env-self-check' && required[0]!.kind === 'notApplicable';
  let verdict: ScenarioResult['verdict'];
  if (envNotApplicable) verdict = 'notApplicable';
  else if (required.some((f) => f.kind === 'fail')) verdict = 'fail';
  else if (required.some((f) => f.kind === 'open' || f.kind === 'review')) verdict = 'open';
  else verdict = 'pass';
  const failedRules = new Set(all.filter((f) => f.kind === 'fail').map((f) => f.rule));
  // an expectation is only met with complete required coverage: no required row may be open or review
  const inconclusive = required.some((f) => f.kind === 'open' || f.kind === 'review');
  let matchedExpectation: boolean;
  if (scenario.expect.verdict === 'pass') matchedExpectation = verdict === 'pass';
  else {
    const expectedSet = new Set(scenario.expect.rules);
    matchedExpectation = verdict === 'fail' && !inconclusive && [...expectedSet].every((r) => failedRules.has(r)) && [...failedRules].every((r) => expectedSet.has(r));
  }
  return { ...partial, verdict, matchedExpectation, durationMs: Date.now() - t0 };
}

export async function runSetup(page: import('playwright').Page, actions: SetupAction[]): Promise<void> {
  const loc = (l: string) => {
    const m = /^role=([a-z]+)(?:\[name=(?:'([^']*)'|"([^"]*)"|([^\]]*))\])?$/.exec(l.trim());
    return m ? page.getByRole(m[1] as never, { name: m[2] ?? m[3] ?? m[4], exact: true }) : page.locator(l);
  };
  for (const a of actions) {
    if ('goto' in a) await page.goto(a.goto);
    else if ('click' in a) await loc(a.click).click();
    else if ('fill' in a) await loc(a.fill).fill(a.value);
    else if ('type' in a) await loc(a.type).pressSequentially(a.value);
    else if ('press' in a) await loc(a.press).press(a.key);
    else if ('check' in a) await loc(a.check).check();
    else if ('selectOption' in a) await loc(a.selectOption).selectOption(a.value);
    else if ('focus' in a) {
      await loc(a.focus).focus();
      if (a.select) await loc(a.focus).evaluate((el, sel) => (el as HTMLInputElement).setSelectionRange?.(sel[0], sel[1]), a.select);
    } else if ('scrollTo' in a) await loc(a.scrollTo).evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior }));
    else if ('play' in a) await loc(a.play).evaluate(async (el, seek) => { const m = el as HTMLMediaElement; if (seek != null) m.currentTime = seek; await m.play().catch(() => undefined); }, a.seek ?? null);
    else if ('waitFor' in a) await loc(a.waitFor).waitFor({ state: a.state });
    else if ('pushState' in a) await page.evaluate((s) => history.pushState({ foldproof: s }, '', s), a.pushState);
    else if ('wait' in a) await page.waitForTimeout(a.wait);
    else if ('evaluate' in a) await page.evaluate(a.evaluate);
  }
}

export { ORACLE_VERSION };
