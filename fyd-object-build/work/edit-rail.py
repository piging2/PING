"""Surgical edit: object-rail.tsx adapter gains the new projection fields."""
p = "src/fyd/components/object-rail.tsx"
s = open(p).read()

old = """    facts: [],
    people: [],
    contact: { phone: null, email: null, website: null },"""
new = """    facts: [],
    people: [],
    externalIdentities: [],
    serviceRefs: [],
    locationRef: null,
    contact: { phone: null, email: null, website: null },"""
assert s.count(old) == 1, "anchor not found exactly once"
s = s.replace(old, new)
open(p, "w").write(s)
print("EDIT-OK")
