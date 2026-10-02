#!/bin/bash
cd /home/nolan/projects/ping
npx jest --transform '{"^.+\\.tsx?$":["ts-jest",{"isolatedModules":true}]}' --moduleNameMapper '{"^@/(.*)$":"<rootDir>/src/$1","\\.css$":"<rootDir>/src/fyd/claim/__tests__/css-stub.js"}' --showConfig 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d['transform'],indent=1)); print(json.dumps(d['moduleNameMapper'],indent=1))"
echo "--- tsconfig jsx ---"
python3 -c "import json; d=json.load(open('tsconfig.json')); print(json.dumps(d.get('compilerOptions',{}),indent=1))" | grep -i "jsx\|paths" 
