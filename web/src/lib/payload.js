// A payload is wire text: a label, an HTTP head, key: value lines. One of them (the mock per-call token) carries JSON: a caption line, then
// the claims object. splitPayload pulls the caption and the JSON text apart so the JSON goes through the shared JsonPane; any other payload
// returns null and stays text. The JSON is passed on exactly as written.
export function splitPayload(text) {
  const s = String(text ?? '');
  const at = s.search(/(^|\n)[{[]/);
  if (at < 0) return null;
  const start = s[at] === '\n' ? at + 1 : at;
  const json = s.slice(start).trim();
  try {
    const v = JSON.parse(json);
    if (v === null || typeof v !== 'object') return null;
  } catch { return null; }
  return { caption: s.slice(0, start).trim(), json };
}
