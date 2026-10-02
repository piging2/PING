#!/bin/bash
cd /home/nolan/projects/ping
echo "===== generator: classification assignment ====="; grep -n "classification" src/fyd/proceduralize/generator.ts | head -40
echo; echo "===== apply-layer.ts ====="; cat src/fyd/customize/apply-layer.ts | head -150
