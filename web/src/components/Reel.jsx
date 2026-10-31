import { useEffect, useRef, useState } from 'react';
import '../reel.css';

// The movie reel under the diagram: one card per arrow in walk order. A click jumps there (and pauses) and opens the
// details row below the reel, in normal page flow. A click on a box in the diagram passes `nodeDetail` to show that box.
export default function Reel({ steps, stepper, nodeDetail = null, onClearNode }) {
  const [open, setOpen] = useState(false);
  const stripRef = useRef(null);
  const step = stepper.step;

  useEffect(() => {
    const strip = stripRef.current;
    const card = strip?.children[step];
    if (!strip || !card || step < 0) return;
    const left = card.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + card.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollTo({ left: Math.max(0, left - 16), behavior: 'smooth' });
  }, [step]);

  if (!steps.length) return null;
  const current = step >= 0 ? steps[step] : null;
  const panel = nodeDetail || (open && current ? current : null);
  const close = () => { setOpen(false); onClearNode?.(); };
  const pick = (i) => {
    onClearNode?.();
    if (i === step && open) { setOpen(false); return; }
    stepper.goTo(i);
    setOpen(true);
  };

  return (
    <div className="reel" data-testid="sequence-reel">
      <ol className="reel__strip" ref={stripRef} aria-label="Movie reel: the steps of this diagram">
        {steps.map((s, i) => (
          <li key={s.n}>
            <button type="button" className="reel__card" data-state={i === step ? 'now' : step >= 0 && i < step ? 'done' : 'idle'} aria-current={i === step ? 'step' : undefined} onClick={() => pick(i)}>
              <span className="reel__n">{s.n}</span>
              <span className="reel__title">{s.title}</span>
              {s.label && <span className="reel__label">{s.label}</span>}
            </button>
          </li>
        ))}
      </ol>
      {panel && (
        <section className="reel__detail" aria-live="polite" data-testid="sequence-reel-detail">
          <header className="reel__head">
            <h3>{panel.title}</h3>
            <button type="button" onClick={close} aria-label="Close details">Close</button>
          </header>
          {panel.label && <p className="reel__detail-label">{panel.label}</p>}
          {panel.lines.length > 0 ? (
            <dl className="reel__lines">
              {panel.lines.map((l) => (
                <div key={`${l.who}-${l.code || l.text}`}>
                  {l.who && <dt>{l.who}</dt>}
                  <dd>{l.code ? <pre className="reel__code">{l.code}</pre> : l.text}</dd>
                </div>
              ))}
            </dl>
          ) : <p className="reel__empty">No further detail for this one.</p>}
        </section>
      )}
    </div>
  );
}
