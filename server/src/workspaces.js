// Workspace id (default "default"): scopes the mock trace so two visitors, tabs or rehearsals never share one.
// The walkthrough itself lives in the browser; the server keeps only each workspace's trace id and a reset counter.
// Reset clears the CURRENT workspace only. The table is capped, so a flood of ids cannot grow memory without bound.
import { randomBytes } from 'node:crypto';

export const DEFAULT_WORKSPACE = 'default';
export const MAX_WORKSPACES = 64;
const ID = /^[a-z0-9][a-z0-9-]{0,31}$/;

// Returns a valid id, or null when the header is present but not acceptable.
export function workspaceFrom(header) {
  if (header === undefined || header === '') return DEFAULT_WORKSPACE;
  const v = String(header).toLowerCase();
  return ID.test(v) ? v : null;
}

export function createWorkspaces({ max = MAX_WORKSPACES } = {}) {
  const table = new Map(); // insertion order = least recently used first
  const fresh = (id) => ({ id, traceId: randomBytes(16).toString('hex'), resets: 0, since: new Date().toISOString() });
  function get(id) {
    let w = table.get(id);
    if (w) { table.delete(id); } else { w = fresh(id); }
    table.set(id, w);
    while (table.size > max) table.delete(table.keys().next().value);
    return w;
  }
  function reset(id) {
    const old = table.get(id);
    const w = fresh(id);
    w.resets = (old?.resets || 0) + 1;
    table.delete(id);
    table.set(id, w);
    while (table.size > max) table.delete(table.keys().next().value);
    return w;
  }
  return { get, reset, size: () => table.size, ids: () => [...table.keys()] };
}
