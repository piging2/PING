#!/bin/bash
set -u
cd /home/nolan/projects/ping
npx jest --config '{"testEnvironment":"node","rootDir":"/home/nolan/projects/ping","testMatch":["<rootDir>/src/fyd/boundary/__tests__/projection-seam-attack.test.ts"],"moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1","\\.css$":"<rootDir>/src/fyd/components/__tests__/css-stub.js"},"transform":{"^.+\\.tsx?$":["ts-jest",{"tsconfig":{"target":"ES2017","module":"commonjs","moduleResolution":"node","jsx":"react-jsx","esModuleInterop":true,"strict":true,"skipLibCheck":true}}]}}' -t "no markup payload crosses" 2>&1 | grep -B3 -A25 '●.*no markup payload' | head -70
