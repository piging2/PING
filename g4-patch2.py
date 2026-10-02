"""G4 patch 2: view.ts - buildCapabilities derives from the authority.

Replaces the role-switch decision table with a mechanical mapping of
capabilityOptionsForSchema output -> ObjectCapability render model.
No role logic remains in the view layer.
"""
import sys

P = "/home/nolan/projects/ping/src/fyd/object/view.ts"
src = open(P).read()

def sub(old, new):
    global src
    assert src.count(old) == 1, "pattern issue: %r (count=%d)" % (old[:70], src.count(old))
    src = src.replace(old, new)

# 1. Import the authority.
sub(
    'import { SCHEMA_ROLES, schemaRole } from "../sitespec/schemas";',
    'import { SCHEMA_ROLES, capabilityOptionsForSchema, schemaRole } from "../sitespec/schemas";')

# 2. Rewrite buildCapabilities: derive, don't decide.
old_fn_start = src.index("export function buildCapabilities(")
old_fn_end = src.index("/**", old_fn_start)
old_fn = src[old_fn_start:old_fn_end]

new_fn = '''/**
 * Capability resolution for one object (G4).
 *
 * OBJECT + VIEWER + CONTEXT -> CAPABILITY RESOLUTION -> AVAILABLE ACTIONS
 * -> RENDER MODEL. The allowed action set comes from
 * capabilityOptionsForSchema (the capability authority in
 * ../sitespec/schemas); this function only maps each allowed kind to its
 * render model and applies executability gates (evidence for ask,
 * safe-link resolution for contact actions). There is no role switch
 * here: schema decides the actions, the view layer renders them.
 *
 * Executability notes:
 * - "open" is demoted: the full customer page is not a capability action.
 * - "ask" requires evidence (summary or visible services).
 * - contact kinds (call/email/website/directions) require a safe,
 *   evidence-backed value; resolveSafeLink "navigate" refuses hostile or
 *   non-public values, so no dead or unsafe button is emitted.
 * - "reply" is not emitted: no reply backend exists, and a button
 *   without a working action is a lie.
 * - "propose_update"/"site_propose" are owner-surface actions with no
 *   customer render model; they are allowed by the authority but not
 *   rendered here.
 */
export interface CapabilityViewer {
  viewerId: string | null;
  controllerId: string;
}

export function buildCapabilities(
  schemaId: string,
  objectId: string,
  contact: ObjectContactView,
  evidence: { summary: string; services: ObjectServiceView[] },
  viewer: CapabilityViewer = { viewerId: null, controllerId: "" },
): ObjectCapability[] {
  const allowed = capabilityOptionsForSchema(schemaId, {
    viewerId: viewer.viewerId,
    controllerId: viewer.controllerId,
    hasWebsite: contact.website !== null,
    hasPhone: contact.phone !== null,
    hasEmail: contact.email !== null,
    hasLocality: contact.locality !== null,
  });
  const caps: ObjectCapability[] = [];
  const hasAskEvidence =
    evidence.summary.trim().length > 0 ||
    evidence.services.some((s) => s.visible);
  for (const kind of allowed) {
    switch (kind) {
      case "open":
        // Demoted: the full customer page is not a capability action.
        break;
      case "ask":
        if (hasAskEvidence) caps.push({ kind: "ask" });
        break;
      case "reference":
        caps.push({ kind: "reference", objectId });
        break;
      case "follow":
        caps.push({ kind: "follow" });
        break;
      case "like":
        caps.push({ kind: "like" });
        break;
      case "reply":
        // No reply backend: never render a button without a working action.
        break;
      case "propose_update":
      case "site_propose":
        // Owner-surface actions; no customer render model.
        break;
      case "open_website": {
        const resolved = resolveSafeLink(contact.website, "navigate");
        if (resolved.kind === "safe" && contact.website) {
          caps.push({ kind: "website", href: resolved.href, label: "Website" });
        }
        break;
      }
      case "call": {
        const resolved = resolveSafeLink(contact.phone, "call");
        if (resolved.kind === "safe" && contact.phone) {
          caps.push({ kind: "call", href: resolved.href, label: "Call" });
        }
        break;
      }
      case "email": {
        const resolved = resolveSafeLink(contact.email, "email");
        if (resolved.kind === "safe" && contact.email) {
          caps.push({ kind: "email", href: resolved.href, label: "Email" });
        }
        break;
      }
      case "directions": {
        const resolved = resolveSafeLink(contact.locality, "directions");
        if (resolved.kind === "safe" && contact.locality) {
          caps.push({
            kind: "directions",
            href: resolved.href,
            label: "Directions",
          });
        }
        break;
      }
    }
  }
  return caps;
}

'''
src = src[:old_fn_start] + new_fn + src[old_fn_end:]

# 3. composeObjectView: pass the viewer (anonymous today) + controller id.
sub(
    "    capabilities: buildCapabilities(obj.schema, obj.id, contact, { summary: description, services }),",
    "    capabilities: buildCapabilities(\n      obj.schema,\n      obj.id,\n      contact,\n      { summary: description, services },\n      { viewerId: null, controllerId: obj.controllerId },\n    ),")

open(P, "w").write(src)
print("view.ts patched OK")
