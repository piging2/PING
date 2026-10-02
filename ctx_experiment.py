import io, subprocess
d = "/home/nolan/ping-wave-gw2-088/088-dbg"
repo = "/home/nolan/ping-wave-gw2-088"
tip = io.open(repo + "/gateway/routes/mission_control.js", encoding="utf-8").read().split("\n")

# Variant A: 3 leading context lines (116,117,118), like git's own diff
ctxA = tip[115:118]  # 116,117,118
# Variant B: 5 leading context lines (114..118)
ctxB = tip[113:118]  # 114..118
deline = tip[118]     # 119 the router.get line
assert deline.startswith("  router.get('/business/who-needs-followup', requirePG, async")

def build(ctx, new_start):
    old_count = len(ctx) + 1
    new_count = len(ctx) + 1
    h = ["@@ -%d,%d +%d,%d @@" % (113 + (5 - len(ctx)) + 1 - 1, old_count, new_start, new_count)]
    # simpler: compute old_start directly
    return h

results = {}
for name, ctx in [("A3", ctxA), ("B5", ctxB)]:
    old_start = 119 - len(ctx)
    new_start = old_start  # 1:1 replacement for check purposes
    hunk = ["@@ -%d,%d +%d,%d @@" % (old_start, len(ctx) + 1, new_start, len(ctx) + 1)]
    for c in ctx:
        hunk.append(" " + c)
    hunk.append("-" + deline)
    hunk.append("+" + deline.replace("requirePG, async", "requirePG, requireTenant, async", 1))
    doc = ["--- a/gateway/routes/mission_control.js",
           "+++ b/gateway/routes/mission_control.js"] + hunk
    p = "%s/ctx_%s.diff" % (d, name)
    io.open(p, "w", encoding="utf-8").write("\n".join(doc) + "\n")
    r = subprocess.run(["git", "apply", "--check", "-v", p],
                       cwd=repo, capture_output=True, text=True)
    results[name] = (r.returncode, r.stderr.strip().splitlines()[:3])

for k, v in results.items():
    print(k, "rc=", v[0])
    for ln in v[1]:
        print("   ", ln[:80])
