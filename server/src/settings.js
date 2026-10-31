// The one shared settings file for every standalone app: STANDALONE_ENV, else ~/Development/.env.
// Only the keys this app uses are read (ALLOWED); every other line is ignored, so admin and worker credentials, vault
// passwords and anything else in the shared file are never loaded into this process. A value already in the environment wins.
// Values are never printed or returned: doctor reports key NAMES only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const ALLOWED = ['MODE', 'PORT', 'MCPDOOR_BIND', 'CUSTOMER_CONFIG'];

export const settingsPath = (env = process.env) => env.STANDALONE_ENV || path.join(os.homedir(), 'Development', '.env');

const LINE = /^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/;
function unquote(v) {
  const q = /^(["'])(.*)\1$/.exec(v);
  if (q) return q[2];
  return v.replace(/\s+#.*$/, '');
}

// Returns { file, found, loaded: [key names], skipped: count of other keys }. Sets only ALLOWED keys that are not already set.
export function loadSettings({ env = process.env, file = settingsPath(env) } = {}) {
  const result = { file, found: false, loaded: [], skipped: 0, mode: null };
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return result; }
  result.found = true;
  try { result.mode = (fs.statSync(file).mode & 0o777).toString(8); } catch { /* unknown */ }
  for (const raw of text.split('\n')) {
    const m = LINE.exec(raw);
    if (!m || raw.trim().startsWith('#')) continue;
    if (!ALLOWED.includes(m[1])) { result.skipped += 1; continue; }
    if (env[m[1]] !== undefined && env[m[1]] !== '') continue;
    env[m[1]] = unquote(m[2]);
    result.loaded.push(m[1]);
  }
  return result;
}
