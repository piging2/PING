import re, urllib.request

html = urllib.request.urlopen('http://127.0.0.1:3100/sites/coppersmith-plumbing', timeout=30).read().decode('utf-8')
print('page bytes:', len(html))

# Find the Plumbing card: title link then its WhyThis
i = html.find('Plumbing</a>')
print('Plumbing title-link found:', i != -1)
seg = html[i:i+4000]
print('Why this? in card segment:', 'Why this?' in seg)
for step in ['Source:', 'Observed evidence:', 'Extraction method:', 'Status:']:
    print(step, '->', step in seg)
print('source url:', 'https://www.coppersmithplumbing.com/' in seg)
print('ref:', 'website-ingestion:https://www.coppersmithplumbing.com/' in seg)
print('derivedAt:', '2026-09-21T13:50:00Z' in seg)
print('method:', 'Website ingestion: structured extraction from the source site' in seg)
print('status:', 'Website statement: the source claims this' in seg)
print('Unverified label:', 'Unverified' in seg)
# print the claim + steps block compactly
m = re.search(r'<details class="text-xs text-zinc-600 mt-2">.*?</details>', seg, re.S)
if m:
    txt = re.sub(r'<[^>]+>', '|', m.group(0))
    txt = re.sub(r'\|+',' | ', txt)
    print('BLOCK:', txt[:700])
