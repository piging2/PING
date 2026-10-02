#!/bin/bash
cd /home/nolan/projects/ping
grep -n "contactMethod(" src/fyd/components/renderer.tsx | head
echo "---correctionFor---"
grep -n "correctionFor\|ownerFieldCorrections" src/fyd/components/renderer.tsx | head -20
