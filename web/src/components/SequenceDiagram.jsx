import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BaseEdge, Background, BackgroundVariant, Controls, EdgeLabelRenderer, getStraightPath, Handle, Position,
  ReactFlow, ReactFlowProvider, useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '../diagram.css';
import { FIT, MIN_ZOOM, baseX, buildSequenceFlow, clampOffset, flowWidth, markNodes, stepEdges } from '../lib/layout.js';
import { REFIT_EVENT, useFit } from '../hooks/useFit.js';

// A participant box. Boxes are movable along the top: dragging one slides its lifeline and every arrow with it.
function Participant({ data }) {
  return (
    <div className="seq-part" data-group={data.group} style={{ width: data.w }}>
      <div className="seq-part__title">{data.label}</div>
      {data.sub.map((l) => <div key={l} className="seq-part__sub">{l}</div>)}
    </div>
  );
}
const Lifeline = ({ data }) => <div className="seq-lifeline" style={{ height: data.h }} />;
function Anchor() {
  const h = { opacity: 0, width: 1, height: 1 };
  return (
    <div className="seq-anchor">
      <Handle id="sl" type="source" position={Position.Left} style={h} />
      <Handle id="sr" type="source" position={Position.Right} style={h} />
      <Handle id="tl" type="target" position={Position.Left} style={h} />
      <Handle id="tr" type="target" position={Position.Right} style={h} />
    </div>
  );
}
const Band = ({ data }) => <div className="seq-band" style={{ width: data.w }}>{data.text}</div>;
// The wire form or mock token under its message.
const Payload = ({ data }) => <pre className="seq-payload" style={{ width: data.w }}>{data.text}</pre>;

function MessageEdge({ id, sourceX, sourceY, targetX, targetY, style, markerEnd, data }) {
  const [path, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div className="seq-label nodrag nopan" style={{ transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY - 4}px)` }}>{data.text}</div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { part: Participant, lifeline: Lifeline, anchor: Anchor, note: Band, payload: Payload };
const edgeTypes = { msg: MessageEdge };

function Inner({ diagram, payloads, stepper, onModel, onPerson, offsets, setOffsets }) {
  const ref = useRef(null);
  const flowRef = useRef(null);
  const [canvasW, setCanvasW] = useState(0);
  const rf = useReactFlow();
  const model = useMemo(() => buildSequenceFlow(diagram, payloads, offsets), [diagram, payloads, offsets]);
  useFit(flowRef, FIT, diagram);
  useEffect(() => { onModel(model); }, [model, onModel]);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setCanvasW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Reset also puts the boxes back where the data places them.
  useEffect(() => {
    const clear = () => setOffsets({});
    window.addEventListener(REFIT_EVENT, clear);
    return () => window.removeEventListener(REFIT_EVENT, clear);
  }, [setOffsets]);

  const focus = stepper.step;
  const shown = useMemo(() => stepEdges(model.edges, focus), [model.edges, focus]);
  const current = focus >= 0 ? model.messages[focus] : null;
  const lit = useMemo(() => markNodes(model.nodes, current ? [`p-${current[0]}`, `p-${current[1]}`, `pl${focus}`] : []), [model.nodes, current, focus]);

  const zoom = canvasW ? Math.max(MIN_ZOOM, Math.min(1.1, canvasW / model.bounds.w)) : 1;
  const flowW = canvasW ? flowWidth(canvasW, model.bounds) : undefined;
  const fitHeight = canvasW ? Math.max(520, Math.round(model.bounds.h * zoom) + 24) : undefined;

  // A step reached by Simulate or picked on the reel scrolls its message into view.
  useEffect(() => {
    const el = ref.current;
    if (focus < 0 || !el || model.rows[focus] === undefined) return;
    try {
      const vp = rf.getViewport();
      const top = el.getBoundingClientRect().top + window.scrollY + vp.y + model.rows[focus] * vp.zoom;
      const vh = window.innerHeight;
      if (top < window.scrollY + 120 || top > window.scrollY + vh - 160) window.scrollTo({ top: Math.max(0, top - vh * 0.35), behavior: 'smooth' });
    } catch { /* scrolling is a convenience */ }
  }, [focus, model.rows, rf]);

  const onNodesChange = (changes) => {
    for (const c of changes) {
      if (c.type !== 'position' || !c.position || !c.id.startsWith('p-')) continue;
      const id = c.id.slice(2);
      const dx = clampOffset(c.position.x - baseX(diagram, id));
      setOffsets((o) => (o[id] === dx ? o : { ...o, [id]: dx }));
    }
  };

  return (
    <div className="seq-canvas" data-testid="sequence-flow-canvas" ref={ref} style={fitHeight ? { height: fitHeight } : undefined}>
      <div className="seq-flow" ref={flowRef} style={flowW > canvasW ? { width: flowW } : undefined}>
        <ReactFlow
          nodes={lit}
          edges={shown}
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => { if (node.type === 'part') onPerson(node.id.slice(2)); }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={FIT}
          minZoom={0.2}
          maxZoom={2}
          nodesConnectable={false}
          zoomOnScroll={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}

// diagram: a diagram-studio/1 document with its {{cast}} tokens filled. payloads: the text under each message.
// stepper: useStepper(). onModel gets the layout (people, messages) for the header and the reel.
export default function SequenceDiagram({ diagram, payloads, stepper, onModel, onPerson, label }) {
  const [offsets, setOffsets] = useState({});
  return (
    <div className="seq" role="group" aria-label={label}>
      <ReactFlowProvider>
        <Inner diagram={diagram} payloads={payloads} stepper={stepper} onModel={onModel} onPerson={onPerson} offsets={offsets} setOffsets={setOffsets} />
      </ReactFlowProvider>
    </div>
  );
}
