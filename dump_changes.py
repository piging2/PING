import io, re
repo = "/home/nolan/ping-wave-gw2-088"
lines = io.open(repo + "/088-fixed/patch-03-mc-routes-tenant-gate.diff", encoding="utf-8").read().split("\n")
HUNK = re.compile(r"^@@ -\d+,\d+ \+\d+,\d+ @@")
cur = None
for l in lines:
    if HUNK.match(l):
        cur = l
        print("=" * 20, cur[:60])
    elif cur and (l.startswith("-") or l.startswith("+")) and not l.startswith("---") and not l.startswith("+++"):
        print(l[:100])
