import { describe, expect, it } from 'vitest';
import { MAX_OFFSET, MIN_ZOOM, baseX, buildSequenceFlow, clampOffset, flowWidth, markNodes, partWidth, peopleOf, stepEdges, wrapText } from './layout.js';
import { FLOW } from '../testFlow.js';

const D = FLOW.diagram;

describe('layout', () => {
  it('orders participants by the data x, left to right, and sizes the boxes from the gap', () => {
    expect(peopleOf(D).map((p) => p.id)).toEqual(['member', 'door', 'agent']);
    expect(partWidth(peopleOf(D))).toBe(136);
  });

  it('builds one edge per message, one band per hop, one payload per non-null slot, and a box and lifeline per participant', () => {
    const m = buildSequenceFlow(D, FLOW.payloads);
    expect(m.edges).toHaveLength(3);
    expect(m.nodes.filter((n) => n.type === 'note').map((n) => n.data.text)).toEqual(['1 Discover', '2 Call']);
    expect(m.nodes.filter((n) => n.type === 'payload')).toHaveLength(2);
    expect(m.nodes.filter((n) => n.type === 'part')).toHaveLength(3);
    expect(m.nodes.filter((n) => n.type === 'lifeline')).toHaveLength(3);
    expect(m.edges[1].style.strokeDasharray).toBe('6 4');
    expect(m.edges[0].data.text).toBe('1. first message');
  });

  it('rows run top to bottom in message order, and a long label wraps and makes its row taller', () => {
    const m = buildSequenceFlow(D, FLOW.payloads);
    expect(m.rows).toEqual([...m.rows].sort((a, b) => a - b));
    expect(m.edges[2].data.text).toContain('\n');
    expect(wrapText('a b c', 3)).toBe('a b\nc');
  });

  it('only participant boxes are draggable', () => {
    const m = buildSequenceFlow(D, FLOW.payloads);
    expect(m.nodes.filter((n) => n.draggable).every((n) => n.type === 'part')).toBe(true);
    expect(m.nodes.filter((n) => n.draggable)).toHaveLength(3);
  });

  it('an offset moves a box, its lifeline and the arrows that end on it; clearing the offsets restores them', () => {
    const at = (m, id) => m.nodes.find((n) => n.id === id).position.x;
    const a = buildSequenceFlow(D, FLOW.payloads);
    const b = buildSequenceFlow(D, FLOW.payloads, { door: 100 });
    expect(at(b, 'p-door') - at(a, 'p-door')).toBe(100);
    expect(at(b, 'l-door') - at(a, 'l-door')).toBe(100);
    expect(at(b, 'a0t') - at(a, 'a0t')).toBe(100);
    expect(at(b, 'p-member')).toBe(at(a, 'p-member'));
    expect(buildSequenceFlow(D, FLOW.payloads, {}).nodes).toEqual(a.nodes);
    expect(baseX(D, 'member')).toBe(60);
    expect(baseX(D, 'door')).toBe(220);
  });

  it('offsets are clamped so a drag cannot throw a box off the canvas', () => {
    expect(clampOffset(99999)).toBe(MAX_OFFSET);
    expect(clampOffset(-99999)).toBe(-MAX_OFFSET);
    expect(clampOffset('x')).toBe(0);
  });

  it('stepEdges accents the edge in focus and fades later ones; step -1 leaves them alone', () => {
    const e = buildSequenceFlow(D, []).edges;
    expect(stepEdges(e, -1)).toBe(e);
    const s = stepEdges(e, 1);
    expect(s[0]).toBe(e[0]);
    expect(s[1].animated).toBe(true);
    expect(s[2].style.opacity).toBe(0.35);
  });

  it('markNodes rings the named nodes', () => {
    const n = buildSequenceFlow(D, []).nodes;
    const lit = markNodes(n, ['p-door']);
    expect(lit.find((x) => x.id === 'p-door').className).toBe('seq-hot');
    expect(lit.find((x) => x.id === 'p-agent').className).toBeUndefined();
  });

  it('flowWidth never goes below the canvas, and grows when the drawing needs more than MIN_ZOOM allows', () => {
    expect(flowWidth(1000, { w: 500 })).toBe(1000);
    expect(flowWidth(400, { w: 1800 })).toBeGreaterThan(400);
    expect(MIN_ZOOM).toBe(0.88);
  });
});
