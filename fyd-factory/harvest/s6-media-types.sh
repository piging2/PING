#!/bin/bash
# s6: rest of ping types + media + metrics + reviews heads (read-only)
cd /home/nolan/projects/ping || exit 1
echo "########## types.ts tail ##########"; sed -n '120,340p' src/lib/ping/types.ts
echo; echo "########## media.ts head ##########"; head -70 src/lib/media.ts
echo; echo "########## media-kv-store.ts head ##########"; head -50 src/lib/media-kv-store.ts
echo; echo "########## metrics.ts ##########"; head -60 src/lib/metrics.ts
