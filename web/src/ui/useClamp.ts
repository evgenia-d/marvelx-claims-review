import { useEffect, useState, type RefObject } from "react";

/**
 * Clamped text with a "Show all" toggle. Only a clamped element can be measured, so while expanded
 * the last answer is kept. `content` re-measures when the text changes.
 */
export function useClamp(ref: RefObject<HTMLElement | null>, active: boolean, content: unknown) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!active || expanded || !element) return;
    const observer = new ResizeObserver(() => {
      setOverflowing(element.scrollHeight > element.clientHeight);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, active, expanded, content]);

  return { expanded, showToggle: active && (overflowing || expanded), toggle: () => setExpanded((v) => !v) };
}
