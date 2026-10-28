/**
 * Locate the foldproof package root from either src/ (tsx) or dist/ (bundled) by walking up to the
 * package.json whose name is "foldproof". Never hard-code relative depths: tsup flattens modules into chunks.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let cached: { root: string; version: string } | null = null;

export function packageInfo(): { root: string; version: string } {
  if (cached) return cached;
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, 'package.json');
    if (existsSync(candidate)) {
      try {
        const pkg = JSON.parse(readFileSync(candidate, 'utf8')) as { name?: string; version?: string };
        if (pkg.name === 'foldproof') {
          cached = { root: dir, version: pkg.version ?? '0.0.0' };
          return cached;
        }
      } catch {
        /* keep walking */
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('foldproof package root not found (package.json with name "foldproof")');
}
