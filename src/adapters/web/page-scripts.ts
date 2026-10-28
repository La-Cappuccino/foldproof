/**
 * Browser-side helpers evaluated inside the page. Kept as plain functions (serialised by Playwright)
 * so they are unit-testable and have no bundler dependency.
 */

export interface StateSnapshot {
  url: string;
  history: string | null;
  scroll: Record<string, number>;
  focus: string | null;
  selection: [number, number] | null;
  form: Record<string, string | boolean>;
  storage: { local: Record<string, string>; session: Record<string, string> };
  media: Record<string, { t: number; paused: boolean }>;
  custom?: unknown;
  /** media-query facts that prove the emulation is in effect */
  env: { innerWidth: number; innerHeight: number; orientation: string; segments: number[][] | null; hSegs: number; vSegs: number; folded: boolean; dpr: number };
}

export function pageKey(el: Element): string {
  if (el.id) return `#${el.id}`;
  const name = (el as HTMLInputElement).name;
  if (name) return `${el.tagName.toLowerCase()}[name="${name}"]`;
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== document.body && parts.length < 5) {
    const parent: Element | null = cur.parentElement;
    const idx = parent ? Array.from(parent.children).indexOf(cur) + 1 : 1;
    parts.unshift(`${cur.tagName.toLowerCase()}:nth-child(${idx})`);
    cur = parent;
  }
  return parts.join('>');
}

export function snapshotScript(customExpr: string | null): StateSnapshot {
  const w = window as unknown as { viewport?: { segments?: DOMRect[] } };
  const segs = w.viewport?.segments?.map((r) => [r.x, r.y, r.width, r.height]) ?? null;
  const hSegs = [1, 2, 3].find((n) => matchMedia(`(horizontal-viewport-segments: ${n})`).matches) ?? 1;
  const vSegs = [1, 2, 3].find((n) => matchMedia(`(vertical-viewport-segments: ${n})`).matches) ?? 1;
  const scroll: Record<string, number> = { window: Math.round(scrollY) };
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
    if (el.scrollTop > 0 && el.scrollHeight > el.clientHeight) scroll[pageKey(el)] = Math.round(el.scrollTop);
    if (Object.keys(scroll).length > 20) break;
  }
  const active = document.activeElement as HTMLElement | null;
  const focus = active && active !== document.body ? pageKey(active) : null;
  let selection: [number, number] | null = null;
  if (active && 'selectionStart' in active) {
    const a = active as HTMLInputElement;
    if (typeof a.selectionStart === 'number' && typeof a.selectionEnd === 'number') selection = [a.selectionStart, a.selectionEnd];
  }
  const form: Record<string, string | boolean> = {};
  for (const el of Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input,textarea,select'))) {
    const k = pageKey(el);
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) form[k] = el.checked;
    else form[k] = el.value;
  }
  const dump = (s: Storage) => {
    const o: Record<string, string> = {};
    try {
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i)!;
        o[k] = s.getItem(k) ?? '';
      }
    } catch {
      /* opaque origin */
    }
    return o;
  };
  const media: StateSnapshot['media'] = {};
  for (const m of Array.from(document.querySelectorAll<HTMLMediaElement>('video,audio'))) media[pageKey(m)] = { t: Math.round(m.currentTime * 100) / 100, paused: m.paused };
  let custom: unknown = undefined;
  if (customExpr) {
    try {
      // eslint-disable-next-line no-new-func
      custom = new Function(`return (${customExpr})`)();
    } catch (e) {
      custom = { __error: String(e) };
    }
  }
  let historyState: string | null = null;
  try {
    historyState = JSON.stringify(history.state);
  } catch {
    historyState = '[unserialisable]';
  }
  return {
    url: location.href,
    history: historyState,
    scroll,
    focus,
    selection,
    form,
    storage: { local: dump(localStorage), session: dump(sessionStorage) },
    media,
    custom,
    env: {
      innerWidth,
      innerHeight,
      orientation: screen.orientation?.type ?? (innerWidth > innerHeight ? 'landscape-primary' : 'portrait-primary'),
      segments: segs,
      hSegs,
      vSegs,
      folded: matchMedia('(device-posture: folded)').matches,
      dpr: devicePixelRatio,
    },
  };
}

export interface ElementGeometry {
  key: string;
  selector?: string;
  tag: string;
  role: string | null;
  name: string;
  rect: { x: number; y: number; w: number; h: number };
  visible: boolean;
  interactive: boolean;
  clipped: boolean;
  stamp: string | null;
  disabled: boolean;
}

export interface GeometryReport {
  viewport: { w: number; h: number };
  docScrollWidth: number;
  overflowing: { key: string; right: number }[];
  elements: ElementGeometry[];
}

const INTERACTIVE = 'a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=textbox],[tabindex]:not([tabindex="-1"]),summary,video[controls],audio[controls]';

export function geometryScript(controls: string[]): GeometryReport {
  const vw = innerWidth;
  const vh = innerHeight;
  const accName = (el: Element): string => {
    const aria = el.getAttribute('aria-label');
    if (aria) return aria.trim();
    const labelled = el.getAttribute('aria-labelledby');
    if (labelled) return labelled.split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim() ?? '').join(' ').trim();
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      const lbl = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : el.closest('label');
      if (lbl?.textContent?.trim()) return lbl.textContent.trim();
      if (el instanceof HTMLInputElement && el.value && ['button', 'submit', 'reset'].includes(el.type)) return el.value;
      if (el.getAttribute('placeholder')) return el.getAttribute('placeholder')!.trim();
    }
    if (el.getAttribute('title')) return el.getAttribute('title')!.trim();
    return (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  };
  const isVisible = (el: HTMLElement, r: DOMRect) => {
    if (r.width === 0 && r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) !== 0;
  };
  const isClipped = (el: HTMLElement) => {
    const cs = getComputedStyle(el);
    const ovHidden = ['hidden', 'clip'].includes(cs.overflowX) || ['hidden', 'clip'].includes(cs.overflowY) || cs.textOverflow === 'ellipsis';
    if (ovHidden && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) return true;
    // clipped by an ancestor with overflow hidden
    const r = el.getBoundingClientRect();
    let p = el.parentElement;
    while (p && p !== document.body) {
      const pcs = getComputedStyle(p);
      if (['hidden', 'clip'].includes(pcs.overflowX) || ['hidden', 'clip'].includes(pcs.overflowY)) {
        const pr = p.getBoundingClientRect();
        if (r.right > pr.right + 1 || r.left < pr.left - 1 || r.bottom > pr.bottom + 1 || r.top < pr.top - 1) return true;
      }
      p = p.parentElement;
    }
    return false;
  };
  const seen = new Set<Element>();
  const elements: ElementGeometry[] = [];
  const push = (el: HTMLElement, selector?: string) => {
    if (seen.has(el)) {
      if (selector) {
        const e = elements.find((x) => x.key === pageKey(el));
        if (e) e.selector = selector;
      }
      return;
    }
    seen.add(el);
    const r = el.getBoundingClientRect();
    elements.push({
      key: pageKey(el),
      selector,
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') ?? (el instanceof HTMLButtonElement ? 'button' : el instanceof HTMLAnchorElement ? 'link' : el instanceof HTMLInputElement ? el.type : el instanceof HTMLTextAreaElement ? 'textbox' : el instanceof HTMLSelectElement ? 'combobox' : null),
      name: accName(el),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      visible: isVisible(el, r),
      interactive: el.matches(INTERACTIVE),
      clipped: isClipped(el),
      stamp: el.getAttribute('data-foldproof-stamp'),
      disabled: (el as HTMLButtonElement).disabled === true || el.getAttribute('aria-disabled') === 'true',
    });
  };
  for (const sel of controls) {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) push(el, sel);
  }
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(INTERACTIVE))) push(el);
  const overflowing: { key: string; right: number }[] = [];
  for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > vw + 1 && isVisible(el, r) && getComputedStyle(el).position !== 'fixed') {
      overflowing.push({ key: pageKey(el), right: Math.round(r.right) });
      if (overflowing.length >= 10) break;
    }
  }
  return { viewport: { w: vw, h: vh }, docScrollWidth: document.scrollingElement?.scrollWidth ?? document.documentElement.scrollWidth, overflowing, elements };
}

/** Stamp the controls so a remount can be detected after the transition. */
export function stampScript(controls: string[], stamp: string): number {
  let n = 0;
  for (const sel of controls) for (const el of Array.from(document.querySelectorAll(sel))) {
    el.setAttribute('data-foldproof-stamp', stamp);
    n++;
  }
  return n;
}

/** Hit-test the centre of an element: does the point resolve to it (or a descendant)? */
export function hitTestScript(selector: string): { found: boolean; inViewport: boolean; hit: boolean; coveredBy: string | null; rect: { x: number; y: number; w: number; h: number } | null } {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return { found: false, inViewport: false, hit: false, coveredBy: null, rect: null };
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const r = el.getBoundingClientRect();
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  const inViewport = r.width > 0 && r.height > 0 && cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight;
  const target = inViewport ? document.elementFromPoint(cx, cy) : null;
  const hit = !!target && (target === el || el.contains(target));
  return { found: true, inViewport, hit, coveredBy: !hit && target ? pageKey(target) : null, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
}
