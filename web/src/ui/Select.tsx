import type { SelectHTMLAttributes } from "react";
import { cx, focusRing } from "./cx";
import { IconChevron } from "./icons";

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
  /** Visible label above the select. */
  label: string;
  /** Applied to the outer label element (use it for width). */
  className?: string;
};

/** The platform's own `<select>`, so phones show their native picker. Pass `<option>`s as children. */
export function Select({ label, className, children, ...rest }: SelectProps) {
  return (
    <label className={cx("flex flex-col gap-1", className)}>
      <span className="text-xs text-ink-3">{label}</span>
      <span className="relative flex items-center">
        <select
          {...rest}
          className={cx(
            "h-11 w-full appearance-none rounded-md border border-line-strong bg-surface pr-8 pl-3 text-base text-ink lg:h-9",
            focusRing,
          )}
        >
          {children}
        </select>
        <IconChevron className="pointer-events-none absolute right-3 text-ink-2" />
      </span>
    </label>
  );
}
