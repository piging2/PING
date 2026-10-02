#!/bin/bash
cd /home/nolan/projects/ping
echo "===== owner-store.ts ====="; cat src/fyd/object/owner-store.ts 2>/dev/null | head -120
echo; echo "===== bridge: OwnerAssertion -> OwnerFieldCorrection refs ====="; grep -rn "OwnerFieldCorrection" --include="*.ts" src/lib/ping/types.ts | head; grep -rln "ownerFieldCorrections" --include="*.ts" src/fyd/owner-mode/ | head
