#!/bin/bash
cd /home/nolan/projects/ping
echo "########## presentation.copy in proceduralize generator ##########"
grep -n "presentation" src/fyd/proceduralize/generator.ts | head -30
echo
echo "########## copy text sources ##########"
grep -n "copy:\|heading:" src/fyd/proceduralize/generator.ts | head -20
