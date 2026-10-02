#!/bin/bash
cd /home/nolan/projects/ping
sed -n '1035,1090p' src/fyd/proceduralize/proceduralizer.ts
echo "=== unsupported emission context (structured-data.ts 460-540) ==="
sed -n '460,540p' src/fyd/proceduralize/structured-data.ts
