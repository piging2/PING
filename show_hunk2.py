import io
repo = "/home/nolan/ping-wave-gw2-088"
lines = io.open(repo + "/088-fixed/patch-03-mc-routes-tenant-gate.diff", encoding="utf-8").read().split("\n")
i = next(i for i, l in enumerate(lines) if l.startswith("@@ -34,"))
for l in lines[i:i+34]:
    if l.startswith("@@ ") and not l.startswith("@@ -34,"):
        break
    print(repr(l[:70]))
