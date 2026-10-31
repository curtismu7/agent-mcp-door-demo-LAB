// Builds content-pack.json for the Learning Hub from the story data, so the pack cannot drift from the walkthrough.
//   node scripts/build-content-pack.mjs        (writes content-pack.json)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CAST, buildFlow } from '../server/src/flow.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

export function buildPack() {
  const flow = buildFlow(DEFAULT_CAST);
  const terms = { 1: ['catalog-listing'], 2: ['protected-resource-metadata'], 3: ['cimd'], 4: ['private-key-jwt'], 5: ['per-call-token', 'act-claim', 'private-key-jwt'], 6: ['bearer-token'], 7: ['approval-receipt'], 8: ['facade'], 9: ['act-claim'] };
  const sid = (n) => `S${String(n).padStart(2, '0')}`;
  const tryCard = (h) => ({ id: `try-hop-${h.n}`, label: `Hop ${h.n}: ${h.title}`, description: h.say, group: 'try-it', action: { type: 'route', href: `/#hop-${h.n}` }, terms: terms[h.n], story: sid(h.n) });
  return {
    schema: 'demo-content-pack/1',
    id: 'agent-mcp-door-demo',
    title: 'Agent Meets the MCP Door LAB',
    version,
    demo: { id: 'agent-mcp-door-demo', name: 'Agent Meets the MCP Door LAB', catalog: 'D56', baseUrl: 'http://localhost:6850', doctor: '/api/health', tags: ['mcp', 'agent', 'token-exchange', 'consent', 'approval', 'mock-only'] },
    glossary: [
      { id: 'catalog-listing', term: 'Catalog listing', definition: 'The company publishes its connector once to the AI assistant\'s catalog (for example ChatGPT\'s app directory): the MCP URL, how to authorize, branding and a privacy policy. After the vendor lists it, any member can add it for free from the catalog. The catalog holds no member credentials; sign-in and consent happen at the company\'s own identity provider on first use.', aliases: ['connector', 'app directory'] },
      { id: 'protected-resource-metadata', term: 'Protected-resource metadata', definition: 'A document the MCP door publishes (RFC 9728) that names its authorization server and the scopes it understands. The first 401 points at it, so an agent can find out how to get a token with no prior arrangement.', aliases: ['RFC 9728', 'resource_metadata'] },
      { id: 'cimd', term: 'Client ID Metadata Document (CIMD)', definition: 'The agent registers itself by publishing a client document at a URL and using that URL as its client id. The enterprise fetches it, so it has an identity to name in consent, scope and switch off. Dynamic client registration (RFC 7591) is the alternative.', aliases: ['client document', 'DCR'] },
      { id: 'private-key-jwt', term: 'private_key_jwt', definition: 'The agent authenticates to the token endpoint with a short signed assertion made with a key only it holds. A thief who steals tokens cannot mint more. It is client authentication, not sender constraint: a token already issued is still a bearer.' },
      { id: 'per-call-token', term: 'Per-call token', definition: 'Every tool call gets its own token through an RFC 8693 exchange: subject is the member, actor is the agent, one audience, a lifetime of minutes. The agent holds no standing credential, and an injected prompt can pick a tool but cannot mint a token.', aliases: ['RFC 8693', 'token exchange'] },
      { id: 'act-claim', term: 'act claim', definition: 'The claim that records who is acting for the subject. In this flow sub is the member and act.client_id is the agent, so every log line and policy decision can say both who the data belongs to and who asked for it.', aliases: ['act.client_id', 'actor'] },
      { id: 'bearer-token', term: 'Bearer token', definition: 'A token that works for whoever presents it. PingOne issues bearers (no DPoP), so the short lifetime, the single audience and the fact that it can only be presented at the gateway do the work that key binding would.', aliases: ['no DPoP'] },
      { id: 'approval-receipt', term: 'Approval receipt', definition: 'Proof that the human approved one specific action in the enterprise\'s own app. Single use, bound to that transaction, and a timeout is a denial. The human approves a transaction, never a session.' },
      { id: 'facade', term: 'Facade', definition: 'The one component that holds the legacy credentials. It performs the credential exchange and builds the web session in Redis keyed by a hash of the token; the session is never returned to the client.' },
    ],
    sources: [
      { id: 'rfc9728', title: 'RFC 9728: OAuth 2.0 Protected Resource Metadata', url: 'https://www.rfc-editor.org/rfc/rfc9728', kind: 'standard', use: 'The metadata the first 401 points at.', status: 'not-read', checked: '2026-10-21' },
      { id: 'rfc8693', title: 'RFC 8693: OAuth 2.0 Token Exchange', url: 'https://www.rfc-editor.org/rfc/rfc8693', kind: 'standard', use: 'The per-call exchange that produces sub and act.', status: 'not-read', checked: '2026-10-21' },
      { id: 'rfc7591', title: 'RFC 7591: OAuth 2.0 Dynamic Client Registration', url: 'https://www.rfc-editor.org/rfc/rfc7591', kind: 'standard', use: 'The registration alternative to a client document.', status: 'not-read', checked: '2026-10-21' },
      { id: 'rfc7636', title: 'RFC 7636: Proof Key for Code Exchange', url: 'https://www.rfc-editor.org/rfc/rfc7636', kind: 'standard', use: 'PKCE on the consent step.', status: 'not-read', checked: '2026-10-21' },
      { id: 'rfc6750', title: 'RFC 6750: The OAuth 2.0 Bearer Token Usage', url: 'https://www.rfc-editor.org/rfc/rfc6750', kind: 'standard', use: 'The bearer credential and the 401 challenge.', status: 'not-read', checked: '2026-10-21' },
    ],
    cards: [
      ...flow.hops.map(tryCard),
      { id: 'concept-trust', label: 'The agent is never trusted', description: 'Every hop past discovery is inside the enterprise boundary; the agent only ever holds a token that lives for minutes.', group: 'concept', action: { type: 'route', href: '/' }, terms: ['per-call-token', 'bearer-token'] },
      { id: 'ref-doctor', label: 'Doctor and health', description: 'Preflight checks and the demo-health/1 endpoint.', group: 'setup', action: { type: 'route', href: '/api/health' } },
    ],
    stories: flow.hops.map((h) => ({ id: sid(h.n), title: h.title, say: h.say })),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(path.join(ROOT, 'content-pack.json'), `${JSON.stringify(buildPack(), null, 2)}\n`);
  console.log('wrote content-pack.json');
}
