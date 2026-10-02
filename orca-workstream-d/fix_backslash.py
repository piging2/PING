BS = chr(92)
p = "/home/nolan/worktrees/orca-autonomy/ping-runtime/external-agent/external_agent_adapter.js"
s = open(p).read()
old = "its working directory is C:" + BS*2 + "Users" + BS*2 + "nolan; it CANNOT see"
new = "its working directory is C:" + BS + "Users" + BS + "nolan; it CANNOT see"
assert s.count(old) == 1, "anchor count: %d" % s.count(old)
open(p, "w").write(s.replace(old, new, 1))
print("fixed")
