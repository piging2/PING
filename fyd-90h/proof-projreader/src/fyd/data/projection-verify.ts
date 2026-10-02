/**
 * Projection snapshot verification. SERVER ONLY.
 *
 * Pure parse + verify for FYD site projection snapshots, extracted from
 * src/fyd/data/ping-object-source.ts so the ProjectionReader seam
 * (file-dump today, other physical readers later) owns verification in
 * exactly one place. No filesystem access here: callers supply the raw
 * bytes; this module parses, validates, and digest-verifies.
 *
 * Verification (fail closed, in order):
 *  1. The snapshot parses as JSON and is a record.
 *  2. meta.siteId matches the requested site.
 *  3. Every object carries provenance with a non-empty ref — the
 *     "NO CUSTOMER FACT WITHOUT A TRACEABLE BASIS" law.
 *  4. graphDigest: sha256 over canonicalize(graph) recomputed here and
 *     compared to meta.graphDigest. A mismatch means tampering or an
 *     incompatible dumper: refuse.
 *  5. presentationIntent block (when present): digest-verified against
 *     meta.presentationIntentDigest, structurally validated.
 *  6. fieldVisibility block (when present): digest-verified against
 *     meta.fieldVisibilityDigest, structurally validated.
 *
 * Owner overlays are NOT composed here: they are a serve-time concern
 * (ping-object-source re-reads the live owner store after verification).
 * The snapshot identity below is always the raw verified snapshot.
 *
 * Snapshot identity (determinism):
 *  - canonicalBytes: canonical JSON of the snapshot document with volatile
 *    wall-clock fields excluded (meta.dumpedAt). Byte-compare across
 *    regenerations must be identical for the same canonical history.
 *  - snapshotDigest = sha256(canonicalBytes).
 *  - sourceDigest = sha256 over the canonical-history identity
 *    (baseDigest + fixtureFileDigest + ordered overlayEventIds +
 *    dumperVersion).
 */

import { createHash } from "node:crypto";
import { canonicalize } from "@/lib/ping/ask-composer";
import type { ObjectGraph } from "@/fyd/sitespec/types";
import type { PingObject, PingRelationship } from "@/lib/ping/types";
import type {
  PresentationIntentBlock,
  FieldVisibilityBlock,
} from "@/fyd/customize/types";

export interface ProjectionMeta {
  siteId: string;
  /** Wall-clock write time. INFORMATIONAL ONLY: excluded from snapshot identity. */
  dumpedAt: string;
  dumperVersion: string;
  baseDigest: string;
  fixtureFileDigest: string;
  fixtureHeader: string;
  overlayEventIds: string[];
  graphDigest: string;
  generatedAt: string;
  /** Optional digest of the presentationIntent block (digest-verified). */
  presentationIntentDigest?: string;
  /** Optional digest of the fieldVisibility block (digest-verified). */
  fieldVisibilityDigest?: string;
  eventSequences?: [number, number] | null;
}

/**
 * The raw verified snapshot: everything digest-verified, nothing composed.
 * Owner overlays compose onto this in ping-object-source, after
 * verification, never before.
 */
export interface VerifiedRawProjection {
  graph: ObjectGraph;
  meta: ProjectionMeta;
  presentationIntent: PresentationIntentBlock | null;
  fieldVisibility: FieldVisibilityBlock | null;
}

function fail(siteId: string, reason: string): never {
  throw new Error(`projection-verify: site "${siteId}": ${reason}`);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateObject(o: unknown, siteId: string): asserts o is PingObject {
  if (!isRecord(o)) fail(siteId, "object is not a record");
  for (const k of ["id", "schema", "visibility", "title"] as const) {
    if (typeof o[k] !== "string" || (o[k] as string).length === 0) {
      fail(siteId, `object has bad "${k}"`);
    }
  }
  const prov = o["provenance"];
  if (!isRecord(prov) || typeof prov["ref"] !== "string" || prov["ref"] === "") {
    fail(
      siteId,
      `object "${o["id"]}" lacks provenance ref: no customer fact without a traceable basis`,
    );
  }
}

function validateRelationship(
  r: unknown,
  siteId: string,
): asserts r is PingRelationship {
  if (!isRecord(r)) fail(siteId, "relationship is not a record");
  for (const k of ["id", "subject", "object", "predicate"] as const) {
    if (typeof r[k] !== "string" || (r[k] as string).length === 0) {
      fail(siteId, `relationship has bad "${k}"`);
    }
  }
}

function validateGraph(
  graph: unknown,
  siteId: string,
): asserts graph is ObjectGraph {
  if (!isRecord(graph)) fail(siteId, "graph is not a record");
  if (!Array.isArray(graph["objects"]))
    fail(siteId, "graph.objects is not an array");
  if (!Array.isArray(graph["relationships"]))
    fail(siteId, "graph.relationships is not an array");
  for (const o of graph["objects"]) validateObject(o, siteId);
  for (const r of graph["relationships"]) validateRelationship(r, siteId);
}

function validateMeta(
  meta: unknown,
  siteId: string,
): asserts meta is ProjectionMeta {
  if (!isRecord(meta)) fail(siteId, "meta is not a record");
  if (meta["siteId"] !== siteId)
    fail(
      siteId,
      `meta.siteId "${String(meta["siteId"])}" does not match requested site`,
    );
  for (const k of [
    "dumpedAt",
    "dumperVersion",
    "baseDigest",
    "fixtureFileDigest",
    "graphDigest",
    "generatedAt",
  ] as const) {
    if (typeof meta[k] !== "string" || (meta[k] as string).length === 0) {
      fail(siteId, `meta has bad "${k}"`);
    }
  }
  if (!Array.isArray(meta["overlayEventIds"])) {
    fail(siteId, "meta.overlayEventIds is not an array");
  }
}

function validatePresentationIntent(
  raw: unknown,
  meta: ProjectionMeta,
  siteId: string,
): PresentationIntentBlock | null {
  if (raw === undefined || raw === null) {
    if (meta.presentationIntentDigest !== undefined) {
      fail(
        siteId,
        "meta.presentationIntentDigest present but no presentationIntent block",
      );
    }
    return null;
  }
  if (!isRecord(raw)) fail(siteId, "presentationIntent is not a record");
  const digest = meta.presentationIntentDigest;
  if (typeof digest !== "string" || digest.length === 0) {
    fail(
      siteId,
      "presentationIntent block present without meta.presentationIntentDigest",
    );
  }
  const recomputed = createHash("sha256")
    .update(canonicalize(raw), "utf8")
    .digest("hex");
  if (recomputed !== digest) {
    fail(
      siteId,
      "presentationIntentDigest mismatch: the intent block was tampered with " +
        "or written by an incompatible dumper; refusing to serve it",
    );
  }
  const directives = raw["directives"];
  if (!Array.isArray(directives))
    fail(siteId, "presentationIntent.directives is not an array");
  for (const d of directives) {
    if (!isRecord(d)) fail(siteId, "presentationIntent directive is not a record");
    if (typeof d["intentId"] !== "string" || d["intentId"] === "")
      fail(siteId, "presentationIntent directive has bad intentId");
    const si = d["siteIntent"];
    if (!isRecord(si) || typeof si["kind"] !== "string" || si["kind"] === "")
      fail(siteId, "presentationIntent directive has bad siteIntent");
    const prop = d["proposal"];
    if (
      !isRecord(prop) ||
      typeof prop["proposalDigest"] !== "string" ||
      prop["proposalDigest"] === ""
    )
      fail(siteId, "presentationIntent directive has bad proposal");
    const ap = d["approval"];
    if (!isRecord(ap)) fail(siteId, "presentationIntent directive has bad approval");
    for (const k of ["proposalDigest", "approvedBy", "approvedAt"] as const) {
      if (typeof ap[k] !== "string" || (ap[k] as string).length === 0)
        fail(siteId, `presentationIntent directive approval has bad "${k}"`);
    }
  }
  const prov = raw["provenance"];
  if (!isRecord(prov) || prov["kind"] !== "owner-presentation-intent")
    fail(siteId, "presentationIntent.provenance is missing or mislabeled");
  return raw as unknown as PresentationIntentBlock;
}

function validateFieldVisibility(
  raw: unknown,
  meta: ProjectionMeta,
  siteId: string,
): FieldVisibilityBlock | null {
  if (raw === undefined || raw === null) {
    if (meta.fieldVisibilityDigest !== undefined) {
      fail(
        siteId,
        "meta.fieldVisibilityDigest present but no fieldVisibility block",
      );
    }
    return null;
  }
  if (!isRecord(raw)) fail(siteId, "fieldVisibility is not a record");
  const digest = meta.fieldVisibilityDigest;
  if (typeof digest !== "string" || digest.length === 0) {
    fail(siteId, "fieldVisibility block present without meta.fieldVisibilityDigest");
  }
  const recomputed = createHash("sha256")
    .update(canonicalize(raw), "utf8")
    .digest("hex");
  if (recomputed !== digest) {
    fail(
      siteId,
      "fieldVisibilityDigest mismatch: the visibility block was tampered with " +
        "or written by an incompatible dumper; refusing to serve it",
    );
  }
  const decisions = raw["decisions"];
  if (!Array.isArray(decisions))
    fail(siteId, "fieldVisibility.decisions is not an array");
  for (const d of decisions) {
    if (!isRecord(d)) fail(siteId, "fieldVisibility decision is not a record");
    if (typeof d["objectId"] !== "string" || d["objectId"] === "")
      fail(siteId, "fieldVisibility decision has bad objectId");
    if (typeof d["field"] !== "string" || d["field"] === "")
      fail(siteId, "fieldVisibility decision has bad field");
    if (
      d["policy"] !== "hide" &&
      d["policy"] !== "show" &&
      d["policy"] !== "coarse" &&
      d["policy"] !== "members"
    )
      fail(
        siteId,
        'fieldVisibility decision has bad policy (want "hide"|"show"|"coarse"|"members")',
      );
    const ap = d["approval"];
    if (!isRecord(ap)) fail(siteId, "fieldVisibility decision has bad approval");
    for (const k of ["proposalDigest", "approvedBy", "approvedAt"] as const) {
      if (typeof ap[k] !== "string" || (ap[k] as string).length === 0)
        fail(siteId, `fieldVisibility decision approval has bad "${k}"`);
    }
  }
  const prov = raw["provenance"];
  if (!isRecord(prov) || prov["kind"] !== "owner-field-visibility")
    fail(siteId, "fieldVisibility.provenance is missing or mislabeled");
  return raw as unknown as FieldVisibilityBlock;
}

/**
 * Parse, validate, and digest-verify one projection snapshot document.
 * Returns the raw verified snapshot (no owner overlay composed).
 * Throws (fail closed) on any problem. Never returns stale or unverified
 * data. `path` is used in error messages only.
 */
export function parseAndVerifyRawProjection(
  raw: string,
  siteId: string,
  path: string,
): VerifiedRawProjection {
  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch {
    fail(siteId, `projection at ${path} is not valid JSON`);
  }
  if (!isRecord(doc)) fail(siteId, "projection is not a record");
  validateMeta(doc["meta"], siteId);
  validateGraph(doc["graph"], siteId);
  const meta = doc["meta"] as ProjectionMeta;
  const graph = doc["graph"] as ObjectGraph;
  const presentationIntent = validatePresentationIntent(
    doc["presentationIntent"],
    meta,
    siteId,
  );
  const fieldVisibility = validateFieldVisibility(
    doc["fieldVisibility"],
    meta,
    siteId,
  );
  const recomputed = createHash("sha256")
    .update(canonicalize(graph), "utf8")
    .digest("hex");
  if (recomputed !== meta.graphDigest) {
    fail(
      siteId,
      "graphDigest mismatch: the projection was tampered with or written by " +
        "an incompatible dumper; refusing to serve it",
    );
  }
  return { graph, meta, presentationIntent, fieldVisibility };
}

// ---------------------------------------------------------------------------
// Snapshot identity (determinism). Volatile wall-clock fields are excluded
// from the identity: the journal is the authority, and the same canonical
// history must produce the same snapshot bytes no matter when the dump ran.
// ---------------------------------------------------------------------------

/** meta keys excluded from snapshot identity (wall-clock, not history). */
const VOLATILE_META_KEYS = new Set(["dumpedAt"]);

/**
 * The snapshot document with volatile fields removed. Byte-compare of
 * canonicalSnapshotBytes across regenerations must be identical for the
 * same canonical history.
 */
export function snapshotDocument(
  doc: Record<string, unknown>,
): Record<string, unknown> {
  const meta = isRecord(doc["meta"]) ? { ...doc["meta"] } : {};
  for (const k of VOLATILE_META_KEYS) delete meta[k];
  return { ...doc, meta };
}

/** Canonical snapshot bytes: the deterministic bytes the builder consumes. */
export function canonicalSnapshotBytes(doc: Record<string, unknown>): string {
  return canonicalize(snapshotDocument(doc));
}

/** sha256 over canonicalSnapshotBytes: THE snapshot identity. */
export function snapshotDigestOf(doc: Record<string, unknown>): string {
  return createHash("sha256")
    .update(canonicalSnapshotBytes(doc), "utf8")
    .digest("hex");
}

/**
 * sha256 identifying the canonical history a snapshot was derived from:
 * base digest + fixture digest + ordered overlay event ids + dumper
 * version. Equal sourceDigests mean the same history (same journal state
 * for the site).
 */
export function sourceDigestOf(meta: ProjectionMeta): string {
  return createHash("sha256")
    .update(
      canonicalize({
        baseDigest: meta.baseDigest,
        dumperVersion: meta.dumperVersion,
        fixtureFileDigest: meta.fixtureFileDigest,
        overlayEventIds: meta.overlayEventIds,
      }),
      "utf8",
    )
    .digest("hex");
}
