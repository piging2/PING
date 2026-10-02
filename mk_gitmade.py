import io, subprocess, os
d = "/home/nolan/ping-wave-gw2-088/088-dbg"
t = io.open(d + "/mc2.js", encoding="utf-8").read()
old = "router.get('/business/who-needs-followup', requirePG, async (req, res) => {"
assert t.count(old) == 1, t.count(old)
t = t.replace(old, "router.get('/business/who-needs-followup', requirePG, requireTenant, async (req, res) => {", 1)
io.open(d + "/mc2.js", "w", encoding="utf-8").write(t)
r = subprocess.run(["git", "diff", "--no-index", "--", "mc.orig.js", "mc2.js"],
                   cwd=d, capture_output=True, text=True)
io.open(d + "/gitmade.diff", "w", encoding="utf-8").write(r.stdout)
print("diff lines:", len(r.stdout.splitlines()))
print(r.stdout.splitlines()[4] if len(r.stdout.splitlines()) > 4 else "")
