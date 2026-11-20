import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ClaimParams, type ClaimDetail } from "@shared/contract";
import { groupFields } from "@shared/domain";
import { ApiFailure } from "../../api/http";
import { useClaim } from "../../api/queries";
import { useFieldOrder, useRunField, useRunMeta, useRunStore, useSummary } from "../../api/runStore";
import type { FieldView, RunState } from "@shared/domain";
import { useRunSubscription } from "../../api/subscribe";
import { Button, Message, Skeleton } from "../../ui";
import { AgentStepLine } from "./AgentStepLine";
import { ClaimHeader } from "./ClaimHeader";
import { DocumentPanel } from "./DocumentPanel";
import { FieldCard } from "./FieldCard";
import { FieldFilter, type FilterId } from "./FieldFilter";
import { FieldRow } from "./FieldRow";
import { FieldSection } from "./FieldSection";
import { ReviewLayout } from "./ReviewLayout";
import { SummaryView } from "./SummaryView";
import { useFieldViews } from "./useFieldViews";

export function ReviewPage() {
  const raw = useParams();
  const params = ClaimParams.safeParse(raw);
  if (!params.success) return <ClaimNotFound claimId={raw.claimId ?? ""} />;
  // A new claim id starts a fresh screen: filter, subscription and all.
  return <ReviewClaim key={params.data.claimId} claimId={params.data.claimId} />;
}

function ClaimNotFound({ claimId }: { claimId: string }) {
  const navigate = useNavigate();
  return (
    <main>
      <Message
        headline="Claim not found"
        body={`There is no claim ${claimId}.`}
        action={
          <Button variant="secondary" autoFocus onClick={() => navigate("/")}>
            Back to queue
          </Button>
        }
      />
    </main>
  );
}

function ReviewClaim({ claimId }: { claimId: string }) {
  const claim = useClaim(claimId);
  if (claim.isPending) {
    return (
      <main className="mx-auto w-full max-w-xl p-8">
        <Skeleton label="Loading claim" />
      </main>
    );
  }
  if (claim.isError) {
    if (claim.error instanceof ApiFailure && claim.error.status === 404) return <ClaimNotFound claimId={claimId} />;
    return (
      <main>
        <Message
          error
          headline="Can't reach the server"
          body="Check your connection, then try again."
          action={
            <Button variant="primary" autoFocus onClick={() => void claim.refetch()}>
              Try again
            </Button>
          }
        />
      </main>
    );
  }
  return <ReviewScreen detail={claim.data} />;
}

function ReviewScreen({ detail }: { detail: ClaimDetail }) {
  const claimId = detail.claim.claim_id;
  useRunSubscription(claimId);
  const [filter, setFilter] = useState<FilterId>("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const meta = useRunMeta(claimId);
  const fieldOrder = useFieldOrder(claimId);
  const views = useFieldViews(claimId);

  // Config order, then each group's field order. Rows never re-sort; a row fills its slot on arrival.
  const groups = groupFields(detail.field_groups, fieldOrder);
  const byId = new Map(views.map((v) => [v.field_id, v]));
  const ordered = groups.flatMap((g) => g.field_ids);
  const defaultField = ordered.find((id) => byId.get(id)?.needsYou) ?? ordered[0];
  const fieldParam = searchParams.get("field");
  const openId = fieldParam ?? defaultField;

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

  const select = (fieldId: string) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("field", fieldId);
        return next;
      },
      { replace: true },
    );

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
  const openView = openId === undefined ? undefined : byId.get(openId);
  const openGroup = groups.find((g) => openId !== undefined && g.field_ids.includes(openId))?.name ?? null;

  return (
    <ReviewLayout
      header={<ClaimHeader detail={detail} views={views} />}
      steps={<AgentStepLine steps={meta.steps} error={meta.error} notChecked={detail.not_checked} />}
      list={
        <div className="flex flex-col gap-3 p-4">
          <FieldFilter value={filter} onChange={setFilter} counts={counts} />
          {/* Filtered-out rows stay mounted and hidden, so a filter switch doesn't replay their fade-in. */}
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
                  <FieldRow key={id} view={view} selected={id === openId} hidden={!shows(id)} onSelect={select} />
                ) : null;
              })}
            </FieldSection>
          ))}
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
          <OpenField claimId={claimId} view={openView} group={openGroup} />
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

type OpenFieldProps = { claimId: string; view: FieldView; group: string | null };

function OpenField({ claimId, view, group }: OpenFieldProps) {
  // The card's confidence-change line and agent line read the field's history.
  const field = useRunField(claimId, view.field_id);
  const startedAt = useRunStore((s) => s.runs[claimId]?.started_at ?? null);
  return field ? <FieldCard view={view} field={field} group={group} startedAt={startedAt} /> : null;
}

function NoOpenField({ fieldId, runStatus }: { fieldId: string | undefined; runStatus: RunState["status"] }) {
  if (runStatus === "not_started") {
    return <Message headline="Waiting for the agent to start" body="Fields appear here as the agent reads the documents." />;
  }
  if (fieldId === undefined || runStatus === "running") {
    return <Message headline="No field open yet" body="Fields appear here as the agent reads the documents." />;
  }
  return <Message headline="Field not found" body={`This claim has no field “${fieldId}”. Pick one from the list.`} />;
}
