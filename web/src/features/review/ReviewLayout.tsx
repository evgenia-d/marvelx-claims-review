import type { ReactNode } from "react";
import { useIsLaptop } from "../../ui";

type Props = {
  header: ReactNode;
  steps: ReactNode;
  list: ReactNode;
  /** Below the field list, in the same scrolling pane but outside the "Fields" nav. */
  summary: ReactNode;
  field: ReactNode;
  document: ReactNode;
  /** Phone list screen only: progress and Complete review, pinned to the bottom. */
  footer?: ReactNode;
  /** Phone only: the open field's whole screen (top bar and card). When set it replaces the list screen. */
  phoneField?: ReactNode;
};

/**
 * Laptop (lg and up): header and step line, then three panes that scroll on their own: field list
 * 320, open field fluid, source document 400. Landmarks: nav "Fields", main, aside "Source document".
 *
 * Phone: the list is the screen (header, step line, then one `main` with the nav "Fields" and the
 * summary, footer). A field opens full screen, with its own `main`. The list stays mounted
 * underneath (hidden), so going back doesn't replay row animations or reset the filter.
 */
export function ReviewLayout({ header, steps, list, summary, field, document, footer, phoneField }: Props) {
  const laptop = useIsLaptop();

  if (laptop) {
    return (
      <div className="flex h-dvh flex-col">
        {header}
        {steps}
        <div className="flex min-h-0 flex-1">
          <div className="w-80 shrink-0 overflow-y-auto border-r border-line">
            <nav aria-label="Fields">{list}</nav>
            {summary}
          </div>
          <main className="min-w-0 flex-1 overflow-y-auto bg-surface">{field}</main>
          <aside aria-label="Source document" className="w-100 shrink-0 overflow-y-auto border-l border-line">
            {document}
          </aside>
        </div>
      </div>
    );
  }

  const fieldOpen = phoneField !== undefined;
  return (
    <>
      <div className="flex min-h-dvh flex-col" hidden={fieldOpen}>
        {header}
        {steps}
        <main className="flex-1">
          <nav aria-label="Fields">{list}</nav>
          {summary}
        </main>
        {footer}
      </div>
      {fieldOpen && <main className="flex min-h-dvh flex-col bg-surface">{phoneField}</main>}
    </>
  );
}
