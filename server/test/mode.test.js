import test from 'node:test';
import assert from 'node:assert/strict';
import { LIVE_UNAVAILABLE, MODES, modeInfo, modeFrom, configuredMode } from '../src/config.js';
import { withServer } from './helpers.js';

test('mock is the default mode and the only one; the toggle data says why Live is unavailable', () => {
  assert.deepEqual(MODES, ['mock', 'live']);
  assert.deepEqual(modeInfo({}), { mode: 'mock', available: ['mock'], live: { available: false, reason: LIVE_UNAVAILABLE } });
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

test('there is no way to switch to live over HTTP: POST /api/mode is not a route', async () => {
  await withServer(async (url) => {
    const r = await fetch(`${url}/api/mode`, { method: 'POST', headers: { 'content-type': 'application/json', origin: url }, body: '{"mode":"live"}' });
    assert.equal(r.status, 404);
  });
});
