#!/bin/bash
set -u
cd /home/hatch/workspace/fyd-factory/tournaments/td-001
npx --prefix /home/nolan/projects/ping jest --config '{"testEnvironment":"node","rootDir":"/home/hatch/workspace/fyd-factory/tournaments/td-001","testMatch":["<rootDir>/repro.test.ts"],"moduleNameMapper":{"^@/(.*)$":"/home/nolan/projects/ping/src/$1"},"transform":{"^.+\\.tsx?$":["/home/nolan/projects/ping/node_modules/ts-jest/dist/index.js",{"tsconfig":{"target":"ES2017","module":"commonjs","esModuleInterop":true,"allowJs":true,"strict":false},"diagnostics":false}]}}' 2>&1 | tail -60
