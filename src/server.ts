/**
 * Minimal static server for fixtures and local pages (localhost = secure context, so Device Posture
 * and VirtualKeyboard APIs are exposed). Binds 127.0.0.1 only; serves only regular files strictly inside
 * the root (symlinks resolved); no caching, no directory listing beyond index.html.
 */
import http from 'node:http';
import { createReadStream, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.yaml': 'text/yaml', '.md': 'text/markdown' };

export function resolveInside(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  const candidate = path.resolve(root, '.' + path.posix.normalize('/' + decoded));
  const rel = path.relative(root, candidate);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return candidate;
}

export async function serveStatic(root: string, port = 0): Promise<{ url: string; close(): Promise<void> }> {
  const abs = realpathSync(path.resolve(root));
  const server = http.createServer((req, res) => {
    const host = req.headers.host ?? '';
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) {
      res.writeHead(403, { 'content-type': 'text/plain' }).end('forbidden');
      return;
    }
    const u = new URL(req.url ?? '/', 'http://localhost');
    let p = resolveInside(abs, u.pathname);
    if (!p) {
      res.writeHead(403, { 'content-type': 'text/plain' }).end('forbidden');
      return;
    }
    try {
      if (statSync(p).isDirectory()) p = path.join(p, 'index.html');
      const real = realpathSync(p);
      const relReal = path.relative(abs, real);
      if (relReal.startsWith('..') || path.isAbsolute(relReal)) {
        res.writeHead(403, { 'content-type': 'text/plain' }).end('forbidden');
        return;
      }
      const st = statSync(real);
      if (!st.isFile()) {
        res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
        return;
      }
      res.writeHead(200, { 'content-type': TYPES[path.extname(real)] ?? 'application/octet-stream', 'content-length': st.size, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      createReadStream(real).pipe(res);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    }
  });
  await new Promise<void>((r) => server.listen(port, '127.0.0.1', r));
  const addr = server.address() as { port: number };
  return { url: `http://localhost:${addr.port}`, close: () => new Promise((r) => server.close(() => r())) };
}
