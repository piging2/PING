#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "##### tenant site routes #####"
find src/app/sites -maxdepth 3 -type d 2>/dev/null | head -20
echo "##### global-ask-dock (50) #####"
sed -n '1,50p' src/fyd/ui/global-ask-dock.tsx
echo "##### renderer sections order (proceduralize generator) #####"
grep -n "section(" src/fyd/proceduralize/generator.ts | head -30
echo "##### home-circles (40) #####"
sed -n '1,40p' src/fyd/ui/home-circles.tsx
