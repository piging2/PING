// Approval queue projection: honest PENDING_HUMAN rendering.
// Boundary F: SNIPPET_APPROVED lacks the ordinary runtime mapping
// (harness path proven only). The queue shows what is waiting and labels
// the dispatch gap explicitly. It never renders a functional approval
// button where the authority path does not exist.

import { withEnvelope, gapProjection, validate } from "../../../packages/schemas/src/index.mjs";

export const APPROVAL_DISPATCH_GAP =
  "SNIPPET_APPROVED ordinary-path dispatch not wired (harness path proven only). Approvals dispatch through KnowledgePromoter; until the ordinary mapping exists, items stay PENDING_HUMAN with this gap labeled.";

/**
 * Build the approval queue from candidate proposals / revision nodes.
 * Each item: { id, kind, title, status, decided_by, evidence_ref }.
 */
export function buildApprovalQueue(items, { verifiedAt } = {}) {
  const base = {
    proof_status: "projection of pending human gates",
    verified_at: verifiedAt || new Date().toISOString(),
    source: "KnowledgePromoter / KnowledgeGraph knowledge_nodes",
    stage: "IMPLEMENTED",
  };
  return (items || []).map((item) => {
    const proj = withEnvelope(
      {
        approval_id: String(item.id ?? ""),
        kind: item.kind ?? "UNKNOWN",
        title: String(item.title ?? ""),
        status: item.status ?? "UNKNOWN",
        decided_by: item.decided_by ?? null,
        evidence_ref: item.evidence_ref ?? null,
        dispatch: item.status === "PENDING_HUMAN"
          ? gapProjection("approval-dispatch", APPROVAL_DISPATCH_GAP, "ADR_UI_BOUNDARY_AND_PROJECTION_CONTRACT_2026-09-17.md boundary F")
          : { status: "terminal", detail: item.status },
      },
      { ...base, maturity: "PROVEN", evidence_ref: item.evidence_ref || "approval queue source" }
    );
    return proj;
  });
}
