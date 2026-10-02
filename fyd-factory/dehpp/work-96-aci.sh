#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -rn "export function asCompositionIntent" src/ | head -3
grep -n "asCompositionIntent" -A 40 src/app/sites/_shared/compose-site.ts | head -55