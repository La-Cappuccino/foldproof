#!/usr/bin/env node
import { Command } from 'commander';
import path from 'node:path';
import { loadProfiles, loadScenarios, formatIssues } from './core/load.js';
import { resolveConfiguration, isResolveError, expectedSignals } from './core/configuration.js';
import { executablePanels } from './core/schema.js';
import { packageInfo } from './core/package-root.js';

const pkg = packageInfo();
export const PKG_ROOT = pkg.root;

const program = new Command();
program
  .name('foldproof')
  .description('Reproducible, emulated evidence that a task survives the fold, the rotate, the resize and the keyboard.')
  .version(pkg.version)
  .option('--profiles <dir>', 'profiles directory', path.join(PKG_ROOT, 'profiles'))
  .option('--scenarios <dir>', 'scenarios directory', path.join(PKG_ROOT, 'scenarios'));

const profiles = program.command('profiles').description('inspect and validate the sourced device corpus');

profiles
  .command('validate')
  .description('validate every profile: units, provenance, source refs, posture/segment consistency, conflicts')
  .action(async () => {
    const dir = program.opts().profiles as string;
    const { items, issues } = await loadProfiles(dir);
    if (issues.length) {
      console.error(formatIssues(issues));
      console.error(`\n${issues.length} issue(s) in ${dir}`);
      process.exit(1);
    }
    const exec = items.filter((p) => executablePanels(p).length > 0).length;
    console.log(`${items.length} profile(s) valid in ${path.relative(process.cwd(), dir) || '.'} (${exec} executable on web, ${items.length - exec} inventory-only)`);
    const conflicts = items.flatMap((p) => p.conflicts_with.map((c) => `${p.id} ↔ ${c.profile_id} on ${c.field}: ${c.note}`));
    if (conflicts.length) console.log(`\nrecorded conflicts (kept, not merged):\n- ${conflicts.join('\n- ')}`);
  });

profiles
  .command('list')
  .description('list profiles')
  .option('--platform <p>', 'filter by platform')
  .option('--executable', 'only profiles the web adapter can run')
  .option('--json', 'JSON output')
  .action(async (opts) => {
    const { items, issues } = await loadProfiles(program.opts().profiles as string);
    if (issues.length) {
      console.error(formatIssues(issues));
      process.exit(1);
    }
    const rows = items
      .filter((p) => !opts.platform || p.platform === opts.platform)
      .filter((p) => !opts.executable || executablePanels(p).length > 0)
      .map((p) => ({
        id: p.id,
        rev: p.revision,
        platform: p.platform,
        name: p.name,
        executable: executablePanels(p).join('/') || '-',
        postures: p.postures.map((x) => x.name).join(',') || '-',
        hinge: p.display_features.some((f) => f.occlusion === 'full') ? 'opaque' : p.display_features.length ? 'fold-line' : '-',
        unknowns: p.unknowns.length,
        tags: p.tags.join(','),
      }));
    if (opts.json) console.log(JSON.stringify(rows, null, 2));
    else console.table(rows);
  });

profiles
  .command('show <id>')
  .description('show one profile with its sources and the resolved web emulation per posture')
  .action(async (id: string) => {
    const { items } = await loadProfiles(program.opts().profiles as string);
    const p = items.find((x) => x.id === id);
    if (!p) {
      console.error(`unknown profile "${id}"`);
      process.exit(1);
    }
    console.log(JSON.stringify(p, null, 2));
    console.log('\nresolved web configurations:');
    const targets = p.postures.length ? p.postures.map((po) => ({ panel: po.panel, posture: po.name })) : p.panels.map((pa) => ({ panel: pa.name }));
    for (const t of targets) {
      const r = resolveConfiguration(p, t);
      if (isResolveError(r)) console.log(`- ${JSON.stringify(t)} → ${r.notExecutable ? 'NOT EXECUTABLE: ' : 'ERROR: '}${r.error}`);
      else console.log(`- ${JSON.stringify(t)} → ${JSON.stringify({ viewport: r.viewport, dpr: r.deviceScaleFactor, displayFeature: r.displayFeature, expected: expectedSignals(r), gaps: r.gaps })}`);
    }
  });

const scenarios = program.command('scenarios').description('validate scenario files');
scenarios
  .command('validate [files...]')
  .description('validate scenarios against the schema and the profile corpus')
  .action(async (files: string[]) => {
    const { items: profs, issues: pIssues } = await loadProfiles(program.opts().profiles as string);
    if (pIssues.length) {
      console.error(formatIssues(pIssues));
      process.exit(1);
    }
    const { items, issues } = await loadScenarios(files.length ? files : (program.opts().scenarios as string), profs);
    if (issues.length) {
      console.error(formatIssues(issues));
      console.error(`\n${issues.length} issue(s)`);
      process.exit(1);
    }
    console.log(`${items.length} scenario(s) valid`);
  });

const { registerRunCommands } = await import('./commands/run.js');
registerRunCommands(program);
const { registerQuickCommand } = await import('./commands/quick.js');
registerQuickCommand(program);

await program.parseAsync(process.argv);
