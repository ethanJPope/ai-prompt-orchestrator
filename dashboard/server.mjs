import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.DASHBOARD_PORT || 4321);
const types = new Map([['.html','text/html; charset=utf-8'],['.css','text/css; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.png','image/png']]);

export const server = createServer(async (request, response) => {
  try {
    const requested = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
    const filePath = relative.startsWith('experiments/')
      ? path.resolve(root, '..', relative)
      : path.resolve(root, relative);
    const allowedRoot = relative.startsWith('experiments/') ? path.resolve(root, '..', 'experiments') : root;
    if (!filePath.startsWith(allowedRoot + path.sep)) throw new Error('outside dashboard');
    const body = await readFile(filePath);
    response.writeHead(200, { 'content-type': types.get(path.extname(filePath)) || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) server.listen(port, () => console.log(`Orchestrator Observatory: http://localhost:${port}`));
