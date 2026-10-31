# Changelog

## 0.2.0 (LAB conversion)

- Imported without history as agent-mcp-door-demo-LAB; hosted-build material removed (Docker only), hosts and notes scrubbed.
- Story is now `diagram-studio/1` data loaded by name, with `{{castBrand}}`, `{{castProgram}}` and `{{castHost}}` tokens.
- Participant boxes are movable; Simulate, Speed, Reset (restores boxes) and the movie reel.
- Mock / Live toggle on every view (Live disabled: no live backend), `MODE` setting, shared settings loader (own keys only), workspace id, mock W3C `traceparent` per hop.
- Vendored shared stylesheet and the CSS standard; fonts bundled.
- Netguard mutation test, doctor and reset by workspace, talk track and content pack generated from the story, hosted-runner CI on Node 26.

## 0.1.0

- Catalog pattern opening (9 participants, 22 messages, 9 hops), payloads and mock tokens, talk track, presenter mode, Reset, doctor, health (demo-health/1), content pack.
- Mock only: no tenant, no outbound network (netguard with a self-test), loopback bind, same-origin writes.
