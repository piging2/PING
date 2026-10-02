// Contract tests: operation-result interpretation and proof ladder.
// The three backend success shapes are never normalized into one field;
// PROVEN_COMPLETE derives only from satisfied proof dimensions.
// Run: node --test tests/operation-result.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import {
  interpretOperationResult,
  requiredProofRungs,
  PROOF_LADDER,
  ContractError,
} from "../packages/schemas/src/index.mjs";

test("ok with skipped persistence is NOT proven complete", () => {
  // The exact constitutional defect: emit() returns {status:'ok'} when the
  // INSERT was skipped on a null pool. Transport acceptance != persistence.
  const r = interpretOperationResult({
    interpretedFrom: "{status:'ok'}",
    transportStatus: "accepted",
    executionStatus: "ran",
    persistenceStatus: "skipped",
    verificationStatus: "unknown",
    requiredPersistence: true,
  });
  assert.equal(r.proven_complete, false);
  assert.equal(r.persistence_status, "skipped");
});

test("proven complete requires execution, persistence, verification", () => {
  const r = interpretOperationResult({
    interpretedFrom: "{success:true}",
    transportStatus: "accepted",
    executionStatus: "ran",
    persistenceStatus: "persisted",
    verificationStatus: "verified",
    requiredPersistence: true,
  });
  assert.equal(r.proven_complete, true);
});

test("unverified write is not proven complete", () => {
  const r = interpretOperationResult({
    interpretedFrom: "{status:'completed'}",
    transportStatus: "accepted",
    executionStatus: "ran",
    persistenceStatus: "persisted",
    verificationStatus: "unverified",
    requiredPersistence: true,
  });
  assert.equal(r.proven_complete, false);
});

test("reads do not require persistence for completion", () => {
  const r = interpretOperationResult({
    interpretedFrom: "200 GET",
    transportStatus: "accepted",
    executionStatus: "ran",
    persistenceStatus: "unknown",
    verificationStatus: "verified",
    requiredPersistence: false,
  });
  assert.equal(r.proven_complete, true);
});

test("raw shape is preserved, never rewritten", () => {
  const r = interpretOperationResult({
    interpretedFrom: "{status:'ok'}",
    transportStatus: "accepted",
    executionStatus: "ran",
    persistenceStatus: "persisted",
    verificationStatus: "verified",
  });
  assert.equal(r.interpreted_from, "{status:'ok'}");
});

test("unknown status vocabulary value throws", () => {
  assert.throws(
    () =>
      interpretOperationResult({
        interpretedFrom: "x",
        transportStatus: "maybe",
        executionStatus: "ran",
        persistenceStatus: "persisted",
        verificationStatus: "verified",
      }),
    (e) => e instanceof ContractError && e.code === "OPERATION_STATUS_UNKNOWN"
  );
});

test("proof ladder is ordered and stage rungs never skip", () => {
  const idx = new Map(PROOF_LADDER.map((r, i) => [r, i]));
  const wired = requiredProofRungs("WIRED");
  assert.deepEqual(wired, ["IMPLEMENTED", "REACHABLE", "WIRED"]);
  assert.ok(idx.get("IMPLEMENTED") < idx.get("REACHABLE"));
  assert.ok(idx.get("REACHABLE") < idx.get("WIRED"));
  const rv = requiredProofRungs("RUNTIME_VERIFIED");
  assert.deepEqual(rv, ["WIRED", "EXECUTED", "PERSISTED", "VERIFIED"]);
});

test("implemented does not imply wired", () => {
  const impl = requiredProofRungs("IMPLEMENTED");
  assert.ok(!impl.includes("WIRED"));
  assert.ok(!impl.includes("PERSISTED"));
});

test("unknown stage throws", () => {
  assert.throws(() => requiredProofRungs("LIVE"), (e) => e.code === "STAGE_UNKNOWN");
});
