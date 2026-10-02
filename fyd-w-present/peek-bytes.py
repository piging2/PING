import sys

path = sys.argv[1]
h = open(path, encoding="utf-8", errors="replace").read()
needle = "home:Services:2"
i = h.find(needle)
print("first occurrence at", i)
print(repr(h[max(0, i - 400): i + 120]))
