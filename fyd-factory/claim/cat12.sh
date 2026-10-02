#!/bin/bash
cd /home/nolan/projects/ping
echo "########## jest config ##########"
ls jest.config.* 2>/dev/null; cat jest.config.js 2>/dev/null || cat jest.config.cjs 2>/dev/null || cat jest.config.ts 2>/dev/null | head -60
echo
echo "########## render.test.ts head (render path usage) ##########"
sed -n '1,80p' src/fyd/components/__tests__/render.test.ts
