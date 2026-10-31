import { useCallback, useEffect, useMemo, useState } from 'react';
import SequenceDiagram from './components/SequenceDiagram.jsx';
import StepBar from './components/StepBar.jsx';
import Reel from './components/Reel.jsx';
import ActorHeader from './components/ActorHeader.jsx';
import ModeToggle from './components/ModeToggle.jsx';
import { useStepper } from './hooks/useStepper.js';
import { REFIT_EVENT } from './hooks/useFit.js';
import { api, chooseWorkspace, currentWorkspace } from './lib/api.js';
import { buildNodeDetail, buildReelSteps } from './lib/reel.js';

export const APP_NAME = 'Agent Meets the MCP Door LAB';

// The hop the focused message belongs to (null while the walkthrough is off).
export const hopFor = (hops, step) => (step < 0 ? null : hops.find((h) => step >= h.first && step <= h.last) || null);

// Rule 2: the banner is on every view, presenter mode and the error view included, and says what is simulated and in which mode.
export const bannerText = 'Every host, token, approval and trace id here is a teaching value. Nothing talks to a real tenant, and this page makes no call to one.';

export default function App() {
  const [flow, setFlow] = useState(null);
  const [error, setError] = useState(null);
  const [presenter, setPresenter] = useState(false);
  const [workspace, setWorkspace] = useState(currentWorkspace);
  const [draft, setDraft] = useState(workspace);
  const [wsError, setWsError] = useState(null);
  const [model, setModel] = useState(null);
  const [nodeDetail, setNodeDetail] = useState(null);
  const [resetNote, setResetNote] = useState('');
  const stepper = useStepper(flow ? flow.diagram.edges.length : 0);

  const load = useCallback(() => {
    let live = true;
    api.flow().then((j) => { if (live) { setFlow(j); setError(null); } }, (e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, []);
  useEffect(() => load(), [load, workspace]);

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
    <main className={`app${presenter ? ' app--presenter' : ''}`}>
      <div className="banner" role="note" data-testid="sim-banner" data-state={flow?.mode === 'live' ? 'live' : 'mock'}>
        <strong>{modeWord}. Simulated.</strong> {bannerText}
      </div>
      <header className="head">
        <div className="head__brand">
          <img className="head__logo" src="/ping-logo.png" alt="Ping Identity" width="40" height="40" />
          <div>
            <p className="head__app">{APP_NAME}</p>
            <h1>{flow ? flow.title : 'Loading the walkthrough'}</h1>
            {flow && !presenter && <p className="head__intro">{flow.intro}</p>}
          </div>
        </div>
        <div className="head__tools">
          <ModeToggle info={flow} />
          <form className="workspace" onSubmit={submitWorkspace}>
            <label className="workspace__label" htmlFor="workspace-id">Workspace</label>
            <input id="workspace-id" className="workspace__input" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={submitWorkspace} maxLength={32} spellCheck={false} aria-invalid={Boolean(wsError)} />
          </form>
          <button type="button" onClick={() => setPresenter((v) => !v)} aria-pressed={presenter}>{presenter ? 'Exit presenter' : 'Presenter'}</button>
          <button type="button" onClick={reset} title="Stop the walkthrough, put the boxes back and clear this workspace's mock trace">Reset demo</button>
        </div>
        {wsError && <p className="head__error" role="alert">{wsError}</p>}
        {resetNote && <p className="head__note" role="status">{resetNote}</p>}
      </header>

      {error && <p role="alert" className="app__error">Could not load the walkthrough: {error}. Run <code>npm run doctor</code>.</p>}
      {!flow && !error && <p>Loading…</p>}
      {flow && (
        <>
          <section className="track" aria-label="Talk track">
            {hop ? (
              <article className="track__now" data-testid="track-now">
                <h2>Hop {hop.n}: {hop.title}</h2>
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
    </main>
  );
}
