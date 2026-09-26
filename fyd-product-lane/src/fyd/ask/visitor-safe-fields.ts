/**
 * Visitor-safe field allowlist for Ask FYD (FYD FINISH-STRONG).
 *
 * Even a public object can carry arbitrary fields (internal notes, private
 * metadata) that no answer branch needs. Only known public-answer fields
 * survive projection to the visitor graph; everything else is dropped by
 * default. Top-level title/description and provenance metadata
 * (kind/ref/derivedAt, needed for citations) are always kept because they
 * live outside `fields`.
 *
 * Fail-closed by default: a field not on this list is never visible to a
 * visitor answer, no matter what the site record contains.
 */
import type { PingObject } from "../../lib/ping/types";

export const VISITOR_SAFE_FIELDS: ReadonlySet<string> = new Set([
  // contact
  "phone",
  "email",
  "website",
  "url",
  "domain",
  // location / service area
  "locality",
  "location",
  "address",
  "city",
  "area_served",
  "areaServed",
  "serviceArea",
  "service_area",
  // hours, category, services
  "hours",
  "category",
  "businessCategory",
  "serviceType",
  "services",
  // profile text variants
  "bio",
  "summary",
  // trust signals
  "verified",
  "followerCount",
  "followers",
  // claim-kind metadata the classifier reads
  "claimKind",
]);

/** Strip every field not on the visitor-safe allowlist. Pure. */
export function visitorSafeObject(obj: PingObject): PingObject {
  const fields: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(obj.fields ?? {})) {
    if (VISITOR_SAFE_FIELDS.has(k)) fields[k] = v;
  }
  return { ...obj, fields };
}

/** True when a field name may appear in a visitor answer. */
export function isVisitorSafeField(field: string): boolean {
  return VISITOR_SAFE_FIELDS.has(field);
}
