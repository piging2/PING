import io, re
repo = "/home/nolan/ping-wave-gw2-088"
tip = io.open(repo + "/gateway/routes/mission_control.js", encoding="utf-8").read().split("\n")
lines = io.open(repo + "/088-fixed/patch-03-mc-routes-tenant-gate.diff", encoding="utf-8").read().split("\n")
i = next(i for i, l in enumerate(lines) if l.startswith("@@ -333,"))
nxt = next(j for j, l in enumerate(lines) if j > i and l.startswith("@@ "))
body = lines[i+1:nxt]
old = []
for ln in body:
    if ln.startswith(" "):
        old.append(ln[1:])
    elif ln.startswith("-"):
        old.append(ln[1:])
print("old-side lines:", len(old))
for k, want in enumerate(old):
    got = tip[332 + k]
    if got != want:
        print("DIFF at tip", 333 + k)
        print("  patch:", ascii(want))
        print("  tip  :", ascii(got))
print("done")
