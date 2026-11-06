import test from 'node:test';
import assert from 'node:assert/strict';
import { LIVE_UNAVAILABLE, MODES, modeInfo, modeFrom, configuredMode } from '../src/config.js';
import { withServer } from './helpers.js';

test('mock is the default mode and the only one; the toggle data says why Live is unavailable', () => {
  assert.deepEqual(MODES, ['mock', 'live']);
  assert.deepEqual(modeInfo({}), { mode: 'mock', source: 'mock', available: ['mock'], realAvailable: false, realReason: LIVE_UNAVAILABLE, live: { available: false, reason: LIVE_UNAVAILABLE } });
  assert.throws(() => modeInfo({ MODE: 'live' }), /not available/);
  assert.equal(modeFrom({ MODE: '' }), 'mock');
});

test('configuredMode reads MODE from the process environment', () => {
  const saved = process.env.MODE;
  try {
    delete process.env.MODE;
    assert.equal(configuredMode(), 'mock');
    process.env.MODE = 'live';
    assert.throws(() => configuredMode(), /not available/);
  } finally { if (saved === undefined) delete process.env.MODE; else process.env.MODE = saved; }
});

test('GET /api/mode and /api/flow both report mock with Live unavailable', async () => {
  await withServer(async (url) => {
    const m = await (await fetch(`${url}/api/mode`)).json();
    assert.equal(m.mode, 'mock');
    assert.equal(m.live.available, false);
    const f = await (await fetch(`${url}/api/flow`)).json();
    assert.equal(f.mode, 'mock');
    assert.equal(f.live.available, false);
  });
});

test('rule 19: GET /api/info carries source, realAvailable and realReason; POST /api/mode refuses mock→real with 409 and keeps real→mock', async () => {
  await withServer(async (url) => {
    const info = await (await fetch(`${url}/api/info`)).json();
    assert.equal(info.source, 'mock');
    assert.equal(info.realAvailable, false);
    assert.match(info.realReason, /mock only/);
    const refused = await fetch(`${url}/api/mode`, { method: 'POST', headers: { 'content-type': 'application/json', origin: url }, body: '{"source":"real"}' });
    assert.equal(refused.status, 409);
    const body = await refused.json();
    assert.equal(body.error, 'real_not_available');
    assert.equal(body.realAvailable, false);
    assert.match(body.realReason, /mock only/);
    const stay = await fetch(`${url}/api/mode`, { method: 'POST', headers: { 'content-type': 'application/json', origin: url }, body: '{"source":"mock"}' });
    assert.equal(stay.status, 200);
    assert.equal((await stay.json()).source, 'mock');
    for (const b of ['{}', '{"source":"live"}']) {
      const r = await fetch(`${url}/api/mode`, { method: 'POST', headers: { 'content-type': 'application/json', origin: url }, body: b });
      assert.equal(r.status, 400, b);
    }
    const after = await (await fetch(`${url}/api/info`)).json();
    assert.equal(after.source, 'mock');
  });
});
