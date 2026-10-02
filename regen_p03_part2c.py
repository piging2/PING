"""Part 2c: hunks 11-12 of patch-03. Continues from part 2b's output file."""
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

# ---- Hunk 11: replay/trace ----
rep("  router.get('/replay/trace/:correlationId', requirePG, async (req, res) => {",
    "  // P-20260923-088: tenant-gated. A correlation chain is shared across the\n"
    "  // causal lineage; if ANY event in the returned group carries a different\n"
    "  // namespace than the request tenant, refuse (403) rather than render a\n"
    "  // partial or cross-tenant chain.\n"
    "  router.get('/replay/trace/:correlationId', requirePG, requireTenant, async (req, res) => {",
    "h11a-retrace-gate")
rep("""      const limit = parseInt(req.query.limit) || 200;
      const group = await unifiedEventRuntime.getCorrelationGroup(req.params.correlationId, limit);
      const events = group.events || [];""",
"""      const limit = parseInt(req.query.limit) || 200;
      const ns = req.tenantContext.namespace;
      const group = await unifiedEventRuntime.getCorrelationGroup(req.params.correlationId, limit);
      const events = group.events || [];
      if (events.length > 0 && events.some((e) => e.namespace !== ns)) {
        return res.status(403).json({
          status: 'error',
          code: 'CROSS_TENANT_REFERENCE',
          message: 'correlation chain spans namespaces; refusing cross-tenant trace',
        });
      }""", "h11b-retrace-scope")

# ---- Hunk 12: DLQ operator-global labels ----
rep("""  // DEAD LETTER OBSERVABILITY
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  router.get('/dead-letters', async (req, res) => {""",
"""  // DEAD LETTER OBSERVABILITY
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // P-20260923-088 (deferred): repository_dead_letters has no tenant/job-owner
  // column, so per-tenant DLQ views have no backend yet. These routes stay
  // operator-global and are LABELED as such, never presented as
  // tenant-scoped. Adding the column + backfill is a follow-up migration.
  router.get('/dead-letters', async (req, res) => {""",
    "h12a-dlq-comment")
rep("      res.json({ status: 'ok', deadLetters: letters, limit, offset });",
    "      res.json({ status: 'ok', deadLetters: letters, limit, offset, scope: 'operator-global', tenant_isolation: 'unverified' });",
    "h12b-dlq-label1")
rep("""      const stats = await dlq.getStats();
      res.json({ status: 'ok', stats });""",
    """      const stats = await dlq.getStats();
      res.json({ status: 'ok', stats, scope: 'operator-global', tenant_isolation: 'unverified' });""",
    "h12c-dlq-label2")
rep("      res.json({ status: 'ok', deadLetters: letters });",
    "      res.json({ status: 'ok', deadLetters: letters, scope: 'operator-global', tenant_isolation: 'unverified' });",
    "h12d-dlq-label3")
rep("""  });

  return router;
}""",
"""  });

  // NOTE (P-20260923-088, intentionally NOT tenant-gated):
  // /system, /bridge, /event-mission-bridge, /scheduler, /workers describe
  // the gateway PROCESS (session-scoped workers/scheduler/bridges), not a
  // tenant. Gating them by tenant would mislabel process truth as tenant
  // truth. They already carry `scope: 'session'` in their payloads.

  return router;
}""", "h12e-note")

io.open(SRC, "w", encoding="utf-8").write(t)
print("part2c done")
