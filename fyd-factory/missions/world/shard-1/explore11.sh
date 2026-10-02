cd /home/nolan/projects/ping
node -e "const p=require('./node_modules/tsx/package.json'); console.log(JSON.stringify(p.exports, null, 1))" | head -30
grep -n '"module"' tsconfig.json
echo "===== css imports reachable from renderer ====="
grep -rln "from ['\"][^'\"]*\.css['\"]\|import ['\"][^'\"]*\.css['\"]" src/fyd/components src/fyd/ui src/fyd/object 2>/dev/null | head -20
