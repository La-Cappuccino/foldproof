/**
 * Probe the installed Chromium for the emulation paths foldproof relies on, the same way the adapter does:
 * recorder (sentinel MediaQueryLists) installed before any override, page served from localhost (secure context).
 *
 * Verified 2026-10-28 on Playwright 1.64.1 / Chromium 156 (docs/research/00, 03):
 *  - segments: only the inline `displayFeature` field of Emulation.setDeviceMetricsOverride works while Playwright's
 *    viewport emulation is active; the dedicated setDisplayFeaturesOverride is a no-op there;
 *  - posture: Emulation.setDevicePostureOverride flips `(device-posture: folded)` live, readable through a
 *    MediaQueryList that existed before the override;
 *  - navigator.devicePosture exists on a secure context (localhost), not on about:blank.
 */
import { RECORDER_SOURCE } from './recorder.js';

export interface DoctorReport {
  ok: boolean;
  playwright: string | null;
  chromium: string | null;
  checks: { name: string; ok: boolean; detail: string }[];
}

export async function doctor(): Promise<DoctorReport> {
  const checks: DoctorReport['checks'] = [];
  let playwrightVersion: string | null = null;
  let chromiumVersion: string | null = null;
  let pw: typeof import('playwright') | null = null;
  try {
    pw = await import('playwright');
    const { createRequire } = await import('node:module');
    playwrightVersion = (createRequire(import.meta.url)('playwright/package.json') as { version: string }).version;
    checks.push({ name: 'playwright-installed', ok: true, detail: `playwright ${playwrightVersion}` });
  } catch (e) {
    checks.push({ name: 'playwright-installed', ok: false, detail: `playwright is a peer dependency: npm i -D playwright && npx playwright install chromium (${(e as Error).message})` });
    return { ok: false, playwright: null, chromium: null, checks };
  }
  let browser: import('playwright').Browser;
  try {
    browser = await pw.chromium.launch({ headless: true });
    chromiumVersion = browser.version();
    checks.push({ name: 'chromium-launch', ok: true, detail: `chromium ${chromiumVersion}` });
  } catch (e) {
    checks.push({ name: 'chromium-launch', ok: false, detail: `run: npx playwright install chromium (${(e as Error).message})` });
    return { ok: false, playwright: playwrightVersion, chromium: null, checks };
  }
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { serveStatic } = await import('../../server.js');
  const dir = await mkdtemp(path.join(tmpdir(), 'foldproof-doctor-'));
  await writeFile(path.join(dir, 'index.html'), '<!doctype html><meta name="viewport" content="width=device-width"><div>foldproof doctor</div>');
  const server = await serveStatic(dir);
  try {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 } });
    await ctx.addInitScript(RECORDER_SOURCE);
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await page.goto(`${server.url}/`);
    type Signals = { secureContext: boolean; jsPosture: string | null; cssPosture: string; hSegs: number; segments: { x: number; y: number; w: number; h: number }[] | null; dpr: number };
    const probe = () => page.evaluate(() => (window as unknown as { __foldproof: { signals(): Signals } }).__foldproof.signals());
    const before = await probe();
    checks.push({ name: 'secure-context', ok: before.secureContext, detail: before.secureContext ? 'localhost page is a secure context' : 'page is not a secure context' });
    checks.push({ name: 'navigator.devicePosture', ok: true, detail: before.jsPosture ? `present (${before.jsPosture})` : 'absent in this build; posture is asserted via matchMedia only' });
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 900, deviceScaleFactor: 2, mobile: false, displayFeature: { orientation: 'vertical', offset: 490, maskLength: 20 } } as never);
    await cdp.send('Emulation.setDevicePostureOverride' as never, { posture: { type: 'folded' } } as never);
    await page.waitForTimeout(150);
    const after = await probe();
    checks.push({ name: 'segments-via-inline-displayFeature', ok: after.hSegs === 2 && !!after.segments && after.segments.length === 2 && after.segments[0]!.w === 490 && after.segments[1]!.x === 510, detail: `(horizontal-viewport-segments: 2)=${after.hSegs === 2}, window.viewport.segments=${JSON.stringify(after.segments)}` });
    checks.push({ name: 'posture-via-setDevicePostureOverride', ok: after.cssPosture === 'folded' && (!after.jsPosture || after.jsPosture === 'folded'), detail: `(device-posture: folded)=${after.cssPosture === 'folded'}, navigator.devicePosture=${after.jsPosture ?? 'n/a'}` });
    checks.push({ name: 'dpr-override', ok: after.dpr === 2, detail: `devicePixelRatio=${after.dpr} (expected 2)` });
    await cdp.send('Emulation.setDevicePostureOverride' as never, { posture: { type: 'continuous' } } as never);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 900, deviceScaleFactor: 2, mobile: false });
    await cdp.send('Emulation.setDisplayFeaturesOverride' as never, { features: [{ orientation: 'vertical', offset: 490, maskLength: 20 }] } as never).catch(() => undefined);
    await page.waitForTimeout(150);
    const dedicated = await probe();
    checks.push({ name: 'dedicated-setDisplayFeaturesOverride', ok: true, detail: dedicated.hSegs === 2 ? 'honoured in this build' : 'ignored while Playwright viewport emulation is active (expected on Chromium 156); adapter uses the inline path' });
    await ctx.close();
  } catch (e) {
    checks.push({ name: 'cdp-probe', ok: false, detail: (e as Error).message });
  } finally {
    await server.close();
    await rm(dir, { recursive: true, force: true });
    await browser.close();
  }
  return { ok: checks.every((c) => c.ok), playwright: playwrightVersion, chromium: chromiumVersion, checks };
}
