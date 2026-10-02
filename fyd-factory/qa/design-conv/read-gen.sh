#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== section id generation ==="; grep -n "id:" src/fyd/proceduralize/generator.ts | head -20
echo "=== SectionShell usage: sectionId value ==="; grep -n "sectionId=" src/fyd/components/renderer.tsx | head -10
echo "=== sample data-fyd-section in HTML ==="; grep -o 'data-fyd-section="[^"]*"' /home/nolan/workspace/fyd-factory/qa/design-conv/coppersmith-plumbing.html | sort | uniq -c
