cd /home/nolan/projects/ping
sed -n '1,100p' src/fyd/proceduralize/__fixtures__/fixtures-structured.ts
echo "===== builder fixtures head ====="
sed -n '1,80p' src/fyd/builder/__tests__/fixtures.ts
