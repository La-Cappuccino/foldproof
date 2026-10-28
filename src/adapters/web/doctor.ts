/**
 * Probe the installed Chromium for the emulation paths foldproof relies on.
 *
 * Verified 2026-10-28 on Playwright 1.64.1 / Chromium 156 (docs/research/00, 03):
 *  - viewport segments: ONLY the inline `displayFeature` field of Emulation.setDeviceMetricsOverride works while
 *    Playwright's viewport emulation is active; the dedicated setDisplayFeaturesOverride is a no-op there;
 *  - posture: the dedicated Emulation.setDevicePostureOverride flips `(device-posture: folded)` live after load;
 *    the inline `devicePosture` field only takes effect when set before navigation;
 *  - navigator.devicePosture is absent in this build; posture is asserted via matchMedia.
 */
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
    const req = createRequire(import.meta.url);
    playwrightVersion = (req('playwright/package.json') as { version: string }).version;
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
  try {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 } });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await page.setContent('<div></div>');
    const probe = () =>
      page.evaluate(() => ({
        segs: (window as unknown as { viewport?: { segments?: DOMRect[] } }).viewport?.segments?.length ?? null,
        folded: matchMedia('(device-posture: folded)').matches,
        twoSegs: matchMedia('(horizontal-viewport-segments: 2)').matches,
        hasPostureJs: 'devicePosture' in navigator,
      }));
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1000,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
      displayFeature: { orientation: 'vertical', offset: 490, maskLength: 20 },
    } as never);
    await cdp.send('Emulation.setDevicePostureOverride' as never, { posture: { type: 'folded' } } as never);
    await page.waitForTimeout(150);
    const after = await probe();
    checks.push({
      name: 'segments-via-inline-displayFeature',
      ok: after.segs === 2 && after.twoSegs,
      detail: `window.viewport.segments=${after.segs}, (horizontal-viewport-segments: 2)=${after.twoSegs}`,
    });
    checks.push({
      name: 'posture-via-setDevicePostureOverride',
      ok: after.folded,
      detail: `(device-posture: folded)=${after.folded}`,
    });
    checks.push({
      name: 'navigator.devicePosture',
      ok: true,
      detail: after.hasPostureJs ? 'present (JS posture listeners can be exercised)' : 'absent in this build; posture is asserted via matchMedia only',
    });
    await cdp.send('Emulation.clearDevicePostureOverride' as never, {} as never).catch(() => undefined);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Emulation.setDisplayFeaturesOverride' as never, { features: [{ orientation: 'vertical', offset: 490, maskLength: 20 }] } as never).catch(() => undefined);
    await page.waitForTimeout(150);
    const dedicated = await probe();
    checks.push({
      name: 'dedicated-setDisplayFeaturesOverride',
      ok: true,
      detail: dedicated.segs === 2 ? 'honoured in this build' : 'ignored while Playwright viewport emulation is active (expected on Chromium 156); adapter uses the inline path',
    });
    await ctx.close();
  } catch (e) {
    checks.push({ name: 'cdp-probe', ok: false, detail: (e as Error).message });
  } finally {
    await browser.close();
  }
  const ok = checks.every((c) => c.ok);
  return { ok, playwright: playwrightVersion, chromium: chromiumVersion, checks };
}
