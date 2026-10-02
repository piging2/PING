#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
python3 - <<'PYEOF'
p = "src/fyd/compose/__tests__/composition.test.ts"
src = open(p).read()

def rep(old, new, count=1):
    global src
    found = src.count(old)
    assert found == count, f"anchor {found}x: {old[:60]!r}"
    src = src.replace(old, new)

rep(
    '    expect(d.layoutCharacter).toBe("CRAFT");\n    expect(d.themeTokenOverrides.accent).toBe("#b3541e");',
    '    expect(d.layoutCharacter).toBe("CRAFT");\n    expect(d.themeTokenOverrides.radius).toBe("lg");',
)
rep(
    '    expect(d.layoutCharacter).toBe("EDITORIAL");\n    expect(d.homeSectionOrder).toContain("SocialProof");',
    '    expect(d.layoutCharacter).toBe("EDITORIAL");\n    expect(d.homeSectionOrder).toContain("ObjectFeed");',
)
open(p, "w").write(src)
print("test fixed")
PYEOF
node_modules/.bin/jest --config src/fyd/compose/jest.config.cjs 2>&1 | tail -8