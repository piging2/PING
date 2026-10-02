#!/bin/bash
cd /home/nolan/projects/ping
echo "=== generator: how bindings are emitted ==="
grep -n "PresentationBinding\|classification\|bindings" src/fyd/proceduralize/generator.ts | head -40
echo ""
echo "=== render-model.ts: bindings from spec ==="
grep -n "PresentationBinding\|classification\|bindings" src/fyd/sitespec/render-model.ts | head -40
