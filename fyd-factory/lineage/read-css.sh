#!/bin/bash
cat /home/nolan/fyd-proof-run/css-loader.mjs
echo "====="
cat /home/nolan/fyd-proof-run/register-css.mjs
echo "====="
grep -n "css" /home/nolan/fyd-proof-run/regen.ts | head -10
