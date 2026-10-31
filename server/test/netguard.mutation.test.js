// Mutation proof for the netguard: loosen one guard at a time in a COPY of the source and run the self-test in a child
// process. The self-test must flip to failing for every mutation, so a regression in the guard cannot pass unnoticed.
// The mutations are chosen so that nothing real leaves the machine even when a guard is loosened: the other guards
// (socket connect and DNS lookup) are still in place and refuse first, and the destination is a .invalid name. The DNS
// and socket guards are not mutated here, because loosening them would send a real packet.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const src = (f) => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');

function run(mutate, { control = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'netguard-mut-'));
  fs.writeFileSync(path.join(dir, 'safety.js'), src('safety.js'));
  const original = src('netguard.js');
  const mutated = mutate(original);
  if (!control) assert.notEqual(mutated, original, 'the mutation changed the source (it is not a silent no-op)');
  fs.writeFileSync(path.join(dir, 'netguard.js'), mutated);
  fs.writeFileSync(path.join(dir, 'run.mjs'), "import { netguardSelfTest } from './netguard.js';\nconst r = await netguardSelfTest();\nconsole.log(JSON.stringify({ ok: r.ok, blocked: r.blocked }));\nprocess.exit(r.ok ? 0 : 3);\n");
  const p = spawnSync(process.execPath, [path.join(dir, 'run.mjs')], { encoding: 'utf8', timeout: 20_000 });
  return { status: p.status, out: p.stdout };
}

test('control: the unmodified guard passes its own self-test in a child process', () => {
  const r = run((s) => s, { control: true });
  assert.equal(r.status, 0, r.out);
});

const MUTATIONS = {
  'fetch guard removed': (s) => s.replace('if (!isLoopbackHost(url.hostname)) {', 'if (false) {'),
  'fetch attempts not recorded': (s) => s.replace("attempts.push(`fetch:${url.hostname}`);", ''),
  'udp guard removed': (s) => s.replace('const ok = addr === undefined', 'const ok = true || addr === undefined'),
};

for (const [name, mutate] of Object.entries(MUTATIONS)) {
  test(`mutation: ${name} makes the self-test fail`, () => {
    const r = run(mutate);
    assert.notEqual(r.status, 0, `the self-test should fail, got: ${r.out}`);
  });
}
