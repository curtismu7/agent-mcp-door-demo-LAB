import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PayloadJson, { PAYLOAD_HOT } from './PayloadJson.jsx';
import { setJsonView } from './JsonPane.jsx';
import { splitPayload } from '../lib/payload.js';

const TOKEN = 'Per-call token (MOCK)\n{\n  "sub": "<member id>",\n  "aud": "https://mcp.example/rewards",\n  "scope": "miles:read miles:redeem",\n  "exp": "iat + a few minutes",\n  "jti": "<unique id>"\n}';

beforeEach(() => setJsonView('form'));
afterEach(() => { cleanup(); window.localStorage.clear(); });

describe('PayloadJson', () => {
  it('shows the caption as text and the JSON through the shared pane: Form by default, JSON on the toggle', () => {
    render(<PayloadJson parts={splitPayload(TOKEN)} />);
    expect(screen.getByText('Per-call token (MOCK)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Form' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'JSON' })).toHaveAttribute('aria-pressed', 'false');
    const form = screen.getByRole('group', { name: 'Per-call token (MOCK)' });
    expect(form.textContent).toMatch(/aud/);
    expect(form.querySelectorAll('.jform__chip').length).toBe(2); // the two scopes as chips
    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
    const raw = document.querySelector('pre.json--raw');
    expect(raw.textContent).toBe(TOKEN.slice(TOKEN.indexOf('\n') + 1)); // the exact JSON text, not re-serialized
  });

  it('marks this lab\'s own important claims (exp, jti) on top of the defaults, in both views', () => {
    expect(PAYLOAD_HOT).toEqual(['exp', 'jti']);
    render(<PayloadJson parts={splitPayload(TOKEN)} />);
    const hotKeys = () => [...document.querySelectorAll('.jform__row[data-hot="true"] > .jform__k')].map((n) => n.textContent);
    expect(hotKeys()).toEqual(expect.arrayContaining(['sub', 'aud', 'scope', 'exp', 'jti']));
    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
    const hot = [...document.querySelectorAll('.jtok--hot')].map((n) => n.textContent);
    expect(hot).toEqual(expect.arrayContaining(['"exp"', '"jti"', '"aud"']));
  });

  it('a pane never scrolls: no inline height cap on the pane', () => {
    render(<PayloadJson parts={splitPayload(TOKEN)} />);
    const box = document.querySelector('.jsonbox');
    expect(box.getAttribute('style')).toBeNull();
    expect(document.querySelector('.json').getAttribute('style')).toBeNull();
  });
});
