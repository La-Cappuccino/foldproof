import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { Profile, Scenario, executablePanels } from './schema.js';
import type { ZodError } from 'zod';

export interface LoadIssue {
  file: string;
  path: string;
  message: string;
}

export interface LoadResult<T> {
  items: T[];
  issues: LoadIssue[];
  /** file each item came from, keyed by id */
  files: Map<string, string>;
}

function zodIssues(file: string, err: ZodError): LoadIssue[] {
  return err.issues.map((i) => ({ file, path: i.path.map(String).join('.') || '(root)', message: i.message }));
}

export async function listFiles(dir: string, exts: string[]): Promise<string[]> {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return out;
  }
  for (const e of entries.sort()) {
    const p = path.join(dir, e);
    const s = await stat(p);
    if (s.isDirectory()) out.push(...(await listFiles(p, exts)));
    else if (exts.some((x) => e.endsWith(x)) && !e.startsWith('_')) out.push(p);
  }
  return out;
}

export async function readStructured(file: string): Promise<unknown> {
  const text = await readFile(file, 'utf8');
  if (file.endsWith('.json')) return JSON.parse(text);
  return parseYaml(text);
}

export async function loadProfiles(dir: string): Promise<LoadResult<Profile>> {
  const files = await listFiles(dir, ['.json', '.yaml', '.yml']);
  const items: Profile[] = [];
  const issues: LoadIssue[] = [];
  const seen = new Map<string, string>();
  for (const file of files) {
    let raw: unknown;
    try {
      raw = await readStructured(file);
    } catch (e) {
      issues.push({ file, path: '(parse)', message: (e as Error).message });
      continue;
    }
    const r = Profile.safeParse(raw);
    if (!r.success) {
      issues.push(...zodIssues(file, r.error));
      continue;
    }
    const dup = seen.get(r.data.id);
    if (dup) issues.push({ file, path: 'id', message: `duplicate profile id "${r.data.id}" (also in ${dup})` });
    seen.set(r.data.id, file);
    const expected = path.basename(file).replace(/\.(json|ya?ml)$/, '');
    if (expected !== r.data.id) issues.push({ file, path: 'id', message: `file name must equal profile id ("${r.data.id}")` });
    items.push(r.data);
  }
  const ids = new Set(items.map((p) => p.id));
  for (const p of items) {
    const file = seen.get(p.id)!;
    if (p.supersedes && !ids.has(p.supersedes)) issues.push({ file, path: 'supersedes', message: `unknown profile "${p.supersedes}"` });
    for (const c of p.conflicts_with) if (!ids.has(c.profile_id)) issues.push({ file, path: 'conflicts_with', message: `unknown profile "${c.profile_id}"` });
  }
  return { items, issues, files: seen };
}

export async function loadScenarios(dirOrFiles: string | string[], profiles?: Profile[]): Promise<LoadResult<Scenario>> {
  const files = Array.isArray(dirOrFiles) ? dirOrFiles : await listFiles(dirOrFiles, ['.yaml', '.yml', '.json']);
  const items: Scenario[] = [];
  const issues: LoadIssue[] = [];
  const seen = new Map<string, string>();
  for (const file of files) {
    let raw: unknown;
    try {
      raw = await readStructured(file);
    } catch (e) {
      issues.push({ file, path: '(parse)', message: (e as Error).message });
      continue;
    }
    const r = Scenario.safeParse(raw);
    if (!r.success) {
      issues.push(...zodIssues(file, r.error));
      continue;
    }
    const dup = seen.get(r.data.id);
    if (dup) issues.push({ file, path: 'id', message: `duplicate scenario id "${r.data.id}" (also in ${dup})` });
    seen.set(r.data.id, file);
    if (profiles) {
      for (const p of selectProfiles(r.data, profiles, issues, file)) {
        const panels = new Set(p.panels.map((x) => x.name));
        const postures = new Set(p.postures.map((x) => x.name));
        const check = (label: string, cfg: { panel?: string; posture?: string } | undefined) => {
          if (!cfg) return;
          if (cfg.panel && !panels.has(cfg.panel as never)) issues.push({ file, path: `${label}.panel`, message: `profile "${p.id}" has no panel "${cfg.panel}"` });
          if (cfg.posture && !postures.has(cfg.posture as never)) issues.push({ file, path: `${label}.posture`, message: `profile "${p.id}" declares no posture "${cfg.posture}"` });
        };
        check('start', r.data.start);
        r.data.steps.forEach((s, i) => {
          if ('transition' in s && typeof s.transition !== 'string') check(`steps.${i}.transition.to`, s.transition.to);
        });
      }
    }
    items.push(r.data);
  }
  return { items, issues, files: seen };
}

/** Resolve `profiles: [...]` or `{ class }` against the corpus. */
export function selectProfiles(scenario: Scenario, profiles: Profile[], issues?: LoadIssue[], file = ''): Profile[] {
  if (Array.isArray(scenario.profiles)) {
    const out: Profile[] = [];
    for (const id of scenario.profiles) {
      const p = profiles.find((x) => x.id === id);
      if (!p) issues?.push({ file, path: 'profiles', message: `unknown profile "${id}"` });
      else out.push(p);
    }
    return out;
  }
  const cls = scenario.profiles.class;
  return profiles.filter((p) => {
    if (executablePanels(p).length === 0) return false;
    if (cls === 'all') return true;
    if (cls === 'foldable') return p.postures.length > 0 || p.tags.includes('foldable');
    return p.tags.includes(cls);
  });
}

export function formatIssues(issues: LoadIssue[]): string {
  return issues.map((i) => `${path.relative(process.cwd(), i.file)} :: ${i.path} :: ${i.message}`).join('\n');
}
