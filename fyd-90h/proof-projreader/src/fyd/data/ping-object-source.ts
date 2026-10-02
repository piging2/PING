/**
 * PING-backed object source for FYD demo sites. SERVER ONLY.
 *
 * This module is the website repo's read seam onto PING state. Reads go
 * through the ProjectionReader seam (src/fyd/data/projection-reader.ts):
 * the registered reader produces a deterministic, digest-verified snapshot
 * for the site, and this module composes the serve-time owner overlay onto
 * it. The default physical reader is the file dump (Decision 2); swapping
 * in a Postgres/IncrementalGraph/remote reader later changes no consumer.
 *
 * NAMING LAW (ratified 2026-09-29): the JOURNAL is the authority
 * (canonical history). The file dump is one disposable representation of
 * a projection — never canonical truth, and never described with the
 * word "authority".
 *
 * Verification (fail closed, in order — owned by projection-verify.ts):
 *  1. The snapshot exists and parses.
 *  2. meta.siteId matches the requested site.
 *  3. Every object carries provenance with a non-empty ref — the
 *     "NO CUSTOMER FACT WITHOUT A TRACEABLE BASIS" law.
 *  4. graphDigest: sha256 over canonicalize(graph) recomputed and compared
 *     to meta.graphDigest. A mismatch means tampering or an incompatible
 *     dumper: refuse to serve it.
 *  5/6. presentationIntent / fieldVisibility blocks digest-verified when
 *     present.
 * A missing, malformed, or tampered snapshot is a hard failure, not a
 * silent stale render.
 *
 * The projection directory is configurable via FYD_PROJECTION_DIR for tests;
 * in production it is the PING-owned var dir the dump writes to.
 */

import {
  applyOwnerFieldCorrections,
  applyOwnerPresentationOverrides,
  type OwnerOverlayResult,
} from "@/fyd/object/owner-overlay";
import type { ObjectGraph } from "@/fyd/sitespec/types";
import type {
  PresentationIntentBlock,
  FieldVisibilityBlock,
} from "@/fyd/customize/types";
import type {
  ProjectionMeta,
  VerifiedRawProjection,
} from "./projection-verify";
import {
  getProjectionReader,
  isSyncProjectionReader,
  type ProjectionReadOpts,
  type ProjectionSnapshot,
} from "./projection-reader";
// Side effect: registers FileDumpProjectionReader as the seam default
// (Decision 2). Kept as a separate module to keep the import graph
// cycle-free.
import "./default-reader";

// Re-exported for consumers that type against this module.
export type { ProjectionMeta };
export type { ProjectionReadOpts };

export interface PingProjection {
  graph: ObjectGraph;
  meta: ProjectionMeta;
  /**
   * Owner field corrections composed onto the graph AFTER digest
   * verification (src/fyd/object/owner-overlay.ts). Null when the caller
   * asked for the raw source ({ ownerOverlay: false }), e.g. evidence
   * endpoints showing SOURCE SAYS X. The digest verified is always the
   * raw projection's; owner state is never part of source verification.
   */
  ownerOverlay: OwnerOverlayResult | null;
  /**
   * Owner-approved presentation-intent directives (the PRESENTATION
   * INTENT layer). Digest-verified against meta.presentationIntentDigest.
   * Applied OVER the compiled spec at render time; never merged into
   * the graph and never part of source verification. Null when the
   * projection carries no intent block (older dumps).
   */
  presentationIntent: PresentationIntentBlock | null;
  /**
   * Owner-approved field visibility decisions (the VISIBILITY POLICY
   * layer: hide/show, e.g. street address). Digest-verified against
   * meta.fieldVisibilityDigest. Applied to a projected copy of the graph
   * BEFORE spec compilation; the source graph keeps every fact. Null
   * when the projection carries no visibility block (older dumps) -- and
   * when null, visibility decisions fail closed to HIDE for privacy-
   * sensitive fields (see customize/server.ts).
   */
  fieldVisibility: FieldVisibilityBlock | null;
}

/** Options for the projection read seam. */
export interface PingSourceOpts {
  /**
   * Compose owner field corrections onto the verified graph (default true).
   * Set false only for raw-source evidence reads: the effective value
   * everywhere else comes from the composed graph.
   */
  ownerOverlay?: boolean;
}

function toPingProjection(
  snapshot: ProjectionSnapshot,
  raw: VerifiedRawProjection,
  opts?: PingSourceOpts,
): PingProjection {
  // Overlay AFTER verification, never before: owner state composes onto
  // verified source state, it is never part of source verification and
  // never mutates the snapshot. Source refresh (re-dump) re-reads the
  // owner store on every serve, so it cannot erase a correction.
  if (opts?.ownerOverlay === false) {
    return {
      graph: raw.graph,
      meta: raw.meta,
      ownerOverlay: null,
      presentationIntent: raw.presentationIntent,
      fieldVisibility: raw.fieldVisibility,
    };
  }
  const overlay = applyOwnerFieldCorrections(raw.graph, snapshot.siteId);
  const presentation = applyOwnerPresentationOverrides(
    overlay.graph,
    snapshot.siteId,
  );
  return {
    graph: presentation.graph,
    meta: raw.meta,
    ownerOverlay: overlay,
    presentationIntent: raw.presentationIntent,
    fieldVisibility: raw.fieldVisibility,
  };
}

/**
 * Load the PING-backed projection for a site. Reads through the
 * ProjectionReader seam (default: file dump). Throws (fail closed) when the
 * snapshot is missing, malformed, untraceable, or tampered. Never returns
 * stale or unverified data. By default the returned graph carries the
 * owner's composed field corrections (owner value wins) with the correction
 * evidence attached per object; pass { ownerOverlay: false } for the raw
 * source graph.
 */
export async function getPingObjectGraph(
  siteId: string,
  opts?: PingSourceOpts,
): Promise<PingProjection> {
  // The reader owns verification (parse + digest-verify, fail closed):
  // the snapshot graph is already the verified raw graph. The owner
  // overlay composes onto it here, after verification, never before.
  const snapshot = await getProjectionReader().readSnapshot(siteId, opts);
  const verified: VerifiedRawProjection = {
    graph: snapshot.graph,
    meta: snapshot.meta,
    presentationIntent: snapshot.presentationIntent,
    fieldVisibility: snapshot.fieldVisibility,
  };
  return toPingProjection(snapshot, verified, opts);
}

/**
 * Synchronous variant for call sites that must stay sync (e.g. the Ask FYD
 * bundle loader). Same verification, same fail-closed contract. Requires
 * the registered reader to support sync reads (file-dump does); an
 * async-only reader fails closed here rather than faking sync.
 */
export function getPingObjectGraphSync(
  siteId: string,
  opts?: PingSourceOpts,
): PingProjection {
  const reader = getProjectionReader();
  if (!isSyncProjectionReader(reader)) {
    throw new Error(
      `ping-object-source: sync read of site "${siteId}" unsupported by the ` +
        `${reader.kind} reader (async contract only); refusing to fake it`,
    );
  }
  const snapshot = reader.readSnapshotSync(siteId, opts);
  const verified: VerifiedRawProjection = {
    graph: snapshot.graph,
    meta: snapshot.meta,
    presentationIntent: snapshot.presentationIntent,
    fieldVisibility: snapshot.fieldVisibility,
  };
  return toPingProjection(snapshot, verified, opts);
}

/** Site ids this source can serve: the projection files present on disk. */
export async function listPingSiteIds(): Promise<string[]> {
  return getProjectionReader().listSiteIds();
}

/** Synchronous variant of listPingSiteIds. */
export function listPingSiteIdsSync(): string[] {
  const reader = getProjectionReader();
  if (!isSyncProjectionReader(reader)) {
    throw new Error(
      `ping-object-source: sync site listing unsupported by the ${reader.kind} reader`,
    );
  }
  return reader.listSiteIdsSync();
}
