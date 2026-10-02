#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
ls -la node_modules | head -3
ls node_modules/.bin/jest 2>&1 | head -2
ls node_modules/babel-jest 2>&1 | head -2
ls node_modules/@babel/preset-typescript 2>&1 | head -2
cat babel.config.js 2>/dev/null; cat .babelrc 2>/dev/null; echo "no babel config files"
find . -maxdepth 2 -name "jest.config*" -not -path "./node_modules/*" 2>/dev/null
