#!/bin/bash
cd /home/nolan/projects/ping
echo "##### fixture dir"
ls src/fyd/proceduralize/__fixtures__/ | head -30
echo "##### fixture head (120 lines)"
sed -n '1,120p' src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts
