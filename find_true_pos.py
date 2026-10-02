import io, re
repo = "/home/nolan/ping-wave-gw2-088"
tip = io.open(repo + "/gateway/routes/mission_control.js", encoding="utf-8").read().split("\n")
lines = io.open(repo + "/088-fixed/patch-03-mc-routes-tenant-gate.diff", encoding="utf-8").read().split("\n")
HUNK = re.compile(r"^@@ -(\d+),(\d+) \+(\d+),(\d+) @@")
hunks = []
for i, l in enumerate(lines):
    m = HUNK.match(l)
    if m:
        hunks.append((i, int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))))
for n, (i, os_, oc, ns_, nc) in enumerate(hunks):
    if n+1 in (1, 3, 4, 5):
        continue  # already verified OK
    j = hunks[n+1][0] if n+1 < len(hunks) else len(lines)
    body = lines[i+1:j]
    old = []
    for ln in body:
        if ln.startswith(" "):
            old.append(ln[1:])
        elif ln == "":
            old.append("")
        elif ln.startswith("-"):
            old.append(ln[1:])
    # find block at tip: use first non-blank distinctive line
    first = old[0]
    cands = [k for k, t in enumerate(tip) if t == first]
    found = None
    for k in cands:
        if tip[k:k+len(old)] == old:
            found = k + 1  # 1-based
            break
    print("hunk #%d claimed @%d: true @%s (block len %d)" % (n+1, os_, found, len(old)))
