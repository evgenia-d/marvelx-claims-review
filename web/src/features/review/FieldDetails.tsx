import { Disclosure } from "../../ui";

type Props = {
  /** The agent's reason for its last value change. */
  whyChanged: string | null;
  /** The reviewer's reason for replacing the value. */
  yourReason: string | null;
};

/** Longer text, closed by default: why the agent changed the value, and why you replaced it. */
export function FieldDetails({ whyChanged, yourReason }: Props) {
  if (whyChanged === null && yourReason === null) return null;
  return (
    <div className="flex flex-col border-t border-line pt-2">
      {whyChanged !== null && (
        <Disclosure summary="Why it changed">
          <p className="pb-2">{whyChanged}</p>
        </Disclosure>
      )}
      {yourReason !== null && (
        <Disclosure summary="Your reason">
          <p className="pb-2">{yourReason}</p>
        </Disclosure>
      )}
    </div>
  );
}
