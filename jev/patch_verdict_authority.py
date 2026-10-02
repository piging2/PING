"""Verdict-authority fix, patch 1: source files.

Applies precise string replacements to:
  ping-runtime/events/unified_event_runtime.js
  ping-runtime/workers/canonical_workers.js
  gateway/bootstrap/gateway_runtime.js

Each replacement asserts exactly one anchor match. Run from the repo root.
"""
import sys

def patch(path, pairs):
    with open(path) as f:
        text = f.read()
    for old, new in pairs:
        count = text.count(old)
        assert count == 1, f"{path}: anchor found {count}x (expected 1): {old[:80]!r}"
        text = text.replace(old, new)
    with open(path, 'w') as f:
        f.write(text)
    print(f"patched {path}: {len(pairs)} replacements")

# ─── 1. unified_event_runtime.js ───
VERDICT_CONST = '''
// ─── Verdict-class admission authority ─────────────────────────────────
// A verdict-class event asserts an authoritative outcome (a replay verified,
// a witness attested, a lineage recorded, a decision evaluated). Authentication
// proves WHO called; it does not authorize WHAT semantic claim they may make.
// Only the canonical producer worker named below may emit each verdict type,
// and only with qualifying provenance. Everything else fails closed BEFORE
// persistence. This check runs before the _skipGovernance branch: bridges,
// replays, and internal callers cannot bypass it. There is exactly one
// admission choke point (UnifiedEventRuntime.emit) and this is it.
//
// Registry seam: gateway/generated/event_registry.json carries authority_owner
// per event type (ReplayWorker, WitnessWorker, LineageWorker, JevShadowWorker).
// VERDICT_PRODUCERS binds those owners to the actual worker source strings.
// (BaseWorker._emit stamps this._name as source; the string alone is not
// trust — the binding of string-to-execution-context at this choke point is.)
const VERDICT_PRODUCERS = Object.freeze({
  REPLAY_COMPLETED: 'replay',           // registry authority_owner: ReplayWorker
  WITNESS_CREATED: 'witness',           // registry authority_owner: WitnessWorker
  WITNESS_REJECTED: 'witness',          // registry authority_owner: WitnessWorker
  LINEAGE_CREATED: 'lineage',           // registry authority_owner: LineageWorker
  JEV_DECISION_EVALUATED: 'jev-shadow', // registry authority_owner: JevShadowWorker
});

// Verdict-shaped events must also carry qualifying provenance — the evidence
// the genuine producer always attaches. These are structural (shape) checks,
// not truth checks: they reject hand-built forgeries at admission while
// accepting every genuine producer path, including the failure-honest
// verified:false records (which are records, not attestations).
function verdictProvenanceOk(eventType, payload) {
  const p = payload && typeof payload === 'object' ? payload : {};
  switch (eventType) {
    case 'REPLAY_COMPLETED': {
      const r = p.replay;
      return !!r && typeof r === 'object'
        && typeof r.verified === 'boolean'
        && (r.status === 'ok' || r.status === 'no_provider' || r.status === 'kernel_error');
    }
    case 'WITNESS_CREATED':
      return !!(p.witness && typeof p.witness === 'object'
        && typeof p.witness.attestation === 'string' && p.witness.attestation.length > 0
        && p.upstreamEventId);
    case 'WITNESS_REJECTED':
      return typeof p.reason === 'string' && p.reason.length > 0 && !!p.upstreamEventId;
    case 'LINEAGE_CREATED':
      return !!(p.lineage && typeof p.lineage === 'object' && p.upstreamEventId);
    case 'JEV_DECISION_EVALUATED':
      return p.mode === 'shadow' && Array.isArray(p.evaluations);
    default:
      return true;
  }
}
'''

VERDICT_METHOD = '''  /**
   * Verdict-class admission authority. Returns { ok:true } for non-verdict
   * event types. For verdict-class types, the source must be the canonical
   * producer worker AND the payload must carry qualifying provenance.
   * Authentication (who called) never substitutes for this authorization
   * (what the caller may assert). Runs before _skipGovernance: unskippable.
   */
  _assertVerdictAuthority(eventType, source, payload) {
    const producer = VERDICT_PRODUCERS[eventType];
    if (!producer) return { ok: true };
    if (source !== producer) {
      return {
        ok: false,
        reason: `verdict_not_authorized: ${eventType} may only be produced by '${producer}' (got source '${source}')`,
      };
    }
    if (!verdictProvenanceOk(eventType, payload)) {
      return {
        ok: false,
        reason: `verdict_provenance_missing: ${eventType} from '${source}' lacks qualifying producer provenance`,
      };
    }
    return { ok: true };
  }

  async emit(eventType, source, payload, options = {}) {'''

VERDICT_HOOK = '''    // 2b. Verdict-class admission authority — fail closed before persistence.
    // Runs before the _skipGovernance branch: no caller (API, bridge, replay,
    // internal) can bypass producer authorization for verdict-class events.
    const verdictCheck = this._assertVerdictAuthority(eventType, source, payload);
    if (!verdictCheck.ok) {
      this._stats.failed++;
      return { status: 'error', error: verdictCheck.reason, eventId };
    }

    // 3. Check governance (skip for bridge-sourced events that are already governed).'''

patch('ping-runtime/events/unified_event_runtime.js', [
    (
        "const { constitutionalTimeAuthority } = require('../authorities/constitutional_time_authority.js');\n",
        "const { constitutionalTimeAuthority } = require('../authorities/constitutional_time_authority.js');\n" + VERDICT_CONST,
    ),
    (
        "  async emit(eventType, source, payload, options = {}) {",
        VERDICT_METHOD,
    ),
    (
        "    // 3. Check governance (skip for bridge-sourced events that are already governed).",
        VERDICT_HOOK,
    ),
])

# ─── 2. canonical_workers.js — WitnessWorker ───
WITNESS_CTOR = '''class WitnessWorker extends BaseWorker {
  constructor(options = {}) {
    super(options);
    this._name = 'witness';
    // Optional EventValidator for replay-transcript type registration checks.
    // Absent validator => transcripts fail closed (see _replayTranscriptSound).
    this._eventValidator = options.eventValidator || null;
  }'''

EVIDENCE_METHODS = '''    return { status: 'ok', witness };
  }

  /**
   * Evidence qualification for attestation — defense in depth behind the
   * admission barrier. The witness attests ONLY a replay that actually
   * verified AND carries the evidence a genuine kernel execution produces:
   * a deterministic execution fingerprint, a clean violation set, a document
   * binding consistent with the verdict, an upstream reference consistent
   * with the verdict, the producer's authority evidence, and — when a replay
   * transcript is present — a structurally sound transcript (unique event
   * ids, closed causation, registered event types). A bare { verified: true }
   * is a claim, not evidence, and is refused with an observable
   * WITNESS_REJECTED (never silently dropped, never attested).
   */
  _replayEvidenceQualifies(payload, event) {
    const replay = payload.replay || {};
    // (a) verified must be boolean true — strict; 'true'/1 rejected by ===.
    // (Already gated by the caller, re-asserted here so this method is
    // self-contained.)
    if (replay.verified !== true) return { ok: false, reason: 'replay_not_verified' };
    // (b) Deterministic execution fingerprint must be present. The kernel
    // engine always computes one on the verified path; its absence means no
    // verifiable execution took place.
    if (replay.fingerprint === null || replay.fingerprint === undefined || replay.fingerprint === '') {
      return { ok: false, reason: 'replay_fingerprint_missing' };
    }
    // (c) Violations must be an empty array. verified WITH violations is a
    // contradiction, not an attestation.
    if (!Array.isArray(replay.violations) || replay.violations.length > 0) {
      return { ok: false, reason: 'replay_violations_present' };
    }
    // (d) Document binding: a replayed document that disagrees with the
    // verdict's document is a wrong-document forgery.
    if (replay.documentId && payload.documentId && replay.documentId !== payload.documentId) {
      return { ok: false, reason: 'replay_document_mismatch' };
    }
    // (e) Upstream consistency: the replay's upstream reference must agree
    // with the verdict's upstream reference (forged upstream refs rejected).
    if (replay.upstreamEventId && payload.upstreamEventId && replay.upstreamEventId !== payload.upstreamEventId) {
      return { ok: false, reason: 'replay_upstream_mismatch' };
    }
    // (f) Producer authority evidence: the genuine ReplayWorker always
    // attaches the kernel execution authority block. Its absence means the
    // verdict did not come through the genuine producer path. The fixed
    // strings are identifiers, not trust — they must accompany the
    // fingerprint, violations, and ancestry checks above.
    const auth = payload.authority;
    if (!auth || typeof auth !== 'object' || auth.authority !== 'ReplayWorker' || !auth.provider) {
      return { ok: false, reason: 'replay_authority_evidence_missing' };
    }
    // (g) Replay transcript structural soundness, when a transcript is
    // present. The genuine producer never includes one; a present-but-
    // malformed transcript is evidence of forgery.
    if (Array.isArray(replay.replay_events) && replay.replay_events.length > 0) {
      const structural = this._replayTranscriptSound(replay.replay_events, payload);
      if (!structural.ok) return structural;
    }
    return { ok: true };
  }

  /**
   * Structural soundness of a replay transcript: unique event ids, closed
   * causation (every causation_id resolves to a transcript member or the
   * verdict's own upstream event), and registered event types. Fail closed
   * when no type registry is available.
   */
  _replayTranscriptSound(events, payload) {
    const ids = new Set();
    for (const e of events) {
      if (!e || typeof e.event_id !== 'string' || e.event_id.length === 0) {
        return { ok: false, reason: 'replay_transcript_event_missing_id' };
      }
      if (ids.has(e.event_id)) return { ok: false, reason: 'replay_transcript_duplicate_event' };
      ids.add(e.event_id);
    }
    for (const e of events) {
      const cid = e.metadata && e.metadata.causation_id;
      if (cid && !ids.has(cid) && cid !== payload.upstreamEventId) {
        return { ok: false, reason: 'replay_transcript_causation_open' };
      }
      const t = e.event_type;
      if (typeof t === 'string' && t.length > 0) {
        if (this._eventValidator && typeof this._eventValidator.isRegistered === 'function') {
          if (!this._eventValidator.isRegistered(t)) {
            return { ok: false, reason: `replay_transcript_unknown_event_type:${t}` };
          }
        } else {
          // Fail closed: without a type registry the transcript cannot be validated.
          return { ok: false, reason: 'replay_transcript_type_unverifiable' };
        }
      }
    }
    return { ok: true };
  }
}'''

WITNESS_GATE = '''    const isReplayAttestation = event.event_type === 'REPLAY_COMPLETED';
    const replayVerified = payload.replay && payload.replay.verified === true;

    if (isReplayAttestation && !replayVerified) {'''

WITNESS_GATE_NEW = '''    const isReplayAttestation = event.event_type === 'REPLAY_COMPLETED';
    const replayVerified = payload.replay && payload.replay.verified === true;

    // Evidence qualification (defense in depth): a verified claim without
    // the genuine execution evidence is refused, not attested.
    if (isReplayAttestation && replayVerified) {
      const evidence = this._replayEvidenceQualifies(payload, event);
      if (!evidence.ok) {
        console.log(`[WitnessWorker] REFUSING to attest: evidence unqualified for ${documentId || 'unknown'} (reason: ${evidence.reason})`);
        await this._emit('WITNESS_REJECTED', {
          documentId,
          upstreamEventId: event.event_id || event.mission_id,
          replay: payload.replay || null,
          reason: `evidence_unqualified:${evidence.reason}`,
        }, {
          causation_id: event.event_id,
        });
        return { status: 'rejected', reason: `evidence_unqualified:${evidence.reason}` };
      }
    }

    if (isReplayAttestation && !replayVerified) {'''

patch('ping-runtime/workers/canonical_workers.js', [
    (
        '''class WitnessWorker extends BaseWorker {
  constructor(options = {}) {
    super(options);
    this._name = 'witness';
  }''',
        WITNESS_CTOR,
    ),
    (
        WITNESS_GATE,
        WITNESS_GATE_NEW,
    ),
    (
        '''    await this._emit('WITNESS_CREATED', {
      documentId,
      witness,
      upstreamEventId: event.event_id || event.mission_id,
    }, {
      causation_id: event.event_id,
    });

    return { status: 'ok', witness };
  }
}''',
        '''    await this._emit('WITNESS_CREATED', {
      documentId,
      witness,
      upstreamEventId: event.event_id || event.mission_id,
    }, {
      causation_id: event.event_id,
    });

''' + EVIDENCE_METHODS,
    ),
    # NOTE: no registration-site patch needed — registerCanonicalWorkers builds
    # each worker via `new Worker({ ...options, ...workerOpts })`, so passing
    # eventValidator into registerCanonicalWorkers options (gateway_runtime.js)
    # flows into the WitnessWorker constructor automatically.
])

# ─── 3. gateway_runtime.js — pass eventValidator into registerCanonicalWorkers ───
patch('gateway/bootstrap/gateway_runtime.js', [
    (
        """        registerCanonicalWorkers(workerRuntime, {
          eventRuntime: unifiedEventRuntime,
          pool: this._pool,""",
        """        registerCanonicalWorkers(workerRuntime, {
          eventRuntime: unifiedEventRuntime,
          eventValidator, // WitnessWorker consumes options.eventValidator (verdict evidence)
          pool: this._pool,""",
    ),
])

print("ALL PATCHES APPLIED")
