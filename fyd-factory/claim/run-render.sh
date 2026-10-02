#!/bin/bash
cd /home/nolan/projects/ping
npx jest --transform '{"^.+\\.tsx?$":["ts-jest",{"isolatedModules":true}]}' --moduleNameMapper '{"^@/(.*)$":"<rootDir>/src/$1","\\.css$":"<rootDir>/src/fyd/claim/__tests__/css-stub.js"}' src/fyd/claim/__tests__/attack-render-path.test.ts 2>&1 | tail -60
