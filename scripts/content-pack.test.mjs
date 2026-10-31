import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPack } from './build-content-pack.mjs';
import { validatePack } from './validate-content-pack.mjs';
import { buildTalkTrack } from './build-talk-track.mjs';

const root = new URL('..', import.meta.url);
const committed = JSON.parse(fs.readFileSync(new URL('content-pack.json', root), 'utf8'));

test('the pack validates against the schema and its cross-references hold', () => {
  assert.deepEqual(validatePack(buildPack()), []);
});

test('the committed content-pack.json is exactly what the builder makes (no drift)', () => {
  assert.deepEqual(committed, buildPack());
});

test('every hop of the walkthrough has a story and a try-it card that opens it', () => {
  const pack = buildPack();
  assert.equal(pack.stories.length, 9);
  for (const s of pack.stories) {
    const card = pack.cards.find((c) => c.story === s.id);
    assert.ok(card, s.id);
    assert.equal(card.action.href, `/#hop-${Number(s.id.slice(1))}`);
  }
});

test('a broken pack is caught: unknown term and unknown story', () => {
  const pack = buildPack();
  pack.cards[0].terms = ['nope'];
  pack.cards[1].story = 'ghost';
  const errors = validatePack(pack).join('\n');
  assert.match(errors, /unknown term nope/);
  assert.match(errors, /unknown story ghost/);
});

test('the pack names no real company or tenant and shows no real credential', () => {
  const t = JSON.stringify(buildPack()).toLowerCase();
  for (const w of ['united', 'mileageplus', 'datapower', 'optum', 'uhg']) assert.ok(!t.includes(w), w);
  assert.ok(!/https?:\/\/(?!(www\.rfc-editor\.org|localhost))/.test(t), 'only rfc-editor links and localhost');
});

test('docs/talk-track.md is exactly what the builder makes from the story (no drift)', () => {
  assert.equal(fs.readFileSync(new URL('docs/talk-track.md', root), 'utf8'), buildTalkTrack());
});

// The Learning Hub's own validator, when a checkout is available (LEARNING_HUB_DIR). Skipped in CI, where it is not.
const hub = process.env.LEARNING_HUB_DIR;
test('the pack also passes the Learning Hub validator', { skip: !hub || !fs.existsSync(`${hub}/server/src/validate.js`) }, async () => {
  const { validatePack: hubValidate } = await import(`${hub}/server/src/validate.js`);
  const r = hubValidate(committed);
  assert.deepEqual(r.problems ?? [], []);
  assert.equal(r.ok, true);
});
