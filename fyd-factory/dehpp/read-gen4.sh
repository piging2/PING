#!/bin/bash
cd /home/nolan/projects/ping
echo "##### generator home page tail + other pages"
sed -n '192,300p' src/fyd/proceduralize/generator.ts
