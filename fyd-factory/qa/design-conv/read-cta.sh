#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== CTASection 1513-1545 ==="; sed -n '1513,1545p' src/fyd/components/renderer.tsx
echo; echo "=== 9th section in coppersmith HTML ==="; python3 - <<'EOF'
import re
html = open('/home/nolan/workspace/fyd-factory/qa/design-conv/coppersmith-plumbing.html').read()
# find the section after id="ask"
idx = html.find('id="ask"')
seg = html[idx:idx+6000]
m = re.search(r'</section>(.*?)<section', seg, re.S)
print(seg[:200])
print('...AFTER ASK SECTION CLOSE...')
rest = html[idx:idx+12000]
# print section tags after ask
for mm in re.finditer(r'<section[^>]*>', rest):
    print(mm.group(0)[:120])
EOF
