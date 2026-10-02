#!/bin/bash
cd /home/nolan/projects/ping
echo "########## derived/owner_authored/generated uses in renderer ##########"
grep -n '"derived"\|"owner_authored"\|"generated"' src/fyd/components/renderer.tsx | head -20
echo
echo "########## affordanceEvidenceLine ##########"
grep -n "affordanceEvidenceLine" -A 20 src/fyd/components/renderer.tsx | sed -n '1,40p'
