#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "function homePage\|function aboutPage\|function servicesPage\|function explorePage\|function section(" src/fyd/proceduralize/generator.ts
sed -n "$(grep -n 'function section(' src/fyd/proceduralize/generator.ts | cut -d: -f1),+12p" src/fyd/proceduralize/generator.ts
