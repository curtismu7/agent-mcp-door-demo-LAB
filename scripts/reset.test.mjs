import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp, startHttpServer } from '../server/src/app.js';
import { createHealth } from '../server/src/health.js';
import { reset } from './reset.mjs';

async function withApp(fn) {
  const health = createHealth({ intervalMs: 3_600_000 });
  await health.ready;
  const { server, url } = await startHttpServer({ port: 0, host: '127.0.0.1', app: createApp({ health, configFile: '/nonexistent/customer.config.json' }) });
  try { await fn(url.replace(/\/$/, '')); } finally { health.stop(); await new Promise((r) => server.close(r)); }
}

test('reset script clears the named workspace on a running app and refuses a bad id or a non-loopback host', async () => {
  await withApp(async (url) => {
    assert.deepEqual(await reset('room-1', url), { reset: 'ok', workspace: 'room-1', resets: 1 });
    assert.equal((await reset(undefined, url)).workspace, 'default');
  });
  await assert.rejects(reset('../x', 'http://127.0.0.1:1'), /bad workspace/);
  await assert.rejects(reset('a', 'http://other.invalid'), /loopback only/);
});
