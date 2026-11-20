import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { cx } from "./cx";

/** Roles are explicit because `display` changes below `lg` make Safari drop table semantics.
 * Below `lg` the same markup restyles as cards: the header row hides, each row becomes a card. */
export function Table({ className, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return <table role="table" {...rest} className={cx("w-full border-collapse text-left max-lg:block", className)} />;
}

export function TableHead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead role="rowgroup" {...rest} className={cx("max-lg:sr-only", className)} />;
}

export function TableBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody role="rowgroup" {...rest} className={cx("max-lg:flex max-lg:flex-col max-lg:gap-3", className)} />;
}

export function TableHeaderCell({ className, scope = "col", ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      role="columnheader"
      {...rest}
      scope={scope}
      className={cx(
        "h-8 border-b border-line px-3 font-mono text-xs font-normal tracking-eyebrow text-ink-3 uppercase",
        className,
      )}
    />
  );
}

/**
 * With `onClick` the whole row is clickable for the mouse. Keyboard users need a real link or button
 * inside the row, which the caller provides.
 */
export function TableRow({ className, onClick, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      role="row"
      {...rest}
      onClick={onClick}
      className={cx(
        "border-b border-line hover:bg-subtle lg:h-13",
        "max-lg:flex max-lg:flex-wrap max-lg:items-center max-lg:gap-x-3 max-lg:gap-y-1 max-lg:rounded-lg max-lg:border max-lg:bg-surface max-lg:p-4",
        onClick && "cursor-pointer",
        className,
      )}
    />
  );
}

export function TableCell({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td role="cell" {...rest} className={cx("px-3 text-base text-ink max-lg:px-0", className)} />;
}
