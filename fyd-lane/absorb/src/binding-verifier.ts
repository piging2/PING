/**
 * C3 — ADD-only evidence verification for presentation bindings
 *      (accumulate -> verify -> rank/drop), with C6 causation fields riding along.
 *
 * HARVESTED PATTERN (not copied code):
 *   SOURCE: /home/nolan/ping, ping-runtime/evidence/evidence_authority.js
 *           (EvidenceAuthority: accumulate / verify / rank; file header law:
 *           "this authority never mutates events, only reads"; verify =
 *           recompute canonical hash + lineage + namespace consistency;
 *           rank = confidence x provenance x approval, down-rank fallback/
 *           rejected, null confidence -> 0.5 NEVER 1.0)
 *         + ping-runtime/workers/canonical_workers.js (BaseWorker._emit:
 *           causation_id preserved, confidence_source = 'inherited' tagged,
 *           explicit null distinguished from missing)
 *   EVIDENCE: ~/workspace/fyd-lane/harvest-wave1/code-evidence/{evidence_authority.js,canonical_workers.js}
 *
 * FYD wrapper: verifyPresentationBinding(binding, graph) — the mechanical core
 * of "NO CUSTOMER FACT WITHOUT A TRACEABLE BASIS." Every candidate binding for
 * a render is verified by recomputing the claim's evidence hash and walking
 * claim -> evidence -> observation -> source. Unsupported / missing / tampered
 * evidence FAILS CLOSED (UNVERIFIED) — never "healthy". Unverifiable bindings
 * are dropped from the presentation set, never rendered.
 *
 * This authority never mutates the graph. It only reads. (PING header law, kept.)
 */

import { createHash } from 'node:crypto';

/** C6: every derived claim records where its confidence came from. */
export type ConfidenceSource = 'direct' | 'derived' | 'inherited' | 'owner-asserted';

export interface SourceRecord {
  id: string;
  uri: string;
  observedAt: string;
}

export interface ObservationRecord {
  id: string;
  sourceId: string;
  text: string;
  namespace?: string;
}

export interface EvidenceRecord {
  id: string;
  observationId: string;
  /** The exact canonical bytes the evidence hash was computed over. */
  canonicalBytes: string;
  /** sha256(canonicalBytes) as recorded at evidence-commit time. */
  evidenceHash: string;
  namespace?: string;
  /** 0..1; null/undefined means unassessed (NOT 1.0). */
  provenance?: number | null;
  rejected?: boolean;
  /** C6: id of the observation this evidence derives from. */
  causationId: string;
  /** C6: how this evidence's confidence was obtained. */
  confidenceSource: ConfidenceSource;
}

export interface ClaimRecord {
  id: string;
  text: string;
  evidenceId: string;
  /** null = unassessed (ranks at 0.5, never above an explicit assessment). */
  confidence: number | null;
  /** C6: id of the evidence this claim derives from. */
  causationId: string;
  /** C6: how this claim's confidence was obtained. */
  confidenceSource: ConfidenceSource;
  namespace?: string;
}

export interface PresentationBinding {
  id: string;
  claimId: string;
  slot: string;
}

export interface GraphLike {
  sources: Map<string, SourceRecord>;
  observations: Map<string, ObservationRecord>;
  evidence: Map<string, EvidenceRecord>;
  claims: Map<string, ClaimRecord>;
}

export interface BindingChecks {
  claim: boolean;
  evidenceHash: boolean;
  observation: boolean;
  source: boolean;
  namespace: boolean;
}

export interface BindingVerdict {
  bindingId: string;
  verified: boolean;
  reason: string | null;
  checks: BindingChecks;
}

export interface RankedBinding {
  binding: PresentationBinding;
  claim: ClaimRecord;
  rankScore: number;
}

/** Recompute the evidence hash exactly as it was committed. */
export function recomputeEvidenceHash(canonicalBytes: string): string {
  return createHash('sha256').update(canonicalBytes, 'utf8').digest('hex');
}

/**
 * WHY THIS chain walk (C6): claim -> evidence -> observation -> source.
 * Returns the full chain when intact, or reports exactly where it broke.
 * A dropped/deleted record is reported as a broken chain (UNVERIFIED), never
 * silently treated as intact.
 */
export function walkCausation(
  claimId: string,
  graph: GraphLike
): { complete: true; chain: { claim: string; evidence: string; observation: string; source: string } } |
  { complete: false; brokenAt: 'claim' | 'evidence' | 'observation' | 'source' } {
  const claim = graph.claims.get(claimId);
  if (!claim) return { complete: false, brokenAt: 'claim' };
  const evidence = graph.evidence.get(claim.evidenceId);
  if (!evidence) return { complete: false, brokenAt: 'evidence' };
  const observation = graph.observations.get(evidence.observationId);
  if (!observation) return { complete: false, brokenAt: 'observation' };
  const source = graph.sources.get(observation.sourceId);
  if (!source) return { complete: false, brokenAt: 'source' };
  return {
    complete: true,
    chain: { claim: claim.id, evidence: evidence.id, observation: observation.id, source: source.id },
  };
}

export class BindingVerifier {
  private readonly _bindings: PresentationBinding[] = [];

  /** Accumulate candidate presentation bindings (ADD-only; nothing is mutated). */
  accumulate(bindings: PresentationBinding[]): void {
    this._bindings.push(...bindings);
  }

  get size(): number {
    return this._bindings.length;
  }

  /**
   * Verify one binding: recompute the claim's evidence hash and walk the full
   * lineage. Any failure is FAIL CLOSED — verified: false with a reason.
   * Unsupported / missing / tampered evidence NEVER becomes "healthy".
   */
  verify(binding: PresentationBinding, graph: GraphLike): BindingVerdict {
    const checks: BindingChecks = {
      claim: false,
      evidenceHash: false,
      observation: false,
      source: false,
      namespace: false,
    };
    const fail = (reason: string): BindingVerdict => ({
      bindingId: binding.id,
      verified: false,
      reason,
      checks,
    });

    if (!binding || typeof binding.claimId !== 'string') {
      return fail('unsupported_binding: missing claimId');
    }
    const claim = graph.claims.get(binding.claimId);
    if (!claim) return fail('missing_claim');
    checks.claim = true;

    const evidence = graph.evidence.get(claim.evidenceId);
    if (!evidence) return fail('missing_evidence');
    if (evidence.rejected === true) return fail('evidence_rejected');
    if (typeof evidence.canonicalBytes !== 'string' || typeof evidence.evidenceHash !== 'string') {
      return fail('unsupported_evidence: no hashable bytes');
    }
    if (recomputeEvidenceHash(evidence.canonicalBytes) !== evidence.evidenceHash) {
      return fail('tampered_evidence: hash mismatch on recompute');
    }
    checks.evidenceHash = true;

    const observation = graph.observations.get(evidence.observationId);
    if (!observation) return fail('missing_observation');
    checks.observation = true;

    const source = graph.sources.get(observation.sourceId);
    if (!source) return fail('missing_source');
    checks.source = true;

    // Namespace consistency (harvested: object.namespace vs identity.namespace).
    const evNs = evidence.namespace;
    const clNs = claim.namespace;
    if (evNs && clNs && evNs !== clNs) return fail('namespace_mismatch');
    checks.namespace = true;

    return { bindingId: binding.id, verified: true, reason: null, checks };
  }

  /**
   * Accumulate -> verify -> rank/drop. Returns bindings safe to render plus
   * the rejected ones with their verdicts. Unverifiable bindings are DROPPED
   * from the presentation set, never rendered.
   */
  verifyAll(graph: GraphLike): {
    verified: RankedBinding[];
    rejected: { binding: PresentationBinding; verdict: BindingVerdict }[];
  } {
    const ok: { binding: PresentationBinding; claim: ClaimRecord }[] = [];
    const rejected: { binding: PresentationBinding; verdict: BindingVerdict }[] = [];
    for (const binding of this._bindings) {
      const verdict = this.verify(binding, graph);
      if (verdict.verified) {
        ok.push({ binding, claim: graph.claims.get(binding.claimId)! });
      } else {
        rejected.push({ binding, verdict });
      }
    }
    return { verified: this.rank(ok, graph), rejected };
  }

  /**
   * Rank by confidence x provenance. Down-ranks rejected evidence (never
   * reaches here — rejected evidence fails verification). Null confidence ->
   * 0.5: below any explicit assessment but above rejected. NEVER 1.0 — ranking
   * unknown above moderate would be the "missing evidence becomes HEALTHY"
   * failure in ranking form.
   */
  rank(
    pairs: { binding: PresentationBinding; claim: ClaimRecord }[],
    graph: GraphLike
  ): RankedBinding[] {
    const scored = pairs.map(({ binding, claim }) => {
      const evidence = graph.evidence.get(claim.evidenceId)!;
      const effectiveConfidence = claim.confidence != null ? claim.confidence : 0.5;
      const provenance = evidence.provenance != null ? evidence.provenance : 0.5;
      return { binding, claim, rankScore: effectiveConfidence * provenance };
    });
    scored.sort((a, b) => b.rankScore - a.rankScore);
    return scored;
  }
}
