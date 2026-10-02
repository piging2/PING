#!/bin/bash
cd /home/nolan/projects/ping
echo "##### components emitted by generator"
grep -n 'add("' src/fyd/proceduralize/generator.ts | head -40
echo "##### CTA copy"
grep -n -B3 -A8 '"CTA"' src/fyd/proceduralize/generator.ts | head -60
