import io, sys
p = "package.json"
s = io.open(p, encoding="utf-8").read()
old = '"test:media-invariant": "tsx scripts/test-media-invariant.ts"'
addition = ",\n    \"test:circle-reset\": \"tsx scripts/test-circle-reset.ts\""
assert s.count(old) == 1, "pattern not found"
io.open(p, "w", encoding="utf-8").write(s.replace(old, old + addition))
print("OK package.json")
