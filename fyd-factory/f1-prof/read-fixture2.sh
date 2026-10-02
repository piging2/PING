#!/bin/bash
cd /home/nolan/projects/ping
echo "##### fixture tail"
sed -n '120,400p' src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts
