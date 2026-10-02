'use strict';
/**
 * harness.js — proof world for the social/campaign retry-safety proof.
 *
 * Uses the REAL adapters (class_05c/05d/09) and the REAL A6 foundation
 * (EffectReconciler, EffectExecutor, deriveOpKey from effect_reconciler.js)
 * against stub providers that model real provider semantics.
 *
 * Crash model (SIGKILL-style):
 *  - 'hang-before-accept': the worker never reaches the provider; the
 *    executor's dispatch timeout fires -> EFFECT_UNKNOWN, provider untouched.
 *  - 'hang-after-accept': the provider mutation lands, then the worker
 *    never returns (ack lost); timeout -> EFFECT_UNKNOWN, provider mutated,
 *    PING has no acknowledgement and no ledger commit.
 *  - 'provider-error': the provider call throws synchronously; the worker
 *    marks it definitive+retryable -> EFFECT_FAILED (known outcome).
 *
 * Flow per scenario:
 *  dispatch attempt 1 (real EffectExecutor, may crash) -> on UNKNOWN, run
 *  reconcileOp: real class probe + real foundation reconcile() + real
 *  evaluatePredicate; retry dispatches ONLY when the class predicate says
 *  SAFE_TO_RETRY *and* the foundation returns retry_authorized with a
 *  recorded reason grounded in observed provider state.
 */
const path = require('path');

const ADAPTERS = '/home/nolan/ping/ping-runtime/orchestration/effect_adapters';
const createCore = require(path.join(ADAPTERS, 'adapter_core.js'));
const { StubThreads, StubInstagram, StubEngagement, makeStubExec } = require('./stub_providers.js');
const { deleteModule, updateModule } = require('./retry_predicates.js');

const never = () => new Promise(() => {});

// --- in-memory event store: serves both the adapter-core emit sink and the
// --- reconciler's query()/emit() interface (same shape as the real runtime).
function makeEventStore() {
  const events = [];
  let n = 0;
  const pad = (i) => `e${String(i).padStart(6, '0')}`;
  return {
    events,
    emit(type, source, payload, options) {
      n += 1;
      events.push({
        event_id: pad(n), event_type: type, source,
        payload: payload || {}, options: options || {},
        timestamp: new Date().toISOString(),
      });
      return { status: 'ok' };
    },
    async query({ eventType, payloadKey, payloadValue, limit } = {}) {
      let evs = events.filter((e) => !eventType || e.event_type === eventType);
      if (payloadKey) evs = evs.filter((e) => e.payload && String(e.payload[payloadKey]) === String(payloadValue));
      if (limit) evs = evs.slice(-limit);
      return { status: 'ok', events: evs };
    },
  };
}

// --- in-memory ledger mirroring EffectLedger's SQL semantics
// --- (INSERT ... ON CONFLICT DO NOTHING: first writer wins).
function makeLedger() {
  const rows = new Map();
  return {
    async initialize() {},
    async record(opKey, { missionId, effect, inputDigest, result, consequence = 'high' } = {}) {
      if (rows.has(opKey)) return { rowCount: 0 };
      rows.set(opKey, { op_key: opKey, mission_id: missionId, effect, input_digest: inputDigest, result, consequence });
      return { rowCount: 1 };
    },
    async get(opKey) { return rows.get(opKey) || null; },
  };
}

function makeWorld() {
  const store = makeEventStore();
  const ledger = makeLedger();
  const core = createCore({ emit: (type, payload) => store.emit(type, 'adapter-core', payload, {}) });
  if (core.foundationSource !== 'sibling') {
    throw new Error(`proof requires the REAL A6 foundation; got source '${core.foundationSource}'`);
  }
  const F = core.foundation;
  // pool: truthy stub so the reconciler's ledger probe consults the
  // in-memory ledger (with pool null the real probe short-circuits to
  // executed:'unknown' without ever reading the ledger).
  const reconciler = new F.EffectReconciler({ pool: { stub: 'proof-in-memory' }, eventRuntime: store, ledger });
  const world = {
    store, ledger, core, F, reconciler,
    threads: new StubThreads(),
    instagram: new StubInstagram(),
    engagement: new StubEngagement(),
    crashPoint: 'none',       // set per scenario
    authorizations: [],       // every attempt>=2 dispatch must have one entry
    dispatchCount: 0,
    executor: null,
  };
  world.exec = makeStubExec({ threads: world.threads, instagram: world.instagram });
  const workerRuntime = { dispatch: (event) => workerDispatch(world, event) };
  world.executor = new F.EffectExecutor({ pool: null, eventRuntime: store, ledger, workerRuntime, timeoutMs: 300 });
  return world;
}

function splitEffectName(effectName) {
  const i = effectName.indexOf(':');
  return { workerName: effectName.slice(0, i), eventType: effectName.slice(i + 1) };
}

/**
 * Build the executor invocation so the executor's derived op key is
 * byte-identical to the class adapter's deriveOpKey. Throws on drift.
 */
function makeInvocation(world, { missionId, effectName, snapshot, actionDef, adapterDeriveOpKey, adapterInput }) {
  const expected = adapterDeriveOpKey(adapterInput);
  const { workerName, eventType } = splitEffectName(effectName);
  const mission = { mission_id: missionId, payload: {} };
  const event = { event_type: eventType, payload: snapshot, _actionDef: actionDef };
  const actual = world.F.deriveOpKey({ missionId, effect: `${workerName}:${eventType}`, input: snapshot });
  if (actual !== expected) {
    throw new Error(`op-key drift: adapter ${expected} vs executor ${actual}`);
  }
  return { mission, workerName, event, opKey: expected };
}

// --- pre-dispatch provider-state gate -------------------------------------
// The inversion/duplication safety layer: read current provider state first.
// Toggle actions issue ONLY when observed state differs from intended state.
// A second attempt with state already correct is a no-op, never an inversion.
async function preDispatchGate(world, def) {
  const eng = world.engagement;
  switch (def.action) {
    case 'threads.publish-post':
    case 'instagram.post':
      return {}; // create semantics: no pre-read possible; the retry predicate's probe governs
    case 'campaign.like': {
      const st = eng.readLikeState(def.postRef);
      if (st.liked === null || st.liked === undefined) {
        return { abort: true, reason: 'like state unreadable at dispatch; issuing a toggle could invert the effect' };
      }
      if (st.liked === true) {
        return { noop: true, via: 'pre-dispatch-state-read', result: { liked: true, already: true } };
      }
      return {};
    }
    case 'campaign.comment': {
      const list = eng.readComments(def.postRef);
      if (list === null) return { abort: true, reason: 'comment list unreadable at dispatch' };
      if (list.includes(def.commentText)) {
        return { noop: true, via: 'pre-dispatch-state-read', result: { present: true, already: true } };
      }
      return {};
    }
    case 'campaign.delete-post': {
      const s = eng.readPost(def.postRef);
      if (!s) return { abort: true, reason: 'delete target unreadable at dispatch' };
      if (!s.exists) return { noop: true, via: 'pre-dispatch-state-read', result: { ok: true, alreadyGone: true } };
      return {};
    }
    case 'campaign.update-post': {
      const s = eng.readPost(def.postRef);
      if (!s) return { abort: true, reason: 'update target unreadable at dispatch' };
      if (!s.exists) return { abort: true, reason: 'update target gone at dispatch' };
      if (s.version !== def.boundVersion) {
        return { abort: true, reason: `version drift at dispatch (provider v${s.version} vs bound v${def.boundVersion})` };
      }
      return {};
    }
    case 'campaign.page-publish':
      return { abort: true, reason: 'page publishing is PAUSED; adapters must NEVER unpause it' };
    default:
      return { abort: true, reason: `unknown action '${def.action}'` };
  }
}

async function providerMutate(world, def) {
  const eng = world.engagement;
  switch (def.action) {
    case 'threads.publish-post':
      return { status: 'ok', result: world.threads.publish({ account: def.account, text: def.text, mediaManifest: def.mediaManifest }) };
    case 'instagram.post':
      return { status: 'ok', result: world.instagram.publish({ account: def.account, kind: def.kind, caption: def.caption, mediaManifest: def.mediaManifest }) };
    case 'campaign.like':
      return { status: 'ok', result: eng.toggleLike(def.postRef) };
    case 'campaign.comment':
      return { status: 'ok', result: eng.addComment(def.postRef, def.commentText) };
    case 'campaign.delete-post':
      return { status: 'ok', result: eng.deletePost(def.postRef) };
    case 'campaign.update-post':
      return { status: 'ok', result: eng.updatePost(def.postRef, def.intendedContent, def.boundVersion) };
    case 'campaign.page-publish':
      return { status: 'ok', result: eng.pagePublish() };
    default:
      throw new Error(`unknown action '${def.action}'`);
  }
}

async function workerDispatch(world, event) {
  const def = event._actionDef;
  const crash = world.crashPoint;
  if (crash === 'hang-before-accept') await never();
  const gate = await preDispatchGate(world, def);
  if (gate.abort) {
    const err = new Error(`pre-dispatch gate abort: ${gate.reason}`);
    err.code = 'GATE_ABORT';
    event.effect.failDefinitive(err, { retryable: false });
    throw err;
  }
  if (gate.noop) return { status: 'noop', via: gate.via, result: gate.result };
  if (crash === 'provider-error') {
    const err = new Error('provider rate limited');
    err.code = 'PROVIDER_ERROR';
    event.effect.failDefinitive(err, { retryable: true });
    throw err;
  }
  const mutated = await providerMutate(world, def);
  if (crash === 'hang-after-accept') await never(); // ack lost: provider mutated, PING hears nothing
  return mutated;
}

/**
 * reconcileOp — the A6 UNKNOWN -> reconcile -> retry_authorized flow.
 * Returns the full decision trail. A retry dispatch happens ONLY when:
 *   class predicate == SAFE_TO_RETRY  AND
 *   foundation reconcile() == retry_authorized with a recorded, non-empty
 *   reason grounded in observed provider state.
 */
async function reconcileOp(world, spec) {
  const { opKey, classModule, classId, probeDeps, predicateContext, consequence = 'high',
          effectName, effectClass, missionId, invocation } = spec;
  const trail = { opKey, steps: [] };

  const probeResult = await classModule.probe(opKey, spec.attemptWindow || {}, probeDeps);
  trail.steps.push({ step: 'provider-probe', outcome: probeResult.outcome, evidence: probeResult.evidence });

  const foundationDecision = await world.reconciler.reconcile(opKey, { consequence, maxAttempts: 3 });
  trail.steps.push({ step: 'foundation-reconcile', resolution: foundationDecision.resolution,
                     reason: foundationDecision.reason || foundationDecision.via || null });

  const evaluated = world.core.evaluatePredicate({ classModule, classId, probeResult, context: predicateContext || {} });
  trail.steps.push({ step: 'class-predicate', decision: evaluated.decision,
                     holdReason: evaluated.holdReason, evidence: evaluated.evidence });
  trail.classDecision = evaluated.decision;
  trail.foundationResolution = foundationDecision.resolution;

  const emit = (type, payload) => world.store.emit(type, 'harness', payload, {});

  if (evaluated.decision === 'RECOVER_SUCCEEDED') {
    world.core.recordOutcome({ opKey, effectName, effectClass, consequence,
      decision: evaluated.decision, evidence: evaluated.evidence, missionId });
    trail.final = 'recovered';
    return trail;
  }
  if (evaluated.decision === 'HOLD_UNKNOWN') {
    world.core.escalateHold({ opKey, effectName, effectClass, consequence,
      holdReason: evaluated.holdReason, evidence: evaluated.evidence, missionId });
    trail.final = 'held';
    return trail;
  }
  // SAFE_TO_RETRY: the foundation must ALSO authorize, with a recorded reason.
  if (foundationDecision.resolution === 'retry_authorized' && foundationDecision.reason) {
    const auth = {
      opKey,
      foundationReason: foundationDecision.reason,
      nextAttempt: foundationDecision.nextAttempt,
      classEvidence: evaluated.evidence,
      probeOutcome: probeResult.outcome,
    };
    world.authorizations.push(auth);
    trail.authorization = auth;
    world.crashPoint = 'none'; // the SIGKILL was one-time; the retry runs clean
    world.dispatchCount += 1;
    const res = await world.executor.execute({ ...invocation, attempt: foundationDecision.nextAttempt || 2 });
    trail.retryResult = res;
    trail.final = 'retried';
    return trail;
  }
  world.core.escalateHold({ opKey, effectName, effectClass, consequence,
    holdReason: `class predicate authorized retry but the foundation did not (resolution=${foundationDecision.resolution}); fail closed`,
    evidence: evaluated.evidence, missionId });
  trail.final = 'held';
  return trail;
}

/** Global invariant: every attempt>=2 EFFECT_DISPATCHED has a grounded authorization. */
function checkNoUngroundedRetries(world) {
  const problems = [];
  const dispatches = world.store.events.filter((e) => e.event_type === 'EFFECT_DISPATCHED');
  for (const d of dispatches) {
    const attempt = d.payload && d.payload.attempt;
    const opKey = d.payload && d.payload.op_key;
    if (attempt >= 2) {
      const auth = world.authorizations.find((a) => a.opKey === opKey);
      if (!auth) problems.push(`attempt ${attempt} dispatch for ${opKey} has no authorization record`);
      else {
        if (!auth.foundationReason) problems.push(`attempt ${attempt} for ${opKey}: empty foundation reason`);
        const ev = auth.classEvidence || {};
        const keys = Object.keys(ev);
        if (keys.length === 0) problems.push(`attempt ${attempt} for ${opKey}: class evidence empty, not grounded in observed provider state`);
      }
    }
  }
  return problems;
}

module.exports = { makeWorld, makeInvocation, reconcileOp, checkNoUngroundedRetries, deleteModule, updateModule };
