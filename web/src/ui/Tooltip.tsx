import { useEffect, useState, type ReactNode } from "react";
import { cx } from "./cx";

export type TooltipProps = {
  /** One short sentence. */
  content: string;
  /** Which edge of the trigger the tooltip lines up with. Use "end" for buttons on the right. */
  align?: "start" | "end";
  /** The trigger. */
  children: ReactNode;
};

/** A visual hint on hover and focus. It is hidden from screen readers: the trigger carries its own label. */
export function Tooltip({ content, align = "start", children }: TooltipProps) {
  const [shown, setShown] = useState(false);

  // Escape dismisses a tooltip opened by hover too, wherever focus is (WCAG 1.4.13).
  useEffect(() => {
    if (!shown) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShown(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shown]);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShown(true)}
      onMouseLeave={() => setShown(false)}
      onFocus={() => setShown(true)}
      onBlur={() => setShown(false)}
    >
      {children}
      <span
        role="tooltip"
        aria-hidden="true"
        hidden={!shown}
        className={cx(
          "absolute top-full z-10 w-max max-w-xs rounded-md bg-surface px-2 py-1 text-sm text-ink shadow-lift",
          align === "end" ? "right-0" : "left-0",
        )}
      >
        {content}
      </span>
    </span>
  );
}
