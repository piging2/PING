cd /home/nolan/projects/ping || exit 1
echo '=== registry.ts full ==='
cat src/fyd/components/registry.ts
echo '=== sites dir ==='
ls src/fyd/sites/ 2>/dev/null || ls src/app/sites 2>/dev/null || find src -maxdepth 3 -type d -iname "*site*" 2>/dev/null | head
