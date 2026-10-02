cd /home/nolan/projects/ping-constitutional
echo "===== L1: events repository backend ====="
grep -n "class.*Repository\|implements\|new .*Repository\|DATA_DIR\|process.env" src/lib/events.ts | head -15
echo "===== L2: claim store backend ====="
grep -n "writeFile\|readFile\|process.env\|data/\|join(" src/fyd/claim/store.ts | head -15
echo "===== L3: src/app/dev page ====="
ls src/app/dev 2>/dev/null && grep -rn "notFound\|redirect\|auth" src/app/dev/page.tsx 2>/dev/null | head -5
echo "===== L4: any leftover TODO/FIXME security markers ====="
grep -rEn --include='*.ts' --include='*.tsx' -i "TODO.*(auth|secur|secret|token)|FIXME.*(auth|secur)|HACK.*auth|XXX.*secret" src | head -10
echo "===== L5: fetch/axios calls to external URLs with hardcoded hosts ====="
grep -rEn --include='*.ts' "https?://[a-zA-Z0-9.-]+\.(com|io|dev|app|net)" src/lib src/fyd --include='*.ts' 2>/dev/null | grep -viE "docs|w3\.org|schema\.org|example\.com|github\.com|vercel\.com/docs|upstash\.com/docs|kit\.com|google\.com|oauth|wikipedia" | head -15
echo "===== L6: package.json scripts (anything exfil-ish?) ====="
cat package.json | grep -A20 '"scripts"'
