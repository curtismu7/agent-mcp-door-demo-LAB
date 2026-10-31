import { installNetguard } from './netguard.js';
import { startHttpServer, createApp } from './app.js';
import { allPassed, runChecks } from './doctor.js';
import { assertBindAllowed, bindHost, resolvePort } from './safety.js';
import { configuredMode } from './config.js';
import { loadSettings } from './settings.js';

installNetguard(); // before anything else can open a socket

// The shared settings file (STANDALONE_ENV, else ~/Development/.env): only this app's own keys are read.
const settings = loadSettings();

const checks = await runChecks({ settings });
if (!allPassed(checks)) {
  for (const c of checks.filter((x) => x.level === 'fail')) console.error(`[agent-mcp-door-demo] refusing to start: ${c.id}: ${c.detail}`);
  process.exit(1);
}
configuredMode(); // refuses anything but MODE=mock
const host = assertBindAllowed(bindHost(), process.env);
const { url } = await startHttpServer({ port: resolvePort(), host, app: createApp() });
console.log(`[agent-mcp-door-demo] mock walkthrough at ${url} (loopback, no outbound network)`);
console.log(`[agent-mcp-door-demo] health: ${url}api/health`);
