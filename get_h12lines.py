import io
lines = io.open("/home/nolan/ping-wave-gw2-088/088-fixed/patch-03-mc-routes-tenant-gate.diff", encoding="utf-8").read().split("\n")
i = next(i for i, l in enumerate(lines) if l.startswith("@@ -629,"))
for l in lines[i:]:
    if l.startswith("+") and ("scope:" in l or "NOTE" in l or "P-20260923-088 (deferred)" in l or "operator-global" in l or "tenant-scoped" in l or "follow-up migration" in l or "no tenant/job-owner" in l or "column, so per-tenant" in l or "LABELED" in l):
        print(repr(l[1:]))
    if l.startswith("@@ ") and not l.startswith("@@ -629,"):
        break
