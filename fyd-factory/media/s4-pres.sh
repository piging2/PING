#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== presentation-spec.ts (head 100) ====="
sed -n '1,100p' src/fyd/ui/object-layer/presentation-spec.ts
echo "===== derivatives.ts head ====="
sed -n '1,80p' src/fyd/media/derivatives.ts
