import type { ClaimDetail } from "@shared/contract";
import { SkeletonBar } from "../../ui";
import { ClaimHeaderFrame } from "./ClaimHeader";
import { ReviewLayout } from "./ReviewLayout";

// Two groups of four rows: enough to fill the list pane's first screen like real fields do.
const GROUPS = [
  { id: "a", rows: ["a1", "a2", "a3", "a4"] },
  { id: "b", rows: ["b1", "b2", "b3", "b4"] },
];
const DOC_LINES = [
  { id: "l1", width: "w-3/4" },
  { id: "l2", width: "w-full" },
  { id: "l3", width: "w-5/6" },
  { id: "l4", width: "w-2/3" },
  { id: "l5", width: "w-full" },
  { id: "l6", width: "w-1/2" },
];

type Props = {
  /** The claim detail once it's in: the header then shows the real claim id and claimant. */
  detail: ClaimDetail | undefined;
};

/**
 * The review screen while the claim detail loads and the run stream catches up (SPEC A3): the same
 * layout and header frame as the real screen, with bars where run-dependent content will be, so
 * loading -> content changes only the insides. One "Loading claim" for screen readers; every bar is
 * hidden from them.
 */
export function ReviewSkeleton({ detail }: Props) {
  return (
    <ReviewLayout
      header={
        <ClaimHeaderFrame
          claim={detail?.claim}
          status={<SkeletonBar shape="pill" className="h-5.5 w-24" />}
          end={
            <>
              <div className="w-60 shrink-0">
                <SkeletonBar className="h-4 w-full" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBar shape="box" className="h-11 w-56 shrink-0 lg:h-9" />
                <SkeletonBar className="h-4 w-36" />
              </div>
            </>
          }
        />
      }
      steps={
        <div className="border-b border-line bg-ground px-4">
          <div className="flex h-11 items-center gap-2 lg:h-10">
            <SkeletonBar className="h-4 w-56" />
            <SkeletonBar className="ml-auto h-4 w-28" />
          </div>
        </div>
      }
      list={
        <div className="flex flex-col gap-3 p-4">
          <span role="status" className="sr-only">
            Loading claim
          </span>
          <SkeletonBar shape="box" className="h-11 w-full lg:h-7" />
          {GROUPS.map((group) => (
            <div key={group.id}>
              <div className="flex h-8 items-center px-2">
                <SkeletonBar className="h-3 w-20" />
              </div>
              <div className="flex flex-col gap-0.5">
                {group.rows.map((row) => (
                  <div key={row} className="flex h-13 items-center gap-2 px-2 lg:h-10">
                    <SkeletonBar shape="pill" className="size-4 shrink-0" />
                    <div className="flex flex-1 flex-col gap-1">
                      <SkeletonBar className="h-2.5 w-24" />
                      <SkeletonBar className="h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      }
      summary={null}
      field={
        <div aria-hidden="true">
          <div className="flex h-12 items-center border-b border-line px-6">
            <SkeletonBar className="h-4 w-24" />
          </div>
          <div className="flex flex-col gap-3 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SkeletonBar className="h-6 w-44" />
              <div className="flex gap-2">
                <SkeletonBar shape="box" className="h-11 w-24 lg:h-9" />
                <SkeletonBar shape="box" className="h-11 w-24 lg:h-9" />
                <SkeletonBar shape="box" className="h-11 w-24 lg:h-9" />
              </div>
            </div>
            <SkeletonBar shape="box" className="h-13 w-full" />
            <SkeletonBar className="h-4 w-56" />
          </div>
        </div>
      }
      document={
        <div aria-hidden="true">
          <div className="flex h-12 items-center border-b border-line bg-ground px-4">
            <SkeletonBar className="h-4 w-48" />
          </div>
          <div className="flex flex-col gap-2 p-4">
            {DOC_LINES.map((line) => (
              <SkeletonBar key={line.id} className={`h-4 ${line.width}`} />
            ))}
          </div>
        </div>
      }
    />
  );
}
