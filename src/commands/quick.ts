/**
 * `foldproof quick <url>`: zero-config smoke run. Discovers visible controls on the page, builds a built-in
 * scenario (fold/unfold for foldables, rotate otherwise) and runs it across executable profiles.
 * It has no setup and no declared outcome, so it cannot see lost drafts: it is a first look, not a task scenario.
 */
import type { Command } from 'commander';
import { loadProfiles, formatIssues } from '../core/load.js';
import { Scenario, executablePanels, type Profile } from '../core/schema.js';
import { execute } from './run.js';
import { RECORDER_SOURCE } from '../adapters/web/recorder.js';

export function registerQuickCommand(program: Command): void {
  program
    .command('quick <url>')
    .description('zero-config smoke run: discover visible controls and run fold/unfold (or rotate) across executable profiles')
    .option('--devices <list>', 'comma-separated profile ids, or a class: foldable | phone | tablet | desktop | all', 'foldable')
    .option('--max-controls <n>', 'controls to discover', '8')
    .option('--out <dir>', 'output directory', 'foldproof-report')
    .option('--headed', 'run with a visible browser')
    .action(async (url: string, opts) => {
      const { items: profiles, issues } = await loadProfiles(program.opts().profiles as string);
      if (issues.length) {
        console.error(formatIssues(issues));
        process.exit(3);
      }
      const selected = selectQuickProfiles(profiles, opts.devices);
      if (!selected.length) {
        console.error(`no executable profiles match "${opts.devices}"`);
        process.exit(3);
      }
      const controls = await discoverControls(url, Number(opts.maxControls));
      if (!controls.length) {
        console.error('no uniquely addressable visible controls found (buttons, links, inputs with ids or unique accessible names)');
        process.exit(3);
      }
      console.log(`discovered controls: ${controls.join(', ')}`);
      const pairs = selected.flatMap((profile) => {
        const foldable = profile.postures.some((p) => p.name === 'flat') && profile.postures.some((p) => p.name === 'closed' || p.name === 'half_opened');
        const raw = {
          foldproof: 1,
          id: `quick-${foldable ? 'fold' : 'rotate'}`,
          title: `Quick smoke: ${foldable ? 'unfold then fold' : 'rotate twice'} on ${profile.name}`,
          profiles: [profile.id],
          start: foldable ? { posture: 'closed' } : {},
          task: { url, ready: { selector: controls[0]! }, controls, state: { form: 'all', focus: 'none', selection: 'none', scroll: 'anchor', storage: [], history: 'no-loss', media: 'progress' } },
          steps: foldable ? [{ transition: 'unfold' }, { transition: 'fold' }] : [{ transition: 'rotate' }, { transition: 'rotate' }],
          static: ['no-horizontal-overflow'],
          tags: ['quick'],
        };
        const parsed = Scenario.safeParse(raw);
        if (!parsed.success) throw new Error(parsed.error.message);
        return [{ scenario: parsed.data, profile }];
      });
      const code = await execute(pairs, { baseUrl: url, out: opts.out, headed: !!opts.headed, files: new Map() });
      process.exit(code);
    });
}

function selectQuickProfiles(profiles: Profile[], spec: string): Profile[] {
  const exec = profiles.filter((p) => executablePanels(p).length > 0);
  if (['foldable', 'phone', 'tablet', 'desktop'].includes(spec)) return exec.filter((p) => (spec === 'foldable' ? p.postures.length > 0 : p.tags.includes(spec)));
  if (spec === 'all') return exec;
  const ids = spec.split(',').map((s) => s.trim());
  return exec.filter((p) => ids.includes(p.id));
}

async function discoverControls(url: string, max: number): Promise<string[]> {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
    await ctx.addInitScript(RECORDER_SOURCE);
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load' });
    return await page.evaluate((limit) => {
      const f = (window as unknown as { __foldproof: { role(el: Element): string | null; accName(el: Element): string; query(l: string): Element[] } }).__foldproof;
      const out: string[] = [];
      const seen = new Set<string>();
      const els = Array.from(document.querySelectorAll<HTMLElement>('button,a[href],input:not([type=hidden]),textarea,select,[role=button],[role=link],[role=tab]'));
      for (const el of els) {
        if (out.length >= limit) break;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width < 8 || r.height < 8 || cs.visibility === 'hidden' || cs.display === 'none') continue;
        let locator: string | null = null;
        if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) locator = `#${el.id}`;
        else {
          const role = f.role(el);
          const name = f.accName(el);
          if (role && name && !name.includes("'") && f.query(`role=${role}[name='${name}']`).length === 1) locator = `role=${role}[name='${name}']`;
        }
        if (locator && !seen.has(locator)) {
          seen.add(locator);
          out.push(locator);
        }
      }
      return out;
    }, max);
  } finally {
    await browser.close();
  }
}
