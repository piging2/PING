#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== coppersmith page.tsx ====="; cat src/app/sites/coppersmith-plumbing/page.tsx
echo; echo "===== happy-place page.tsx ====="; cat src/app/sites/happy-place/page.tsx
echo; echo "===== archetypes/profiles.ts ====="; cat src/fyd/archetypes/profiles.ts
echo; echo "===== _shared ====="; ls -la src/app/sites/_shared/
