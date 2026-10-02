// Contract tests: projection validator enforces UI CLAIM <= BACKEND PROOF
// mechanically. Run: node --test tests/projection-validator.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import {
  validateProjection,
  ProjectionError,
  ProjectionFinding,
} from "../packages/schemas/src/projection-validator.mjs";
import { withEnvelope } from "../packages/schemas/src/index.mjs";

function missionProjection(envelope) {
  return withEnvelope(
    { id: "a3f9c1", objective: "sweep", current_status: "created" },
    envelope
  );
}

const provenEnv = {
  maturity: "PROVEN",
  proof_status: "verified",
  verified_at: "2026-09-17T14:00:00.000Z",
  evidence_ref: "PHASE0 report sec 2",
  source: "ping_missions via MissionRuntime",
  stage: "WIRED",
};

test("missing evidence fails closed on proven-rung claims", () => {
  // Built without withEnvelope: the validator must still fail closed on
  // deserialized or hand-built projections that assert a proven rung.
  const p = {
    id: "a3f9c1",
    objective: "sweep",
    current_status: "created",
    _envelope: { ...provenEnv, evidence_ref: undefined },
  };
  const r = validateProjection("mission", p);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === "EVIDENCE_MISSING"));
});

test("missing verified_at fails closed on proven-rung claims", () => {
  const p = {
    id: "a3f9c1",
    objective: "sweep",
    current_status: "created",
    _envelope: { ...provenEnv, verified_at: undefined },
  };
  const r = validateProjection("mission", p);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === "VERIFIED_AT_MISSING"));
});

test("missing source fails closed", () => {
  // withEnvelope itself refuses an empty source, so construct manually.
  const p = { id: "x", objective: "y", current_status: "created", _envelope: { maturity: "UNKNOWN", source: " " } };
  const r = validateProjection("mission", p);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === "SOURCE_MISSING"));
});

test("unknown maturity is a finding, not an error", () => {
  const p = missionProjection({ maturity: "UNKNOWN", source: "not yet verified" });
  const r = validateProjection("mission", p);
  assert.equal(r.ok, true);
  assert.ok(r.findings.some((f) => f.kind === "MATURITY_UNKNOWN"));
  assert.ok(!r.errors.length);
});

test("illegal maturity promotion is an error", () => {
  const p = missionProjection(provenEnv);
  const r = validateProjection("mission", p, { backendMaturity: "EXPERIMENTAL" });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === "PROOF_INFLATION"));
});

test("display at or below backend proof passes", () => {
  const p = missionProjection({ ...provenEnv, maturity: "EXPERIMENTAL" });
  const r = validateProjection("mission", p, { backendMaturity: "PROVEN" });
  assert.equal(r.ok, true);
});

test("stale verification is a finding when a freshness rule is set", () => {
  const p = missionProjection(provenEnv);
  const r = validateProjection("mission", p, {
    maxVerifiedAgeMs: 60 * 60 * 1000,
    nowIso: "2026-09-18T14:00:01.000Z",
  });
  assert.equal(r.ok, true);
  assert.ok(r.findings.some((f) => f.kind === "VERIFICATION_STALE"));
});

test("future verified_at is an error", () => {
  const p = missionProjection({ ...provenEnv, verified_at: "2026-09-19T14:00:00.000Z" });
  const r = validateProjection("mission", p, { nowIso: "2026-09-17T14:00:00.000Z" });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === "VERIFIED_AT_FUTURE"));
});

test("unsupported top-level field is a finding, not a silent pass", () => {
  const p = { ...missionProjection(provenEnv), invented_field: "x" };
  const r = validateProjection("mission", p);
  assert.equal(r.ok, true);
  assert.ok(r.findings.some((f) => f.kind === "FIELD_UNSUPPORTED"));
});

test("fabricated identifier pattern is an error", () => {
  const p = withEnvelope(
    { id: "demo-mission-1", objective: "sweep", current_status: "created" },
    provenEnv
  );
  const r = validateProjection("mission", p);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === "IDENTIFIER_FABRICATED"));
});

test("run identity without a runtime authority is an error", () => {
  const p = withEnvelope(
    { id: "run-123" },
    { maturity: "UNPROVEN", source: "browser session", stage: "IMPLEMENTED" }
  );
  const r = validateProjection("run", p);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === "RUN_IDENTITY_UNGROUNDED"));
});

test("run identity with a runtime authority source passes the identity check", () => {
  const p = withEnvelope(
    { id: "run-123" },
    { maturity: "EXPERIMENTAL", source: "ExecutionRuntime attempt record", stage: "CONTRACT_DEFINED", verified_at: "2026-09-17T14:00:00.000Z", evidence_ref: "hypothetical" }
  );
  const r = validateProjection("run", p);
  assert.ok(!r.errors.some((e) => e.code === "RUN_IDENTITY_UNGROUNDED"));
});

test("unknown schema is schema drift", () => {
  const r = validateProjection("fleet", { _envelope: { maturity: "UNKNOWN", source: "x" } });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === "SCHEMA_UNKNOWN"));
});

test("falsified maturity is preserved as a finding", () => {
  const p = missionProjection({ maturity: "FALSIFIED", source: "ORCA audit" });
  const r = validateProjection("mission", p);
  assert.equal(r.ok, true);
  assert.ok(r.findings.some((f) => f.kind === "MATURITY_FALSIFIED"));
});
