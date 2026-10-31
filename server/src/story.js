// The story is DATA: a diagram-studio/1 document (server/diagrams/mcp-door.json: participants, messages, hops) and its
// annotations (the wire form or mock token under each message, and the movie-reel details per participant).
// Diagrams are loaded by name and checked with the studio's own validator copy. Nothing here builds nodes or edges by hand.
import fs from 'node:fs';
import { validateDiagram } from './diagramStudio.js';

const DIR = new URL('../diagrams/', import.meta.url);
const NAME = /^[a-z0-9][a-z0-9-]{0,47}$/;
export const DIAGRAM_NAMES = ['mcp-door'];
export const DEFAULT_DIAGRAM = 'mcp-door';

const read = (file) => JSON.parse(fs.readFileSync(new URL(file, DIR), 'utf8'));

// Problems with the annotations, given the diagram they belong to. Empty = fine.
export function annotationProblems(doc, ann) {
  const p = [];
  if (ann?.schema !== 'mcp-door-annotations/1') p.push('annotations schema must be mcp-door-annotations/1');
  if (ann?.diagram !== doc.id) p.push('annotations name a different diagram');
  if (!Array.isArray(ann?.payloads) || ann.payloads.length !== doc.edges.length) p.push(`need one payload slot per message (${doc.edges.length})`);
  else if (!ann.payloads.every((x) => x === null || typeof x === 'string')) p.push('a payload must be text or null');
  for (const n of doc.nodes) if (typeof ann?.details?.[n.id] !== 'string') p.push(`no reel details for ${n.id}`);
  // Every message belongs to exactly one hop, in order.
  let next = 0;
  for (const [i, s] of doc.steps.entries()) {
    const e = s.edges;
    if (!e.length || e.some((x, k) => x !== e[0] + k) || e[0] !== next) p.push(`hop ${i + 1} must cover the next messages in order`);
    next = e[e.length - 1] + 1;
  }
  if (next !== doc.edges.length) p.push('the hops must cover every message');
  return p;
}

export function loadStory(name = DEFAULT_DIAGRAM) {
  if (typeof name !== 'string' || !NAME.test(name) || !DIAGRAM_NAMES.includes(name)) return null;
  const doc = read(`${name}.json`);
  const ann = read(`${name}.annotations.json`);
  const problems = [...validateDiagram(doc), ...annotationProblems(doc, ann)];
  if (problems.length) throw new Error(`diagram ${name} is not valid: ${problems.join('; ')}`);
  return { doc, ann };
}

const STORIES = Object.fromEntries(DIAGRAM_NAMES.map((n) => [n, loadStory(n)]));
export const rawStory = (name = DEFAULT_DIAGRAM) => STORIES[name];
