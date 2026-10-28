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
  orientation: string;
  visualViewport: { w: number; h: number } | null;
  secureContext: boolean;
  url: string;
}

export type KeyboardMode = 'keyboard-shrink' | 'keyboard-overlay-approx';

export interface AppliedConfiguration {
  cfg: ResolvedConfiguration;
  effectiveViewport: { w: number; h: number };
  keyboardMode: KeyboardMode | null;
  emulation: EmulationMethod[];
  expected: ExpectedSignals;
}

export const KEYBOARD_OVERLAY_ID = '__foldproof_keyboard';

export class WebSession {
  private constructor(
    readonly page: Page,
    readonly cdp: CDPSession,
    readonly engine: { name: string; version: string },
  ) {}

  /** Call before navigation: installs the recorder into the context and takes over metrics. */
  static async attach(page: Page): Promise<WebSession> {
    const ctx: BrowserContext = page.context();
    if (!(await ctx.pages()).includes(page)) throw new Error('page does not belong to its context');
    const browserName = ctx.browser()?.browserType().name() ?? 'unknown';
    if (browserName !== 'chromium') throw new Error(`foldproof web adapter needs Chromium for CDP emulation (got ${browserName})`);
    await ctx.addInitScript(RECORDER_SOURCE);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    return new WebSession(page, cdp, { name: browserName, version: ctx.browser()?.version() ?? 'unknown' });
  }

  /** Decide the keyboard approximation from the page's viewport meta and the engine default (Chrome 108+: resizes-visual). */
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
    await this.cdp.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'pointer', value: cfg.inputs.pointer },
        { name: 'hover', value: cfg.inputs.hover },
      ],
    } as never);
    // keyboard overlay approximation: an opaque, hit-testable fixed element of the keyboard height
    await this.page
      .evaluate(
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
          el.style.cssText = `position:fixed;left:0;right:0;bottom:0;height:${height}px;z-index:2147483647;background:#d9d9de;pointer-events:auto;`;
          if (!existing) document.documentElement.appendChild(el);
        },
        { id: KEYBOARD_OVERLAY_ID, height: keyboardMode === 'keyboard-overlay-approx' && cfg.keyboard ? cfg.keyboard.height : 0 },
      )
      .catch(() => undefined);
    return { cfg, effectiveViewport, keyboardMode, emulation, expected: expectedSignals(cfg, effectiveViewport) };
  }

  async observe(): Promise<ObservedSignals> {
    return this.page.evaluate(() => (window as unknown as { __foldproof: { signals(): ObservedSignals } }).__foldproof.signals());
  }

  async settle(opts: { quiet_frames: number; max_ms: number }): Promise<{ settled: boolean; ms: number; frames: unknown[] }> {
    return this.page.evaluate(
      (o) => (window as unknown as { __foldproof: { observe(a: { quietFrames: number; maxMs: number }): Promise<{ settled: boolean; ms: number; frames: unknown[] }> } }).__foldproof.observe({ quietFrames: o.quiet_frames, maxMs: o.max_ms }),
      opts,
    );
  }

  /** Environment self-check: expected vs observed. A mismatch makes dependent results `open`, never `pass`. */
  selfCheck(applied: AppliedConfiguration, observed: ObservedSignals): Finding {
    const e = applied.expected;
    const problems: string[] = [];
    if (observed.innerWidth !== e.innerWidth || observed.innerHeight !== e.innerHeight) problems.push(`viewport expected ${e.innerWidth}x${e.innerHeight}, observed ${observed.innerWidth}x${observed.innerHeight}`);
    if (Math.abs(observed.dpr - e.dpr) > 0.001) problems.push(`dpr expected ${e.dpr}, observed ${observed.dpr}`);
    if (observed.cssPosture !== e.cssPosture) problems.push(`css posture expected ${e.cssPosture}, observed ${observed.cssPosture}`);
    if (observed.jsPosture && observed.jsPosture !== e.cssPosture) problems.push(`navigator.devicePosture expected ${e.cssPosture}, observed ${observed.jsPosture}`);
    const observedSegs = applied.cfg.displayFeature?.orientation === 'horizontal' ? observed.vSegs : observed.hSegs;
    if (observedSegs !== e.segments) problems.push(`segments expected ${e.segments}, observed ${observedSegs}`);
    if (e.segmentRects && observed.segments) {
      if (observed.segments.length !== e.segmentRects.length) problems.push(`segment rects expected ${e.segmentRects.length}, observed ${observed.segments.length}`);
      else
        e.segmentRects.forEach((r, i) => {
          const o = observed.segments![i]!;
          if (Math.abs(o.x - r.x) > 1 || Math.abs(o.y - r.y) > 1 || Math.abs(o.w - r.w) > 1 || Math.abs(o.h - r.h) > 1) problems.push(`segment ${i} expected ${JSON.stringify(r)}, observed ${JSON.stringify(o)}`);
        });
    }
    const observedOrientation = observed.orientation.startsWith('landscape') ? 'landscape' : 'portrait';
    if (observedOrientation !== e.orientation) problems.push(`orientation expected ${e.orientation}, observed ${observed.orientation}`);
    if (!observed.secureContext) problems.push('page is not a secure context: navigator.devicePosture/virtualKeyboard unavailable; serve from https or localhost');
    return {
      rule: 'env-self-check',
      kind: problems.length ? 'open' : 'pass',
      message: problems.length ? `emulation not effective: ${problems.join('; ')}` : `emulation verified (${applied.emulation.join(', ')})`,
      details: { expected: e, observed, emulation: applied.emulation, keyboardMode: applied.keyboardMode },
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
