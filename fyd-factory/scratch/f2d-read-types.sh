#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "########## PingObject / provenance kinds ##########"
grep -n "kind" src/lib/ping/types.ts | head -20
echo "########## predicate vocab ##########"
grep -rn "predicate" src/fyd/sitespec/schemas.ts | head -10
grep -rhoP '"(offers|employs|member_of|located_at|has_website|works_for|links_to|provides|publishes|authored_by|has_part|created)"' src/fyd --include="*.ts" 2>/dev/null | sort | uniq -c | sort -rn | head -20
echo "########## validator rules ##########"
sed -n '1,80p' src/fyd/sitespec/validator.ts
