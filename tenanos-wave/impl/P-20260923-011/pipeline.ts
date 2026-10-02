/**
 * TenantOS routing seam under capability authority (convergence wave, E4).
 *
 * Authority contract:
 * - The capability authority (e.g. src/tenanos/tools/auth_boundary.ts,
 *   proposal P-20260923-007) decides WHETHER a call may proceed and hands the
 *   router the *authorized* candidate set. This module never sees, invents, or
 *   widens that set.
 * - The router decides WHERE/HOW: which authorized provider/model/connection
 *   serves the call. It never re-decides WHETHER.
 * - Ordering invariant with budgets (src/tenanos/budgets.ts, C5): budget
 *   check -> capability decision -> routing. A budget denial means the
 *   capability question is never asked; a capability denial means the router
 *   is never consulted.
 *
 * All outcomes are typed values; this module never throws for routing
 * outcomes. The routing receipt is journal-grade data: the caller appends it
 * to the journal; this module performs no I/O and holds no journal handle.
 *
 * Pure and deterministic: no imports, no I/O. Scores are stable: identical
 * inputs always select the same candidate.
 */

export type Clock = () => number;
const DEFAULT_CLOCK: Clock = Date.now;

/**
 * A provider/model/connection triple the capability authority has already
 * authorized for this call. The router may only choose among these.
 */
export interface AuthorizedCandidate {
  providerId: string;
  modelId: string;
  connectionId: string;
  /** Fencing token of the attempt this candidate is leased to, when any. */
  leaseId?: string;
}

/** Execution policy bound to the run by the executor (tenant > mission > run). */
export interface ProviderExecutionPolicy {
  /** When false, only allowedModels may serve; no silent substitution. */
  allowModelFallback: boolean;
  /** Exact model IDs permitted for this run. */
  allowedModels: readonly string[];
  /** Connection the run is bound to; anything else is a misroute. */
  expectedConnectionId: string;
  /** When set, only a candidate holding this lease may serve. */
  expectedLeaseId?: string;
}

export interface RoutingRequest {
  tenantId: string;
  runId: string;
  /** The capability the authority authorized (e.g. "llm.complete"). */
  requestedCapability: string;
  /** The model the caller asked for; may be absent when any allowed model serves. */
  requestedModelId?: string;
  /** ONLY the capability-authorized set. Never wider. */
  candidates: readonly AuthorizedCandidate[];
  policy: ProviderExecutionPolicy;
}

export interface CandidateScore {
  candidate: AuthorizedCandidate;
  score: number;
  reasons: readonly string[];
}

/**
 * Typed routing denial. Every variant is an enumerable outcome, never an
 * exception. `detail` carries the evidence a human or a replay needs.
 */
export type RoutingDenial =
  | { code: "NO_CANDIDATES"; detail: string }
  | { code: "MODEL_NOT_ALLOWED"; detail: string; requestedModelId?: string }
  | { code: "MODEL_FALLBACK_NOT_ALLOWED"; detail: string; requestedModelId?: string }
  | { code: "CONNECTION_MISMATCH"; detail: string; expectedConnectionId: string }
  | { code: "LEASE_MISMATCH"; detail: string; expectedLeaseId: string };

/** Routing receipt: journal-grade evidence of the routing decision. */
export interface RoutingReceipt {
  tenantId: string;
  runId: string;
  requestedCapability: string;
  requestedModelId?: string;
  selectedProviderId: string;
  selectedModelId: string;
  selectedConnectionId: string;
  scores: readonly CandidateScore[];
  /** ISO-8601. */
  at: string;
}

export type RoutingOutcome =
  | { ok: true; selected: AuthorizedCandidate; scores: readonly CandidateScore[]; receipt: RoutingReceipt }
  | { ok: false; denial: RoutingDenial };

function deny(denial: RoutingDenial): RoutingOutcome {
  return { ok: false, denial };
}

/**
 * Filter the authorized set down to policy-eligible candidates, scoring each.
 * Deterministic: higher score wins; ties break on providerId, then modelId,
 * then connectionId (all lexicographic), so identical inputs pick identically.
 *
 * Scoring (all weights are part of the contract, keep them stable):
 * +100 exact requested-model match
 * +40  model inside allowedModels (when fallback is in play)
 * +20  candidate holds the expected lease
 * +10  connection matches expectedConnectionId (eligibility, not a bonus
 *       over mismatch: mismatches are excluded, not down-ranked)
 */
export function route(request: RoutingRequest, clock: Clock = DEFAULT_CLOCK): RoutingOutcome {
  const { candidates, policy } = request;

  if (candidates.length === 0) {
    return deny({
      code: "NO_CANDIDATES",
      detail: "capability authority returned an empty authorized set; the router synthesizes nothing",
    });
  }

  // 1. Lease-mismatch guard: when the run is lease-bound, only the lease
  //    holder is eligible. A stale or foreign lease is a hard exclusion.
  let eligible = candidates;
  if (policy.expectedLeaseId !== undefined) {
    eligible = eligible.filter((c) => c.leaseId === policy.expectedLeaseId);
    if (eligible.length === 0) {
      return deny({
        code: "LEASE_MISMATCH",
        detail: `no authorized candidate holds lease ${policy.expectedLeaseId}; possible zombie attempt or lease theft`,
        expectedLeaseId: policy.expectedLeaseId,
      });
    }
  }

  // 2. Connection binding: the run is bound to one connection. Anything else
  //    is a misroute, excluded, never down-ranked.
  eligible = eligible.filter((c) => c.connectionId === policy.expectedConnectionId);
  if (eligible.length === 0) {
    return deny({
      code: "CONNECTION_MISMATCH",
      detail: `no authorized candidate on connection ${policy.expectedConnectionId}`,
      expectedConnectionId: policy.expectedConnectionId,
    });
  }

  // 3. Model allow-list. The requested model must be allowed; when fallback
  //    is disabled there is no silent substitution.
  const requested = request.requestedModelId;
  if (requested !== undefined && !policy.allowedModels.includes(requested)) {
    return deny({
      code: "MODEL_NOT_ALLOWED",
      detail: `requested model ${requested} is outside the run allow-list`,
      requestedModelId: requested,
    });
  }
  if (
    requested !== undefined &&
    !policy.allowModelFallback &&
    !eligible.some((c) => c.modelId === requested)
  ) {
    return deny({
      code: "MODEL_FALLBACK_NOT_ALLOWED",
      detail: `requested model ${requested} has no authorized candidate and fallback is disabled`,
      requestedModelId: requested,
    });
  }

  // When fallback is allowed, only allowed models may serve.
  eligible = eligible.filter(
    (c) => policy.allowedModels.includes(c.modelId) || c.modelId === requested,
  );
  if (eligible.length === 0) {
    return deny({
      code: "MODEL_NOT_ALLOWED",
      detail: "no authorized candidate serves an allowed model",
      requestedModelId: requested,
    });
  }

  // 4. Score the survivors and pick deterministically.
  const scores: CandidateScore[] = eligible.map((candidate) => {
    const reasons: string[] = [];
    let score = 0;
    if (requested !== undefined && candidate.modelId === requested) {
      score += 100;
      reasons.push("exact requested-model match");
    } else if (policy.allowedModels.includes(candidate.modelId)) {
      score += 40;
      reasons.push("model inside run allow-list (fallback)");
    }
    if (policy.expectedLeaseId !== undefined && candidate.leaseId === policy.expectedLeaseId) {
      score += 20;
      reasons.push("holds expected lease");
    }
    score += 10;
    reasons.push("connection binding satisfied");
    return { candidate, score, reasons };
  });

  scores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.candidate.providerId !== b.candidate.providerId)
      return a.candidate.providerId < b.candidate.providerId ? -1 : 1;
    if (a.candidate.modelId !== b.candidate.modelId)
      return a.candidate.modelId < b.candidate.modelId ? -1 : 1;
    return a.candidate.connectionId < b.candidate.connectionId ? -1 : 1;
  });

  const selected = scores[0].candidate;
  const receipt: RoutingReceipt = {
    tenantId: request.tenantId,
    runId: request.runId,
    requestedCapability: request.requestedCapability,
    requestedModelId: requested,
    selectedProviderId: selected.providerId,
    selectedModelId: selected.modelId,
    selectedConnectionId: selected.connectionId,
    scores,
    at: new Date(clock()).toISOString(),
  };
  return { ok: true, selected, scores, receipt };
}
