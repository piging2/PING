import io
lines = io.open("/home/nolan/ping-wave-gw2-088/088-fixed/patch-03-mc-routes-tenant-gate.diff", encoding="utf-8").read().split("\n")
# NOTE: this reads the NEW regenerated patch; find business hunk
i = next(i for i, l in enumerate(lines) if "who-needs-followup" in l and l.startswith("@@") == False and "business" in l.lower() or (l.startswith("@@ -") and "114" in l))
print("found at", i, lines[i][:60])
