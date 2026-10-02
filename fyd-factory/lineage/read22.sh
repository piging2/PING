#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== ServicesSection ====="
grep -n "function ServicesSection" src/fyd/components/renderer.tsx
