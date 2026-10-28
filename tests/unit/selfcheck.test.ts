import { describe, it, expect } from 'vitest';
import { WebSession, type ObservedSignals, type AppliedConfiguration } from '../../src/adapters/web/session.js';
import { expectedSignals, type ResolvedConfiguration } from '../../src/core/configuration.js';
import * as oracles from '../../src/oracles/index.js';
import type { GeometryReport } from '../../src/adapters/web/page-scripts.js';

const cfg: ResolvedConfiguration = {
  profileId: 'microsoft-surface-duo',
  profileRevision: 1,
  panel: 'inner',
  orientation: 'landscape',
  posture: 'flat',
  viewport: { w: 1114, h: 720 },
  explicitViewport: null,
  deviceScaleFactor: 2.5,
  isMobile: true,
  hasTouch: true,
  displayFeature: { orientation: 'vertical', offset: 540, maskLength: 34, occlusion: 'full' },
  webPosture: 'continuous',
  expectedSegments: 2,
  keyboard: null,
  inputs: { pointer: 'coarse', hover: 'none' },
  sourceRefs: [],
  gaps: [],
};
const applied: AppliedConfiguration = { cfg, effectiveViewport: cfg.viewport, keyboardMode: null, emulation: ['cdp-metrics', 'cdp-displayFeature', 'cdp-posture'], expected: expectedSignals(cfg) };
const good: ObservedSignals = { innerWidth: 1114, innerHeight: 720, dpr: 2.5, cssPosture: 'continuous', jsPosture: 'continuous', hSegs: 2, vSegs: 1, segments: [{ x: 0, y: 0, w: 540, h: 720 }, { x: 574, y: 0, w: 540, h: 720 }], screenOrientation: 'landscape-primary', cssOrientation: 'landscape', visualViewport: null, secureContext: true, url: 'http://localhost/?token=abc', keyboardOverlay: null };
const settled = { settled: true, ms: 80, frames: [] };

// selfCheck is a pure method; instantiate through the prototype without a browser
const session = Object.create(WebSession.prototype) as WebSession;

describe('environment self-check (acceptance 11.4)', () => {
  it('passes when every expected signal is observed and the page settled', () => {
    const f = session.selfCheck(applied, good, settled);
    expect(f.kind).toBe('pass');
    expect(JSON.stringify(f.details)).not.toContain('token=abc');
  });
  it('is open, never pass, when the page did not settle', () => {
    const f = session.selfCheck(applied, good, { settled: false, ms: 3000, frames: [] });
    expect(f.kind).toBe('open');
    expect(f.message).toMatch(/did not settle/);
  });
  it('is open when segments are missing or the rectangles are unavailable', () => {
    expect(session.selfCheck(applied, { ...good, hSegs: 1, segments: [{ x: 0, y: 0, w: 1114, h: 720 }] }, settled).message).toMatch(/segments expected 2, observed 1/);
    const f = session.selfCheck(applied, { ...good, segments: null }, settled);
    expect(f.kind).toBe('open');
    expect(f.message).toMatch(/segment rectangles unavailable/);
  });
  it('is open when the hinge rects are wrong even if the count is right', () => {
    const f = session.selfCheck(applied, { ...good, segments: [{ x: 0, y: 0, w: 500, h: 720 }, { x: 534, y: 0, w: 580, h: 720 }] }, settled);
    expect(f.kind).toBe('open');
    expect(f.message).toMatch(/segment 0 expected/);
  });
  it('is open when DPR, viewport, posture, orientation or secure context mismatch', () => {
    expect(session.selfCheck(applied, { ...good, dpr: 2 }, settled).kind).toBe('open');
    expect(session.selfCheck(applied, { ...good, innerWidth: 1000 }, settled).kind).toBe('open');
    expect(session.selfCheck(applied, { ...good, cssPosture: 'folded' }, settled).kind).toBe('open');
    expect(session.selfCheck(applied, { ...good, screenOrientation: 'portrait-primary' }, settled).kind).toBe('open');
    expect(session.selfCheck(applied, { ...good, secureContext: false }, settled).kind).toBe('open');
  });
  it('screen orientation and css orientation are checked separately (a split window may differ)', () => {
    const split: ResolvedConfiguration = { ...cfg, displayFeature: null, orientation: 'portrait', viewport: { w: 1000, h: 500 }, explicitViewport: { w: 1000, h: 500 } };
    const a: AppliedConfiguration = { cfg: split, effectiveViewport: split.viewport, keyboardMode: null, emulation: ['cdp-metrics'], expected: expectedSignals(split) };
    expect(a.expected.screenOrientation).toBe('portrait');
    expect(a.expected.cssOrientation).toBe('landscape');
    const f = session.selfCheck(a, { ...good, innerWidth: 1000, innerHeight: 500, hSegs: 1, segments: [{ x: 0, y: 0, w: 1000, h: 500 }], screenOrientation: 'portrait-primary', cssOrientation: 'landscape' }, settled);
    expect(f.kind).toBe('pass');
  });
  it('verifies the keyboard overlay approximation really exists, is visible and hit-testable', () => {
    const k: ResolvedConfiguration = { ...cfg, displayFeature: null, keyboard: { height: 300 } };
    const a: AppliedConfiguration = { cfg: k, effectiveViewport: k.viewport, keyboardMode: 'keyboard-overlay-approx', emulation: ['cdp-metrics', 'keyboard-overlay-approx'], expected: expectedSignals(k) };
    const base = { ...good, hSegs: 1 as const, segments: [{ x: 0, y: 0, w: 1114, h: 720 }] };
    const ok9 = Array(9).fill(true);
    expect(session.selfCheck(a, { ...base, keyboardOverlay: { present: true, height: 300, bottom: 720, left: 0, width: 1114, visible: true, hits: ok9 } }, settled).kind).toBe('pass');
    expect(session.selfCheck(a, { ...base, keyboardOverlay: null }, settled).message).toMatch(/keyboard overlay missing/);
    expect(session.selfCheck(a, { ...base, keyboardOverlay: { present: true, height: 300, bottom: 720, left: 0, width: 1114, visible: false, hits: Array(9).fill(false) } }, settled).message).toMatch(/not visible/);
    expect(session.selfCheck(a, { ...base, keyboardOverlay: { present: true, height: 120, bottom: 720, left: 0, width: 1114, visible: true, hits: ok9 } }, settled).message).toMatch(/height expected 300/);
    // a 30 px wide overlay (page CSS narrowed it) must not count as verified
    expect(session.selfCheck(a, { ...base, keyboardOverlay: { present: true, height: 300, bottom: 720, left: 0, width: 30, visible: true, hits: [true, false, false, true, false, false, true, false, false] } }, settled).message).toMatch(/does not span the viewport width/);
  });
});

describe('hinge oracle', () => {
  const geom = (x: number, w: number): GeometryReport => ({ viewport: { w: 1114, h: 720 }, docClientWidth: 1114, docScrollWidth: 1114, controls: [{ locator: '#b', count: 1, key: '#b', role: 'button', name: 'B', rect: { x, y: 10, w, h: 44 }, visible: true, disabled: false, inert: false, pointerEvents: 'auto', clipped: false, inViewport: true, hits: [] }] });
  it('fails when a control intersects an opaque hinge', () => {
    expect(oracles.hinge(geom(530, 60), { orientation: 'vertical', offset: 540, maskLength: 34, occlusion: 'full' }, false)[0]!.kind).toBe('fail');
  });
  it('passes when clear of the mask', () => {
    expect(oracles.hinge(geom(600, 60), { orientation: 'vertical', offset: 540, maskLength: 34, occlusion: 'full' }, false)[0]!.kind).toBe('pass');
  });
  it('a wide but non-occluding fold region is notApplicable with an advisory in folded postures', () => {
    const f = oracles.hinge(geom(780, 60), { orientation: 'vertical', offset: 800, maskLength: 107, occlusion: 'none' }, true);
    expect(f.map((x) => `${x.rule}:${x.kind}`)).toEqual(['not-occluded-by-hinge:notApplicable', 'straddles-fold-line:review']);
    expect(oracles.hinge(geom(780, 60), { orientation: 'vertical', offset: 800, maskLength: 107, occlusion: 'none' }, false).map((x) => x.rule)).toEqual(['not-occluded-by-hinge']);
  });
  it('is notApplicable on a zero-width fold line, with an advisory when straddling in a folded posture', () => {
    const f = oracles.hinge(geom(400, 60), { orientation: 'vertical', offset: 418, maskLength: 0, occlusion: 'none' }, true);
    expect(f.map((x) => `${x.rule}:${x.kind}`)).toEqual(['not-occluded-by-hinge:notApplicable', 'straddles-fold-line:review']);
    expect(oracles.hinge(geom(400, 60), null, false)[0]!.kind).toBe('notApplicable');
  });
});

describe('state policies', () => {
  const snap = (over: Partial<Parameters<typeof oracles.statePreserved>[0]> = {}) => ({ url: 'http://x/path?session=secret-query', historyLength: 2, historyState: 'null', scroll: [], focus: '#body', selection: [4, 7] as [number, number], form: { '#body': 'secret-text-value' }, storage: { local: { draft: 'secret-storage-value' }, session: {} }, media: { '#v': { t: 1.5, paused: false, ended: false } }, ...over });
  const policies = { form: 'all' as const, focus: 'same-element' as const, selection: 'exact' as const, scroll: 'anchor' as const, scroll_tolerance_px: 0, storage: ['draft'], history: 'no-loss' as const, media: 'progress' as const };
  it('allows legitimate change: media advances, storage gains keys, history grows', () => {
    const f = oracles.statePreserved(snap(), snap({ historyLength: 3, storage: { local: { draft: 'secret-storage-value', 'draft:savedAt': '1730000000' }, session: {} }, media: { '#v': { t: 2.4, paused: false, ended: false } } }), policies, [{ container: 'window', ok: true, detail: 'visible' }]);
    expect(f.kind).toBe('pass');
  });
  it('fails on loss and redacts values, history state and URL secrets in the evidence', () => {
    const f = oracles.statePreserved(snap({ historyState: '{"token":"secret-history"}' }), snap({ form: { '#body': '' }, focus: null, selection: null, storage: { local: {}, session: {} }, media: { '#v': { t: 0, paused: true, ended: false } }, historyState: '{"token":"other"}' }), policies, [{ container: 'window', ok: false, detail: 'anchor gone' }]);
    expect(f.kind).toBe('fail');
    expect(f.message).toMatch(/form field #body changed/);
    expect(f.message).toMatch(/focus moved/);
    expect(f.message).toMatch(/rewound/);
    expect(f.message).toMatch(/localStorage key draft removed/);
    expect(f.message).toMatch(/scroll position lost/);
    const dumped = JSON.stringify(f);
    for (const secret of ['secret-text-value', 'secret-storage-value', 'secret-history', 'secret-query', '17 chars', 's…e']) expect(dumped).not.toContain(secret);
  });
  it('deep redaction strips URL queries from any exported string, including nested error text', () => {
    const step = { findings: [{ message: 'runner error: page.goto: net::ERR at http://app.test/login?token=secret-token-value#frag', details: { stack: ['see https://app.test/x?k=secret-token-value'] } }] };
    const out = oracles.redactDeep(step);
    const dumped = JSON.stringify(out);
    expect(dumped).not.toContain('secret-token-value');
    expect(dumped).toContain('http://app.test/login?<redacted>');
  });
  it('a failing custom probe is open, not pass — but a confirmed loss still fails', () => {
    const probe = { before: { ok: false, error: 'window.missing is undefined' }, after: { ok: false, error: 'window.missing is undefined' } };
    expect(oracles.statePreserved(snap(), snap(), policies, [], probe).kind).toBe('open');
    const f = oracles.statePreserved(snap(), snap({ form: { '#body': '' } }), policies, [], probe);
    expect(f.kind).toBe('fail');
    expect(f.message).toMatch(/form field #body changed/);
  });
  it('a changed query string is a navigation even though the exported URL is redacted', () => {
    const f = oracles.statePreserved(snap({ url: 'http://x/path?draft=keep' }), snap({ url: 'http://x/path?draft=lost' }), policies, []);
    expect(f.kind).toBe('fail');
    expect(f.message).toMatch(/query string changed/);
    expect(JSON.stringify(f)).not.toContain('draft=lost');
    expect(oracles.statePreserved(snap({ url: 'http://x/path?a=1#top' }), snap({ url: 'http://x/path?a=1#bottom' }), policies, []).kind).toBe('pass');
  });
});
