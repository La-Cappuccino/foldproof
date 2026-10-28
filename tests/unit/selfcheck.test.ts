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
const good: ObservedSignals = { innerWidth: 1114, innerHeight: 720, dpr: 2.5, cssPosture: 'continuous', jsPosture: 'continuous', hSegs: 2, vSegs: 1, segments: [{ x: 0, y: 0, w: 540, h: 720 }, { x: 574, y: 0, w: 540, h: 720 }], orientation: 'landscape-primary', visualViewport: null, secureContext: true, url: 'http://localhost/' };

// selfCheck is a pure method; instantiate through the prototype without a browser
const session = Object.create(WebSession.prototype) as WebSession;

describe('environment self-check (acceptance 11.4)', () => {
  it('passes when every expected signal is observed', () => {
    const f = session.selfCheck(applied, good);
    expect(f.kind).toBe('pass');
  });
  it('is open, never pass, when segments are missing (emulation not effective)', () => {
    const f = session.selfCheck(applied, { ...good, hSegs: 1, segments: [{ x: 0, y: 0, w: 1114, h: 720 }] });
    expect(f.kind).toBe('open');
    expect(f.message).toMatch(/segments expected 2, observed 1/);
  });
  it('is open when the hinge rects are wrong even if the count is right', () => {
    const f = session.selfCheck(applied, { ...good, segments: [{ x: 0, y: 0, w: 500, h: 720 }, { x: 534, y: 0, w: 580, h: 720 }] });
    expect(f.kind).toBe('open');
    expect(f.message).toMatch(/segment 0 expected/);
  });
  it('is open when DPR, viewport, posture or secure context mismatch', () => {
    expect(session.selfCheck(applied, { ...good, dpr: 2 }).kind).toBe('open');
    expect(session.selfCheck(applied, { ...good, innerWidth: 1000 }).kind).toBe('open');
    expect(session.selfCheck(applied, { ...good, cssPosture: 'folded' }).kind).toBe('open');
    expect(session.selfCheck(applied, { ...good, secureContext: false }).kind).toBe('open');
  });
});

describe('hinge oracle', () => {
  const geom = (x: number, w: number): GeometryReport => ({ viewport: { w: 1114, h: 720 }, docClientWidth: 1114, docScrollWidth: 1114, controls: [{ locator: '#b', count: 1, key: '#b', role: 'button', name: 'B', rect: { x, y: 10, w, h: 44 }, visible: true, disabled: false, inert: false, pointerEvents: 'auto', clipped: false, inViewport: true, hits: [] }] });
  it('fails when a control intersects an opaque hinge', () => {
    const f = oracles.hinge(geom(530, 60), { orientation: 'vertical', offset: 540, maskLength: 34 }, false);
    expect(f[0]!.kind).toBe('fail');
  });
  it('passes when clear of the mask', () => {
    expect(oracles.hinge(geom(600, 60), { orientation: 'vertical', offset: 540, maskLength: 34 }, false)[0]!.kind).toBe('pass');
  });
  it('is notApplicable on a zero-width fold line, with an advisory when straddling in a folded posture', () => {
    const f = oracles.hinge(geom(400, 60), { orientation: 'vertical', offset: 418, maskLength: 0 }, true);
    expect(f.map((x) => `${x.rule}:${x.kind}`)).toEqual(['not-occluded-by-hinge:notApplicable', 'straddles-fold-line:review']);
    expect(oracles.hinge(geom(400, 60), null, false)[0]!.kind).toBe('notApplicable');
  });
});

describe('state policies', () => {
  const snap = (over: Partial<Parameters<typeof oracles.statePreserved>[0]> = {}) => ({ url: 'http://x/', historyLength: 2, historyState: 'null', scroll: [], focus: '#body', selection: [4, 7] as [number, number], form: { '#body': 'secret-text-value' }, storage: { local: { draft: 'secret-storage-value' }, session: {} }, media: { '#v': { t: 1.5, paused: false, ended: false } }, ...over });
  const policies = { form: 'all' as const, focus: 'same-element' as const, selection: 'exact' as const, scroll: 'anchor' as const, scroll_tolerance_px: 0, storage: ['draft'], history: 'no-loss' as const, media: 'progress' as const };
  it('allows legitimate change: media advances, storage gains keys, history grows', () => {
    const f = oracles.statePreserved(snap(), snap({ historyLength: 3, storage: { local: { draft: 'secret-storage-value', 'draft:savedAt': '1730000000' }, session: {} }, media: { '#v': { t: 2.4, paused: false, ended: false } } }), policies, [{ container: 'window', ok: true, detail: 'visible' }]);
    expect(f.kind).toBe('pass');
  });
  it('fails on loss: draft changed, focus gone, media rewound, declared key removed', () => {
    const f = oracles.statePreserved(snap(), snap({ form: { '#body': '' }, focus: null, selection: null, storage: { local: {}, session: {} }, media: { '#v': { t: 0, paused: true, ended: false } } }), policies, [{ container: 'window', ok: false, detail: 'anchor gone' }]);
    expect(f.kind).toBe('fail');
    expect(f.message).toMatch(/form field #body changed/);
    expect(f.message).toMatch(/focus moved/);
    expect(f.message).toMatch(/rewound/);
    expect(f.message).toMatch(/localStorage key draft removed/);
    expect(f.message).toMatch(/scroll position lost/);
    expect(JSON.stringify(f.details)).not.toContain('secret-text-value'); // form values masked in evidence
    expect(JSON.stringify(f.details)).not.toContain('secret-storage-value'); // storage values masked in evidence
  });
});
