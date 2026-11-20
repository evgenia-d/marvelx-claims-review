import type { ReactNode } from "react";
import { cx } from "./cx";

export type AlertProps = {
  layout: "box" | "band";
  /** Leading icon, if any. */
  icon?: ReactNode;
  /** Usually a secondary Button. */
  action?: ReactNode;
  children: ReactNode;
};

export function Alert({ layout, icon, action, children }: AlertProps) {
  return (
    <div
      role="alert"
      className={cx(
        "flex items-center gap-2 border-attn-line bg-attn-tint px-3 py-2 text-base text-attn",
        layout === "box" ? "min-h-11 rounded-md border" : "w-full border-b",
      )}
    >
      {icon}
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}
