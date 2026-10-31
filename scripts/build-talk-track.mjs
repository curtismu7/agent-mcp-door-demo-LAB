// Builds docs/talk-track.md from the story data (the hops of server/diagrams/mcp-door.json), so the doc cannot drift
// from what the talk-track panel shows. The default cast is filled in.
//   node scripts/build-talk-track.mjs        (writes docs/talk-track.md)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CAST, buildFlow } from '../server/src/flow.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function buildTalkTrack() {
  const flow = buildFlow(DEFAULT_CAST);
  const lines = [
    '# Talk track',
    '',
    `${flow.hops.length} hops, one short paragraph each. The app shows the same text in the talk-track panel: pick a hop (or press the right arrow) and the panel says what to tell the room while the diagram highlights the arrows of that hop.`,
    '',
    'Presenter mode (the Presenter button, or `P`) hides the intro and enlarges the panel. `→` next, `←` back, `Esc` leaves. The simulation banner and the Mock / Live toggle stay on screen.',
    '',
    ...flow.hops.map((h) => `${h.n}. **${h.title}.** ${h.say}`),
    '',
    'All names come from `customer.config.json` (see `customer.config.example.json`); the text above uses the default cast.',
    '',
  ];
  return lines.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(path.join(ROOT, 'docs/talk-track.md'), buildTalkTrack());
  console.log('wrote docs/talk-track.md');
}
