# Agent Meets the MCP Door LAB

Tier: Demo. A member's own AI agent reaches an enterprise MCP door: a movable React Flow sequence diagram with payloads and mock tokens. Mock only (no live mode exists). Ports 6850-6879 (default 6850).

## Run and test

- `npm ci && npm run build && npm start` (http://127.0.0.1:6850) or `./scripts/run.sh`. Docker: `docker compose up --build -d` (127.0.0.1 only).
- `npm test` = server (`node --test test/*.test.js`, a glob, never a directory) + web (vitest) + repo checks (`node --test scripts/*.test.mjs`). Node 26 only (`engines`, Dockerfile, CI).
- `npm run doctor` (one line per check, exit 1 on failure), `npm run reset [workspace]`, `npm run content-pack` (rebuilds the pack and `docs/talk-track.md`, then validates; tests fail on drift).
- Check against the family standards from the parent repo: `check-drift.sh`, `check-css.sh`, and `node ~/Development/demo-kit-base/scripts/conformance.mjs . --new --tier=Demo`.

## How it is built

- The story is `diagram-studio/1` data: `server/diagrams/mcp-door.json` (participants, 22 messages, 9 hops) and `mcp-door.annotations.json` (payload per message, reel details per participant). `server/src/story.js` loads and validates it (validator copied from the studio: `diagramStudio.js`). `{{castBrand}}`, `{{castProgram}}`, `{{castHost}}` are filled from `customer.config.json` by `flow.js`; a test fails on an undefined token, a non-`.example` host or a forbidden name.
- Web: `lib/layout.js` (pure: diagram to React Flow nodes and edges, drag offsets), `components/SequenceDiagram.jsx`, `Reel`, `StepBar`, `ModeToggle`, `ActorHeader`; `lib/api.js` sends `X-Workspace`. Participant boxes are draggable in x only; Reset restores them (REFIT event).
- Workspaces (rule 13): `X-Workspace` header, default `default`, capped table; reset clears the current workspace's mock trace only. Mock W3C `traceparent` per message (rule 14), labelled mock.
- Mode: `server/src/config.js`. Only `mock`; `MODE=live` is refused (no silent fallback); the toggle shows Live disabled with the reason.
- Settings: `server/src/settings.js` reads `STANDALONE_ENV` or `~/Development/.env`, only the keys in `ALLOWED`; admin or worker credentials are never read.

## Rules that bite

- Loopback bind only (0.0.0.0 inside Docker only, published on 127.0.0.1); Host check; same-origin writes; zero outbound network (netguard with self-test and a mutation test); no customer, tenant, product-owner or personal names or ids; only `.example` / `.invalid` hosts.
- Styling: the vendored `web/src/standalone-ui.css` is byte-identical to the parent's `shared/standalone-ui.css` (never edit it; re-vendor). App CSS: tokens only, no colour literals, no `!important`, no italics, no `prefers-color-scheme`, no id selectors, kebab-case BEM, breakpoints 600 and 900. A repo test checks it.
- Diagram text is rendered as text, never HTML. A row's height comes from explicit line breaks, so `wrapText` breaks long messages; payloads are monospace.
- Do not use `crypto.generateKeyPair(Sync)` for EC. Show tokens raw (education) but never a real credential.
- Never print the forbidden-strings list; scan with counts only. No AI attribution anywhere (owner, 2026-11-07): no Co-Authored-By trailer and no "Generated with" line in commits, PR bodies or files; CI runs `scripts/check-no-ai-attribution.sh`.
