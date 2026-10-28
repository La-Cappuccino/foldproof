import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv04 from 'ajv-draft-04';
import addFormats from 'ajv-formats';
import { toSarif, toJUnit, toMarkdown, coverageManifest, reconcileCoverage, exitCode } from '../../src/report/index.js';
import { Scenario, Profile } from '../../src/core/schema.js';
import { foldable } from './schema.test.js';
import type { RunReport, ScenarioResult } from '../../src/core/types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const schema = JSON.parse(readFileSync(path.join(ROOT, 'schemas/vendor/sarif-schema-2.1.0.json'), 'utf8')) as Record<string, unknown>;

const scenario = Scenario.parse({ foldproof: 1, id: 'unfold-draft', title: 'Unfold keeps draft', profiles: ['test-fold'], task: { url: '/compose', controls: ['#send'] }, steps: [{ transition: 'unfold' }, { operate: { target: '#send', expect: { visible: '.sent' } } }] });
const profile = Profile.parse(foldable);

function result(verdict: ScenarioResult['verdict']): ScenarioResult {
  return {
    scenarioId: 'unfold-draft', scenarioFile: '/tmp/unfold-draft.yaml', scenarioHash: 'abc', title: 'Unfold keeps draft', profileId: 'test-fold', profileRevision: 1, adapter: 'web-chromium',
    engine: { name: 'chromium', version: '156.0' }, evidenceLevel: 'emulated', startedAt: '2026-10-28T12:00:00Z', durationMs: 1200,
    steps: [
      { index: 0, label: 'startup', kind: 'startup', configuration: {}, findings: [{ rule: 'env-self-check', kind: 'pass', message: 'ok' }, { rule: 'reachable', kind: 'pass', message: 'ok', locations: [{ selector: '#send', role: 'button', name: 'Send', rect: { x: 1, y: 2, w: 3, h: 4 } }] }, { rule: 'fills-viewport', kind: 'pass', message: 'ok' }], artifacts: { screenshot: '/tmp/a.png' }, durationMs: 10 },
      { index: 1, label: 'unfold', kind: 'transition', configuration: {}, findings: [{ rule: 'env-self-check', kind: 'pass', message: 'ok' }, { rule: 'reachable', kind: verdict === 'fail' ? 'fail' : 'pass', message: 'x', locations: [{ selector: '#send' }] }, { rule: 'state-preserved', kind: 'pass', message: 'ok' }, { rule: 'no-remount', kind: 'pass', message: 'ok' }, { rule: 'not-occluded-by-hinge', kind: 'notApplicable', message: 'no mask' }, { rule: 'no-element-loss', kind: 'pass', message: 'ok' }], artifacts: {}, durationMs: 20 },
      { index: 2, label: 'operate #send', kind: 'operate', configuration: {}, findings: [{ rule: 'operate', kind: 'pass', message: 'ok' }], artifacts: {}, durationMs: 5 },
    ],
    gaps: [], verdict, expected: { verdict: 'pass', rules: [] }, matchedExpectation: verdict === 'pass',
  };
}

function report(verdict: ScenarioResult['verdict']): RunReport {
  const manifest = coverageManifest([{ scenario, profile }]);
  const results = [result(verdict)];
  const coverage = reconcileCoverage(manifest, results);
  const partial = { tool: { name: 'foldproof', version: '0.1.0', oracleVersion: '0.1.0' }, startedAt: '2026-10-28T12:00:00Z', baseUrl: 'http://localhost:3000', results, coverage };
  return { ...partial, exitCode: exitCode(partial) };
}

describe('evidence record', () => {
  it('SARIF validates against the official 2.1.0 schema', () => {
    const ajv = new Ajv04({ strict: false, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const sarif = toSarif(report('pass'));
    const ok = validate(sarif);
    expect(ok, JSON.stringify(validate.errors?.slice(0, 5), null, 2)).toBe(true);
  });
  it('coverage manifest is the denominator and every row ends in a kind', () => {
    const r = report('pass');
    expect(r.coverage.length).toBe(1 + 2 + 1 + 5 + 1); // env + startup(reachable, fills) + env(step1) + preset@1 (5) + operate
    expect(r.coverage.every((c) => c.kind !== 'expected')).toBe(true);
    expect(r.exitCode).toBe(0);
  });
  it('exit code 1 on fail, and the JUnit/Markdown render', () => {
    const r = report('fail');
    expect(r.exitCode).toBe(1);
    const junit = toJUnit(r);
    expect(junit).toContain('<failure');
    const md = toMarkdown(r);
    expect(md).toContain('## Untested');
    expect(md).toContain('not-occluded-by-hinge');
  });
  it('unexecuted expected rows become open and the exit code is 2', () => {
    const manifest = coverageManifest([{ scenario, profile }]);
    const partial = { tool: { name: 'foldproof', version: '0.1.0', oracleVersion: '0.1.0' }, startedAt: 'x', baseUrl: 'y', results: [], coverage: reconcileCoverage(manifest, []) };
    expect(partial.coverage.every((c) => c.kind === 'open')).toBe(true);
    expect(exitCode(partial)).toBe(2);
  });
});
