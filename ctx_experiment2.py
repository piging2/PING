import io, subprocess
repo = "/home/nolan/ping-wave-gw2-088"
d = repo + "/088-dbg"
tip = io.open(repo + "/gateway/routes/mission_control.js", encoding="utf-8").read().split("\n")

def test(name, ctx_lines, del_idx, add_line):
    # ctx_lines: list of tip indices (0-based) used as leading context
    # del_idx: tip index of deleted line; trailing context = next 2 lines
    old_start = ctx_lines[0] + 1
    trail = [del_idx + 1, del_idx + 2]
    hunk = ["@@ -%d,%d +%d,%d @@" % (old_start, len(ctx_lines) + 1 + 2, old_start, len(ctx_lines) + 1 + 2)]
    for i in ctx_lines:
        hunk.append(" " + tip[i])
    hunk.append("-" + tip[del_idx])
    hunk.append("+" + add_line)
    for i in trail:
        hunk.append(" " + tip[i])
    doc = ["--- a/gateway/routes/mission_control.js",
           "+++ b/gateway/routes/mission_control.js"] + hunk
    p = "%s/ctx_%s.diff" % (d, name)
    io.open(p, "w", encoding="utf-8").write("\n".join(doc) + "\n")
    r = subprocess.run(["git", "apply", "--check", p], cwd=repo,
                       capture_output=True, text=True)
    print(name, "rc=", r.returncode, r.stderr.strip().splitlines()[1][:60] if r.returncode else "APPLIES")

deline = tip[118]
addline = deline.replace("requirePG, async", "requirePG, requireTenant, async", 1)
# C: context = lines 117,118 (who-needs comment, blank? no: 117='',118=comment) then del 119, trail 120,121
test("C_nobox", [116, 117], 118, addline)
# D: context starting at the who-needs comment itself
test("D_min", [117], 118, addline)
