#!/bin/bash
cd /home/nolan/projects/ping || exit 1
sed -n '755,800p' src/fyd/components/renderer.tsx
