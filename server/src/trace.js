// W3C Trace Context for every hop of the mock walkthrough. One trace id per workspace; one span id per message, derived
// from the trace id and the message number, so a rerun of the same workspace shows the same ids until it is reset.
// These are teaching values: no request is ever sent, and the page labels them mock.
import { createHash } from 'node:crypto';

export const TRACEPARENT = /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/;

export function spanId(traceId, index) {
  return createHash('sha256').update(`${traceId}:${index}`).digest('hex').slice(0, 16);
}

export const traceparent = (traceId, index) => `00-${traceId}-${spanId(traceId, index)}-01`;

// One entry per message, in order: the traceparent the hop would carry, and the parent span it follows.
export function traceFor(traceId, count) {
  return Array.from({ length: count }, (_, i) => ({
    traceparent: traceparent(traceId, i),
    parent: i === 0 ? null : spanId(traceId, i - 1),
  }));
}
