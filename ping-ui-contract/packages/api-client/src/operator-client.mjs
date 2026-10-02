// OperatorPingClient: full read surface plus human-gated action
// constructors. Operator actions are constructors for authority requests,
// not direct state mutation:
//
//   operator intent -> authenticated gateway -> existing authority
//   -> canonical event/state transition -> resulting projection
//
// Never: button -> direct DB update.
//
// In this slice, every operator mutation whose backend dispatch path is
// not wired returns a GAP-LABELED intent object instead of issuing a
// request. The UI must render the gap, not a functional button. When the
// backend closes a gap, the constructor starts issuing the real gateway
// call through the existing authority path; nothing else changes.

import { AuthenticatedPingClient } from "./authenticated-client.mjs";
import { gapProjection } from "../../schemas/src/index.mjs";

function gapIntent(type, id, gap, evidenceRef) {
  return {
    type,
    id,
    disposition: "GAP",
    human_gate: "required",
    ...gapProjection(type, gap, evidenceRef),
  };
}

export class OperatorPingClient extends AuthenticatedPingClient {
  constructor(transport, token) {
    super(transport, token);
  }

  /**
   * Approval grant/deny request.
   * Boundary F: SNIPPET_APPROVED lacks the ordinary runtime mapping
   * (harness path proven only). Until the authority path exists, this
   * returns a gap-labeled intent and issues NO request.
   */
  requestApprovalGrant(approvalId, decision) {
    if (!approvalId) throw new TypeError("approval id is required");
    if (!["grant", "deny"].includes(decision))
      throw new TypeError("decision must be 'grant' or 'deny'");
    return gapIntent(
      "approval-request",
      approvalId,
      "SNIPPET_APPROVED ordinary-path dispatch not wired; harness path proven only. Approval renders as PENDING_HUMAN with the gap labeled.",
      "ADR_UI_BOUNDARY_AND_PROJECTION_CONTRACT_2026-09-17.md boundary F"
    );
  }

  /**
   * Dead-letter retry request.
   * The retry path exists through the scheduler (M-18 BUILT_NOT_LIVE)
   * but no named capability or exposed retry operation exists.
   * Gap-labeled until the dispatch surface exists.
   */
  requestDeadLetterRetry(deadLetterId) {
    if (!deadLetterId) throw new TypeError("dead-letter id is required");
    return gapIntent(
      "dead-letter-retry-request",
      deadLetterId,
      "Dead-letter retry path proven through scheduler; no exposed retry operation. Retry renders gap-labeled.",
      "CAPABILITY_MATRIX_2026-09-17.md M-18"
    );
  }

  /**
   * Quarantine lift request.
   * No exposed quarantine-lift operation exists. Gap-labeled.
   */
  requestQuarantineLift(surface) {
    if (!surface) throw new TypeError("surface is required");
    return gapIntent(
      "quarantine-lift-request",
      surface,
      "No exposed quarantine-lift operation. Quarantine lift renders gap-labeled.",
      "ADR_UI_BOUNDARY_AND_PROJECTION_CONTRACT_2026-09-17.md section 4.1"
    );
  }

  get trustSurface() {
    return "OPERATOR";
  }
}
