import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ALLOWED, loadSettings, settingsPath } from '../src/settings.js';

const tmp = (text) => { const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'door-env-')), '.env'); fs.writeFileSync(f, text, { mode: 0o600 }); return f; };

test('settingsPath: STANDALONE_ENV overrides, the default is ~/Development/.env', () => {
  assert.equal(settingsPath({ STANDALONE_ENV: '/x/y.env' }), '/x/y.env');
  assert.equal(settingsPath({}), path.join(os.homedir(), 'Development', '.env'));
});

test('only this app\'s own keys are read; every other key (admin, worker, vault, PingOne) is ignored', () => {
  const file = tmp(['# comment', 'MODE=mock', 'PORT="6851"', 'PINGONE_ENVIRONMENT_ID=abc', 'PINGONE_ADMIN_CLIENT_SECRET=nope', 'WORKER_SECRET=nope', 'VAULT_PASSWORD=nope', 'export MCPDOOR_BIND=127.0.0.1  # loopback', ''].join('\n'));
  const env = {};
  const r = loadSettings({ env, file });
  assert.deepEqual(env, { MODE: 'mock', PORT: '6851', MCPDOOR_BIND: '127.0.0.1' });
  assert.deepEqual(r.loaded.sort(), ['MCPDOOR_BIND', 'MODE', 'PORT']);
  assert.equal(r.skipped, 4);
  assert.equal(r.mode, '600');
  assert.ok(!JSON.stringify(r).includes('nope'), 'no value is returned');
  assert.deepEqual(ALLOWED, ['MODE', 'PORT', 'MCPDOOR_BIND', 'CUSTOMER_CONFIG']);
});

test('a value already in the environment wins; a commented key is not read; a missing file is fine', () => {
  const file = tmp('PORT=6851\n# MODE=live\n');
  const env = { PORT: '6860' };
  loadSettings({ env, file });
  assert.deepEqual(env, { PORT: '6860' });
  const r = loadSettings({ env: {}, file: path.join(os.tmpdir(), 'no-such-door-env') });
  assert.equal(r.found, false);
});

test('MODE=live in the settings file reaches the mode check and is refused (no live backend)', async () => {
  const { modeFrom } = await import('../src/config.js');
  const env = {};
  loadSettings({ env, file: tmp('MODE=live\n') });
  assert.throws(() => modeFrom(env), /not available/);
});
