#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "ctx.galleryMedia\|ctx.objectMedia\|ctx.heroMedia" src/fyd/components/renderer.tsx | head -12
