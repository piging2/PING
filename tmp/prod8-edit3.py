"""PROD-8: surface orphaned corrections in /dev/objects. Edit 3: page.tsx"""

PATH = "/home/nolan/projects/ping/src/app/dev/objects/page.tsx"

src = open(PATH, encoding="utf-8").read()

old = """  const { graph, meta } = await getPingObjectGraph(siteId);
  const { typeGroups, views } = buildLabData(verified, graph);"""
new = """  const { graph, meta } = await getPingObjectGraph(siteId);
  const { typeGroups, views, orphanedCorrections } = buildLabData(
    verified,
    graph,
    siteId,
  );"""
assert src.count(old) == 1, "buildLabData call anchor not found"
src = src.replace(old, new, 1)

old = """      typeGroups={typeGroups}
      views={views}
      initialType={initialType}"""
new = """      typeGroups={typeGroups}
      views={views}
      orphanedCorrections={orphanedCorrections}
      initialType={initialType}"""
assert src.count(old) == 1, "client props anchor not found"
src = src.replace(old, new, 1)

open(PATH, "w", encoding="utf-8").write(src)
print("page.tsx edited OK")
