import type { ReactNode } from "react";
import type { ClaimStatus } from "@shared/contract";
import { Badge, Busy, IconCheck, IconTriangle, type BadgeProps } from "../../ui";

// Per G-blocks "Run status chip": outline pills, except a failed run (attn tint + triangle) and a
// reviewed claim (you tint + blue check).
function chip(status: ClaimStatus): { text: string; tone: BadgeProps["tone"]; icon?: ReactNode } {
  switch (status) {
    case "queued":
      return { text: "Queued", tone: "outline" };
    case "running":
      return { text: "Running", tone: "outline", icon: <Busy /> };
    case "needs_review":
      return { text: "Needs review", tone: "outline" };
    case "failed":
      return { text: "Run failed", tone: "attn", icon: <IconTriangle size={12} /> };
    case "reviewed":
      return { text: "Reviewed", tone: "you", icon: <IconCheck size={12} /> };
    default: {
      const never: never = status;
      return never;
    }
  }
}

export function RunStatusChip({ status }: { status: ClaimStatus }) {
  const { text, tone, icon } = chip(status);
  return (
    <Badge shape="pill" tone={tone} icon={icon}>
      {text}
    </Badge>
  );
}
