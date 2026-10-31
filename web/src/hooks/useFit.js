import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

// Dispatched on window by Reset so the diagram goes back to its fitted view and its boxes to their start positions.
export const REFIT_EVENT = 'diagram:refit';

// React Flow fits the view once, on mount. Refit when the canvas changes size, when the story changes, and on Reset.
export function useFit(ref, options, source) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const el = ref.current;
    let raf = 0;
    const refit = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => fitView(options)); };
    let ro;
    if (el && typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(refit); ro.observe(el); }
    window.addEventListener(REFIT_EVENT, refit);
    return () => { window.removeEventListener(REFIT_EVENT, refit); ro?.disconnect(); cancelAnimationFrame(raf); };
  }, [ref, fitView, options]);
  useEffect(() => {
    if (!source) return undefined;
    const raf = requestAnimationFrame(() => fitView(options));
    return () => cancelAnimationFrame(raf);
  }, [source, fitView, options]);
}
