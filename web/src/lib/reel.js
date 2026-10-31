// The movie reel: one card per message in walk order, plus the text its details row shows. Pure.
const firstLine = (s) => String(s ?? '').split('\n')[0].trim();

export function buildReelSteps({ messages, people, details, payloads = [], trace = [] }) {
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));
  return messages.map(([from, to, label], i) => {
    const lines = [];
    if (details?.[from]) lines.push({ who: firstLine(byId[from]?.label ?? from), text: details[from] });
    if (details?.[to] && to !== from) lines.push({ who: firstLine(byId[to]?.label ?? to), text: details[to] });
    if (payloads[i]) lines.push({ who: 'Payload', code: payloads[i] });
    if (trace[i]) lines.push({ who: 'traceparent (mock)', code: `${trace[i].traceparent}${trace[i].parent ? `\nparent span: ${trace[i].parent}` : ''}` });
    return { n: i + 1, from, to, label: String(label).replace(/\n/g, ' ').trim(), title: `${firstLine(byId[from]?.label ?? from)} → ${firstLine(byId[to]?.label ?? to)}`, lines };
  });
}

export function buildNodeDetail(person, details) {
  if (!person) return null;
  const text = details?.[person.id];
  return { title: firstLine(person.label), lines: text ? [{ who: '', text }] : [] };
}
