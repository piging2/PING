cd /home/nolan/projects/ping
echo "===== generator.ts imports ====="
sed -n '1,42p' src/fyd/proceduralize/generator.ts | grep -n "import\|from"
echo ""
echo "===== patch.ts imports ====="
sed -n '1,20p' src/fyd/proceduralize/patch.ts | grep -n "import\|from"
echo ""
echo "===== node_modules: jest + ts-jest present? ====="
ls node_modules/.bin/jest 2>/dev/null && node_modules/.bin/jest --version
ls node_modules/ts-jest 2>/dev/null | head -3
