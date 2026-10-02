#!/bin/bash
cd /home/nolan/projects/ping
sed -n "$(grep -n '^function SectionShell' src/fyd/components/renderer.tsx | cut -d: -f1),+45p" src/fyd/components/renderer.tsx
