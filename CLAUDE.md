# Agent Meets the MCP Door LAB

Demo-tier standalone app: a React Flow sequence diagram of an agent reaching an enterprise MCP door, with payloads and mock tokens. Mock only.

- Run: `./scripts/run.sh` (http://localhost:6850). Test: `npm test` (server is `node --test test/*.test.js`, a glob). Preflight: `npm run doctor`.
- Story data is `server/src/flowData.js` with `{{brand}}`, `{{program}}`, `{{host}}` tokens; `flow.js` fills them from `customer.config.json`. A test fails on an unfilled token, a non-`.example` host or a name from the forbidden list.
- Diagram files live in `web/src/components`, `hooks` and `utils` (SequenceFlowDiagram and friends).
- Rules that bite: loopback bind only; same-origin writes; zero outbound network (netguard); no customer, tenant or product-owner names or ids; ports 6850-6879; show tokens raw (education) but never a real credential.
- A row's height in the diagram comes from explicit line breaks, so `wrapMessages` breaks long messages; payload strings are monospace and sized by their longest line.
