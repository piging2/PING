#!/bin/bash
cd /home/nolan/projects/ping
grep -n "function safeWebsite\|function boundField" src/fyd/components/renderer.tsx
sed -n '/function safeWebsite/,/^}/p' src/fyd/components/renderer.tsx | head -30
echo "@@@@@ website field in fixture @@@@@"
grep -n "website" src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts | head -10
echo "@@@@@ boundField def @@@@@"
sed -n '/function boundField/,/^}/p' src/fyd/components/renderer.tsx | head -25
