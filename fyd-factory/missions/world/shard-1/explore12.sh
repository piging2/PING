cd /home/nolan/projects/ping
node -e "const m = require('./node_modules/tsx/dist/cjs/index.cjs'); console.log(Object.keys(m));"
echo "--- cjs/api ---"
node -e "const m = require('./node_modules/tsx/dist/cjs/api/index.cjs'); console.log(Object.keys(m));" 2>&1 | head -5
