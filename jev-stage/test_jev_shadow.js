// JEV P2/P3/P4/P12 verification: typed decision contract, rule provider,
// shadow-only execution policy, shadow worker wiring, event registration,
// bridge terminal behavior.
//
// Run: node gateway/test_jev_shadow.js   (from repo root)

const assert = require('assert');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');

const {
  CLAIM_DECISIONS,
  JEV_DECISION_EVALUATED,
  DecisionRequest,
  TypedDecision,
  TypedDecisionProvider,
  RuleClaimDecisionProvider,
  MayExecutePolicy,
} = require('../ping-runtime/jev/typed_decision');
const { JevShadowWorker } = require('../ping-runtime/jev/shadow_worker');
const { EventValidator } = require('../ping-runtime/events/event_validator');
const { EventToMissionBridge, EVENT_MISSION_MAP } = require('../ping-runtime/orchestration/event_to_mission_bridge');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${name}: ${err.message}`);
  }
}

function req(over = {}) {
  return new DecisionRequest({
    domain: 'claim-classification',
    subjectRef: 'doc-1',
    evidenceRefs: ['evt-upstream'],
    context: { eventType: 'LEAD_CREATED', source: 'observation' },
    correlationId: 'corr-1',
    causationId: 'evt-claim-1',
    ...over,
  });
}

(async () => {
  console.log('=== JEV typed decision contract (P2) ===');

  await test('DecisionRequest requires a domain', () => {
    assert.throws(() => new DecisionRequest({}), /requires a domain/);
  });

  await test('DecisionRequest defaults evidenceRefs to []', () => {
    const r = new DecisionRequest({ domain: 'claim-classification' });
    assert.deepStrictEqual(r.evidenceRefs, []);
  });

  await test('TypedDecision rejects unknown decision vocabulary', () => {
    assert.throws(
      () => new TypedDecision({ decision: 'MAYBE_CLAIM', provider: 'p' }),
      /unknown decision/
    );
  });

  await test('TypedDecision rejects probability outside [0,1]', () => {
    assert.throws(() => new TypedDecision({ decision: 'ACCEPT_CLAIM', probability: 1.5, provider: 'p' }), /probability/);
    assert.throws(() => new TypedDecision({ decision: 'ACCEPT_CLAIM', probability: -0.1, provider: 'p' }), /probability/);
    assert.throws(() => new TypedDecision({ decision: 'ACCEPT_CLAIM', probability: NaN, provider: 'p' }), /probability/);
  });

  await test('TypedDecision accepts null probability (abstention-safe)', () => {
    const d = new TypedDecision({ decision: 'NEEDS_MORE_EVIDENCE', probability: null, provider: 'p' });
    assert.strictEqual(d.probability, null);
  });

  await test('TypedDecision requires a provider name', () => {
    assert.throws(() => new TypedDecision({ decision: 'ACCEPT_CLAIM' }), /provider/);
  });

  await test('TypedDecision.toJSON is serializable with full provenance', () => {
    const d = new TypedDecision({
      decision: 'ACCEPT_CLAIM', probability: 0.85, evidenceRefs: ['e1'],
      provider: 'rule-claim-v0', modelVersion: 'n/a', policyVersion: 'pv',
      requestRef: 'corr-1', rationale: 'R3', decidedAt: '2026-09-22T00:00:00Z',
    });
    const j = JSON.parse(JSON.stringify(d.toJSON()));
    assert.strictEqual(j.provider, 'rule-claim-v0');
    assert.strictEqual(j.policyVersion, 'pv');
    assert.deepStrictEqual(j.evidenceRefs, ['e1']);
  });

  console.log('=== rule claim provider (P2) ===');
  const provider = new RuleClaimDecisionProvider();

  await test('R3: valid claim + evidence -> ACCEPT_CLAIM', async () => {
    const d = await provider.decide(req());
    assert.strictEqual(d.decision, CLAIM_DECISIONS.ACCEPT_CLAIM);
    assert.ok(d.rationale.includes('R3'));
    assert.strictEqual(d.provider, 'rule-claim-v0');
    assert.strictEqual(d.modelVersion, 'n/a');
  });

  await test('R1: missing subjectRef -> NEEDS_MORE_EVIDENCE', async () => {
    const d = await provider.decide(req({ subjectRef: null }));
    assert.strictEqual(d.decision, CLAIM_DECISIONS.NEEDS_MORE_EVIDENCE);
    assert.ok(d.rationale.includes('R1'));
  });

  await test('R2: unknown event vocabulary -> NEEDS_MORE_EVIDENCE', async () => {
    const d = await provider.decide(req({ context: { eventType: 'SOME_NEW_THING' } }));
    assert.strictEqual(d.decision, CLAIM_DECISIONS.NEEDS_MORE_EVIDENCE);
    assert.ok(d.rationale.includes('R2'));
  });

  await test('R4: valid claim, no evidence -> NEEDS_MORE_EVIDENCE', async () => {
    const d = await provider.decide(req({ evidenceRefs: [] }));
    assert.strictEqual(d.decision, CLAIM_DECISIONS.NEEDS_MORE_EVIDENCE);
    assert.ok(d.rationale.includes('R4'));
  });

  await test('wrong domain -> NEEDS_MORE_EVIDENCE', async () => {
    const d = await provider.decide(new DecisionRequest({ domain: 'other', subjectRef: 'doc-1' }));
    assert.strictEqual(d.decision, CLAIM_DECISIONS.NEEDS_MORE_EVIDENCE);
  });

  await test('decisions are deterministic across runs', async () => {
    const a = await provider.decide(req());
    const b = await provider.decide(req());
    assert.deepStrictEqual({ ...a.toJSON(), decidedAt: null }, { ...b.toJSON(), decidedAt: null });
  });

  console.log('=== MayExecutePolicy shadow-only (P12) ===');
  const policy = new MayExecutePolicy();

  await test('ACCEPT_CLAIM at 0.85 is still not executable (probability != authority)', () => {
    const d = new TypedDecision({ decision: 'ACCEPT_CLAIM', probability: 0.85, provider: 'p' });
    const r = policy.mayExecute(d, { domain: 'claim-classification' });
    assert.strictEqual(r.allowed, false);
    assert.strictEqual(r.mode, 'shadow');
    assert.strictEqual(r.reason, 'JEV_SHADOW_ONLY');
    assert.strictEqual(r.decisionClass, 'ACCEPT_CLAIM');
  });

  await test('null decision (provider failure) is not executable', () => {
    const r = policy.mayExecute(null, {});
    assert.strictEqual(r.allowed, false);
    assert.strictEqual(r.decisionClass, null);
  });

  console.log('=== shadow worker (P3) ===');

  function mockRuntime() {
    const emitted = [];
    return {
      emitted,
      eventRuntime: {
        // Real BaseWorker._emit signature: emit(eventType, source, payload, options) -> { status, event_id }
        emit: async (eventType, source, payload, options) => {
          emitted.push({ eventType, source, payload, options });
          return { status: 'ok', event_id: 'evt-emitted-1' };
        },
      },
      pool: {},
    };
  }

  function claimEvent() {
    return {
      event_id: 'evt-claim-1',
      event_type: 'CLAIM_CREATED',
      namespace: 'core::system',
      metadata: { correlation_id: 'corr-1' },
      payload: {
        claim: {
          documentId: 'doc-1',
          eventType: 'LEAD_CREATED',
          source: 'observation',
          timestamp: '2026-09-22T00:00:00Z',
        },
        upstreamEventId: 'evt-obs-1',
      },
    };
  }

  await test('observes CLAIM_CREATED and emits one JEV_DECISION_EVALUATED', async () => {
    const m = mockRuntime();
    const w = new JevShadowWorker({ eventRuntime: m.eventRuntime, pool: m.pool });
    const result = await w.handle(claimEvent());
    assert.strictEqual(result.status, 'ok');
    assert.strictEqual(m.emitted.length, 1);
    const e = m.emitted[0];
    assert.strictEqual(e.eventType, JEV_DECISION_EVALUATED);
    assert.strictEqual(e.options.causation_id, 'evt-claim-1');
    // correlation preserved into the same group (P1 replay sees the evaluation)
    assert.strictEqual(e.options.correlation_id, 'corr-1');
    const rec = e.payload;
    assert.strictEqual(rec.domain, 'claim-classification');
    assert.strictEqual(rec.subjectRef, 'doc-1');
    assert.deepStrictEqual(rec.evidenceRefs, ['evt-obs-1', 'evt-claim-1']);
    assert.strictEqual(rec.mode, 'shadow');
    assert.strictEqual(rec.agreement, 'insufficient_providers');
    assert.strictEqual(rec.evaluations.length, 1);
    assert.strictEqual(rec.evaluations[0].decision.decision, 'ACCEPT_CLAIM');
    assert.strictEqual(rec.evaluations[0].mayExecute.allowed, false);
    assert.strictEqual(rec.evaluations[0].mayExecute.mode, 'shadow');
  });

  await test('skips events with no claim payload (no emit)', async () => {
    const m = mockRuntime();
    const w = new JevShadowWorker({ eventRuntime: m.eventRuntime, pool: m.pool });
    const result = await w.handle({ event_id: 'e', event_type: 'CLAIM_CREATED', payload: {} });
    assert.strictEqual(result.status, 'skipped');
    assert.strictEqual(m.emitted.length, 0);
  });

  await test('provider failure is recorded, never fabricated into a decision', async () => {
    class BoomProvider extends TypedDecisionProvider {
      constructor() { super({ name: 'boom' }); }
      async decide() { throw new Error('model exploded'); }
    }
    const m = mockRuntime();
    const w = new JevShadowWorker({
      eventRuntime: m.eventRuntime, pool: m.pool,
      jevProviders: [new BoomProvider()],
    });
    const result = await w.handle(claimEvent());
    assert.strictEqual(result.status, 'ok');
    const rec = m.emitted[0].payload;
    assert.strictEqual(rec.evaluations[0].decision, null);
    assert.ok(rec.evaluations[0].error.includes('model exploded'));
    assert.strictEqual(rec.evaluations[0].mayExecute.allowed, false);
  });

  await test('two providers produce agreement field', async () => {
    const m = mockRuntime();
    const w = new JevShadowWorker({
      eventRuntime: m.eventRuntime, pool: m.pool,
      jevProviders: [new RuleClaimDecisionProvider(), new RuleClaimDecisionProvider()],
    });
    await w.handle(claimEvent());
    assert.strictEqual(m.emitted[0].payload.agreement, 'agree');
  });

  console.log('=== event registration (P4) ===');

  await test('live EventValidator accepts JEV_DECISION_EVALUATED', () => {
    const v = new EventValidator(REPO_ROOT).load();
    const r = v.validate({ event_type: 'JEV_DECISION_EVALUATED', schema_version: '1.0.0' });
    assert.strictEqual(r.valid, true, `rejected: ${r.errors.join(', ')}`);
  });

  await test('JEV_DECISION_EVALUATED is terminal in the bridge (no mission mapping)', () => {
    assert.strictEqual(EVENT_MISSION_MAP['JEV_DECISION_EVALUATED'], undefined);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
