/**
 * In-page recorder, installed with `context.addInitScript` BEFORE navigation so that
 *  - MediaQueryLists for posture and segment counts exist before any CDP override (Chromium only re-evaluates
 *    existing lists; a list created after the override reads stale — verified 2026-10-28);
 *  - DOM mutations and per-frame signals are observed from the first frame of a transition;
 *  - stamped controls keep a WeakRef so a remount is detected by node identity, not by attribute.
 *
 * Exposed as `window.__foldproof`. Pure browser JS, no bundler, kept as a string so it ships unchanged in dist/.
 */
export const RECORDER_VERSION = '1';

export const RECORDER_SOURCE = String.raw`
(() => {
  // esbuild/tsx "keepNames" injects __name(fn, 'x') into serialised page functions; make it a no-op in the page.
  if (typeof globalThis.__name !== 'function') globalThis.__name = (fn) => fn;
  if (window.__foldproof) return;
  const now = () => performance.now();
  const fp = {
    version: '${RECORDER_VERSION}',
    mql: {
      folded: matchMedia('(device-posture: folded)'),
      h1: matchMedia('(horizontal-viewport-segments: 1)'),
      h2: matchMedia('(horizontal-viewport-segments: 2)'),
      v1: matchMedia('(vertical-viewport-segments: 1)'),
      v2: matchMedia('(vertical-viewport-segments: 2)'),
      landscape: matchMedia('(orientation: landscape)'),
    },
    events: [],
    mutations: 0,
    removedStamped: [],
    lastMutationAt: now(),
    stamps: new Map(),
    navigations: 0,
  };
  window.__foldproof = fp;
  const push = (type, detail) => { if (fp.events.length < 5000) fp.events.push(Object.assign({ t: Math.round(now()), type }, detail)); };
  for (const [k, m] of Object.entries(fp.mql)) m.addEventListener('change', (e) => push('mql:' + k, { matches: e.matches }));
  addEventListener('resize', () => push('resize', { w: innerWidth, h: innerHeight, dpr: devicePixelRatio }));
  if (screen.orientation) screen.orientation.addEventListener('change', () => push('orientation', { value: screen.orientation.type }));
  if (navigator.devicePosture) navigator.devicePosture.addEventListener('change', () => push('devicePosture', { value: navigator.devicePosture.type }));
  if (window.viewport && window.viewport.addEventListener) {
    try { window.viewport.addEventListener('segmentschange', () => push('segmentschange', { n: (window.viewport.segments || []).length })); } catch (e) {}
  }
  if (window.visualViewport) window.visualViewport.addEventListener('resize', () => push('visualViewport', { w: visualViewport.width, h: visualViewport.height }));
  addEventListener('pagehide', () => push('pagehide', {}));
  addEventListener('beforeunload', () => push('beforeunload', {}));

  const mo = new MutationObserver((recs) => {
    fp.mutations += recs.length;
    fp.lastMutationAt = now();
    for (const r of recs) {
      for (const n of r.removedNodes) {
        if (n.nodeType !== 1) continue;
        const el = n;
        const stamped = el.hasAttribute && el.hasAttribute('data-foldproof-stamp') ? [el] : [];
        if (el.querySelectorAll) stamped.push(...el.querySelectorAll('[data-foldproof-stamp]'));
        for (const s of stamped) fp.removedStamped.push({ t: Math.round(now()), stamp: s.getAttribute('data-foldproof-stamp') });
      }
    }
  });
  const startObserving = () => {
    if (document.documentElement) mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
    else requestAnimationFrame(startObserving);
  };
  startObserving();

  fp.key = (el) => {
    if (el.id) return '#' + CSS.escape(el.id);
    const name = el.getAttribute && el.getAttribute('name');
    if (name) return el.tagName.toLowerCase() + '[name="' + name.replace(/["\\]/g, '\\$&') + '"]';
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body && parts.length < 6) {
      const parent = cur.parentElement;
      const idx = parent ? Array.prototype.indexOf.call(parent.children, cur) + 1 : 1;
      parts.unshift(cur.tagName.toLowerCase() + ':nth-child(' + idx + ')');
      cur = parent;
    }
    return parts.join('>');
  };

  // role=button[name='Send'] locator support (subset of Playwright's getByRole semantics)
  const ROLE_SELECTORS = {
    button: 'button,[role=button],input[type=button],input[type=submit],input[type=reset]',
    link: 'a[href],[role=link]',
    textbox: 'input:not([type]),input[type=text],input[type=email],input[type=search],input[type=url],input[type=tel],input[type=password],textarea,[role=textbox],[contenteditable=true]',
    checkbox: 'input[type=checkbox],[role=checkbox]',
    radio: 'input[type=radio],[role=radio]',
    combobox: 'select,[role=combobox]',
    tab: '[role=tab]',
    menuitem: '[role=menuitem]',
    switch: '[role=switch]',
    heading: 'h1,h2,h3,h4,h5,h6,[role=heading]',
    navigation: 'nav,[role=navigation]',
    main: 'main,[role=main]',
    banner: 'header,[role=banner]',
    contentinfo: 'footer,[role=contentinfo]',
    dialog: 'dialog,[role=dialog]',
    img: 'img,[role=img]',
  };
  fp.accName = (el) => {
    const aria = el.getAttribute('aria-label');
    if (aria) return aria.trim();
    const by = el.getAttribute('aria-labelledby');
    if (by) return by.split(/\s+/).map((id) => (document.getElementById(id) || {}).textContent || '').join(' ').replace(/\s+/g, ' ').trim();
    if (el.matches('input,textarea,select')) {
      const lbl = el.id ? document.querySelector('label[for="' + CSS.escape(el.id) + '"]') : el.closest('label');
      if (lbl && lbl.textContent.trim()) return lbl.textContent.replace(/\s+/g, ' ').trim();
      if (el.matches('input[type=button],input[type=submit],input[type=reset]') && el.value) return el.value;
      if (el.getAttribute('placeholder')) return el.getAttribute('placeholder').trim();
    }
    if (el.matches('img') && el.getAttribute('alt')) return el.getAttribute('alt').trim();
    // accname: only some roles take their name from content; landmarks, regions, dialogs etc. need an author-provided name
    const role = fp.role(el);
    const NAME_FROM_CONTENT = ['button', 'link', 'tab', 'menuitem', 'checkbox', 'radio', 'switch', 'heading', 'option', 'cell', 'gridcell', 'row', 'treeitem', 'tooltip', 'summary', null];
    if (!NAME_FROM_CONTENT.includes(role) && !el.matches('summary,legend,caption,figcaption')) {
      return el.getAttribute('title') ? el.getAttribute('title').trim() : '';
    }
    const hiddenForName = (c) => c.getAttribute('aria-hidden') === 'true' || c.hasAttribute('hidden') || (() => { const cs = getComputedStyle(c); return cs.display === 'none' || cs.visibility === 'hidden'; })();
    const fromContent = (node) => {
      let out = '';
      for (const child of node.childNodes) {
        if (child.nodeType === 3) out += child.textContent;
        else if (child.nodeType === 1) {
          const c = child;
          if (hiddenForName(c)) continue;
          const cl = c.getAttribute('aria-label');
          if (cl) out += ' ' + cl + ' ';
          else if (c.matches('img') && c.getAttribute('alt')) out += ' ' + c.getAttribute('alt') + ' ';
          else out += fromContent(c);
        }
      }
      return out;
    };
    const text = fromContent(el).replace(/\s+/g, ' ').trim();
    if (text) return text.slice(0, 120);
    if (el.getAttribute('title')) return el.getAttribute('title').trim();
    return '';
  };
  fp.role = (el) => {
    const r = el.getAttribute('role');
    if (r) return r;
    for (const [role, sel] of Object.entries(ROLE_SELECTORS)) if (el.matches(sel)) return role;
    return null;
  };
  // role= locators follow Playwright's getByRole: hidden elements are excluded unless includeHidden is set
  // (identity checks pass includeHidden so a nav collapsed behind a menu counts as present, not lost).
  fp.query = (locator, includeHidden) => {
    const m = /^role=([a-z]+)(?:\[name=(?:'([^']*)'|"([^"]*)"|([^\]]*))\])?$/.exec(locator.trim());
    if (!m) return Array.from(document.querySelectorAll(locator));
    const role = m[1];
    const name = m[2] != null ? m[2] : m[3] != null ? m[3] : m[4];
    const sel = ROLE_SELECTORS[role] || '[role=' + role + ']';
    const isHidden = (el) => {
      if (el.closest('[hidden],[aria-hidden="true"]')) return true;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return true;
      const r = el.getBoundingClientRect();
      return r.width === 0 && r.height === 0;
    };
    const all = Array.from(document.querySelectorAll(sel)).filter((el) => fp.role(el) === role && (includeHidden || !isHidden(el)));
    if (name == null) return all;
    const want = name.trim().toLowerCase();
    return all.filter((el) => fp.accName(el).toLowerCase() === want);
  };

  fp.stamp = (locators, runId) => {
    const out = [];
    locators.forEach((loc, i) => {
      const els = fp.query(loc);
      els.forEach((el, j) => {
        const id = runId + ':' + i + ':' + j;
        el.setAttribute('data-foldproof-stamp', id);
        fp.stamps.set(id, { ref: new WeakRef(el), locator: loc, key: fp.key(el) });
      });
      out.push({ locator: loc, count: els.length });
    });
    return out;
  };
  fp.checkStamps = () => {
    const out = [];
    for (const [id, s] of fp.stamps) {
      const node = s.ref.deref();
      // identity is independent of visibility: a hidden control is still the same node, not a remount
      const current = fp.query(s.locator, true);
      out.push({
        id, locator: s.locator, key: s.key,
        nodeAlive: !!node, connected: !!(node && node.isConnected),
        sameNode: !!(node && current.length === 1 && current[0] === node),
        currentCount: current.length,
        currentHasStamp: current.length === 1 && current[0].getAttribute('data-foldproof-stamp') === id,
      });
    }
    return out;
  };
  fp.signals = () => ({
    innerWidth, innerHeight, dpr: devicePixelRatio,
    cssPosture: fp.mql.folded.matches ? 'folded' : 'continuous',
    jsPosture: navigator.devicePosture ? navigator.devicePosture.type : null,
    hSegs: fp.mql.h2.matches ? 2 : 1,
    vSegs: fp.mql.v2.matches ? 2 : 1,
    segments: window.viewport && window.viewport.segments ? window.viewport.segments.map((r) => ({ x: r.x, y: r.y, w: r.width, h: r.height })) : null,
    screenOrientation: screen.orientation ? screen.orientation.type : null,
    cssOrientation: fp.mql.landscape.matches ? 'landscape' : 'portrait',
    visualViewport: window.visualViewport ? { w: visualViewport.width, h: visualViewport.height } : null,
    secureContext: isSecureContext,
    url: location.href,
  });
  // Observe until quiescence: quietFrames consecutive animation frames with no mutation and no viewport change.
  fp.observe = ({ quietFrames, minMs = 0, maxMs }) => new Promise((resolve) => {
    const t0 = now();
    const frames = [];
    let quiet = 0, lastMut = fp.mutations, lastW = innerWidth, lastH = innerHeight, lastDpr = devicePixelRatio;
    const tick = () => {
      const t = now();
      const missing = fp.checkStamps().filter((s) => !s.sameNode).map((s) => s.id);
      frames.push({ t: Math.round(t - t0), w: innerWidth, h: innerHeight, dpr: devicePixelRatio, folded: fp.mql.folded.matches, h2: fp.mql.h2.matches, v2: fp.mql.v2.matches, mutations: fp.mutations, missingStamps: missing });
      const stable = fp.mutations === lastMut && innerWidth === lastW && innerHeight === lastH && devicePixelRatio === lastDpr;
      lastMut = fp.mutations; lastW = innerWidth; lastH = innerHeight; lastDpr = devicePixelRatio;
      quiet = stable ? quiet + 1 : 0;
      if (quiet >= quietFrames && t - t0 >= minMs) return resolve({ settled: true, ms: Math.round(t - t0), frames });
      if (t - t0 > maxMs) return resolve({ settled: false, ms: Math.round(t - t0), frames });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  fp.drainEvents = () => fp.events.splice(0, fp.events.length);
})();
`;
