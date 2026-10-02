#!/bin/bash
cd /home/nolan/projects/ping
echo "===== buildCapabilities href construction ====="; grep -n "href" src/fyd/object/view.ts | head -20
echo; echo "===== lineage ask link graph source ====="; grep -n "getSiteBundle\|getPingObjectGraph\|getFydTenantGraph\|HAPPY_PLACE_GRAPH\|COPPERSMITH_GRAPH\|bundle" src/fyd/lineage/tracer.ts | head -20
