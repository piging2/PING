#!/bin/bash
cd /home/nolan/projects/ping
echo "---BUILDER DIR---"
ls src/fyd/builder
echo "---SITESPEC DIR---"
ls src/fyd/sitespec
echo "---PROJECTION FIXTURES---"
ls src/fyd/object/__tests__/fixtures/projections/
echo "---SITES ROUTES---"
ls src/app/sites/
echo "---SCRIPTS---"
ls scripts | head -30
