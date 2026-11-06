// The page talks only to its own origin. The workspace id (rule 13) is the visitor's own choice, kept in this browser and
// sent on every call; the server scopes the mock trace by it.
const KEY = 'mcpdoor-workspace';
export const DEFAULT_WORKSPACE = 'default';
export const WORKSPACE_ID = /^[a-z0-9][a-z0-9-]{0,31}$/;

let chosen = null; // kept in memory too, so the choice holds when storage is blocked

export function currentWorkspace() {
  if (chosen) return chosen;
  try {
    const v = window.localStorage.getItem(KEY);
    if (v && WORKSPACE_ID.test(v)) return v;
  } catch { /* storage blocked: the default */ }
  return DEFAULT_WORKSPACE;
}

export function chooseWorkspace(raw) {
  const id = String(raw ?? '').trim().toLowerCase();
  if (!WORKSPACE_ID.test(id)) return null;
  chosen = id;
  try { window.localStorage.setItem(KEY, id); } catch { /* the choice lasts for this page only */ }
  return id;
}

async function call(method, path, body) {
  const r = await fetch(path, {
    method,
    headers: { 'x-workspace': currentWorkspace(), ...(method === 'GET' ? {} : { 'content-type': 'application/json' }) },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }),
  });
  if (!r.ok) {
    let data = {};
    try { data = await r.json(); } catch { /* not JSON */ }
    const err = new Error(data.message || data.error || `HTTP ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

export const api = {
  flow: () => call('GET', '/api/flow'),
  info: () => call('GET', '/api/info'),
  mode: () => call('GET', '/api/mode'),
  setMode: (source) => call('POST', '/api/mode', { source }),
  reset: () => call('POST', '/api/reset'),
};
