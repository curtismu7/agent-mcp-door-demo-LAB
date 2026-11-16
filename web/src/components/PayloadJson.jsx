import Json from './JsonPane.jsx';

// The claims that carry this lab's point, on top of the shared defaults (sub, act, aud, scope, client_id, iss ...): the short life
// ("exp") and the unique id the audit trail records ("jti").
export const PAYLOAD_HOT = ['exp', 'jti'];

// A payload that carries JSON (see lib/payload.js): its caption as text, its JSON through the shared JsonPane (Form | JSON, full view).
export default function PayloadJson({ parts }) {
  return (
    <>
      {parts.caption && <p className="payload-caption">{parts.caption}</p>}
      <Json value={parts.json} label={parts.caption || 'Payload'} hot={PAYLOAD_HOT} />
    </>
  );
}
