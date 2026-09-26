/**
 * Lane D: server-side helpers for the customize API route. SERVER ONLY.
 *
 * loadCustomizedSite: projection -> generateSiteSpec -> apply the
 * presentation-intent layer. The proposal/approve path always reasons
 * over the CURRENT layered spec, so sequential customizations compose.
 *
 * emitOverlayEvent: appends a FYD_SITE_OVERLAY event to the FYD demo
 * journal (the repo-booted gateway; no auth on its event route). The
 * projection dump picks it up on the next regen. Demo-journal only;
 * nothing here touches the main deployment journal.
 */

import { createHash } from "node:crypto";
import { getPingObjectGraph } from "@/fyd/data/ping-object-source";
import { generateSiteSpec } from "@/fyd/proceduralize/generator";
import type { FYDSiteSpec, ObjectGraph, ViewerContext } from "@/fyd/sitespec/types";
import {
  applyFieldVisibility,
  resolveFieldVisibility,
  type FieldVisibilityDecision,
} from "@/fyd/sitespec/field-visibility";
import { applyPresentationIntent } from "./apply-layer";
import type {
  FieldVisibilityBlock,
  FieldVisibilityDirective,
  PresentationIntentBlock,
  PresentationIntentDirective,
  CustomizeOverlayOp,
} from "./types";

export interface CustomizedSite {
  siteId: string;
  /**
   * SOURCE graph: verbatim discovered facts. Never rewritten by the
   * visibility or presentation layers; the byte-identity proof compares
   * against this.
   */
  sourceGraph: ObjectGraph;
  /**
   * PROJECTED graph: sourceGraph with the owner's visibility decisions
   * applied for the requested viewer (SOURCE VALUE + VISIBILITY POLICY
   * + OWNER OVERRIDE + VIEWER CONTEXT). This is what the spec compiles
   * from and what renders.
   */
  projectedGraph: ObjectGraph;
  /** Back-compat alias for projectedGraph: the graph the site renders. */
  graph: ObjectGraph;
  /** Spec as rendered: base compiled spec + approved presentation intents. */
  spec: FYDSiteSpec;
  /** Digest of the base compiled spec (before the intent layer). */
  baseSpecDigest: string;
  /** Digest of the layered spec the owner reviews and approves against. */
  specDigest: string;
  presentationIntent: PresentationIntentBlock | null;
  /** Owner visibility decisions in force (from the digest-verified block). */
  visibilityDecisions: FieldVisibilityDecision[];
  appliedIntentIds: string[];
  unresolved: { intentId: string; reason: string }[];
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/**
 * Demo-auth honesty: every consequential demo-owner action is logged with
 * DEMO_AUTH=true and the NOT PRODUCTION AUTH marker. The demo session is
 * never represented as real authentication, and a demo toggle is never
 * represented as ownership proof.
 */
export function logDemoAuth(
  action: string,
  siteId: string,
  detail?: string,
): void {
  console.log(
    JSON.stringify({
      DEMO_AUTH: true,
      auth: "NOT PRODUCTION AUTH",
      action,
      siteId,
      detail: detail ?? "",
      at: new Date().toISOString(),
    }),
  );
}

/** Owner decisions carried by a digest-verified visibility block. */
export function visibilityDecisionsFromBlock(
  block: FieldVisibilityBlock | null,
): FieldVisibilityDecision[] {
  if (!block) return [];
  return block.decisions.map((d) => ({
    objectId: d.objectId,
    field: d.field,
    policy: d.policy,
    decidedBy: "owner" as const,
    decidedAt: d.approval.approvedAt,
    source: "owner_override" as const,
    version: d.version ?? 1,
  }));
}

/**
 * Resolve the current policy for one object field from the site's
 * digest-verified visibility block (owner override wins, else the
 * conservative default). Used for no-op detection at propose time.
 */
export function currentFieldPolicy(
  block: FieldVisibilityBlock | null,
  objectId: string,
  field: string,
): { policy: FieldVisibilityDecision["policy"]; source: "owner_override" | "conservative_default" } {
  return resolveFieldVisibility(objectId, field, visibilityDecisionsFromBlock(block));
}

export async function loadCustomizedSite(
  siteId: string,
  viewer?: ViewerContext,
): Promise<CustomizedSite> {
  const { graph, meta, presentationIntent, fieldVisibility } =
    await getPingObjectGraph(siteId);
  // VISIBILITY layer first: project the source graph for this viewer.
  // The source graph keeps every fact; only the projection changes.
  const visibilityDecisions = visibilityDecisionsFromBlock(fieldVisibility);
  const projectedGraph = applyFieldVisibility(graph, visibilityDecisions, viewer);
  // generatedAt comes from the projection meta (stable per dump), never the
  // wall clock: the spec digest must be reproducible across calls.
  const base = generateSiteSpec(projectedGraph, { generatedAt: meta.generatedAt });
  const { canonicalize } = await import("@/lib/ping/ask-composer");
  const baseSpecDigest = sha256Hex(canonicalize(base));
  const layered = applyPresentationIntent(base, presentationIntent, projectedGraph);
  const specDigest = sha256Hex(canonicalize(layered.spec));
  return {
    siteId,
    sourceGraph: graph,
    projectedGraph,
    graph: projectedGraph,
    spec: layered.spec,
    baseSpecDigest,
    specDigest,
    presentationIntent,
    visibilityDecisions,
    appliedIntentIds: layered.applied.map((a) => a.intentId),
    unresolved: layered.unresolved,
  };
}

/** Deterministic directive id: "pi-" + sha256(siteId + proposalDigest)[0:16]. */
export function directiveIdFor(siteId: string, proposalDigest: string): string {
  return "pi-" + sha256Hex(siteId + "|" + proposalDigest).slice(0, 16);
}

function gatewayUrl(): string {
  return process.env.FYD_CUSTOMIZE_GATEWAY_URL ?? "http://127.0.0.1:18199/events";
}

/**
 * Emit one FYD_SITE_OVERLAY event carrying presentation-intent ops to the
 * FYD demo journal. Returns the accepted event_id. Throws on rejection:
 * an unrecorded approval is never reported as recorded.
 */
export async function emitOverlayEvent(
  siteId: string,
  ops: CustomizeOverlayOp[],
): Promise<string> {
  const envelope = {
    event_type: "FYD_SITE_OVERLAY",
    aggregate_id: "fyd-site:" + siteId,
    aggregate_type: "fyd_site",
    event_data: { siteId, ops },
  };
  let res: Response;
  try {
    res = await fetch(gatewayUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
    });
  } catch (e) {
    throw new Error(
      "customize: demo gateway unreachable at " + gatewayUrl() + ": " +
        (e instanceof Error ? e.message : String(e)),
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      "customize: demo gateway rejected the overlay event (" + res.status + "): " + text.slice(0, 300),
    );
  }
  let doc: unknown;
  try {
    doc = await res.json();
  } catch {
    throw new Error("customize: demo gateway returned non-JSON on event emit.");
  }
  const eid =
    doc && typeof doc === "object"
      ? ((doc as Record<string, unknown>)["event_id"] ??
        (doc as Record<string, unknown>)["id"])
      : null;
  if (typeof eid !== "string" || eid.length === 0) {
    throw new Error("customize: gateway accepted the event but returned no event_id.");
  }
  return eid;
}

export function buildDirective(
  siteId: string,
  siteIntent: PresentationIntentDirective["siteIntent"],
  proposal: PresentationIntentDirective["proposal"],
  approvedAt: string,
): CustomizeOverlayOp {
  return {
    op: "set_presentation_intent",
    intentId: directiveIdFor(siteId, proposal.proposalDigest),
    siteIntent,
    proposal,
    approval: {
      proposalDigest: proposal.proposalDigest,
      approvedBy: "demo-owner (seeded, unverified)",
      approvedAt,
      note: "DEMO OWNER MODE - not real authentication. NOT PRODUCTION AUTH. No identity was verified.",
    },
  };
}

/**
 * Build the journal op for an approved visibility decision. The version
 * increments over the site's existing decisions for the same object+field
 * so replay is deterministic and the newest owner decision wins.
 */
export function buildVisibilityDirectiveOp(
  siteId: string,
  objectId: string,
  field: string,
  policy: FieldVisibilityDecision["policy"],
  proposalDigest: string,
  approvedAt: string,
  existingDecisions: FieldVisibilityDecision[],
): CustomizeOverlayOp {
  const same = existingDecisions.filter(
    (d) => d.objectId === objectId && d.field === field,
  );
  const version = same.reduce((m, d) => Math.max(m, d.version), 0) + 1;
  const directiveId =
    "fv-" + sha256Hex(siteId + "|" + objectId + "|" + field + "|" + policy).slice(0, 16);
  return {
    op: "set_field_visibility",
    directiveId,
    objectId,
    field,
    policy,
    version,
    proposalDigest,
    approval: {
      proposalDigest,
      approvedBy: "demo-owner (seeded, unverified)",
      approvedAt,
      note: "DEMO OWNER MODE - not real authentication. NOT PRODUCTION AUTH. No identity was verified.",
    },
  };
}

/** Map a persisted visibility directive back to an owner decision. */
export function decisionFromDirective(
  d: FieldVisibilityDirective,
): FieldVisibilityDecision {
  return {
    objectId: d.objectId,
    field: d.field,
    policy: d.policy,
    decidedBy: "owner",
    decidedAt: d.approval.approvedAt,
    source: "owner_override",
    version: 1,
  };
}
