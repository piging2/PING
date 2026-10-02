#!/bin/bash
cd /home/nolan/projects/ping || exit 1
F=/home/nolan/workspace/fyd-factory/qa/design-conv
echo "=== canAsk definition ==="; grep -n "canAsk" src/fyd/components/ask-fyd-widget.tsx | head -5
echo; echo "=== data-fyd-contact count per page ==="
for s in coppersmith-plumbing happy-place; do echo -n "$s: "; grep -o 'data-fyd-contact="[^"]*"' $F/$s.html | sort | uniq -c; done
echo; echo "=== Contact section inner (coppersmith) ==="
python3 - <<'EOF'
import re
html = open('/home/nolan/workspace/fyd-factory/qa/design-conv/coppersmith-plumbing.html').read()
# find Contact section: the fyd-section containing h2 'Contact'
for m in re.finditer(r'<section[^>]*class="fyd-section[^"]*"[^>]*>', html):
    start = m.start()
    # get heading
    chunk = html[start:start+4000]
    h = re.search(r'<h2[^>]*>(.*?)</h2>', chunk, re.S)
    if h and 'Contact' in re.sub(r'<[^>]+>','',h.group(1)):
        txt = re.sub(r'<[^>]+>', ' ', chunk)
        txt = re.sub(r'\s+', ' ', txt)
        print("CONTACT SECTION TEXT:", txt[:700])
        break
EOF
echo; echo "=== Links(Find us) section inner (coppersmith) ==="
python3 - <<'EOF'
import re
html = open('/home/nolan/workspace/fyd-factory/qa/design-conv/coppersmith-plumbing.html').read()
idx = html.find('data-fyd-section="home:Links:5"')
chunk = html[idx:idx+3000]
txt = re.sub(r'<[^>]+>', ' ', chunk)
txt = re.sub(r'\s+', ' ', txt)
print("LINKS SECTION TEXT:", txt[:600])
links = re.findall(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', chunk, re.S)
for href, t in links[:8]:
    print(" link:", re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',t))[:40], "->", href[:70])
EOF
