import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { ClaimParams, type ClaimDetail } from "@shared/contract";
import { failedStep, groupFields } from "@shared/domain";
import { ApiFailure } from "../../api/http";
import { useClaim } from "../../api/queries";
import {
  useFieldOrder,
  useFieldsAtSync,
  useRunField,
  useRunMeta,
  useRunStore,
  useSummary,
  useSynced,
} from "../../api/runStore";
import type { FieldView, RunState } from "@shared/domain";
import { useRunSubscription } from "../../api/subscribe";
import { Message } from "../../ui";
import { AgentStepLine } from "./AgentStepLine";
import { ClaimHeader } from "./ClaimHeader";
import { RunFailedLine } from "./RunFailedLine";
import { DocumentPanel } from "./DocumentPanel";
import { FieldCard } from "./FieldCard";
import { FieldFilter, type FilterId } from "./FieldFilter";
import { FieldRow } from "./FieldRow";
import { FieldSection } from "./FieldSection";
import { nextFieldId } from "./nextField";
import { ReviewLayout } from "./ReviewLayout";
import { ClaimNotFound, ClaimUnavailable, WaitingForAgent } from "./ReviewStates";
import { ReviewSkeleton } from "./ReviewSkeleton";
import { SummaryView } from "./SummaryView";
import { useFieldViews } from "./useFieldViews";

export function ReviewPage() {
  const raw = useParams();
  const params = ClaimParams.safeParse(raw);
  if (!params.success) return <ClaimNotFound claimId={raw.claimId ?? ""} />;
  // A new claim id starts a fresh screen: filter, subscription and all.
  return <ReviewClaim key={params.data.claimId} claimId={params.data.claimId} />;
}

function ReviewClaim({ claimId }: { claimId: string }) {
  const claim = useClaim(claimId);
  // The stream starts with the claim request, not after it. Until its backlog is in, the run store
  // is partial (or empty, which reads as "not started"), so the screen waits for both and then
  // shows the run as it is now, in one step.
  // A claim the server says doesn't exist has no stream to keep reopening.
  useRunSubscription(claimId, !(claim.error instanceof ApiFailure && claim.error.status === 404));
  const synced = useSynced(claimId);
  // One skeleton from route open to synced: the same element in the same place, so it fills in
  // (claim id and claimant first) instead of being swapped for another loading layout.
  if (claim.isPending) return <ReviewSkeleton claimId={claimId} detail={undefined} />;
  if (claim.isError) {
    if (claim.error instanceof ApiFailure && claim.error.status === 404) return <ClaimNotFound claimId={claimId} />;
    return <ClaimUnavailable claimId={claimId} error={claim.error} onRetry={() => void claim.refetch()} />;
  }
  if (!synced) return <ReviewSkeleton claimId={claimId} detail={claim.data} />;
  return <ReviewContent detail={claim.data} />;
}

function ReviewContent({ detail }: { detail: ClaimDetail }) {
  const claimId = detail.claim.claim_id;
  const [filter, setFilter] = useState<FilterId>("all");
  // The field the screen just moved to after a decision: its card takes focus when it opens.
  const [advancedTo, setAdvancedTo] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const meta = useRunMeta(claimId);
  const fieldOrder = useFieldOrder(claimId);
  const fieldsAtSync = useFieldsAtSync(claimId);
  const views = useFieldViews(claimId);

  // Config order, then each group's field order. Rows never re-sort; a row fills its slot on arrival.
  const groups = groupFields(detail.field_groups, fieldOrder);
  const byId = new Map(views.map((v) => [v.field_id, v]));
  const ordered = groups.flatMap((g) => g.field_ids);
  const defaultField = ordered.find((id) => byId.get(id)?.needsYou) ?? ordered[0];
  const fieldParam = searchParams.get("field");
  const openId = fieldParam ?? defaultField;

  // Rows that were already there when the stream caught up don't fade in; only live arrivals do.
  const arrivedLive = new Set(fieldOrder.slice(fieldsAtSync));

  // Pin the default into the URL once, so it doesn't move as more fields arrive. Once ?field= is
  // set (by this or by the reviewer) it is never changed for them.
  useEffect(() => {
    if (fieldParam !== null || defaultField === undefined) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("field", defaultField);
        return next;
      },
      { replace: true },
    );
  }, [fieldParam, defaultField, setSearchParams]);

  const openField = (fieldId: string) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("field", fieldId);
        return next;
      },
      { replace: true },
    );

  // A row click: the reviewer chose the field, so nothing takes focus from the row.
  const select = (fieldId: string) => {
    setAdvancedTo(null);
    openField(fieldId);
  };

  const undecided = views.filter((v) => v.status === "pending" || v.status === "revised_after_decision");
  const counts = { needs_you: views.filter((v) => v.needsYou).length, to_review: undecided.length, all: views.length };
  const shows = (id: string) => {
    const view = byId.get(id);
    if (!view) return false;
    if (filter === "needs_you") return view.needsYou;
    if (filter === "to_review") return view.status === "pending" || view.status === "revised_after_decision";
    return true;
  };
  // While the run is live, the group holding the newest field is the one being read.
  const latestField = fieldOrder.at(-1);
  const readingGroup = meta.status === "running" ? groups.find((g) => latestField && g.field_ids.includes(latestField))?.name : undefined;
  const anyShown = ordered.some(shows);
  const failed = failedStep(meta);
  // What a failed run never got to, said under the fields; the filter never hides it.
  const notCheckedText = failed ? detail.not_checked[failed.step_id] : undefined;
  const openView = openId === undefined ? undefined : byId.get(openId);
  // After a decision is saved: the next field still to decide that the filter shows, below the
  // current one, then from the top. With none left, the screen stays on the decided field.
  const advanceFrom = (fieldId: string) => {
    const left = new Set(undecided.map((v) => v.field_id));
    const next = nextFieldId(ordered, fieldId, (id) => left.has(id) && shows(id));
    if (next === null) return;
    setAdvancedTo(next);
    openField(next);
  };
  const openGroup = groups.find((g) => openId !== undefined && g.field_ids.includes(openId))?.name ?? null;

  return (
    <ReviewLayout
      header={<ClaimHeader detail={detail} views={views} failed={failed} />}
      steps={
        <>
          {meta.status === "failed" && meta.error && (
            <RunFailedLine error={meta.error} stepLabel={failed?.label} notChecked={detail.not_checked} />
          )}
          <AgentStepLine steps={meta.steps} status={meta.status} error={meta.error} notChecked={detail.not_checked} />
        </>
      }
      list={
        <div className="flex flex-col gap-3 p-4">
          <FieldFilter value={filter} onChange={setFilter} counts={counts} />
          {/* Filtered-out rows stay mounted and hidden; ListRow drops its fade-in once played, so showing a row again doesn't replay it. */}
          {groups.map((group) => (
            <FieldSection
              key={group.name}
              name={group.name}
              reading={group.name === readingGroup}
              hidden={!group.field_ids.some(shows)}
            >
              {group.field_ids.map((id) => {
                const view = byId.get(id);
                return view ? (
                  <FieldRow
                    key={id}
                    view={view}
                    arrive={arrivedLive.has(id)}
                    selected={id === openId}
                    hidden={!shows(id)}
                    onSelect={select}
                  />
                ) : null;
              })}
            </FieldSection>
          ))}
          {views.length === 0 && <p className="px-2 text-sm text-ink-3">No fields yet</p>}
          {notCheckedText && (
            <FieldSection name="Not checked" reading={false} hidden={false}>
              <li className="px-2 py-1">
                <p className="text-base text-ink-2">{notCheckedText.charAt(0).toUpperCase() + notCheckedText.slice(1)}</p>
                <p className="text-sm text-ink-3">{failed?.label ?? "The run"} failed before these were checked.</p>
              </li>
            </FieldSection>
          )}
          {views.length > 0 && !anyShown && (
            <p className="px-2 text-sm text-ink-3">
              {filter === "needs_you" ? "No fields need you right now." : "Every field has a decision."}
            </p>
          )}
        </div>
      }
      summary={<LiveSummary claimId={claimId} />}
      field={
        openView ? (
          // Keyed by field: a draft or save message never carries over to another field, while agent
          // updates to this field re-render the same card and keep what the reviewer is typing.
          <OpenField
            key={openView.field_id}
            claimId={claimId}
            view={openView}
            group={openGroup}
            completedAt={detail.claim.completed_at}
            onDecided={() => advanceFrom(openView.field_id)}
            focusOnMount={advancedTo === openView.field_id}
          />
        ) : (
          <NoOpenField fieldId={openId} runStatus={meta.status} />
        )
      }
      document={<DocumentPanel view={openView} documents={detail.documents} />}
    />
  );
}

// Its own component, so a summary chunk re-renders only the summary.
function LiveSummary({ claimId }: { claimId: string }) {
  const summary = useSummary(claimId);
  const { status } = useRunMeta(claimId);
  return <SummaryView summary={summary} status={status} />;
}

type OpenFieldProps = {
  claimId: string;
  view: FieldView;
  group: string | null;
  completedAt: string | null;
  onDecided: () => void;
  focusOnMount: boolean;
};

function OpenField({ claimId, view, group, completedAt, onDecided, focusOnMount }: OpenFieldProps) {
  // The card's confidence-change line and agent line read the field's history.
  const field = useRunField(claimId, view.field_id);
  const startedAt = useRunStore((s) => s.runs[claimId]?.started_at ?? null);
  return field ? (
    <FieldCard
      claimId={claimId}
      view={view}
      field={field}
      group={group}
      startedAt={startedAt}
      completedAt={completedAt}
      onDecided={onDecided}
      focusOnMount={focusOnMount}
    />
  ) : null;
}

function NoOpenField({ fieldId, runStatus }: { fieldId: string | undefined; runStatus: RunState["status"] }) {
  if (runStatus === "not_started") {
    return <WaitingForAgent />;
  }
  if (fieldId === undefined || runStatus === "running") {
    return <Message headline="No field open yet" body="Fields appear here as the agent reads the documents." />;
  }
  return <Message headline="Field not found" body={`This claim has no field “${fieldId}”. Pick one from the list.`} />;
}
