import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaces, DEFAULT_WORKSPACE, MAX_WORKSPACES, workspaceFrom } from '../src/workspaces.js';
import { TRACEPARENT, spanId, traceFor, traceparent } from '../src/trace.js';
import { withServer } from './helpers.js';

test('workspaceFrom: default when absent, lower-cased, and null for anything unusable', () => {
  assert.equal(workspaceFrom(undefined), DEFAULT_WORKSPACE);
  assert.equal(workspaceFrom(''), 'default');
  assert.equal(workspaceFrom('Demo-1'), 'demo-1');
  for (const bad of ['-x', 'a b', 'a/b', '../x', 'x'.repeat(33), 'é', '<script>']) assert.equal(workspaceFrom(bad), null, bad);
});

test('the workspace table is capped and evicts the least recently used', () => {
  const w = createWorkspaces({ max: 3 });
  for (const id of ['a', 'b', 'c']) w.get(id);
  w.get('a'); // a is now most recent
  w.get('d');
  assert.deepEqual(w.ids(), ['c', 'a', 'd']);
  assert.equal(MAX_WORKSPACES, 64);
  const big = createWorkspaces();
  for (let i = 0; i < 500; i++) big.get(`w${i}`);
  assert.equal(big.size(), 64);
});

test('traceparent is W3C shaped, stable per workspace, and different per hop and per workspace', () => {
  const w = createWorkspaces();
  const a = w.get('a'); const b = w.get('b');
  assert.match(traceparent(a.traceId, 0), TRACEPARENT);
  const t = traceFor(a.traceId, 22);
  assert.equal(t.length, 22);
  assert.equal(new Set(t.map((x) => x.traceparent)).size, 22);
  assert.equal(t[0].parent, null);
  assert.equal(t[5].parent, spanId(a.traceId, 4));
  assert.deepEqual(traceFor(a.traceId, 22), t, 'stable until reset');
  assert.notEqual(a.traceId, b.traceId);
  assert.equal(w.get('a').traceId, a.traceId);
});

const flow = (url, ws) => fetch(`${url}/api/flow`, { headers: ws ? { 'x-workspace': ws } : {} }).then((r) => r.json());
const reset = (url, ws) => fetch(`${url}/api/reset`, { method: 'POST', headers: { 'content-type': 'application/json', origin: url, ...(ws ? { 'x-workspace': ws } : {}) }, body: '{}' }).then((r) => r.json());

test('GET /api/flow carries the workspace id and one mock traceparent per message', async () => {
  await withServer(async (url) => {
    const j = await flow(url);
    assert.equal(j.workspace, 'default');
    assert.equal(j.trace.length, 22);
    for (const t of j.trace) assert.match(t.traceparent, TRACEPARENT);
    assert.equal((await flow(url, 'room-2')).workspace, 'room-2');
  });
});

test('reset clears the CURRENT workspace only: its trace id changes, another workspace keeps its own', async () => {
  await withServer(async (url) => {
    const a1 = (await flow(url, 'alpha')).trace[0].traceparent;
    const b1 = (await flow(url, 'beta')).trace[0].traceparent;
    assert.notEqual(a1, b1, 'two workspaces never share a trace');
    const r = await reset(url, 'alpha');
    assert.deepEqual(r, { reset: 'ok', workspace: 'alpha', resets: 1 });
    assert.notEqual((await flow(url, 'alpha')).trace[0].traceparent, a1, 'alpha has a new trace');
    assert.equal((await flow(url, 'beta')).trace[0].traceparent, b1, 'beta is untouched');
    assert.equal((await reset(url, 'alpha')).resets, 2);
  });
});

test('a bad workspace id is refused with a short JSON error, never mapped to another workspace', async () => {
  await withServer(async (url) => {
    for (const bad of ['../etc', 'a b', 'x'.repeat(40)]) {
      const r = await fetch(`${url}/api/flow`, { headers: { 'x-workspace': bad } });
      assert.equal(r.status, 400, bad);
      assert.equal((await r.json()).error, 'bad_workspace');
    }
  });
});

test('health stays public and needs no workspace', async () => {
  await withServer(async (url) => {
    const r = await fetch(`${url}/api/health`, { headers: { 'x-workspace': '../bad' } });
    assert.equal(r.status, 200);
  });
});
