#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "Happy Place\|Maya Alvarez\|carpentr" src/fyd/components/renderer.tsx | head -10
