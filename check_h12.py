import io, re
repo = "/home/nolan/ping-wave-gw2-088"
lines = io.open(repo + "/088-fixed/patch-03-mc-routes-tenant-gate.diff", encoding="utf-8").read().split("\n")
i = next(i for i, l in enumerate(lines) if l.startswith("@@ -629,"))
print("header:", lines[i])
for l in lines[i+1:]:
    if l.startswith("@@ "):
        break
    if l == "" or l == "\\ No newline at end of file":
        print("SPECIAL:", repr(l))
print("total body lines:", sum(1 for l in lines[i+1:] if not l.startswith("@@ ")))
