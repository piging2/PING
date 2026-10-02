#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
python3 - <<'PYEOF'
p = "src/fyd/compose/jest.config.cjs"
src = open(p).read()
old = '''  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },'''
new = '''  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\\\.css$": "<rootDir>/src/fyd/components/__tests__/css-stub.js",
  },'''
assert src.count(old) == 1
open(p, "w").write(src.replace(old, new))
print("css stub added")
PYEOF
node_modules/.bin/jest --config src/fyd/compose/jest.config.cjs 2>&1 | tail -10