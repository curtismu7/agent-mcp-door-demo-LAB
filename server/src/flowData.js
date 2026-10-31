// The story: a member's own AI agent meets an enterprise MCP door, hop by hop. Text is data with {{tokens}} so the
// brand, program and host come from customer.config.json (see flow.js). Every host ends in .example and every token
// value is a teaching value: nothing here is a real credential, tenant or customer.

const jwt = (title, claims) => `${title} (JWT, MOCK: teaching values only)\n${JSON.stringify(claims, null, 2)}`;

export const SOURCE = `sequenceDiagram
    autonumber
    participant M as Member\\n{{program}} member
    participant K as AI assistant catalog\\ne.g. ChatGPT's app directory
    participant A as Member's own agent\\nChatGPT, mobile assistant, CLI
    participant G as {{brand}} MCP door\\nPingGateway • public URL
    participant P as PingOne\\nauth server • token service • Agreement
    participant Z as PingOne Authorize + Protect\\npermit • deny • step-up
    participant U as {{brand}} app\\nmember's phone or web
    participant L as Rewards MCP + Facade\\nholds the legacy credentials
    participant S as Audit + SIEM\\nthe agent has no write path

    rect rgb(225,229,238)
    Note over K,G: 1 Publish once, get it free
    G->>K: {{brand}} publishes its MCP door to the catalog: URL, auth metadata, branding and privacy policy
    K-->>G: Reviews it and lists it, so any member of the assistant can find it
    M->>K: Browses the catalog and adds the connector: free, nothing to install, no account to create
    K-->>A: The connector appears in the member's own agent, not signed in yet
    end
    rect rgb(226,228,236)
    Note over A,G: 2 Discover
    A->>G: Calls the MCP tool with no token → 401 + resource_metadata
    G-->>A: RFC 9728 protected-resource metadata: the authorization server is PingOne
    end
    rect rgb(226,228,236)
    Note over A,P: 3 Register
    A->>P: Self-registers with a CIMD client document (or DCR, RFC 7591) and gets its own client identity
    end
    rect rgb(222,230,248)
    Note over M,P: 4 Consent
    A->>M: Opens the member's browser to PingOne (authorization code + PKCE)
    M->>P: Passkey or MFA, then consents on a screen that names this agent: read miles, redeem with approval
    P-->>A: Authorization code; the agent redeems it with private_key_jwt client authentication
    end
    rect rgb(255,235,222)
    Note over A,P: 5 Exchange, per call
    A->>P: RFC 8693 exchange for one tool call (private_key_jwt)
    P-->>A: Token: sub = member, act.client_id = agent, aud = one tool, minutes-long lifetime
    end
    rect rgb(218,240,240)
    Note over A,Z: 6 Call through the gateway, 7 Decide
    A->>G: Tool call with the bearer token (no DPoP on PingOne)
    G->>Z: Validates aud and scope against the allowlist, then asks for a verdict on member, agent, tool and amount
    Z-->>G: Permit, deny or step-up; redeeming miles is spending, so approval is required
    end
    rect rgb(255,235,222)
    Note over G,U: 8 Approve what is consequential
    G->>U: Pending approval that names the exact redemption (timeout is denial)
    M->>U: Reviews and approves in the {{brand}} app, never in the agent chat
    U-->>G: Single-use approval receipt, spendable only for this transaction
    end
    rect rgb(218,240,240)
    Note over G,L: 9 Permit
    G->>L: Only allowed calls get through; reads ride the delegated token, the redemption carries the approval
    L-->>A: Result returns through the gateway
    end
    rect rgb(225,229,238)
    Note over G,S: 10 Log and revoke
    G->>S: Writes sub, act.client_id, jti, tool and verdict
    P->>S: Authorization server writes the same fields for every exchange
    end
`;

// One slot per message, in order (18). null = no payload under that message.
export const PAYLOADS = [
  'Connector listing (illustrative)\nname: {{brand}} rewards\nmcp_url: https://mcp.{{host}}.example/mcp\nauth: OAuth, found through the 401 and\n  the metadata (hop 2)\nscopes asked: miles:read, miles:redeem\nbranding + privacy policy URL',
  'status: listed\nvisible to: members of the assistant\nprice to the member: free',
  'Add "{{brand}} rewards"\nprice: free\nnothing to install; sign-in and consent\n  happen on first use (hop 4)',
  'connector: {{host}}-rewards\nstate: added, not signed in yet\nfirst use starts discovery (hop 2)',
  'HTTP/1.1 401 Unauthorized\nWWW-Authenticate: Bearer\n  resource_metadata="https://mcp.{{host}}.example/\n  .well-known/oauth-protected-resource"',
  'resource: https://mcp.{{host}}.example/mcp\nauthorization_servers: [PingOne]\nscopes_supported: [miles:read, miles:redeem]',
  'CIMD client document (fetched by URL)\nclient_id: https://agent.example/oauth/client.json\nredirect_uris: [https://agent.example/callback]\ntoken_endpoint_auth_method: private_key_jwt\njwks_uri: https://agent.example/jwks.json',
  null,
  'Consent (recorded through the Agreement step)\nAgent: <named agent> may\n  read miles\n  redeem miles, with approval\nMember: passkey or MFA, then Approve',
  'grant_type: authorization_code\ncode: <AUTHORIZATION_CODE>\ncode_verifier: <PKCE_VERIFIER>\nclient_assertion_type: ...jwt-bearer\nclient_assertion: <JWT signed with the agent\'s key>',
  'grant_type: urn:ietf:params:oauth:grant-type:\n  token-exchange   (RFC 8693)\nsubject_token: <member token>\naudience: <one tool>\nclient_assertion: <private_key_jwt>',
  jwt('Per-call token', { iss: 'https://auth.pingone.example', sub: '<member id>', act: { client_id: 'https://agent.example/oauth/client.json' }, aud: 'https://mcp.{{host}}.example/rewards', scope: 'miles:read', exp: 'iat + a few minutes', jti: '<unique id>' }),
  'POST https://mcp.{{host}}.example/mcp\nAuthorization: Bearer <per-call token>\n(no DPoP on PingOne: a bearer, so the short TTL\n and single aud carry the load)',
  'Authorize input: member, agent, tool, amount\nProtect: agentic-automation score on the session',
  'verdict: PERMIT | DENY | STEP-UP\nredeem_miles is spending: approval required',
  'Approval request (illustrative)\nRedeem miles for a March trip\nOne approval, one action. Timeout = denial',
  null,
  'approval receipt (single use)\nbound to this transaction only\nspendable once, then void',
  'Rewards MCP accepts only its own audience\nreads: the delegated token\nwrites: the token + the approval receipt\nFacade: does the legacy credential exchange,\n  builds the web session in Redis keyed by a hash\n  of the Ping token (never returned to the client)',
  null,
  'audit record\nsub, act.client_id, jti, tool, verdict,\napproval reference',
  'audit record (authorization server)\nsub, act.client_id, jti for every exchange',
];

// Reel details per participant.
export const DETAILS = {
  K: "The AI assistant vendor's catalog (for example ChatGPT's app directory). {{brand}} submits its connector once; the vendor reviews and lists it; members add it from the catalog at no cost. The catalog never holds member credentials: sign-in and consent still happen at {{brand}}'s own identity provider on first use.",
  M: 'A {{program}} member. Authenticates {{brand}} from the agent, but {{brand}} never sees the member credentials and the agent never sees the member session.',
  A: 'Whatever the member brought: ChatGPT in a browser, a mobile assistant, a coding CLI. {{brand}} controls none of it and trusts none of it. It holds no standing credential; it mints a token per call.',
  G: 'The only internet-facing hop. PingGateway MCP module: validates aud and scope, tool allowlist, audit per call. No direct agent-to-resource path exists on the network.',
  P: 'PingOne: sign-in with passkey or MFA, consent through the Agreement step, CIMD or direct-API client registration, and RFC 8693 token exchange. Issues bearer tokens only (no DPoP, no mTLS binding).',
  Z: 'PingOne Authorize evaluates member, agent, tool and amount. PingOne Protect scores the session for agentic automation. Verdicts: permit, deny, step-up.',
  U: "{{brand}}'s own surface, in {{brand}}'s branding. One approval, one action; the approval receipt is single use. The human approves a transaction, never a session.",
  L: 'Accepts only its own audience. Behind it the Facade is the only component holding the legacy credentials; the web session lives in Redis keyed by a hash of the Ping token and is never returned to the client.',
  S: "Gateway and authorization server write sub, act.client_id, jti and the verdict. Disabling the agent's client registration revokes its access within one token lifetime; the member's own session is unaffected.",
};

// Talk track, one per hop: what the presenter says. `first`/`last` are the message indexes the hop covers.
export const HOPS = [
  { n: 1, title: 'Publish once, get it free', first: 0, last: 3, say: '{{brand}} lists its connector in the assistant\'s catalog once. After that a member adds it from the catalog for free: nothing to install, no account to create. Sign-in and consent come on first use.' },
  { n: 2, title: 'Discover', first: 4, last: 5, say: 'The agent knocks with no token and gets a 401 that points at the metadata. The door advertises itself; nobody at {{brand}} is involved.' },
  { n: 3, title: 'Register', first: 6, last: 6, say: 'The agent registers itself with a client document. Now {{brand}} has an identity to name in consent, scope, and switch off.' },
  { n: 4, title: 'Consent', first: 7, last: 9, say: 'The member signs in at PingOne with a passkey. The consent screen names this agent and what it may do. The member session never enters the agent.' },
  { n: 5, title: 'Exchange, per call', first: 10, last: 11, say: 'Every tool call gets its own token: subject is the member, actor is the agent, one audience, minutes to live. The agent holds nothing standing.' },
  { n: 6, title: 'Call + decide', first: 12, last: 14, say: 'The call reaches only the gateway. It checks audience and scope, then asks Authorize for a verdict. Redeeming miles is spending, so the answer is approval required.' },
  { n: 7, title: 'Approve', first: 15, last: 17, say: 'The approval happens in {{brand}}\'s own app, naming the exact redemption. One approval, one action, and a timeout means no.' },
  { n: 8, title: 'Permit', first: 18, last: 19, say: 'Only permitted calls reach the rewards service, which accepts only its own audience. The credentials for the legacy system never leave the Facade.' },
  { n: 9, title: 'Log and revoke', first: 20, last: 21, say: 'Gateway and authorization server write the same record, in storage the agent cannot touch. Turn off the agent client and its access ends within one token lifetime.' },
];
