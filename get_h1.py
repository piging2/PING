import io
lines = io.open("/home/nolan/ping-wave-gw2-088/088-fixed/patch-03-mc-routes-tenant-gate.diff", encoding="utf-8").read().split("\n")
i = next(i for i, l in enumerate(lines) if l.startswith("@@ -21,"))
for l in lines[i+1:i+28]:
    if l.startswith("+"):
        print(repr(l[1:]))
