import type { Command } from 'commander';
import path from 'node:path';
import { mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import { loadProfiles, loadScenarios, selectProfiles, formatIssues } from '../core/load.js';
import type { Profile, Scenario } from '../core/schema.js';
import type { RunReport, ScenarioResult } from '../core/types.js';
import { coverageManifest, reconcileCoverage, exitCode, toSarif, toJUnit, toMarkdown, loadReport, TOOL_NAME, ORACLE_VERSION } from '../report/index.js';

export function registerRunCommands(program: Command): void {
  program
    .command('doctor')
    .description('check Playwright, Chromium and whether fold/posture emulation is honoured')
    .action(async () => {
      const { doctor } = await import('../adapters/web/doctor.js');
      const report = await doctor();
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.ok ? 0 : 1);
    });

  program
    .command('run [scenarios...]')
    .description('run scenarios (YAML files or directories) against their profiles and write the evidence record')
    .requiredOption('--base-url <url>', 'base URL the scenario task.url resolves against')
    .option('--out <dir>', 'output directory', 'foldproof-report')
    .option('--app-build <id>', 'application build identifier recorded in the evidence')
    .option('--only-profile <id>', 'restrict to one profile id')
    .option('--plan', 'print the resolved plan (defaults expanded) and exit')
    .option('--headed', 'run with a visible browser')
    .action(async (files: string[], opts) => {
      const { profiles, scenarios } = await loadAll(program, files);
      const pairs = pairUp(scenarios.items, profiles.items, opts.onlyProfile);
      if (opts.plan) {
        console.log(JSON.stringify({ scenarios: scenarios.items, pairs: pairs.map((p) => ({ scenario: p.scenario.id, profile: p.profile.id })), coverage: coverageManifest(pairs) }, null, 2));
        return;
      }
      const code = await execute(pairs, { baseUrl: opts.baseUrl, out: opts.out, appBuild: opts.appBuild, headed: !!opts.headed, files: scenarios.files });
      process.exit(code);
    });

  const fixtures = program.command('fixtures').description('serve or verify the bundled failure fixtures (the public benchmark)');
  fixtures
    .command('serve [dir]')
    .description('serve a fixtures directory on localhost')
    .option('--port <n>', 'port', '0')
    .action(async (dir: string | undefined, opts) => {
      const { serveStatic } = await import('../server.js');
      const root = dir ?? path.join(pkgRoot(program), 'fixtures');
      const s = await serveStatic(root, Number(opts.port));
      console.log(`serving ${root} at ${s.url} (Ctrl+C to stop)`);
      await new Promise(() => undefined);
    });
  fixtures
    .command('verify [dir]')
    .description('run every fixture scenario: broken/ must fail on its named rules, fixed/ must pass')
    .option('--out <dir>', 'output directory', 'foldproof-report/fixtures')
    .option('--only <name>', 'one fixture directory name')
    .option('--headed', 'run with a visible browser')
    .action(async (dir: string | undefined, opts) => {
      const root = dir ?? path.join(pkgRoot(program), 'fixtures');
      const { serveStatic } = await import('../server.js');
      const server = await serveStatic(root);
      try {
        const { items: profiles, issues } = await loadProfiles(program.opts().profiles as string);
        if (issues.length) {
          console.error(formatIssues(issues));
          process.exit(3);
        }
        const names = (await readdir(root)).filter((n) => !n.startsWith('.') && !n.startsWith('_')).filter((n) => !opts.only || n === opts.only);
        const scenarioFiles: string[] = [];
        for (const n of names) {
          const d = path.join(root, n);
          if (!(await stat(d)).isDirectory()) continue;
          for (const v of ['broken', 'fixed']) {
            const f = path.join(d, v, 'scenario.yaml');
            try {
              await stat(f);
              scenarioFiles.push(f);
            } catch {
              /* variant absent */
            }
          }
          const single = path.join(d, 'scenario.yaml');
          try {
            await stat(single);
            scenarioFiles.push(single);
          } catch {
            /* no single scenario */
          }
        }
        const { items: scenarios, issues: sIssues, files } = await loadScenarios(scenarioFiles, profiles);
        if (sIssues.length) {
          console.error(formatIssues(sIssues));
          process.exit(3);
        }
        const pairs = pairUp(scenarios, profiles);
        const code = await execute(pairs, { baseUrl: server.url, out: opts.out, headed: !!opts.headed, files, fixtureMode: true });
        process.exit(code);
      } finally {
        await server.close();
      }
    });

  program
    .command('report <runJson>')
    .description('re-render an evidence record (run.json) as SARIF, JUnit or Markdown')
    .option('--format <f>', 'sarif | junit | md', 'md')
    .action(async (file: string, opts) => {
      const report = loadReport(file);
      if (opts.format === 'sarif') console.log(JSON.stringify(toSarif(report), null, 2));
      else if (opts.format === 'junit') console.log(toJUnit(report));
      else console.log(toMarkdown(report));
    });
}

function pkgRoot(program: Command): string {
  return path.dirname(program.opts().profiles as string);
}

async function loadAll(program: Command, files: string[]) {
  const profiles = await loadProfiles(program.opts().profiles as string);
  if (profiles.issues.length) {
    console.error(formatIssues(profiles.issues));
    process.exit(3);
  }
  const inputs: string[] = [];
  for (const f of files.length ? files : [program.opts().scenarios as string]) {
    const s = await stat(f).catch(() => null);
    if (!s) {
      console.error(`no such file or directory: ${f}`);
      process.exit(3);
    }
    if (s.isDirectory()) {
      const { listFiles } = await import('../core/load.js');
      inputs.push(...(await listFiles(f, ['.yaml', '.yml', '.json'])));
    } else inputs.push(f);
  }
  const scenarios = await loadScenarios(inputs, profiles.items);
  if (scenarios.issues.length) {
    console.error(formatIssues(scenarios.issues));
    process.exit(3);
  }
  return { profiles, scenarios };
}

function pairUp(scenarios: Scenario[], profiles: Profile[], onlyProfile?: string): { scenario: Scenario; profile: Profile }[] {
  const pairs: { scenario: Scenario; profile: Profile }[] = [];
  for (const scenario of scenarios) for (const profile of selectProfiles(scenario, profiles)) if (!onlyProfile || profile.id === onlyProfile) pairs.push({ scenario, profile });
  return pairs;
}

export async function execute(
  pairs: { scenario: Scenario; profile: Profile }[],
  opts: { baseUrl: string; out: string; appBuild?: string; headed: boolean; files: Map<string, string>; fixtureMode?: boolean },
): Promise<0 | 1 | 2 | 3> {
  const { chromium } = await import('playwright');
  const { runScenario } = await import('../playwright/runner.js');
  const { createRequire } = await import('node:module');
  const version = (createRequire(import.meta.url)('../../package.json') as { version: string }).version;
  await mkdir(opts.out, { recursive: true });
  const artifactsDir = path.join(opts.out, 'artifacts');
  await mkdir(artifactsDir, { recursive: true });
  const browser = await chromium.launch({ headless: !opts.headed });
  const results: ScenarioResult[] = [];
  const manifest = coverageManifest(pairs);
  try {
    for (const { scenario, profile } of pairs) {
      const r = await runScenario(browser, scenario, profile, { baseUrl: opts.baseUrl, artifactsDir, scenarioFile: opts.files.get(scenario.id), appBuild: opts.appBuild });
      results.push(r);
      const tag = r.expected.verdict === 'fail' ? ` (expects fail on ${r.expected.rules.join(',')}: ${r.matchedExpectation ? 'ok' : 'MISMATCH'})` : r.matchedExpectation ? '' : ' (expected pass)';
      console.log(`${r.verdict.padEnd(14)} ${scenario.id} @ ${profile.id}${tag}`);
    }
  } finally {
    await browser.close();
  }
  const coverage = reconcileCoverage(manifest, results);
  const partial = { tool: { name: TOOL_NAME, version, oracleVersion: ORACLE_VERSION }, startedAt: new Date().toISOString(), baseUrl: opts.baseUrl, appBuild: opts.appBuild, results, coverage };
  let code = exitCode(partial);
  if (opts.fixtureMode) {
    // in fixture mode the gate is "did every scenario match its expectation"
    const mismatched = results.filter((r) => !r.matchedExpectation);
    code = mismatched.length ? 1 : results.some((r) => r.steps.some((s) => s.label === 'runner-error')) ? 3 : 0;
    if (mismatched.length) console.log(`\n${mismatched.length} fixture scenario(s) did not match their expectation:\n- ${mismatched.map((m) => `${m.scenarioId} @ ${m.profileId}: verdict ${m.verdict}, failed rules ${[...new Set(m.steps.flatMap((s) => s.findings.filter((f) => f.kind === 'fail').map((f) => f.rule)))].join(',') || 'none'}`).join('\n- ')}`);
    else console.log(`\nall ${results.length} fixture scenario(s) matched their expectation`);
  }
  const report: RunReport = { ...partial, exitCode: code };
  await writeFile(path.join(opts.out, 'run.json'), JSON.stringify(report, null, 2));
  await writeFile(path.join(opts.out, 'foldproof.sarif'), JSON.stringify(toSarif(report), null, 2));
  await writeFile(path.join(opts.out, 'junit.xml'), toJUnit(report));
  await writeFile(path.join(opts.out, 'report.md'), toMarkdown(report));
  console.log(`\nevidence written to ${opts.out}/ (run.json, foldproof.sarif, junit.xml, report.md) · exit ${code}`);
  return code;
}
