#!/bin/bash
# F5-CEILING probe Y: exact line numbers for patch hunks
set -e
cd /home/nolan/projects/ping
grep -n 'const people = related("person");' src/fyd/proceduralize/generator.ts
grep -n 'add("People", roleQuery(ownerId, "person"));' src/fyd/proceduralize/generator.ts
grep -n 'SITE_PLANNER_VERSION = ' src/fyd/builder/planner.ts
grep -n 'function roleQuery(' src/fyd/proceduralize/generator.ts
