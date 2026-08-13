import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRun, getRun, listRuns, snapshotEvents, subscribe } from './run-controller.mjs';
import { prototypeAccount, prototypeBusinessStats, setPrototypeEntitlement } from './prototype-state.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.DASHBOARD_PORT || 4321);
const types = new Map([['.html','text/html; charset=utf-8'],['.css','text/css; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.png','image/png']]);

export const server = createServer(async (request, response) => {
  try {
    const requested = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    if (requested === '/api/runs' && request.method === 'GET') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(listRuns())); return;
    }
    if (requested === '/api/prototype/account' && request.method === 'GET') { response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(prototypeAccount())); return; }
    if (requested === '/api/prototype/business-stats' && request.method === 'GET') { response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(prototypeBusinessStats())); return; }
    if (requested === '/api/prototype/activate' && request.method === 'POST') { response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(setPrototypeEntitlement('active'))); return; }
    if (requested === '/api/prototype/deactivate' && request.method === 'POST') { response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(setPrototypeEntitlement('inactive'))); return; }
    if (requested === '/api/runs' && request.method === 'POST') {
      let body = ''; for await (const chunk of request) body += chunk;
      const payload = JSON.parse(body || '{}'); if (typeof payload.prompt !== 'string' || payload.prompt.trim().length < 1) { response.writeHead(400, { 'content-type': 'application/json' }); response.end(JSON.stringify({ error: 'prompt is required' })); return; }
      response.writeHead(202, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(createRun(payload.prompt.trim()))); return;
    }
    const eventMatch = requested.match(/^\/api\/runs\/([^/]+)\/events$/);
    if (eventMatch && request.method === 'GET') {
      const run = getRun(eventMatch[1]); if (!run) { response.writeHead(404); response.end('Not found'); return; }
      response.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache', connection: 'keep-alive' }); response.write(': connected\n\n');
      const after = Number(new URL(request.url, `http://${request.headers.host}`).searchParams.get('after') || 0);
      const send = (event) => response.write(`id: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`);
      for (const event of snapshotEvents(run, after)) send(event);
      const unsubscribe = subscribe(run, send); const keepAlive = setInterval(() => response.write(': keep-alive\n\n'), 15000);
      request.on('close', () => { clearInterval(keepAlive); unsubscribe(); }); return;
    }
    const runMatch = requested.match(/^\/api\/runs\/([^/]+)$/);
    if (runMatch && request.method === 'GET') { const run = getRun(runMatch[1]); if (!run) { response.writeHead(404); response.end('Not found'); return; } response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(publicRunForServer(run))); return; }
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

function publicRunForServer(run) { return { id: run.id, promptSummary: run.promptSummary, status: run.status, startedAt: run.startedAt, finishedAt: run.finishedAt, gates: run.gates, agents: run.agents, error: run.error, eventCount: run.events.length }; }

if (process.argv[1] === fileURLToPath(import.meta.url)) server.listen(port, () => console.log(`Orchestrator Observatory: http://localhost:${port}`));
