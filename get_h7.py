import io
lines = io.open("/home/nolan/ping-wave-gw2-088/088-fixed/patch-03-mc-routes-tenant-gate.diff", encoding="utf-8").read().split("\n")
i = next(i for i, l in enumerate(lines) if l.startswith("@@ -346,"))
for l in lines[i:i+95]:
    if l.startswith("@@ ") and not l.startswith("@@ -346,"):
        break
    if l.startswith("+") or l.startswith("-"):
        print(repr(l))
