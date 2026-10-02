/**
 * Object kernel: deterministic object identity.
 *
 * CONTRACTS:
 *   1. Website-derived ids follow the stable "web:<kind>:<key>" scheme
 *      proven by the FYD website-objects projection (ping-fyd-converged
 *      SHA 32f8347, src/lib/ping/website-objects.ts): the same source
 *      content always mints the same id, across runs and machines. That
 *      module itself is NOT harvested (Next.js server couplings:
 *      @/lib/blog, @/lib/products, @/lib/tenant-config); the naming
 *      scheme is.
 *   2. Content-addressed ids for non-website sources use
 *      deriveObjectId, which reuses the trust kernel's pinned digest
 *      (sha256-canonical-json-v1) and invents no new hasher. The ID
 *      FORMULATION is pinned here so any digest reproduces from the
 *      record alone:
 *        input record: { algo: OBJECT_ID_ALGORITHM, v: 1, namespace, key }
 *        id: "obj:" + digestCanonical(input record)[:16]
 *      namespace isolates id spaces ("website", "journal", ...); key is
 *      the source-stable distinguishing string (slug, source path, event
 *      id). Same (namespace, key) -> same id, byte for byte, forever.
 *
 * Zero dependencies except the already-harvested packages/trust digest.
 */

import { digestCanonical } from "../../trust/src/digest";

/** Pinned algorithm record label; changing the formulation mints a new version. */
export const OBJECT_ID_ALGORITHM = "piging2.object-id.v1" as const;

/**
 * Deterministic, content-addressed object id.
 * Pure: no clock, no randomness, no I/O.
 */
export function deriveObjectId(namespace: string, key: string): string {
  assertIdPart(namespace, "namespace");
  assertIdPart(key, "key");
  const digest = digestCanonical({
    algo: OBJECT_ID_ALGORITHM,
    v: 1,
    namespace,
    key,
  });
  return "obj:" + digest.slice(0, 16);
}

function assertIdPart(value: string, name: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("object id " + name + " must be a non-empty string");
  }
  if (/\s/.test(value)) {
    throw new Error("object id " + name + " must not contain whitespace");
  }
}

/**
 * The "web:<kind>:<key>" scheme splits on ':'; its parts must not contain
 * colons themselves or the id becomes unparseable.
 */
function assertWebPart(value: string, name: string): void {
  assertIdPart(value, name);
  if (value.includes(":")) {
    throw new Error("website id " + name + " must not contain ':'");
  }
}

/**
 * Website-derived object id: "web:<kind>:<key>".
 * The proven naming contract from the FYD website-objects projection.
 */
export function websiteObjectId(kind: string, key: string): string {
  assertWebPart(kind, "kind");
  assertWebPart(key, "key");
  return "web:" + kind + ":" + key;
}

/** Website-derived relationship id: "web:rel:<predicate>:<key>". */
export function websiteRelationshipId(predicate: string, key: string): string {
  assertWebPart(predicate, "predicate");
  assertWebPart(key, "key");
  return "web:rel:" + predicate + ":" + key;
}

/**
 * True when the id carries the website-derived namespace. Journal-derived
 * ids ("evt:..." / content-addressed "obj:...") are not website ids.
 */
export function isWebsiteObjectId(id: string): boolean {
  return id.startsWith("web:");
}
