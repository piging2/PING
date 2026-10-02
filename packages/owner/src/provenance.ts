/**
 * Owner provenance: who asserted it, when, and what it supersedes.
 *
 * HARVEST BANNER (piging2)
 * SOURCE: /home/nolan/projects/ping-fyd-converged @ 32f83474
 *         src/fyd/owner-mode/provenance.ts (OwnerProvenance,
 *         DEMO_OWNER_LABEL, demoProvenance, shortId) and
 *         src/fyd/owner-mode/facts.ts (factIdFor)
 * TARGET OWNER: packages/owner (piging2 owner corrections)
 * MODE: ADAPT. Two mechanical substitutions, zero behavior change:
 *   - sha256Hex: source ../proceduralize/sha256 -> ../../trust/src/digest.
 *     The trust kernel owns hashing (rule of one); extending it, not
 *     duplicating it.
 *   - canonicalJson: the source's local canonicalizer is byte-equivalent
 *     to the pinned sha256-canonical-json-v1 formulation, so the trust
 *     kernel's canonicalize is reused (canonicalization authority is the
 *     trust kernel). Callers use canonicalize directly.
 * DEPENDENCIES: ../../trust/src/digest (sha256Hex)
 * PROOFS: [6]
 *
 * Pure, deterministic, browser-safe.
 */

import { sha256Hex } from "../../trust/src/digest";

/**
 * Who said it, when, and what it replaces. In demo mode the owner label
 * is DEMO_OWNER_LABEL: an explicit non-identity. The identity seam
 * (./identity.ts) binds a verified label here later; the shape does not
 * change.
 */
export interface OwnerProvenance {
  owner: string;
  /** ISO 8601. */
  assertedAt: string;
  /** assertionId this replaces, or null for a first assertion. */
  supersedes: string | null;
}

/** The demo actor label. Explicitly not a verified identity. */
export const DEMO_OWNER_LABEL = "demo-owner (seeded, unverified)";

/** Build demo provenance. The clock is injectable for deterministic tests. */
export function demoProvenance(
  supersedes: string | null = null,
  nowIso: () => string = () => new Date().toISOString(),
): OwnerProvenance {
  return {
    owner: DEMO_OWNER_LABEL,
    assertedAt: nowIso(),
    supersedes,
  };
}

/** Deterministic short id: prefix + first 16 hex of sha256(canonical). */
export function shortId(prefix: string, canonical: string): string {
  return prefix + sha256Hex(canonical).slice(0, 16);
}

/**
 * Deterministic fact id for one field element of one object:
 * "fact-" + sha256(objectId + "|" + field + "|" + index), first 16 hex.
 * Same formula as the source: a re-observed graph with stable object ids
 * re-derives the same fact ids, so assertions survive regeneration.
 */
export function factIdFor(
  objectId: string,
  field: string,
  index: number = 0,
): string {
  return "fact-" + sha256Hex(objectId + "|" + field + "|" + index).slice(0, 16);
}
