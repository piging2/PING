#!/bin/bash
set -u
cd /home/nolan/projects/ping
npx jest \
  --config '{"testEnvironment":"node","rootDir":"/home/nolan/.fyd-td001","testMatch":["<rootDir>/repro.test.ts"],"moduleNameMapper":{"^@/(.*)$":"/home/nolan/projects/ping/src/$1"},"transform":{"^.+\\.tsx?$":["/home/nolan/projects/ping/node_modules/ts-jest",{"tsconfig":{"target":"ES2017","module":"commonjs","esModuleInterop":true,"allowJs":true},"diagnostics":false}]}}' \
  2>&1 | tail -70
