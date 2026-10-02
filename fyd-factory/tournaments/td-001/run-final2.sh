#!/bin/bash
set -u
cd /home/nolan/projects/ping
npx jest \
  --config '{"testEnvironment":"node","rootDir":"/home/nolan/.fyd-td001","testMatch":["<rootDir>/final-strict.test.ts"],"moduleNameMapper":{"^@/(.*)$":"/home/nolan/projects/ping/src/$1"},"transform":{"^.+\\.tsx?$":["/home/nolan/projects/ping/node_modules/ts-jest",{"tsconfig":{"target":"ES2017","module":"commonjs","moduleResolution":"node","jsx":"react-jsx","esModuleInterop":true,"strict":true,"skipLibCheck":true,"baseUrl":"/home/nolan/projects/ping","paths":{"@/*":["./src/*"]}}}]}}' \
  2>&1 | tail -30
