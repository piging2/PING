import io, re
repo = "/home/nolan/ping-wave-gw2-088"
tip = io.open(repo + "/gateway/routes/mission_control.js", encoding="utf-8").read().split("\n")
lines = io.open(repo + "/088-fixed/patch-03-mc-routes-tenant-gate.diff", encoding="utf-8").read().split("\n")
HUNK = re.compile(r"^@@ -(\d+),(\d+) \+(\d+),(\d+) @@")
hunks = []
for i, l in enumerate(lines):
    m = HUNK.match(l)
    if m:
        hunks.append((i, int(m.group(1)), int(m.group(2))))
for n, (i, old_start, old_count) in enumerate(hunks):
    j = hunks[n+1][0] if n+1 < len(hunks) else len(lines)
    body = lines[i+1:j]
    old = []
    for ln in body:
        if ln.startswith(" ") or ln == "":
            old.append(ln[1:] if ln.startswith(" ") else "")
        elif ln.startswith("-"):
            old.append(ln[1:])
    if len(old) != old_count:
        print("hunk #%d @%d: ENVELOPE MISMATCH old-side=%d vs header %d" % (n+1, old_start, len(old), old_count))
        continue
    bad = [(old_start+k, want, tip[old_start-1+k]) for k, want in enumerate(old)
           if tip[old_start-1+k] != want]
    if not bad:
        print("hunk #%d @%d: OK (%d lines)" % (n+1, old_start, len(old)))
    else:
        print("hunk #%d @%d: %d/%d lines differ; first at tip %d" % (n+1, old_start, len(bad), len(old), bad[0][0]))
