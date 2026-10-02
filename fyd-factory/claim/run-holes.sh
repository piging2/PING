#!/bin/bash
cd /home/nolan/projects/ping
npx jest --transform '{"^.+\\.tsx?$":["ts-jest",{"isolatedModules":true}]}' --moduleNameMapper '{"^@/(.*)$":"<rootDir>/src/$1"}' src/fyd/claim/__tests__/attack-verifier-holes.test.ts 2>&1 | tail -45
