import io

path = "/home/nolan/projects/ping/tools/fyd-journal-gateway/server.mjs"
src = io.open(path, encoding="utf-8").read()

def rep(old, new):
    global src
    assert src.count(old) == 1, "anchor not unique/found: " + old[:80]
    src = src.replace(old, new, 1)

# --- A: header contract ---
rep(
""" *   GET  /events/FYD_SITE_OVERLAY[?limit=&offset=]
 *     -> 200 { events: [ { event_id, timestamp, event_type,
 *                          aggregate_id, aggregate_type, event_data } ],
 *              stream, count, limit, offset }
 *        Events are returned in journal (timestamp ascending) order.
 *        The reader does tenant scoping itself (event_data.siteId), so all
 *        events of the stream are returned.
 *   POST /events
 *     Body: { event_type, aggregate_id?, aggregate_type?, event_data, request_id? }
 *     -> 200 { event_id, deduped }  (the accepted event's id)""",
""" *   GET  /events/FYD_SITE_OVERLAY?tenant=<tenant_id>[&limit=&offset=]
 *     -> 200 { events: [ { event_id, timestamp, event_type, tenant_id,
 *                          aggregate_id, aggregate_type, event_data } ],
 *              stream, count, limit, offset, tenant }
 *        Events are returned in journal (timestamp ascending) order.
 *        Tenant scoping is enforced server-side: the tenant query param is
 *        REQUIRED (400 tenant_required without it) and only events whose
 *        immutable tenant_id exactly matches are returned. The reader keeps
 *        its own event_data.siteId filter as defense in depth. Other (non
 *        FYD-scoped) streams keep the legacy unfiltered shape.
 *   POST /events
 *     Body: { event_type, tenant_id, aggregate_id?, aggregate_type?, event_data, request_id? }
 *     -> 200 { event_id, deduped }  (the accepted event's id)
 *     Tenant enforcement on append (FYD_SITE_OVERLAY): tenant_id is REQUIRED
 *     and immutable (in this runtime the tenant id IS the site id). The
 *     gateway refuses with 400 tenant_mismatch when tenant_id is missing
 *     or invalid, when aggregate_id is present and != "fyd-site:<tenant_id>",
 *     or when event_data.siteId != tenant_id. A spoofed envelope is never
 *     journaled under another tenant's name.""")

# --- B: tenant helpers + loadEvents normalization ---
rep(
"""function loadEvents() {
  if (!existsSync(STORE)) return [];
  const out = [];
  for (const line of readFileSync(STORE, "utf8").split("\\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      out.push(JSON.parse(t));
    } catch {
      /* skip corrupt line, keep serving */
    }
  }
  out.sort((a, b) => String(a.timestamp || "").localeCompare(String(b.timestamp || "")));
  return out;
}""",
"""const TENANT_ID_PATTERN = /^[a-z0-9-]{1,64}$/;

function isValidTenantId(v) {
  return typeof v === "string" && TENANT_ID_PATTERN.test(v);
}

/**
 * Immutable tenant id of a stored record. In-memory backfill only (the
 * store file is never rewritten): records journaled before tenant_id was
 * mandatory carry the tenant in event_data.siteId / aggregate_id.
 */
function tenantIdOf(rec) {
  if (rec && isValidTenantId(rec.tenant_id)) return rec.tenant_id;
  const data =
    rec && typeof rec.event_data === "object" && rec.event_data !== null
      ? rec.event_data
      : null;
  const sid = data ? data.siteId : null;
  if (isValidTenantId(sid)) return sid;
  const agg = rec ? rec.aggregate_id : null;
  if (typeof agg === "string" && agg.startsWith("fyd-site:")) {
    const t = agg.slice("fyd-site:".length);
    if (isValidTenantId(t)) return t;
  }
  return null;
}

function loadEvents() {
  if (!existsSync(STORE)) return [];
  const out = [];
  for (const line of readFileSync(STORE, "utf8").split("\\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const rec = JSON.parse(t);
      rec.tenant_id = tenantIdOf(rec);
      out.push(rec);
    } catch {
      /* skip corrupt line, keep serving */
    }
  }
  out.sort((a, b) => String(a.timestamp || "").localeCompare(String(b.timestamp || "")));
  return out;
}""")

# --- C: GET handler tenant enforcement (FYD_SITE_OVERLAY only) ---
rep(
"""    if (req.method === "GET" && path.startsWith("/events/")) {
      const stream = decodeURIComponent(path.slice("/events/".length));
      const limit = Math.max(1, Math.min(10000, parseInt(url.searchParams.get("limit") || "1000", 10) || 1000));
      const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0);
      const all = loadEvents().filter((e) => e.event_type === stream);
      const page = all.slice(offset, offset + limit);
      send(res, 200, { events: page, stream, count: page.length, limit, offset });
      return;
    }""",
"""    if (req.method === "GET" && path.startsWith("/events/")) {
      const stream = decodeURIComponent(path.slice("/events/".length));
      const limit = Math.max(1, Math.min(10000, parseInt(url.searchParams.get("limit") || "1000", 10) || 1000));
      const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0);
      if (stream === "FYD_SITE_OVERLAY") {
        // Tenant enforcement on READ: no tenant context = fail closed.
        const tenant = url.searchParams.get("tenant");
        if (!isValidTenantId(tenant)) {
          send(res, 400, {
            error: "tenant_required",
            detail: "a valid ?tenant=<tenant_id> query param is required to read FYD_SITE_OVERLAY",
          });
          return;
        }
        const all = loadEvents().filter(
          (e) => e.event_type === stream && tenantIdOf(e) === tenant,
        );
        const page = all.slice(offset, offset + limit);
        send(res, 200, { events: page, stream, count: page.length, limit, offset, tenant });
        return;
      }
      const all = loadEvents().filter((e) => e.event_type === stream);
      const page = all.slice(offset, offset + limit);
      send(res, 200, { events: page, stream, count: page.length, limit, offset });
      return;
    }""")

# --- D: POST handler tenant validation ---
rep(
"""      const event_type = doc && typeof doc.event_type === "string" ? doc.event_type.trim() : "";
      const event_data = doc && typeof doc.event_data === "object" && doc.event_data !== null ? doc.event_data : null;
      if (!event_type || !event_data) {
        send(res, 400, { error: "event_type (string) and event_data (object) are required" });
        return;
      }""",
"""      const event_type = doc && typeof doc.event_type === "string" ? doc.event_type.trim() : "";
      const event_data = doc && typeof doc.event_data === "object" && doc.event_data !== null ? doc.event_data : null;
      if (!event_type || !event_data) {
        send(res, 400, { error: "event_type (string) and event_data (object) are required" });
        return;
      }
      // Tenant enforcement on APPEND (FYD_SITE_OVERLAY): the envelope's
      // tenant_id is immutable and must agree with aggregate_id and
      // event_data.siteId. A spoofed envelope is refused, never stored.
      const tenant_id = doc && typeof doc.tenant_id === "string" ? doc.tenant_id.trim() : "";
      if (event_type === "FYD_SITE_OVERLAY") {
        if (!isValidTenantId(tenant_id)) {
          send(res, 400, {
            error: "tenant_required",
            detail: "FYD_SITE_OVERLAY events require a valid tenant_id (the site id)",
          });
          return;
        }
        const agg = typeof doc.aggregate_id === "string" ? doc.aggregate_id : null;
        if (agg !== null && agg !== "fyd-site:" + tenant_id) {
          send(res, 400, {
            error: "tenant_mismatch",
            detail: "aggregate_id does not belong to tenant_id",
          });
          return;
        }
        if (event_data.siteId !== tenant_id) {
          send(res, 400, {
            error: "tenant_mismatch",
            detail: "event_data.siteId does not match tenant_id",
          });
          return;
        }
      }""")

# --- E: store tenant_id on the record ---
rep(
"""      const rec = {
        event_id: mintId("fyd-ovl"),
        timestamp: new Date().toISOString(),
        event_type,
        aggregate_id: typeof doc.aggregate_id === "string" ? doc.aggregate_id : null,
        aggregate_type: typeof doc.aggregate_type === "string" ? doc.aggregate_type : null,
        event_data,
        request_id: requestId,
      };""",
"""      const rec = {
        event_id: mintId("fyd-ovl"),
        timestamp: new Date().toISOString(),
        event_type,
        tenant_id: isValidTenantId(tenant_id) ? tenant_id : null,
        aggregate_id: typeof doc.aggregate_id === "string" ? doc.aggregate_id : null,
        aggregate_type: typeof doc.aggregate_type === "string" ? doc.aggregate_type : null,
        event_data,
        request_id: requestId,
      };""")

io.open(path, "w", encoding="utf-8").write(src)
print("server.mjs edited OK")
