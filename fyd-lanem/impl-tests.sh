#!/bin/bash
# Lane M: add distributeBalanced unit tests to placement.test.ts
set -e
cd /home/nolan/projects/ping
python3 << 'PYEOF'
import sys

T = "src/fyd/ui/__tests__/placement.test.ts"
src = open(T).read()

# 1. import distributeBalanced
old_imp = """import {
  placeObjects,
  clusterIdFor,
  type AnchorInput,
  type PlacementOptions,
  type PlacementViewport,
} from "@/fyd/ui/object-layer/placement";"""
new_imp = """import {
  placeObjects,
  clusterIdFor,
  distributeBalanced,
  type AnchorInput,
  type PlacementOptions,
  type PlacementViewport,
} from "@/fyd/ui/object-layer/placement";"""
assert src.count(old_imp) == 1, f"import block found {src.count(old_imp)}x"
src = src.replace(old_imp, new_imp, 1)

# 2. append describe block
tests = """
describe("distributeBalanced (dual-margin directive)", () => {
  const rails = ["right", "left"] as const;
  const docH = 4000;

  test("round-robins across both rails in placement priority order", () => {
    const inputs = [input("a", 500), input("b", 900), input("c", 300)];
    const parts = distributeBalanced(inputs, [...rails], docH);
    // placement order: c (300), a (500), b (900) -> right, left, right
    expect(parts.get("right")!.map((i) => i.objectId)).toEqual(["c", "b"]);
    expect(parts.get("left")!.map((i) => i.objectId)).toEqual(["a"]);
  });

  test("every input is assigned exactly once; no rail is starved", () => {
    const inputs = [
      input("s1", 100),
      input("s2", 200),
      input("s3", 300),
      input("s4", 400),
      input("s5", 500),
    ];
    const parts = distributeBalanced(inputs, [...rails], docH);
    const all = [...parts.get("right")!, ...parts.get("left")!].map((i) => i.objectId).sort();
    expect(all).toEqual(["s1", "s2", "s3", "s4", "s5"]);
    expect(parts.get("right")).toHaveLength(3);
    expect(parts.get("left")).toHaveLength(2);
  });

  test("priority wins the preferred rail", () => {
    const inputs = [input("low", 100, 0), input("high", 900, 1)];
    const parts = distributeBalanced(inputs, [...rails], docH);
    // priority 0 sorts before priority 1 regardless of anchor Y
    expect(parts.get("right")!.map((i) => i.objectId)).toEqual(["low"]);
    expect(parts.get("left")!.map((i) => i.objectId)).toEqual(["high"]);
  });

  test("stable input produces stable output; order-independent", () => {
    const a = [input("a", 500), input("b", 900), input("c", 300)];
    const b = [input("c", 300), input("a", 500), input("b", 900)];
    const pa = distributeBalanced(a, [...rails], docH);
    const pb = distributeBalanced(b, [...rails], docH);
    expect([...pb.entries()]).toEqual([...pa.entries()]);
  });

  test("per-rail placement keeps the never-overlap invariant", () => {
    // five objects sharing one anchor: spread like the layer does, then
    // place per rail. Neither rail may overlap the other, and each
    // rail's own slots keep minSpacing.
    const spread = [-280, -140, 0, 140, 280].map((dy, i) => input(`o${i}`, 2000 + dy));
    const parts = distributeBalanced(spread, [...rails], docH);
    const vp = { viewportWidth: 1280, documentHeight: docH };
    const opts = {
      restDiameter: 40,
      minSpacing: 56,
      edgePadding: 12,
      clusterWindow: 72,
    };
    const placed = [...rails].flatMap((r) =>
      placeObjects(parts.get(r)!, vp, { ...opts, rails: [r] }),
    );
    expect(placed).toHaveLength(5);
    const leftX = 12; // railOffsetForWidth(1280) = 12
    const rightX = 1280 - 12 - 40;
    for (const p of placed) {
      const x = p.rail === "right" ? rightX : leftX;
      // glyph rect stays inside the viewport and clear of center (center
      // column is [208, 1072] at 1280px: max-w-5xl centered)
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + 40).toBeLessThanOrEqual(1280);
      if (p.rail === "right") expect(x).toBeGreaterThanOrEqual(1072);
      else expect(x + 40).toBeLessThanOrEqual(208);
    }
  });
});
"""
src = src.rstrip("\n") + "\n" + tests
open(T, "w").write(src)
print("tests added")
PYEOF
echo "exit: $?"