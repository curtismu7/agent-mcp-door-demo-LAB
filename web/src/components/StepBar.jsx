import { SPEEDS } from '../hooks/useStepper.js';
import { REFIT_EVENT } from '../hooks/useFit.js';

// Simulate walks the arrows in order. Speed sets the time per step. Reset stops the walkthrough, puts the boxes back where
// they started and refits the view.
export default function StepBar({ stepper, caption }) {
  const { step, total, active, paused } = stepper;
  if (total < 1) return null;
  return (
    <div className="step-bar" data-testid="step-bar">
      <label className="step-bar__speed" title="Time each step takes during Simulate">
        <span>Speed</span>
        <select value={stepper.stepMs} onChange={(e) => stepper.setStepMs(Number(e.target.value))} aria-label="Speed: time per step">
          {SPEEDS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      {!active ? (
        <button type="button" className="primary" onClick={stepper.simulate}>Simulate</button>
      ) : (
        <>
          <button type="button" onClick={stepper.prev} disabled={!paused}>← Prev</button>
          {paused
            ? <button type="button" onClick={stepper.resume}>Resume</button>
            : <button type="button" onClick={stepper.pause}>Pause</button>}
          <button type="button" onClick={stepper.next} disabled={!paused}>Next →</button>
          <button type="button" onClick={stepper.stop}>Stop</button>
        </>
      )}
      <button type="button" onClick={() => { stepper.stop(); window.dispatchEvent(new Event(REFIT_EVENT)); }} title="Stop, put the boxes back and refit the view">Reset</button>
      <span className="step-bar__count">Step {active ? step + 1 : 0} / {total}</span>
      <p className="step-bar__caption" aria-live="polite">
        {active ? <><strong>Step {step + 1} of {total}</strong>{caption ? ` · ${caption}` : ''}</> : `Simulate walks the ${total} arrows in order. Drag a box to move it.`}
      </p>
    </div>
  );
}
