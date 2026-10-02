set -e
cd /home/nolan/projects/ping
rm -rf /home/nolan/ping-clean
mkdir -p /home/nolan/ping-clean
git archive e48ef710 | tar -x -C /home/nolan/ping-clean
ln -s /home/nolan/projects/ping/node_modules /home/nolan/ping-clean/node_modules
cd /home/nolan/ping-clean
git rev-parse HEAD 2>/dev/null || echo "no git (archive, as intended)"
grep -n "from \"../sitespec/schemas\"" src/fyd/components/registry.ts | head -2
ls node_modules/.bin/tsx
