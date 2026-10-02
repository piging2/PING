cd /home/nolan/projects/ping || exit 1
git rev-parse --abbrev-ref HEAD
git status --porcelain | head -5
echo '=== registry.ts ==='
wc -l src/fyd/components/registry.ts
echo '=== components dir ==='
ls src/fyd/components/ | head -60
echo '=== fixtures/sites ==='
ls src/fyd/ | head -30
