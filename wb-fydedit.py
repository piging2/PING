import io

BASE = "/home/nolan/projects/ping"

def edit(path, pairs):
    src = io.open(BASE + path, encoding="utf-8").read()
    for old, new in pairs:
        assert src.count(old) == 1, "anchor not unique/found in %s: %r" % (path, old[:80])
        src = src.replace(old, new, 1)
    io.open(BASE + path, "w", encoding="utf-8").write(src)
    print("edited", path)

# ---------------------------------------------------------------- server.ts
edit("/src/fyd/customize/server.ts", [
# 1. import the tenant id pattern
(
'''import { UnknownOutcomeError } from "./write-boundary";''',
'''import { UnknownOutcomeError } from "./write-boundary";
import { TENANT_ID_PATTERN } from "../tenant/tenant-context";'''),
# 2. pre-send helper + preflight unreachable classification
(
'''async function preflightJournal(): Promise<void> {
  const base = gatewayUrl()
    .replace(/\\/events$/, "")
    .replace(/\\/$/, "");
  let res: Response;
  try {
    res = await fetch(base + "/", { method: "GET" });
  } catch (e) {
    throw new Error(
      "customize: WRONG_JOURNAL: journal identity unreadable at " + base + "/: " +
        (e instanceof Error ? e.message : String(e)),
    );
  }''',
'''/**
 * Connection-level failures (nothing answered): there is no journal to
 * misidentify, so these are NOT WRONG_JOURNAL. Returns the errno code, or
 * null when the failure happened after bytes were sent.
 */
function isPreSendError(e: unknown): string | null {
  const code = (e as { cause?: { code?: string } })?.cause?.code;
  return typeof code === "string" &&
    ["ECONNREFUSED", "ENOTFOUND", "EHOSTUNREACH", "ENETUNREACH"].includes(code)
    ? code
    : null;
}

async function preflightJournal(): Promise<void> {
  const base = gatewayUrl()
    .replace(/\\/events$/, "")
    .replace(/\\/$/, "");
  let res: Response;
  try {
    res = await fetch(base + "/", { method: "GET" });
  } catch (e) {
    const preSend = isPreSendError(e);
    if (preSend) {
      // Nothing listened: the honest error is "unreachable". WRONG_JOURNAL
      // means a journal answered with the wrong identity marker.
      throw new Error("customize: demo gateway unreachable at " + base + "/: " + preSend);
    }
    throw new Error(
      "customize: WRONG_JOURNAL: journal identity unreadable at " + base + "/: " +
        (e instanceof Error ? e.message : String(e)),
    );
  }'''),
# 3. reuse the helper in the emit catch (single predicate, no duplicate list)
(
'''  } catch (e) {
    // The request never reached the gateway (connection refused / DNS):
    // nothing was recorded, so the honest 502 path still applies.
    const cause = (e as { cause?: { code?: string } })?.cause;
    const code = typeof cause?.code === "string" ? cause.code : "";
    const preSend = ["ECONNREFUSED", "ENOTFOUND", "EHOSTUNREACH", "ENETUNREACH"].includes(code);
    if (preSend) {
      throw new Error("customize: demo gateway unreachable at " + gatewayUrl() + ": " + code);
    }''',
'''  } catch (e) {
    // The request never reached the gateway (connection refused / DNS):
    // nothing was recorded, so the honest 502 path still applies.
    const preSend = isPreSendError(e);
    if (preSend) {
      throw new Error("customize: demo gateway unreachable at " + gatewayUrl() + ": " + preSend);
    }'''),
# 4. immutable tenant_id on the envelope + siteId validation
(
'''  const envelope: Record<string, unknown> = {
    event_type: "FYD_SITE_OVERLAY",
    aggregate_id: "fyd-site:" + siteId,
    aggregate_type: "fyd_site",
    event_data: { siteId, ops },
  };''',
'''  // Tenant identity is immutable on the envelope: in this runtime the
  // tenant id IS the site id. The journal gateway re-validates it on
  // append (tenant_id vs aggregate_id vs event_data.siteId).
  if (!TENANT_ID_PATTERN.test(siteId)) {
    throw new Error(
      "customize: refusing to emit overlay for invalid site id " + JSON.stringify(siteId),
    );
  }
  const envelope: Record<string, unknown> = {
    event_type: "FYD_SITE_OVERLAY",
    tenant_id: siteId,
    aggregate_id: "fyd-site:" + siteId,
    aggregate_type: "fyd_site",
    event_data: { siteId, ops },
  };'''),
])

# ------------------------------------------------- ping-object-reader.ts
edit("/src/lib/ping/ping-object-reader.ts", [
(
'''    const res = await this.gwFyd(`/events/${encodeURIComponent("FYD_SITE_OVERLAY")}`);''',
'''    // Server-side tenant scoping: the gateway enforces ?tenant= exactly
    // (fail-closed without it). The event_data.siteId filter below stays
    // as defense in depth.
    const res = await this.gwFyd(
      `/events/${encodeURIComponent("FYD_SITE_OVERLAY")}?tenant=${encodeURIComponent(siteId)}`,
    );'''),
])

# ------------------------------------------------------- stub-journal.ts
edit("/src/app/api/fyd/ask/__tests__/stub-journal.ts", [
(
'''      if (req.method === "GET" && req.url === "/events/FYD_SITE_OVERLAY") {
        // Faithful to the live gateway's GET /events/:stream: raw
        // ping_events rows ({ event_id, timestamp, event_data }).
        const body = JSON.stringify({
          events: events.map((e) => ({
            event_id: e.id,
            timestamp: e.ts,
            event_type: "FYD_SITE_OVERLAY",
            event_data: { siteId: e.siteId, ops: e.ops },
          })),
        });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(body);
        return;
      }''',
'''      const u = new URL(req.url || "/", "http://127.0.0.1");
      if (req.method === "GET" && u.pathname === "/events/FYD_SITE_OVERLAY") {
        // Faithful to the live gateway: ?tenant= is required and enforced
        // server-side; only the requested tenant's events are returned.
        const tenant = u.searchParams.get("tenant");
        if (!tenant || !/^[a-z0-9-]{1,64}$/.test(tenant)) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "tenant_required" }));
          return;
        }
        // Faithful to the live gateway's GET /events/:stream: raw
        // ping_events rows ({ event_id, timestamp, event_data }).
        const body = JSON.stringify({
          events: events
            .filter((e) => e.siteId === tenant)
            .map((e) => ({
              event_id: e.id,
              timestamp: e.ts,
              event_type: "FYD_SITE_OVERLAY",
              tenant_id: e.siteId,
              event_data: { siteId: e.siteId, ops: e.ops },
            })),
        });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(body);
        return;
      }'''),
])

# ------------------------------------------------------ scoped-stores.ts
edit("/src/fyd/tenant/scoped-stores.ts", [
(
'''import {
  TenantContextError,
  assertTenantKey,
  type TenantContext,
} from "./tenant-context";''',
'''import {
  TenantContextError,
  assertTenantKey,
  type TenantContext,
} from "./tenant-context";
import {
  getFydTenantGraph,
  type FydTenantGraph,
  type GetFydTenantGraphOpts,
} from "@/fyd/data/fyd-tenant-graph";'''),
(
'''/**
 * Scoped Ask FYD: the question's siteId must equal the acting tenant.
 * The bundle loader inside answerAskFyd then loads only that tenant's data.
 */''',
'''/**
 * Scoped tenant-graph read: the acting tenant's key must equal the site id.
 * getFydTenantGraph already fails closed on unknown tenants; this adds the
 * explicit trusted-context requirement so request/worker paths cannot read
 * a tenant graph without a context. Cross-tenant reads are refused before
 * any I/O, never answered empty.
 */
export async function scopedGetFydTenantGraph(
  ctx: TenantContext,
  siteId: string,
  opts?: GetFydTenantGraphOpts,
): Promise<FydTenantGraph> {
  assertTenantKey(ctx, siteId);
  return getFydTenantGraph(siteId, opts);
}

/**
 * Scoped Ask FYD: the question's siteId must equal the acting tenant.
 * The bundle loader inside answerAskFyd then loads only that tenant's data.
 */'''),
])

print("ALL EDITS OK")
