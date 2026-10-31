import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_CAST, buildFlow, loadCast, messageCount, rawStory, unfilled } from '../src/flow.js';
import { scanHosts, scanKeys } from '../src/safety.js';

test('the story has one payload slot per message and the 9 hops cover every message once, in order', () => {
  const r = rawStory();
  const n = messageCount(r.source);
  assert.equal(n, 22);
  assert.equal(r.payloads.length, n);
  let next = 0;
  for (const h of r.hops) { assert.equal(h.first, next); assert.ok(h.last >= h.first); next = h.last + 1; }
  assert.equal(next, n);
});

test('every {{token}} in the story is in the default cast, and no host or key is real', () => {
  const r = rawStory();
  const all = [r.source, ...r.payloads.filter(Boolean), ...Object.values(r.details), ...r.hops.map((h) => h.say)].join('\n');
  assert.deepEqual(unfilled(all, DEFAULT_CAST), []);
  const filled = JSON.stringify(buildFlow(DEFAULT_CAST));
  assert.deepEqual(scanHosts(filled), []);
  assert.deepEqual(scanKeys(filled), []);
  assert.ok(!/\{\{/.test(filled), 'no token left unfilled');
});

test('the default story names no real company or customer', () => {
  const filled = JSON.stringify(buildFlow(DEFAULT_CAST)).toLowerCase();
  for (const word of ['united', 'mileageplus', 'datapower', 'optum', 'uhg', 'unitedhealth']) assert.ok(!filled.includes(word), word);
});

test('customer.config.json changes the cast; bad values fall back, extra keys are ignored', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'door-'));
  const file = path.join(dir, 'customer.config.json');
  fs.writeFileSync(file, JSON.stringify({ cast: { brand: 'Skyline Air', program: 'Skyline Club', host: 'Bad Host!' }, secret: 'x' }));
  const cast = loadCast(file);
  assert.equal(cast.brand, 'Skyline Air');
  assert.equal(cast.program, 'Skyline Club');
  assert.equal(cast.host, DEFAULT_CAST.host);
  assert.ok(buildFlow(cast).source.includes('Skyline Air MCP door'));
  assert.deepEqual(loadCast(path.join(dir, 'missing.json')), DEFAULT_CAST);
  fs.writeFileSync(file, 'not json');
  assert.deepEqual(loadCast(file), DEFAULT_CAST);
});

test('the story opens with the catalog pattern: publish, list, add free, available', () => {
  const lines = buildFlow().source.split('\n').filter((l) => /^\s*\w+--?>>\w+:/.test(l)).slice(0, 4).map((l) => l.trim().split(':')[0]);
  assert.deepEqual(lines, ['G->>K', 'K-->>G', 'M->>K', 'K-->>A']);
  const hop1 = buildFlow().hops[0];
  assert.equal(hop1.title, 'Publish once, get it free');
  assert.match(buildFlow().payloads[2], /price: free/);
});

test('payloads show the per-call token with sub, act.client_id and one audience', () => {
  const tok = buildFlow().payloads.find((p) => p && p.startsWith('Per-call token'));
  assert.match(tok, /"sub"/); assert.match(tok, /"act"/); assert.match(tok, /client_id/); assert.match(tok, /"aud"/); assert.match(tok, /MOCK/);
});

test('customer values are length-capped and stripped of control characters', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'door-'));
  const file = path.join(dir, 'customer.config.json');
  fs.writeFileSync(file, JSON.stringify({ cast: { brand: 'A'.repeat(10_000), program: 'Club\u0000\u0007\u001bX' } }));
  const cast = loadCast(file);
  assert.equal(cast.brand.length, 40);
  assert.equal(cast.program, 'Club   X');
});

test('a customer value that names a URL, host, address or email keeps the default', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'door-'));
  const file = path.join(dir, 'customer.config.json');
  for (const brand of ['https://evil.com/x Corp', 'http://10.1.2.3/a', 'ops@evil.com', 'Air ftp://x.invalid/a']) {
    fs.writeFileSync(file, JSON.stringify({ cast: { brand } }));
    assert.equal(loadCast(file).brand, DEFAULT_CAST.brand, brand);
  }
  fs.writeFileSync(file, JSON.stringify({ cast: { brand: 'Skyline Air' } }));
  assert.equal(loadCast(file).brand, 'Skyline Air');
});

test('the host is lower-cased, and an invalid one falls back to the default', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'door-'));
  const file = path.join(dir, 'customer.config.json');
  fs.writeFileSync(file, JSON.stringify({ cast: { host: 'NorthWest' } }));
  assert.equal(loadCast(file).host, 'northwest');
  fs.writeFileSync(file, JSON.stringify({ cast: { host: 'North.West' } }));
  assert.equal(loadCast(file).host, DEFAULT_CAST.host);
});
