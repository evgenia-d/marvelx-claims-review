import type { ReactNode } from "react";
import { cx } from "./cx";

type BadgeBase = {
  tone: "attn" | "you" | "plain" | "outline" | "label";
  children: ReactNode;
};

export type BadgeProps = BadgeBase &
  (
    | { shape: "tag"; icon?: never }
    | { shape: "pill"; icon?: ReactNode }
  );

const tones: Record<BadgeBase["tone"], string> = {
  attn: "bg-attn-tint text-attn border-transparent",
  you: "bg-you-tint text-you border-you-line",
  plain: "bg-subtle text-ink-2 border-transparent",
  outline: "bg-surface text-ink-2 border-line",
  label: "bg-subtle text-ink-3 uppercase tracking-label border-transparent",
};

/** Static. Never clickable. */
export function Badge({ shape, tone, icon, children }: BadgeProps) {
  return (
    <span
      className={cx(
        // The border colour comes from the tone only, so it never fights the base class.
        "inline-flex items-center border whitespace-nowrap",
        shape === "tag"
          ? "h-5 rounded-sm px-1.5 font-mono text-xs"
          : "h-5.5 gap-1.5 rounded-full px-2 font-sans text-sm font-semibold",
        tones[tone],
      )}
    >
      {icon}
      {children}
    </span>
  );
}
