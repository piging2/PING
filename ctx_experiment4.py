import io, subprocess
repo = "/home/nolan/ping-wave-gw2-088"
d = repo + "/088-dbg"
tip = io.open(repo + "/gateway/routes/mission_control.js", encoding="utf-8").read().split("\n")

COMMENT = [
    "+  // P-20260923-088: tenant-gated (requireTenant). Follow-up on this surface:",
    "+  // pass req.tenantContext.namespace into this route's queryEventsSince /",
    "+  // queryEventsByType bodies (the helpers already accept a namespace",
    "+  // argument) and gate the remaining /business/* routes. Until then these",
    "+  // reads are gated but not namespace-scoped.",
]
NEWROUTE = "+  router.get('/business/who-needs-followup', requirePG, requireTenant, async (req, res) => {"
OLDROUTE = "-" + tip[118]

def test(name, lead_idx, added, trail_idx):
    old_start = lead_idx[0] + 1
    old_n = len(lead_idx) + 1 + len(trail_idx)
    new_n = len(lead_idx) + len(added) + len(trail_idx)
    hunk = ["@@ -%d,%d +%d,%d @@" % (old_start, old_n, old_start, new_n)]
    for i in lead_idx:
        hunk.append(" " + tip[i])
    hunk.append(OLDROUTE)
    hunk.extend(added)
    for i in trail_idx:
        hunk.append(" " + tip[i])
    doc = ["--- a/gateway/routes/mission_control.js",
           "+++ b/gateway/routes/mission_control.js"] + hunk
    p = "%s/morph_%s.diff" % (d, name)
    io.open(p, "w", encoding="utf-8").write("\n".join(doc) + "\n")
    r = subprocess.run(["git", "apply", "--check", p], cwd=repo,
                       capture_output=True, text=True)
    print(name, "rc=", r.returncode, "APPLIES" if r.returncode == 0 else "FAILS")

# H: F-shape (3 lead: 116,117,118) but with the 6 added lines, no trailing ctx
test("H_3lead_6add", [115, 116, 117], COMMENT + [NEWROUTE], [])
# I: 5 lead (114..118) with 6 added lines = the original hunk
test("I_5lead_6add", [113, 114, 115, 116, 117], COMMENT + [NEWROUTE], [])
# J: 5 lead with 1-line change only
test("J_5lead_1chg", [113, 114, 115, 116, 117], [NEWROUTE], [])
# K: 3 lead with 1-line change, no trailing ctx (closest to F but no trailing)
test("K_3lead_1chg", [115, 116, 117], [NEWROUTE], [])
