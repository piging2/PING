#!/bin/bash
cd /home/nolan/projects/ping
npx jest --transform '{"^.+\\.tsx?$":["ts-jest",{"isolatedModules":true,"tsconfig":{"jsx":"react-jsx","target":"es2020","module":"commonjs","esModuleInterop":true,"allowSyntheticDefaultImports":true,"skipLibCheck":true}}]}' --moduleNameMapper '{"^@/(.*)$":"<rootDir>/src/$1","\\.css$":"<rootDir>/src/fyd/claim/__tests__/css-stub.js"}' src/fyd/claim/__tests__/attack-render-path.test.ts --verbose 2>&1 | grep -E "✓|✕|Tests:" | head -20
