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
  keyboardOverlay?: { present: boolean; height: number; bottom: number; left: number; width: number; visible: boolean; hits: boolean[] } | null;
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
  /** the configuration last applied; re-applied after anything that lets Playwright resend its own metrics */
  private last: ResolvedConfiguration | null = null;

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
    this.last = cfg;
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
        const visible = cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0 && r.height > 0 && r.width > 0;
        // hit-test across the whole requested covered region: left, centre, right × top edge, middle, bottom edge
        const ys = [r.top + 2, r.top + r.height / 2, r.bottom - 2];
        const xs = [2, innerWidth / 2, innerWidth - 2];
        const hits: boolean[] = [];
        for (const y of ys) for (const x of xs) hits.push(document.elementFromPoint(x, y) === el);
        s.keyboardOverlay = { present: true, height: Math.round(r.height), bottom: Math.round(r.bottom), left: Math.round(r.left), width: Math.round(r.width), visible, hits };
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
        if (k.left > 0 || k.width < observed.innerWidth - 1) problems.push(`keyboard overlay does not span the viewport width (left ${k.left}, width ${k.width}, viewport ${observed.innerWidth})`);
        if (!k.visible) problems.push('keyboard overlay not visible (page CSS suppresses it)');
        if (k.hits.length === 0 || !k.hits.every(Boolean)) problems.push(`keyboard overlay is not hit-testable across its area (${k.hits.filter(Boolean).length}/${k.hits.length} points)`);
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

  /**
   * Screenshot through OUR CDP session (Page.captureScreenshot). Playwright's page.screenshot sends device metrics
   * through its own session and Chromium then ignores our identical re-send, silently leaving the page at the
   * context viewport (verified 2026-10-28). Masked selectors are hidden with a temporary stylesheet.
   */
  async screenshot(file: string, mask: string[]): Promise<boolean> {
    const STYLE_ID = '__foldproof_mask';
    try {
      // Masking is fail-closed: every mask must resolve (via the same locator engine as controls) to at least one
      // element, every match must be confirmed hidden immediately before capture, and the match set is re-confirmed
      // after capture; if anything differs the image is discarded. CSS masks additionally get a live selector rule
      // so an element re-rendered between stamping and capture is still hidden.
      const confirmMasks = ({ id, locators, install }: { id: string; locators: string[]; install: boolean }) => {
        const fp = (window as unknown as { __foldproof: { query(l: string, h?: boolean): Element[] } }).__foldproof;
        const els: Element[] = [];
        const cssRules: string[] = [];
        for (const l of locators) {
          let found: Element[];
          try {
            found = fp.query(l, true);
          } catch {
            return { ok: false, reason: `unparseable mask "${l}"` };
          }
          if (found.length === 0) return { ok: false, reason: `mask "${l}" matched no element` };
          els.push(...found);
          if (!/^role=/.test(l.trim())) cssRules.push(l);
        }
        if (install) {
          for (const e of els) e.setAttribute('data-foldproof-mask', '');
          const st = document.createElement('style');
          st.id = id;
          st.textContent =
            '[data-foldproof-mask],[data-foldproof-mask] *{visibility:hidden !important}\n' +
            '[data-foldproof-mask]::before,[data-foldproof-mask]::after,[data-foldproof-mask] *::before,[data-foldproof-mask] *::after{content:none !important;visibility:hidden !important;display:none !important}' +
            (cssRules.length ? `\n${cssRules.join(',')}{visibility:hidden !important}` : '');
          document.documentElement.appendChild(st);
          // belt and braces: an opaque fixed box over each masked rect, so a descendant forcing itself visible is still covered
          for (const e of els) {
            const r = e.getBoundingClientRect();
            const box = document.createElement('div');
            box.setAttribute('data-foldproof-mask-box', '');
            box.style.cssText = `position:fixed !important;left:${r.left}px !important;top:${r.top}px !important;width:${r.width}px !important;height:${r.height}px !important;background:#000 !important;z-index:2147483647 !important;pointer-events:none !important;display:block !important;visibility:visible !important;opacity:1 !important;`;
            document.documentElement.appendChild(box);
          }
        }
        // confirm: every masked element is hidden, every descendant is hidden, and any on-screen part of its rect
        // hit-tests to a mask box (not to page content)
        const boxes = Array.from(document.querySelectorAll('[data-foldproof-mask-box]'));
        // generated content can render outside the element's rect and cannot be boxed: it must be gone
        const pseudoVisible = (n: Element) =>
          ['::before', '::after'].some((p) => {
            const cs = getComputedStyle(n, p);
            return cs.content !== 'none' && cs.content !== 'normal' && cs.display !== 'none' && cs.visibility !== 'hidden';
          });
        for (const e of els) {
          if (!e.hasAttribute('data-foldproof-mask') || getComputedStyle(e).visibility !== 'hidden') return { ok: false, reason: 'a masked element is not hidden', count: els.length };
          if (pseudoVisible(e)) return { ok: false, reason: 'a masked element keeps visible generated content (::before/::after)', count: els.length };
          for (const d of Array.from(e.querySelectorAll('*'))) {
            if (pseudoVisible(d)) return { ok: false, reason: 'a descendant of a masked element keeps visible generated content', count: els.length };
          }
          for (const d of Array.from(e.querySelectorAll('*'))) if (getComputedStyle(d).visibility !== 'hidden' && getComputedStyle(d).display !== 'none') {
            // a descendant overrides visibility: the box must cover it
            const r = d.getBoundingClientRect();
            const onScreen = r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
            if (!onScreen) continue;
            const cx = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1);
            const cy = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
            const hit = document.elementFromPoint(cx, cy);
            if (!hit || !boxes.includes(hit)) return { ok: false, reason: 'a descendant of a masked element is still visible and uncovered', count: els.length };
          }
        }
        return { ok: true, reason: '', count: els.length };
      };
      let before: { ok: boolean; reason: string; count?: number } = { ok: true, reason: '' };
      if (mask.length) {
        before = await this.page.evaluate(confirmMasks, { id: STYLE_ID, locators: mask, install: true });
        if (!before.ok) return false;
      }
      const { data } = (await this.cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false } as never)) as { data: string };
      if (mask.length) {
        const after = await this.page.evaluate(confirmMasks, { id: STYLE_ID, locators: mask, install: false });
        if (!after.ok || after.count !== before.count) return false; // the page changed under us: discard the image
      }
      const { writeFile } = await import('node:fs/promises');
      await writeFile(file, Buffer.from(data, 'base64'));
      return true;
    } catch {
      return false; // a failed screenshot never changes a verdict and never writes an unmasked image
    } finally {
      if (mask.length) {
        await this.page
          .evaluate((id) => {
            document.getElementById(id)?.remove();
            for (const e of Array.from(document.querySelectorAll('[data-foldproof-mask]'))) e.removeAttribute('data-foldproof-mask');
            for (const b of Array.from(document.querySelectorAll('[data-foldproof-mask-box]'))) b.remove();
          }, STYLE_ID)
          .catch(() => undefined);
      }
    }
  }

  async detach(): Promise<void> {
    await this.cdp.send('Emulation.clearDevicePostureOverride' as never, {} as never).catch(() => undefined);
    await this.cdp.send('Emulation.clearDeviceMetricsOverride').catch(() => undefined);
    await this.cdp.detach().catch(() => undefined);
  }
}
