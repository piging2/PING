/**
 * H24 witness-signer seam (default OFF).
 *
 * normalizeWitnessSigner accepts either:
 *   - a function (replayObject) => Promise<signedShape>, where signedShape is
 *     exactly the POST /witness/sign response fields
 *     { witness_id, claim_id, witness_root, witness_signature, public_key,
 *       algorithm: 'ed25519', verified: true }; or
 *   - an object exposing async record(replayObject) + certify(witnessObject)
 *     like gateway/witness_recorder.js, adapted here to the same signed shape
 *     (record -> certify -> self-verify, mirroring /witness/sign, fail closed).
 * null/undefined => no signer (legacy unsigned path, byte-identical to pre-H24).
 * Anything else throws at construction time (fail closed at wiring, not at
 * event time).
 */
function normalizeWitnessSigner(signer) {
  if (signer === undefined || signer === null) return null;
  if (typeof signer === 'function') return signer;
  if (typeof signer.record === 'function' && typeof signer.certify === 'function') {
    return async (replayObject) => {
      const witnessObject = await signer.record(replayObject);
      const certified = await signer.certify(witnessObject);
      if (typeof signer.verifySignature === 'function') {
        const ok = await signer.verifySignature(certified);
        if (!ok) throw new Error('witness signature self-verification failed');
      }
      if (!certified || !certified.payload) {
        throw new Error('signer returned malformed witness object');
      }
      // Exactly the POST /witness/sign response fields. No third format.
      return {
        witness_id: certified.id,
        claim_id: replayObject.id,
        witness_root: certified.payload.witness_root,
        witness_signature: certified.payload.signature,
        public_key: certified.payload.public_key,
        algorithm: certified.payload.algorithm,
        verified: true,
      };
    };
  }
  throw new Error('witnessSigner must be a function or an object exposing record+certify');
}

/**
 * Fail-closed shape check on signer output: the worker never emits an
 * attestation whose signed fields are malformed.
 */
function assertSignedWitnessShape(signed) {
  const required = ['witness_id', 'witness_root', 'witness_signature', 'public_key', 'algorithm', 'verified'];
  if (!signed || typeof signed !== 'object') {
    throw new Error('witness signer returned a non-object');
  }
  for (const key of required) {
    if (signed[key] === undefined || signed[key] === null || signed[key] === '') {
      throw new Error(`witness signer response missing field: ${key}`);
    }
  }
  if (signed.algorithm !== 'ed25519') {
    throw new Error(`witness signer returned unexpected algorithm: ${signed.algorithm}`);
  }
  if (signed.verified !== true) {
    throw new Error('witness signer response is not verified');
  }
}

/**
 * Build the minimal ReplayObject with the same construction as
 * gateway/routes/witness.js:38-42. The witness root is derived deterministically
 * from the verified replay evidence, mirroring /witness/sign's resolveWitnessRoot
 * fallback (CanonicalAuthority.hashBytes(CanonicalBytes.serialize(...))).
 * Requires are lazy: the unsigned default path never loads these modules.
 */
function buildMinimalReplayObject(event, payload) {
  const { CanonicalAuthority } = require('../authorities/canonical_authority.js');
  const { CanonicalBytes } = require('../../runtime/kernel/authorities/canonical_authority.js');
  const claimId = payload.claim_id || event.event_id || event.mission_id;
  const witnessRoot = CanonicalAuthority.hashBytes(CanonicalBytes.serialize(payload.replay));
  return {
    id: claimId,
    canonical_bytes: Buffer.from(witnessRoot, 'utf8'),
    payload: { result: 'success', stages: [] },
    health: 'healthy',
  };
}

/**
 * H24: resolve the optional WitnessWorker signer. DEFAULT OFF.
 * An explicit options.witnessSigner wins (including null, which forces off).
 * Otherwise the PING_WITNESS_SIGNING env flag ('1' or 'true') lazily requires
 * gateway/witness_recorder.js in this same Node process (Node-crypto-only
 * dependency closure, no express/pg) and injects one WitnessRecorder: the
 * same signing authority behind POST /witness/sign.
 */
function resolveWitnessSigner(options = {}) {
  if (Object.prototype.hasOwnProperty.call(options, 'witnessSigner')) {
    return options.witnessSigner || undefined;
  }
  const flag = process.env.PING_WITNESS_SIGNING;
  if (flag === '1' || flag === 'true') {
    const { WitnessRecorder } = require('../../gateway/witness_recorder.js');
    return new WitnessRecorder();
  }
  return undefined;
}

/**
 * WitnessWorker — processes WITNESS_CREATE events.
 * Creates witness attestations for events.
 *
 * H24: optional witnessSigner (default OFF). When absent, the legacy unsigned
 * attestation below is byte-identical to the pre-H24 behavior. When present,
 * signing happens ONLY behind the W7 honesty gate (payload.replay.verified
 * === true); direct WITNESS_CREATE commands carry no replay evidence and stay
 * on the legacy path, so the worker never fabricates a signed "success".
 */
class WitnessWorker extends BaseWorker {
  constructor(options = {}) {
    super(options);
    this._name = 'witness';
    this._witnessSigner = normalizeWitnessSigner(options.witnessSigner);
  }

  async handle(event) {
    // Set the triggering event so _emit's trace contract (namespace,
    // correlation_id, causation_id inheritance) works on direct invocation —
    // identical to WorkerRuntime.dispatch, which sets this._event first.
    this._event = event;
    const payload = event.payload || {};
    const documentId = payload.documentId || payload._object_id;

    console.log(`[WitnessWorker] Processing ${event.event_type} for ${documentId || 'unknown'}`);

    // Failure-honesty gate (W7): on REPLAY_COMPLETED the witness must ONLY
    // attest a replay that actually verified. If verification is absent or
    // false, the witness refuses to attest (never fabricates an attestation
    // for an unverified replay) and records an observable WITNESS_REJECTED.
    const isReplayAttestation = event.event_type === 'REPLAY_COMPLETED';
    const replayVerified = payload.replay && payload.replay.verified === true;

    if (isReplayAttestation && !replayVerified) {
      const reason = payload.replay?.reason || 'replay_not_verified';
      console.log(`[WitnessWorker] REFUSING to attest unverified replay for ${documentId || 'unknown'} (reason: ${reason})`);

      await this._emit('WITNESS_REJECTED', {
        documentId,
        upstreamEventId: event.event_id || event.mission_id,
        replay: payload.replay || null,
        reason: `unverified_replay:${reason}`,
      }, {
        causation_id: event.event_id,
      });

      return { status: 'rejected', reason: `unverified_replay:${reason}` };
    }

    // H24 sign-behind-W7: a configured signer signs ONLY a verified replay.
    // Signing failure fails closed: no WITNESS_CREATED is emitted; an
    // observable WITNESS_REJECTED records why (mirrors the W7 honesty
    // semantics — never emit an attestation the worker cannot stand behind).
    if (this._witnessSigner && replayVerified) {
      try {
        const replayObject = buildMinimalReplayObject(event, payload);
        const signed = await this._witnessSigner(replayObject);
        assertSignedWitnessShape(signed);

        const witness = {
          documentId,
          eventType: event.event_type,
          timestamp: constitutionalTimeAuthority.nowAsISOString(),
          ...signed,
        };

        await this._emit('WITNESS_CREATED', {
          documentId,
          witness,
          upstreamEventId: event.event_id || event.mission_id,
        }, {
          causation_id: event.event_id,
        });

        return { status: 'ok', witness, signed: true };
      } catch (err) {
        const reason = `witness_sign_failed:${err && err.message ? err.message : String(err)}`;
        console.log(`[WitnessWorker] Signing failed for ${documentId || 'unknown'} (${reason}); refusing to attest`);

        await this._emit('WITNESS_REJECTED', {
          documentId,
          upstreamEventId: event.event_id || event.mission_id,
          replay: payload.replay || null,
          reason,
        }, {
          causation_id: event.event_id,
        });

        return { status: 'rejected', reason };
      }
    }

    const witness = {
      documentId,
      eventType: event.event_type,
      timestamp: constitutionalTimeAuthority.nowAsISOString(),
      attestation: event.event_id ? `witness-${event.event_id.slice(0, 16)}` : `witness-${documentId || 'unknown'}`,
    };

    await this._emit('WITNESS_CREATED', {
      documentId,
      witness,
      upstreamEventId: event.event_id || event.mission_id,
    }, {
      causation_id: event.event_id,
    });

    return { status: 'ok', witness };
  }
}
