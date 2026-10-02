// @ping/schemas: runtime contract helpers.
// Every projection carries the maturity/proof envelope in-band.
// Binding invariant: UI CLAIM <= BACKEND PROOF.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const schemaDir = join(here, "schemas");

export const MATURITY = Object.freeze([
  "PROVEN",
  "BUILT_NOT_LIVE",
  "EXPERIMENTAL",
  "DIRECTION",
  "UNPROVEN",
  "FALSIFIED",
  "UNKNOWN",
]);

export const STAGES = Object.freeze([
  "HARVESTED",
  "CONTRACT_DEFINED",
  "IMPLEMENTED",
  "WIRED",
  "RUNTIME_VERIFIED",
  "DEPLOYED",
]);

// Ladder rank for the no-inflation check. Higher rank = stronger claim.
const MATURITY_RANK = Object.freeze({
  FALSIFIED: -1,
  UNKNOWN: 0,
  UNPROVEN: 1,
  DIRECTION: 2,
  EXPERIMENTAL: 3,
  BUILT_NOT_LIVE: 4,
  PROVEN: 5,
});

export class ContractError extends Error {
  constructor(code, boundary, detail) {
    super(`[${code}] ${boundary}: ${detail}`);
    this.name = "ContractError";
    this.code = code;
    this.boundary = boundary;
    this.detail = detail;
    this.retryable = false;
    this.stateChanged = false;
    this.evidenceValid = true;
  }
}

export class ProofMetadataError extends ContractError {
  constructor(detail) {
    super("PROOF_METADATA_MISSING", "schemas/envelope", detail);
    this.name = "ProofMetadataError";
  }
}

export class ProofInflationError extends ContractError {
  constructor(displayed, backend) {
    super(
      "PROOF_INFLATION",
      "schemas/maturity",
      `UI claim '${displayed}' exceeds backend proof '${backend}'`
    );
    this.name = "ProofInflationError";
  }
}

/**
 * Assert a displayed maturity never exceeds the backend's proven rung.
 * Throws ProofInflationError on inflation. Deflation is allowed.
 */
export function assertNoProofInflation(displayed, backend) {
  const d = MATURITY_RANK[displayed];
  const b = MATURITY_RANK[backend];
  if (d === undefined)
    throw new ContractError("MATURITY_UNKNOWN", "schemas/maturity", `Displayed maturity '${displayed}' is not in the vocabulary`);
  if (b === undefined)
    throw new ContractError("MATURITY_UNKNOWN", "schemas/maturity", `Backend maturity '${backend}' is not in the vocabulary`);
  if (d > b) throw new ProofInflationError(displayed, backend);
  return true;
}

const ENVELOPE_PROOF_REQUIRED = new Set(["PROVEN", "BUILT_NOT_LIVE", "EXPERIMENTAL"]);

/**
 * Attach the maturity/proof envelope to a projection object.
 * Fail-closed: maturity values that assert a proven rung (PROVEN,
 * BUILT_NOT_LIVE, EXPERIMENTAL) require verified_at and evidence_ref.
 * Missing metadata throws ProofMetadataError; callers that cannot
 * satisfy it must use failClosedProjection() instead.
 */
export function withEnvelope(obj, envelope) {
  if (!envelope || typeof envelope !== "object")
    throw new ProofMetadataError("envelope is required");
  const { maturity, source } = envelope;
  if (!MATURITY.includes(maturity))
    throw new ProofMetadataError(`maturity '${maturity}' is not in the vocabulary`);
  if (!source || typeof source !== "string" || source.length === 0)
    throw new ProofMetadataError("envelope.source is required");
  if (envelope.stage !== undefined && !STAGES.includes(envelope.stage))
    throw new ProofMetadataError(`stage '${envelope.stage}' is not in the vocabulary`);
  if (ENVELOPE_PROOF_REQUIRED.has(maturity)) {
    if (!envelope.verified_at)
      throw new ProofMetadataError(`maturity '${maturity}' requires verified_at`);
    if (!envelope.evidence_ref)
      throw new ProofMetadataError(`maturity '${maturity}' requires evidence_ref`);
  }
  return { ...obj, _envelope: { ...envelope } };
}

/**
 * Fail-closed projection for unreadable or unverifiable state.
 * Renders as UNKNOWN, never a silent zero or a fake "all clear".
 */
export function failClosedProjection(kind, reason, source = "UNKNOWN") {
  return {
    kind,
    reason,
    _envelope: {
      maturity: "UNKNOWN",
      proof_status: "unavailable",
      source,
      stage: "CONTRACT_DEFINED",
    },
  };
}

/** Gap-labeled projection for capability that does not exist yet in the backend. */
export function gapProjection(kind, gap, evidenceRef) {
  return {
    kind,
    gap,
    _envelope: {
      maturity: "UNPROVEN",
      proof_status: "gap",
      source: "ADR boundary: backend wiring absent",
      stage: "CONTRACT_DEFINED",
      ...(evidenceRef ? { evidence_ref: evidenceRef } : {}),
    },
  };
}

const schemaCache = new Map();

function loadSchema(name) {
  if (!schemaCache.has(name)) {
    const raw = readFileSync(join(schemaDir, `${name}.json`), "utf8");
    schemaCache.set(name, JSON.parse(raw));
  }
  return schemaCache.get(name);
}

export function schemaNames() {
  return [
    "envelope", "mission", "run", "execution", "event", "artifact",
    "evidence", "projection", "worker", "authority", "capability",
    "automation-health", "error", "pagination", "identity", "namespace", "correlation",
    "operation-result",
  ];
}

/**
 * Canonical operation-result interpretation (Nolan 2026-09-17).
 * The three observed backend success shapes are never normalized into one
 * field. Instead every result is decomposed into four proof dimensions:
 * transport_status / execution_status / persistence_status /
 * verification_status. PROVEN_COMPLETE is derived, never asserted: for an
 * operation whose persistence is required, it is true only when execution
 * ran AND persistence persisted AND verification verified.
 */
export const OPERATION_STATUS = Object.freeze({
  transport: ["accepted", "rejected", "unknown"],
  execution: ["ran", "failed", "not_run", "unknown"],
  persistence: ["persisted", "skipped", "unknown"],
  verification: ["verified", "unverified", "unknown"],
});

export function interpretOperationResult({ interpretedFrom, transportStatus, executionStatus, persistenceStatus, verificationStatus, requiredPersistence = true }) {
  for (const [field, value, vocab] of [
    ["transport_status", transportStatus, OPERATION_STATUS.transport],
    ["execution_status", executionStatus, OPERATION_STATUS.execution],
    ["persistence_status", persistenceStatus, OPERATION_STATUS.persistence],
    ["verification_status", verificationStatus, OPERATION_STATUS.verification],
  ]) {
    if (!vocab.includes(value))
      throw new ContractError("OPERATION_STATUS_UNKNOWN", "schemas/operation-result", `${field} '${value}' is not in the vocabulary`);
  }
  const provenComplete =
    executionStatus === "ran" &&
    (!requiredPersistence || persistenceStatus === "persisted") &&
    verificationStatus === "verified";
  return {
    interpreted_from: interpretedFrom,
    transport_status: transportStatus,
    execution_status: executionStatus,
    persistence_status: persistenceStatus,
    verification_status: verificationStatus,
    proven_complete: provenComplete,
  };
}

/**
 * Lightweight contract validation: checks required top-level fields and
 * the envelope maturity vocabulary. The JSON files are the canonical
 * contract documentation; this function enforces the load-bearing parts
 * at runtime without an external validator dependency.
 */
export function validate(schemaName, obj) {
  const errors = [];
  let schema;
  try {
    schema = loadSchema(schemaName);
  } catch (e) {
    return { ok: false, errors: [`unknown schema '${schemaName}'`] };
  }
  if (!obj || typeof obj !== "object") {
    return { ok: false, errors: ["value must be an object"] };
  }
  const required = schema.required || [];
  for (const field of required) {
    if (obj[field] === undefined || obj[field] === null) {
      errors.push(`missing required field '${field}'`);
    }
  }
  const env = obj._envelope;
  if (env !== undefined) {
    if (!MATURITY.includes(env.maturity))
      errors.push(`_envelope.maturity '${env.maturity}' not in vocabulary`);
    if (env.stage !== undefined && !STAGES.includes(env.stage))
      errors.push(`_envelope.stage '${env.stage}' not in vocabulary`);
  }
  return { ok: errors.length === 0, errors };
}

export function getSchema(name) {
  return loadSchema(name);
}

/**
 * Proof ladder (Nolan 2026-09-17, docs/proof-ladder.md). Epistemic discipline
 * behind maturity/stage claims. Not an enum set: the mechanical vocabulary
 * stays maturity x stage. This maps each implementation stage to the ladder
 * rungs it implies, so a claim that skips rungs can be detected.
 */
export const PROOF_LADDER = Object.freeze([
  "DECLARED",
  "IMPLEMENTED",
  "REACHABLE",
  "WIRED",
  "EXECUTED",
  "PERSISTED",
  "VERIFIED",
  "REPLAYABLE",
]);

const STAGE_RUNG_MAP = Object.freeze({
  HARVESTED: ["DECLARED"],
  CONTRACT_DEFINED: ["DECLARED"],
  IMPLEMENTED: ["DECLARED", "IMPLEMENTED"],
  WIRED: ["IMPLEMENTED", "REACHABLE", "WIRED"],
  RUNTIME_VERIFIED: ["WIRED", "EXECUTED", "PERSISTED", "VERIFIED"],
  DEPLOYED: ["VERIFIED", "REPLAYABLE"],
});

export function requiredProofRungs(stage) {
  if (!STAGES.includes(stage))
    throw new ContractError("STAGE_UNKNOWN", "schemas/proof-ladder", `stage '${stage}' is not in the vocabulary`);
  return [...STAGE_RUNG_MAP[stage]];
}

// Note: projection-validator.mjs imports from this module (validate,
// assertNoProofInflation, vocabularies). It is intentionally NOT re-exported
// here: re-exporting it creates a circular module dependency. Import it
// directly where mechanical proof enforcement is needed.
