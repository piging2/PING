"""G4 patch 5: inv-08 expectation.

The authority grants "reference" in the base set, so a business with no
contact values and no evidence now resolves [reference, follow]. The
test's core invariant (no dead buttons: ask needs evidence, contact
actions need values) is preserved; reference copies a working link.
"""
P = "/home/nolan/projects/ping/src/fyd/invariants/__tests__/inv-08-unknown-capability.test.ts"
src = open(P).read()
old = """    // follow is the business role's unconditional action; ask needs
    // evidence; call/email/website need values. Nothing else renders.
    expect(caps.map((c) => c.kind)).toEqual(["follow"]);"""
new = """    // G4: the authority grants "reference" in the base set, so it
    // propagates. follow is the business schema's unconditional action;
    // ask needs evidence; call/email/website need values. Nothing else
    // renders: no dead buttons.
    expect(caps.map((c) => c.kind)).toEqual(["reference", "follow"]);"""
assert src.count(old) == 1, "inv-08 pattern not found"
src = src.replace(old, new)
open(P, "w").write(src)
print("inv-08 updated")
