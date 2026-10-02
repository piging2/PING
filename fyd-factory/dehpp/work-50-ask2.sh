#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -rn "AskFydWidget" src/fyd --include=*.tsx --include=*.ts | grep -v test | grep -v "renderer.tsx" | head -5
grep -n "AskFydWidget" src/fyd/components/renderer.tsx | head -3
