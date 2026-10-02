#!/bin/bash
cd /home/nolan/projects/ping
sed -n '1,100p' src/fyd/capabilities/runtime.ts
echo "@@@@@ ask widget @@@@@"
wc -l src/fyd/components/ask-fyd-widget.tsx
grep -n "href\|src=\|<form\|action=\|dangerously\|__html" src/fyd/components/ask-fyd-widget.tsx | head -15
echo "@@@@@ jest config example @@@@@"
cat src/fyd/sitespec/jest.config.cjs
