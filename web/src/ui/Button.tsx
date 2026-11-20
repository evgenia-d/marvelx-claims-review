import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx, focusRing } from "./cx";

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> & {
  variant: "primary" | "secondary";
  icon?: ReactNode;
};

/**
 * A plain button. To block it, the caller sets `aria-disabled` (and explains why, e.g. with
 * `aria-describedby`). A blocked button looks grey, stays focusable and ignores clicks,
 * so a blocked submit button doesn't submit.
 */
export function Button({ variant, icon, children, className, onClick, type = "button", ...rest }: ButtonProps) {
  const blocked = rest["aria-disabled"] === true || rest["aria-disabled"] === "true";

  return (
    <button
      {...rest}
      type={type}
      onClick={(event) => {
        if (blocked) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      className={cx(
        "inline-flex h-11 items-center justify-center gap-1.5 rounded-md border px-4 text-base font-medium lg:h-9",
        focusRing,
        blocked
          ? "cursor-not-allowed border-line bg-subtle text-ink-3"
          : variant === "primary"
            ? "border-transparent bg-primary text-on-primary hover:bg-primary-hover"
            : "border-line-strong bg-surface text-ink hover:bg-ground",
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}
