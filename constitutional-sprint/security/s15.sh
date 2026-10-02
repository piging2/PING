cd /home/nolan/projects/ping-constitutional
grep -n "host" src/app/api/fyd/customize/route.ts | head -12
echo "====="
grep -n "host" "src/app/api/fyd/objects/[objectId]/overrides/route.ts" | head -8
