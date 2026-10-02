#!/bin/bash
cd /home/nolan/projects/ping || exit 1
cp /mnt/c/Users/nolan/transfer/sites-render-audit.ts /tmp/sites-render-audit.ts

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
  git diff --no-index --src-prefix=a/ --dst-prefix=b/ "src/app/sites/$site/page.tsx" "/tmp/page-$site-new.tsx" | grep -v "^diff --git" | grep -v "^index " | sed "s|^+++ b/tmp/page-$site-new.tsx|+++ b/src/app/sites/$site/page.tsx|"
done
} > /mnt/c/Users/nolan/transfer/sites-wire-p4-render-audit.patch
echo "P-4 regenerated"
git apply --check /mnt/c/Users/nolan/transfer/sites-wire-p4-render-audit.patch && echo "P-4 PASS" || echo "P-4 FAIL"
