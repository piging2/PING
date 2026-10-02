import io, subprocess
repo = "/home/nolan/ping-wave-gw2-088"
d = repo + "/088-dbg"
tip = io.open(repo + "/gateway/routes/mission_control.js", encoding="utf-8").read().split("\n")

def test(name, lead, del_idx, trail_n=2):
    old_start = lead[0] + 1
    n = len(lead) + 1 + trail_n
    hunk = ["@@ -%d,%d +%d,%d @@" % (old_start, n, old_start, n)]
    for i in lead:
        hunk.append(" " + tip[i])
    hunk.append("-" + tip[del_idx])
    hunk.append("+" + tip[del_idx].replace("requirePG, async", "requirePG, requireTenant, async", 1))
    for i in range(del_idx + 1, del_idx + 1 + trail_n):
        hunk.append(" " + tip[i])
    doc = ["--- a/gateway/routes/mission_control.js",
           "+++ b/gateway/routes/mission_control.js"] + hunk
    p = "%s/iso_%s.diff" % (d, name)
    io.open(p, "w", encoding="utf-8").write("\n".join(doc) + "\n")
    r = subprocess.run(["git", "apply", "--check", p], cwd=repo,
                       capture_output=True, text=True)
    print(name, "lead=", [tip[i][:24] for i in lead], "rc=", r.returncode,
          "APPLIES" if r.returncode == 0 else "FAILS")

# E: single box-drawing context line (line 116)
test("E_box1", [115], 118)
# F: box line + blank + comment (lines 116,117,118)
test("F_box3", [115, 116, 117], 118)
# G: BUSINESS QUESTION ENDPOINTS line only (line 115)
test("G_text", [114], 118)
