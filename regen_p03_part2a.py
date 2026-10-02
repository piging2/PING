"""Part 2: hunks 3-12 of patch-03. Continues from part 1's output file."""
import io, sys

REPO = "/home/nolan/ping-wave-gw2-088"
SRC = REPO + "/088-dbg/mission_control.p03.js"

t = io.open(SRC, encoding="utf-8").read()

def rep(old, new, label):
    global t
    n = t.count(old)
    if n != 1:
        print("FAIL [%s]: old occurs %d times (want 1): %s" % (label, n, old[:70]))
        sys.exit(1)
    t = t.replace(old, new, 1)
    print("ok [%s]" % label)

# ---- Hunk 3a: dashboard route gate ----
rep("  router.get('/dashboard', requirePG, async (req, res) => {",
    "  // P-20260923-088: tenant-gated. Default-deny: no ?tenant \u21d2 400.\n"
    "  router.get('/dashboard', requirePG, requireTenant, async (req, res) => {",
    "h3a-dashboard-gate")

# ---- Hunk 3b: dashboard ns/tenantId + scoped calls ----
rep("""    try {
      const [missionStats, ev] = await Promise.all([
        missionRuntime.getStats(),
        queryEventsSince(new Date(constitutionalTimeAuthority.nowAsMillis() - 86400000).toISOString(), 500),
      ]);""",
"""    try {
      const ns = req.tenantContext.namespace;
      const tenantId = req.tenantContext.tenantId;
      const [missionStats, ev] = await Promise.all([
        missionRuntime.getStats(tenantId),
        queryEventsSince(new Date(constitutionalTimeAuthority.nowAsMillis() - 86400000).toISOString(), 500, ns),
      ]);""", "h3b-dashboard-scope")

# ---- Hunk 4: dashboard JSON tenant fields ----
rep("""        dashboard: {
          business,""",
"""        dashboard: {
          tenant: tenantId,
          tenant_namespace: ns,
          business,""", "h4-dashboard-json")

# ---- Hunk 5: business who-needs-followup ----
rep("  router.get('/business/who-needs-followup', requirePG, async (req, res) => {",
    "  // P-20260923-088: tenant-gated (requireTenant). Follow-up on this surface:\n"
    "  // pass req.tenantContext.namespace into this route's queryEventsSince /\n"
    "  // queryEventsByType bodies (the helpers already accept a namespace\n"
    "  // argument) and gate the remaining /business/* routes. Until then these\n"
    "  // reads are gated but not namespace-scoped.\n"
    "  router.get('/business/who-needs-followup', requirePG, requireTenant, async (req, res) => {",
    "h5-business-gate")

io.open(SRC, "w", encoding="utf-8").write(t)
print("part2a done")
