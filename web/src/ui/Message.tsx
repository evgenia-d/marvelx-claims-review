import type { ReactNode } from "react";
import { IconTriangle } from "./icons";

export type MessageProps = {
  headline: string;
  body: string;
  /** At most one, usually a Button. A page-level message passes `autoFocus` on it. */
  action?: ReactNode;
  /** Adds a triangle for real errors. */
  error?: boolean;
};

export function Message({ headline, body, action, error = false }: MessageProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      {error && <IconTriangle size={20} className="text-attn" />}
      <h2 className="font-serif text-xl tracking-tight text-ink">{headline}</h2>
      <p className="text-md text-ink-2">{body}</p>
      {action}
    </div>
  );
}
