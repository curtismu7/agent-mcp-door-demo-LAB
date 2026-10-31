// Turns a diagram-studio/1 document (participants, ordered messages, hops) into the nodes and edges of a React Flow
// sequence diagram. Pure: no DOM, so it is unit-tested. The participants' x positions come from the data; `offsets`
// (participant id -> dx) is what dragging a box changes, and Reset clears it.
export const TOP = 120; // room for the participant boxes before the first row
export const PART_H = 64;
export const LINE_H = 17;
export const PAYLOAD_CH = 7.8; // IBM Plex Mono at the app's size; a system mono is narrower, so it only leaves slack
export const PAYLOAD_LINE_H = 15;
export const MAX_OFFSET = 700;
const WRAP = 44;

export function wrapText(text, width = WRAP) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(' ')) {
    if (line && (line + ' ' + word).length > width) { lines.push(line); line = word; } else { line = line ? line + ' ' + word : word; }
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

export const clampOffset = (dx) => Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, Math.round(Number(dx) || 0)));

// The people of the diagram, left to right as the data places them.
export function peopleOf(diagram) {
  return [...diagram.nodes].sort((a, b) => a.x - b.x).map((n) => ({ id: n.id, label: n.label, sub: n.sub || [], group: n.group, x: n.x }));
}

export function partWidth(people) {
  let gap = 220;
  for (let i = 1; i < people.length; i++) gap = Math.min(gap, people[i].x - people[i - 1].x);
  return Math.max(96, Math.min(220, gap - 24));
}

// Left edge of a participant box before any dragging.
export function baseX(diagram, id) {
  const people = peopleOf(diagram);
  const p = people.find((q) => q.id === id);
  return p ? 60 + (p.x - people[0].x) : 0;
}

export function buildSequenceFlow(diagram, payloads = [], offsets = {}) {
  const people = peopleOf(diagram);
  const PART_W = partWidth(people);
  const cx = Object.fromEntries(people.map((p) => [p.id, 60 + (p.x - people[0].x) + PART_W / 2 + clampOffset(offsets[p.id])]));
  const names = Object.fromEntries(people.map((p) => [p.id, p.label]));
  const stepAt = new Map(diagram.steps.map((s, i) => [s.edges[0], { ...s, n: i + 1 }]));
  const nodes = [];
  const edges = [];
  const rows = []; // y of each message arrow, for scrolling a step into view
  const steps = [];
  let y = TOP;

  diagram.edges.forEach((e, i) => {
    const hop = stepAt.get(i);
    if (hop) {
      const ids = new Set(diagram.steps[hop.n - 1].edges.flatMap((k) => [diagram.edges[k].source, diagram.edges[k].target]));
      const xs = [...ids].map((id) => cx[id]);
      const x0 = Math.min(...xs) - 90;
      y += 14;
      nodes.push({ id: `band${hop.n}`, type: 'note', position: { x: x0, y }, data: { text: `${hop.n} ${hop.title}`, w: Math.max(...xs) - Math.min(...xs) + 180 }, draggable: false, selectable: false, zIndex: 1 });
      y += LINE_H + 18;
    }
    const text = wrapText(e.label);
    y += 18 + text.split('\n').length * LINE_H;
    const a = `a${i}s`;
    const b = `a${i}t`;
    const rightward = cx[e.target] >= cx[e.source];
    nodes.push({ id: a, type: 'anchor', position: { x: cx[e.source] - 3, y: y - 3 }, data: {}, draggable: false, selectable: false, zIndex: 3 });
    nodes.push({ id: b, type: 'anchor', position: { x: cx[e.target] - 3, y: y - 3 }, data: {}, draggable: false, selectable: false, zIndex: 3 });
    edges.push({
      id: `m${i}`,
      source: a,
      target: b,
      sourceHandle: rightward ? 'sr' : 'sl',
      targetHandle: rightward ? 'tl' : 'tr',
      type: 'msg',
      markerEnd: { type: 'arrowclosed', width: 16, height: 16 },
      style: e.dashed ? { strokeDasharray: '6 4' } : undefined,
      data: { text: `${i + 1}. ${text}` },
      selectable: false,
      zIndex: 2,
    });
    steps.push(`${names[e.source]} → ${names[e.target]}: ${e.label}`);
    rows.push(y);
    const payload = payloads[i];
    if (payload) {
      const plines = payload.split('\n');
      const allX = people.map((p) => cx[p.id]);
      const w = Math.min(560, Math.max(220, Math.ceil(Math.max(...plines.map((l) => l.length)) * PAYLOAD_CH) + 40));
      const left = Math.min(cx[e.source], cx[e.target]) - 12;
      const x = Math.max(Math.min(...allX) - 80, Math.min(left, Math.max(...allX) + 80 - w));
      y += 8;
      nodes.push({ id: `pl${i}`, type: 'payload', position: { x, y }, data: { text: payload, w }, draggable: false, selectable: false, zIndex: 1 });
      y += plines.length * PAYLOAD_LINE_H + 16 + 6;
    }
  });
  const end = y + 30;
  people.forEach((p) => {
    nodes.push({ id: `p-${p.id}`, type: 'part', position: { x: cx[p.id] - PART_W / 2, y: 20 }, data: { label: p.label, sub: p.sub, group: p.group, w: PART_W }, draggable: true, zIndex: 4 });
    nodes.push({ id: `l-${p.id}`, type: 'lifeline', position: { x: cx[p.id] - 1, y: 20 + PART_H }, data: { h: Math.max(20, end - 20 - PART_H) }, draggable: false, selectable: false, zIndex: 0 });
  });
  const allCx = Object.values(cx);
  const bounds = { w: Math.max(...allCx) + PART_W / 2 + 60, h: end + 40 };
  return { nodes, edges, steps, rows, bounds, people, messages: diagram.edges.map((e) => [e.source, e.target, e.label]) };
}

// Fit the drawing to the page width, but not below this zoom: smaller text is unreadable, so the canvas scrolls sideways instead.
export const MIN_ZOOM = 0.88;
export const FIT = { padding: 0.04 };
export const flowWidth = (canvasW, bounds) => Math.max(canvasW, Math.ceil((bounds.w - 120) * (1 + FIT.padding) * MIN_ZOOM));

// The edge in focus is accented and animated; edges not reached yet fade. step < 0 leaves everything alone.
export function stepEdges(edges, step) {
  if (step < 0) return edges;
  return edges.map((e, i) => {
    if (i === step) return { ...e, animated: true, style: { ...e.style, stroke: 'var(--status-info)', strokeWidth: 4 } };
    if (i > step) return { ...e, style: { ...e.style, opacity: 0.35 } };
    return e;
  });
}

export function markNodes(nodes, hotIds) {
  const hot = new Set(hotIds || []);
  if (!hot.size) return nodes;
  return nodes.map((n) => (hot.has(n.id) ? { ...n, className: `${n.className ? `${n.className} ` : ''}seq-hot` } : n));
}
