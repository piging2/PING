import io
lines = io.open("/home/nolan/ping-wave-gw2-088/088-fixed/patch-03-mc-routes-tenant-gate.diff", encoding="utf-8").read().split("\n")
for hdr in ("@@ -588,", "@@ -471,", "@@ -565,"):
    try:
        i = next(i for i, l in enumerate(lines) if l.startswith(hdr))
    except StopIteration:
        continue
    print("=" * 10, lines[i][:50])
    for l in lines[i+1:i+25]:
        if l.startswith("@@ "):
            break
        if l.startswith("+") or l.startswith("-"):
            print(repr(l[:95]))
