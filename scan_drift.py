import io, re
repo = "/home/nolan/ping-wave-gw2-088"
tip = io.open(repo + "/gateway/routes/mission_control.js", encoding="utf-8").read().split("\n")
tipset = set(tip)
lines = io.open(repo + "/088-fixed/patch-03-mc-routes-tenant-gate.diff", encoding="utf-8").read().split("\n")
HUNK = re.compile(r"^@@ -(\d+),\d+ \+\d+,\d+ @@")
cur = None
for l in lines:
    m = HUNK.match(l)
    if m:
        cur = m.group(1)
    elif cur and l.startswith("-") and not l.startswith("---"):
        content = l[1:]
        if content not in tipset:
            print("hunk @%s: MISSING at tip: %s" % (cur, content[:80]))
print("scan done")
