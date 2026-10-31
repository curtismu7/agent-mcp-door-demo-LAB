import test from 'node:test';
import assert from 'node:assert/strict';
import { modeFrom } from '../src/config.js';

test('MODE defaults to mock and anything else is refused, never a silent fallback', () => {
  assert.equal(modeFrom({}), 'mock');
  assert.equal(modeFrom({ MODE: 'mock' }), 'mock');
  for (const MODE of ['live', 'prod', 'Mock', 'x']) assert.throws(() => modeFrom({ MODE }), /not available/, MODE);
});
