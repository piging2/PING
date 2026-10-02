#!/bin/bash
# Regenerate P-4 and P-5 against the CURRENT dirty worktree via git diff --no-index.
cd /home/nolan/projects/ping || exit 1

echo "=== P-4 ==="
# New module: write directly to transfer (will be embedded as new-file diff)
# For the diff, we use /dev/null as the source
cp /mnt/c/Users/nolan/transfer/sites-wire-p4-render-audit.patch /tmp/p4-old.patch 2>/dev/null || true

# Extract the new module content from the existing P-4 patch (it's the + lines of the first hunk)
python3 << 'PYEOF'
import re
patch = open('/home/hatch/workspace/fyd-factory/patches/sites-wire-p4-render-audit.patch').read()
# Find the new-file hunk and extract + lines
m = re.search(r'\+\+\+ b/src/fyd/sitespec/sites-render-audit\.ts\n@@ -0,0 \+1,(\d+) @@\n((?:\+.*\n)+)', patch)
assert m, "new-file hunk not found"
n = int(m.group(1))
body = m.group(2)
lines = [l[1:] if l.startswith('+') else l for l in body.split('\n')]
# Remove trailing empty from split
if lines and lines[-1] == '':
    lines.pop()
assert len(lines) == n, f"line count mismatch: {len(lines)} vs {n}"
open('/tmp/sites-render-audit.ts', 'w').write('\n'.join(lines) + '\n')
print(f"extracted {n} lines of new module")
PYEOF

# Now apply P-4's page edits to temp copies
for site in happy-place coppersmith-plumbing; do
  src="src/app/sites/$site/page.tsx"
  tmp="/tmp/page-$site-new.tsx"
  cp "$src" "$tmp"
  python3 << PYEOF
path = "$tmp"
src = open(path).read()

# Add import after heroMediaFor import
anchor = 'import { heroMediaFor } from "@/fyd/media/select";\n'
assert src.count(anchor) == 1, "heroMediaFor anchor not unique in $site"
addition = anchor + '''import {
  auditSitesRenderClaims,
  logSitesRenderAudit,
} from "@/fyd/sitespec/sites-render-audit";
'''
src = src.replace(anchor, addition, 1)

# Add hook after renderable line, before return (
old_hook = """  const renderable = isRenderable(findings);

  return ("""
new_hook = """  const renderable = isRenderable(findings);

  // Binding-verification observation tap (WIRE-SPEC; QA-TRUTH R-A,
  // LANE-CLAIM R-MODEL): run this render's claims through the strong
  // BindingVerifier and log the verdicts. Observation only: never throws,
  // never mutates the spec, the findings, or the rendered output. The
  // frozen golden route renders byte-identically with or without it.
  try {
    logSitesRenderAudit(auditSitesRenderClaims(spec, graph, SITE_ID));
  } catch {
    // The audit must never break the render path.
  }

  return ("""
assert src.count(old_hook) == 1, "hook anchor not unique in $site"
src = src.replace(old_hook, new_hook, 1)
open(path, 'w').write(src)
print("edits applied to $site")
PYEOF
done

# Generate P-4 patch: prose + new-file diff + two page diffs
{
echo "WIRE-SPEC P-4: observation-only binding verification for the /sites render path (QA-TRUTH R-A, LANE-CLAIM R-MODEL)."
echo ""
echo "WHAT IT DOES: new module sites-render-audit.ts enumerates the page's factual claims and runs them through the STRONG verifyBinding; both /sites pages log the audit. Observation only, never throws, zero DOM change. See full rationale in the workspace patch file."
echo ""
echo "--- /dev/null"
echo "+++ b/src/fyd/sitespec/sites-render-audit.ts"
n=$(wc -l < /tmp/sites-render-audit.ts)
echo "@@ -0,0 +1,$n @@"
sed 's/^/+/' /tmp/sites-render-audit.ts
for site in happy-place coppersmith-plumbing; do
  git diff --no-index --src-prefix=a/ --dst-prefix=b/ "src/app/sites/$site/page.tsx" "/tmp/page-$site-new.tsx" | tail -n +4 | sed "s|/tmp/page-$site-new.tsx|src/app/sites/$site/page.tsx|g"
done
} > /mnt/c/Users/nolan/transfer/sites-wire-p4-render-audit.patch
echo "P-4 regenerated"
git apply --check /mnt/c/Users/nolan/transfer/sites-wire-p4-render-audit.patch && echo "P-4 PASS" || echo "P-4 FAIL"

echo ""
echo "=== P-5 ==="
# binding-verifier.ts: add resolveBoundFieldVerified
cp src/fyd/sitespec/binding-verifier.ts /tmp/binding-verifier-new.ts
python3 << 'PYEOF'
path = "/tmp/binding-verifier-new.ts"
src = open(path).read()
anchor = """/** One verdict per input binding, in input order, plus the split. */"""
assert src.count(anchor) == 1, "verifier anchor not unique"
func = """/**
 * Render-seam field resolution through the STRONG verifier (LANE-CLAIM
 * H4/R-H4 reconciliation). This is the publish-path counterpart of
 * verifyBinding: the renderer's boundField/boundTitle/boundDescription
 * resolve through here, so owner_authored bindings require a recorded
 * owner assertion, exactly as the planner's emission seam enforces.
 * Returns undefined when the binding does not verify; the caller must
 * OMIT the value, never guess.
 *
 * graph.ts resolveBoundField remains the low-level resolution primitive
 * (no publish-verdict authority); new publish paths must use this seam.
 */
export function resolveBoundFieldVerified(
  graph: ObjectGraph,
  binding: PresentationBinding,
  ownerAssertions: readonly OwnerAssertion[] = [],
): string | undefined {
  const verdict = verifyBinding(binding, graph, ownerAssertions);
  return verdict.status === "BOUND" ? verdict.value : undefined;
}

/** One verdict per input binding, in input order, plus the split. */"""
src = src.replace(anchor, func, 1)
open(path, 'w').write(src)
print("verifier edit applied")
PYEOF

# renderer.tsx: import + comment + boundField
cp src/fyd/components/renderer.tsx /tmp/renderer-new.tsx
python3 << 'PYEOF'
path = "/tmp/renderer-new.tsx"
src = open(path).read()

# 1. Import swap
old_imp = 'import { resolveBoundField } from "../sitespec/graph";\n'
new_imp = '''import {
  ownerAssertionsFromGraph,
  resolveBoundFieldVerified,
} from "../sitespec/binding-verifier";
'''
assert src.count(old_imp) == 1, "import anchor not unique"
src = src.replace(old_imp, new_imp, 1)

# 2. Comment block correction
old_comment = """// Every FACTUAL value rendered below is read through boundField /
// boundTitle / boundDescription, which resolve the value via the
// presentation-binding verifier (resolveBoundField). A value whose binding
// does not verify returns undefined, and the caller OMITS it: no binding,
// no factual output. This is the verifier wired into the actual
// projection path, not a sidecar."""
new_comment = """// Every FACTUAL value rendered below is read through boundField /
// boundTitle / boundDescription, which resolve the value via the STRONG
// BindingVerifier (verifyBinding in sitespec/binding-verifier.ts, through
// resolveBoundFieldVerified). A value whose binding does not verify
// returns undefined, and the caller OMITS it: no binding, no factual
// output. In particular, owner_authored bindings require a recorded owner
// assertion, exactly as the planner's emission seam enforces (LANE-CLAIM
// H4/R-H4 reconciliation). This is the verifier wired into the actual
// projection path, not a sidecar."""
assert src.count(old_comment) == 1, "comment anchor not unique"
src = src.replace(old_comment, new_comment, 1)

# 3. boundField rewire
old_bf = """/**
 * Verified factual field read. Returns the value only when the binding
 * verifies; undefined means the caller must OMIT the value, never guess.
 */"""
new_bf = """/**
 * Verified factual field read. Returns the value only when the binding
 * verifies against the STRONG BindingVerifier (LANE-CLAIM H4/R-H4);
 * undefined means the caller must OMIT the value, never guess.
 */"""
assert src.count(old_bf) == 1, "boundField docblock not unique"
src = src.replace(old_bf, new_bf, 1)

old_ret = "  return resolveBoundField(ctx.graph, { objectId: o.id, field, classification });"
new_ret = """  // Owner assertions ride on the render graph; the strong verifier
  // requires a recorded assertion for owner_authored bindings. Pure and
  // deterministic; trivial cost at demo graph sizes.
  return resolveBoundFieldVerified(
    ctx.graph,
    { objectId: o.id, field, classification },
    ownerAssertionsFromGraph(ctx.graph),
  );"""
assert src.count(old_ret) == 1, "boundField return not unique"
src = src.replace(old_ret, new_ret, 1)

open(path, 'w').write(src)
print("renderer edits applied")
PYEOF

# graph.ts: docblock
cp src/fyd/sitespec/graph.ts /tmp/graph-new.ts
python3 << 'PYEOF'
path = "/tmp/graph-new.ts"
src = open(path).read()
old = """/**
 * Resolve a presentation binding to its display value.
 *
 * Returns the verified value, or undefined when the binding does not
 * verify. undefined means the caller must OMIT the value, never guess.
 */"""
new = """/**
 * Resolve a presentation binding to its display value.
 *
 * Returns the verified value, or undefined when the binding does not
 * verify. undefined means the caller must OMIT the value, never guess.
 *
 * Resolution primitive only, not a publish verdict: owner_authored and
 * derived bindings are NOT evidence-checked here (LANE-CLAIM H4). Publish
 * paths must use resolveBoundFieldVerified in sitespec/binding-verifier.ts,
 * which enforces the strong verifier's rules. Retained for non-publish
 * consumers such as lineage tracing.
 */"""
assert src.count(old) == 1, "graph docblock not unique"
src = src.replace(old, new, 1)
open(path, 'w').write(src)
print("graph edit applied")
PYEOF

# Generate P-5 patch
{
echo "WIRE-SPEC P-5: reconcile the two verifiers (LANE-CLAIM H4/R-H4)."
echo ""
echo "WHAT IT DOES: new resolveBoundFieldVerified in binding-verifier.ts delegates to the STRONG verifyBinding; renderer boundField uses it with ownerAssertionsFromGraph; comments corrected; graph.ts docblock disclaims publish authority. The weak primitive is untouched (pinned by bindings.test.ts:125). See full rationale in the workspace patch file."
echo ""
for f in src/fyd/sitespec/binding-verifier.ts src/fyd/components/renderer.tsx src/fyd/sitespec/graph.ts; do
  tmp="/tmp/$(basename $f | sed 's/\./-new./' | sed 's/tsx$/tsx/')"
  # map to our temp names
  case "$f" in
    *binding-verifier.ts) tmp="/tmp/binding-verifier-new.ts";;
    *renderer.tsx) tmp="/tmp/renderer-new.tsx";;
    *graph.ts) tmp="/tmp/graph-new.ts";;
  esac
  git diff --no-index --src-prefix=a/ --dst-prefix=b/ "$f" "$tmp" | tail -n +4 | sed "s|$(basename $tmp)|$(basename $f)|g"
done
} > /mnt/c/Users/nolan/transfer/sites-wire-p5-verifier-reconciliation.patch
echo "P-5 regenerated"
git apply --check /mnt/c/Users/nolan/transfer/sites-wire-p5-verifier-reconciliation.patch && echo "P-5 PASS" || echo "P-5 FAIL"
