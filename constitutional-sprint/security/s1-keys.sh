cd /home/nolan/projects/ping-constitutional
echo "===== 1a: key/cert/ssh files (worktree, tracked + untracked) ====="
find . -path ./node_modules -prune -o -type f \( -name '*.pem' -o -name '*.key' -o -name 'id_rsa*' -o -name 'id_ed25519*' -o -name '*.p12' -o -name '*.pfx' -o -name '.netrc' \) -print
echo "--- .ssh dirs ---"
find . -path ./node_modules -prune -o -type d -name '.ssh' -print
echo "===== 1b: git-tracked sensitive-looking paths ====="
git ls-files | grep -iE '(\.env$|\.env\.|\.pem$|\.key$|id_rsa|id_ed25519|netrc|credentials|secrets|vault)' || echo "(none)"
echo "===== 1c: .env files on disk + ignore status ====="
ls -la .env* 2>/dev/null
echo "--- git check-ignore ---"
git check-ignore -v .env .env.local .env.production .env.development 2>/dev/null || echo "(none ignored via these names)"
cat .gitignore
echo "===== 1d: .env.example content (placeholder check) ====="
cat .env.example
echo "===== 1e: credential-ish variable NAMES (values redacted) ====="
rg -n --no-heading -o -i "[A-Za-z0-9_.]*(api[_-]?key|secret|token|password|passwd|bearer|private[_-]?key|client[_-]?secret|access[_-]?key)[A-Za-z0-9_.]*[ \t]*[:=]" --glob '!node_modules' --glob '!package-lock.json' || echo "(none)"
echo "===== 1f: assignments with non-trivial values, VALUES REDACTED ====="
rg -n --no-heading --replace '$1=<REDACTED>' -i "([A-Za-z0-9_.]*(?:api[_-]?key|secret|token|password|passwd|bearer|private[_-]?key|client[_-]?secret|access[_-]?key)[A-Za-z0-9_.]*[ \t]*[:=][ \t]*)(['\"]?)([A-Za-z0-9_.\-+/=]{8,})" --glob '!node_modules' --glob '!package-lock.json' || echo "(none)"
echo "===== 1g: obvious placeholder markers ====="
rg -n --no-heading -i "(changeme|your[-_ ]?(api[-_ ]?key|secret|token|password)|placeholder|example[-_ ]?(key|secret|token)|xxx+|<[^>]*>|dummy|test[-_ ]?key)" .env.example || echo "(none in .env.example)"
