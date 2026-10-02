/**
 * ProjectionReader — the semantic read contract for FYD site projections.
 *
 * NAMING LAW (ratified 2026-09-29, Nolan): the JOURNAL is the authority —
 * the canonical history of owner corrections, proposal decisions, published
 * SiteSpec transitions, and canonical object transitions. A projection is
 * ONE DISPOSABLE REPRESENTATION of the state derived from that history:
 * deterministic, replayable, inspectable, deletable, rebuildable. It is
 * never canonical truth, and the word "authority" is never attached to a
 * projection (not in code, comments, docs, or tests, not even in negated
 * explanations). Within the FYD scope the word "authority" belongs to the
 * journal alone.
 *
 * Contract (what every implementation promises the builder):
 *   - readSnapshot(siteId): given the canonical history, produce a
 *     deterministic, replayable, inspectable snapshot. Same history ->
 *     same snapshotDigest, byte for byte (volatile wall-clock fields such
 *     as meta.dumpedAt are informational only and are EXCLUDED from the
 *     snapshot identity).
 *   - sourceDigest: identifies the canonical history the snapshot was
 *     derived from (base digest + fixture digest + ordered overlay event
 *     ids). Two snapshots with equal sourceDigest came from the same
 *     history; two with equal snapshotDigest are byte-identical snapshots.
 *   - Fail closed: a missing, malformed, untraceable, or tampered snapshot
 *     throws. Never a stale fallback, never unverified data.
 *
 * The contract is physical-agnostic: FileDumpProjectionReader is today's
 * implementation (JSON snapshots written by the PING-side dump). A future
 * PostgresProjectionReader, IncrementalGraphReader, or remote reader
 * implements the same interface; consumers (ping-object-source and
 * everything behind it) do not change.
 */

import type { ObjectGraph } from "@/fyd/sitespec/types";
import type {
  PresentationIntentBlock,
  FieldVisibilityBlock,
} from "@/fyd/customize/types";
import type { ProjectionMeta } from "./projection-verify";

/** Options for the projection read seam (same semantics as PingSourceOpts). */
export interface ProjectionReadOpts {
  /**
   * Compose owner field corrections onto the verified graph (default true).
   * Set false only for raw-source evidence reads: the effective value
   * everywhere else comes from the composed graph.
   *
   * Note: overlay composition is a serve-time concern owned by
   * ping-object-source (it re-reads the live owner store). The snapshot
   * itself always carries the raw verified graph; the opt only controls
   * whether the reader composes the overlay before returning.
   */
  ownerOverlay?: boolean;
}

/**
 * The snapshot the builder consumes. Deterministic: derived from canonical
 * history only; volatile wall-clock metadata (meta.dumpedAt) is carried for
 * humans but excluded from canonicalBytes/snapshotDigest.
 */
export interface ProjectionSnapshot {
  siteId: string;
  /**
   * sha256 over canonicalBytes. THE snapshot identity: equal digests mean
   * byte-identical snapshots, regardless of which physical reader produced
   * them or when.
   */
  snapshotDigest: string;
  /**
   * sha256 identifying the canonical history this snapshot was derived
   * from (base digest + fixture digest + ordered overlay event ids +
   * dumper version). Equal sourceDigests mean the same history.
   */
  sourceDigest: string;
  /**
   * Canonical snapshot bytes: canonical JSON of the full snapshot document
   * with volatile fields excluded. Byte-compare across regenerations must
   * be identical for the same canonical history. This is what the builder
   * consumes.
   */
  canonicalBytes: string;
  /** Provenance of the snapshot (dumpedAt informational only). */
  meta: ProjectionMeta;
  /**
   * Verified object graph. The owner overlay is composed by the consumer
   * (ping-object-source) AFTER verification when opts.ownerOverlay is set;
   * the snapshot's byte identity is always the raw verified graph.
   */
  graph: ObjectGraph;
  /** Owner-approved presentation-intent directives (digest-verified). */
  presentationIntent: PresentationIntentBlock | null;
  /** Owner-approved field visibility decisions (digest-verified). */
  fieldVisibility: FieldVisibilityBlock | null;
}

/** Result of rebuilding the physical representation from canonical history. */
export interface RegenerateResult {
  siteId: string;
  /** Snapshot identity of the rebuilt representation. */
  snapshotDigest: string;
  /** Canonical-history identity the rebuild was derived from. */
  sourceDigest: string;
  /** Where the rebuilt representation lives (physical detail). */
  outPath: string;
}

/** Physical implementation identity. Diagnostics only — not authority. */
export type ProjectionReaderKind =
  | "file-dump"
  | "postgres"
  | "incremental-graph"
  | "remote";

/**
 * The semantic contract. Implementations:
 *   FileDumpProjectionReader — today: JSON snapshots from the PING-side dump.
 *   PostgresProjectionReader — later: same contract, SQL-backed.
 *   IncrementalGraphReader  — later: same contract, graph-backed.
 *   remote reader           — later: same contract, HTTP-backed.
 */
export interface ProjectionReader {
  /** Physical implementation identity (diagnostics only). */
  readonly kind: ProjectionReaderKind;
  /**
   * Read the snapshot for a site. Throws (fail closed) when the snapshot
   * is missing, malformed, untraceable, or tampered. Never returns stale
   * or unverified data.
   */
  readSnapshot(
    siteId: string,
    opts?: ProjectionReadOpts,
  ): Promise<ProjectionSnapshot>;
  /** Site ids this reader can serve. */
  listSiteIds(): Promise<string[]>;
  /**
   * Rebuild the physical representation from the canonical history
   * (journal) and return the rebuilt snapshot's identity.
   *
   * SERVER ONLY. Never call from the public served path: regeneration is
   * a privileged operation owned by the regen seam (L6), not by page
   * rendering. Implementations that cannot rebuild from history (e.g. a
   * remote reader over a read-only replica) throw RegenerateUnsupported.
   *
   * Disposability: deleting the physical representation and calling
   * regenerate must yield the same snapshotDigest for the same history.
   */
  regenerate(siteId: string): Promise<RegenerateResult>;
}

/**
 * Extension for readers that can serve synchronously (file-dump can; a
 * remote reader cannot). Sync consumers (the Ask bundle loader, edge
 * routes) depend on this narrower contract; the base contract stays
 * async-only so Postgres/remote readers are implementable without faking
 * sync.
 */
export interface SyncProjectionReader extends ProjectionReader {
  readSnapshotSync(
    siteId: string,
    opts?: ProjectionReadOpts,
  ): ProjectionSnapshot;
  listSiteIdsSync(): string[];
}

export function isSyncProjectionReader(
  r: ProjectionReader,
): r is SyncProjectionReader {
  return (
    typeof (r as SyncProjectionReader).readSnapshotSync === "function" &&
    typeof (r as SyncProjectionReader).listSiteIdsSync === "function"
  );
}

/** Typed failure: this physical reader cannot rebuild from history. */
export class RegenerateUnsupported extends Error {
  constructor(
    public readonly readerKind: ProjectionReaderKind,
    reason: string,
  ) {
    super(
      `RegenerateUnsupported: ${readerKind} reader cannot rebuild the projection from canonical history: ${reason}`,
    );
    this.name = "RegenerateUnsupported";
  }
}

/** Typed failure: regeneration ran but produced no usable snapshot. */
export class RegenerateFailed extends Error {
  constructor(siteId: string, detail: string) {
    super(`RegenerateFailed: site "${siteId}": ${detail}`);
    this.name = "RegenerateFailed";
  }
}

// ---------------------------------------------------------------------------
// Registry: one seam, swappable physical reader. The default is the file
// dump (Decision 2). Tests and future physical implementations swap it via
// setProjectionReader without touching consumers.
// ---------------------------------------------------------------------------

let overrideReader: ProjectionReader | null = null;
let defaultFactory: (() => ProjectionReader) | null = null;

export function setProjectionReader(reader: ProjectionReader): void {
  overrideReader = reader;
}

/** Test/embedding escape hatch: restore the default (file-dump) reader. */
export function resetProjectionReader(): void {
  overrideReader = null;
}

/** Set by the default-reader module (keeps this module cycle-free). */
export function setDefaultProjectionReaderFactory(
  factory: () => ProjectionReader,
): void {
  defaultFactory = factory;
}

export function getProjectionReader(): ProjectionReader {
  if (overrideReader) return overrideReader;
  if (!defaultFactory) {
    throw new Error(
      "projection-reader: no reader registered and no default factory set " +
        "(import @/fyd/data/default-reader once at the seam boundary)",
    );
  }
  return defaultFactory();
}
