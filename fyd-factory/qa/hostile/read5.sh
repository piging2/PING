#!/bin/bash
cd /home/nolan/projects/ping
wc -l src/fyd/components/renderer.tsx src/fyd/components/contact-link.tsx src/fyd/components/registry.ts
echo "======== registry.ts ========"
cat src/fyd/components/registry.ts
echo "======== contact-link.tsx ========"
cat src/fyd/components/contact-link.tsx
