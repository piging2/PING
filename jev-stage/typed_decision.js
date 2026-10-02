/**
 * JEV P2 — Typed decision contract (shadow-only).
 *
 *   DecisionRequest → TypedDecisionProvider → TypedDecision → EvaluationRecord
 *
 * No new event database, no new tables. Evaluation records are emitted as
 * canonical events (JEV_DECISION_EVALUATED) through UnifiedEventRuntime.
 *
 * Jev has ZERO execution authority. MayExecutePolicy (P12) answers whether a
 * decision may execute; the initial policy is shadow-only.
 *
 * First domain: claim classification. Vocabulary checked against existing
 * code: no equivalent accept/reject enum exists (ClassificationWorker uses
 * category/priority, a different domain), so ACCEPT_CLAIM / REJECT_CLAIM /
 * NEEDS_MORE_EVIDENCE introduces no duplicate semantics.
 */

const CLAIM_DECISIONS = Object.freeze({
  ACCEPT_CLAIM: 'ACCEPT_CLAIM',
  REJECT_CLAIM: 'REJECT_CLAIM',
  NEEDS_MORE_EVIDENCE: 'NEEDS_MORE_EVIDENCE',
});

// P4: the one narrowly scoped evaluation event type. Registered in
// gateway/generated/event_generator.js so the live EventValidator accepts it.
const JEV_DECISION_EVALUATED = 'JEV_DECISION_EVALUATED';

// Business event vocabulary the rule provider understands. Source:
// registerCanonicalWorkers BUSINESS_EVENTS + worker pipeline trigger types
// (ping-runtime/workers/canonical_workers.js). Pinned here deliberately so the
// rule policy's vocabulary is versioned with the policy itself.
const KNOWN_CLAIM_EVENT_TYPES = Object.freeze(new Set([
  'LEAD_CREATED', 'LEAD_CONVERTED',
  'ESTIMATE_CREATED', 'ESTIMATE_SENT', 'ESTIMATE_ACCEPTED',
  'CUSTOMER_CREATED', 'CUSTOMER_UPDATED',
  'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_COMPLETED',
  'REVIEW_RECEIVED', 'REVIEW_RESPONDED',
  'INVOICE_CREATED', 'INVOICE_SENT', 'INVOICE_PAID',
  'EMAIL_SENT', 'EMAIL_RECEIVED',
  'SMS_SENT',
  'GITHUB_COMMIT_SYNCED', 'GOOGLE_REVIEW_RECEIVED',
  'DOCUMENT_IMPORT',
  'SYSTEM_HEALTH_CHECK',
  'OBSERVATION_CREATED', 'CLAIM_GENERATE',
]));

class DecisionRequest {
  constructor({ domain, subjectRef = null, evidenceRefs = [], context = {}, correlationId = null, causationId = null } = {}) {
    if (!domain) throw new Error('DecisionRequest requires a domain');
    this.domain = domain;
    this.subjectRef = subjectRef;
    this.evidenceRefs = Array.isArray(evidenceRefs) ? evidenceRefs : [];
    this.context = context || {};
    this.correlationId = correlationId;
    this.causationId = causationId;
  }

  toJSON() {
    return {
      domain: this.domain,
      subjectRef: this.subjectRef,
      evidenceRefs: this.evidenceRefs,
      context: this.context,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }
}

class TypedDecision {
  constructor({ decision, probability = null, evidenceRefs = [], provider, modelVersion = null, policyVersion = null, requestRef = null, rationale = null, decidedAt = null } = {}) {
    if (!Object.values(CLAIM_DECISIONS).includes(decision)) {
      throw new Error(`TypedDecision: unknown decision '${decision}'`);
    }
    if (probability !== null && !(typeof probability === 'number' && probability >= 0 && probability <= 1)) {
      throw new Error('TypedDecision: probability must be null or a finite number in [0,1]');
    }
    if (!provider) throw new Error('TypedDecision requires a provider name');
    this.decision = decision;
    this.probability = probability;
    this.evidenceRefs = Array.isArray(evidenceRefs) ? evidenceRefs : [];
    this.provider = provider;
    this.modelVersion = modelVersion;
    this.policyVersion = policyVersion;
    this.requestRef = requestRef;
    this.rationale = rationale;
    this.decidedAt = decidedAt;
  }

  toJSON() {
    return {
      decision: this.decision,
      probability: this.probability,
      evidenceRefs: this.evidenceRefs,
      provider: this.provider,
      modelVersion: this.modelVersion,
      policyVersion: this.policyVersion,
      requestRef: this.requestRef,
      rationale: this.rationale,
      decidedAt: this.decidedAt,
    };
  }
}

class TypedDecisionProvider {
  constructor({ name, modelVersion = null, policyVersion = null } = {}) {
    if (!name) throw new Error('TypedDecisionProvider requires a name');
    this.name = name;
    this.modelVersion = modelVersion;
    this.policyVersion = policyVersion;
  }

  async decide(request) {
    throw new Error(`${this.name}.decide() must be implemented`);
  }
}

/**
 * Deterministic rule-based claim classifier. This is the canonical/
 * deterministic side of shadow evaluation: it encodes current policy as
 * explicit rules so a future model provider (Ollama, P6) can be calibrated
 * against it on the same evidence.
 *
 * Rules (v0):
 *   R1: no subject reference → NEEDS_MORE_EVIDENCE (cannot evaluate)
 *   R2: event type outside known vocabulary → NEEDS_MORE_EVIDENCE
 *   R3: structurally valid + evidence reference → ACCEPT_CLAIM
 *   R4: structurally valid, no evidence reference → NEEDS_MORE_EVIDENCE
 */
class RuleClaimDecisionProvider extends TypedDecisionProvider {
  constructor() {
    super({ name: 'rule-claim-v0', modelVersion: 'n/a', policyVersion: 'rule-claim-v0/2026-09-22' });
  }

  async decide(request) {
    const base = {
      evidenceRefs: request.evidenceRefs,
      provider: this.name,
      modelVersion: this.modelVersion,
      policyVersion: this.policyVersion,
      requestRef: request.correlationId || request.subjectRef,
      decidedAt: new Date().toISOString(),
    };
    if (request.domain !== 'claim-classification') {
      return new TypedDecision({ ...base, decision: CLAIM_DECISIONS.NEEDS_MORE_EVIDENCE, probability: 0.1, rationale: 'R0: provider only handles claim-classification' });
    }
    if (!request.subjectRef) {
      return new TypedDecision({ ...base, decision: CLAIM_DECISIONS.NEEDS_MORE_EVIDENCE, probability: 0.2, rationale: 'R1: claim has no subject reference (documentId missing)' });
    }
    const eventType = request.context && request.context.eventType;
    if (!KNOWN_CLAIM_EVENT_TYPES.has(eventType)) {
      return new TypedDecision({ ...base, decision: CLAIM_DECISIONS.NEEDS_MORE_EVIDENCE, probability: 0.4, rationale: `R2: event type '${eventType}' outside known claim vocabulary` });
    }
    if (request.evidenceRefs.length > 0) {
      return new TypedDecision({ ...base, decision: CLAIM_DECISIONS.ACCEPT_CLAIM, probability: 0.85, rationale: 'R3: structurally valid claim with evidence reference' });
    }
    return new TypedDecision({ ...base, decision: CLAIM_DECISIONS.NEEDS_MORE_EVIDENCE, probability: 0.55, rationale: 'R4: structurally valid claim but no evidence reference' });
  }
}

/**
 * JEV P12 (initial) — answers ONLY: given this typed decision and
 * constitutional context, may execution proceed?
 *
 * Initial policy: Jev = SHADOW ONLY. No decision class is executable.
 * Later classes may be widened independently by replacing this policy —
 * never by hardcoding "AI can execute" here.
 */
class MayExecutePolicy {
  mayExecute(decision, context = {}) {
    return {
      allowed: false,
      mode: 'shadow',
      reason: 'JEV_SHADOW_ONLY',
      decisionClass: decision ? decision.decision : null,
    };
  }
}

module.exports = {
  CLAIM_DECISIONS,
  JEV_DECISION_EVALUATED,
  KNOWN_CLAIM_EVENT_TYPES,
  DecisionRequest,
  TypedDecision,
  TypedDecisionProvider,
  RuleClaimDecisionProvider,
  MayExecutePolicy,
};
