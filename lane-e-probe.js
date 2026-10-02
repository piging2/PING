"use strict";
// LANE E failure-injection probe (ephemeral, /tmp only).
// Q: can a bounded replay report COMPLETE without proving source completeness?
const WT = "/home/nolan/worktrees/constitutional-convergence-authority-law";
const { ReplayWorker, WitnessWorker } = require(WT + "/ping-runtime/workers/canonical_workers");
const { KernelReplayExecutionProvider } = require(WT + "/gateway/kernel_replay_execution_provider");

class MockEventRuntime {
  constructor() { this._emitted = []; }
  async emit(eventType, source, payload, options) {
    options = options || {};
    const event = {
      event_id: "evt-probe-" + this._emitted.length,
      event_type: eventType, source: source, payload: payload,
      metadata: Object.assign({}, options.metadata || {}),
      timestamp: new Date().toISOString(),
    };
    this._emitted.push(event);
    return { status: "ok", event_id: event.event_id };
  }
  emittedOf(type) { return this._emitted.filter(function (e) { return e.event_type === type; }); }
}

// A ReplayExecutionPort that omits the W-2 completeness contract entirely
// (pre-W-2 provider, third-party port implementation, or a future early-return).
const legacyProvider = {
  async executeReplay(transcript, options) {
    const evs = (transcript && transcript.state && transcript.state.replay_events) || [];
    return {
      status: "ok",
      violations: [],
      event_count: evs.length,
      witness_root: "deadbeef-probe",
      fingerprint: "fp-probe",
      // NOTE: deliberately no `completeness` field
    };
  },
};

function makeTrigger() {
  return {
    event_id: "evt-replay-verify-probe", event_type: "REPLAY_VERIFY",
    namespace: "tenant::probe", metadata: {},
    payload: {
      documentId: "doc-probe",
      replay_events: [
        { event_id: "e1", event_type: "artifact_commit", timestamp: "2026-01-01T00:00:00.000Z", payload: { a: 1 }, metadata: {} },
        { event_id: "e2", event_type: "artifact_commit", timestamp: "2026-01-01T00:01:00.000Z", payload: { a: 2 }, metadata: {} },
      ],
    },
  };
}

(async function () {
  // PROBE 1: non-W-2 provider result (no completeness field) through ReplayWorker
  const rt1 = new MockEventRuntime();
  const rw = new ReplayWorker({ eventRuntime: rt1, replayProvider: legacyProvider });
  await rw.handle(makeTrigger());
  const emitted = rt1.emittedOf("REPLAY_COMPLETED");
  const replay = emitted[0].payload.replay;
  console.log("PROBE1 REPLAY_COMPLETED verified=" + replay.verified +
    " reason=" + replay.reason + " completeness=" + replay.completeness);

  // PROBE 1b: canonical WitnessWorker path on that row
  const canonicalRow = { event_id: "evt-replay-probe-1", event_type: "REPLAY_COMPLETED", payload: emitted[0].payload };
  const rt2 = new MockEventRuntime();
  const ww = new WitnessWorker({
    eventRuntime: rt2,
    attestationSource: async function (id) { return id === canonicalRow.event_id ? canonicalRow : null; },
  });
  const wres = await ww.handle({
    event_id: "evt-trigger-probe-1", event_type: "REPLAY_COMPLETED",
    namespace: "tenant::probe", metadata: {},
    payload: { event_id: canonicalRow.event_id, documentId: "doc-probe" },
  });
  console.log("PROBE1b witness status=" + wres.status +
    " replay_completeness=" + (wres.witness ? wres.witness.replay_completeness : "n/a"));
  console.log("PROBE1b WITNESS_CREATED=" + rt2.emittedOf("WITNESS_CREATED").length +
    " WITNESS_REJECTED=" + rt2.emittedOf("WITNESS_REJECTED").length);

  // PROBE 2: real W-2 provider, input pre-truncated at the source (2-event
  // journal, only the 2nd event handed in). Can the provider see it?
  const p = new KernelReplayExecutionProvider();
  const r2 = await p.executeReplay({
    transcript_id: "probe2",
    state: { replay_events: [
      { event_id: "e2", event_type: "artifact_commit", timestamp: "2026-01-01T00:01:00.000Z", payload: { a: 2 }, metadata: {} },
    ] },
  });
  console.log("PROBE2 provider completeness=" + r2.completeness +
    " input_event_count=" + r2.input_event_count + " input_truncated=" + r2.input_truncated);
})().catch(function (e) { console.error("PROBE ERROR: " + (e && e.stack || e)); process.exit(2); });
