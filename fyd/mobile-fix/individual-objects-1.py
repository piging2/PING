#!/usr/bin/env python3
"""Individual-object experience (2026-09-23 directive).

1. middleware: re-enable /sites and /o (09-22 reset superseded for these).
2. types: add "directions" and "reference" capability kinds.
3. view.ts: buildCapabilities becomes schema-decided.
4. view.test.ts: update for the new signature.
5. /o page: link services to their nodes; render new actions; scope Ask.
6. evidence-chrome: render new actions in CapabilityAction.
7. object-affordance: Ask FYD links to the object's own node (#ask).
"""
import sys

P = "/home/nolan/projects/ping/"

def replace_once(path, old, new, label):
    full = P + path
    s = open(full).read()
    n = s.count(old)
    if n != 1:
        print(f"FAIL {label}: found {n} occurrences, expected 1")
        sys.exit(1)
    open(full, "w").write(s.replace(old, new, 1))
    print(f"OK {label}")

# ---------------------------------------------------------------- middleware
old_dis = """const DISABLED_PAGE_PREFIXES = [
  "/objects", // /objects, /objects/spatial (lane product surface)
  "/sites", // generated site previews
  "/build", // website builder (out of reset scope)
  "/portal-rail", // geometry fixture
];"""
new_dis = """const DISABLED_PAGE_PREFIXES = [
  "/objects", // /objects, /objects/spatial (lane product surface)
  "/build", // website builder (out of reset scope)
  "/portal-rail", // geometry fixture
];"""
replace_once("src/middleware.ts", old_dis, new_dis, "middleware-prefixes")

old_o = """function isDisabledPage(pathname: string): boolean {
  // /o and /o/[objectId] (demoted object pages). Matched exactly: no other
  // app route starts with "/o/" or equals "/o".
  if (pathname === "/o" || pathname.startsWith("/o/")) return true;
  return DISABLED_PAGE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}"""
new_o = """function isDisabledPage(pathname: string): boolean {
  // /o and /o/[objectId] (object nodes) and /sites/* (generated FYD sites)
  // were disabled by the 2026-09-22 Circle-Only Product Reset. The
  // 2026-09-23 individual-object directive supersedes that reset for these
  // two surfaces: the object node is the product primitive (preview ->
  // open -> act on the selected object), and generated sites are
  // compositions of individually addressable objects.
  return DISABLED_PAGE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}"""
replace_once("src/middleware.ts", old_o, new_o, "middleware-o-check")

old_hdr = """ * Circle-Only Product Reset (2026-09-22): experimental FYD product routes
 * are disabled from the user-facing router. This changes routing only:
 * the route code, runtime APIs, evidence machinery, and tests are all
 * preserved. Revert by deleting DISABLED_PAGE_PREFIXES and the /o check."""
new_hdr = """ * Circle-Only Product Reset (2026-09-22): experimental FYD product routes
 * are disabled from the user-facing router. This changes routing only:
 * the route code, runtime APIs, evidence machinery, and tests are all
 * preserved. Revert by deleting DISABLED_PAGE_PREFIXES.
 *
 * 2026-09-23: /sites/* and /o/* are re-enabled. The individual-object
 * directive makes the object node the product primitive; the 09-22 reset
 * no longer applies to these two surfaces."""
replace_once("src/middleware.ts", old_hdr, new_hdr, "middleware-header")

# ------------------------------------------------------------------- types
old_cap = """export type ObjectCapability =
  | { kind: "view" }
  | { kind: "ask" }
  | { kind: "follow" }
  | { kind: "like" }
  | { kind: "call"; href: string; label: string }
  | { kind: "email"; href: string; label: string }
  | { kind: "website"; href: string; label: string };"""
new_cap = """export type ObjectCapability =
  | { kind: "view" }
  | { kind: "ask" }
  | { kind: "follow" }
  | { kind: "like" }
  | { kind: "call"; href: string; label: string }
  | { kind: "email"; href: string; label: string }
  | { kind: "website"; href: string; label: string }
  | { kind: "directions"; href: string; label: string }
  | { kind: "reference"; objectId: string };"""
replace_once("src/fyd/object/types.ts", old_cap, new_cap, "types-capabilities")

# -------------------------------------------------------------------- view
old_imp = 'import { SCHEMA_ROLES } from "../sitespec/schemas";'
new_imp = 'import { SCHEMA_ROLES, schemaRole } from "../sitespec/schemas";'
replace_once("src/fyd/object/view.ts", old_imp, new_imp, "view-import")

old_bc = """export function buildCapabilities(
  contact: ObjectContactView,
  evidence: { summary: string; services: ObjectServiceView[] },
): ObjectCapability[] {
  // "view" is demoted: the full customer page is no longer a capability
  // (the type variant stays for compatibility, but it is never emitted).
  // "follow" is a PING relationship, always available for a business object.
  // call/email/website appear only when the underlying value exists.
  // "ask" is evidence-gated: the ask pipeline answers from the object's
  // own record (summary, services, contact), so a circle offers ask only
  // when the object carries something to answer from. No ask evidence ->
  // no ask action, never a dead question box.
  const caps: ObjectCapability[] = [{ kind: "follow" }, { kind: "like" }];
  const hasAskEvidence =
    evidence.summary.trim().length > 0 ||
    evidence.services.some((s) => s.visible) ||
    contact.phone !== null ||
    contact.email !== null ||
    contact.website !== null ||
    contact.locality !== null;
  if (hasAskEvidence) caps.unshift({ kind: "ask" });
  if (contact.phone) caps.push({ kind: "call", href: "tel:" + contact.phone.replace(/\\s/g, ""), label: "Call" });
  if (contact.email) caps.push({ kind: "email", href: "mailto:" + contact.email, label: "Email" });
  if (contact.website) caps.push({ kind: "website", href: contact.website, label: "Website" });
  return caps;
}"""

new_bc = """export function buildCapabilities(
  schemaId: string,
  objectId: string,
  contact: ObjectContactView,
  evidence: { summary: string; services: ObjectServiceView[] },
): ObjectCapability[] {
  // SCHEMA DECIDES THE ACTIONS (2026-09-23, binding). Every object role
  // gets the action set its schema supports; no role inherits another's
  // buttons, and no button renders without its underlying value.
  //
  //   business -> follow, ask, contact (call/email/website)
  //   service  -> ask, reference (+ request quote when a quote backend exists)
  //   product  -> ask, reference
  //   location -> ask, directions, contact where supported
  //   person   -> ask, follow
  //   post     -> ask, like, reference (+ reply when a reply backend exists)
  //   article  -> ask, reference
  //
  // "view" is demoted: the full customer page is no longer a capability
  // (the type variant stays for compatibility, but it is never emitted).
  // "ask" is evidence-gated: the ask pipeline answers from the object's
  // own record, so ask appears only when the object carries something to
  // answer from. No ask evidence -> no ask action, never a dead box.
  // "quote" and "reply" are not emitted: no backend exists yet, and a
  // button without a working action is a lie.
  const role = schemaRole(schemaId);
  const caps: ObjectCapability[] = [];
  const hasAskEvidence =
    evidence.summary.trim().length > 0 ||
    evidence.services.some((s) => s.visible) ||
    contact.phone !== null ||
    contact.email !== null ||
    contact.website !== null ||
    contact.locality !== null;
  if (hasAskEvidence) caps.push({ kind: "ask" });

  const contactActions = () => {
    if (contact.phone)
      caps.push({ kind: "call", href: "tel:" + contact.phone.replace(/\\s/g, ""), label: "Call" });
    if (contact.email)
      caps.push({ kind: "email", href: "mailto:" + contact.email, label: "Email" });
    if (contact.website)
      caps.push({ kind: "website", href: contact.website, label: "Website" });
  };

  switch (role) {
    case "business":
      caps.push({ kind: "follow" });
      contactActions();
      break;
    case "service":
    case "product":
      caps.push({ kind: "reference", objectId });
      break;
    case "location":
      if (contact.locality)
        caps.push({
          kind: "directions",
          href:
            "https://www.google.com/maps/search/?api=1&query=" +
            encodeURIComponent(contact.locality),
          label: "Directions",
        });
      contactActions();
      break;
    case "person":
      caps.push({ kind: "follow" });
      break;
    case "post":
      caps.push({ kind: "like" });
      caps.push({ kind: "reference", objectId });
      break;
    case "article":
      caps.push({ kind: "reference", objectId });
      break;
    default:
      // Unknown role: ask only (when evidence-gated above). Never guess.
      break;
  }
  return caps;
}"""
replace_once("src/fyd/object/view.ts", old_bc, new_bc, "view-buildCapabilities")

old_call = "    capabilities: buildCapabilities(contact, { summary: description, services }),"
new_call = '    capabilities: buildCapabilities(obj.schema, obj.id, contact, { summary: description, services }),'
replace_once("src/fyd/object/view.ts", old_call, new_call, "view-callsite")

print("ALL EDITS APPLIED")
