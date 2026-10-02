cd /home/nolan/projects/ping-constitutional
echo "===== 2a: auth bypass / backdoor patterns (names only, no values) ====="
grep -rEn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' -i "isAdmin|skipAuth|bypassAuth|disableAuth|noAuth|authDisabled|__debug__|debugBypass|hardcoded.*admin|admin.*hardcod" src scripts portal-proof research scratch 2>/dev/null | head -60
echo "===== 2b: middleware exclusions / public routes ====="
ls src/middleware* 2>/dev/null; grep -rEn --include='*.ts' "matcher|publicPath|exclude|allowlist|whitelist" src/middleware* next.config.ts 2>/dev/null | head -30
echo "===== 2c: dev-mode / env-gated auth decisions ====="
grep -rEn --include='*.ts' --include='*.tsx' "NODE_ENV.*development.*(auth|bypass|skip)|DEMO|demo[-_ ]?mode|demo[-_ ]?owner|DEV_BYPASS" src 2>/dev/null | head -40
echo "===== 2d: demo-owner-mode (from git log: 'Gate owner mutation behind demo-owner-mode') ====="
grep -rEn --include='*.ts' --include='*.tsx' -i "demo-owner-mode|demoOwnerMode|demo_owner" src 2>/dev/null | head -30
