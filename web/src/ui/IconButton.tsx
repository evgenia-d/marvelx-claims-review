import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx, focusRing } from "./cx";
import { Tooltip, type TooltipProps } from "./Tooltip";

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children" | "disabled"> & {
  /** Names the button for screen readers and shows as its tooltip. */
  label: string;
  icon: ReactNode;
  /** "sm" is 32 on laptop and 44 on phone; "md" is 36 and 48. */
  size?: "sm" | "md";
  /** A 1px edge around the button. */
  edge?: boolean;
  /** Which edge of the button its tooltip lines up with. */
  tooltipAlign?: TooltipProps["align"];
};

export function IconButton({
  label,
  icon,
  size = "sm",
  edge = false,
  tooltipAlign,
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <Tooltip content={label} align={tooltipAlign}>
      <button
        {...rest}
        type={type}
        aria-label={label}
        className={cx(
          "inline-flex items-center justify-center rounded-md border text-ink-2 hover:bg-subtle",
          size === "sm" ? "size-11 lg:size-8" : "size-12 lg:size-9",
          edge ? "border-line" : "border-transparent",
          focusRing,
          className,
        )}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
