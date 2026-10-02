#!/bin/bash
cd /home/nolan/projects/ping
echo "##### generator.ts section builder"
sed -n '1,120p' src/fyd/proceduralize/generator.ts
