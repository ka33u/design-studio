import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/calculators.css', ['calculators.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/particles.js', ['particles.js', 'text/javascript; charset=utf-8']],
  ['/calculators.js', ['calculators.js', 'text/javascript; charset=utf-8']],
  ['/efficiency-data.js', ['efficiency-data.js', 'text/javascript; charset=utf-8']],
  ['/efficiency-query.js', ['efficiency-query.js', 'text/javascript; charset=utf-8']],
  ['/efficiency.js', ['efficiency.js', 'text/javascript; charset=utf-8']],
]);
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = files.get(pathname);
  if (!file || !['GET', 'HEAD'].includes(request.method)) { response.writeHead(404); response.end('Not found'); return; }
  try {
    const content = await readFile(join(root, file[0]));
    response.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch { response.writeHead(404); response.end('Not found'); }
});
const port = Number(process.env.TOOLBOX_PORT || 4318);
server.listen(port, '127.0.0.1', () => console.log(`设计工具箱 http://127.0.0.1:${port}`));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
