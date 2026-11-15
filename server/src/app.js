// One Express app. /api = health, mode, the story with its mock trace, and reset (clears the current workspace's trace).
// Loopback Host check and same-origin writes on everything. Serves web/dist when it exists.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { hostCheck, sameOriginWrites } from './safety.js';
import { createHealth } from './health.js';
import { buildFlow, loadCast } from './flow.js';
import { LIVE_UNAVAILABLE, modeFrom, modeInfo } from './config.js';
import { createWorkspaces, workspaceFrom } from './workspaces.js';
import { shelfInfo } from './shelfLink.js';
import { readFileSettings, doorConfig, createRealDoor } from './gatewayReal.js';
import { setAllowedOrigins } from './netguard.js';

// Real mode = the shared gateway hop: an agent key from the shared settings file calling a live Privilege door.
// The environment wins over the file: AMD_* variables overlay the parsed file text.
export function realDoorFrom(env = process.env) {
  const p = env.STANDALONE_ENV || `${env.HOME || ''}/Development/.env`;
  let text = '';
  try { text = fs.readFileSync(p, 'utf8'); } catch { /* the environment may still carry the keys */ }
  for (const [k, v] of Object.entries(env)) if (k.startsWith('AMD_GW_') && v) text += `\n${k}=${v}`;
  const cfg = doorConfig(text, 'AMD');
  return cfg.ok ? createRealDoor({ config: cfg, clientInfo: { name: 'agent-mcp-door-demo', version: '0.1.0' } }) : null;
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = process.env.WEB_DIST || path.resolve(HERE, '../../web/dist');
const CONFIG = process.env.CUSTOMER_CONFIG || path.resolve(HERE, '../../customer.config.json');

export function createApp({ health = createHealth(), configFile = CONFIG, workspaces = createWorkspaces() } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(hostCheck);
  app.use(sameOriginWrites);
  app.use((_req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); next(); });

  const api = express.Router();
  api.use(express.json({ limit: '1kb' }));
  api.use('/health', health.router);
  // The workspace id (rule 13) comes in the X-Workspace header; default "default". An unusable id is refused, never mapped to another.
  api.use((req, res, next) => {
    const id = workspaceFrom(req.headers['x-workspace']);
    if (!id) return res.status(400).json({ error: 'bad_workspace', message: 'workspace ids are 1-32 lowercase letters, digits or dashes' });
    req.workspace = workspaces.get(id);
    next();
  });
  // Read on every request so editing customer.config.json shows up on reload.
  api.get('/flow', (req, res) => { res.set('Cache-Control', 'no-store'); res.json({ ...buildFlow(loadCast(configFile), { workspace: req.workspace }), ...modeInfo() }); });
  // What this build is, and the Mock / Real toggle's state: mock is the only mode.
  api.get('/info', (_req, res) => { res.set('Cache-Control', 'no-store'); let version = null; try { version = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version || null; } catch { /* no version */ } res.json({ mode: modeFrom(), ...modeInfo(), simulated: true, version }); });
  api.get('/mode', (_req, res) => { res.set('Cache-Control', 'no-store'); res.json(modeInfo()); });
  // Rule 19: the toggle's switch. This lab is mock only, so mock→real is refused 409 and real→mock stays mock.
  api.post('/mode', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const next = req.body?.source;
    if (next !== 'mock' && next !== 'real') return res.status(400).json({ error: 'bad_mode', message: 'source must be exactly "mock" or "real"' });
    if (next === 'real') {
      const door = realDoorFrom();
      if (!door) return res.status(409).json({ ...modeInfo(), error: 'real_not_available', message: LIVE_UNAVAILABLE });
      return res.json({ source: 'real', realAvailable: true, doors: door.apps, gateway: door.origin });
    }
    return res.json(modeInfo());
  });
  // Reset clears this workspace's mock trace (a new trace id) and nothing else; other workspaces are untouched.
  api.post('/reset', (req, res) => { const w = workspaces.reset(req.workspace.id); res.json({ reset: 'ok', workspace: w.id, resets: w.resets }); });
  // One real gateway check: tools/list through the door, then the gateway's refusal for a tool nothing grants.
  api.post('/gateway-check', async (req, res) => {
    const door = realDoorFrom();
    if (!door) return res.status(409).json({ error: 'real_not_available', message: 'Real is not configured (the AMD_* settings are missing).' });
    if (req.body && Object.keys(req.body).some((k) => !['app', 'caller'].includes(k))) return res.status(400).json({ error: 'bad_request', detail: 'the only accepted body fields are { "app", "caller" }' });
    const app = String(req.body?.app || door.apps[0]);
    if (!door.apps.includes(app)) return res.status(400).json({ error: 'bad_app', detail: `app must be one of ${door.apps.join(', ')}` });
    const caller = req.body?.caller && door.callers.some((c) => c.id === req.body.caller) ? req.body.caller : door.callers[0].id;
    setAllowedOrigins([door.origin]); // the netguard's one real outbound: this door's origin
    const listing = await door.list(app, caller);
    const out = { app, caller, gateway: door.origin, listing };
    if (listing.ok) out.refusal = await door.call(app, caller, 'agent_mcp_door_refusal_probe_tool', {});
    res.json(out);
  });

  api.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  app.get('/api/shelf', (_req, res) => { res.set('Cache-Control', 'no-store'); res.json(shelfInfo()); }); // the header "Shelf" button
  app.use('/api', api);
  // Errors become short JSON. Express's default handler would send an HTML stack trace with absolute file paths.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = Number(err?.status || err?.statusCode);
    if (status === 413) return res.status(413).json({ error: 'payload_too_large' });
    if (status >= 400 && status < 500) return res.status(status).json({ error: 'bad_request' });
    return res.status(500).json({ error: 'internal_error' });
  });

  if (fs.existsSync(path.join(WEB_DIST, 'index.html'))) {
    app.use(express.static(WEB_DIST));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(WEB_DIST, 'index.html')));
  }

  return app;
}

export function startHttpServer({ port, host, app = createApp() } = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => resolve({ server, url: `http://${host}:${server.address().port}/` }));
    server.once('error', reject);
  });
}
