import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { resolveInside } from '../../src/server.js';

describe('static server path containment', () => {
  const root = '/srv/fixtures';
  const inside = (p: string | null) => p !== null && !path.relative(root, p).startsWith('..') && !path.isAbsolute(path.relative(root, p));
  it('serves paths inside the root', () => {
    expect(resolveInside(root, '/a/b.html')).toBe('/srv/fixtures/a/b.html');
    expect(resolveInside(root, '/')).toBe('/srv/fixtures');
  });
  it('never resolves outside the root: traversal collapses to a path under root or is rejected', () => {
    for (const attempt of ['/../etc/passwd', '/a/../../etc/passwd', '/%2e%2e/%2e%2e/etc/passwd', '/../fixtures2/x', '/..%2f..%2fetc/passwd']) {
      const r = resolveInside(root, attempt);
      expect(r === null || inside(r), attempt).toBe(true);
    }
  });
  it('rejects NUL, backslashes and malformed encoding outright', () => {
    expect(resolveInside(root, '/a%00.html')).toBeNull();
    expect(resolveInside(root, '/..\\x')).toBeNull();
    expect(resolveInside(root, '/%zz')).toBeNull();
  });
});
