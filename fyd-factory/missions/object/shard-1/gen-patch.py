#!/usr/bin/env python3
"""Generate the object-rail-binding-gate patch by editing a COPY of the
working-tree renderer.tsx and diffing. Never touches the repo tree."""
import difflib, sys

P = "/home/nolan/fyd-factory/object-shard1/patchwork/renderer.orig.tsx"
src = open(P).read()

OLD = """/**
 * ObjectRail section: the generic margin capability as an inline section.
 * Features the richest public non-owner object through the existing
 * ObjectCircle doorway over the honest pingObjectToView adapter; presence
 * mode auto lets geometry decide rail vs drawer from the theme token.
 */
function ObjectRailSection({ section, objects, presentation, theme, ctx, motionIndex }: SectionProps) {
  const featured = richestObject(objects, ctx.spec.ownerObjectId);
  if (!featured) return null;
  const featuredView = pingObjectToView(featured);
"""
NEW = """/**
 * ObjectRail section: the generic margin capability as an inline section.
 * Features the richest public non-owner object through the existing
 * ObjectCircle doorway over the honest pingObjectToView adapter; presence
 * mode auto lets geometry decide rail vs drawer from the theme token.
 *
 * Binding gate: the featured identity is a factual claim, so candidates are
 * restricted to objects whose title binding verifies (boundTitle resolves
 * through the presentation-binding verifier). The view and the summary use
 * the verified values, never the raw object fields. An unbound object never
 * features: no binding, no factual output.
 */
function ObjectRailSection({ section, objects, presentation, theme, ctx, motionIndex }: SectionProps) {
  const bound = objects.filter((o) => boundTitle(ctx, o) !== undefined);
  const featured = richestObject(bound, ctx.spec.ownerObjectId);
  if (!featured) return null;
  const name = boundTitle(ctx, featured) as string;
  const summary = boundDescription(ctx, featured);
  const featuredView = pingObjectToView({ ...featured, title: name, description: summary ?? "" });
"""
assert src.count(OLD) == 1, "OLD block not found exactly once: %d" % src.count(OLD)
src = src.replace(OLD, NEW)

OLD2 = """      {featured.description?.trim() ? (
        <p className="text-sm leading-relaxed" style={{ color: theme.ink }}>
          {featured.description.trim()}
        </p>
      ) : null}"""
NEW2 = """      {summary?.trim() ? (
        <p className="text-sm leading-relaxed" style={{ color: theme.ink }}>
          {summary.trim()}
        </p>
      ) : null}"""
assert src.count(OLD2) == 1, "OLD2 block not found exactly once: %d" % src.count(OLD2)
src = src.replace(OLD2, NEW2)

open("/home/nolan/fyd-factory/object-shard1/patchwork/renderer.patched.tsx", "w").write(src)

orig = open(P).readlines()
new = src.splitlines(keepends=True)
diff = list(difflib.unified_diff(orig, new,
    fromfile="a/src/fyd/components/renderer.tsx",
    tofile="b/src/fyd/components/renderer.tsx"))
assert diff, "empty diff"
open("/home/nolan/fyd-factory/object-shard1/patchwork/rail-gate.diff", "w").write("".join(diff))
print("diff lines:", len(diff))
