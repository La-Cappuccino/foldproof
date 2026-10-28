#!/usr/bin/env node
/**
 * foldproof launcher for the Agent Skill. Resolves a CLI in this order:
 *   1. a project-local install        → <cwd>/node_modules/.bin/foldproof
 *   2. the repository this skill sits in → ../../dist/cli.js (built) or ../../src/cli.ts via tsx (dev)
 *   3. the published package           → npx -y foldproof@<version pinned in SKILL.md metadata>
 * Invoke by interpreter: `node scripts/foldproof.mjs <args>`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(here, '..');
const repoRoot = path.resolve(skillDir, '../..');
const args = process.argv.slice(2);

function pinnedVersion() {
  try {
    const m = /^\s*version:\s*"?([0-9][^"\s]*)"?/m.exec(readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8'));
    return m ? m[1] : 'latest';
  } catch {
    return 'latest';
  }
}

function run(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit', shell: process.platform === 'win32' });
  process.exit(r.status ?? 1);
}

const localBin = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'foldproof.cmd' : 'foldproof');
if (existsSync(localBin)) run(localBin, args);

const builtCli = path.join(repoRoot, 'dist', 'cli.js');
if (existsSync(builtCli) && existsSync(path.join(repoRoot, 'node_modules', 'playwright'))) run(process.execPath, [builtCli, ...args]);

const devCli = path.join(repoRoot, 'src', 'cli.ts');
if (existsSync(devCli) && existsSync(path.join(repoRoot, 'node_modules', 'tsx'))) run(process.execPath, [path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs'), devCli, ...args]);

console.error(`foldproof: no local install found; running npx -y foldproof@${pinnedVersion()} (needs network once).`);
run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['-y', `foldproof@${pinnedVersion()}`, ...args]);
