"""Part 2b: hunks 6-12 of patch-03. Continues from part 2a's output file."""
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

# ---- Hunk 6: inbox ----
rep("  router.get('/inbox', requirePG, async (req, res) => {",
    "  router.get('/inbox', requirePG, requireTenant, async (req, res) => {",
    "h6a-inbox-gate")
rep("      const result = await unifiedEventRuntime.query({ unprocessed: true, limit });",
    "      const ns = req.tenantContext.namespace;\n"
    "      const result = await unifiedEventRuntime.query({ unprocessed: true, limit, namespace: ns });",
    "h6b-inbox-scope")

# ---- Hunk 6: queues (disambiguate from /activity via the || 50 limit line) ----
rep("  router.get('/queues', requirePG, async (req, res) => {",
    "  router.get('/queues', requirePG, requireTenant, async (req, res) => {",
    "h6c-queues-gate")
rep("""      const limit = parseInt(req.query.limit) || 50;
      const result = await unifiedEventRuntime.query({ since, limit });""",
    """      const limit = parseInt(req.query.limit) || 50;
      const ns = req.tenantContext.namespace;
      const result = await unifiedEventRuntime.query({ since, limit, namespace: ns });""",
    "h6d-queues-scope")

# ---- Hunk 7: queues/:eventType ----
rep("  router.get('/queues/:eventType', requirePG, async (req, res) => {",
    "  router.get('/queues/:eventType', requirePG, requireTenant, async (req, res) => {",
    "h7a-qtype-gate")
rep("      const result = await unifiedEventRuntime.query({ eventType: req.params.eventType, limit });",
    "      const ns = req.tenantContext.namespace;\n"
    "      const result = await unifiedEventRuntime.query({ eventType: req.params.eventType, limit, namespace: ns });",
    "h7b-qtype-scope")

# ---- Hunk 7: missions ----
rep("  router.get('/missions/active', requirePG, async (req, res) => {",
    "  router.get('/missions/active', requirePG, requireTenant, async (req, res) => {",
    "h7c-active-gate")
rep("      const missions = await missionRuntime.getActive();",
    "      const missions = await missionRuntime.getActive(req.tenantContext.tenantId);",
    "h7d-active-scope")
rep("  router.get('/missions/pending', requirePG, async (req, res) => {",
    "  router.get('/missions/pending', requirePG, requireTenant, async (req, res) => {",
    "h7e-pending-gate")
rep("      const missions = await missionRuntime.getPending(limit);",
    "      const missions = await missionRuntime.getPending(limit, req.tenantContext.tenantId);",
    "h7f-pending-scope")
rep("  router.get('/missions/stats', requirePG, async (req, res) => {",
    "  router.get('/missions/stats', requirePG, requireTenant, async (req, res) => {",
    "h7g-stats-gate")
rep("      const stats = await missionRuntime.getStats();",
    "      const stats = await missionRuntime.getStats(req.tenantContext.tenantId);",
    "h7h-stats-scope")

# ---- Hunk 7: trace ----
rep("  router.get('/missions/:id/trace', requirePG, async (req, res) => {",
    "  // P-20260923-088: tenant-gated; mission whose tenant cannot be proven to\n"
    "  // match the request is 403 (getTrace returns { forbidden }).\n"
    "  router.get('/missions/:id/trace', requirePG, requireTenant, async (req, res) => {",
    "h7i-trace-gate")
rep("      const trace = await missionRuntime.getTrace(req.params.id);",
    "      const trace = await missionRuntime.getTrace(req.params.id, req.tenantContext.tenantId);\n"
    "      if (trace.forbidden) {\n"
    "        return res.status(403).json({ status: 'error', code: 'CROSS_TENANT_REFERENCE', reason: trace.reason });\n"
    "      }",
    "h7j-trace-scope")

# ---- Hunk 7: knowledge ----
rep("  router.get('/knowledge', requirePG, async (req, res) => {",
    "  // P-20260923-088: pass the tenant namespace to queryNodes (backend\n"
    "  // already supports the namespace filter).\n"
    "  router.get('/knowledge', requirePG, requireTenant, async (req, res) => {",
    "h7k-knowledge-gate")
rep("""      const nodes = await knowledgeGraph.queryNodes({
        nodeType: req.query.type,
        search: req.query.q,
        limit: parseInt(req.query.limit) || 50,
      });""",
"""      const nodes = await knowledgeGraph.queryNodes({
        nodeType: req.query.type,
        search: req.query.q,
        limit: parseInt(req.query.limit) || 50,
        namespace: req.tenantContext.namespace,
      });""", "h7l-knowledge-scope")

# ---- Hunk 8: activity ----
rep("  router.get('/activity', requirePG, async (req, res) => {",
    "  router.get('/activity', requirePG, requireTenant, async (req, res) => {",
    "h8a-activity-gate")
rep("      const result = await unifiedEventRuntime.query({ since, limit });\n"
    "      res.json({ status: 'ok', activity: result.events, count: result.count });",
    "      const ns = req.tenantContext.namespace;\n"
    "      const result = await unifiedEventRuntime.query({ since, limit, namespace: ns });\n"
    "      res.json({ status: 'ok', activity: result.events, count: result.count });",
    "h8b-activity-scope")

# ---- Hunk 9: replay/stats (tip has refactored structure, no Promise.all) ----
rep("""  router.get('/replay/stats', requirePG, async (req, res) => {
    try {
      const result = await unifiedEventRuntime.query({ eventType: 'REPLAY_COMPLETED', limit: 1000 });""",
"""  router.get('/replay/stats', requirePG, requireTenant, async (req, res) => {
    try {
      const ns = req.tenantContext.namespace;
      const result = await unifiedEventRuntime.query({ eventType: 'REPLAY_COMPLETED', limit: 1000, namespace: ns });""",
    "h9a-replay-stats")
rep("      const witnessRes = await unifiedEventRuntime.query({ eventType: 'WITNESS_REJECTED', limit: 1000 });",
    "      const witnessRes = await unifiedEventRuntime.query({ eventType: 'WITNESS_REJECTED', limit: 1000, namespace: ns });",
    "h9b-replay-stats-witness")

# ---- Hunk 10: witness/stats ----
rep("  router.get('/witness/stats', requirePG, async (req, res) => {",
    "  router.get('/witness/stats', requirePG, requireTenant, async (req, res) => {",
    "h10a-witness-gate")
rep("""      const [createdRes, rejectedRes] = await Promise.all([
        unifiedEventRuntime.query({ eventType: 'WITNESS_CREATED', limit: 1000 }),
        unifiedEventRuntime.query({ eventType: 'WITNESS_REJECTED', limit: 1000 }),
      ]);""",
"""      const ns = req.tenantContext.namespace;
      const [createdRes, rejectedRes] = await Promise.all([
        unifiedEventRuntime.query({ eventType: 'WITNESS_CREATED', limit: 1000, namespace: ns }),
        unifiedEventRuntime.query({ eventType: 'WITNESS_REJECTED', limit: 1000, namespace: ns }),
      ]);""", "h10b-witness-scope")

io.open(SRC, "w", encoding="utf-8").write(t)
print("part2b done")
