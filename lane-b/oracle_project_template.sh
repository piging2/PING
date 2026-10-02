#!/bin/bash
# Lane B live projection: ship projector dist into the gateway container,
# evolve the projection-table predicate CHECK (reversible), rebuild twice,
# compare digests.
set -u
echo "__B64TGZ__" | base64 -d | tar -xz -C /tmp
echo "__B64RUNNER__" | base64 -d > /tmp/laneb_run_projector.js
ls /tmp/laneb-dist/
docker cp /tmp/laneb-dist ping-gateway:/tmp/laneb-dist
docker cp /tmp/laneb_run_projector.js ping-gateway:/tmp/laneb_run_projector.js
docker exec -e NODE_PATH=/app/node_modules ping-gateway node /tmp/laneb_run_projector.js
