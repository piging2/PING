#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
python3 - <<'PYEOF'
p = "src/fyd/proceduralize/__tests__/composition.test.ts"
src = open(p).read()
old = """    const a = resolveCompositionProfile({
      category: "trade",
      graph,
      tenantRecord: profile({ ctaEmphasis: "elevated" }),
    });
    const b = resolveCompositionProfile({
      category: "knowledge",
      graph,
      tenantRecord: profile({ ctaEmphasis: "quiet" }),
    });"""
new = """    const a = resolveCompositionProfile({
      category: "trade",
      graph,
      tenantRecord: profile({
        homeSectionOrder: ["Hero", "Services", "BusinessSummary"],
        ctaEmphasis: "elevated",
      }),
    });
    const b = resolveCompositionProfile({
      category: "knowledge",
      graph,
      tenantRecord: profile({
        homeSectionOrder: ["Hero", "Posts", "BusinessSummary"],
        ctaEmphasis: "quiet",
      }),
    });"""
assert src.count(old) == 1
open(p, "w").write(src.replace(old, new))
print("fixed")
PYEOF
node_modules/.bin/jest --config src/fyd/proceduralize/jest.config.cjs src/fyd/proceduralize/__tests__/composition.test.ts 2>&1 | tail -6