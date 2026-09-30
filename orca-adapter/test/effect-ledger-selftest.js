#!/usr/bin/env node
'use strict';
/**
 * effect-ledger-selftest.js — hostile tests for the post-effect promotion
 * path (effect_ledger.js + outcomes.js failedFromEffectPromotion).
 *
 * The gap: post-effect definitive throw had no promotion path to FAILED.
 * The falsification (Pig chain, mission_scheduler): a bare post-effect
 * throw was promoted to FAILED with NO effect evidence at all. So the
 * ledger enforces a three-way throw discipline:
 *   - proven pre-effect (no effect possible) -> FAILED via terminalOutcome
 *   - post-effect throw + definitive failure evidence + effect record ->
 *     FAILED with the evidence cited (promotion)
 *   - post-effect throw + UNKNOWN/partial evidence -> HOLD/reconcile,
 *     NEVER FAILED
 *
 * What must hold:
 *   (a) post-effect throw with definitive failure evidence promotes to
 *       FAILED with evidence cited.
 *   (b) post-effect throw without definitive evidence stays
 *       effect_unknown / effect_hold, never promoted.
 *   (c) promotion replay is idempotent: one promotion record, same outcome.
 *   (d) promotion never mutates the original outcome record (append-only).
 *   (e) each of the 10 surveyed effect classes produces a well-formed
 *       evidence ref, or is explicitly marked unsupported.
 *   (f) MIDDLE CASE: throw after effect with only PARTIAL evidence stays
 *       HOLD, not FAILED; the refusal points at effect_hold.
 */
const { OUTCOME, EFFECT_STATE, terminalOutcome, failedFromEffectPromotion } = require('../outcomes.js');
const {
  EFFECT_CLASSES,
  EFFECT_RECORD_STATE,
  effectIdFor,
  evidenceRef,
  isDefinitiveFailure,
  recordEffect,
  appendRecord,
  promoteEffect,
} = require('../effect_ledger.js');

let failures = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

const definitiveEvidence = (overrides) => ({
  definitive: true,
  effect_class: 'external-api-mutation',
  refs: [evidenceRef('external-api-mutation', 'provider deployments poll: deployment d-9 terminal state=errored at 2026-09-30T06:20:00Z', 'provider-state-poll')],
  observed_by: 'effect-reconciler',
  failure: 'provider_returned_terminal_failure',
  ...(overrides || {}),
});

(async () => {
  /* ---- 0. deterministic effect ids ---- */
  {
    const a = effectIdFor('dispatch-key-1', '1');
    const b = effectIdFor('dispatch-key-1', '1');
    const c = effectIdFor('dispatch-key-1', '2');
    const d = effectIdFor('dispatch-key-2', '1');
    check('effect_id deterministic: same inputs -> same id', a === b && /^effect_[0-9a-f]{16}$/.test(a), a);
    check('effect_id changes on attempt', a !== c);
    check('effect_id changes on dispatch key', a !== d);
    let threw = false;
    try { effectIdFor('', '1'); } catch (e) { threw = true; }
    check('effect_id refuses empty dispatch key', threw);
  }

  /* ---- (a) definitive failure evidence promotes to FAILED, evidence cited ---- */
  {
    let ledger = [];
    const rec = recordEffect({ dispatch_key: 'post-effect-1', attempt: '1', effect_state: EFFECT_RECORD_STATE.UNKNOWN });
    ledger = appendRecord(ledger, rec);
    const r = promoteEffect(ledger, rec, definitiveEvidence(), 'provider errored the deployment after the worker threw');
    check('a1: definitive evidence promotes', r.promoted === true && r.replay === false, JSON.stringify({ promoted: r.promoted, replay: r.replay }));
    check('a2: outcome is FAILED', r.outcome && r.outcome.outcome === OUTCOME.FAILED, JSON.stringify(r.outcome && r.outcome.outcome));
    check('a3: outcome cites the evidence class and refs',
      r.outcome.effect_promotion && r.outcome.effect_promotion.evidence_class === 'external-api-mutation'
        && Array.isArray(r.outcome.effect_promotion.evidence_refs) && r.outcome.effect_promotion.evidence_refs.length === 1
        && r.outcome.effect_promotion.evidence_refs[0].effect_class === 'external-api-mutation',
      JSON.stringify(r.outcome.effect_promotion).slice(0, 200));
    check('a4: outcome carries contract status/summary', r.outcome.status === 'failed' && typeof r.outcome.summary === 'string' && r.outcome.summary.length > 0);
    check('a5: promotion record appended with promoted_at + cause',
      r.promotion && r.promotion.kind === 'effect_promotion' && r.promotion.effect_id === rec.effect_id
        && typeof r.promotion.promoted_at === 'string' && /provider errored/.test(r.promotion.cause)
        && r.promotion.from_effect_state === EFFECT_STATE.UNKNOWN && r.promotion.to_outcome === 'failed',
      JSON.stringify(r.promotion).slice(0, 200));
    check('a6: ledger grew by exactly one (record + promotion)', r.ledger.length === 2 && r.ledger[0] === rec && r.ledger[1] === r.promotion);
    check('a7: input ledger array not mutated (append-only)', ledger.length === 1);
    check('a8: promoted outcome keeps the effect_unknown effect state (exit-1 != no-effect)',
      r.outcome.effect_state === EFFECT_STATE.UNKNOWN, r.outcome.effect_state);
  }

  /* ---- (b) no definitive evidence -> stays effect_unknown / effect_hold ---- */
  {
    // b1: definitive:false
    {
      const rec = recordEffect({ dispatch_key: 'no-ev-1', attempt: '1', effect_state: EFFECT_RECORD_STATE.UNKNOWN });
      const r = promoteEffect([], rec, definitiveEvidence({ definitive: false }), 'x');
      check('b1: non-definitive claim never promotes', r.promoted === false && r.outcome === null && r.promotion === null, JSON.stringify({ promoted: r.promoted }));
      check('b1: nothing appended', r.ledger.length === 0);
      check('b1: refusal reasons + points at HOLD', r.reason === 'evidence_not_definitive' && r.next === 'effect_hold' && r.reconcileOwnedBy === 'caller',
        JSON.stringify({ reason: r.reason, next: r.next }));
    }
    // b2: definitive:true but no refs cited
    {
      const rec = recordEffect({ dispatch_key: 'no-ev-2', attempt: '1', effect_state: EFFECT_RECORD_STATE.UNKNOWN });
      const r = promoteEffect([], rec, definitiveEvidence({ refs: [] }), 'x');
      check('b2: definitive without cited refs never promotes', r.promoted === false && r.ledger.length === 0);
    }
    // b3: unknown effect class
    {
      const rec = recordEffect({ dispatch_key: 'no-ev-3', attempt: '1', effect_state: EFFECT_RECORD_STATE.UNKNOWN });
      const r = promoteEffect([], rec, definitiveEvidence({ effect_class: 'teleportation' }), 'x');
      check('b3: unknown effect class never promotes', r.promoted === false && r.ledger.length === 0);
    }
    // b4: missing observer
    {
      const rec = recordEffect({ dispatch_key: 'no-ev-4', attempt: '1', effect_state: EFFECT_RECORD_STATE.UNKNOWN });
      const ev = definitiveEvidence(); delete ev.observed_by;
      const r = promoteEffect([], rec, ev, 'x');
      check('b4: evidence without observed_by never promotes', r.promoted === false && r.ledger.length === 0);
    }
    // b5: HOLD record stays HOLD
    {
      const rec = recordEffect({ dispatch_key: 'no-ev-5', attempt: '1', effect_state: EFFECT_RECORD_STATE.HELD });
      const r = promoteEffect([rec], rec, definitiveEvidence({ definitive: false }), 'x');
      check('b5: held record + weak evidence stays effect_hold', r.promoted === false && r.record.effect_state === EFFECT_STATE.HOLD && r.ledger.length === 1);
    }
    // b6: no evidence at all
    {
      const rec = recordEffect({ dispatch_key: 'no-ev-6', attempt: '1', effect_state: EFFECT_RECORD_STATE.UNKNOWN });
      const r = promoteEffect([], rec, null, 'x');
      check('b6: null evidence never promotes', r.promoted === false && r.outcome === null);
    }
  }

  /* ---- (c) replay is idempotent: one promotion record ---- */
  {
    const rec = recordEffect({ dispatch_key: 'replay-1', attempt: '3', effect_state: EFFECT_RECORD_STATE.HELD });
    let ledger = appendRecord([], rec);
    const first = promoteEffect(ledger, rec, definitiveEvidence(), 'first promotion');
    const second = promoteEffect(first.ledger, rec, definitiveEvidence(), 'first promotion');
    check('c1: replay detected', second.promoted === true && second.replay === true, JSON.stringify({ promoted: second.promoted, replay: second.replay }));
    check('c2: exactly one promotion record after replay',
      second.ledger.filter((x) => x.kind === 'effect_promotion').length === 1, String(second.ledger.length));
    check('c3: replay returns the SAME promotion record (identity, same promoted_at)',
      second.promotion === first.promotion && second.promotion.promoted_at === first.promotion.promoted_at);
    check('c4: replay derives the same FAILED outcome shape',
      second.outcome.outcome === 'failed' && second.outcome.effect_promotion.effect_id === first.outcome.effect_promotion.effect_id);
    check('c5: ledger not mutated by replay', second.ledger.length === first.ledger.length);
  }

  /* ---- (d) promotion never mutates the original record (append-only) ---- */
  {
    const rec = recordEffect({ dispatch_key: 'immutable-1', attempt: '1', effect_state: EFFECT_RECORD_STATE.UNKNOWN });
    const before = JSON.stringify(rec);
    Object.freeze(rec);
    let threw = false;
    try {
      promoteEffect([], rec, definitiveEvidence(), 'hostile: frozen input');
    } catch (e) { threw = true; }
    check('d1: promotion works on a frozen record (pure, no mutation)', !threw, threw ? 'threw' : '');
    check('d2: original record byte-identical after promotion', JSON.stringify(rec) === before);
    check('d3: record carries no promotion fields (history not rewritten)',
      !('promoted_at' in rec) && !('cause' in rec) && rec.failure_evidence_refs.length === 0);
    // typed refusals, fail-closed
    let effectedThrew = false;
    const eff = recordEffect({ dispatch_key: 'immutable-2', attempt: '1', effect_state: EFFECT_RECORD_STATE.EFFECTED });
    try { promoteEffect([], eff, definitiveEvidence(), 'x'); } catch (e) { effectedThrew = /effect_effected/.test(e.message); }
    check('d4: EFFECTED record can never be promoted to FAILED (typed refusal)', effectedThrew);
    let integrityThrew = false;
    const tampered = { ...rec, effect_id: 'effect_deadbeefdeadbeef' };
    try { promoteEffect([], tampered, definitiveEvidence(), 'x'); } catch (e) { integrityThrew = /integrity/.test(e.message); }
    check('d5: tampered effect_id refused (record integrity)', integrityThrew);
  }

  /* ---- (e) all 10 effect classes -> well-formed evidence refs ---- */
  {
    const expected = [
      'filesystem-mutation', 'git-mutation', 'database-mutation', 'deployment',
      'connector-write', 'external-api-mutation', 'website-publish',
      'message-execution', 'campaign-publication', 'financial-action',
    ];
    check('e0: exactly 10 surveyed classes', EFFECT_CLASSES.length === 10, String(EFFECT_CLASSES.length));
    let allWellFormed = true;
    let allSupported = true;
    for (const id of expected) {
      const cls = EFFECT_CLASSES.find((c) => c.id === id);
      if (!cls) { allWellFormed = false; console.log(`FAIL  e-class missing: ${id}`); failures++; continue; }
      if (cls.supported !== true) { allSupported = false; continue; }
      const ref = evidenceRef(id, `${id} probe output: <observed>`, 'probe');
      const ok = ref.effect_class === id && typeof ref.ref === 'string' && ref.ref.length > 0
        && typeof ref.observed_at === 'string' && typeof cls.probe === 'string' && cls.probe.length > 0;
      if (!ok) { allWellFormed = false; console.log(`FAIL  e-ref malformed: ${id}`); failures++; }
      // the ref must be usable as definitive evidence through the whole path
      const ev = { definitive: true, effect_class: id, refs: [ref], observed_by: 'selftest', failure: 'probe_terminal' };
      if (!isDefinitiveFailure(ev)) { allWellFormed = false; console.log(`FAIL  e-evidence rejected: ${id}`); failures++; }
    }
    check('e1: every surveyed class yields a well-formed, promotion-usable evidence ref', allWellFormed);
    check('e2: no class is silently unsupported (all explicit)', allSupported);
    let unknownThrew = false;
    try { evidenceRef('teleportation', 'x'); } catch (e) { unknownThrew = /unknown effect_class/.test(e.message); }
    check('e3: unknown effect class is a typed refusal, not a silent accept', unknownThrew);
    let emptyRefThrew = false;
    try { evidenceRef('deployment', ''); } catch (e) { emptyRefThrew = true; }
    check('e4: empty ref string refused', emptyRefThrew);
  }

  /* ---- (f) MIDDLE CASE: partial evidence after a post-effect throw -> HOLD, never FAILED ---- */
  {
    // The worker threw AFTER the effect boundary; the effect state is
    // unknown and the evidence is partial (a claim of failure with no
    // cited refs). The Pig defect promoted exactly this shape to FAILED.
    const rec = recordEffect({ dispatch_key: 'middle-1', attempt: '1', effect_state: EFFECT_RECORD_STATE.UNKNOWN });
    const partial = definitiveEvidence({ refs: [] }); // definitive:true, but nothing cited
    const r = promoteEffect([], rec, partial, 'worker threw post-effect; provider poll inconclusive');
    check('f1: partial evidence does NOT promote to FAILED', r.promoted === false && r.outcome === null && r.promotion === null);
    check('f2: nothing appended to the ledger', r.ledger.length === 0);
    check('f3: record stays effect_unknown (reconcile, not verdict)', r.record.effect_state === EFFECT_STATE.UNKNOWN);
    check('f4: refusal directs the caller to HOLD/reconcile', r.reason === 'evidence_not_definitive' && r.next === 'effect_hold' && r.reconcileOwnedBy === 'caller');
    // Same shape, but the caller had already marked HOLD: it stays HOLD.
    const held = recordEffect({ dispatch_key: 'middle-2', attempt: '1', effect_state: EFFECT_RECORD_STATE.HELD });
    const r2 = promoteEffect([held], held, partial, 'worker threw post-effect; provider poll inconclusive');
    check('f5: held + partial evidence stays effect_hold, not FAILED', r2.promoted === false && r2.record.effect_state === EFFECT_STATE.HOLD && r2.ledger.length === 1);
    // And the pre-effect case still works: proven no-effect -> FAILED direct.
    const direct = terminalOutcome(OUTCOME.FAILED, { effect_state: EFFECT_STATE.UNKNOWN, reason: 'proven pre-effect: throw before any effect boundary' });
    check('f6: proven pre-effect throw still reaches FAILED via terminalOutcome (existing path)', direct.outcome === 'failed');
  }

  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error('SELFTEST CRASH:', e); process.exit(1); });
