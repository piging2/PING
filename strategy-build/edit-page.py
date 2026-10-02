p = open("src/app/build/[siteId]/page.tsx").read()
edits = [
    ('import { vectorForSite } from "@/fyd/builder/site-vectors";',
     'import { strategyForSite } from "@/fyd/builder/strategy-for-site";'),
    ('vector: vectorForSite(siteId),',
     'vector: strategyForSite(siteId, verified.graph).vector,'),
    ('// this tenant composition operating point. The planner never',
     '// this tenant\'s named site strategy (explicit pin > graph inference > neutral\n  // default) resolving the composition operating point. The planner never'),
]
for old, new in edits:
    assert p.count(old) == 1, "count=%d for %r" % (p.count(old), old[:60])
    p = p.replace(old, new)
open("src/app/build/[siteId]/page.tsx", "w").write(p)
print("OK")
