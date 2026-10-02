cd /home/nolan/projects/ping || exit 1
echo '===== cop page.tsx (first 80 lines) ====='
head -80 src/app/sites/coppersmith-plumbing/page.tsx
echo '===== sitespec dir ====='
ls src/fyd/sitespec/
echo '===== proceduralize fixtures ====='
ls -R src/fyd/proceduralize/__fixtures__ | head -30
