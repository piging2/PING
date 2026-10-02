import io
tip = io.open("/home/nolan/ping-wave-gw2-088/gateway/routes/mission_control.js", encoding="utf-8").read().split("\n")
ctx = tip[113:119]
assert ctx[5].startswith("  router.get('/business/who-needs-followup', requirePG, async"), ctx[5][:60]
added = [
  "+  // P-20260923-088: tenant-gated (requireTenant). Follow-up on this surface:",
  "+  // pass req.tenantContext.namespace into this route's queryEventsSince /",
  "+  // queryEventsByType bodies (the helpers already accept a namespace",
  "+  // argument) and gate the remaining /business/* routes. Until then these",
  "+  // reads are gated but not namespace-scoped.",
  "+  router.get('/business/who-needs-followup', requirePG, requireTenant, async (req, res) => {",
]
hunk = ["@@ -114,6 +114,11 @@"]
for c in ctx[:5]:
    hunk.append(" " + c)
hunk.append("-" + ctx[5])
hunk.extend(added)
doc = ["--- a/gateway/routes/mission_control.js", "+++ b/gateway/routes/mission_control.js"] + hunk
io.open("/home/nolan/ping-wave-gw2-088/088-dbg/mini5b.diff", "w", encoding="utf-8").write("\n".join(doc) + "\n")
print("built from tip bytes OK")
