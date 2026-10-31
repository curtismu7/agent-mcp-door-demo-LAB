# Agent Meets the MCP Door LAB

Tier: Demo
Repo: https://github.com/ping-sandbox/agent-mcp-door-demo-LAB

A member's own AI agent reaches an enterprise's MCP door. Like every personal-agent flow in this family it starts with the catalog pattern: the company publishes its connector to the AI assistant's catalog once (for example ChatGPT's app directory) and members add it for free, with nothing to install. The walkthrough is a React Flow sequence diagram: discover, register, consent, per-call token exchange, gateway, policy decision, human approval, audit. Under each message sits the wire form or the (mock) token, so you can read `sub`, `act.client_id`, a single `aud` and a minutes-long lifetime. A talk track says what to tell the room at each hop.

Mock only. Every host ends in `.example`, every token is a labelled teaching value, and the app makes no outbound network request (a netguard blocks them and tests prove it). It needs no tenant and no credentials.

## Run

```
./scripts/run.sh          # installs, builds, runs the doctor, starts; then open http://localhost:6850/
```

or, step by step: `npm ci && npm run build && npm run doctor && npm start`. With Docker (OrbStack): `HOST_PORT=6850 docker compose up --build -d` (published on `127.0.0.1` only).

| Command | What it does |
| --- | --- |
| `npm test` | server (node:test), web (vitest) and repo checks |
| `npm run doctor` | preflight: node, bind, port, story shape, hosts, keys, netguard, port free |
| `npm run content-pack` | rebuilds and validates `content-pack.json` |
| `npm run reset` | confirms a reset on a running server (the walkthrough itself lives in the browser) |

Port range 6850-6879 (default 6850). `GET /api/health` answers `demo-health/1`.

## Using it

- **Talk track:** pick a hop to jump to it; the panel shows what to say. **Simulate** (step bar) walks the 22 arrows; **Step time** sets the speed; the **movie reel** jumps to any message and scrolls the diagram to it.
- **Presenter:** the Presenter button (or `P`) hides the intro and enlarges the talk track. `→` next, `←` back, `Esc` leaves. The simulation banner stays.
- **Reset demo:** stops the walkthrough and refits the diagram. The step bar's own Reset does the same without the API call.
- **Branding:** copy `customer.config.example.json` to `customer.config.json` and edit the three cast values. It is git-ignored and read on every request.

## Notes

- Learning Hub: `content-pack.json` (`demo-content-pack/1`, built by `npm run content-pack` from the same story data, so it cannot drift). Cards open a hop with `/#hop-3`. 
- Hardening: errors are short JSON (no stack or path), only `.example` and `.invalid` hosts are reserved, a customer value that names a URL, host or address keeps the default, and each of those guards has a test that fails when the guard is removed.
