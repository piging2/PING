import io, sys

p = "src/app/page.tsx"
s = io.open(p, encoding="utf-8").read()
old = "const portalProjections = listObjectIds().flatMap((id) => { const pr = buildPortalProjection(id); return pr ? [pr] : []; });"
new = "const portalProjections = listObjectIds().flatMap((id) => { const pr = buildPortalProjection(id); return pr ? [{ siteId: id, projection: pr }] : []; });"
n = s.count(old)
if n != 1:
    print("FAIL page.tsx pairs: found %d" % n)
    sys.exit(1)
io.open(p, "w", encoding="utf-8").write(s.replace(old, new))
print("OK page.tsx pairs")
