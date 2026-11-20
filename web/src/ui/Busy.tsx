/** A pulsing dot. Always put text beside it; the dot alone says nothing. */
export function Busy() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-1.5 shrink-0 rounded-full bg-ink animate-live motion-reduce:animate-none"
    />
  );
}
