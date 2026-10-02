/**
 * Throwaway invariant check for the document-space placement rewrite.
 * Mirrors the old placement.test.ts scenarios with document bounds.
 * Run on the Pig: npx tsx /tmp-doc/verify-placement.ts
 */
import {
  placeObjects,
  clusterIdFor,
  type AnchorInput,
  type PlacementOptions,
} from "/home/nolan/projects/ping/src/fyd/ui/object-layer/placement";

const doc = (documentHeight: number) => ({ viewportWidth: 1440, documentHeight });
const baseOptions: PlacementOptions = {
  restDiameter: 64,
  minSpacing: 80,
  edgePadding: 12,
  clusterWindow: 72,
  rails: ["right"],
};
const input = (objectId: string, anchorMidY: number | null, priority = 0): AnchorInput => ({
  objectId,
  anchorMidY,
  priority,
});

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) console.log(`ok   ${name}`);
  else {
    failures++;
    console.log(`FAIL ${name}`, detail ?? "");
  }
}

// 1. Document clamping: anchors above/below the document clamp to document bounds.
{
  const placed = placeObjects([input("top", -5000), input("bottom", 9000)], doc(4000), baseOptions);
  const byId = new Map(placed.map((p) => [p.kind === "single" ? p.objectId : p.clusterId, p]));
  check("top clamps to doc lo (44)", (byId.get("top") as { y: number }).y === 44);
  check("bottom clamps to doc hi (3956)", (byId.get("bottom") as { y: number }).y === 3956);
}

// 2. Rail spill still works when the DOCUMENT is tiny.
{
  const tiny = doc(200);
  const placed = placeObjects(
    [input("a", 0), input("b", 10), input("c", 20)],
    tiny,
    { ...baseOptions, clusterWindow: 5, rails: ["right", "left"] },
  );
  check("spill: 3 placed", placed.length === 3, placed);
  check("spill: a right@44", placed[0].kind === "single" && placed[0].y === 44 && placed[0].rail === "right");
  check("spill: b right@124", placed[1].kind === "single" && placed[1].y === 124 && placed[1].rail === "right");
  check(
    "spill: c left@44",
    placed[2].kind === "single" && placed[2].y === 44 && placed[2].rail === "left",
    placed[2],
  );
}

// 3. Merge into nearest cluster when no rail has room (tiny document).
{
  const placed = placeObjects(
    [input("a", 0), input("b", 10), input("c", 20)],
    doc(200),
    { ...baseOptions, clusterWindow: 5, rails: ["right"] },
  );
  check("merge: 2 placed", placed.length === 2, placed);
  const cluster = placed.find((p) => p.kind === "cluster");
  const single = placed.find((p) => p.kind === "single");
  check("merge: single b@124", !!single && single.kind === "single" && single.y === 124);
  check(
    "merge: cluster a+c@44",
    !!cluster &&
      cluster.kind === "cluster" &&
      cluster.clusterId === clusterIdFor(["a", "c"]) &&
      cluster.y === 44,
    cluster,
  );
}

// 4. Missing anchors sort last, clamp to document bottom.
{
  const placed = placeObjects([input("ghost", null), input("real", 100)], doc(4000), baseOptions);
  check("ghost sorts last at doc hi", placed.length === 2 && placed[1].kind === "single" && (placed[1] as { objectId: string }).objectId === "ghost" && placed[1].y === 3956, placed);
}

// 5. Never overlaps on a scattered set (document bounds + spacing).
{
  let s = 42;
  const rand = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const inputs: AnchorInput[] = Array.from({ length: 12 }, (_, i) =>
    input(`obj-${i}`, Math.floor(rand() * 4000), i % 3),
  );
  const placed = placeObjects(inputs, doc(4000), {
    ...baseOptions,
    clusterWindow: 5,
    rails: ["right", "left"],
  });
  const inBounds = placed.every((p) => p.y >= 44 && p.y <= 3956 && Number.isFinite(p.y));
  check("scattered: all in document bounds", inBounds, placed.map((p) => p.y));
  let spaced = true;
  for (const rail of ["right", "left"] as const) {
    const ys = placed.filter((p) => p.rail === rail).map((p) => p.y);
    for (let i = 0; i < ys.length; i++)
      for (let j = i + 1; j < ys.length; j++) if (Math.abs(ys[i] - ys[j]) < 80) spaced = false;
  }
  check("scattered: pairwise spacing >= 80 per rail", spaced);
}

// 6. Determinism under input reordering (document space).
{
  const ordered = [input("a", 500), input("b", 900), input("c", 300)];
  const shuffled = [input("c", 300), input("a", 500), input("b", 900)];
  check(
    "order-independent",
    JSON.stringify(placeObjects(shuffled, doc(4000), baseOptions)) ===
      JSON.stringify(placeObjects(ordered, doc(4000), baseOptions)),
  );
}

// 7. Anchor Y is used verbatim (no scroll subtraction): y == anchor when free.
{
  const placed = placeObjects([input("a", 1500)], doc(4000), baseOptions);
  check("anchor used verbatim", placed[0].y === 1500, placed[0]);
}

console.log(failures === 0 ? "ALL INVARIANT CHECKS PASSED" : `${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
