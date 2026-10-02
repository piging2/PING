import io
lines = io.open("/home/nolan/ping-wave-gw2-088/088-fixed/patch-03-mc-routes-tenant-gate.diff", encoding="utf-8").read().split("\n")
i = next(i for i, l in enumerate(lines) if l.startswith("@@ -588,"))
for l in lines[i:i+24]:
    print(repr(l[:95]))
