import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { rawHttp, withServer } from './helpers.js';

test('GET /api/health answers demo-health/1, ready and offline', async () => {
  await withServer(async (url) => {
    const r = await fetch(`${url}/api/health`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    const j = await r.json();
    assert.equal(j.schema, 'demo-health/1');
    assert.equal(j.state, 'ready');
    assert.equal(j.runtime, 'offline');
    assert.equal(j.demo.id, 'agent-mcp-door-demo');
    assert.deepEqual(Object.keys(j).sort(), ['at', 'demo', 'runtime', 'schema', 'state']);
  });
});

test('health is GET only', async () => {
  await withServer(async (url) => {
    const r = await fetch(`${url}/api/health`, { method: 'POST', headers: { origin: url } });
    assert.equal(r.status, 405);
  });
});

test('GET /api/flow returns the filled story; customer.config.json is read on each request', async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'door-')), 'customer.config.json');
  await withServer(async (url) => {
    let j = await (await fetch(`${url}/api/flow`)).json();
    assert.match(j.title, /Northwind Air/);
    assert.equal(j.payloads.length, 22);
    assert.equal(j.hops.length, 9);
    fs.writeFileSync(file, JSON.stringify({ cast: { brand: 'Skyline Air' } }));
    j = await (await fetch(`${url}/api/flow`)).json();
    assert.match(j.title, /Skyline Air/);
  }, { configFile: file });
});

test('POST /api/reset confirms and refuses a cross-origin caller', async () => {
  await withServer(async (url) => {
    const ok = await fetch(`${url}/api/reset`, { method: 'POST', headers: { 'content-type': 'application/json', origin: url }, body: '{}' });
    assert.equal((await ok.json()).reset, 'ok');
    const bad = await fetch(`${url}/api/reset`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body: '{}' });
    assert.equal(bad.status, 403);
  });
});

test('a non-loopback Host header is refused (DNS rebinding)', async () => {
  await withServer(async (url) => {
    const r = await rawHttp(`${url}/api/health`, { headers: { host: 'evil.example.invalid' } });
    assert.equal(r.status, 403);
  });
});

test('unknown API paths are 404 JSON', async () => {
  await withServer(async (url) => {
    const r = await fetch(`${url}/api/nope`);
    assert.equal(r.status, 404);
    assert.equal((await r.json()).error, 'not_found');
  });
});

test('GET /api/info says what this build is: mock and simulated, with the rule 19 mode view', async () => {
  await withServer(async (url) => {
    const j = await (await fetch(`${url}/api/info`)).json();
    assert.equal(j.mode, 'mock'); assert.equal(j.simulated, true);
    assert.equal(j.source, 'mock'); assert.equal(j.realAvailable, false); assert.match(j.realReason, /mock only/);
  });
});

test('an oversized or malformed body gets a short JSON error, never a stack trace or a file path', async () => {
  await withServer(async (url) => {
    const post = (body) => fetch(`${url}/api/reset`, { method: 'POST', headers: { 'content-type': 'application/json', origin: url }, body });
    const big = await post(JSON.stringify({ pad: 'x'.repeat(5000) }));
    assert.equal(big.status, 413);
    assert.deepEqual(await big.json(), { error: 'payload_too_large' });
    const bad = await post('{not json');
    assert.equal(bad.status, 400);
    const text = JSON.stringify(await bad.json());
    assert.equal(text, JSON.stringify({ error: 'bad_request' }));
    assert.ok(!/\/Users\/|node_modules|at \w+ \(/.test(text), 'no stack or path');
    assert.equal((await fetch(`${url}/api/health`)).status, 200, 'the server stays up');
  });
});
