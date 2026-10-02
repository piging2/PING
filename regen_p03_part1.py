"""Regenerate P-20260923-088 patch-03 by applying its semantic edits to tip.
Each replacement asserts exactly one match. Run on the Pig worktree."""
import io, sys

REPO = "/home/nolan/ping-wave-gw2-088"
SRC = REPO + "/gateway/routes/mission_control.js"
DST = REPO + "/088-dbg/mission_control.p03.js"

t = io.open(SRC, encoding="utf-8").read()

def rep(old, new, label):
    global t
    n = t.count(old)
    if n != 1:
        print("FAIL [%s]: old occurs %d times (want 1): %s" % (label, n, old[:70]))
        sys.exit(1)
    t = t.replace(old, new, 1)
    print("ok [%s]" % label)

# ---- Hunk 1: requireTenant middleware (insert after requirePG block) ----
old_rqpg = """  const requirePG = (req, res, next) => {
    if (!hasPG) return res.status(503).json({ error: 'Postgres unavailable', degraded: true });
    next();
  };
"""
new_rqpg = old_rqpg + """
  // P-20260923-088: tenant isolation gate for Mission Control.
  // Default-deny: every cross-tenant-unsafe /mc/* read requires a resolved
  // tenant (?tenant=<slug> or ?namespace=tenant::<slug>). No tenant ⇒ 400,
  // never a cross-tenant read. Malformed tenant ⇒ 400. The resolved
  // { tenantId, namespace } is carried on req.tenantContext.
  // Canonical mapping defined by P-20260923-092; JS adapter re-implements
  // the same contract (same regexes/codes) since the TS kit is not
  // importable by this JS runtime.
  const {
    resolveTenantFromRequest,
    TenantBoundaryError,
  } = require('../lib/tenant-context.js');

  const requireTenant = (req, res, next) => {
    try {
      req.tenantContext = resolveTenantFromRequest(req);
      next();
    } catch (err) {
      if (err instanceof TenantBoundaryError) {
        return res.status(400).json({ status: 'error', code: err.code, message: err.message });
      }
      return res.status(400).json({ status: 'error', code: 'INVALID_TENANT', message: err.message });
    }
  };
"""
rep(old_rqpg, new_rqpg, "h1-requireTenant")

# ---- Hunk 2a: queryEventsByType ----
rep("""  async function queryEventsByType(eventType, limit = 100) {
    const [result, totalEvents] = await Promise.all([
      unifiedEventRuntime.query({ eventType, limit }),
      countEvents(['1=1', 'event_type = $1'], [eventType]),
    ]);""",
"""  // P-20260923-088: takes the tenant namespace so the count and the rows
  // describe the SAME tenant cohort.
  async function queryEventsByType(eventType, limit = 100, namespace = null) {
    const [result, totalEvents] = await Promise.all([
      unifiedEventRuntime.query({ eventType, limit, namespace }),
      countEvents(
        namespace ? ['1=1', 'event_type = $1', 'namespace = $2'] : ['1=1', 'event_type = $1'],
        namespace ? [eventType, namespace] : [eventType]
      ),
    ]);""", "h2a-queryEventsByType")

# ---- Hunk 2b: queryEventsSince ----
rep("""  async function queryEventsSince(since, limit = 500) {
    const [result, totalEvents] = await Promise.all([
      unifiedEventRuntime.query({ since, limit }),
      countEvents(['1=1', 'timestamp >= $1'], [since]),
    ]);""",
"""  async function queryEventsSince(since, limit = 500, namespace = null) {
    const [result, totalEvents] = await Promise.all([
      unifiedEventRuntime.query({ since, limit, namespace }),
      countEvents(
        namespace ? ['1=1', 'timestamp >= $1', 'namespace = $2'] : ['1=1', 'timestamp >= $1'],
        namespace ? [since, namespace] : [since]
      ),
    ]);""", "h2b-queryEventsSince")

io.open(DST, "w", encoding="utf-8").write(t)
print("wrote", DST)
