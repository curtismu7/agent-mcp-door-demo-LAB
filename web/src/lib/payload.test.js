import { describe, expect, it } from 'vitest';
import { splitPayload } from './payload.js';

const TOKEN = 'Per-call token (JWT, MOCK: teaching values only)\n{\n  "iss": "https://auth.example",\n  "act": {\n    "client_id": "https://agent.example/client.json"\n  },\n  "jti": "<unique id>"\n}';

describe('splitPayload', () => {
  it('splits a caption line from the JSON that follows it, and passes the JSON on exactly as written', () => {
    const p = splitPayload(TOKEN);
    expect(p.caption).toBe('Per-call token (JWT, MOCK: teaching values only)');
    expect(p.json).toBe(TOKEN.slice(TOKEN.indexOf('\n') + 1));
    expect(JSON.parse(p.json).act.client_id).toBe('https://agent.example/client.json');
  });

  it('a payload that is only JSON has an empty caption', () => {
    expect(splitPayload('{"a": [1, 2]}')).toEqual({ caption: '', json: '{"a": [1, 2]}' });
    expect(splitPayload('[{"a": 1}]').json).toBe('[{"a": 1}]');
  });

  it('wire text stays text: key: value lines, an HTTP head, a bracketed list inside a line, a missing payload', () => {
    expect(splitPayload('client_id: https://agent.example/client.json\nredirect_uris: [https://agent.example/callback]')).toBeNull();
    expect(splitPayload('HTTP/1.1 401 Unauthorized\nWWW-Authenticate: Bearer')).toBeNull();
    expect(splitPayload('scopes_supported: [miles:read, miles:redeem]')).toBeNull();
    expect(splitPayload(null)).toBeNull();
    expect(splitPayload(undefined)).toBeNull();
    expect(splitPayload('')).toBeNull();
  });

  it('text that only looks like JSON stays text: not parsable, or a bare value', () => {
    expect(splitPayload('caption\n{ not json }')).toBeNull();
    expect(splitPayload('caption\n{"a": 1} trailing words')).toBeNull();
    expect(splitPayload('{}')).not.toBeNull();
    expect(splitPayload('caption\n[unclosed')).toBeNull();
  });
});
