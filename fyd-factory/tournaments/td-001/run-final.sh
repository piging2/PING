#!/bin/bash
set -u
cd /home/nolan/.fyd-td001
cp /mnt/c/Users/nolan/transfer/td001-final.test.ts final-raw.test.ts
# Adapt repo-relative imports to absolute for the out-of-tree run; the
# patch keeps repo-relative imports.
sed -e 's|\.\./\.\./proceduralize/__fixtures__|/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__|g' \
    -e 's|\.\./\.\./proceduralize/generator|/home/nolan/projects/ping/src/fyd/proceduralize/generator|g' \
    -e 's|\.\./schemas|/home/nolan/projects/ping/src/fyd/sitespec/schemas|g' \
    -e 's|\.\./types|/home/nolan/projects/ping/src/fyd/sitespec/types|g' \
    -e 's|\.\./validator|/home/nolan/projects/ping/src/fyd/sitespec/validator|g' \
    final-raw.test.ts > final-strict.test.ts
cd /home/nolan/projects/ping
npx jest \
  --config '{"testEnvironment":"node","rootDir":"/home/nolan/.fyd-td001","testMatch":["<rootDir>/final-strict.test.ts"],"moduleNameMapper":{"^@/(.*)$":"/home/nolan/projects/ping/src/$1"},"transform":{"^.+\\.tsx?$":["/home/nolan/projects/ping/node_modules/ts-jest",{"tsconfig":{"target":"ES2017","module":"commonjs","moduleResolution":"node","jsx":"react-jsx","esModuleInterop":true,"strict":true,"skipLibCheck":true}}]}}' \
  2>&1 | tail -30
