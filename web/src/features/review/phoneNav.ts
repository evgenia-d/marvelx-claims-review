/** Router state on a phone field screen: it was opened from the list, so one back returns there. */
export type FromList = { fromList: true };

export const cameFromList = (state: unknown): state is FromList =>
  typeof state === "object" && state !== null && "fromList" in state && state.fromList === true;

/** Back from a phone field: history back when it came from the list, else drop `?field=` (deep link, reload). */
export const backAction = (state: unknown): "history" | "replace" => (cameFromList(state) ? "history" : "replace");
