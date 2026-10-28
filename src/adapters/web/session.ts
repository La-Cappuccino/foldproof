/**
 * WebSession: owns every device-metrics change for a Playwright page through CDP.
 *
 * Verified facts this encodes (docs/research/00 + council corrections, 2026-10-28, Chromium 156):
 *  - inline `displayFeature` on Emulation.setDeviceMetricsOverride is the working segment emulation while
 *    Playwright's viewport emulation is active; the dedicated setDisplayFeaturesOverride is a no-op there;
 *  - Emulation.setDevicePostureOverride flips `(device-posture: folded)` live when a sentinel MQL exists;
 *  - DPR/viewport change mid-session without reload; page.setViewportSize resets DPR and drops the feature,
 *    so it is never called here.
 */
import type { Page, CDPSession, BrowserContext } from 'playwright';
import { RECORDER_SOURCE } from './recorder.js';
import type { ResolvedConfiguration, ExpectedSignals } from '../../core/configuration.js';
import { expectedSignals } from '../../core/configuration.js';
import type { EmulationMethod, Finding } from '../../core/types.js';

export interface ObservedSignals {
  innerWidth: number;
  innerHeight: number;
  dpr: number;
  cssPosture: 'folded' | 'continuous';
  jsPosture: string | null;
  hSegs: 1 | 2;
  vSegs: 1 | 2;
  segments: { x: number; y: number; w: number; h: number }[] | null;
  screenOrientation: string | null;
  cssOrientation: 'portrait' | 'landscape';
  visualViewport: { w: number; h: number } | null;
  secureContext: boolean;
  url: string;
  /** keyboard overlay approximation, when one was requested */
  keyboardOverlay?: { present: boolean; height: number; bottom: number; visible: boolean; hit: boolean } | null;
}

export type KeyboardMode = 'keyboard-shrink' | 'keyboard-overlay-approx';

export interface AppliedConfiguration {
  cfg: ResolvedConfiguration;
  effectiveViewport: { w: number; h: number };
  keyboardMode: KeyboardMode | null;
  emulation: EmulationMethod[];
  expected: ExpectedSignals;
}

export interface SettleResult {
  settled: boolean;
  ms: number;
  frames: { t: number; missingStamps: string[] }[];
}

export const KEYBOARD_OVERLAY_ID = '__foldproof_keyboard';

export class WebSession {
  private constructor(
    readonly page: Page,
    readonly cdp: CDPSession,
    readonly engine: { name: string; version: string },
  ) {}

  /** Call before navigation: installs the recorder into the context and takes over metrics. Chromium only in v0.1. */
  static async attach(page: Page): Promise<WebSession> {
    const ctx: BrowserContext = page.context();
    const browserName = ctx.browser()?.browserType().name() ?? 'unknown';
    if (browserName !== 'chromium') throw new Error(`foldproof v0.1 needs Chromium for CDP emulation (got ${browserName}); Firefox/WebKit are not supported yet`);
    await ctx.addInitScript(RECORDER_SOURCE);
    const cdp = await ctx.newCDPSession(page);
    return new WebSession(page, cdp, { name: browserName, version: ctx.browser()?.version() ?? 'unknown' });
  }

  /** Keyboard approximation from the page's viewport meta; engine default (Chrome 108+) is resizes-visual → overlay. */
  async keyboardModeFor(): Promise<KeyboardMode> {
    const content = await this.page.evaluate(() => document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? '').catch(() => '');
    return /interactive-widget\s*=\s*resizes-content/i.test(content) ? 'keyboard-shrink' : 'keyboard-overlay-approx';
  }

  async apply(cfg: ResolvedConfiguration): Promise<AppliedConfiguration> {
    const emulation: EmulationMethod[] = ['cdp-metrics'];
    let effectiveViewport = { ...cfg.viewport };
    let keyboardMode: KeyboardMode | null = null;
    if (cfg.keyboard) {
      keyboardMode = await this.keyboardModeFor();
      if (keyboardMode === 'keyboard-shrink') effectiveViewport = { w: cfg.viewport.w, h: Math.max(100, cfg.viewport.h - cfg.keyboard.height) };
      emulation.push(keyboardMode);
    }
    const landscape = cfg.orientation === 'landscape';
    const metrics: Record<string, unknown> = {
      width: effectiveViewport.w,
      height: effectiveViewport.h,
      deviceScaleFactor: cfg.deviceScaleFactor,
      mobile: cfg.isMobile,
      screenWidth: cfg.viewport.w,
      screenHeight: cfg.viewport.h,
      screenOrientation: { type: landscape ? 'landscapePrimary' : 'portraitPrimary', angle: landscape ? 90 : 0 },
    };
    if (cfg.displayFeature) {
      metrics.displayFeature = { orientation: cfg.displayFeature.orientation, offset: cfg.displayFeature.offset, maskLength: cfg.displayFeature.maskLength };
      emulation.push('cdp-displayFeature');
    }
    await this.cdp.send('Emulation.setDeviceMetricsOverride', metrics as never);
    await this.cdp.send('Emulation.setTouchEmulationEnabled', { enabled: cfg.hasTouch, maxTouchPoints: cfg.hasTouch ? 5 : 1 });
    await this.cdp.send('Emulation.setDevicePostureOverride' as never, { posture: { type: cfg.webPosture } } as never);
    emulation.push('cdp-posture');
    await this.cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'pointer', value: cfg.inputs.pointer }, { name: 'hover', value: cfg.inputs.hover }] } as never);
    // keyboard overlay approximation: an opaque, hit-testable fixed element of the keyboard height (errors propagate)
    const overlayHeight = keyboardMode === 'keyboard-overlay-approx' && cfg.keyboard ? cfg.keyboard.height : 0;
    await this.page.evaluate(
      ({ id, height }) => {
        const existing = document.getElementById(id);
        if (!height) {
          existing?.remove();
          return;
        }
        const el = existing ?? document.createElement('div');
        el.id = id;
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('data-foldproof-keyboard', 'overlay-approx');
        el.style.cssText = `position:fixed !important;left:0 !important;right:0 !important;bottom:0 !important;height:${height}px !important;z-index:2147483647 !important;background:#d9d9de !important;pointer-events:auto !important;display:block !important;visibility:visible !important;opacity:1 !important;`;
        if (!existing) document.documentElement.appendChild(el);
      },
      { id: KEYBOARD_OVERLAY_ID, height: overlayHeight },
    );
    return { cfg, effectiveViewport, keyboardMode, emulation, expected: expectedSignals(cfg, effectiveViewport) };
  }

  async observe(): Promise<ObservedSignals> {
    return this.page.evaluate((id) => {
      const fp = (window as unknown as { __foldproof: { signals(): ObservedSignals } }).__foldproof;
      const s = fp.signals();
      const el = document.getElementById(id);
      if (el) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const visible = cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0 && r.height > 0;
        const probe = document.elementFromPoint(Math.min(innerWidth - 1, 10), innerHeight - Math.max(1, r.height / 2));
        s.keyboardOverlay = { present: true, height: Math.round(r.height), bottom: Math.round(r.bottom), visible, hit: probe === el };
      } else s.keyboardOverlay = null;
      return s;
    }, KEYBOARD_OVERLAY_ID);
  }

  async settle(opts: { quiet_frames: number; min_ms?: number; max_ms: number }): Promise<SettleResult> {
    return this.page.evaluate(
      (o) => (window as unknown as { __foldproof: { observe(a: { quietFrames: number; minMs: number; maxMs: number }): Promise<SettleResult> } }).__foldproof.observe({ quietFrames: o.quiet_frames, minMs: o.min_ms ?? 0, maxMs: o.max_ms }),
      opts,
    );
  }

  /**
   * Environment self-check: expected vs observed, plus quiescence. A mismatch or an unsettled page makes dependent
   * results `open`, never `pass`.
   */
  selfCheck(applied: AppliedConfiguration, observed: ObservedSignals, settle?: SettleResult): Finding {
    const e = applied.expected;
    const problems: string[] = [];
    if (settle && !settle.settled) problems.push(`page did not settle within ${settle.ms} ms (DOM kept mutating or the viewport kept changing)`);
    if (observed.innerWidth !== e.innerWidth || observed.innerHeight !== e.innerHeight) problems.push(`viewport expected ${e.innerWidth}x${e.innerHeight}, observed ${observed.innerWidth}x${observed.innerHeight}`);
    if (Math.abs(observed.dpr - e.dpr) > 0.001) problems.push(`dpr expected ${e.dpr}, observed ${observed.dpr}`);
    if (observed.cssPosture !== e.cssPosture) problems.push(`css posture expected ${e.cssPosture}, observed ${observed.cssPosture}`);
    if (observed.jsPosture && observed.jsPosture !== e.cssPosture) problems.push(`navigator.devicePosture expected ${e.cssPosture}, observed ${observed.jsPosture}`);
    const observedSegs = applied.cfg.displayFeature?.orientation === 'horizontal' ? observed.vSegs : observed.hSegs;
    if (observedSegs !== e.segments) problems.push(`segments expected ${e.segments}, observed ${observedSegs}`);
    if (e.segmentRects) {
      if (!observed.segments) problems.push('segment rectangles unavailable (window.viewport.segments missing): hinge geometry not observed');
      else if (observed.segments.length !== e.segmentRects.length) problems.push(`segment rects expected ${e.segmentRects.length}, observed ${observed.segments.length}`);
      else
        e.segmentRects.forEach((r, i) => {
          const o = observed.segments![i]!;
          if (Math.abs(o.x - r.x) > 1 || Math.abs(o.y - r.y) > 1 || Math.abs(o.w - r.w) > 1 || Math.abs(o.h - r.h) > 1) problems.push(`segment ${i} expected ${JSON.stringify(r)}, observed ${JSON.stringify(o)}`);
        });
    }
    if (observed.screenOrientation) {
      const so = observed.screenOrientation.startsWith('landscape') ? 'landscape' : 'portrait';
      if (so !== e.screenOrientation) problems.push(`screen orientation expected ${e.screenOrientation}, observed ${observed.screenOrientation}`);
    }
    if (observed.cssOrientation !== e.cssOrientation) problems.push(`css (orientation) expected ${e.cssOrientation}, observed ${observed.cssOrientation}`);
    if (applied.keyboardMode === 'keyboard-overlay-approx' && applied.cfg.keyboard) {
      const k = observed.keyboardOverlay;
      if (!k || !k.present) problems.push('keyboard overlay missing');
      else {
        if (Math.abs(k.height - applied.cfg.keyboard.height) > 1) problems.push(`keyboard overlay height expected ${applied.cfg.keyboard.height}, observed ${k.height}`);
        if (Math.abs(k.bottom - observed.innerHeight) > 1) problems.push(`keyboard overlay not anchored to the bottom (bottom ${k.bottom}, viewport ${observed.innerHeight})`);
        if (!k.visible) problems.push('keyboard overlay not visible (page CSS suppresses it)');
        if (!k.hit) problems.push('keyboard overlay is not hit-testable (something covers it or pointer-events are overridden)');
      }
    } else if (observed.keyboardOverlay?.present) problems.push('a keyboard overlay is present but none was requested');
    if (!observed.secureContext) problems.push('page is not a secure context: navigator.devicePosture/virtualKeyboard unavailable; serve from https or localhost');
    return {
      rule: 'env-self-check',
      kind: problems.length ? 'open' : 'pass',
      message: problems.length ? `emulation not effective: ${problems.join('; ')}` : `emulation verified (${applied.emulation.join(', ')})${settle ? `, settled in ${settle.ms} ms` : ''}`,
      details: { expected: e, observed: { ...observed, url: '<redacted>' }, emulation: applied.emulation, keyboardMode: applied.keyboardMode, settle: settle ? { settled: settle.settled, ms: settle.ms, frames: settle.frames.length } : null },
      emulation: applied.emulation,
    };
  }

  async screenshot(file: string, mask: string[]): Promise<void> {
    await this.page.screenshot({ path: file, fullPage: false, mask: mask.map((m) => this.page.locator(m)), animations: 'disabled' }).catch(() => undefined);
  }

  async detach(): Promise<void> {
    await this.cdp.send('Emulation.clearDevicePostureOverride' as never, {} as never).catch(() => undefined);
    await this.cdp.send('Emulation.clearDeviceMetricsOverride').catch(() => undefined);
    await this.cdp.detach().catch(() => undefined);
  }
}
