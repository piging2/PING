#!/bin/bash
cd /home/nolan/projects/ping
sed -n '600,660p' src/fyd/components/renderer.tsx
echo "@@@@@ 1440-1480 @@@@@"
sed -n '1440,1480p' src/fyd/components/renderer.tsx
