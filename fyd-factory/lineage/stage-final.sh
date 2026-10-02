#!/bin/bash
# Write the final tracer files into src/fyd/lineage/ on the Pig via heredocs.
cd /home/nolan/projects/ping || exit 1
mkdir -p src/fyd/lineage
echo "staging tracer files..."
