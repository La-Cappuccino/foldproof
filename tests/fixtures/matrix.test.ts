/**
 * Fixture matrix: every broken/ scenario must FAIL on exactly its named rules; every fixed/ and positive scenario must PASS.
 * Runs the real pipeline (Chromium, localhost server). Repeat with FOLDPROOF_REPEAT=3 for determinism.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadProfiles, loadScenarios, selectProfiles } from '../../src/core/load.js';
import { serveStatic } from '../../src/server.js';
import { execute } from '../../src/commands/run.js';
import { loadReport } from '../../src/report/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURES = path.join(ROOT, 'fixtures');
const OUT = path.join(ROOT, 'test-results', 'fixtures');
const REPEAT = Number(process.env.FOLDPROOF_REPEAT ?? 1);

let server: { url: string; close(): Promise<void> };
beforeAll(async () => {
  server = await serveStatic(FIXTURES);
});
afterAll(async () => {
  await server?.close();
});

async function scenarioFiles(): Promise<string[]> {
  const out: string[] = [];
  for (const n of (await readdir(FIXTURES)).sort()) {
    const d = path.join(FIXTURES, n);
    if (!(await stat(d)).isDirectory() || n.startsWith('_')) continue;
    for (const f of ['broken/scenario.yaml', 'fixed/scenario.yaml', 'scenario.yaml']) {
      const p = path.join(d, f);
      if (await stat(p).catch(() => null)) out.push(p);
    }
  }
  return out;
}

describe('fixture matrix (public benchmark)', () => {
  it('every fixture scenario matches its expectation; broken ones fail only their named rules', async () => {
    const { items: profiles, issues } = await loadProfiles(path.join(ROOT, 'profiles'));
    expect(issues).toEqual([]);
    const files = await scenarioFiles();
    expect(files.length).toBeGreaterThan(0);
    const { items: scenarios, issues: sIssues, files: fileMap } = await loadScenarios(files, profiles);
    expect(sIssues).toEqual([]);
    const pairs = scenarios.flatMap((scenario) => selectProfiles(scenario, profiles).map((profile) => ({ scenario, profile })));
    for (let i = 0; i < REPEAT; i++) {
      const code = await execute(pairs, { baseUrl: server.url, out: path.join(OUT, `run-${i}`), headed: false, files: fileMap, fixtureMode: true });
      const report = loadReport(path.join(OUT, `run-${i}`, 'run.json'));
      const mismatched = report.results.filter((r) => !r.matchedExpectation).map((r) => `${r.scenarioId} @ ${r.profileId}: ${r.verdict} [${[...new Set(r.steps.flatMap((s) => s.findings.filter((f) => f.kind === 'fail').map((f) => f.rule)))].join(',')}]`);
      expect(mismatched, `run ${i}`).toEqual([]);
      expect(code, `run ${i} exit code`).toBe(0);
      // broken fixtures must not fail unrelated rules
      for (const r of report.results.filter((r) => r.expected.verdict === 'fail')) {
        const failed = new Set(r.steps.flatMap((s) => s.findings.filter((f) => f.kind === 'fail').map((f) => f.rule)));
        expect([...failed].sort(), `${r.scenarioId} @ ${r.profileId}`).toEqual([...r.expected.rules].sort());
      }
      // the coverage denominator is complete: every expected row ended in a kind
      expect(report.coverage.every((c) => c.kind !== 'expected')).toBe(true);
    }
  }, 600_000);
});
