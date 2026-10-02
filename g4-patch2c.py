"""G4 patch 2c: restore contact as ask evidence.

The pre-G4 buildCapabilities gated ask on summary OR visible services
OR contact values (phone/email/website). The G4 rewrite dropped the
contact leg; restore it. A phone number is observed evidence the ask
surface can answer from ("what is their number?").
"""
P = "/home/nolan/projects/ping/src/fyd/object/view.ts"
src = open(P).read()
old = """  const hasAskEvidence =
    evidence.summary.trim().length > 0 ||
    evidence.services.some((s) => s.visible);"""
new = """  const hasAskEvidence =
    evidence.summary.trim().length > 0 ||
    evidence.services.some((s) => s.visible) ||
    contact.phone !== null ||
    contact.email !== null ||
    contact.website !== null;"""
assert src.count(old) == 1, "ask gate pattern not found"
src = src.replace(old, new)
open(P, "w").write(src)
print("ask gate restored")
