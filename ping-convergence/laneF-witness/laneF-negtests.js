"use strict";
// LANE F negative tests for WITNESS_CREATED binding claims.
// Isolated test infra: pure node, no DB, no source-tree mutation.
// Run from the convergence worktree on the Pig:
//   node /tmp/laneF-negtests.js
const assert = require("assert");
const WT = "/home/nolan/worktrees/constitutional-convergence-authority-law";
const workers = require(WT + "/ping-runtime/workers/canonical_workers");
const WitnessWorker = workers.WitnessWorker;
const ReplayWorker = workers.ReplayWorker;
const prov = require(WT + "/gateway/kernel_replay_execution_provider");
const KernelReplayExecutionProvider = prov.KernelReplayExecutionProvider;
const uer = require(WT + "/ping-runtime/events/unified_event_runtime");
const UnifiedEventRuntime = uer.UnifiedEventRuntime;

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name: name, fn: fn }); }
async function run() {
  console.log("=== LANE F witness binding negative tests ===");
  for (const t of tests) {
    try { await t.fn(); console.log("PASS " + t.name); passed++; }
    catch (e) { console.log("FAIL " + t.name); console.log("  " + (e && e.message)); failed++; }
  }
  console.log("=== passed=" + passed + " failed=" + failed + " ===");
  process.exit(failed > 0 ? 1 : 0);
}

function pinEvent(id, doc, type, ch) {
  return {
    event_id: id, event_type: type || "artifact_commit",
    timestamp: "2026-01-15T10:00:00.000Z",
    canonical_hash: ch,
    artifact_id: "art-1", payload: { doc: doc }, metadata: {}
  };
}
const E1 = pinEvent("evt-pin-0001", "doc-a", "artifact_commit",
  "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aa");
const E2 = pinEvent("evt-pin-0002", "doc-b", "artifact_update",
  "bbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabb");
function transcript(events) {
  return { transcript_id: "lf-transcript", state: { replay_events: events } };
}

// NEG-LF1: changed replay input -> different attestation material
test("NEG-LF1 changed input produces different witness_root and fingerprint", async () => {
  const p = new KernelReplayExecutionProvider();
  const r1 = await p.executeReplay(transcript([E1, E2]));
  const e2mod = pinEvent("evt-pin-0002", "doc-b-MODIFIED", "artifact_update",
    "bbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabb");
  const r2 = await p.executeReplay(transcript([E1, e2mod]));
  assert.strictEqual(r1.status, "ok");
  assert.strictEqual(r2.status, "ok");
  assert.notStrictEqual(r2.witness_root, r1.witness_root, "root must change when input changes");
  const f1 = (r1.fingerprint && r1.fingerprint.hash) || r1.fingerprint;
  const f2 = (r2.fingerprint && r2.fingerprint.hash) || r2.fingerprint;
  assert.notStrictEqual(f2, f1, "fingerprint must change when input changes");
});

// NEG-LF2: reordered events -> different root (ordering detected)
test("NEG-LF2 event reorder produces different witness_root and fingerprint", async () => {
  const p = new KernelReplayExecutionProvider();
  const r1 = await p.executeReplay(transcript([E1, E2]));
  const r2 = await p.executeReplay(transcript([E2, E1]));
  assert.notStrictEqual(r2.witness_root, r1.witness_root, "root must change when order changes");
  const f1 = (r1.fingerprint && r1.fingerprint.hash) || r1.fingerprint;
  const f2 = (r2.fingerprint && r2.fingerprint.hash) || r2.fingerprint;
  assert.notStrictEqual(f2, f1, "fingerprint must change when order changes");
});

// NEG-LF3: engine version change -> version family changes, root hash invariant
test("NEG-LF3 engine version v2 binds new version family; root hash unchanged", async () => {
  const p1 = new KernelReplayExecutionProvider();
  const p2 = new KernelReplayExecutionProvider({ engineVersion: "v2" });
  const r1 = await p1.executeReplay(transcript([E1, E2]));
  const r2 = await p2.executeReplay(transcript([E1, E2]));
  assert.strictEqual(r1.replay_engine_version, "v1");
  assert.strictEqual(r2.replay_engine_version, "v2");
  assert.strictEqual(r1.witness_algorithm_version, "merkle_sha256_v1");
  assert.strictEqual(r2.witness_algorithm_version, "merkle_sha256_v2");
  assert.strictEqual(r1.witness_version, "v1");
  assert.strictEqual(r2.witness_version, "v2");
  // The merkle version is NOT mixed into the root hash preimage:
  // same input under a different engine version yields the same root.
  assert.strictEqual(r2.witness_root, r1.witness_root,
    "root hash does not mix the version; version family lives only in recorded fields");
});

// NEG-LF4: full chain under v2 -> WITNESS_CREATED binds v2 versions
test("NEG-LF4 WITNESS_CREATED binds engine v2 versions end to end", async () => {
  const emitted = [];
  const rt = {
    emit: async (eventType, source, payload, options) => {
      emitted.push({ eventType: eventType, source: source, payload: payload, options: options });
      return { status: "ok", event_id: "mock-" + emitted.length };
    }
  };
  const rw = new ReplayWorker({ eventRuntime: rt, replayProvider: new KernelReplayExecutionProvider({ engineVersion: "v2" }) });
  await rw.handle({
    event_id: "evt-replay-lf4", event_type: "REPLAY_VERIFY",
    namespace: "tenant::lf", metadata: {},
    payload: { documentId: "doc-lf4", replay_events: [E1, E2] }
  });
  const rc = emitted.filter((e) => e.eventType === "REPLAY_COMPLETED")[0];
  assert.ok(rc, "REPLAY_COMPLETED emitted");
  assert.strictEqual(rc.payload.replay.replay_engine_version, "v2");
  const row = { event_id: "evt-replay-lf4-row", event_type: "REPLAY_COMPLETED", payload: rc.payload };
  const ww = new WitnessWorker({
    eventRuntime: rt,
    attestationSource: async (id) => (id === row.event_id ? row : null)
  });
  const res = await ww.handle({
    event_id: "evt-trigger-lf4", event_type: "REPLAY_COMPLETED",
    namespace: "tenant::lf", metadata: {},
    payload: { event_id: row.event_id, documentId: "doc-lf4" }
  });
  assert.strictEqual(res.status, "ok");
  assert.strictEqual(res.witness.replay_engine_version, "v2");
  assert.strictEqual(res.witness.witness_algorithm_version, "merkle_sha256_v2");
  assert.strictEqual(res.witness.input_schema_version, "witness-input/v1");
  assert.strictEqual(res.witness.algorithm_version, "witness-attest/v1");
  const wc = emitted.filter((e) => e.eventType === "WITNESS_CREATED")[0];
  assert.ok(wc, "WITNESS_CREATED emitted");
  assert.strictEqual(wc.payload.witness.replay_engine_version, "v2");
});

// NEG-LF5: retry identity through the real UnifiedEventRuntime (pool-less)
test("NEG-LF5 identical logical attestation retries mint identical event_id", async () => {
  const spine = new UnifiedEventRuntime();
  const lid = { kind: "witness-attestation", replay_event_id: "evt-replay-lf5", witness_root: "abc123" };
  const r1 = await spine.emit("WITNESS_CREATED", "witness", { witness: { a: 1 } }, { logical_id: lid });
  const r2 = await spine.emit("WITNESS_CREATED", "witness", { witness: { a: 2 } }, { logical_id: lid });
  assert.strictEqual(r1.status, "ok");
  assert.strictEqual(r2.status, "ok");
  assert.strictEqual(r2.eventId, r1.eventId, "retry of same logical attestation must mint the same event_id");
  // different logical identity -> different event_id
  const r3 = await spine.emit("WITNESS_CREATED", "witness", { witness: { a: 1 } },
    { logical_id: { kind: "witness-attestation", replay_event_id: "evt-replay-lf5", witness_root: "def456" } });
  assert.notStrictEqual(r3.eventId, r1.eventId, "different witness_root must mint a different event_id");
  // version fields are NOT part of the identity preimage
  const r4 = await spine.emit("WITNESS_CREATED", "witness",
    { witness: { replay_engine_version: "v2", witness_algorithm_version: "merkle_sha256_v2" } },
    { logical_id: lid });
  assert.strictEqual(r4.eventId, r1.eventId,
    "changing only recorded version fields does not change the attestation event_id");
});

// NEG-LF6: rebuild reproducibility, byte-identical replay material
test("NEG-LF6 rebuild from same source is byte-identical", async () => {
  const p = new KernelReplayExecutionProvider();
  const r1 = await p.executeReplay(transcript([E1, E2]));
  const r2 = await p.executeReplay(transcript([E1, E2]));
  assert.strictEqual(r2.witness_root, r1.witness_root);
  assert.deepStrictEqual(r2.witness_root_full, r1.witness_root_full);
  const f1 = (r1.fingerprint && r1.fingerprint.hash) || r1.fingerprint;
  const f2 = (r2.fingerprint && r2.fingerprint.hash) || r2.fingerprint;
  assert.strictEqual(f2, f1);
  assert.deepStrictEqual(r2.canonical_bytes, r1.canonical_bytes, "canonical bytes byte-identical");
});

// NEG-LF7: canonical path, verified row without witness_root -> fail closed
test("NEG-LF7 verified canonical row missing witness_root is rejected (fail-closed)", async () => {
  const emitted = [];
  const rt = {
    emit: async (eventType, source, payload, options) => {
      emitted.push({ eventType: eventType, payload: payload });
      return { status: "ok", event_id: "mock-" + emitted.length };
    }
  };
  const row = {
    event_id: "evt-replay-lf7", event_type: "REPLAY_COMPLETED",
    payload: { documentId: "doc-lf7", replay: { verified: true, reason: "kernel_verified", fingerprint: "sha256:x" } }
  };
  const ww = new WitnessWorker({
    eventRuntime: rt,
    attestationSource: async (id) => (id === row.event_id ? row : null)
  });
  const res = await ww.handle({
    event_id: "evt-trigger-lf7", event_type: "REPLAY_COMPLETED",
    namespace: "tenant::lf", metadata: {},
    payload: { event_id: row.event_id, documentId: "doc-lf7" }
  });
  assert.strictEqual(res.status, "rejected");
  assert.strictEqual(res.reason, "missing_witness_root");
  assert.strictEqual(emitted.filter((e) => e.eventType === "WITNESS_CREATED").length, 0);
  assert.strictEqual(emitted.filter((e) => e.eventType === "WITNESS_REJECTED").length, 1);
});

run().catch((e) => { console.error("HARNESS FAILURE", e); process.exit(2); });
