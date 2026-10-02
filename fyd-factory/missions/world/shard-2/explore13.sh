cd /home/nolan/projects/ping
git show HEAD:src/fyd/components/registry.ts | sed -n "14,22p"
echo === HEAD tree ===
git ls-tree HEAD src/fyd/components/ --name-only | head -30
echo === find schema-roles ===
git ls-files | grep schema-roles
ls src/fyd/sitespec/ | head -30
