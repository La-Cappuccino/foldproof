/**
 * Minimal static server for fixtures and local pages (localhost = secure context, so Device Posture
 * and VirtualKeyboard APIs are exposed). No caching, no directory listing beyond index.html.
 */
import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';

const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg' };

export async function serveStatic(root: string, port = 0): Promise<{ url: string; close(): Promise<void> }> {
  const abs = path.resolve(root);
  const server = http.createServer((req, res) => {
    const u = new URL(req.url ?? '/', 'http://localhost');
    let p = path.normalize(path.join(abs, decodeURIComponent(u.pathname)));
    if (!p.startsWith(abs)) {
      res.writeHead(403).end();
      return;
    }
    try {
      if (statSync(p).isDirectory()) p = path.join(p, 'index.html');
      const st = statSync(p);
      res.writeHead(200, { 'content-type': TYPES[path.extname(p)] ?? 'application/octet-stream', 'content-length': st.size, 'cache-control': 'no-store' });
      createReadStream(p).pipe(res);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    }
  });
  await new Promise<void>((r) => server.listen(port, '127.0.0.1', r));
  const addr = server.address() as { port: number };
  return { url: `http://localhost:${addr.port}`, close: () => new Promise((r) => server.close(() => r())) };
}
