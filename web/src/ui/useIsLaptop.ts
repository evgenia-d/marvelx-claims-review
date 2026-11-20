import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 1024px)"; // Tailwind's lg

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

const snapshot = () => (typeof window.matchMedia === "function" ? window.matchMedia(QUERY).matches : true);

/** Laptop layout (lg and up) or phone. For behaviour that differs; purely visual differences stay CSS. Without matchMedia (jsdom) it is the laptop. */
export function useIsLaptop(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => true);
}
