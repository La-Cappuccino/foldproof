/**
 * foldproof/playwright — the public API (experimental in v0.1).
 *
 *   const fp = await attach(page, { profile, start: { posture: 'closed' } });   // before page.goto
 *   await page.goto(url);
 *   await fp.verifyStart();
 *   const task = await fp.task({ controls: ['#send'], state: { storage: ['draft'] } });
 *   await task.checkpoint();
 *   await fp.transition('unfold');
 *   const findings = await task.assert('preset@1');
 *   await task.operate('#send', { visible: '.sent' });
 */
import type { Page } from 'playwright';
import { createHash } from 'node:crypto';
import type { Profile, ConfigurationTarget, Transition, TransitionKind, RuleId, StatePolicies, Step } from '../core/schema.js';
import { StatePolicies as StatePoliciesSchema, PRESET_1, stepTransition, stepRules } from '../core/schema.js';
import { resolveConfiguration, applyTransition, isResolveError, type ResolvedConfiguration } from '../core/configuration.js';
import { WebSession, type AppliedConfiguration, type SettleResult } from '../adapters/web/session.js';
import * as scripts from '../adapters/web/page-scripts.js';
import * as oracles from '../oracles/index.js';
import type { Finding, StepResult } from '../core/types.js';

export interface SettleOptions {
  quiet_frames: number;
  min_ms?: number;
  max_ms: number;
}

export interface AttachOptions {
  profile: Profile;
  start?: ConfigurationTarget;
  settle?: SettleOptions;
  mask?: string[];
}

export interface TaskOptions {
  controls: string[];
  landmarks?: string[];
  state?: Partial<StatePolicies>;
  transient?: string[];
}

export interface TransitionOutcome {
  applied: AppliedConfiguration;
  selfCheck: Finding;
  settle: SettleResult;
  events: unknown[];
}

export class Foldproof {
  readonly steps: StepResult[] = [];
  private current!: AppliedConfiguration;
  private resolved!: ResolvedConfiguration;
  readonly runId = createHash('sha1').update(String(Date.now() + Math.random())).digest('hex').slice(0, 8);

  private constructor(
    readonly page: Page,
    readonly session: WebSession,
    readonly profile: Profile,
    readonly settleOpts: SettleOptions,
    readonly mask: string[],
  ) {}

  static async attach(page: Page, opts: AttachOptions): Promise<Foldproof> {
    const session = await WebSession.attach(page);
    const fp = new Foldproof(page, session, opts.profile, opts.settle ?? { quiet_frames: 2, min_ms: 0, max_ms: 3000 }, opts.mask ?? []);
    const r = resolveConfiguration(opts.profile, opts.start ?? {});
    if (isResolveError(r)) throw new Error(`cannot resolve start configuration for ${opts.profile.id}: ${r.error}`);
    fp.resolved = r;
    fp.current = await session.apply(r);
    return fp;
  }

  get configuration(): ResolvedConfiguration {
    return this.resolved;
  }
  get applied(): AppliedConfiguration {
    return this.current;
  }

  /** One counter for every step kind so coverage rows reconcile by unique index. */
  private nextIndex(): number {
    return this.steps.length;
  }

  /** True when the most recent configuration step (startup or transition) verified its emulation and settled. */
  envVerified(): boolean {
    for (let i = this.steps.length - 1; i >= 0; i--) {
      const s = this.steps[i]!;
      if (s.kind === 'operate') continue;
      return s.findings.find((f) => f.rule === 'env-self-check')?.kind === 'pass';
    }
    return false;
  }

  /**
   * Re-observe the environment now (no settle) and compare with the current configuration. A page can navigate,
   * remove the keyboard overlay or change size between a verified transition and an assertion; a stale pass must
   * not gate a fresh claim. A mismatch is recorded on the current step and makes the environment unverified.
   */
  async recheckEnv(): Promise<boolean> {
    if (!this.envVerified()) return false;
    const observed = await this.session.observe();
    const fresh = this.session.selfCheck(this.current, observed);
    if (fresh.kind === 'pass') return true;
    this.currentStep().findings.push({ ...fresh, message: `environment changed since it was verified: ${fresh.message}` });
    return false;
  }

  /** Verify the start configuration once the page is loaded (call after goto). */
  async verifyStart(): Promise<{ selfCheck: Finding; settle: SettleResult }> {
    const t0 = Date.now();
    const settle = await this.session.settle(this.settleOpts);
    const observed = await this.session.observe();
    const selfCheck = this.session.selfCheck(this.current, observed, settle);
    this.steps.push({ index: this.nextIndex(), label: 'startup', kind: 'startup', configuration: describe(this.resolved), expected: this.current.expected as unknown as Record<string, unknown>, observed: redactObserved(observed), findings: [selfCheck], artifacts: { continuity: settle }, durationMs: Date.now() - t0 });
    return { selfCheck, settle };
  }

  async transition(t: TransitionKind | Transition, settleOverride?: Partial<SettleOptions>): Promise<TransitionOutcome> {
    const transition: Transition = typeof t === 'string' ? { kind: t, to: {} } : t;
    const settleOpts = { ...this.settleOpts, ...(settleOverride ?? {}) };
    const next = applyTransition(this.profile, this.resolved, transition);
    if (isResolveError(next)) throw new Error(`transition ${transition.kind} on ${this.profile.id}: ${next.error}`);
    await this.page.evaluate(() => (window as unknown as { __foldproof: { drainEvents(): unknown[] } }).__foldproof.drainEvents()).catch(() => undefined);
    const t0 = Date.now();
    this.resolved = next;
    this.current = await this.session.apply(next);
    const settle = await this.session.settle(settleOpts);
    const observed = await this.session.observe();
    const selfCheck = this.session.selfCheck(this.current, observed, settle);
    const events = await this.page.evaluate(() => (window as unknown as { __foldproof: { drainEvents(): unknown[] } }).__foldproof.drainEvents()).catch(() => []);
    this.steps.push({ index: this.nextIndex(), label: `${transition.kind}${Object.keys(transition.to).length ? ' ' + JSON.stringify(transition.to) : ''}`, kind: 'transition', configuration: describe(next), expected: this.current.expected as unknown as Record<string, unknown>, observed: redactObserved(observed), findings: [selfCheck], artifacts: { continuity: { ...settle, events } }, durationMs: Date.now() - t0 });
    return { applied: this.current, selfCheck, settle, events };
  }

  async task(opts: TaskOptions): Promise<Task> {
    const policies = StatePoliciesSchema.parse(opts.state ?? {});
    return new Task(this, opts.controls, opts.landmarks ?? [], policies, opts.transient ?? []);
  }

  currentStep(): StepResult {
    return this.steps[this.steps.length - 1]!;
  }

  async detach(): Promise<void> {
    await this.session.detach();
  }
}

export class Task {
  private before: { snapshot: scripts.StateSnapshot; identities: scripts.ElementIdentity[]; custom: oracles.CustomProbe } | null = null;

  constructor(
    readonly fp: Foldproof,
    readonly controls: string[],
    readonly landmarks: string[],
    readonly policies: StatePolicies,
    readonly transient: string[],
  ) {}

  private get page(): Page {
    return this.fp.page;
  }

  private async customState(): Promise<oracles.CustomProbe> {
    if (!this.policies.custom) return { ok: true, value: undefined };
    try {
      return { ok: true, value: await this.page.evaluate(this.policies.custom) };
    } catch (e) {
      return { ok: false, error: (e as Error).message.split('\n')[0] };
    }
  }

  private async passive() {
    return {
      snapshot: await this.page.evaluate(scripts.snapshotScript, { storageKeys: this.policies.storage, form: this.policies.form }),
      identities: await this.page.evaluate(scripts.identitiesScript, [...this.controls, ...this.landmarks]),
      custom: await this.customState(),
    };
  }

  /** Record the before-state: snapshot, identities, stamps. Passive: nothing scrolls or focuses. */
  async checkpoint(): Promise<void> {
    const stamped = await this.page.evaluate(scripts.stampScript, { locators: this.controls, runId: this.fp.runId });
    const bad = stamped.filter((s) => s.count !== 1);
    if (bad.length) throw new Error(`controls must resolve to exactly one element: ${bad.map((b) => `${b.locator} → ${b.count}`).join(', ')}`);
    this.before = await this.passive();
  }

  /** Block dependent passes when the emulation for the current configuration is not (still) verified. */
  private gate(findings: Finding[], verified: boolean): Finding[] {
    if (verified) return findings;
    return findings.map((f) => (f.kind === 'pass' ? { ...f, kind: 'open' as const, message: `blocked: emulation not verified (${f.message})` } : f));
  }

  /** Active probes (scrollIntoView, hit-test, trial click) inside a save/restore of every scroll position. */
  private async activeProbes(): Promise<{ geom: scripts.GeometryReport; trial: Record<string, { ok: boolean; error?: string }> }> {
    const saved = await this.page.evaluate(scripts.saveScrollScript);
    try {
      const geom = await this.page.evaluate(scripts.geometryScript, this.controls);
      const trial = await this.trialClicks();
      return { geom, trial };
    } finally {
      await this.page.evaluate(scripts.restoreScrollScript, saved).catch(() => undefined);
    }
  }

  /** Startup-only rules: reachable + fills-viewport (+ diagnostics). */
  async assertStartup(extra: RuleId[] = []): Promise<Finding[]> {
    const verified = await this.fp.recheckEnv();
    const { geom, trial } = await this.activeProbes();
    const findings: Finding[] = [...oracles.reachable(geom, trial), oracles.fillsViewport(geom)];
    if (extra.includes('no-horizontal-overflow')) findings.push(oracles.horizontalOverflow(geom, await this.page.evaluate(scripts.overflowingElementsScript)));
    if (extra.includes('target-size')) findings.push(await this.targetSize());
    const gated = this.gate(findings, verified);
    this.fp.currentStep().findings.push(...gated);
    return gated;
  }

  async assert(rules: 'preset@1' | RuleId[] = 'preset@1'): Promise<Finding[]> {
    if (!this.before) throw new Error('call task.checkpoint() before the transition');
    const want = rules === 'preset@1' ? PRESET_1 : rules;
    const step = this.fp.currentStep();
    const findings: Finding[] = [];
    const verified = await this.fp.recheckEnv();
    // 1. passive observations first (nothing here scrolls or focuses)
    const after = await this.passive();
    const anchors = this.policies.scroll === 'anchor' ? await this.page.evaluate(scripts.anchorCheckScript, { before: this.before.snapshot.scroll, tolerance: this.policies.scroll_tolerance_px }) : [];
    const stampChecks = await this.page.evaluate(scripts.stampCheckScript);
    // 2. active probes (scrollIntoView + hit-test + trial click) inside a scroll save/restore
    const needGeometry = want.some((r) => ['reachable', 'not-occluded-by-hinge', 'fills-viewport', 'no-horizontal-overflow'].includes(r));
    const probes = needGeometry ? await this.activeProbes() : null;
    const geom = probes?.geom ?? null;
    if (want.includes('reachable') && probes) findings.push(...oracles.reachable(probes.geom, probes.trial));
    if (want.includes('state-preserved')) findings.push(oracles.statePreserved(this.before.snapshot, after.snapshot, this.policies, anchors, this.policies.custom ? { before: this.before.custom, after: after.custom } : undefined));
    if (want.includes('no-remount')) {
      const frames = (step.artifacts.continuity as { frames?: { missingStamps: string[] }[] } | undefined)?.frames ?? [];
      findings.push(...oracles.noRemount(stampChecks, frames));
    }
    if (want.includes('not-occluded-by-hinge') && geom) findings.push(...oracles.hinge(geom, this.fp.applied.cfg.displayFeature, this.fp.applied.cfg.webPosture === 'folded'));
    if (want.includes('no-element-loss')) findings.push(...oracles.elementLoss(this.before.identities, after.identities, this.transient));
    if (want.includes('fills-viewport') && geom) findings.push(oracles.fillsViewport(geom));
    if (want.includes('no-horizontal-overflow') && geom) findings.push(oracles.horizontalOverflow(geom, await this.page.evaluate(scripts.overflowingElementsScript)));
    if (want.includes('target-size')) findings.push(await this.targetSize());
    const gated = this.gate(findings, verified);
    step.findings.push(...gated);
    // after a transition, the new state becomes the baseline for the next step (passive again)
    this.before = await this.passive();
    return gated;
  }

  /** The only real click: act on a control and verify the declared outcome. Blocked when the emulation is unverified. */
  async operate(target: string, expect: { visible?: string; hidden?: string; url?: string; text?: { selector: string; contains: string }; custom?: string }): Promise<Finding> {
    const declared = Object.entries(expect).filter(([, v]) => v !== undefined);
    const nonEmpty = declared.every(([, v]) => (typeof v === 'string' ? v.trim().length > 0 : typeof v === 'object' && v !== null && v.selector.trim().length > 0 && v.contains.trim().length > 0));
    if (!declared.length || !nonEmpty) throw new Error('operate() requires at least one non-empty declared outcome (visible, hidden, url, text or custom)');
    const t0 = Date.now();
    const verified = await this.fp.recheckEnv();
    const step: StepResult = { index: this.fp['nextIndex'](), label: `operate ${target}`, kind: 'operate', configuration: describe(this.fp.configuration), findings: [], artifacts: {}, durationMs: 0 };
    this.fp.steps.push(step);
    let finding: Finding;
    if (!verified) {
      finding = { rule: 'operate', kind: 'open', message: `blocked: emulation not verified before operating "${target}"`, locations: [{ selector: target }] };
    } else {
      const locator = this.locator(target);
      try {
        await locator.click({ timeout: this.fp.settleOpts.max_ms });
        const problems: string[] = [];
        const timeout = this.fp.settleOpts.max_ms;
        if (expect.visible) await this.locator(expect.visible).waitFor({ state: 'visible', timeout }).catch(() => problems.push(`"${expect.visible}" did not become visible`));
        if (expect.hidden) await this.locator(expect.hidden).waitFor({ state: 'hidden', timeout }).catch(() => problems.push(`"${expect.hidden}" did not become hidden`));
        if (expect.url) {
          const m = /^\/(.+)\/$/.exec(expect.url);
          await this.page.waitForURL(m ? new RegExp(m[1]!) : (u) => u.href.includes(expect.url!), { timeout }).catch(() => problems.push(`url did not match ${expect.url}`));
        }
        if (expect.text) {
          const ok = await this.page.waitForFunction(({ selector, contains }) => (document.querySelector(selector)?.textContent ?? '').includes(contains), expect.text, { timeout }).then(() => true).catch(() => false);
          if (!ok) problems.push(`"${expect.text.selector}" does not contain "${expect.text.contains}"`);
        }
        if (expect.custom) {
          const ok = await this.page.waitForFunction(expect.custom, undefined, { timeout }).then(() => true).catch(() => false);
          if (!ok) problems.push(`custom expectation was not met: ${expect.custom}`);
        }
        finding = { rule: 'operate', kind: problems.length ? 'fail' : 'pass', message: problems.length ? `operating "${target}" did not produce the outcome: ${problems.join('; ')}` : `operated "${target}" and observed the outcome`, locations: [{ selector: target }], details: { expect } };
      } catch (e) {
        finding = { rule: 'operate', kind: 'fail', message: `could not operate "${target}": ${(e as Error).message.split('\n')[0]}`, locations: [{ selector: target }] };
      }
    }
    step.findings.push(finding);
    step.durationMs = Date.now() - t0;
    return finding;
  }

  private async targetSize(): Promise<Finding> {
    try {
      const { default: AxeBuilder } = await import('@axe-core/playwright');
      const res = await new AxeBuilder({ page: this.page }).withRules(['target-size']).analyze();
      const v = res.violations.find((x) => x.id === 'target-size');
      if (!v || v.nodes.length === 0) return { rule: 'target-size', kind: 'pass', message: `axe target-size: no violations (${res.passes.find((x) => x.id === 'target-size')?.nodes.length ?? 0} targets checked)` };
      return { rule: 'target-size', kind: 'fail', message: `axe target-size: ${v.nodes.length} target(s) under 24 CSS px: ${v.nodes.slice(0, 5).map((n) => n.target.join(' ')).join(', ')}`, locations: v.nodes.slice(0, 5).map((n) => ({ selector: n.target.join(' ') })), details: { helpUrl: v.helpUrl } };
    } catch (e) {
      return { rule: 'target-size', kind: 'open', message: `axe-core unavailable: ${(e as Error).message.split('\n')[0]}` };
    }
  }

  private locator(l: string) {
    const m = /^role=([a-z]+)(?:\[name=(?:'([^']*)'|"([^"]*)"|([^\]]*))\])?$/.exec(l.trim());
    if (m) return this.page.getByRole(m[1] as never, { name: m[2] ?? m[3] ?? m[4], exact: true });
    return this.page.locator(l);
  }

  private async trialClicks(): Promise<Record<string, { ok: boolean; error?: string }>> {
    const out: Record<string, { ok: boolean; error?: string }> = {};
    for (const c of this.controls) {
      try {
        await this.locator(c).click({ trial: true, timeout: 1500 });
        out[c] = { ok: true };
      } catch (e) {
        out[c] = { ok: false, error: (e as Error).message.split('\n')[0] };
      }
    }
    return out;
  }
}

export function describe(cfg: ResolvedConfiguration): Record<string, unknown> {
  return { profileId: cfg.profileId, profileRevision: cfg.profileRevision, panel: cfg.panel, posture: cfg.posture, orientation: cfg.orientation, viewport: cfg.viewport, dpr: cfg.deviceScaleFactor, displayFeature: cfg.displayFeature, webPosture: cfg.webPosture, keyboard: cfg.keyboard, gaps: cfg.gaps, sourceRefs: cfg.sourceRefs };
}

function redactObserved(o: object): Record<string, unknown> {
  return { ...(o as Record<string, unknown>), url: '<redacted>' };
}

export { attachAs as attach };
async function attachAs(page: Page, opts: AttachOptions): Promise<Foldproof> {
  return Foldproof.attach(page, opts);
}

export type { Step };
export { stepTransition, stepRules };
