#!/bin/bash
cd /home/nolan/projects/ping
for cfg in proceduralize components sitespec builder archetypes customize media; do
  echo "########## SUITE: $cfg ##########"
  npx jest --config src/fyd/$cfg/jest.config.cjs 2>&1 | tail -6
done
