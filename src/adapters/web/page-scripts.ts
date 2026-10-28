/**
 * Browser-side probes evaluated with `page.evaluate(fn, arg)`. Playwright serialises the function SOURCE only,
 * so every function is self-contained: it reaches the recorder through `window.__foldproof` and inlines its constants.
 */

interface FP {
  key(el: Element): string;
  query(locator: string, includeHidden?: boolean): Element[];
  role(el: Element): string | null;
  accName(el: Element): string;
  checkStamps(): StampCheck[];
  stamp(l: string[], id: string): { locator: string; count: number }[];
}

export interface StampCheck {
  id: string;
  locator: string;
  key: string;
  nodeAlive: boolean;
  connected: boolean;
  sameNode: boolean;
  currentCount: number;
  currentHasStamp: boolean;
}

export interface ScrollAnchor {
  container: string;
  scrollTop: number;
  anchor: { key: string; offsetTop: number; height: number } | null;
}

export interface StateSnapshot {
  url: string;
  historyLength: number;
  historyState: string | null;
  scroll: ScrollAnchor[];
  focus: string | null;
  selection: [number, number] | null;
  form: Record<string, string | boolean>;
  storage: { local: Record<string, string>; session: Record<string, string> };
  media: Record<string, { t: number; paused: boolean; ended: boolean }>;
}

export interface SnapshotArgs {
  storageKeys: string[];
  form: 'all' | 'none' | string[];
}

export function snapshotScript(args: SnapshotArgs): StateSnapshot {
  const f = (window as unknown as { __foldproof: FP }).__foldproof;
  const ANCHOR_CANDIDATES = 'p,h1,h2,h3,h4,h5,h6,li,img,button,input,textarea,select,a,label,td,[data-foldproof-anchor]';
  const containers: { key: string; el: Element | null; top: number; bottom: number; scrollTop: number }[] = [{ key: 'window', el: null, top: 0, bottom: innerHeight, scrollTop: Math.round(scrollY) }];
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
    if (containers.length > 12) break;
    const cs = getComputedStyle(el);
    if (!/(auto|scroll)/.test(cs.overflowY) || el.scrollHeight <= el.clientHeight + 1) continue;
    const r = el.getBoundingClientRect();
    containers.push({ key: f.key(el), el, top: r.top, bottom: r.bottom, scrollTop: Math.round(el.scrollTop) });
  }
  const scroll: ScrollAnchor[] = containers.map((c) => {
    const root = c.el ?? document.body;
    let anchor: ScrollAnchor['anchor'] = null;
    for (const cand of Array.from(root.querySelectorAll<HTMLElement>(ANCHOR_CANDIDATES))) {
      if (cand.closest('#__foldproof_keyboard')) continue;
      const r = cand.getBoundingClientRect();
      if (r.height <= 0 || r.width <= 0) continue;
      if (r.top >= c.top - 1 && r.bottom <= c.bottom + 1) {
        anchor = { key: f.key(cand), offsetTop: Math.round(r.top - c.top), height: Math.round(r.height) };
        break;
      }
    }
    return { container: c.key, scrollTop: c.scrollTop, anchor };
  });
  const active = document.activeElement as HTMLElement | null;
  const focus = active && active !== document.body ? f.key(active) : null;
  let selection: [number, number] | null = null;
  if (active && 'selectionStart' in active) {
    const a = active as HTMLInputElement;
    if (typeof a.selectionStart === 'number' && typeof a.selectionEnd === 'number') selection = [a.selectionStart, a.selectionEnd];
  }
  const form: Record<string, string | boolean> = {};
  if (args.form !== 'none') {
    const els: Element[] = args.form === 'all' ? Array.from(document.querySelectorAll('input,textarea,select,[contenteditable=true]')) : args.form.flatMap((l) => f.query(l));
    for (const el of els) {
      const k = f.key(el);
      if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) form[k] = el.checked;
      else if (el instanceof HTMLSelectElement && el.multiple) form[k] = JSON.stringify(Array.from(el.selectedOptions).map((o) => o.value));
      else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        if (el instanceof HTMLInputElement && ['button', 'submit', 'reset', 'hidden'].includes(el.type)) continue;
        form[k] = el.value;
      } else form[k] = (el as HTMLElement).innerText;
    }
  }
  const pick = (s: Storage) => {
    const o: Record<string, string> = {};
    try {
      for (const k of args.storageKeys) {
        const v = s.getItem(k);
        if (v !== null) o[k] = v;
      }
    } catch {
      /* opaque origin */
    }
    return o;
  };
  const media: StateSnapshot['media'] = {};
  for (const m of Array.from(document.querySelectorAll<HTMLMediaElement>('video,audio'))) media[f.key(m)] = { t: Math.round(m.currentTime * 1000) / 1000, paused: m.paused, ended: m.ended };
  let historyState: string | null = null;
  try {
    historyState = JSON.stringify(history.state);
  } catch {
    historyState = '[unserialisable]';
  }
  return { url: location.href, historyLength: history.length, historyState, scroll, focus, selection, form, storage: { local: pick(localStorage), session: pick(sessionStorage) }, media };
}

/** After a transition: is each recorded anchor still visible inside its container (± tolerance)? Passive: no scrolling. */
export function anchorCheckScript(args: { before: ScrollAnchor[]; tolerance: number }): { container: string; ok: boolean | null; detail: string }[] {
  const f = (window as unknown as { __foldproof: FP }).__foldproof;
  return args.before.map((b) => {
    if (!b.anchor) return { container: b.container, ok: null, detail: 'no anchor candidate was visible before the transition' };
    const el = b.anchor.key.startsWith('#') ? document.querySelector(b.anchor.key) : (f.query(b.anchor.key)[0] ?? null);
    if (!el) return { container: b.container, ok: false, detail: `anchor ${b.anchor.key} is no longer in the document` };
    let top = 0;
    let bottom = innerHeight;
    if (b.container !== 'window') {
      const c = f.query(b.container)[0];
      if (!c) return { container: b.container, ok: false, detail: `scroll container ${b.container} not found` };
      const cr = c.getBoundingClientRect();
      top = cr.top;
      bottom = cr.bottom;
    }
    const r = el.getBoundingClientRect();
    const visible = Math.min(r.bottom, bottom + args.tolerance) - Math.max(r.top, top - args.tolerance);
    const ok = visible > 0;
    return { container: b.container, ok, detail: ok ? `anchor ${b.anchor.key} still visible (${Math.round(visible)} px)` : `anchor ${b.anchor.key} scrolled out of view (top ${Math.round(r.top)} px; container ${Math.round(top)}–${Math.round(bottom)} px)` };
  });
}

export interface ControlGeometry {
  locator: string;
  count: number;
  key: string | null;
  role: string | null;
  name: string;
  rect: { x: number; y: number; w: number; h: number } | null;
  visible: boolean;
  disabled: boolean;
  inert: boolean;
  pointerEvents: string;
  clipped: boolean;
  inViewport: boolean;
  hits: { point: string; ok: boolean; coveredBy: { key: string; role: string | null; name: string } | null }[];
}

export interface GeometryReport {
  viewport: { w: number; h: number };
  docClientWidth: number;
  docScrollWidth: number;
  controls: ControlGeometry[];
}

/** Active: scrolls each control into view before hit-testing, then restores every scroll position. Run AFTER the passive probes. */
export function geometryScript(locators: string[]): GeometryReport {
  const f = (window as unknown as { __foldproof: FP }).__foldproof;
  const savedWindow = { x: scrollX, y: scrollY };
  const savedContainers: { el: Element; top: number; left: number }[] = [];
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
    if (el.scrollTop > 0 || el.scrollLeft > 0) savedContainers.push({ el, top: el.scrollTop, left: el.scrollLeft });
    if (savedContainers.length > 50) break;
  }
  // `behavior: 'instant'` bypasses `scroll-behavior: smooth` per CSSOM View; no page styles are touched
  const restore = () => {
    for (const c of savedContainers) c.el.scrollTo({ top: c.top, left: c.left, behavior: 'instant' as ScrollBehavior });
    window.scrollTo({ left: savedWindow.x, top: savedWindow.y, behavior: 'instant' as ScrollBehavior });
  };
  const controls: ControlGeometry[] = locators.map((locator) => {
    const els = f.query(locator);
    const base: ControlGeometry = { locator, count: els.length, key: null, role: null, name: '', rect: null, visible: false, disabled: false, inert: false, pointerEvents: '', clipped: false, inViewport: false, hits: [] };
    if (els.length !== 1) return base;
    const el = els[0] as HTMLElement;
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' as ScrollBehavior });
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    base.key = f.key(el);
    base.role = f.role(el);
    base.name = f.accName(el);
    base.rect = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    base.visible = r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) !== 0;
    base.disabled = (el as HTMLButtonElement).disabled === true || el.getAttribute('aria-disabled') === 'true';
    base.inert = !!el.closest('[inert]');
    base.pointerEvents = cs.pointerEvents;
    let p = el.parentElement;
    while (p && p !== document.body) {
      const pcs = getComputedStyle(p);
      if (/(hidden|clip)/.test(pcs.overflowX) || /(hidden|clip)/.test(pcs.overflowY)) {
        const pr = p.getBoundingClientRect();
        if (r.right > pr.right + 1 || r.left < pr.left - 1 || r.bottom > pr.bottom + 1 || r.top < pr.top - 1) {
          base.clipped = true;
          break;
        }
      }
      p = p.parentElement;
    }
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    base.inViewport = base.visible && cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight;
    const inset = Math.min(4, r.width / 4, r.height / 4);
    const points: [string, number, number][] = [
      ['centre', cx, cy],
      ['top-left', r.left + inset, r.top + inset],
      ['top-right', r.right - inset, r.top + inset],
      ['bottom-left', r.left + inset, r.bottom - inset],
      ['bottom-right', r.right - inset, r.bottom - inset],
    ];
    base.hits = points.map(([point, x, y]) => {
      // an invisible control has no meaningful hit-test; report the point as missed without naming a "coverer"
      if (!base.visible || x < 0 || y < 0 || x > innerWidth || y > innerHeight) return { point, ok: false, coveredBy: null };
      const t = document.elementFromPoint(x, y);
      const ok = !!t && (t === el || el.contains(t));
      return { point, ok, coveredBy: !ok && t ? { key: f.key(t), role: f.role(t), name: t.id === '__foldproof_keyboard' ? 'keyboard-overlay-approx' : f.accName(t) } : null };
    });
    return base;
  });
  restore();
  return { viewport: { w: innerWidth, h: innerHeight }, docClientWidth: document.documentElement.clientWidth, docScrollWidth: document.scrollingElement?.scrollWidth ?? document.documentElement.scrollWidth, controls };
}

export interface ElementIdentity {
  locator: string;
  found: { key: string; role: string | null; name: string }[];
}

/** Identity (for no-element-loss) counts hidden-but-present elements: collapsing into a menu is not loss. */
export function identitiesScript(locators: string[]): ElementIdentity[] {
  const f = (window as unknown as { __foldproof: FP }).__foldproof;
  return locators.map((locator) => ({ locator, found: f.query(locator, true).map((el) => ({ key: f.key(el), role: f.role(el), name: f.accName(el) })) }));
}

export function stampScript(args: { locators: string[]; runId: string }): { locator: string; count: number }[] {
  return (window as unknown as { __foldproof: FP }).__foldproof.stamp(args.locators, args.runId);
}

export function stampCheckScript(): StampCheck[] {
  return (window as unknown as { __foldproof: FP }).__foldproof.checkStamps();
}

export interface SavedScroll {
  window: { x: number; y: number };
  containers: { key: string; top: number; left: number }[];
}

/** Record every scroll position (including zero) so active probes and trial clicks can be undone. */
export function saveScrollScript(): SavedScroll {
  const f = (window as unknown as { __foldproof: FP }).__foldproof;
  const containers: SavedScroll['containers'] = [];
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
    if (containers.length >= 200) break;
    if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) {
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) || /(auto|scroll)/.test(cs.overflowX)) containers.push({ key: f.key(el), top: el.scrollTop, left: el.scrollLeft });
    }
  }
  return { window: { x: scrollX, y: scrollY }, containers };
}

/** Restore instantly (overriding `scroll-behavior: smooth`) and report whether every position was reached. */
export function restoreScrollScript(saved: SavedScroll): { restored: boolean; mismatches: string[] } {
  const f = (window as unknown as { __foldproof: FP }).__foldproof;
  const mismatches: string[] = [];
  // `behavior: 'instant'` bypasses `scroll-behavior: smooth` per CSSOM View; no page styles are touched
  for (const c of saved.containers) {
    const el = (c.key.startsWith('#') ? document.querySelector(c.key) : f.query(c.key, true)[0]) as HTMLElement | null;
    if (!el) continue;
    el.scrollTo({ top: c.top, left: c.left, behavior: 'instant' as ScrollBehavior });
    if (Math.abs(el.scrollTop - c.top) > 1 || Math.abs(el.scrollLeft - c.left) > 1) mismatches.push(`${c.key}: wanted ${c.top}, got ${el.scrollTop}`);
  }
  window.scrollTo({ left: saved.window.x, top: saved.window.y, behavior: 'instant' as ScrollBehavior });
  if (Math.abs(scrollY - saved.window.y) > 1 || Math.abs(scrollX - saved.window.x) > 1) mismatches.push(`window: wanted ${saved.window.y}, got ${scrollY}`);
  return { restored: mismatches.length === 0, mismatches };
}

export function overflowingElementsScript(): { key: string; right: number }[] {
  const f = (window as unknown as { __foldproof: FP }).__foldproof;
  const out: { key: string; right: number }[] = [];
  const vw = document.documentElement.clientWidth;
  for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > vw + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('#__foldproof_keyboard')) {
      out.push({ key: f.key(el), right: Math.round(r.right) });
      if (out.length >= 10) break;
    }
  }
  return out;
}
