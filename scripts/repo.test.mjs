import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('the files the standalone rules ask for are present', () => {
  for (const f of ['README.md', 'CLAUDE.md', 'LICENSE', 'Dockerfile', 'docker-compose.yml', '.github/workflows/ci.yml', 'docs/talk-track.md', 'docs/safety.md', 'docs/shelf-entry.json', 'content-pack.json', 'customer.config.example.json', 'scripts/doctor.mjs', 'scripts/reset.mjs', 'web/src/standalone-ui.css']) {
    assert.ok(fs.existsSync(path.join(root, f)), f);
  }
});

test('the shelf entry is valid and portable: relative composeFile, loopback url, health path', () => {
  const e = JSON.parse(read('docs/shelf-entry.json')).demos[0];
  assert.equal(e.id, 'agent-mcp-door-demo');
  assert.equal(e.kind, 'Demo');
  assert.equal(e.healthPath, '/api/health');
  assert.match(e.url, /^http:\/\/(localhost|127\.0\.0\.1):68[5-7]\d$/);
  assert.ok(!path.isAbsolute(e.composeFile), 'composeFile must be relative or a placeholder');
  assert.ok(!/\/Users\//.test(JSON.stringify(e)), 'no absolute home path');
});

test('customer.config.json is git-ignored, and its example only sets the three cast values', () => {
  assert.match(read('.gitignore'), /^customer\.config\.json$/m);
  assert.deepEqual(Object.keys(JSON.parse(read('customer.config.example.json')).cast).sort(), ['brand', 'host', 'program']);
});

test('no shipped text names a real customer, company or tenant', () => {
  const skip = new Set(['node_modules', 'dist', '.git', 'package-lock.json']);
  const hits = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      if (skip.has(name)) continue;
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (!['repo.test.mjs', 'flow.test.js', 'content-pack.test.mjs'].some((n) => p.endsWith(n))) {
        const t = fs.readFileSync(p, 'utf8').toLowerCase();
        for (const w of ['united airlines', 'mileageplus', 'datapower', 'optum', 'unitedhealth', 'uhg']) if (t.includes(w)) hits.push(`${path.relative(root, p)}: ${w}`);
      }
    }
  };
  walk(root);
  assert.deepEqual(hits, []);
});

test('this is a Docker-only, mock-only, hosted-runner repo: no k8s, deploy or hosted-build material, no self-hosted runner, Node 22', () => {
  for (const d of ['k8s', 'deploy']) assert.ok(!fs.existsSync(path.join(root, d)), `${d}/ must not exist`);
  const ci = read('.github/workflows/ci.yml');
  assert.doesNotMatch(ci, /self-hosted/);
  assert.match(ci, /ubuntu-latest/);
  assert.match(ci, /gitleaks/);
  assert.match(ci, /FORBIDDEN_STRINGS/);
  assert.match(ci, /node-version: 22/);
  assert.doesNotMatch(ci, /node-version: (18|20|26)/);
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.engines.node, />=\s*22/);
  assert.match(pkg.name, /-lab$/);
});

test('the README follows the standard: LAB title, Tier, Repo, run from a clone, port-taken section, health, doctor, reset', () => {
  const r = read('README.md');
  assert.match(r.split('\n')[0], /^# .* LAB$/);
  assert.match(r, /^Tier: Demo$/m);
  assert.match(r, /^Repo: https:\/\/github\.com\/ping-sandbox\/agent-mcp-door-demo-LAB$/m);
  for (const h of ['Run from a clone', 'Settings file', 'what to do if the port is taken', 'Mock and live modes', 'Health, doctor and reset', 'Docker', 'Tests', 'Troubleshooting', 'Ownership']) assert.match(r, new RegExp(`^## .*${h}`, 'im'), h);
  assert.match(r, /demo-health\/1/);
  assert.match(r, /npm run doctor/);
  assert.match(r, /npm run reset/);
});

// The CSS standard, checked here so CI catches it without the parent repo: tokens only, no !important, no italics,
// no prefers-color-scheme, no id selectors, no camelCase classes, breakpoints 600 and 900 only (app stylesheets, not the shared one).
test('app CSS follows the CSS standard', () => {
  const dir = path.join(root, 'web/src');
  const files = [];
  const walk = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else if (n.endsWith('.css') && n !== 'standalone-ui.css') files.push(p); } };
  walk(dir);
  assert.ok(files.length >= 3);
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    const name = path.relative(root, f);
    assert.doesNotMatch(t, /#[0-9a-fA-F]{3,8}\b(?![-\w])/, `${name}: colour literal`);
    assert.doesNotMatch(t, /rgba?\(|hsla?\(/, `${name}: colour function`);
    assert.doesNotMatch(t, /!important/, `${name}: !important`);
    assert.doesNotMatch(t, /font-style:\s*italic/, `${name}: italic`);
    assert.doesNotMatch(t, /prefers-color-scheme/, `${name}: prefers-color-scheme`);
    assert.doesNotMatch(t, /(^|[\s,>+~])#[A-Za-z][\w-]*\s*[,{]/m, `${name}: id selector`);
    assert.doesNotMatch(t, /\.[a-z]+[A-Z][A-Za-z0-9]*[\s,{:.>]/, `${name}: camelCase class`);
    for (const m of t.matchAll(/@media[^{]*\((?:max|min)-width:\s*(\d+)px/g)) assert.ok(['600', '900'].includes(m[1]), `${name}: breakpoint ${m[1]}`);
  }
});

test('the web page loads nothing from outside: no http(s) URL in the app source or index.html', () => {
  const hits = [];
  const walk = (d) => {
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(jsx?|css|html)$/.test(n) && !/\.test\./.test(n) && n !== 'standalone-ui.css' && /https?:\/\//.test(fs.readFileSync(p, 'utf8'))) hits.push(path.relative(root, p));
    }
  };
  walk(path.join(root, 'web/src'));
  if (/https?:\/\//.test(read('web/index.html'))) hits.push('web/index.html');
  assert.deepEqual(hits, []);
});
