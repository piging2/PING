import re
base = '/home/nolan/projects/ping/src/fyd/components/'
rail = open(base + 'object-rail.tsx').read()
rend = open(base + 'renderer.tsx').read()

# ---- Patch 0001: object-rail.tsx ----
# 1. import the binding authority
old_imp = 'import type { ObjectView } from "../object/types";'
new_imp = old_imp + '\nimport { verifyPresentationBinding } from "../sitespec/graph";'
assert rail.count(old_imp) == 1
rail = rail.replace(old_imp, new_imp)

# 2. helper before pingObjectToProjection
anchor = 'export function pingObjectToProjection(o: PingObject): ObjectProjection {'
assert rail.count(anchor) == 1
helper = '''/**
 * Binding-gated description read for the rail adapters.
 *
 * The main sections read factual fields only through the binding authority
 * (boundField -> resolveBoundField); the rail adapters previously read
 * o.description raw, so a description with no provenance (an unbound claim)
 * still rendered in the rail, labeled with an invented
 * "Observed on website-ingestion" receipt. Routing the adapters through the
 * same authority means unbound descriptions are omitted, never rendered.
 */
function boundRailDescription(o: PingObject): string {
  const verdict = verifyPresentationBinding(
    { objectId: o.id, field: "description", classification: "direct" },
    { objects: [o], relationships: [] },
  );
  return verdict.ok ? verdict.value.trim() : "";
}

'''
rail = rail.replace(anchor, helper + anchor)

# 3. gate pingObjectToProjection
old1 = '  const description = (o.description ?? "").trim();'
assert rail.count(old1) == 1, rail.count(old1)
rail = rail.replace(old1, '  const description = boundRailDescription(o);')

# 4. gate pingObjectToView
old2 = '    summary: (o.description ?? "").trim(),'
assert rail.count(old2) == 1, rail.count(old2)
rail = rail.replace(old2, '    summary: boundRailDescription(o),')

open('/home/nolan/fyd-missions/shard-0/object-rail.patched.tsx', 'w').write(rail)

# ---- Patch 0002: renderer.tsx ObjectRailSection ----
old3 = '''      {featured.description?.trim() ? (
        <p className="text-sm leading-relaxed" style={{ color: theme.ink }}>
          {featured.description.trim()}
        </p>
      ) : null}'''
assert rend.count(old3) == 1, rend.count(old3)
new3 = '''      {featuredView.summary ? (
        <p className="text-sm leading-relaxed" style={{ color: theme.ink }}>
          {featuredView.summary}
        </p>
      ) : null}'''
rend = rend.replace(old3, new3)
open('/home/nolan/fyd-missions/shard-0/renderer.patched.tsx', 'w').write(rend)
print('patched copies written')
