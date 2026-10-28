/**
 * Oracles: pure functions from observations to findings. Decided at quiescence; the per-frame log is evidence.
 * Every rule explains itself in `message` and keeps observations in `details`, with values and secrets redacted
 * before anything is exported (form values, storage values, history state, URL query/fragment).
 */
import type { Finding } from '../core/types.js';
import type { StatePolicies } from '../core/schema.js';
import type { StateSnapshot, GeometryReport, ControlGeometry, StampCheck, ElementIdentity } from '../adapters/web/page-scripts.js';

export const ORACLE_VERSION = '0.1.1';

export const RULE_HELP: Record<string, { description: string; helpUri: string; relatesTo: string }> = {
  'env-self-check': { description: 'Expected vs observed emulation signals after each configuration change; the page settled', helpUri: 'https://github.com/La-Cappuccino/foldproof/blob/main/skills/foldproof/references/platform-boundaries.md', relatesTo: 'foldproof' },
  reachable: { description: 'Declared controls remain visible, in viewport, hit-testable and actionable without a real click', helpUri: 'https://www.w3.org/WAI/WCAG22/Understanding/reflow.html', relatesTo: 'WCAG 2.2 1.4.10 Reflow (relates to); Google adaptive Config_Changes' },
  'state-preserved': { description: 'Form values, focus, selection, scroll anchor, declared storage, history and media survive the transition under per-field policies', helpUri: 'https://developer.android.com/develop/adaptive-apps/quality-guidelines', relatesTo: 'Google adaptive Tier 3 Config_Changes (T-Config_State)' },
  'no-remount': { description: 'Declared controls keep node identity across the transition (a remount loses focus and ephemeral state)', helpUri: 'https://github.com/La-Cappuccino/foldproof/blob/main/skills/foldproof/references/state-policies.md', relatesTo: 'foldproof' },
  'not-occluded-by-hinge': { description: 'Declared controls do not intersect an occluding hinge region', helpUri: 'https://developer.mozilla.org/en-US/docs/Web/API/Viewport_segments_API/Using', relatesTo: 'Viewport Segments API; Google LS-F1' },
  'straddles-fold-line': { description: 'Advisory: a control crosses a non-occluding fold line or region in a folded posture', helpUri: 'https://developer.mozilla.org/en-US/docs/Web/API/Viewport_segments_API/Using', relatesTo: 'advisory' },
  'no-element-loss': { description: 'Declared controls and landmarks keep an element with the same role and accessible name', helpUri: 'https://www.w3.org/WAI/WCAG22/Understanding/reflow.html', relatesTo: 'WCAG 2.2 1.4.10 (loss of information or functionality) (relates to)' },
  'fills-viewport': { description: 'The document lays out to the viewport width (no letterbox / fixed-width page)', helpUri: 'https://developer.android.com/develop/adaptive-apps/quality-guidelines', relatesTo: 'Google adaptive Config_Changes (not letterboxed)' },
  operate: { description: 'An explicit action on a declared control produces the declared outcome', helpUri: 'https://github.com/La-Cappuccino/foldproof/blob/main/skills/foldproof/references/transitions.md', relatesTo: 'foldproof task completion' },
  'no-horizontal-overflow': { description: 'Diagnostic: document scroll width does not exceed the layout viewport', helpUri: 'https://www.w3.org/WAI/WCAG22/Understanding/reflow.html', relatesTo: 'WCAG 2.2 1.4.10 (relates to), diagnostic only' },
  'target-size': { description: 'Diagnostic: interactive targets meet the minimum size (axe-core target-size)', helpUri: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html', relatesTo: 'WCAG 2.2 2.5.8 (relates to), diagnostic only' },
};

const loc = (c: ControlGeometry) => ({ selector: c.locator, role: c.role, name: c.name, rect: c.rect ?? undefined });

export function reachable(geom: GeometryReport, trialClicks: Record<string, { ok: boolean; error?: string }>): Finding[] {
  return geom.controls.map((c): Finding => {
    if (c.count !== 1) {
      return { rule: 'reachable', kind: 'open', message: `locator "${c.locator}" resolved to ${c.count} elements (must be exactly one)`, locations: [{ selector: c.locator }], details: { count: c.count } };
    }
    const problems: string[] = [];
    if (!c.visible) problems.push('not visible');
    else if (!c.inViewport) problems.push(`outside the viewport after scrollIntoView (rect ${JSON.stringify(c.rect)}, viewport ${geom.viewport.w}x${geom.viewport.h})`);
    if (c.clipped) problems.push('clipped by an overflow-hidden ancestor');
    if (c.disabled) problems.push('disabled');
    if (c.inert) problems.push('inside an inert subtree');
    if (c.pointerEvents === 'none') problems.push('pointer-events: none');
    if (c.visible) {
      const covered = c.hits.filter((h) => !h.ok && h.coveredBy);
      if (c.hits.length && c.hits.every((h) => !h.ok)) {
        const by = covered[0]?.coveredBy;
        problems.push(by ? `covered by ${by.name ? `"${by.name}"` : by.key}${by.role ? ` (${by.role})` : ''}` : 'no hit-test point resolves to the control');
      } else if (covered.length) {
        problems.push(`partially covered at ${covered.map((h) => h.point).join(', ')} by ${covered[0]!.coveredBy!.name || covered[0]!.coveredBy!.key}`);
      }
    }
    const trial = trialClicks[c.locator];
    if (trial && !trial.ok) problems.push(`actionability check failed: ${trial.error ?? 'unknown'}`);
    return {
      rule: 'reachable',
      kind: problems.length ? 'fail' : 'pass',
      message: problems.length ? `"${c.name || c.locator}" is not reachable: ${problems.join('; ')}` : `"${c.name || c.locator}" reachable (hit-test ${c.hits.filter((h) => h.ok).length}/${c.hits.length}, trial click ok)`,
      locations: [loc(c)],
      details: { hits: c.hits, trial },
    };
  });
}

export interface CustomProbe {
  ok: boolean;
  value?: unknown;
  error?: string;
}

export function statePreserved(before: StateSnapshot, after: StateSnapshot, policies: StatePolicies, anchors: { container: string; ok: boolean | null; detail: string }[], custom?: { before: CustomProbe; after: CustomProbe }): Finding {
  const losses: string[] = [];
  const notes: string[] = [];
  const customFailed = !!custom && (!custom.before.ok || !custom.after.ok);
  if (policies.form !== 'none') {
    for (const [k, v] of Object.entries(before.form)) {
      if (!(k in after.form)) losses.push(`form field ${k} disappeared`);
      else if (after.form[k] !== v) losses.push(`form field ${k} changed (${mask(v)} → ${mask(after.form[k])})`);
    }
  }
  if (policies.focus === 'same-element' && before.focus && before.focus !== after.focus) losses.push(`focus moved from ${before.focus} to ${after.focus ?? 'nothing'}`);
  if (policies.selection === 'exact' && before.selection && JSON.stringify(before.selection) !== JSON.stringify(after.selection)) losses.push(`selection ${JSON.stringify(before.selection)} → ${JSON.stringify(after.selection)}`);
  if (policies.scroll === 'anchor') {
    for (const a of anchors) {
      if (a.ok === false) losses.push(`scroll position lost in ${a.container}: ${a.detail}`);
      else if (a.ok === null) notes.push(`${a.container}: ${a.detail}`);
    }
  }
  if (policies.storage.length) {
    for (const area of ['local', 'session'] as const) {
      for (const [k, v] of Object.entries(before.storage[area])) {
        if (!(k in after.storage[area])) losses.push(`${area}Storage key ${k} removed`);
        else if (after.storage[area][k] !== v) losses.push(`${area}Storage key ${k} changed`);
      }
    }
  }
  if (policies.history === 'no-loss') {
    if (after.historyLength < before.historyLength) losses.push(`history length shrank ${before.historyLength} → ${after.historyLength}`);
    if (before.historyState !== null && before.historyState !== 'null' && after.historyState !== before.historyState) losses.push('history.state changed');
    // compare the real fragment-stripped URLs (a changed query string is a navigation); redact only what is exported
    const stripFragment = (u: string) => u.split('#')[0];
    if (stripFragment(after.url) !== stripFragment(before.url)) losses.push(`navigated: ${redactUrl(before.url)} → ${redactUrl(after.url)}${redactUrl(before.url) === redactUrl(after.url) ? ' (query string changed)' : ''}`);
  }
  if (policies.media === 'progress') {
    for (const [k, m] of Object.entries(before.media)) {
      const a = after.media[k];
      if (!a) losses.push(`media ${k} disappeared`);
      else {
        if (!m.paused && a.paused && !a.ended) losses.push(`media ${k} was playing and is now paused`);
        if (a.t + 0.05 < m.t) losses.push(`media ${k} rewound ${m.t}s → ${a.t}s`);
      }
    }
  }
  if (custom && !customFailed && JSON.stringify(custom.before.value) !== JSON.stringify(custom.after.value)) losses.push('custom app state changed');
  if (customFailed) notes.push(`custom state probe failed (${custom!.before.ok ? '' : 'before: ' + custom!.before.error}${!custom!.before.ok && !custom!.after.ok ? '; ' : ''}${custom!.after.ok ? '' : 'after: ' + custom!.after.error}); the expression must evaluate in the page`);
  return {
    rule: 'state-preserved',
    kind: losses.length ? 'fail' : customFailed ? 'open' : 'pass',
    message: losses.length ? `state lost: ${losses.join('; ')}${customFailed ? `; ${notes[notes.length - 1]}` : ''}` : customFailed ? `incomplete: ${notes[notes.length - 1]}` : `state preserved (${[policies.form !== 'none' && 'form', policies.focus !== 'none' && 'focus', policies.selection !== 'none' && 'selection', policies.scroll !== 'none' && 'scroll-anchor', policies.storage.length && 'storage', policies.history !== 'none' && 'history', policies.media !== 'none' && 'media', custom && 'custom'].filter(Boolean).join(', ')})${notes.length ? `; notes: ${notes.join('; ')}` : ''}`,
    details: { before: maskSnapshot(before), after: maskSnapshot(after), anchors, losses, notes },
  };
}

export function noRemount(checks: StampCheck[], frames: { missingStamps: string[] }[]): Finding[] {
  if (!checks.length) return [{ rule: 'no-remount', kind: 'open', message: 'no controls were stamped before the transition' }];
  return checks.map((c): Finding => {
    const transientFrames = frames.filter((f) => f.missingStamps.includes(c.id)).length;
    if (c.sameNode) {
      return transientFrames
        ? { rule: 'no-remount', kind: 'review', message: `"${c.locator}" kept node identity at quiescence but was missing in ${transientFrames} frame(s) during the transition`, locations: [{ selector: c.locator }], details: { ...c, transientFrames } }
        : { rule: 'no-remount', kind: 'pass', message: `"${c.locator}" kept node identity`, locations: [{ selector: c.locator }], details: { ...c } };
    }
    const why = c.currentCount !== 1 ? `locator now resolves to ${c.currentCount} elements` : c.connected ? 'a different node now matches the locator' : c.nodeAlive ? 'the original node was detached' : 'the original node was garbage-collected';
    return { rule: 'no-remount', kind: 'fail', message: `"${c.locator}" was remounted: ${why}`, locations: [{ selector: c.locator }], details: { ...c, transientFrames } };
  });
}

export function hinge(geom: GeometryReport, feature: { orientation: 'vertical' | 'horizontal'; offset: number; maskLength: number; occlusion: 'none' | 'full' } | null, folded: boolean): Finding[] {
  if (!feature) return [{ rule: 'not-occluded-by-hinge', kind: 'notApplicable', message: 'no display feature in this configuration' }];
  const out: Finding[] = [];
  const occluding = feature.maskLength > 0 && feature.occlusion === 'full';
  for (const c of geom.controls) {
    if (!c.rect || c.count !== 1) continue;
    const r = c.rect;
    const lo = feature.orientation === 'vertical' ? r.x : r.y;
    const hi = feature.orientation === 'vertical' ? r.x + r.w : r.y + r.h;
    const maskLo = feature.offset;
    const maskHi = feature.offset + feature.maskLength;
    const overlap = Math.min(hi, maskHi) - Math.max(lo, maskLo);
    if (occluding) {
      out.push(
        overlap > 0
          ? { rule: 'not-occluded-by-hinge', kind: 'fail', message: `"${c.name || c.locator}" intersects the ${feature.orientation} hinge mask [${maskLo}, ${maskHi}] by ${Math.round(overlap)} px`, locations: [loc(c)], details: { feature, overlap } }
          : { rule: 'not-occluded-by-hinge', kind: 'pass', message: `"${c.name || c.locator}" clear of the hinge mask`, locations: [loc(c)], details: { feature } },
      );
    } else {
      out.push({ rule: 'not-occluded-by-hinge', kind: 'notApplicable', message: feature.maskLength > 0 ? `fold region [${maskLo}, ${maskHi}] is declared non-occluding` : 'fold line has no occluding mask (maskLength 0)', locations: [loc(c)], details: { feature } });
      const crosses = feature.maskLength > 0 ? overlap > 0 : lo < maskLo && hi > maskLo;
      if (folded && crosses) out.push({ rule: 'straddles-fold-line', kind: 'review', message: `"${c.name || c.locator}" crosses the non-occluding fold ${feature.maskLength > 0 ? `region [${maskLo}, ${maskHi}]` : `line at ${maskLo} px`} in a folded posture`, locations: [loc(c)], details: { feature } });
    }
  }
  return out.length ? out : [{ rule: 'not-occluded-by-hinge', kind: 'notApplicable', message: 'no resolvable controls to test against the hinge' }];
}

export function elementLoss(before: ElementIdentity[], after: ElementIdentity[], transient: string[]): Finding[] {
  return before
    .filter((b) => !transient.includes(b.locator))
    .map((b): Finding => {
      const a = after.find((x) => x.locator === b.locator);
      const missing = b.found.filter((bf) => !a?.found.some((af) => af.role === bf.role && af.name === bf.name));
      return missing.length
        ? { rule: 'no-element-loss', kind: 'fail', message: `lost ${missing.map((m) => `${m.role ?? 'element'} "${m.name}"`).join(', ')} (locator ${b.locator})`, locations: [{ selector: b.locator }], details: { before: b.found, after: a?.found ?? [] } }
        : { rule: 'no-element-loss', kind: 'pass', message: `${b.locator}: same role + accessible name present`, locations: [{ selector: b.locator }] };
    });
}

export function fillsViewport(geom: GeometryReport, tolerance = 2): Finding {
  const ok = Math.abs(geom.docClientWidth - geom.viewport.w) <= tolerance + 20; // allow a scrollbar
  return { rule: 'fills-viewport', kind: ok ? 'pass' : 'fail', message: ok ? `document width ${geom.docClientWidth} matches viewport ${geom.viewport.w}` : `document width ${geom.docClientWidth} ≠ viewport ${geom.viewport.w}`, details: { viewport: geom.viewport, docClientWidth: geom.docClientWidth } };
}

export function horizontalOverflow(geom: GeometryReport, offenders: { key: string; right: number }[]): Finding {
  const over = geom.docScrollWidth - geom.docClientWidth;
  return { rule: 'no-horizontal-overflow', kind: over > 1 ? 'fail' : 'pass', message: over > 1 ? `document scroll width exceeds the viewport by ${over} px` : 'no horizontal overflow', details: { over, offenders } };
}

/** Exported evidence never carries any part of a value, not even its length. */
function mask(_v: unknown): string {
  return '<masked>';
}

/** Replace every URL inside free text with its origin + path (query and fragment carry tokens). */
export function redactUrlsInText(s: string): string {
  return s.replace(/https?:\/\/[^\s"'<>)\]]+/g, (m) => redactUrl(m));
}

/** Deep copy with every string URL-redacted; used on exported steps, findings and details. */
export function redactDeep<T>(value: T): T {
  if (typeof value === 'string') return redactUrlsInText(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => redactDeep(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = redactDeep(v);
    return out as T;
  }
  return value;
}

/** Keep origin + path; drop query and fragment (they carry tokens). `forCompare` keeps the fragment-less form stable. */
export function redactUrl(u: string, forCompare = false): string {
  try {
    const url = new URL(u);
    const hasQuery = url.search.length > 0;
    return `${url.origin}${url.pathname}${hasQuery ? (forCompare ? '?<query>' : '?<redacted>') : ''}`;
  } catch {
    return '<unparseable url>';
  }
}

export function maskSnapshot(s: StateSnapshot): Record<string, unknown> {
  return {
    url: redactUrl(s.url),
    historyLength: s.historyLength,
    historyState: s.historyState === null || s.historyState === 'null' ? s.historyState : '<redacted>',
    scroll: s.scroll,
    focus: s.focus,
    selection: s.selection,
    form: Object.fromEntries(Object.entries(s.form).map(([k, v]) => [k, typeof v === 'boolean' ? v : mask(v)])),
    storage: { local: Object.fromEntries(Object.keys(s.storage.local).map((k) => [k, '<masked>'])), session: Object.fromEntries(Object.keys(s.storage.session).map((k) => [k, '<masked>'])) },
    media: s.media,
  };
}
