cd /home/nolan/projects/ping-constitutional
echo "===== 7: logging that may leak secrets/PII ====="
grep -rEn --include='*.ts' --include='*.tsx' "console\.(log|debug|info|warn|error)" src 2>/dev/null | grep -iE "token|secret|password|apiKey|api[_-]?key|authorization|cookie|req\.body|request\.body|headers|credential|bearer|refresh" | head -40
echo "===== 7b: request-body/header logging (any) ====="
grep -rEn --include='*.ts' --include='*.tsx' "console\.(log|debug)" src/app/api 2>/dev/null | grep -iE "req\.|request|body|header" | head -30
echo "===== 4: API routes inventory (raw-object exposure review targets) ====="
find src/app/api -name 'route.ts' | sort
