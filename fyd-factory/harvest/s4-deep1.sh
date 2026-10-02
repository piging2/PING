#!/bin/bash
# s4: deep read of commodity candidates (read-only, PING-side only)
cd /home/nolan/projects/ping || exit 1
echo "########## src/lib/ping/ ##########"; ls -la src/lib/ping/
echo "########## src/lib/api/ ##########"; ls src/lib/api/ 2>/dev/null
echo "########## src/lib/infrastructure/ ##########"; ls src/lib/infrastructure/ 2>/dev/null
echo "########## components dir ##########"; ls src/components/
echo "########## HEAD src/lib/ping/ping-object-reader.ts ##########"; head -80 src/lib/ping/ping-object-reader.ts
