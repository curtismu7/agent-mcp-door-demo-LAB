// Preflight: the same checks GET /api/health reports from, plus whether the app answers on its port (or the port is free).
// Prints only pass/fail lines, never the value of a setting. Exit 1 on any failure. Needs no network beyond loopback.
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = (f) => pathToFileURL(path.join(root, 'server/src', f));
const { loadSettings } = await import(url('settings.js'));
const settings = loadSettings(); // the shared file: STANDALONE_ENV, else ~/Development/.env (this app's own keys only)
const { installNetguard } = await import(url('netguard.js'));
installNetguard();
const { runChecks } = await import(url('doctor.js'));

let failed = 0;
const report = (level, name, detail) => { if (level === 'fail') failed++; console.log(`${level.toUpperCase().padEnd(4)}  ${name}: ${detail}`); };
for (const c of await runChecks({ settings })) report(c.level, c.id, c.detail);

const port = Number(process.env.PORT) || 6850;
const running = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1500) })
  .then((r) => r.json()).catch(() => null);
if (running?.schema === 'demo-health/1') {
  report(running.state === 'ready' ? 'pass' : 'fail', 'running', `the app answers on ${port}: state ${running.state}, runtime ${running.runtime}`);
} else if (running) {
  report('fail', 'port-free', `${port} is used by something that is not this app. See the README, "What to do if the port is taken"`);
} else {
  await new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', (e) => { report('fail', 'port-free', `${port} is not free (${e.code}). See the README, "What to do if the port is taken"`); resolve(); });
    s.listen(port, '127.0.0.1', () => s.close(() => { report('pass', 'port-free', `${port} is free (the app is not running)`); resolve(); }));
  });
}
process.exit(failed ? 1 : 0);
