// Mission list/detail projections over real gateway reads.
// GET /missions (list), GET /missions/:id + GET /events/correlation/:id
// (detail). Authority: MissionRuntime/MissionScheduler over ping_missions,
// UnifiedEventRuntime over ping_events.
//
// Stage honesty: these builders consume gateway JSON. They are IMPLEMENTED.
// They become WIRED when called with live gateway responses; they are
// RUNTIME_VERIFIED only after a live read. The builder never invents
// missions, statuses, or run identities.

import { withEnvelope, validate } from "../../../packages/schemas/src/index.mjs";

const KNOWN_STATUSES = new Set([
  "created", "assigned", "running", "completed", "failed", "archived",
]);

function normalizeStatus(raw) {
  if (typeof raw === "string" && KNOWN_STATUSES.has(raw.toLowerCase()))
    return raw.toLowerCase();
  return "UNKNOWN";
}

/** Normalize one gateway mission row into a Mission projection. */
export function toMissionProjection(row, envelopeBase) {
  if (!row || typeof row !== "object") throw new TypeError("mission row is required");
  const proj = withEnvelope(
    {
      id: String(row.id ?? row.mission_id ?? ""),
      objective: String(row.objective ?? row.description ?? row.type ?? ""),
      current_status: normalizeStatus(row.status ?? row.state),
      owner: row.owner ?? "UNKNOWN",
      kind: row.type ?? row.kind ?? "UNKNOWN",
      correlation_id: row.correlation_id ?? row.correlationId ?? null,
      progress: typeof row.progress === "number" ? row.progress : null,
    },
    { ...envelopeBase, maturity: "PROVEN" }
  );
  const check = validate("mission", proj);
  if (!check.ok) throw new Error(`mission validation failed: ${check.errors.join("; ")}`);
  return proj;
}

/** Build the mission list projection from a GET /missions response body. */
export function buildMissionList(gatewayBody, { verifiedAt, evidenceRef } = {}) {
  const rows = Array.isArray(gatewayBody)
    ? gatewayBody
    : gatewayBody && Array.isArray(gatewayBody.missions)
      ? gatewayBody.missions
      : gatewayBody && Array.isArray(gatewayBody.items)
        ? gatewayBody.items
        : null;
  if (rows === null) throw new TypeError("unrecognized /missions response shape");
  const base = {
    proof_status: "projection of gateway read",
    verified_at: verifiedAt || new Date().toISOString(),
    evidence_ref: evidenceRef || "GET /missions",
    source: "ping_missions via MissionRuntime",
    stage: "IMPLEMENTED",
  };
  return rows.map((r) => toMissionProjection(r, base));
}

/** Mission detail: one mission plus its correlation events. */
export function buildMissionDetail(missionRow, correlationBody, { verifiedAt } = {}) {
  const base = {
    proof_status: "projection of gateway reads",
    verified_at: verifiedAt || new Date().toISOString(),
    evidence_ref: "GET /missions/:id + GET /events/correlation/:id",
    source: "ping_missions via MissionRuntime; ping_events via UnifiedEventRuntime",
    stage: "IMPLEMENTED",
  };
  const mission = toMissionProjection(missionRow, base);
  const events = Array.isArray(correlationBody)
    ? correlationBody
    : (correlationBody && correlationBody.events) || [];
  return {
    mission,
    correlation_id: mission.correlation_id,
    event_count: events.length,
    events_truncated: events.length >= 200,
    _envelope: mission._envelope,
  };
}
