// Builds the story with the cast filled in. customer.config.json (optional, git-ignored) overrides the cast.
// Tokens are {{castBrand}}, {{castProgram}}, {{castHost}}. A test fails on any token the cast does not define.
import fs from 'node:fs';
import { scanHosts } from './safety.js';
import { rawStory } from './story.js';
import { traceFor } from './trace.js';

export const DEFAULT_CAST = { castBrand: 'Northwind Air', castProgram: 'Northwind Miles', castHost: 'northwind' };
const TOKEN = /\{\{(\w+)\}\}/g;
const MAX_CAST = 40;

export const unfilled = (text, cast) => [...String(text).matchAll(TOKEN)].map((m) => m[1]).filter((k) => !Object.hasOwn(cast, k));
export const fill = (text, cast) => String(text).replace(TOKEN, (m, k) => (Object.hasOwn(cast, k) ? cast[k] : m));
export function fillDeep(value, cast) {
  if (typeof value === 'string') return fill(value, cast);
  if (Array.isArray(value)) return value.map((v) => fillDeep(v, cast));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillDeep(v, cast)]));
  return value;
}

// customer.config.json keeps its short keys: { "cast": { "brand", "program", "host" } }. Anything else in the file is ignored.
const KEYS = { brand: 'castBrand', program: 'castProgram', host: 'castHost' };

export function loadCast(file) {
  const cast = { ...DEFAULT_CAST };
  if (!file) return cast;
  try {
    const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const [short, key] of Object.entries(KEYS)) {
      const v = cfg?.cast?.[short];
      if (typeof v !== 'string' || !v.trim()) continue;
      const clean = v.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').trim().slice(0, MAX_CAST);
      // A display name is not a URL: anything that names a host or an address keeps the default.
      if (/:\/\/|@/.test(clean) || scanHosts(clean).length) continue;
      cast[key] = short === 'host' ? clean.toLowerCase() : clean;
    }
    if (!/^[a-z0-9-]{1,30}$/.test(cast.castHost)) cast.castHost = DEFAULT_CAST.castHost;
  } catch { /* no file or not JSON: the defaults */ }
  return cast;
}

// The hops as the talk track shows them: n, title, first and last message, what to say.
export const hopsOf = (doc) => doc.steps.map((s, i) => ({ n: i + 1, title: s.title, first: s.edges[0], last: s.edges[s.edges.length - 1], say: s.what }));

// Every text field of the story, unfilled, for the token and hygiene checks.
export function storyText(name) {
  const { doc, ann } = rawStory(name);
  return JSON.stringify({ doc, ann });
}

export function buildFlow(cast = DEFAULT_CAST, { workspace, name } = {}) {
  const { doc, ann } = rawStory(name);
  const diagram = fillDeep(doc, cast);
  return {
    title: diagram.title,
    intro: diagram.lede,
    cast,
    diagram,
    payloads: fillDeep(ann.payloads, cast),
    details: fillDeep(ann.details, cast),
    hops: hopsOf(diagram),
    // Mock W3C trace context, one traceparent per message (rule 14). Only present for a workspace.
    ...(workspace ? { workspace: workspace.id, trace: traceFor(workspace.traceId, doc.edges.length) } : {}),
  };
}
