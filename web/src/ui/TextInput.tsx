import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx, focusRing } from "./cx";
import { boxSize, boxTone } from "./ValueBox";

type Common = {
  /** Visible label above the field. */
  label: string;
  /** Applied to the outer label element. */
  className?: string;
};

export type TextInputProps =
  | (Common &
      Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "className"> & {
        /** Same sizes as ValueBox, so the input matches the value it edits. */
        size: "num" | "text";
      })
  | (Common &
      Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "rows"> & {
        /** Four lines of text, like a long ValueBox. */
        size: "long";
      });

const box = "w-full rounded-md border-control px-3";

export function TextInput(props: TextInputProps) {
  if (props.size === "long") {
    const { label, className, size, ...rest } = props;
    return (
      <label className={cx("flex flex-col gap-1", className)}>
        <span className="text-xs text-ink-3">{label}</span>
        <textarea
          {...rest}
          rows={4}
          className={cx(box, "min-h-13 resize-y py-2", boxTone.default, boxSize[size], focusRing)}
        />
      </label>
    );
  }
  const { label, className, size, type = "text", ...rest } = props;
  return (
    <label className={cx("flex flex-col gap-1", className)}>
      <span className="text-xs text-ink-3">{label}</span>
      <input
        {...rest}
        type={type}
        className={cx(box, "h-13", boxTone.default, boxSize[size], focusRing)}
      />
    </label>
  );
}
