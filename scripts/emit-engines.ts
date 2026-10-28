/**
 * Generate engines/*.json (browser capability support for the signals foldproof relies on) from
 * @mdn/browser-compat-data, so browser facts are never copied into device profiles (council finding).
 * Run: npm run engines   (output is committed with the BCD version it came from)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const bcd = require('@mdn/browser-compat-data') as Record<string, unknown> & { __meta?: { version: string; timestamp: string } };
const bcdVersion = bcd.__meta?.version ?? 'unknown';

type Support = { version_added: string | boolean | null; version_removed?: string; flags?: unknown[]; partial_implementation?: boolean; notes?: string | string[] };
type Compat = { __compat?: { support: Record<string, Support | Support[]>; spec_url?: string | string[]; status?: { experimental: boolean; standard_track: boolean; deprecated: boolean } } };

const FEATURES: Record<string, string> = {
  device_posture_api: 'api.DevicePosture',
  device_posture_media_feature: 'css.at-rules.media.device-posture',
  viewport_segments_api: 'api.Viewport.segments',
  viewport_segments_media_features: 'css.at-rules.media.horizontal-viewport-segments',
  viewport_segment_env: 'css.types.env.viewport-segment-width',
  visual_viewport: 'api.VisualViewport',
  virtual_keyboard_api: 'api.VirtualKeyboard',
  window_management: 'api.Window.getScreenDetails',
  dynamic_viewport_units: 'css.types.length.dvh',
  interactive_widget: 'html.elements.meta.name.viewport.interactive-widget',
};
const BROWSERS = ['chrome', 'chrome_android', 'edge', 'firefox', 'firefox_android', 'safari', 'safari_ios', 'samsunginternet_android', 'webview_android'];

function dig(obj: unknown, dotted: string): Compat | undefined {
  let cur: unknown = obj;
  for (const k of dotted.split('.')) {
    if (!cur || typeof cur !== 'object' || !(k in (cur as object))) return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur as Compat;
}

function summarise(s: Support | Support[] | undefined): { supported: boolean | null; since: string | null; flagged: boolean; partial: boolean; notes: string | null } {
  if (!s) return { supported: null, since: null, flagged: false, partial: false, notes: null };
  const arr = Array.isArray(s) ? s : [s];
  const stable = arr.find((x) => !x.flags && x.version_added && typeof x.version_added === 'string' && !x.version_removed);
  if (stable) return { supported: true, since: stable.version_added as string, flagged: false, partial: !!stable.partial_implementation, notes: Array.isArray(stable.notes) ? stable.notes.join(' ') : (stable.notes ?? null) };
  const flagged = arr.find((x) => x.flags && x.version_added);
  if (flagged) return { supported: false, since: String(flagged.version_added), flagged: true, partial: false, notes: 'behind a flag' };
  const any = arr[0]!;
  if (any.version_added === null) return { supported: null, since: null, flagged: false, partial: false, notes: null };
  return { supported: false, since: null, flagged: false, partial: false, notes: null };
}

const out: Record<string, unknown> = { generated: new Date().toISOString().slice(0, 10), source: { name: '@mdn/browser-compat-data', version: bcdVersion, licence: 'CC0-1.0', url: 'https://github.com/mdn/browser-compat-data' }, features: {} };
for (const [id, p] of Object.entries(FEATURES)) {
  const c = dig(bcd, p)?.__compat;
  const feature: Record<string, unknown> = { bcd_path: p, found: !!c, spec_url: c?.spec_url ?? null, status: c?.status ?? null, browsers: {} };
  for (const b of BROWSERS) (feature.browsers as Record<string, unknown>)[b] = summarise(c?.support[b]);
  (out.features as Record<string, unknown>)[id] = feature;
}
await mkdir(path.resolve('engines'), { recursive: true });
await writeFile(path.resolve('engines/web-capabilities.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`wrote engines/web-capabilities.json from BCD ${bcdVersion}`);
for (const [id, f] of Object.entries(out.features as Record<string, { found: boolean; browsers: Record<string, { supported: boolean | null; since: string | null }> }>)) {
  const c = f.browsers.chrome!;
  console.log(`${id.padEnd(34)} ${f.found ? '' : '(not in BCD) '}chrome: ${c.supported === null ? '?' : c.supported ? `yes since ${c.since}` : c.since ? `flag since ${c.since}` : 'no'}`);
}
