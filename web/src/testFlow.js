// A small flow in the shape GET /api/flow returns, for the web tests.
export const FLOW = {
  title: "A member's agent meets Test Air's MCP door",
  intro: 'intro text',
  mode: 'mock',
  source: 'mock',
  realAvailable: false,
  realReason: 'mock only',
  available: ['mock'],
  live: { available: false, reason: 'mock only' },
  workspace: 'default',
  diagram: {
    schema: 'diagram-studio/1', id: 'test', title: 't',
    groups: { a: { label: 'A', color: 'dark' } },
    nodes: [
      { id: 'agent', label: 'Agent', group: 'a', sub: ['x'], x: 320, y: 0 },
      { id: 'member', label: 'Member', group: 'a', sub: ['y'], x: 0, y: 0 },
      { id: 'door', label: 'Door', group: 'a', sub: ['z'], x: 160, y: 0 },
    ],
    edges: [
      { source: 'member', target: 'door', label: 'first message' },
      { source: 'door', target: 'member', label: 'second message', dashed: true },
      { source: 'agent', target: 'door', label: 'third message with a rather long label that has to wrap onto more lines' },
    ],
    steps: [
      { title: 'Discover', what: 'say one', edges: [0, 1] },
      { title: 'Call', what: 'say two', edges: [2] },
    ],
  },
  payloads: ['a: 1', null, 'b: 2'],
  details: { agent: 'agent detail', member: 'member detail', door: 'door detail' },
  hops: [{ n: 1, title: 'Discover', first: 0, last: 1, say: 'say one' }, { n: 2, title: 'Call', first: 2, last: 2, say: 'say two' }],
  trace: [
    { traceparent: `00-${'a'.repeat(32)}-${'1'.repeat(16)}-01`, parent: null },
    { traceparent: `00-${'a'.repeat(32)}-${'2'.repeat(16)}-01`, parent: '1'.repeat(16) },
    { traceparent: `00-${'a'.repeat(32)}-${'3'.repeat(16)}-01`, parent: '2'.repeat(16) },
  ],
};
