import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const crmDirectory = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distDirectory = resolve(crmDirectory, 'dist');
const indexFile = resolve(distDirectory, 'index.html');
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
]);

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Method not allowed');
    return;
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname); }
  catch { response.writeHead(400).end(); return; }

  let file = resolve(distDirectory, `.${pathname}`);
  if (file !== distDirectory && !file.startsWith(`${distDirectory}${sep}`)) {
    response.writeHead(404).end();
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': contentTypes.get(extname(file)) ?? 'application/octet-stream', 'Content-Length': content.length });
    if (request.method === 'HEAD') response.end();
    else response.end(content);
  } catch {
    try {
      const content = await readFile(indexFile);
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': content.length }).end(content);
    } catch {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end('CRM E2E build is unavailable');
    }
  }
});

server.listen(Number(process.env.CRM_E2E_PORT ?? 5174), '127.0.0.1');

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
