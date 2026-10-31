import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_CAST, buildFlow, loadCast, storyText, unfilled } from '../src/flow.js';
import { DIAGRAM_NAMES, annotationProblems, loadStory, rawStory } from '../src/story.js';
import { validateDiagram } from '../src/diagramStudio.js';
import { scanHosts, scanKeys } from '../src/safety.js';

test('the story is diagram-studio/1 data loaded by name: 9 participants, 22 messages, 9 hops that cover every message once, in order', () => {
  assert.deepEqual(DIAGRAM_NAMES, ['mcp-door']);
  const { doc, ann } = rawStory('mcp-door');
  assert.deepEqual(validateDiagram(doc), []);
  assert.deepEqual(annotationProblems(doc, ann), []);
  assert.equal(doc.nodes.length, 9);
  assert.equal(doc.edges.length, 22);
  assert.equal(ann.payloads.length, 22);
  assert.equal(doc.steps.length, 9);
  const flat = doc.steps.flatMap((s) => s.edges);
  assert.deepEqual(flat, [...Array(22).keys()]);
});

test('loadStory refuses an unknown or path-like name', () => {
  for (const bad of ['nope', '../mcp-door', 'mcp-door/../x', '', null, 5, 'MCP-DOOR']) assert.equal(loadStory(bad), null, String(bad));
  assert.ok(loadStory('mcp-door'));
});

test('annotationProblems catches a missing payload slot, a missing detail and a hop gap', () => {
  const { doc, ann } = rawStory();
  assert.match(annotationProblems(doc, { ...ann, payloads: ann.payloads.slice(1) }).join(), /payload slot/);
  assert.match(annotationProblems(doc, { ...ann, details: {} }).join(), /no reel details/);
  const gap = { ...doc, steps: [{ ...doc.steps[0], edges: [1, 2] }, ...doc.steps.slice(1)] };
  assert.match(annotationProblems(gap, ann).join(), /hop 1/);
});

test('every {{cast}} token in the story is in the default cast, and no host or key is real', () => {
  assert.deepEqual(unfilled(storyText('mcp-door'), DEFAULT_CAST), []);
  const filled = JSON.stringify(buildFlow(DEFAULT_CAST));
  assert.deepEqual(scanHosts(filled), []);
  assert.deepEqual(scanKeys(filled), []);
  assert.ok(!/\{\{/.test(filled), 'no token left unfilled');
  assert.ok(/\{\{cast[A-Z]/.test(storyText('mcp-door')), 'the story uses {{cast...}} tokens');
});

test('an undefined token is reported, so a typo in the story fails the build', () => {
  assert.deepEqual(unfilled('hello {{castBrand}} {{castTypo}}', DEFAULT_CAST), ['castTypo']);
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
  assert.equal(cast.castBrand, 'Skyline Air');
  assert.equal(cast.castProgram, 'Skyline Club');
  assert.equal(cast.castHost, DEFAULT_CAST.castHost);
  const flow = buildFlow(cast);
  assert.match(flow.title, /Skyline Air's MCP door/);
  assert.ok(flow.diagram.edges[0].label.startsWith('Skyline Air publishes'));
  assert.deepEqual(loadCast(path.join(dir, 'missing.json')), DEFAULT_CAST);
  fs.writeFileSync(file, 'not json');
  assert.deepEqual(loadCast(file), DEFAULT_CAST);
});

test('the story opens with the catalog pattern: publish, list, add free, available', () => {
  const { diagram, hops, payloads } = buildFlow();
  const first = diagram.edges.slice(0, 4).map((e) => `${e.source}>${e.target}${e.dashed ? ' (dashed)' : ''}`);
  assert.deepEqual(first, ['door>catalog', 'catalog>door (dashed)', 'member>catalog', 'catalog>agent (dashed)']);
  assert.equal(hops[0].title, 'Publish once, get it free');
  assert.match(payloads[2], /price: free/);
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
  assert.equal(cast.castBrand.length, 40);
  assert.equal(cast.castProgram, 'Club   X');
});

test('a customer value that names a URL, host, address or email keeps the default', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'door-'));
  const file = path.join(dir, 'customer.config.json');
  for (const brand of ['https://evil.com/x Corp', 'http://10.1.2.3/a', 'ops@evil.com', 'Air ftp://x.invalid/a']) {
    fs.writeFileSync(file, JSON.stringify({ cast: { brand } }));
    assert.equal(loadCast(file).castBrand, DEFAULT_CAST.castBrand, brand);
  }
  fs.writeFileSync(file, JSON.stringify({ cast: { brand: 'Skyline Air' } }));
  assert.equal(loadCast(file).castBrand, 'Skyline Air');
});

test('the host is lower-cased, and an invalid one falls back to the default', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'door-'));
  const file = path.join(dir, 'customer.config.json');
  fs.writeFileSync(file, JSON.stringify({ cast: { host: 'NorthWest' } }));
  assert.equal(loadCast(file).castHost, 'northwest');
  fs.writeFileSync(file, JSON.stringify({ cast: { host: 'North.West' } }));
  assert.equal(loadCast(file).castHost, DEFAULT_CAST.castHost);
});
