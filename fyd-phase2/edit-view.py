"""Phase 2 edits for src/fyd/object/view.ts.

Evidence-gate the "ask" capability: a circle offers the ask action only
when the object carries something the ask pipeline can answer from
(summary text, visible services, or contact evidence). Exported for tests.
"""
import sys

PATH = "/home/nolan/projects/ping/src/fyd/object/view.ts"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

edits = []

old_fn = """function buildCapabilities(contact: ObjectContactView): ObjectCapability[] {
  // "view" is demoted: the full customer page is no longer a capability
  // (the type variant stays for compatibility, but it is never emitted).
  // "follow" is a PING relationship, always available for a business object.
  // call/email/website appear only when the underlying value exists.
  const caps: ObjectCapability[] = [{ kind: "ask" }, { kind: "follow" }, { kind: "like" }];
"""
new_fn = """export function buildCapabilities(
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
"""
edits.append(("buildCapabilities", old_fn, new_fn))

old_call = """    capabilities: buildCapabilities(contact),
"""
new_call = """    capabilities: buildCapabilities(contact, { summary: description, services }),
"""
edits.append(("call-site", old_call, new_call))

for name, old, new in edits:
    count = src.count(old)
    if count != 1:
        print(f"FATAL: edit {name}: found {count} occurrences (expected 1)")
        sys.exit(1)
    src = src.replace(old, new, 1)
    print(f"ok: {name}")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)
print("written", PATH)
