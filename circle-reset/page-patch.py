import io, sys

path = "src/app/page.tsx"
s = io.open(path, encoding="utf-8").read()

old_import = 'import { buildPortalProjection } from "@/fyd/preview/pipeline";'
new_import = 'import { buildPortalProjection, HOMEPAGE_CIRCLE_SITE_IDS } from "@/fyd/preview/pipeline";'
assert s.count(old_import) == 1, "import anchor not found"
s = s.replace(old_import, new_import)

old_build = "const portalProjections = listObjectIds().flatMap((id) => { const pr = buildPortalProjection(id); return pr ? [{ siteId: id, projection: pr }] : []; });"
new_build = "const portalProjections = HOMEPAGE_CIRCLE_SITE_IDS.flatMap((id) => { const pr = buildPortalProjection(id); return pr ? [{ siteId: id, projection: pr }] : []; });"
assert s.count(old_build) == 1, "build anchor not found"
s = s.replace(old_build, new_build)

io.open(path, "w", encoding="utf-8").write(s)
print("OK page.tsx")
