const { StandardEventSchema } = require('../authorities/standard_event_schema');
const { witnessAuthority } = require('../authorities/witness_authority');
const { CanonicalAuthority } = require('../authorities/canonical_authority');
const { constitutionalTimeAuthority } = require('../authorities/constitutional_time_authority');
const { ExecutionArtifact } = require('./execution_artifact');

class ConstitutionalExecutionPipeline {
  constructor(eventRepository, dispatcher, reducerRegistry, projectionRegistry, replayDecisionAuthority, pool) {
    this._eventRepository = eventRepository;
    this._dispatcher = dispatcher;
    this._reducerRegistry = reducerRegistry;
    this._projectionRegistry = projectionRegistry;
    this._replayDecision = replayDecisionAuthority;
    this._pool = pool;
  }

  async execute(request) {
    const artifact = new ExecutionArtifact(request);
    let client;

    try {
      client = await this._pool.connect();
      await client.query('BEGIN');

      // Stage 1: Schema — create constitutional event
      const event = StandardEventSchema.create(
        request.event_type, request.aggregate_id, request.aggregate_type,
        request.event_data, request.authority || 'api',
        { sequence: request.sequence || 1 }
      );
      artifact.addStage('schema', { event, canonicalHash: event.canonical_hash });

      // Stage 2: Repository — persist within transaction
      //
      // Event-authority convergence (2026-09-19, caller-adaptation lane):
      // the repository is a PROJECTION/ADAPTER, not an event authority.
      // This path derives from an already-accepted canonical event; it does
      // not accept events. The caller must have routed the happening through
      // the canonical path first and pass the resulting canonical event id
      // as request.canonical_event_id. Without that proof the repository
      // fails closed loudly (UnanchoredCanonicalWriteError); no silent write.
      const appendOptions = { client };
      if (request && request.canonical_event_id) {
        appendOptions.canonicalEventId = request.canonical_event_id;
      }
      await this._eventRepository.appendEvent({
        event_id: event.event_id,
        object_id: request.aggregate_id,
        event_type: request.event_type,
        aggregate_type: request.aggregate_type,
        sequence: request.sequence || 1,
        payload: event.payload,
        witness: event.witness,
        timestamp: event.timestamp,
        authority: request.authority || 'api',
        authority_version: event.authority_version,
        causation_id: event.causation_id,
        correlation_id: event.correlation_id,
        RuntimeID: event.RuntimeID,
        PreviousEventHash: event.PreviousEventHash,
        CanonicalEventHash: event.CanonicalEventHash,
        ReducerHash: event.ReducerHash,
        WitnessHash: event.WitnessHash,
        ReplayHash: event.ReplayHash
      }, appendOptions);
      artifact.addStage('repository', { stored: true, eventId: event.event_id });

      // Stage 3: Dispatch + Reducer
      const reducerEntries = this._dispatcher.resolve(event);
      const reducerResults = [];
      let currentState = {};
      for (const entry of reducerEntries) {
        const result = await this._reducerRegistry.invoke(entry.name, entry.fn, event, currentState);
        reducerResults.push(result);
        currentState = result.state;
      }
      artifact.addStage('reducer', { applied: reducerResults.length, results: reducerResults });

      // Stage 4: Witness — verify witness integrity
      if (event.witness) {
        const witnessResult = witnessAuthority.verifyWitness(event.witness);
        artifact.addStage('witness', {
          witnessPresent: true,
          verified: witnessResult.valid,
          reason: witnessResult.reason
        });
      } else {
        artifact.addStage('witness', { witnessPresent: false, verified: false, reason: 'No witness on event' });
      }

      // Stage 5: Verification — runs BEFORE projection
      const verification = await this._runVerification(event);
      artifact.addStage('verification', verification);

      if (!verification.verified) {
        await client.query('ROLLBACK');
        artifact.fail(new Error('Verification failed'));
        return artifact;
      }

      // Stage 6: Projection — runs AFTER verification succeeds
      const projectionResults = await this._projectionRegistry.executeAll(event, reducerResults, { client });
      artifact.addStage('projection', { results: projectionResults });

      // Stage 7: Replay decision
      const replayDecision = this._replayDecision.decide(event, artifact);
      artifact.addStage('replayDecision', replayDecision);

      await client.query('COMMIT');

    } catch (error) {
      if (client) {
        try { await client.query('ROLLBACK'); } catch (_) { /* ignore rollback errors */ }
      }
      artifact.fail(error);
    } finally {
      if (client) client.release();
    }

    return artifact;
  }

  async _runVerification(event) {
    const checks = {};

    // Witness integrity (delegates to WitnessAuthority internally)
    if (event.witness) {
      checks.witnessIntegrity = true;
    } else {
      checks.witnessIntegrity = false;
    }

    // Canonical event hash present
    if (event.CanonicalEventHash) {
      checks.canonicalHash = true;
    } else {
      checks.canonicalHash = false;
    }

    // Witness hash present
    if (event.WitnessHash) {
      checks.witnessHash = true;
    } else {
      checks.witnessHash = false;
    }

    // Replay hash present
    if (event.ReplayHash) {
      checks.replayHash = true;
    } else {
      checks.replayHash = false;
    }

    // Schema conformance
    try {
      StandardEventSchema.validate(event);
      checks.schema = true;
    } catch (_) {
      checks.schema = false;
    }

    const allPassed = Object.values(checks).every(Boolean);

    return {
      verified: allPassed,
      checks,
      verifiedAt: constitutionalTimeAuthority.nowAsMillis(),
      verificationVersion: '1.0.0'
    };
  }
}

module.exports = { ConstitutionalExecutionPipeline };
