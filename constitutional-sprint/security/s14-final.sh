cd /home/nolan/projects/ping-constitutional
echo "===== M1: scripts dir listing + secret-ish content (names only) ====="
ls scripts/
grep -rEn --include='*.ts' --include='*.mjs' -o -i "[A-Za-z0-9_.]*(api[_-]?key|secret|token|password)[A-Za-z0-9_.]*[ \t]*[:=]" scripts/ | head -20
echo "===== M2: dev/objects page purpose ====="
find src/app/dev -type f | head; grep -n "notFound\|redirect\|isPrivateHost\|demo" src/app/dev/objects/page.tsx 2>/dev/null | head -8
echo "===== M3: any .pem/.key content anywhere incl. ignored dirs (data/) ====="
find . -path ./node_modules -prune -o -type f \( -name '*.pem' -o -name '*.key' \) -print 2>/dev/null | head
ls data 2>/dev/null || echo "(no data/ dir)"
echo "===== M4: vercel.json ====="
cat vercel.json
