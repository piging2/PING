import io

BASE = "/home/nolan/projects/ping"

def edit(path, pairs):
    src = io.open(BASE + path, encoding="utf-8").read()
    for old, new in pairs:
        assert src.count(old) == 1, "anchor not unique/found in %s: %r" % (path, old[:90])
        src = src.replace(old, new, 1)
    io.open(BASE + path, "w", encoding="utf-8").write(src)
    print("edited", path)

# ----------------------- tools/fyd-journal-gateway/server.mjs
edit("/tools/fyd-journal-gateway/server.mjs", [
(
'''// Write-boundary P0: request_id -> event_id. The event record IS the
// index entry (stored on the record itself), so there is no two-file
// atomicity problem. Rebuilt from disk at startup; updated synchronously
// on every append.
const requestIndex = new Map();
function rebuildRequestIndex() {
  requestIndex.clear();
  for (const e of loadEvents()) {
    if (e && typeof e.request_id === "string" && e.request_id && !requestIndex.has(e.request_id)) {
      requestIndex.set(e.request_id, e.event_id);
    }
  }
}
rebuildRequestIndex();''',
'''// Write-boundary P0: request_id -> { tenantId, eventId }. A request_id is
// bound to the tenant that first used it: the same tenant may replay it
// idempotently, but a DIFFERENT tenant reusing it is rejected without
// learning the original event_id (zero disclosure across tenants).
// The event record IS the index entry (stored on the record itself), so
// there is no two-file atomicity problem. Rebuilt from disk at startup
// (tenantIdOf backfills legacy records in memory); updated synchronously
// on every append.
const requestIndex = new Map();
function rebuildRequestIndex() {
  requestIndex.clear();
  for (const e of loadEvents()) {
    if (e && typeof e.request_id === "string" && e.request_id && !requestIndex.has(e.request_id)) {
      requestIndex.set(e.request_id, { tenantId: e.tenant_id || null, eventId: e.event_id });
    }
  }
}
rebuildRequestIndex();'''),
(
'''        requestId = doc.request_id.trim();
        const prior = requestIndex.get(requestId);
        if (prior) {
          // Idempotent replay: the original event, no new append.
          send(res, 200, { event_id: prior, deduped: true });
          return;
        }''',
'''        requestId = doc.request_id.trim();
        const prior = requestIndex.get(requestId);
        if (prior) {
          if (prior.tenantId && prior.tenantId === tenant_id) {
            // Idempotent replay by the same tenant: the original event, no new append.
            send(res, 200, { event_id: prior.eventId, deduped: true });
            return;
          }
          // A different tenant is reusing another tenant's request_id.
          // Reject without disclosing the original event_id.
          send(res, 400, {
            error: "request_id_tenant_conflict",
            detail: "request_id is already bound to a different tenant",
          });
          return;
        }'''),
(
'''      if (requestId) requestIndex.set(requestId, rec.event_id);''',
'''      if (requestId) requestIndex.set(requestId, { tenantId: tenant_id, eventId: rec.event_id });'''),
])

print("DEDUP FIX OK")
