/**
 * JEV P3 — Shadow evaluation worker. ZERO execution authority.
 *
 * Observes CLAIM_CREATED (the canonical claim artifact), builds a
 * DecisionRequest from the claim + its evidence references, runs the
 * configured typed decision providers independently of the canonical
 * pipeline, and emits one JEV_DECISION_EVALUATED record per claim through
 * the canonical event mechanism (UnifiedEventRuntime.emit).
 *
 * The canonical pipeline is never altered: ClaimWorker,
 * ClassificationWorker, and every downstream worker run exactly as before.
 * This worker only adds observation records, which the bridge leaves
 * terminal (no mission mapping for JEV_DECISION_EVALUATED).
 *
 * Provider failures are recorded as errors on the evaluation record — never
 * swallowed, never converted into a fabricated decision.
 */

const { BaseWorker } = require('../workers/canonical_workers');
const { constitutionalTimeAuthority } = require('../authorities/constitutional_time_authority.js');
const {
  DecisionRequest,
  RuleClaimDecisionProvider,
  MayExecutePolicy,
  JEV_DECISION_EVALUATED,
} = require('./typed_decision');

class JevShadowWorker extends BaseWorker {
  constructor(options = {}) {
    super(options);
    this._name = 'jev-shadow';
    this._providers = options.jevProviders || [new RuleClaimDecisionProvider()];
    this._policy = options.mayExecutePolicy || new MayExecutePolicy();
  }

  async handle(event) {
    this._event = event;
    const payload = event.payload || {};
    const claim = payload.claim || null;
    if (!claim) {
      return { status: 'skipped', reason: 'no_claim_in_payload' };
    }

    const evidenceRefs = [];
    if (payload.upstreamEventId) evidenceRefs.push(payload.upstreamEventId);
    if (event.event_id) evidenceRefs.push(event.event_id);

    const request = new DecisionRequest({
      domain: 'claim-classification',
      subjectRef: claim.documentId || null,
      evidenceRefs,
      context: { eventType: claim.eventType || null, source: claim.source || null },
      correlationId: event.metadata?.correlation_id || event.correlation_id || event.event_id,
      causationId: event.event_id,
    });

    const evaluations = [];
    for (const provider of this._providers) {
      try {
        const decision = await provider.decide(request);
        evaluations.push({
          provider: provider.name,
          modelVersion: provider.modelVersion,
          policyVersion: provider.policyVersion,
          decision: decision.toJSON(),
          mayExecute: this._policy.mayExecute(decision, { domain: request.domain }),
        });
      } catch (err) {
        evaluations.push({
          provider: provider.name,
          modelVersion: provider.modelVersion,
          policyVersion: provider.policyVersion,
          decision: null,
          error: err.message,
          mayExecute: this._policy.mayExecute(null, { domain: request.domain }),
        });
      }
    }

    const decided = evaluations.filter((e) => e.decision).map((e) => e.decision.decision);
    const agreement = decided.length < 2
      ? 'insufficient_providers'
      : (decided.every((d) => d === decided[0]) ? 'agree' : 'disagree');

    const record = {
      domain: request.domain,
      subjectRef: request.subjectRef,
      evidenceRefs,
      evaluations,
      agreement,
      mode: 'shadow',
      evaluatedAt: constitutionalTimeAuthority.nowAsISOString(),
    };

    await this._emit(JEV_DECISION_EVALUATED, record, {
      causation_id: event.event_id,
    });

    return { status: 'ok', record };
  }
}

module.exports = { JevShadowWorker };
