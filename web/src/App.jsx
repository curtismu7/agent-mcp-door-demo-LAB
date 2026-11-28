import { useCallback, useEffect, useMemo, useState } from 'react';
import SequenceDiagram from './components/SequenceDiagram.jsx';
import StepBar from './components/StepBar.jsx';
import Reel from './components/Reel.jsx';
import ActorHeader from './components/ActorHeader.jsx';
import { useStepper } from './hooks/useStepper.js';
import { REFIT_EVENT } from './hooks/useFit.js';
import { api, chooseWorkspace, currentWorkspace } from './lib/api.js';
import { buildNodeDetail, buildReelSteps } from './lib/reel.js';
import ShelfLink from "./components/ShelfLink.jsx";
import VerifyMark from "./components/VerifyMark.jsx";
import TopMenu, { applyFontSize } from './top-menu/TopMenu.jsx';
import TalkTrackDialog from "./talk-track/TalkTrackDialog.jsx";
import HelpDialog from "./help-dialog/HelpDialog.jsx";
import { HELP_SECTIONS } from "./helpContent";
import talkMd from "../../docs/talk-track.md?raw";
import PrivilegeCheck from "./privilege-check/PrivilegeCheck.jsx";

const THEME_KEY = "mcpdoor.theme";
const THEMES = [["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]];
const FONT_KEY = "mcpdoor.font";
function initialFont() {
  try { const f = localStorage.getItem(FONT_KEY); if (["S", "M", "L"].includes(f)) return f; } catch { /* storage blocked */ }
  return "M";
}
function initialTheme() {
  try { const t = localStorage.getItem(THEME_KEY); if (t === "light" || t === "dark") return t; } catch { /* storage blocked */ }
  return "auto";
}

export const APP_NAME = 'Agent Meets the MCP Door LAB';

// The hop the focused message belongs to (null while the walkthrough is off).
export const hopFor = (hops, step) => (step < 0 ? null : hops.find((h) => step >= h.first && step <= h.last) || null);

// Rule 2: the banner is on every view, presenter mode and the error view included, and says what is simulated and in which mode.
export const bannerText = 'Every host, token, approval and trace id here is a teaching value. Nothing talks to a real tenant, and this page makes no call to one.';

export default function App() {
  const [flow, setFlow] = useState(null);
  const [talkOpen, setTalkOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const talkSteps = (() => {
    const steps = []; let n = 0;
    for (const line of talkMd.split("\n")) {
      const m = line.match(/^\d+\.\s+(?:"(.+?)"|\*\*(.+?)\.\*\*\s*(.*))$/);
      if (m) { n += 1; steps.push({ id: `s${n}`, title: (m[1] || m[2]).slice(0, 60), say: m[1] || m[3] }); }
    }
    return steps.length ? steps : [{ id: "s1", title: "Talk track", say: talkMd.slice(0, 600) }];
  })();
  const [error, setError] = useState(null);
  const [presenter, setPresenter] = useState(false);
  const [workspace, setWorkspace] = useState(currentWorkspace);
  const [draft, setDraft] = useState(workspace);
  const [wsError, setWsError] = useState(null);
  const [model, setModel] = useState(null);
  const [nodeDetail, setNodeDetail] = useState(null);
  const [resetNote, setResetNote] = useState('');
  const [theme, setTheme] = useState(initialTheme);
  const [fontStep, setFontStep] = useState(initialFont);
  const pickTheme = (next) => {
    try { if (next === "auto") localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, next); } catch { /* not remembered */ }
    setTheme(next);
  };
  // The picker only sets data-theme; the shared stylesheet does the rest ("auto" follows the system setting).
  useEffect(() => { if (theme === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    applyFontSize(fontStep);
    try { localStorage.setItem(FONT_KEY, fontStep); } catch { /* not remembered */ }
  }, [fontStep]);
  const stepper = useStepper(flow ? flow.diagram.edges.length : 0);

  const load = useCallback(() => {
    let live = true;
    api.flow().then((j) => { if (live) { setFlow(j); setError(null); } }, (e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, []);
  useEffect(() => load(), [load, workspace]);

  // Rule 19: after a mode switch (or a refusal) the view reloads, so the banner and every hop show the mode the server answered with.
  const [modeNote, setModeNote] = useState('');
  const onModeSwitched = () => { setModeNote(''); load(); };
  const onModeRefused = (reason) => setModeNote(reason);

  // A Learning Hub card opens a hop with /#hop-3.
  const goTo = stepper.goTo;
  useEffect(() => {
    if (!flow) return;
    const m = /^#hop-(\d{1,2})$/.exec(window.location.hash);
    const h = m && flow.hops[Number(m[1]) - 1];
    if (h) goTo(h.first);
  }, [flow, goTo]);

  const hop = flow ? hopFor(flow.hops, stepper.step) : null;
  const reelSteps = useMemo(
    () => (flow && model ? buildReelSteps({ messages: model.messages, people: model.people, details: flow.details, payloads: flow.payloads, trace: flow.trace }) : []),
    [flow, model],
  );

  // Reset: stop the walkthrough, put the boxes back, refit the view, and clear this workspace's mock trace on the server.
  const reset = useCallback(() => {
    stepper.stop();
    setNodeDetail(null);
    window.dispatchEvent(new Event(REFIT_EVENT));
    api.reset().then((r) => { setResetNote(`Reset: workspace ${r.workspace} has a new trace`); load(); }, () => setResetNote('Reset: the view was reset, but the server did not answer'));
  }, [stepper, load]);

  const submitWorkspace = (e) => {
    e.preventDefault();
    const id = chooseWorkspace(draft);
    if (!id) { setWsError('Use 1-32 lowercase letters, digits or dashes'); return; }
    setWsError(null);
    setDraft(id);
    if (id !== workspace) { stepper.stop(); setWorkspace(id); }
  };

  // Presenter keys: right = next (starts at hop 1), left = previous, Escape leaves presenter mode, P toggles it.
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || /input|select|textarea/i.test(e.target?.tagName || '')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); if (stepper.step < 0) stepper.goTo(0); else stepper.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepper.prev(); }
      else if (e.key === 'Escape') setPresenter(false);
      else if (e.key === 'p' || e.key === 'P') setPresenter((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepper]);

  const modeWord = flow?.mode === 'live' ? 'LIVE' : 'MOCK';
  return (
    <>
      <header className="shell-bar">
        <span className="shell-brand">
          <img className="shell-logo" src="/ping-logo.png" alt="Ping Identity" width="30" height="30" />
          <h1>{APP_NAME}</h1>
          <span className={`shell-badge${flow?.mode === 'live' ? ' shell-badge--real' : ''}`} data-testid="mode-badge">{modeWord}</span>
        </span>
        <nav className="shell-nav" aria-label="Pages">
          <a href="#main" aria-current="page">MCP door</a>
        </nav>
        <TopMenu
          mode={flow ? { value: flow.source === "real" ? "real" : "mock", onChange: async (v) => { if (v === "real" && !flow.realAvailable) { onModeRefused(flow.realReason || 'No live backend'); return; } try { await api.setMode(v); onModeSwitched(); } catch (e) { onModeRefused(e.message || 'No live backend'); } }, realAvailable: Boolean(flow.realAvailable), realHint: flow.realReason || 'No live backend' } : undefined}
          theme={{ value: theme, onChange: pickTheme }}
          fontSize={{ value: fontStep, onChange: setFontStep }}
          present={{ active: presenter, onToggle: () => setPresenter((v) => !v), label: "Presenter" }}
          talkTrack={{ active: talkOpen, onToggle: () => setTalkOpen((v) => !v) }}
          help={{ onClick: () => setHelpOpen(true), title: "What this lab is, and what is simulated" }}
          onReset={reset}
        >
          <ShelfLink headers={() => ({ "x-workspace": currentWorkspace() })} />
          <VerifyMark id="agent-mcp-door-demo" headers={() => ({ "x-workspace": currentWorkspace() })} />
        </TopMenu>
      </header>
    <main id="main" className={`app${presenter ? ' app--presenter' : ''}`}>
      <PrivilegeCheck />
      <div className="banner" role="note" data-testid="sim-banner" data-state={flow?.mode === 'live' ? 'live' : 'mock'}>
        <strong>{modeWord}. Simulated.</strong> {bannerText}
      </div>
      {error && <p role="alert" className="app__error">Could not load the walkthrough: {error}. Run <code>npm run doctor</code>.</p>}
      {modeNote && <p className="app__note" role="status" data-testid="mode-note">{modeNote}</p>}
      {resetNote && <p className="app__note" role="status">{resetNote}</p>}
      <div className="page-head">
        <div className="page-head__text">
          <h2><span className="step-num" aria-hidden="true">1</span>{flow ? flow.title : 'Loading the walkthrough'}</h2>
          {flow && !presenter && <p className="page-head__intro">{flow.intro}</p>}
        </div>
        <form className="workspace" onSubmit={submitWorkspace}>
          <label className="workspace__label" htmlFor="workspace-id">Workspace</label>
          <input id="workspace-id" className="workspace__input" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={submitWorkspace} maxLength={32} spellCheck={false} aria-invalid={Boolean(wsError)} />
        </form>
        {wsError && <p className="page-head__error" role="alert">{wsError}</p>}
      </div>

      {!flow && !error && <p>Loading…</p>}
      {flow && (
        <>
          <section className="track" aria-label="Talk track">
            {hop ? (
              <article className="track__now" data-testid="track-now">
                <h2><span className="step-num" aria-hidden="true">{hop.n}</span>{hop.title}</h2>
                <p>{hop.say}</p>
              </article>
            ) : (
              <ol className="track__list">
                {flow.hops.map((h) => (
                  <li key={h.n}><button type="button" onClick={() => stepper.goTo(h.first)}><b>{h.n}</b> {h.title}</button></li>
                ))}
              </ol>
            )}
          </section>
          <StepBar stepper={stepper} caption={hop ? hop.title : ''} />
          {model && <ActorHeader people={model.people} messages={model.messages} focus={stepper.step} />}
          <Reel steps={reelSteps} stepper={stepper} nodeDetail={nodeDetail} onClearNode={() => setNodeDetail(null)} />
          <SequenceDiagram
            diagram={flow.diagram}
            payloads={flow.payloads}
            stepper={stepper}
            label={flow.title}
            onModel={setModel}
            onPerson={(id) => model && setNodeDetail(buildNodeDetail(model.people.find((p) => p.id === id), flow.details))}
          />
          {!presenter && <p className="keys">Keys: → next hop step, ← previous, P presenter, Esc leave presenter. Drag a box to move it; Reset puts it back. Brand and names come from <code>customer.config.json</code>. Workspace <b>{flow.workspace}</b>.</p>}
        </>
      )}
      <TalkTrackDialog isOpen={talkOpen} onClose={() => setTalkOpen(false)} talk={talkSteps} />
      <HelpDialog isOpen={helpOpen} onClose={() => setHelpOpen(false)} sections={HELP_SECTIONS} docsUrl="https://github.com/curtismu7/agent-mcp-door-demo-LAB#readme" />

    </main>
    </>
  );
}
