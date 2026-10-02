import re
p = "/home/nolan/worktrees/orca-autonomy/ping-runtime/external-agent/BOUNDARY.md"
s = open(p).read()
lines = s.split("\n", 2)
# line 0 carries literal backslash-n sequences from the printf hop; restore real newlines
lines[0] = lines[0].replace("\\n", "\n")
s = "\n".join(lines)
open(p, "w").write(s)
print(repr(open(p).read()[:280]))
