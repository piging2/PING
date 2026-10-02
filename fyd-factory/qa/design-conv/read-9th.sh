#!/bin/bash
python3 - <<'EOF'
import re
html = open('/home/nolan/workspace/fyd-factory/qa/design-conv/coppersmith-plumbing.html').read()
idx = html.find('id="ask"')
# find the section after the ask section closes: locate '</section>' after ask's h2... simpler: find all section opens and their first 400 chars of text
sections = []
for m in re.finditer(r'<section[^>]*>', html):
    sections.append((m.start(), m.group(0)[:100]))
print("num sections:", len(sections))
# get text content of the 9th section (index 8)
opens = [m.start() for m in re.finditer(r'<section[^>]*>', html)]
# naive: take substring from 9th open to next </section> after accounting... just print first 1500 chars stripped of tags
start = opens[8]
chunk = html[start:start+1500]
text = re.sub(r'<[^>]+>', ' ', chunk)
text = re.sub(r'\s+', ' ', text)
print("9th section text:", text[:600])
EOF
