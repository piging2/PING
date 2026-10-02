#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "function.*[Oo]rder\|function.*[Ll]ayout\|titleCase" src/app/sites/_shared/compose-site.ts src/fyd/proceduralize/generator.ts | head -12