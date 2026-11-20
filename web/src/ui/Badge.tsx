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
  attn: "bg-attn-tint text-attn",
  you: "bg-you-tint text-you border-you-line",
  plain: "bg-subtle text-ink-2",
  outline: "bg-surface text-ink-2 border-line",
  label: "bg-subtle text-ink-3 uppercase tracking-label",
};

/** Static. Never clickable. */
export function Badge({ shape, tone, icon, children }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center border border-transparent whitespace-nowrap",
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
