#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
python3 - <<'PYEOF'
p = "src/fyd/compose/__tests__/composition.test.ts"
src = open(p).read()
old = """    expect(out.ctaEmphasis).toBe("quiet");
    expect(out.layoutCharacter).toBeNull();
    // Untouched fields still come from the strategy.
    expect(out.themeTokenOverrides).toEqual(strategyForSite("trade", EMPTY_GRAPH).themeTokenOverrides);"""
new = """    expect(out.ctaEmphasis).toBe("quiet");
    expect(out.layoutCharacter).toBeNull();
    // A provided record replaces the whole block: its own overrides win,
    // the strategy's do not merge in.
    expect(out.themeTokenOverrides).toEqual({});"""
assert src.count(old) == 1
src = src.replace(old, new)
open(p, "w").write(src)
print("fixed")
PYEOF
node_modules/.bin/jest --config src/fyd/compose/jest.config.cjs 2>&1 | tail -7