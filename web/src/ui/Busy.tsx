/**
 * A pulsing dot in a 16 px slot, the size of a button icon, so a button that shows it in place of
 * its icon keeps its width. Always put text beside it; the dot alone says nothing.
 */
export function Busy() {
  return (
    <span aria-hidden="true" className="inline-flex size-4 shrink-0 items-center justify-center">
      <span className="size-1.5 rounded-full bg-ink animate-live motion-reduce:animate-none" />
    </span>
  );
}
