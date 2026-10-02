import re, sys
data = open(sys.argv[1], encoding="utf-8", errors="replace").read()
m = re.search(r"COPY public\.events .*? FROM stdin;\n(.*?)\n\\\.", data, re.S)
rows = [l for l in m.group(1).splitlines() if l.strip()]
print("event rows:", len(rows))
for r in rows:
    cols = r.split("\t")
    print(cols[0][:8], cols[2], cols[3][:60] if len(cols) > 3 else "")
