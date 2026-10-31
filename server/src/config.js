// Deployment configuration: the MODE switch.
// Only MODE=mock exists. A live mode is not implemented, so asking for one is an error, never a silent fallback.
export function modeFrom(env = process.env) {
  const m = env.MODE === undefined || env.MODE === '' ? 'mock' : env.MODE;
  if (m !== 'mock') throw new Error(`MODE=${String(m).slice(0, 20)} is not available: this app has a mock mode only`);
  return m;
}
