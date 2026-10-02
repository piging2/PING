#!/bin/bash
# F5-CEILING probe N: generator section rules (People threshold, which components emitted)
set -e
cd /home/nolan/projects/ping
sed -n '100,260p' src/fyd/proceduralize/generator.ts
