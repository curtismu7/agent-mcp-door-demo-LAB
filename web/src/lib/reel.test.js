import { describe, expect, it } from 'vitest';
import { buildNodeDetail, buildReelSteps } from './reel.js';
import { buildSequenceFlow } from './layout.js';
import { FLOW } from '../testFlow.js';

describe('reel', () => {
  const m = buildSequenceFlow(FLOW.diagram, FLOW.payloads);
  const steps = buildReelSteps({ messages: m.messages, people: m.people, details: FLOW.details, payloads: FLOW.payloads, trace: FLOW.trace });

  it('one card per message with who, details, payload and the mock traceparent', () => {
    expect(steps).toHaveLength(3);
    expect(steps[0].title).toBe('Member → Door');
    expect(steps[0].lines.map((l) => l.who)).toEqual(['Member', 'Door', 'Payload', 'traceparent (mock)']);
    expect(steps[1].lines.map((l) => l.who)).not.toContain('Payload');
    expect(steps[1].lines.at(-1).code).toContain('parent span: ');
    expect(steps[0].lines.at(-1).code).not.toContain('parent span');
  });

  it('a node detail shows that participant', () => {
    expect(buildNodeDetail(m.people[1], FLOW.details)).toEqual({ title: 'Door', lines: [{ who: '', text: 'door detail' }] });
    expect(buildNodeDetail(null, FLOW.details)).toBeNull();
  });
});
