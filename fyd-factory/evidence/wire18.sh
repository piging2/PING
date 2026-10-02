#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== coppersmith imports 14-24 ==="
awk 'NR>=14 && NR<=24 {printf "%d: %s\n", NR, $0}' src/app/sites/coppersmith-plumbing/page.tsx
echo "=== coppersmith hook area 68-76 ==="
awk 'NR>=68 && NR<=76 {printf "%d: %s\n", NR, $0}' src/app/sites/coppersmith-plumbing/page.tsx
echo "=== happy-place imports 14-23 ==="
awk 'NR>=14 && NR<=23 {printf "%d: %s\n", NR, $0}' src/app/sites/happy-place/page.tsx
echo "=== happy-place hook area 72-79 ==="
awk 'NR>=72 && NR<=79 {printf "%d: %s\n", NR, $0}' src/app/sites/happy-place/page.tsx
