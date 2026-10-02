// Mission window: the drill-down projection.
//   Mission -> correlation/events -> evidence/artifacts
//
// The Run layer is GAP-LABELED, not implemented. First-class execution
// identity is APPROVED (2026-09-17, docs/decision-execution-identity-2026-09-17.md)
// but not yet implemented in the runtime: MissionRuntime at assign() will
// own it via IdentityAuthority, never the UI. Until then this builder scans
// every input record for a real run identity; finding none, it emits the
// gap. It never synthesizes run IDs from timestamps, never infers them from
// mission IDs, and never overloads correlation_id without proven semantic
// identity. The UI must render the gap, not a fabricated trace.

import { withEnvelope, gapProjection, validate } from "../../../packages/schemas/src/index.mjs";
import { toMissionProjection } from "./mission-list.mjs";

const RUN_GAP =
  "run_id instrumentation does not exist in the runtime. The Run layer is unavailable until the runtime records run identity. This projection refuses to fabricate it.";

/** Scan records for an authority-issued run identity. Returns null: none exists. */
export function findRunIdentity(records) {
  if (!Array.isArray(records)) return null;
  for (const r of records) {
    // Only an explicit, authority-issued run_id counts. Pass-local ids
    // (e.g. action-truth run_id like 'ig-20260917-pass44') are pass
    // identifiers, not PING run identities, and must not be promoted.
    if (r && typeof r.run_id === "string" && r.__ping_run_identity === true) {
      return r.run_id;
    }
  }
  return null;
}

export function runLayerGap() {
  return gapProjection("run-layer", RUN_GAP, "ADR_UI_BOUNDARY_AND_PROJECTION_CONTRACT_2026-09-17.md boundary B");
}

/**
 * Build the mission-window drill-down for one mission.
 * inputs: { missionRow, correlationEvents, evidenceRows, artifactRows, verifiedAt }
 */
export function buildMissionWindow({ missionRow, correlationEvents = [], evidenceRows = [], artifactRows = [], verifiedAt } = {}) {
  const base = {
    proof_status: "projection of gateway reads",
    verified_at: verifiedAt || new Date().toISOString(),
    evidence_ref: "GET /missions/:id + GET /events/correlation/:id",
    source: "ping_missions via MissionRuntime; ping_events via UnifiedEventRuntime",
    stage: "IMPLEMENTED",
  };
  const mission = toMissionProjection(missionRow, base);
  const runId = findRunIdentity([missionRow, ...correlationEvents]);

  const window = {
    mission,
    run_layer: runId === null ? runLayerGap() : { run_id: runId },
    events: correlationEvents.map((e) =>
      withEnvelope(
        {
          event_id: String(e.event_id ?? e.id ?? ""),
          event_type: String(e.event_type ?? e.type ?? ""),
          occurred_at: e.occurred_at ?? e.ts ?? null,
          actor: e.actor ?? "UNKNOWN",
          correlation_id: e.correlation_id ?? null,
          mission_id: mission.id,
        },
        { ...base, maturity: "PROVEN" }
      )
    ),
    evidence: evidenceRows.map((e) =>
      withEnvelope(
        { evidence_id: String(e.evidence_id ?? ""), claim: String(e.claim ?? "") },
        { ...base, maturity: e.verified === true ? "PROVEN" : "UNKNOWN" }
      )
    ),
    artifacts: artifactRows.map((a) =>
      withEnvelope(
        { artifact_id: String(a.artifact_id ?? ""), hash: String(a.hash ?? "") },
        { ...base, maturity: a.hash ? "PROVEN" : "UNKNOWN" }
      )
    ),
  };
  return window;
}
