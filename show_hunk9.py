import io
repo = "/home/nolan/ping-wave-gw2-088"
tip = io.open(repo + "/gateway/routes/mission_control.js", encoding="utf-8").read().split("\n")
lines = io.open(repo + "/088-fixed/patch-03-mc-routes-tenant-gate.diff", encoding="utf-8").read().split("\n")
i = next(i for i, l in enumerate(lines) if l.startswith("@@ -517,"))
print("=== patch hunk #9 ===")
for l in lines[i:i+22]:
    if l.startswith("@@ ") and not l.startswith("@@ -517,"):
        break
    print(l[:90])
print("=== tip 527-545 ===")
for n in range(527, 546):
    print(n, tip[n-1][:90])
