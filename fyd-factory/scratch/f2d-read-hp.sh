#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "########## happy-place-graph.ts (schema names used) ##########"
grep -o '"schema": "[^"]*"' src/fyd/proceduralize/__fixtures__/happy-place-graph.ts | sort | uniq -c
echo "########## happy-place-rich-graph.ts (schema names used) ##########"
grep -o '"schema": "[^"]*"' src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts | sort | uniq -c
echo "########## media fields in rich graph ##########"
grep -o '"[a-z_]*media[a-z_]*"\|"image[^"]*"\|"photo[^"]*"' src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts | sort | uniq -c | head -20
echo "########## predicates used ##########"
grep -o '"predicate": "[^"]*"' src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts | sort | uniq -c
echo "########## sample media object ##########"
python3 - <<'EOF'
import re
src = open('src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts').read()
# print one object whose schema contains media
m = re.search(r'\{[^{}]*"schema": "[^"]*media[^"]*"[^{}]*\}', src, re.S)
print(m.group(0)[:1500] if m else "no media-schema object found")
EOF
echo "########## sitespec types: schema registry ##########"
grep -rn "ping.social\." src/fyd/sitespec/types*.ts 2>/dev/null | grep -o '"ping\.social\.[^"]*"' | sort -u | head -30
ls src/fyd/sitespec/ 2>/dev/null | head -20
