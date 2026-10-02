cd /home/nolan/projects/ping
echo "===== dirty schemas.ts diff (stat + head) ====="
git diff HEAD --stat -- src/fyd/sitespec/schemas.ts src/fyd/components/registry.ts
git diff HEAD -- src/fyd/sitespec/schemas.ts | head -50
echo "===== untracked files in fyd/components? ====="
git status --short src/fyd/components/ | head -20
