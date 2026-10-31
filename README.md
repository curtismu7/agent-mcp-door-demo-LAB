# Agent Meets the MCP Door LAB

A member's own AI agent reaches an enterprise's MCP door, hop by hop, as a movable React Flow sequence diagram with the wire form or a mock token under every message.

Tier: Demo
Repo: https://github.com/ping-sandbox/agent-mcp-door-demo-LAB
Catalog: not assigned yet. No existing row matches (D21 is Personal agent (Dot), D25 the connector login demo, D2 the MCP auth lab). The Learning Hub pack carries the proposed new row D56 until the owner assigns one.

The walkthrough: the company publishes its connector to the AI assistant's catalog once, members add it for free, then discover, register, consent, per-call token exchange, gateway, policy decision, human approval, audit. Under each message sits the wire form or the mock token, so you can read `sub`, `act.client_id`, a single `aud` and a minutes-long lifetime. A talk track says what to tell the room at each hop.

## What is simulated

**Mock mode (the default, and the only mode).** Everything runs in this process with no setup: the story, every host (all end in `.example` or `.invalid`), every token (labelled "MOCK: teaching values only"), the approval, and the W3C `traceparent` shown for each hop. A netguard refuses every non-loopback socket, DNS lookup, fetch and UDP send, and a test proves zero attempts. No tenant, no credentials, no outbound network.

**Live mode.** This app has none, so the Live button in the header is shown but disabled, with the reason beside it. `MODE=live` is refused, never silently turned into mock. The banner says what is simulated on every view, presenter mode included.

## Run from a clone

Prerequisites: Node 26 or newer. Docker only for the Docker form.

```sh
git clone https://github.com/ping-sandbox/agent-mcp-door-demo-LAB.git
cd agent-mcp-door-demo-LAB
npm ci
npm run build
npm start
```

Open http://127.0.0.1:6850/ . In mock mode everything works with no setup: no settings file, no tenant, no credentials. `./scripts/run.sh` does the install, build, doctor and start in one go.

Using it:

- **Talk track:** pick a hop to jump to it; the panel shows what to say. **Simulate** walks the 22 arrows; **Speed** sets the time per step; the **movie reel** jumps to any message and shows its wire form, the participants' details and the mock `traceparent`.
- **Movable boxes:** drag a participant box along the top; its lifeline and every arrow move with it. **Reset** (step bar) or **Reset demo** (header) puts the boxes back and refits the view.
- **Presenter:** the Presenter button (or `P`) hides the intro and enlarges the talk track. `→` next, `←` back, `Esc` leaves. The banner and the Mock / Live toggle stay.
- **Workspace:** the Workspace field (default `default`) scopes the mock trace. Two workspaces never share a trace id; **Reset demo** clears the current workspace only.
- **Branding:** copy `customer.config.example.json` to `customer.config.json` and edit the three cast values (`brand`, `program`, `host`). It is git-ignored and read on every request. The story text uses `{{castBrand}}`, `{{castProgram}}` and `{{castHost}}` tokens, and a test fails on any undefined token.
- **Diagram data:** the story is `diagram-studio/1` JSON in `server/diagrams/` (`mcp-door.json`, plus `mcp-door.annotations.json` for the payloads and reel details), loaded by name. Nothing builds nodes or edges by hand.

## Settings file

All standalone apps read one settings file, `~/Development/.env`, which should be mode 600. Set `STANDALONE_ENV` to read a different file. This app reads only the keys below; every other line in the file (and so every admin or worker credential that might be there) is ignored. All keys are optional.

- `MODE`: `mock` (the only mode; anything else is refused).
- `PORT`: the listen port, 6850-6879 (default 6850).
- `MCPDOOR_BIND`: the bind address (default `127.0.0.1`; the Docker image sets `0.0.0.0` inside the container only).
- `CUSTOMER_CONFIG`: path to a `customer.config.json` (default: the one in the repo root).

A value already in the environment wins over the file. `npm run doctor` reports the key names it used, never the values.

## Ports, and what to do if the port is taken

Ports: agent-mcp-door-demo-LAB listens on 6850 (set with `PORT`, default 6850).
Port range for this app: 6850-6879.

The Vite dev server (`npm run dev`) uses `VITE_PORT` (default 6851) and proxies `/api` to `PORT`. The Docker host port is `HOST_PORT` (default 6850).

If the port is taken:
1. Find what is using it:
   `lsof -iTCP:6850 -sTCP:LISTEN -n -P`
2. If it is an old copy of this app, stop that process: `kill <PID>`.
3. If it is something else, stop it, or start this app on another port:
   `PORT=6851 npm start`
4. Do not use 8080, 5173, 3000, 4000, 4400, 4510, 4600-4601, 18080, 19080 or 19090.

## Mock and live modes

The header of the page has a **Mock / Live** toggle, and the banner shows the same mode. Mock is pressed. Live is disabled because this walkthrough has no live backend; hover it, or read the hint beside it, for the reason. `GET /api/mode` returns `{ mode, available, live }`, and there is no route that switches mode.

## Health, doctor and reset

```sh
npm run doctor        # checks node, mode, bind, port, story data, tokens, hosts, trace, netguard, and whether the app answers
npm run reset         # clears the default workspace's mock trace on the running app: npm run reset -- <workspace>
```

`GET /api/health` answers `demo-health/1` (public, GET only, no detail): `{ schema, at, state, runtime: "offline", demo: { id, name, version } }`. `POST /api/reset` (same origin, header `X-Workspace`) clears one workspace. Saved settings are never touched.

## Docker (optional)

```sh
docker compose up --build -d
```

Publishes `127.0.0.1:6850` only (a test pins it); the container is read-only, runs as a non-root user and drops all capabilities. Pick another host port with `HOST_PORT=6851 docker compose up --build -d`. The shared settings file is not mounted: mock mode needs none.

## Tests

```sh
npm test
```

`npm test` runs the server tests (`node --test test/*.test.js`), the web tests (vitest) and the repo checks (`node --test scripts/*.test.mjs`). On Node 26: 62 server + 21 web + 21 repo checks (20 run, 1 skipped unless `LEARNING_HUB_DIR` is set), all passing. Set `LEARNING_HUB_DIR` to a Learning Hub checkout to also run the pack through the hub's own validator.

## Troubleshooting

- **Port is taken:** see "Ports, and what to do if the port is taken" above.
- **"MODE=live is not available":** this app has a mock mode only. Remove `MODE` from the environment and from the shared settings file.
- **The page says "Could not load the walkthrough":** run `npm run doctor`; it names the failing check. If the web build is missing, run `npm run build`.
- **Reset says the server did not answer:** the page's own view was reset but the app is not running; start it with `npm start`.
- **A name did not change:** `customer.config.json` takes `brand`, `program` and `host` only, and a value that looks like a URL, host or address keeps the default.

## Ownership

- Owner: the Ping demo family owner (see the parent repo).
- License: MIT (see `LICENSE`). This is an independent community demo; it is not created, endorsed or supported by Ping Identity.
- Found a problem? Open an issue on the repo.
