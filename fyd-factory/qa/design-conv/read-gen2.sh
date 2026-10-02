#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== archetype assignment in generator ==="; grep -n "archetype\|ARCHETYPE\|profileFor\|TRADES\|KNOWLEDGE" src/fyd/proceduralize/generator.ts | head -20
echo; echo "=== hero heading level ==="; sed -n '960,1010p' src/fyd/components/renderer.tsx | grep -n "h1\|h2\|Hero\|business" | head
echo; echo "=== /o/ route exists? ==="; find src/app -type d -name "o" | head; ls src/app/o 2>/dev/null
echo; echo "=== Contact section heading default ==="; grep -n '"Contact"\|"Find us"\|"Where we work"\|"Start the conversation"' src/fyd/components/renderer.tsx | head
