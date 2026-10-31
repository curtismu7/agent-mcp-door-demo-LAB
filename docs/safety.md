# Safety

- Loopback bind only (`MCPDOOR_BIND` is the explicit opt-in the container uses); the compose file publishes `127.0.0.1` only (a test pins it).
- Host header must be a loopback name; writes must be same-origin.
- Netguard blocks every outbound connection (fetch, socket, DNS, UDP) with a self-test, a test that asserts zero attempts, and a mutation test that loosens each guard in a copy and expects the self-test to fail.
- Story text is data; hosts end in `.example`; no key-looking values; tokens are labelled "MOCK: teaching values only". The web renders story text as text, never as markup.
- No tenant, credential or customer identifier ships. `customer.config.json` only sets three display strings and is git-ignored.
- Settings: only this app's own keys are read from the shared settings file; admin and worker credentials are never loaded. Doctor prints key names, never values.
- Workspace ids are 1-32 lowercase letters, digits or dashes; anything else is refused with a 400. The workspace table is capped at 64.
