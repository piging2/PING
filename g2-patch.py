#!/usr/bin/env python3
"""G2 patch: stable entity identity + evolving observations.

deriveBusinessId hashed {url, controller, content fields}: the same source
run by a different runner got a different id, and a phone/description change
reminted the business. Corrected model (Nolan 2026-09-24): entity identity
comes ONLY from canonical source-identity inputs; runner/run/observations/
pipeline version are provenance, never identity.
"""
import sys

REPO = "/home/nolan/projects/ping"
P = REPO + "/src/fyd/proceduralize/proceduralizer.ts"
src = open(P).read()

old_doc = '''/**
 * Derive a stable business id from the projection inputs. Pure: no
 * module state, no clock. The same website, fields, and controller
 * always yield the same id, so re-projection deduplicates instead of
 * forking. The observation time stays caller-injected
 * (createdAt/updatedAt/derivedAt) so tests can pin it.
 *
 * Grill 28 verdict: KEEP (see STRUCTURED-DATA.md). This is a derived
 * projection key, not a canonical PING identity: IdentityAuthority's
 * generate_id() is non-deterministic by design (UUIDv7) and would break
 * re-projection dedup; its generate_deterministic_id() is semantically
 * identical to this hash but would couple a browser-safe lane to the
 * Python runtime. When a website-derived business is promoted to a
 * first-class PING object via the proposal path, the canonical id is
 * minted by the runtime.
 */
function deriveBusinessId(
  sourceUrl: string,
  controllerId: string,
  scalar: Record<string, string | string[]>,
): string {
  const canonical = JSON.stringify({
    url: sourceUrl,
    controller: controllerId,
    fields: Object.keys(scalar)
      .sort()
      .map((k) => [k, scalar[k]]),
  });
  return "website-business-" + sha256Hex(canonical).slice(0, 16);
}'''

new_doc = '''/**
 * Canonical entity URL: the source-identity input for entity resolution.
 * Normalization is semantics-preserving for business-website identity:
 * lowercase scheme+host, strip default ports, trailing slash, query,
 * fragment, and a leading www. (www vs apex redirect to the same business;
 * redirects are entity-resolution evidence, not identity forks). Pure and
 * deterministic across processes, runners, and machines. Unparseable input
 * falls back to the raw string so identity derivation never throws.
 */
export function canonicalEntityUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return raw.trim();
    let host = u.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice("www.".length);
    const port =
      (u.protocol === "http:" && u.port === "80") ||
      (u.protocol === "https:" && u.port === "443") ||
      u.port === ""
        ? ""
        : ":" + u.port;
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return u.protocol + "//" + host + port + path;
  } catch {
    return raw.trim();
  }
}

/**
 * Derive the STABLE ENTITY id for a website-ingested business. Pure: no
 * module state, no clock, no runner, no content.
 *
 * G2 corrected identity model (2026-09-24): STABLE ENTITY IDENTITY +
 * evolving OBSERVATIONS. The id is derived ONLY from the canonical entity
 * URL. The runner label (controller), run id, observation ids, extracted
 * content fields, and pipeline version are PROVENANCE, never identity: a
 * phone-number or description change must not remint the business, and the
 * same source run by a different runner, in a different process, in a
 * different order, on a different machine must yield the SAME id (hostile
 * test in __tests__/entity-identity.test.ts). Content hashes identify
 * observations/evidence, not the entity.
 *
 * Grill 28 verdict: KEEP (see STRUCTURED-DATA.md). This is a derived
 * projection key, not a canonical PING identity: IdentityAuthority's
 * generate_id() is non-deterministic by design (UUIDv7) and would break
 * re-projection dedup; its generate_deterministic_id() is semantically
 * identical to this hash but would couple a browser-safe lane to the
 * Python runtime. No new identity authority is created here. When a
 * website-derived business is promoted to a first-class PING object via
 * the proposal path, the canonical id is minted by the runtime.
 */
function deriveBusinessId(entityUrl: string): string {
  return "website-business-" + sha256Hex(canonicalEntityUrl(entityUrl)).slice(0, 16);
}'''

assert src.count(old_doc) == 1, "deriveBusinessId block not found"
src = src.replace(old_doc, new_doc)

# --- project(): resolve the entity URL (site-declared canonical first), drop
# --- controllerId and content fields from identity derivation.
old_call = '''  const businessId = deriveBusinessId(sourceUrl, controllerId, scalar);
  const provenance = {'''
new_call = '''  // Entity resolution: the site's self-declared canonical URL (og:url ->
  // website field) is the strongest source-identity signal; the seed URL is
  // the fallback. Execution context (runner/controllerId, run time) stays in
  // provenance and on the object, never in the id.
  const websiteClaim = asString(scalar["website"] ?? "");
  let entityUrl = sourceUrl;
  try {
    const probe = new URL(websiteClaim);
    if ((probe.protocol === "http:" || probe.protocol === "https:") && probe.hostname !== "") {
      entityUrl = websiteClaim;
    }
  } catch {
    entityUrl = sourceUrl;
  }
  const businessId = deriveBusinessId(entityUrl);
  const provenance = {'''
assert src.count(old_call) == 1, "businessId call site not found"
src = src.replace(old_call, new_call)

open(P, "w").write(src)
print("G2 patch applied")
