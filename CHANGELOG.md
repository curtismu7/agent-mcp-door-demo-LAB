# Changelog

## 0.1.0

- Opens with the catalog pattern shared by every personal-agent flow: the company publishes its connector to the AI assistant's catalog once, members add it free (9 participants, 22 messages, 9 hops).
- `MODE=mock` is the only mode (anything else is refused); `GET /api/info` says what this build is.
- Learning Hub content pack built from the story data; `#hop-N` links open a hop.
- Ports 6850-6879 (6720 was inside another demo's reserved range).

- First slice: a React Flow sequence diagram of a member's own AI agent meeting an enterprise MCP door (first slice: 8 participants, 18 messages, 8 hops), with a monospace payload or mock token under each message, Simulate, step time, the movie reel, a talk track, presenter mode and Reset.
- Mock only: no tenant, no outbound network (netguard with a self-test), loopback bind, same-origin writes, `GET /api/health` (demo-health/1), `npm run doctor`, `npm run reset`.
- Brand-neutral by default; `customer.config.json` sets the brand, program and host.
