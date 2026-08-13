import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRun, getRun, listRuns, publicRunForServer, snapshotEvents, subscribe } from './run-controller.mjs';
import { prototypeAccount, prototypeBusinessStats, prototypeCustomerStats, setPrototypeEntitlement } from './prototype-state.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.DASHBOARD_PORT || 4321);
const types = new Map([['.html','text/html; charset=utf-8'],['.css','text/css; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.png','image/png']]);

async function readJsonBody(request) {
  let body = '';
  let byteLength = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.byteLength;
    if (byteLength > 100_000) throw new Error('request body is too large');
    body += buffer.toString('utf8');
  }
  try {
    return JSON.parse(body || '{}');
  } catch {
    throw new Error('request body must be valid JSON');
  }
}

export const server = createServer(async (request, response) => {
  try {
    const requested = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    if (requested === '/api/runs' && request.method === 'GET') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(await listRuns())); return;
    }
    if ((requested === '/api/account' || requested === '/api/prototype/account') && request.method === 'GET') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(await prototypeAccount())); return;
    }
    if ((requested === '/api/customer/stats') && request.method === 'GET') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(await prototypeCustomerStats())); return;
    }
    if ((requested === '/api/business/stats' || requested === '/api/prototype/business-stats') && request.method === 'GET') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(await prototypeBusinessStats())); return;
    }
    if ((requested === '/api/account/activate' || requested === '/api/prototype/activate') && request.method === 'POST') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(await setPrototypeEntitlement('active'))); return;
    }
    if ((requested === '/api/account/deactivate' || requested === '/api/prototype/deactivate') && request.method === 'POST') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(await setPrototypeEntitlement('inactive'))); return;
    }
    if (requested === '/api/runs' && request.method === 'POST') {
      const payload = await readJsonBody(request);
      if (typeof payload.prompt !== 'string' || payload.prompt.trim().length < 1 || payload.prompt.length > 20_000) { response.writeHead(400, { 'content-type': 'application/json' }); response.end(JSON.stringify({ error: 'prompt must be a non-empty string of at most 20000 characters' })); return; }
      const account = await prototypeAccount();
      if (!account.active) { response.writeHead(403, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify({ error: 'subscription_inactive', decision: 'subscription_inactive' })); return; }
      response.writeHead(202, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(createRun(payload.prompt.trim()))); return;
    }
    const eventMatch = requested.match(/^\/api\/runs\/([^/]+)\/events$/);
    if (eventMatch && request.method === 'GET') {
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(eventMatch[1])) { response.writeHead(404); response.end('Not found'); return; }
      const run = await getRun(eventMatch[1]); if (!run) { response.writeHead(404); response.end('Not found'); return; }
      response.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache', connection: 'keep-alive' }); response.write(': connected\n\n');
      const after = Number(new URL(request.url, `http://${request.headers.host}`).searchParams.get('after') || 0);
      let keepAlive;
      let unsubscribe = () => {};
      const cleanup = () => { if (keepAlive) clearInterval(keepAlive); unsubscribe(); };
      const send = (event) => {
        if (response.destroyed || response.writableEnded) { cleanup(); return; }
        try { response.write(`id: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`); } catch { cleanup(); }
      };
      for (const event of snapshotEvents(run, after)) send(event);
      unsubscribe = subscribe(run, send); keepAlive = setInterval(() => send({ id: 0, type: 'keep-alive' }), 15000);
      request.on('close', cleanup); response.on('error', cleanup); return;
    }
    const runMatch = requested.match(/^\/api\/runs\/([^/]+)$/);
    if (runMatch && request.method === 'GET') { if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(runMatch[1])) { response.writeHead(404); response.end('Not found'); return; } const run = await getRun(runMatch[1]); if (!run) { response.writeHead(404); response.end('Not found'); return; } response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(publicRunForServer(run))); return; }
    const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
    const filePath = relative.startsWith('experiments/')
      ? path.resolve(root, '..', relative)
      : path.resolve(root, relative);
    const allowedRoot = relative.startsWith('experiments/') ? path.resolve(root, '..', 'experiments') : root;
    if (!filePath.startsWith(allowedRoot + path.sep)) throw new Error('outside dashboard');
    const body = await readFile(filePath);
    response.writeHead(200, { 'content-type': types.get(path.extname(filePath)) || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(body);
  } catch (error) {
    console.error(error);
    if (response.headersSent || response.writableEnded) return;
    const status = /request body|too large/i.test(error.message) ? 400 : 404;
    response.writeHead(status, { 'content-type': status === 400 ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8' });
    response.end(status === 400 ? JSON.stringify({ error: error.message }) : 'Not found');
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) server.listen(port, '127.0.0.1', () => console.log(`Orchestrator Observatory: http://localhost:${port}`));
