#!/bin/bash
cd /home/nolan/projects/ping
echo "=== Contact section render location ==="
grep -n "function ContactSection\|function contactMethod\|function correctionFor" src/fyd/components/renderer.tsx
echo "########## ContactSection ##########"
awk '/^function ContactSection/,/^}/' src/fyd/components/renderer.tsx | head -120
echo "=== hours mentions in renderer ==="
grep -n -i "hours\|openingHours\|openHours" src/fyd/components/renderer.tsx | head -20
