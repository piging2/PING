#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "export function galleryMediaFor\|export function listObjectMedia\|export function heroMediaFor" -A 6 src/fyd/media/select.ts | head -30
grep -n "PresentationIntentBlock" src/fyd/customize/types.ts | head -2
