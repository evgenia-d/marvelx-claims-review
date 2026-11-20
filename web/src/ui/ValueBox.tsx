import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx, focusRing } from "./cx";

export type ValueBoxTone = "default" | "tint" | "muted";
export type ValueBoxSize = "num" | "text" | "long";

/** Shared by ValueBox and TextInput so the input and the value it edits look the same. */
export const boxTone: Record<ValueBoxTone, string> = {
  default: "bg-surface border-line-strong text-ink",
  tint: "bg-you-tint border-you-line text-you",
  muted: "bg-ground border-line text-ink-3",
};

export const boxSize: Record<ValueBoxSize, string> = {
  num: "font-mono text-xl",
  text: "font-mono text-lg",
  long: "font-sans text-md",
};

export type ValueBoxProps = {
  tone: ValueBoxTone;
  /** Follows the field's type, never its length: num is one line, text two, long four with a toggle. */
  size: ValueBoxSize;
  children: ReactNode;
};

/** Read-only. The value is text, never a link. */
export function ValueBox({ tone, size, children }: ValueBoxProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const isLong = size === "long";

  useEffect(() => {
    const element = textRef.current;
    // Only a clamped box can be measured. While expanded, keep the last answer.
    if (!isLong || expanded || !element) return;
    const observer = new ResizeObserver(() => {
      setOverflowing(element.scrollHeight > element.clientHeight);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [isLong, expanded, children]);

  return (
    <div
      className={cx(
        "flex min-h-13 flex-col items-start justify-center rounded-md border-control px-3 py-2",
        boxTone[tone],
        boxSize[size],
      )}
    >
      <div
        ref={textRef}
        className={cx(
          "w-full min-w-0 wrap-break-word",
          size === "num" && "truncate",
          size === "text" && "line-clamp-2",
          isLong && !expanded && "line-clamp-4",
        )}
      >
        {children}
      </div>
      {isLong && (overflowing || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className={cx("mt-1 rounded-sm text-sm font-medium text-ink-2 hover:text-ink", focusRing)}
        >
          {expanded ? "Show less" : "Show all"}
        </button>
      )}
    </div>
  );
}
