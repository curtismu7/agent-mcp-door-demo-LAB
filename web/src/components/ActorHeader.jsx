// A progress bar over a row of actor tiles. Actors the walkthrough has not reached yet are dimmed; the one acting now is ringed.
const initials = (name) => {
  const w = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '?';
  return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[1][0]).toUpperCase();
};

export default function ActorHeader({ people, messages, focus }) {
  const msgState = (i) => (focus < 0 ? 'done' : i === focus ? 'active' : i < focus ? 'done' : 'idle');
  const actors = people.map((p) => {
    const states = messages.flatMap((m, i) => (m[0] === p.id || m[1] === p.id ? [msgState(i)] : []));
    return { ...p, state: states.includes('active') ? 'active' : states.includes('done') ? 'done' : 'idle' };
  });
  return (
    <div className="actors" data-testid="sequence-actor-header">
      <div className="actors__bar" aria-hidden="true">
        {messages.map((_, i) => <span key={i} className="actors__seg" data-state={msgState(i)} />)}
      </div>
      <ol className="actors__row">
        {actors.map((a) => (
          <li key={a.id} className="actors__actor" data-state={a.state}>
            <span className="actors__tile">{initials(a.label)}</span>
            <span className="actors__name">{a.label}</span>
            {a.sub[0] && <span className="actors__desc">{a.sub[0]}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
