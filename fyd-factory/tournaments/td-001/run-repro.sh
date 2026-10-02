#!/bin/bash
set -u
cd /home/nolan/projects/ping
npx jest --config '{"testEnvironment":"node","rootDir":"/home/nolan/projects/ping","testMatch":["/home/hatch/workspace/fyd-factory/tournaments/td-001/repro.test.ts"],"moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1"},"transform":{"^.+\\.tsx?$":["ts-jest",{"tsconfig":{"target":"ES2017","module":"commonjs","esModuleInterop":true,"allowJs":true}}]}}' 2>&1 | tail -60
