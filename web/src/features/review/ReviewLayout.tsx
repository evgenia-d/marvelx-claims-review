import type { ReactNode } from "react";

type Props = {
  header: ReactNode;
  steps: ReactNode;
  list: ReactNode;
  /** Below the field list, in the same scrolling pane but outside the "Fields" nav. */
  summary: ReactNode;
  field: ReactNode;
  document: ReactNode;
};

/**
 * Laptop (lg and up): header and step line, then three panes that scroll on their own: field list
 * 320, open field fluid, source document 400. Below lg it stacks in one column (phone layout is Slice G)
 * and the document panel is laptop only.
 */
export function ReviewLayout({ header, steps, list, summary, field, document }: Props) {
  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      {header}
      {steps}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="border-line lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-r">
          <nav aria-label="Fields">{list}</nav>
          {summary}
        </div>
        <main className="min-w-0 flex-1 bg-surface lg:overflow-y-auto">{field}</main>
        <aside
          aria-label="Source document"
          className="hidden border-line lg:block lg:w-100 lg:shrink-0 lg:overflow-y-auto lg:border-l"
        >
          {document}
        </aside>
      </div>
    </div>
  );
}
