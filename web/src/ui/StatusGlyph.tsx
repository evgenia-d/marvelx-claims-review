export type StatusGlyphProps = {
  kind: "ring" | "done" | "attn" | "error";
  size?: 12 | 14;
};

/** Decorative. The text next to it carries the meaning. */
export function StatusGlyph({ kind, size = 14 }: StatusGlyphProps) {
  return (
    <svg
      viewBox="0 0 14 14"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      {kind === "ring" && (
        <circle cx="7" cy="7" r="6.25" fill="none" strokeWidth={1.5} className="stroke-ink-3" />
      )}
      {kind === "done" && (
        <>
          <circle cx="7" cy="7" r="7" className="fill-you" />
          <path
            d="M4 7.2 6.2 9.4 10 4.8"
            fill="none"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-on-you"
          />
        </>
      )}
      {kind === "attn" && (
        <>
          <circle cx="7" cy="7" r="7" className="fill-attn" />
          <path
            d="M7 3.6v4M7 10.2v.01"
            fill="none"
            strokeWidth={1.5}
            strokeLinecap="round"
            className="stroke-on-primary"
          />
        </>
      )}
      {kind === "error" && (
        <>
          <path
            d="M7 1.4 13 12.4H1Z"
            strokeWidth={1.5}
            strokeLinejoin="round"
            className="fill-attn stroke-attn"
          />
          <path
            d="M7 5.4v3.2M7 10.3v.01"
            fill="none"
            strokeWidth={1.25}
            strokeLinecap="round"
            className="stroke-on-primary"
          />
        </>
      )}
    </svg>
  );
}
