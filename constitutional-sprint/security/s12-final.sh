cd /home/nolan/projects/ping-constitutional
echo "===== K1: sharp expectedAuth source is env? ====="
grep -n "expectedAuth" src/app/api/diagnostics/sharp/route.ts | grep -c "process.env"
grep -n "expectedAuth =" src/app/api/diagnostics/sharp/route.ts | cut -c1-60
echo "===== K2: practice identities POST (creation open?) ====="
sed -n '1,60p' src/app/api/practice/identities/route.ts
echo "===== K3: logEvent body (write path) ====="
sed -n '230,300p' src/lib/events.ts
echo "===== K4: git history metadata: secret-ish files ever committed ====="
git log --all --oneline --diff-filter=A -- '*.pem' '*.key' '.env' '.env.local' 'id_rsa*' 'credentials*' 2>/dev/null | head -10
echo "--- any commit touching .env.example with real values? (names only) ---"
git log --oneline -3 -- .env.example
echo "===== K5: principal.ts store identity ====="
grep -n "store\b\|Store\|import" src/fyd/identity/principal.ts | head -25
echo "===== K6: scratch/research/portal-proof secret-ish strings (names only) ====="
grep -rEn --include='*.ts' --include='*.js' --include='*.json' --include='*.md' -o -i "[A-Za-z0-9_.]*(ghp_|gho_|sk-live|sk-test|xox[bap]|AKIA|-----BEGIN)[A-Za-z0-9_.\-]*" scratch research portal-proof scripts 2>/dev/null | cut -c1-100 | head -20
echo "(K6 done)"
