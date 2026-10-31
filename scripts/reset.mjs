#!/usr/bin/env node
// Reset a running walkthrough: clears the CURRENT workspace's mock trace on the running app (other workspaces are untouched).
//   node scripts/reset.mjs [workspace] [base-url]      (defaults: workspace "default", http://localhost:${PORT:-6850})
// Loopback only: refuses any other host. Needs the server already running; sends the same-origin header the server requires.
import { isLoopbackHost } from '../server/src/safety.js';
import { DEFAULT_WORKSPACE, workspaceFrom } from '../server/src/workspaces.js';

export async function reset(workspace = DEFAULT_WORKSPACE, base = `http://localhost:${process.env.PORT || 6850}`) {
  const id = workspaceFrom(workspace);
  if (!id) throw new Error('bad workspace id: use 1-32 lowercase letters, digits or dashes');
  const u = new URL(base);
  if (!isLoopbackHost(u.hostname)) throw new Error(`refusing ${u.hostname}: loopback only`);
  const r = await fetch(new URL('/api/reset', u), { method: 'POST', headers: { 'content-type': 'application/json', origin: u.origin, 'x-workspace': id }, body: '{}' });
  if (!r.ok) throw new Error(`reset failed: HTTP ${r.status}`);
  return r.json();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  reset(process.argv[2], process.argv[3]).then((j) => console.log(`reset: ${j.reset} (workspace ${j.workspace})`), (e) => { console.error(e.message); process.exit(1); });
}
