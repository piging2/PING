#!/usr/bin/env python3
"""Rebuild patch-02 with tip-anchored hunks (ed4371b13).

Fixes vs the original 088 patch-02:
- hunk-1 split in two and re-anchored: the fencing_token ALTER (P-20260923-107)
  and the create() doc comment now sit between the old anchor points.
- getPending/getStats/getTrace mega-hunk split: getActive() now sits between
  getPending and getStats at tip, so the old contiguous hunk could not apply.
- ADDED the missing getActive(tenantId) analog (plan-listed, mechanical analog
  of getPending).
- Em dashes removed from ADDED lines only (context lines keep their exact
  bytes, em dashes included).
Envelope counts are placeholders; recount.py normalizes them afterwards.
"""
import subprocess

OUT = '/home/hatch/workspace/tenanos-wave/scratch/088-fixed/patch-02-mission-runtime-tenant-scope.diff'

H = '--- a/ping-runtime/orchestration/mission_runtime.js\n+++ b/ping-runtime/orchestration/mission_runtime.js\n'

body = H + """\
@@ -53,0 +53,0 @@
       CREATE INDEX IF NOT EXISTS idx_pm_retry_at ON ping_missions(retry_at);
       CREATE INDEX IF NOT EXISTS idx_pm_lease_until ON ping_missions(lease_until);
+      -- P-20260923-088: tenant filter is `payload->>'namespace'` (no tenant
+      -- column; the bridge already stamps payload.namespace). GIN expression
+      -- index serves the exact-match filter in getPending/getActive/getStats.
+      CREATE INDEX IF NOT EXISTS idx_pm_namespace ON ping_missions((payload->>'namespace'));
       ALTER TABLE ping_missions ADD COLUMN IF NOT EXISTS retry_at TIMESTAMPTZ;
       ALTER TABLE ping_missions ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ;
       ALTER TABLE ping_missions ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
       ALTER TABLE ping_missions ADD COLUMN IF NOT EXISTS fencing_token VARCHAR(64);
     `);
   }
@@ -69,0 +69,0 @@
    * ON CONFLICT DO NOTHING prevents duplicate missions for the same event.
    */
   async create(missionType, payload = {}, options = {}) {
     const crypto = require('crypto');
     const { constitutionalTimeAuthority } = require('../authorities/constitutional_time_authority.js');
+    // P-20260923-088: missions are tenant-scoped at creation. The bridge
+    // already stamps payload.namespace; a direct POST must say which tenant
+    // owns the row. Fail closed on malformed tenant ids.
+    if (options.tenantId !== undefined && options.tenantId !== null) {
+      const { tenantIdToNamespace } = require('../../gateway/lib/tenant-context.js');
+      payload = { ...payload, namespace: tenantIdToNamespace(options.tenantId) };
+    }
     const idempotencyKey = payload.event_id
@@ -339,0 +339,0 @@
    * Returns missions in `created` status AND `retry_pending` missions whose
    * `retry_at` has elapsed — both are claimable.
    */
-  async getPending(limit = 10) {
+  async getPending(limit = 10, tenantId = null) {
+    // P-20260923-088: optional tenant scope via payload->>'namespace'
+    // (idx_pm_namespace). Rows with no resolvable namespace never match a
+    // tenant filter: they surface as UNKNOWN, never as another tenant's rows.
+    let ns = null;
+    if (tenantId) {
+      const { tenantIdToNamespace } = require('../../gateway/lib/tenant-context.js');
+      ns = tenantIdToNamespace(tenantId);
+    }
     const result = await this._pool.query(
       `SELECT * FROM ping_missions
-       WHERE status = 'created'
-          OR (status = 'retry_pending' AND retry_at IS NOT NULL AND retry_at <= NOW())
+       WHERE ${ns ? `payload->>'namespace' = $2 AND ` : ''}
+             (status = 'created'
+          OR (status = 'retry_pending' AND retry_at IS NOT NULL AND retry_at <= NOW()))
        ORDER BY priority DESC, created_at ASC LIMIT $1`,
-      [limit]
+      ns ? [limit, ns] : [limit]
     );
     return result.rows;
   }
@@ -353,0 +353,0 @@
   /**
    * Get active missions.
    */
-  async getActive() {
+  async getActive(tenantId = null) {
+    // P-20260923-088: optional tenant scope via payload->>'namespace'
+    // (idx_pm_namespace). Rows with no resolvable namespace never match a
+    // tenant filter: they surface as UNKNOWN, never as another tenant's rows.
+    let ns = null;
+    if (tenantId) {
+      const { tenantIdToNamespace } = require('../../gateway/lib/tenant-context.js');
+      ns = tenantIdToNamespace(tenantId);
+    }
     const result = await this._pool.query(
-      `SELECT * FROM ping_missions WHERE status IN ('assigned', 'running') ORDER BY priority DESC`
+      `SELECT * FROM ping_missions WHERE status IN ('assigned', 'running')` +
+      (ns ? ` AND payload->>'namespace' = $1` : '') +
+      ` ORDER BY priority DESC`,
+      ns ? [ns] : []
     );
     return result.rows;
   }
@@ -363,0 +363,0 @@
   /**
    * Get mission stats.
    */
-  async getStats() {
+  async getStats(tenantId = null) {
+    let ns = null;
+    if (tenantId) {
+      const { tenantIdToNamespace } = require('../../gateway/lib/tenant-context.js');
+      ns = tenantIdToNamespace(tenantId);
+    }
     const result = await this._pool.query(
-      `SELECT status, COUNT(*) as count FROM ping_missions GROUP BY status`
+      `SELECT status, COUNT(*) as count FROM ping_missions` +
+      (ns ? ` WHERE payload->>'namespace' = $1 GROUP BY status` : ` GROUP BY status`),
+      ns ? [ns] : []
     );
     const stats = {};
     for (const row of result.rows) {
       stats[row.status] = parseInt(row.count);
     }
-    return { ...stats, scope: 'persistent' };
+    // P-20260923-088: keep the scope label; add the tenant the counts belong to.
+    return { ...stats, scope: 'persistent', ...(ns ? { tenant_namespace: ns } : {}) };
   }
@@ -385,0 +385,0 @@
    * Previously queried by mission_id directly, which is a sha256 hash — never
    * equal to any event's correlation_id.
+   *
+   * P-20260923-088: when tenantId is given, the triggering event's namespace
+   * must equal tenant::<tenantId>, else { forbidden: true } (route maps to
+   * HTTP 403). An unresolvable tenant is refused too: a trace whose tenant
+   * cannot be proven is never served as another tenant's.
    */
-  async getTrace(missionId) {
+  async getTrace(missionId, tenantId = null) {
     const mission = await this._pool.query(
       `SELECT * FROM ping_missions WHERE mission_id = $1`,
       [missionId]
     );
     if (!mission.rows[0]) return null;
 
     const missionRow = mission.rows[0];
     const payload = typeof missionRow.payload === 'string'
       ? JSON.parse(missionRow.payload)
       : (missionRow.payload || {});
+
+    if (tenantId) {
+      const { tenantIdToNamespace } = require('../../gateway/lib/tenant-context.js');
+      const expected = tenantIdToNamespace(tenantId);
+      // Prefer the row's own namespace; fall back to the triggering event.
+      let missionNs = payload.namespace || null;
+      if (!missionNs && payload.event_id) {
+        const trig = await this._pool.query(
+          `SELECT namespace FROM ping_events WHERE event_id = $1`,
+          [payload.event_id]
+        );
+        missionNs = trig.rows[0]?.namespace || null;
+      }
+      if (missionNs !== expected) {
+        return { forbidden: true, reason: missionNs ? 'tenant-mismatch' : 'tenant-unresolvable' };
+      }
+    }
 
     // Resolve correlation_id from the triggering event's metadata.
     // The bridge stores event_id in payload; the triggering event carries
     // correlation_id in its metadata (set by UnifiedEventRuntime.emit).
"""

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(body)
print('wrote', OUT)

# sanity: no em dash in added lines
bad = [ln for ln in body.split('\n') if ln.startswith('+') and '—' in ln]
print('em dashes in + lines:', len(bad))
for ln in bad:
    print('  ', ln[:100])
