// Preflight checks shared by `npm run doctor` and GET /api/health. Never prints a secret, needs no network.
// Each check: { id, level: 'pass' | 'info' | 'fail', detail }.
import { assertBindAllowed, bindHost, portProblem, scanHosts, scanKeys, DEFAULT_PORT, PORT_MIN, PORT_MAX } from './safety.js';
import { netguardSelfTest } from './netguard.js';
import { DEFAULT_CAST, buildFlow, fillDeep, storyText, unfilled } from './flow.js';
import { DIAGRAM_NAMES, annotationProblems, rawStory } from './story.js';
import { validateDiagram } from './diagramStudio.js';
import { modeFrom } from './config.js';
import { TRACEPARENT } from './trace.js';
import { createWorkspaces } from './workspaces.js';

export async function runChecks({ env = process.env, cast = DEFAULT_CAST, settings = null } = {}) {
  const checks = [];
  const add = (id, level, detail) => checks.push({ id, level, detail });

  const major = Number(process.versions.node.split('.')[0]);
  add('node', major >=26 ? 'pass' : 'fail', `v${process.versions.node} (need >=26)`);

  if (settings) {
    add('settings', 'info', settings.found
      ? `read ${settings.file} (${settings.loaded.length} app setting(s) used: ${settings.loaded.join(', ') || 'none'}; ${settings.skipped} other key(s) ignored)`
      : `no settings file at ${settings.file}: not needed, mock mode runs with the defaults`);
    if (settings.found && settings.mode && settings.mode !== '600') add('settings-mode', 'info', `${settings.file} is mode ${settings.mode}; it should be 600`);
  }

  try { add('mode', 'pass', `MODE=${modeFrom(env)} (the only mode this app has)`); }
  catch (e) { add('mode', 'fail', e.message); }

  try { add('bind', 'pass', `${assertBindAllowed(bindHost(env), env)}${env.MCPDOOR_BIND ? ' (MCPDOOR_BIND opt-in)' : ' (loopback)'}`); }
  catch (e) { add('bind', 'fail', e.message); }

  const port = env.PORT === undefined || env.PORT === '' ? DEFAULT_PORT : Number(env.PORT);
  const problem = portProblem(port);
  add('port-range', problem ? 'fail' : 'pass', problem || `${port} is inside ${PORT_MIN}-${PORT_MAX} and not reserved`);

  for (const name of DIAGRAM_NAMES) {
    const { doc, ann } = rawStory(name);
    const problems = [...validateDiagram(doc), ...annotationProblems(doc, ann)];
    add('story-shape', problems.length ? 'fail' : 'pass', problems.length ? `${name}: ${problems.join('; ')}` : `${name}: diagram-studio/1, ${doc.nodes.length} participants, ${doc.edges.length} messages, ${doc.steps.length} hops, ${ann.payloads.length} payload slots`);
    const holes = unfilled(storyText(name), DEFAULT_CAST);
    add('story-tokens', holes.length ? 'fail' : 'pass', holes.length ? `unfilled {{tokens}}: ${[...new Set(holes)].join(', ')}` : 'every {{cast}} token is filled');
  }

  const filled = JSON.stringify(buildFlow(cast));
  const hosts = scanHosts(filled);
  add('story-hosts', hosts.length ? 'fail' : 'pass', hosts.length ? `non-reserved hosts: ${hosts.join(', ')}` : 'every host in the story is .invalid or .example');
  const keys = scanKeys(filled);
  add('story-keys', keys.length ? 'fail' : 'pass', keys.length ? 'key-looking values that are not sk-MOCK-' : 'no key-looking values in the story');

  const ws = createWorkspaces().get('default');
  const trace = buildFlow(cast, { workspace: ws }).trace;
  add('trace', trace.every((t) => TRACEPARENT.test(t.traceparent)) ? 'pass' : 'fail', `${trace.length} mock traceparent values, one per message`);

  const ng = await netguardSelfTest();
  add('netguard', ng.ok ? 'pass' : 'fail', ng.ok ? `blocked fetch, socket, socket-by-IP, dns lookup, dns resolve and udp to a non-loopback host (${ng.blocked}/6)` : ng.detail);

  add('tenant', 'pass', 'mock only: no tenant, no credentials, no outbound network');
  return checks;
}

export const allPassed = (checks) => checks.every((c) => c.level !== 'fail');
