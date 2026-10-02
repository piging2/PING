import io

p = "/home/nolan/projects/ping-constitutional/src/fyd/claim/identity.ts"
s = io.open(p, encoding="utf-8").read()
old = (
    " * Demo-owner mode is the ONLY identity source in this build. The auth lane\n"
    " * is building the real Google-ready adapter in parallel (src/fyd/identity);\n"
    " * this bridge deliberately does NOT depend on it. When that adapter lands,\n"
    " * it adds a new ClaimedIdentity kind here; the state machine is unchanged.\n"
)
new = (
    " * Demo-owner mode is the ONLY identity source in this build. A Google-ready\n"
    " * adapter exists in-tree (src/fyd/identity: provider, callback flow,\n"
    " * session routes, file store, audit); this bridge deliberately does NOT\n"
    " * consume it yet. When that adapter is wired in, it adds a new\n"
    " * ClaimedIdentity kind here; the state machine is unchanged. (Comment\n"
    " * corrected 2026-09-23: the adapter had already landed at the\n"
    " * referenced path.)\n"
)
assert s.count(old) == 1, "expected exactly one occurrence, found %d" % s.count(old)
io.open(p, "w", encoding="utf-8", newline="").write(s.replace(old, new))
print("patched-ok")
