import re, sys

path = sys.argv[1]
h = open(path, encoding="utf-8", errors="replace").read()
ids = re.findall(r'data-fyd-section="([^"]+)"', h)
print("rendered section order:")
for i in ids:
    print("  " + i)
