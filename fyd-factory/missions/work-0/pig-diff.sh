#!/bin/bash
echo "=== diff: src/fyd/object/view.ts (main tree vs e48ef710) ==="
git -C /home/nolan/projects/ping diff e48ef710 -- src/fyd/object/view.ts | head -200
echo
echo "=== diff: src/fyd/components/renderer.tsx ==="
git -C /home/nolan/projects/ping diff e48ef710 -- src/fyd/components/renderer.tsx | head -120
