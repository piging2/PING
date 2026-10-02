#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
python3 - <<'PYEOF'
p = "src/fyd/proceduralize/__tests__/composition.test.ts"
src = open(p).read()
old = """    expect(compsA[1]).toBe("CTA");
    expect(compsB[compsB.length - 1]).toBe("CTA");"""
new = """    expect(compsA[1]).toBe("CTA");
    expect(compsB[compsB.length - 1]).toBe("CTA");
    // P3: the underlying section order also differs by category policy.
    expect(compsA.filter((c) => c !== "CTA")).not.toEqual(
      compsB.filter((c) => c !== "CTA"),
    );"""
assert src.count(old) == 1
open(p, "w").write(src.replace(old, new))
print("B3 test strengthened")
PYEOF
node_modules/.bin/jest --config src/fyd/proceduralize/jest.config.cjs src/fyd/proceduralize/__tests__/composition.test.ts 2>&1 | tail -6