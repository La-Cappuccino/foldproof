/**
 * Evidence records: coverage manifest, SARIF 2.1.0 (canonical), JUnit XML (CI side-channel), Markdown (humans + agents).
 */
import { readFileSync } from 'node:fs';
import type { RunReport, ScenarioResult, CoverageRow, ResultKind, Finding } from '../core/types.js';
import { RULE_HELP, ORACLE_VERSION } from '../oracles/index.js';
import type { Scenario, Profile, RuleId } from '../core/schema.js';
import { stepRules, STARTUP_RULES } from '../core/schema.js';

export const TOOL_NAME = 'foldproof';

/** Expected (scenario × profile × step × rule) before execution: the denominator every run is judged against. */
export function coverageManifest(pairs: { scenario: Scenario; profile: Profile }[]): CoverageRow[] {
  const rows: CoverageRow[] = [];
  for (const { scenario, profile } of pairs) {
    rows.push({ scenarioId: scenario.id, profileId: profile.id, step: 0, rule: 'env-self-check', kind: 'expected' });
    for (const r of [...STARTUP_RULES, ...scenario.static]) rows.push({ scenarioId: scenario.id, profileId: profile.id, step: 0, rule: r, kind: 'expected' });
    scenario.steps.forEach((s, i) => {
      // transitions change the configuration and get a self-check; operate steps do not
      if ('transition' in s) rows.push({ scenarioId: scenario.id, profileId: profile.id, step: i + 1, rule: 'env-self-check', kind: 'expected' });
      for (const r of stepRules(s)) rows.push({ scenarioId: scenario.id, profileId: profile.id, step: i + 1, rule: r, kind: 'expected' });
    });
  }
  return rows;
}

/** Fill the manifest with observed kinds; anything expected but unobserved becomes `open: not executed`. */
export function reconcileCoverage(manifest: CoverageRow[], results: ScenarioResult[]): CoverageRow[] {
  return manifest.map((row) => {
    const res = results.find((r) => r.scenarioId === row.scenarioId && r.profileId === row.profileId);
    if (!res) return { ...row, kind: 'open', reason: 'not executed' };
    if (res.verdict === 'notApplicable') return { ...row, kind: 'notApplicable', reason: res.steps[0]?.findings[0]?.message ?? 'profile not executable' };
    const step = res.steps.find((s) => s.index === row.step && s.kind !== 'operate') ?? res.steps[row.step];
    const findings = step?.findings.filter((f) => f.rule === row.rule) ?? [];
    if (!findings.length) return { ...row, kind: 'open', reason: 'not executed (runner stopped early)' };
    const worst = pickWorst(findings.map((f) => f.kind));
    return { ...row, kind: worst, reason: findings.find((f) => f.kind === worst)?.message };
  });
}

const ORDER: ResultKind[] = ['fail', 'open', 'review', 'pass', 'notApplicable'];
export function pickWorst(kinds: ResultKind[]): ResultKind {
  return ORDER.find((k) => kinds.includes(k)) ?? 'open';
}

export function exitCode(report: Omit<RunReport, 'exitCode'>): 0 | 1 | 2 | 3 {
  if (report.results.some((r) => r.steps.some((s) => s.label === 'runner-error'))) return 3;
  if (report.results.some((r) => r.verdict === 'fail')) return 1;
  const required = report.coverage.filter((c) => !['no-horizontal-overflow', 'target-size', 'straddles-fold-line'].includes(c.rule));
  if (required.some((c) => c.kind === 'open' || c.kind === 'review')) return 2;
  return 0;
}

// ---------- SARIF 2.1.0 ----------

export function toSarif(report: RunReport): Record<string, unknown> {
  const rules = Object.entries(RULE_HELP).map(([id, h]) => ({ id, name: id, shortDescription: { text: h.description }, helpUri: h.helpUri, properties: { relatesTo: h.relatesTo, diagnostic: ['no-horizontal-overflow', 'target-size', 'straddles-fold-line'].includes(id) } }));
  const ruleIndex = (id: string) => rules.findIndex((r) => r.id === id);
  const results: unknown[] = [];
  for (const r of report.results) {
    for (const s of r.steps) {
      for (const f of s.findings) {
        const level = f.kind === 'fail' ? (['no-horizontal-overflow', 'target-size'].includes(f.rule) ? 'warning' : 'error') : 'none';
        results.push({
          ruleId: f.rule,
          ruleIndex: ruleIndex(f.rule),
          kind: f.kind,
          level,
          message: { text: `[${r.scenarioId} @ ${r.profileId} / step ${s.index} ${s.label}] ${f.message}` },
          locations: [
            {
              physicalLocation: { artifactLocation: { uri: r.scenarioFile ? toUri(r.scenarioFile) : `scenario://${r.scenarioId}` }, region: { startLine: 1 } },
              logicalLocations: (f.locations ?? []).map((l) => ({ kind: 'element', fullyQualifiedName: l.selector ?? 'document', name: l.name ?? l.selector ?? 'document', properties: { role: l.role ?? null, rect: l.rect ?? null } })),
            },
          ],
          attachments: [s.artifacts.screenshot ? { artifactLocation: { uri: toUri(s.artifacts.screenshot) }, description: { text: `screenshot after ${s.label}` } } : null].filter(Boolean),
          fingerprints: { 'foldproof/v1': `${r.scenarioId}|${r.profileId}|${s.index}|${f.rule}|${f.locations?.[0]?.selector ?? ''}` },
          properties: {
            scenarioId: r.scenarioId,
            scenarioHash: r.scenarioHash,
            profileId: r.profileId,
            profileRevision: r.profileRevision,
            step: s.index,
            stepLabel: s.label,
            configuration: s.configuration,
            expected: s.expected ?? null,
            observed: s.observed ?? null,
            emulation: f.emulation ?? null,
            evidenceLevel: r.evidenceLevel,
            engine: r.engine,
            appBuild: report.appBuild ?? null,
            oracleVersion: report.tool.oracleVersion,
            details: f.details ?? null,
          },
        });
      }
    }
  }
  return {
    $schema: 'https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/schemas/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: { driver: { name: TOOL_NAME, version: report.tool.version, informationUri: 'https://github.com/La-Cappuccino/foldproof', rules } },
        invocations: [{ executionSuccessful: report.exitCode !== 3, startTimeUtc: report.startedAt, exitCode: report.exitCode, properties: { baseUrl: report.baseUrl } }],
        results,
        properties: { coverage: report.coverage, summary: summarise(report) },
      },
    ],
  };
}

function toUri(p: string): string {
  return p.startsWith('file:') ? p : `file://${p.startsWith('/') ? '' : '/'}${p}`;
}

// ---------- JUnit ----------

export function toJUnit(report: RunReport): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const suites: string[] = [];
  let total = 0;
  let failures = 0;
  let skipped = 0;
  for (const r of report.results) {
    const cases: string[] = [];
    for (const s of r.steps) {
      for (const f of s.findings) {
        total++;
        const name = `step ${s.index} ${s.label} :: ${f.rule}`;
        if (f.kind === 'fail') {
          failures++;
          cases.push(`    <testcase name="${esc(name)}" classname="${esc(`${r.scenarioId}.${r.profileId}`)}"><failure message="${esc(f.message)}" type="${f.rule}"/></testcase>`);
        } else if (f.kind === 'pass') cases.push(`    <testcase name="${esc(name)}" classname="${esc(`${r.scenarioId}.${r.profileId}`)}"/>`);
        else {
          skipped++;
          cases.push(`    <testcase name="${esc(name)}" classname="${esc(`${r.scenarioId}.${r.profileId}`)}"><skipped message="${esc(`${f.kind}: ${f.message}`)}"/></testcase>`);
        }
      }
    }
    suites.push(`  <testsuite name="${esc(`${r.scenarioId} @ ${r.profileId}`)}" tests="${cases.length}" time="${(r.durationMs / 1000).toFixed(3)}">\n    <properties><property name="verdict" value="${r.verdict}"/><property name="profileRevision" value="${r.profileRevision}"/><property name="engine" value="${esc(r.engine.name + ' ' + r.engine.version)}"/><property name="evidenceLevel" value="${r.evidenceLevel}"/></properties>\n${cases.join('\n')}\n  </testsuite>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="foldproof" tests="${total}" failures="${failures}" skipped="${skipped}">\n${suites.join('\n')}\n</testsuites>\n`;
}

// ---------- Markdown ----------

export function summarise(report: Omit<RunReport, 'exitCode'> & { exitCode?: number }): Record<string, number> {
  const counts: Record<string, number> = { pass: 0, fail: 0, open: 0, review: 0, notApplicable: 0 };
  for (const c of report.coverage) if (c.kind in counts) counts[c.kind]!++;
  return counts;
}

export function toMarkdown(report: RunReport): string {
  const lines: string[] = [];
  const sum = summarise(report);
  lines.push(`# foldproof evidence report`, '', `Tool ${report.tool.name} ${report.tool.version} (oracles ${report.tool.oracleVersion}) · started ${report.startedAt} · base URL ${report.baseUrl}${report.appBuild ? ` · app build ${report.appBuild}` : ''}`, '', `Evidence level: **emulated** (Chromium CDP). Nothing here is a physical-device result or a conformance claim.`, '');
  lines.push(`## Summary`, '', `| pass | fail | open | review | notApplicable |`, `|---|---|---|---|---|`, `| ${sum.pass} | ${sum.fail} | ${sum.open} | ${sum.review} | ${sum.notApplicable} |`, '', `Exit code ${report.exitCode} (0 all required pass · 1 fail · 2 required coverage inconclusive · 3 runner error)`, '');
  lines.push(`## Scenarios`, '');
  for (const r of report.results) {
    lines.push(`### ${r.scenarioId} @ ${r.profileId} (rev ${r.profileRevision}) — **${r.verdict}**${r.expected.verdict === 'fail' ? ` (fixture expects fail on ${r.expected.rules.join(', ')}: ${r.matchedExpectation ? 'matched' : 'NOT matched'})` : ''}`, '', r.title, '');
    for (const s of r.steps) {
      lines.push(`- **step ${s.index} — ${s.label}** (${s.durationMs} ms)${s.artifacts.screenshot ? ` · [screenshot](${s.artifacts.screenshot})` : ''}`);
      for (const f of s.findings) lines.push(`  - ${icon(f.kind)} \`${f.rule}\` ${f.message}`);
    }
    if (r.gaps.length) lines.push('', `  Profile gaps: ${r.gaps.join('; ')}`);
    lines.push('');
  }
  const inconclusive = report.coverage.filter((c) => c.kind === 'open' || c.kind === 'review');
  const notApplicable = report.coverage.filter((c) => c.kind === 'notApplicable');
  lines.push(`## Untested`, '');
  lines.push(inconclusive.length ? `**Inconclusive (${inconclusive.length})** — expected checks that reached neither pass nor fail. These are gaps:` : 'No inconclusive checks: every expected check reached pass, fail or a by-design not-applicable.', '');
  for (const u of inconclusive) lines.push(`- \`${u.rule}\` ${u.scenarioId} @ ${u.profileId} step ${u.step}: **${u.kind}** — ${u.reason ?? ''}`);
  if (notApplicable.length) {
    lines.push('', `**Not applicable by design (${notApplicable.length})** — the rule does not apply to this configuration (for example no occluding hinge). Not a gap:`, '');
    for (const u of notApplicable) lines.push(`- \`${u.rule}\` ${u.scenarioId} @ ${u.profileId} step ${u.step}: ${u.reason ?? ''}`);
  }
  lines.push('', `## Rules`, '', `| rule | relates to | help |`, `|---|---|---|`);
  for (const [id, h] of Object.entries(RULE_HELP)) lines.push(`| \`${id}\` | ${h.relatesTo} | ${h.helpUri} |`);
  return lines.join('\n') + '\n';
}

function icon(k: ResultKind): string {
  return { pass: '✅', fail: '❌', open: '⚠️', review: '🔍', notApplicable: '➖' }[k];
}

export function loadReport(file: string): RunReport {
  return JSON.parse(readFileSync(file, 'utf8')) as RunReport;
}

export { ORACLE_VERSION };
export type { Finding, RuleId };
