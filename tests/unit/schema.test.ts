import { describe, it, expect } from 'vitest';
import { Profile, Scenario, PRESET_1, executablePanels, stepRules } from '../../src/core/schema.js';
import { resolveConfiguration, applyTransition, expectedSignals, isResolveError } from '../../src/core/configuration.js';

const src = { id: 'pw', url: 'https://github.com/microsoft/playwright', publisher: 'Microsoft', inspected: '2026-10-28', licence: 'Apache-2.0', kind: 'published' as const, revision: '1.64.1' };

export const foldable = {
  id: 'test-fold',
  revision: 1,
  kind: 'device' as const,
  platform: 'android' as const,
  name: 'Test Fold',
  sources: [src, { ...src, id: 'dev', url: 'https://chromium.googlesource.com/devtools/devtools-frontend', publisher: 'Chromium', licence: 'BSD-3-Clause' }],
  panels: [
    { name: 'outer' as const, physical_px: { w: 1080, h: 2520 }, source_ref: 'pw' },
    { name: 'inner' as const, physical_px: { w: 1968, h: 2184 }, source_ref: 'pw' },
  ],
  logical: [
    { panel: 'outer' as const, orientation: 'portrait' as const, unit: 'css_px' as const, w: 360, h: 840, scale: 3, kind: 'published' as const, source_ref: 'pw' },
    { panel: 'inner' as const, orientation: 'portrait' as const, unit: 'css_px' as const, w: 984, h: 1092, scale: 2, kind: 'published' as const, source_ref: 'pw' },
  ],
  usable: [
    { panel: 'outer' as const, orientation: 'portrait' as const, unit: 'css_px' as const, layout_viewport: { w: 360, h: 764 }, insets: { top: 0, right: 0, bottom: 0, left: 0 }, kind: 'published' as const, source_ref: 'pw' },
    { panel: 'inner' as const, orientation: 'portrait' as const, unit: 'css_px' as const, layout_viewport: { w: 984, h: 1016 }, insets: { top: 0, right: 0, bottom: 0, left: 0 }, kind: 'published' as const, source_ref: 'pw' },
  ],
  display_features: [
    { id: 'fold-line', panel: 'inner' as const, type: 'fold' as const, orientation: 'vertical' as const, bounds: { x: 492, y: 0, w: 0, h: 1016 }, unit: 'css_px' as const, occlusion: 'none' as const, kind: 'derived' as const, derivation: 'centre line of 984 px', source_ref: 'dev' },
  ],
  postures: [
    { name: 'closed' as const, panel: 'outer' as const, web: { posture: 'continuous' as const, segments: 1 as const }, source_ref: 'pw' },
    { name: 'flat' as const, panel: 'inner' as const, web: { posture: 'continuous' as const, segments: 1 as const }, android_state: 'FLAT' as const, source_ref: 'pw' },
    { name: 'half_opened' as const, panel: 'inner' as const, web: { posture: 'folded' as const, segments: 2 as const }, android_state: 'HALF_OPENED' as const, display_feature: 'fold-line', source_ref: 'dev' },
  ],
  inputs: { pointer: 'coarse' as const, hover: 'none' as const, touch: true, keyboard: 'soft' as const, source_ref: 'pw' },
  unknowns: [{ field: 'display_features.fold-line.bounds.w', reason: 'hinge mask width not published by any registry' }],
};

describe('Profile schema (provenance rules)', () => {
  it('accepts a sourced foldable profile and reports executable panels', () => {
    const r = Profile.safeParse(foldable);
    expect(r.success).toBe(true);
    expect(executablePanels(r.data!)).toEqual(['outer', 'inner']);
  });
  it('rejects a value whose source_ref is undeclared', () => {
    const bad = { ...foldable, logical: [{ ...foldable.logical[0], source_ref: 'nope' }, foldable.logical[1]] };
    const r = Profile.safeParse(bad);
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/not a declared source/);
  });
  it('rejects a missing unit', () => {
    const { unit: _u, ...noUnit } = foldable.logical[0]!;
    expect(Profile.safeParse({ ...foldable, logical: [noUnit, foldable.logical[1]] }).success).toBe(false);
  });
  it('rejects a derived value without its derivation', () => {
    const r = Profile.safeParse({ ...foldable, logical: [{ ...foldable.logical[0], kind: 'derived' }, foldable.logical[1]] });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/derivation/);
  });
  it('rejects a profile without the unknowns list', () => {
    const { unknowns: _x, ...bad } = foldable;
    expect(Profile.safeParse(bad).success).toBe(false);
  });
  it('rejects a source without an inspection date', () => {
    const { inspected: _d, ...s } = src;
    expect(Profile.safeParse({ ...foldable, sources: [s, foldable.sources[1]] }).success).toBe(false);
  });
  it('rejects a folded posture with no display feature', () => {
    const bad = { ...foldable, display_features: [], postures: foldable.postures.map((p) => ({ ...p, display_feature: undefined, web: { ...p.web, segments: 1 } })) };
    const r = Profile.safeParse(bad);
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/display_feature/);
  });
  it('rejects web.segments inconsistent with the active display feature', () => {
    const bad = { ...foldable, postures: foldable.postures.map((p) => (p.name === 'flat' ? { ...p, web: { posture: 'continuous', segments: 2 } } : p)) };
    const r = Profile.safeParse(bad);
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/segments must be 2 iff/);
  });
  it('accepts an inventory-only profile that declares logical as unknown, and marks it non-executable', () => {
    const inv = { ...foldable, logical: [], usable: [], display_features: [], postures: [], unknowns: [{ field: 'logical', reason: 'vendor publishes device px only' }] };
    const r = Profile.safeParse(inv);
    expect(r.success).toBe(true);
    expect(executablePanels(r.data!)).toEqual([]);
  });
  it('rejects a profile with no logical sizes and no matching unknown', () => {
    const bad = { ...foldable, logical: [], usable: [], display_features: [], postures: [], unknowns: [] };
    expect(Profile.safeParse(bad).success).toBe(false);
  });
  it('rejects unknown keys (no silent typos)', () => {
    expect(Profile.safeParse({ ...foldable, hinge: 'x' }).success).toBe(false);
  });
});

describe('Scenario schema', () => {
  const base = { foldproof: 1 as const, id: 'unfold-draft', title: 'Unfold keeps draft', profiles: ['test-fold'], task: { url: '/compose', controls: ['#send'] } };
  it('applies defaults: state policies, settle, empty steps = startup-only', () => {
    const r = Scenario.parse(base);
    expect(r.steps).toEqual([]);
    expect(r.settle).toEqual({ quiet_frames: 2, min_ms: 0, max_ms: 3000 });
    expect(r.task.state.scroll).toBe('anchor');
    expect(r.task.state.storage).toEqual([]);
    expect(r.expect).toEqual({ verdict: 'pass', rules: [] });
  });
  it('expands preset@1 and accepts explicit rule lists', () => {
    const r = Scenario.parse({ ...base, steps: [{ transition: 'unfold' }, { transition: { kind: 'rotate' }, assert: ['reachable'] }, { operate: { target: '#send', expect: { visible: '.sent' } } }] });
    expect(stepRules(r.steps[0]!)).toEqual(PRESET_1);
    expect(stepRules(r.steps[1]!)).toEqual(['reachable']);
    expect(stepRules(r.steps[2]!)).toEqual(['operate']);
  });
  it('requires the version key', () => {
    const { foldproof: _v, ...noVersion } = base;
    expect(Scenario.safeParse(noVersion).success).toBe(false);
  });
  it('rejects an unknown rule and an unknown transition kind', () => {
    expect(Scenario.safeParse({ ...base, steps: [{ transition: 'unfold', assert: ['looks-nice'] }] }).success).toBe(false);
    expect(Scenario.safeParse({ ...base, steps: [{ transition: 'input-change' }] }).success).toBe(false);
  });
  it('requires expect.rules when the verdict is fail', () => {
    expect(Scenario.safeParse({ ...base, expect: { verdict: 'fail' } }).success).toBe(false);
    expect(Scenario.safeParse({ ...base, expect: { verdict: 'fail', rules: ['state-preserved'] } }).success).toBe(true);
  });
  it('accepts a class selector', () => {
    expect(Scenario.safeParse({ ...base, profiles: { class: 'foldable' } }).success).toBe(true);
  });
});

describe('resolveConfiguration + expectedSignals', () => {
  const p = Profile.parse(foldable);
  it('resolves the outer panel closed', () => {
    const r = resolveConfiguration(p, { panel: 'outer', posture: 'closed' });
    if (isResolveError(r)) throw new Error(r.error);
    expect(r.viewport).toEqual({ w: 360, h: 764 });
    expect(r.deviceScaleFactor).toBe(3);
    expect(r.displayFeature).toBeNull();
    expect(r.expectedSegments).toBe(1);
    expect(r.gaps).toEqual([]);
  });
  it('resolves half_opened with the display feature and two expected segments', () => {
    const r = resolveConfiguration(p, { panel: 'inner', posture: 'half_opened' });
    if (isResolveError(r)) throw new Error(r.error);
    expect(r.displayFeature).toEqual({ orientation: 'vertical', offset: 492, maskLength: 0, occlusion: 'none' });
    expect(r.webPosture).toBe('folded');
    const sig = expectedSignals(r);
    expect(sig.segments).toBe(2);
    expect(sig.segmentRects).toEqual([
      { x: 0, y: 0, w: 492, h: 1016 },
      { x: 492, y: 0, w: 492, h: 1016 },
    ]);
  });
  it('derives landscape by swapping and records the gap', () => {
    const r = resolveConfiguration(p, { panel: 'inner', posture: 'flat', orientation: 'landscape' });
    if (isResolveError(r)) throw new Error(r.error);
    expect(r.viewport.w).toBeGreaterThan(r.viewport.h);
    expect(r.gaps.join(' ')).toMatch(/derived by swapping/);
  });
  it('refuses a posture that belongs to another panel', () => {
    const r = resolveConfiguration(p, { panel: 'outer', posture: 'flat' });
    expect(isResolveError(r) && r.error).toMatch(/belongs to panel/);
  });
  it('reports a non-executable profile distinctly', () => {
    const inv = Profile.parse({ ...foldable, logical: [], usable: [], display_features: [], postures: [], unknowns: [{ field: 'logical', reason: 'n/a' }] });
    const r = resolveConfiguration(inv, {});
    expect(isResolveError(r) && r.notExecutable).toBe(true);
  });
  it('unfold → inner/flat; fold → outer/closed; posture resets when the panel changes', () => {
    const start = resolveConfiguration(p, { panel: 'outer', posture: 'closed' });
    if (isResolveError(start)) throw new Error(start.error);
    const after = applyTransition(p, start, { kind: 'unfold', to: {} });
    if (isResolveError(after)) throw new Error(after.error);
    expect([after.panel, after.posture, after.viewport]).toEqual(['inner', 'flat', { w: 984, h: 1016 }]);
    const back = applyTransition(p, after, { kind: 'fold', to: {} });
    if (isResolveError(back)) throw new Error(back.error);
    expect([back.panel, back.posture]).toEqual(['outer', 'closed']);
  });
  it('keyboard-open requires a height unless the profile sources one; keyboard-close clears it', () => {
    const start = resolveConfiguration(p, { panel: 'outer', posture: 'closed' });
    if (isResolveError(start)) throw new Error(start.error);
    expect(isResolveError(applyTransition(p, start, { kind: 'keyboard-open', to: {} }))).toBe(true);
    const open = applyTransition(p, start, { kind: 'keyboard-open', to: { keyboard: { height: 300 } } });
    if (isResolveError(open)) throw new Error(open.error);
    expect(open.keyboard).toEqual({ height: 300 });
    expect(open.viewport).toEqual({ w: 360, h: 764 });
    const closed = applyTransition(p, open, { kind: 'keyboard-close', to: {} });
    if (isResolveError(closed)) throw new Error(closed.error);
    expect(closed.keyboard).toBeNull();
  });
  it('rotate flips orientation; resize requires a viewport', () => {
    const start = resolveConfiguration(p, { panel: 'inner', posture: 'flat' });
    if (isResolveError(start)) throw new Error(start.error);
    const rot = applyTransition(p, start, { kind: 'rotate', to: {} });
    if (isResolveError(rot)) throw new Error(rot.error);
    expect(rot.orientation).toBe('landscape');
    expect(isResolveError(applyTransition(p, start, { kind: 'resize', to: {} }))).toBe(true);
  });
});
