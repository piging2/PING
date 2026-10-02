#!/bin/bash
cd /home/nolan/projects/ping || exit 1

echo "=== P-4 (retry) ==="
python3 << 'PYEOF'
import re
patch = open('/mnt/c/Users/nolan/transfer/sites-wire-p4-render-audit.patch').read()
m = re.search(r'\+\+\+ b/src/fyd/sitespec/sites-render-audit\.ts\n@@ -0,0 \+1,(\d+) @@\n((?:\+.*\n)+)', patch)
assert m, "new-file hunk not found"
n = int(m.group(1))
body = m.group(2)
lines = [l[1:] for l in body.split('\n') if l.startswith('+')]
assert len(lines) == n, f"line count mismatch: {len(lines)} vs {n}"
open('/tmp/sites-render-audit.ts', 'w').write('\n'.join(lines) + '\n')
print(f"extracted {n} lines")
PYEOF

for site in happy-place coppersmith-plumbing; do
  src="src/app/sites/$site/page.tsx"
  tmp="/tmp/page-$site-new.tsx"
  cp "$src" "$tmp"
  python3 << PYEOF
path = "$tmp"
src = open(path).read()
anchor = 'import { heroMediaFor } from "@/fyd/media/select";\n'
assert src.count(anchor) == 1
addition = anchor + '''import {
  auditSitesRenderClaims,
  logSitesRenderAudit,
} from "@/fyd/sitespec/sites-render-audit";
'''
src = src.replace(anchor, addition, 1)
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
assert src.count(old_hook) == 1
src = src.replace(old_hook, new_hook, 1)
open(path, 'w').write(src)
print("edits applied to $site")
PYEOF
done

{
echo "WIRE-SPEC P-4: observation-only binding verification for the /sites render path (QA-TRUTH R-A, LANE-CLAIM R-MODEL)."
echo ""
echo "WHAT IT DOES: new module sites-render-audit.ts enumerates the page's factual claims and runs them through the STRONG verifyBinding; both /sites pages log the audit. Observation only, never throws, zero DOM change. Full rationale in workspace patch file."
echo ""
echo "--- /dev/null"
echo "+++ b/src/fyd/sitespec/sites-render-audit.ts"
n=$(wc -l < /tmp/sites-render-audit.ts)
echo "@@ -0,0 +1,$n @@"
sed 's/^/+/' /tmp/sites-render-audit.ts
for site in happy-place coppersmith-plumbing; do
  git diff --no-index --src-prefix=a/ --dst-prefix=b/ "src/app/sites/$site/page.tsx" "/tmp/page-$site-new.tsx" | grep -v "^diff --git" | grep -v "^index " | sed "s|^--- a/src/app/sites/$site/page.tsx|--- a/src/app/sites/$site/page.tsx|; s|^+++ b/tmp/page-$site-new.tsx|+++ b/src/app/sites/$site/page.tsx|"
done
} > /mnt/c/Users/nolan/transfer/sites-wire-p4-render-audit.patch
echo "P-4 regenerated"
git apply --check /mnt/c/Users/nolan/transfer/sites-wire-p4-render-audit.patch && echo "P-4 PASS" || echo "P-4 FAIL"

echo ""
echo "=== P-5 (retry) ==="
{
echo "WIRE-SPEC P-5: reconcile the two verifiers (LANE-CLAIM H4/R-H4)."
echo ""
echo "WHAT IT DOES: new resolveBoundFieldVerified in binding-verifier.ts delegates to the STRONG verifyBinding; renderer boundField uses it with ownerAssertionsFromGraph; comments corrected; graph.ts docblock disclaims publish authority. The weak primitive is untouched (pinned by bindings.test.ts:125). Full rationale in workspace patch file."
echo ""
git diff --no-index --src-prefix=a/ --dst-prefix=b/ src/fyd/sitespec/binding-verifier.ts /tmp/binding-verifier-new.ts | grep -v "^diff --git" | grep -v "^index " | sed "s|^+++ b/tmp/binding-verifier-new.ts|+++ b/src/fyd/sitespec/binding-verifier.ts|"
git diff --no-index --src-prefix=a/ --dst-prefix=b/ src/fyd/components/renderer.tsx /tmp/renderer-new.tsx | grep -v "^diff --git" | grep -v "^index " | sed "s|^+++ b/tmp/renderer-new.tsx|+++ b/src/fyd/components/renderer.tsx|"
git diff --no-index --src-prefix=a/ --dst-prefix=b/ src/fyd/sitespec/graph.ts /tmp/graph-new.ts | grep -v "^diff --git" | grep -v "^index " | sed "s|^+++ b/tmp/graph-new.ts|+++ b/src/fyd/sitespec/graph.ts|"
} > /mnt/c/Users/nolan/transfer/sites-wire-p5-verifier-reconciliation.patch
echo "P-5 regenerated"
git apply --check /mnt/c/Users/nolan/transfer/sites-wire-p5-verifier-reconciliation.patch && echo "P-5 PASS" || echo "P-5 FAIL"
