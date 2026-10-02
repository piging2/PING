#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "########## rich graph head ##########"
head -c 4000 src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts
echo ""
echo "########## rich graph schema mentions ##########"
grep -o "ping\.social\.[a-z_@0-9.]*" src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts | sort | uniq -c
echo "########## schemas.ts registered schemas ##########"
grep -o "ping\.social\.[a-z_@0-9.]*" src/fyd/sitespec/schemas.ts | sort -u | head -40
echo "########## predicates in rich graph ##########"
grep -o "predicate[^,}]*" src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts | sort | uniq -c | head
echo "########## types.ts ObjectGraph shape ##########"
grep -n "interface ObjectGraph\|interface FydObject\|interface FydRelationship\|interface Provenance" src/fyd/sitespec/types.ts | head
