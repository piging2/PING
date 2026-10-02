// projection-validator.mjs: mechanical enforcement of UI CLAIM <= BACKEND PROOF.
//
// The base validators (index.mjs) check vocabulary and required proof
// metadata. This module detects the failure modes a projection system must
// never silently pass through:
//
//   missing evidence        - a proven-rung claim with no evidence_ref
//   stale verification      - verified_at older than the caller's freshness rule
//   unknown maturity        - maturity UNKNOWN (useful information, not an error)
//   illegal promotion       - displayed maturity above backend proof
//   missing source          - no authority named (fail closed)
//   unsupported field       - top-level field outside the schema contract
//   fabricated identifiers  - identifier that could not come from an authority
//   schema drift            - unknown schema, unknown stage, impossible shapes
//
// Findings are advisory; errors fail closed. UNKNOWN is preserved, never
// erased: it is useful information, not a gap to hide.

import {
  MATURITY,
  STAGES,
  ContractError,
  assertNoProofInflation,
  validate,
  getSchema,
} from "./index.mjs";

export class ProjectionFinding {
  constructor(kind, detail) {
    this.kind = kind;
    this.detail = detail;
    this.severity = "finding";
  }
}

export class ProjectionError extends ContractError {
  constructor(code, detail) {
    super(code, "projection-validator", detail);
    this.name = "ProjectionError";
  }
}

const PROOF_REQUIRED = new Set(["PROVEN", "BUILT_NOT_LIVE", "EXPERIMENTAL"]);

// Identifier shapes that cannot originate from a PING authority.
// mission_id is hash(missionType:event_id); event ids are authority-issued.
// Anything on this list inside an id field is treated as fabricated.
const FABRICATED_ID_PATTERNS = [
  /^test[-_]/i,
  /^demo[-_]/i,
  /^sample[-_]/i,
  /^fake[-_]/i,
  /^placeholder[-_]/i,
  /^generated[-_]/i,
  /^local[-_]run[-_]/i,
  /^browser[-_]/i,
];

// run_id does not exist in the runtime. A Run projection whose envelope
// source does not name a runtime authority is a fabricated Run.
const RUNTIME_AUTHORITY_HINTS = [
  "missionruntime",
  "missionscheduler",
  "executionruntime",
  "unifiedeventruntime",
  "worker",
];

function isFabricatedId(value) {
  if (typeof value !== "string") return false;
  return FABRICATED_ID_PATTERNS.some((re) => re.test(value));
}

function namesRuntimeAuthority(source) {
  if (typeof source !== "string") return false;
  const s = source.toLowerCase().replace(/[\s_]/g, "");
  return RUNTIME_AUTHORITY_HINTS.some((hint) => s.includes(hint));
}

/**
 * Validate one projection against its schema and the proof invariant.
 *
 * @param {string} schemaName - one of schemaNames()
 * @param {object} projection - the projection object (with _envelope)
 * @param {object} [options]
 * @param {string} [options.backendMaturity] - the backend's proven rung for
 *   the claim being displayed; promotion above it is an error.
 * @param {number} [options.maxVerifiedAgeMs] - freshness rule; a verified_at
 *   older than this is stale. No default: callers must choose; absence
 *   means staleness is not checked.
 * @param {string} [options.nowIso] - clock override for tests.
 * @returns {{ok:boolean, errors:ProjectionError[], findings:ProjectionFinding[]}}
 */
export function validateProjection(schemaName, projection, options = {}) {
  const errors = [];
  const findings = [];
  const { backendMaturity, maxVerifiedAgeMs, nowIso } = options;

  // Schema drift: unknown schema name.
  let schema;
  try {
    schema = getSchema(schemaName);
  } catch {
    return {
      ok: false,
      errors: [new ProjectionError("SCHEMA_UNKNOWN", `schema '${schemaName}' is not in the contract`)],
      findings,
    };
  }

  if (!projection || typeof projection !== "object") {
    return {
      ok: false,
      errors: [new ProjectionError("PROJECTION_NOT_OBJECT", "projection must be an object")],
      findings,
    };
  }

  // Base contract: required fields + envelope vocabulary.
  const base = validate(schemaName, projection);
  for (const e of base.errors) {
    errors.push(new ProjectionError("CONTRACT_VIOLATION", e));
  }

  const env = projection._envelope;
  if (env === undefined || env === null) {
    errors.push(new ProjectionError("ENVELOPE_MISSING", "projection carries no _envelope; proof metadata is required"));
    return { ok: false, errors, findings };
  }

  // Missing source: fail closed. A projection that cannot name the authority
  // it reads has no business being displayed.
  if (!env.source || typeof env.source !== "string" || env.source.trim() === "") {
    errors.push(new ProjectionError("SOURCE_MISSING", "envelope.source is empty; no authority owns this projection"));
  }

  // Missing evidence: proven-rung claims must cite evidence.
  if (PROOF_REQUIRED.has(env.maturity)) {
    if (!env.evidence_ref) {
      errors.push(
        new ProjectionError(
          "EVIDENCE_MISSING",
          `maturity '${env.maturity}' asserts a proven rung with no evidence_ref`
        )
      );
    }
    if (!env.verified_at) {
      errors.push(
        new ProjectionError(
          "VERIFIED_AT_MISSING",
          `maturity '${env.maturity}' asserts a proven rung with no verified_at`
        )
      );
    }
  }

  // Unknown maturity is information, not failure. Preserve it loudly.
  if (env.maturity === "UNKNOWN") {
    findings.push(new ProjectionFinding("MATURITY_UNKNOWN", "backend proof is unknown; projection renders as unavailable, never as healthy"));
  }
  if (env.maturity === "FALSIFIED") {
    findings.push(new ProjectionFinding("MATURITY_FALSIFIED", "claim was disproven; projection must render the falsification, never the claim"));
  }

  // Illegal promotion: UI CLAIM <= BACKEND PROOF.
  if (backendMaturity !== undefined) {
    try {
      assertNoProofInflation(env.maturity, backendMaturity);
    } catch (e) {
      errors.push(new ProjectionError("PROOF_INFLATION", e.detail || e.message));
    }
  }

  // Freshness: a future verified_at is always an error, with or without a
  // freshness rule. Staleness is only checked when the caller supplies one.
  if (env.verified_at) {
    const verified = Date.parse(env.verified_at);
    const now = nowIso ? Date.parse(nowIso) : Date.now();
    if (Number.isNaN(verified)) {
      errors.push(new ProjectionError("VERIFIED_AT_INVALID", `verified_at '${env.verified_at}' is not a parseable timestamp`));
    } else if (verified > now + 60000) {
      errors.push(new ProjectionError("VERIFIED_AT_FUTURE", `verified_at '${env.verified_at}' is in the future; clock or provenance is fabricated`));
    } else if (maxVerifiedAgeMs !== undefined && now - verified > maxVerifiedAgeMs) {
      findings.push(
        new ProjectionFinding(
          "VERIFICATION_STALE",
          `verified_at '${env.verified_at}' is older than the freshness rule; re-verify before trusting`
        )
      );
    }
  }

  // Schema drift: stage vocabulary.
  if (env.stage !== undefined && !STAGES.includes(env.stage)) {
    errors.push(new ProjectionError("STAGE_UNKNOWN", `stage '${env.stage}' is not in the vocabulary`));
  }

  // Unsupported field: top-level fields outside the schema contract.
  const known = new Set([...Object.keys(schema.properties || {}), "_envelope"]);
  for (const key of Object.keys(projection)) {
    if (!known.has(key)) {
      findings.push(
        new ProjectionFinding(
          "FIELD_UNSUPPORTED",
          `field '${key}' is not in schema '${schemaName}'; additive contract change needs a versioning decision`
        )
      );
    }
  }

  // Fabricated identifiers: id fields that cannot come from an authority.
  for (const key of Object.keys(projection)) {
    if (key === "id" || key.endsWith("_id") || key === "identifier") {
      const v = projection[key];
      if (isFabricatedId(v)) {
        errors.push(
          new ProjectionError(
            "IDENTIFIER_FABRICATED",
            `field '${key}' has value '${v}' matching a fabricated-identifier pattern; identifiers are authority-issued`
          )
        );
      }
    }
  }

  // Fabricated Run: run identity without a runtime authority behind it.
  if (schemaName === "run" && projection.id !== undefined) {
    if (!namesRuntimeAuthority(env.source)) {
      errors.push(
        new ProjectionError(
          "RUN_IDENTITY_UNGROUNDED",
          `Run projection id '${projection.id}' cites source '${env.source}', which names no runtime authority; run_id does not exist in the runtime and the UI must not invent it`
        )
      );
    }
  }

  return { ok: errors.length === 0, errors, findings };
}
