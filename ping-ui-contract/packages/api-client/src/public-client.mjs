// PublicPingClient: read-only by construction.
//
// It is INCAPABLE of expressing operator mutations. There are no mutation
// request types, no mutation builders, and no method that issues a
// non-GET request. The single internal request path is a private method
// that asserts method === "GET" and is not reachable from the instance
// surface. Gateway authorization remains mandatory regardless; this is
// defense in depth, not the enforcement point.
//
// Operation table provenance (2026-09-17): derived from the static gateway
// route inventory (docs/gateway-route-inventory-2026-09-17.md), compiled
// from captured evidence only. No live gateway read has happened from the
// contract-repo host, so nothing here is WIRED. Auth-only routes
// (/missions, /events and their sub-routes) are NOT on this client; they
// belong to AuthenticatedPingClient. Routes the evidence does not support
// (e.g. /events/stats, /events/recent) are not wrapped anywhere.
//
// ADR boundary E: /ops/dashboard, /ops/system, /constitution and the /mc/*
// family are read-only-but-sensitive. Field-by-field exposure
// classification is PENDING; wrapping a route here does not approve
// rendering it on the public website.

const READ_OPERATIONS = Object.freeze([
  { op: "getHealth", method: "GET", path: "/health", capability: "projection.read (PROPOSED)", surface: "PUBLIC", authSurface: "public", routeProof: "PROVEN", exposure: "SAFE_PUBLIC" },
  { op: "getOpsHealth", method: "GET", path: "/ops/health", capability: "projection.read (PROPOSED)", surface: "PUBLIC", authSurface: "public", routeProof: "PROVEN", exposure: "SAFE_PUBLIC" },
  { op: "getOpsDrift", method: "GET", path: "/ops/drift", capability: "projection.read (PROPOSED)", surface: "PUBLIC", authSurface: "public", routeProof: "PROVEN", exposure: "SAFE_PUBLIC" },
  { op: "getOpsDashboard", method: "GET", path: "/ops/dashboard", capability: "projection.read (PROPOSED)", surface: "PUBLIC", authSurface: "public", routeProof: "PROVEN", exposure: "SENSITIVE_PUBLIC_CLASSIFICATION_PENDING", note: "route-by-route and field-by-field classification required before the public site renders it" },
  { op: "getOpsSystem", method: "GET", path: "/ops/system", capability: "projection.read (PROPOSED)", surface: "PUBLIC", authSurface: "public", routeProof: "PROVEN", exposure: "SENSITIVE_PUBLIC_CLASSIFICATION_PENDING" },
  { op: "getGovernanceStats", method: "GET", path: "/governance/stats", capability: "projection.read (PROPOSED)", surface: "PUBLIC", authSurface: "public", routeProof: "PROVEN", exposure: "CLASSIFICATION_PENDING" },
  { op: "getConstitution", method: "GET", path: "/constitution", capability: "projection.read (PROPOSED)", surface: "PUBLIC", authSurface: "public", routeProof: "PROVEN", exposure: "SENSITIVE_PUBLIC_CLASSIFICATION_PENDING" },
  { op: "getMissionControlIndex", method: "GET", path: "/mc/", capability: "projection.read (PROPOSED)", surface: "PUBLIC", authSurface: "public", routeProof: "PARTIAL", exposure: "SENSITIVE_PUBLIC_CLASSIFICATION_PENDING", note: "enumeration conflicted (R-5): scheduler/workers reads vs invoices/inboxes/follow-ups; both agree GET-only read-only-but-sensitive" },
  { op: "getSchedulerStatus", method: "GET", path: "/mc/scheduler", capability: "projection.read (PROPOSED)", surface: "PUBLIC", authSurface: "public", routeProof: "PROVEN", exposure: "CLASSIFICATION_PENDING", note: "status-read only; no /schedule, /cron, /jobs, /tasks routes exist" },
]);

export class PublicPingClient {
  #transport;

  constructor(transport) {
    if (!transport || typeof transport.request !== "function")
      throw new TypeError("PublicPingClient requires a gateway transport");
    this.#transport = transport;
  }

  // The only request path. Not enumerable on purpose; asserts GET so the
  // public surface is incapable of expressing a mutation even internally.
  _readVia(method, path, query, headers) {
    if (method !== "GET")
      throw new TypeError(`PublicPingClient is read-only by construction; refusing ${method}`);
    return this.#transport.request({ method: "GET", path, query, headers });
  }

  #get(path, query) {
    return this._readVia("GET", path, query);
  }

  getHealth() {
    return this.#get("/health");
  }

  getOpsHealth() {
    return this.#get("/ops/health");
  }

  getOpsDrift() {
    return this.#get("/ops/drift");
  }

  getOpsDashboard() {
    return this.#get("/ops/dashboard");
  }

  getOpsSystem() {
    return this.#get("/ops/system");
  }

  getGovernanceStats() {
    return this.#get("/governance/stats");
  }

  getConstitution() {
    return this.#get("/constitution");
  }

  getMissionControlIndex() {
    return this.#get("/mc/");
  }

  getSchedulerStatus() {
    return this.#get("/mc/scheduler");
  }

  /** The operations this client can express. Introspection for audits and tests. */
  describe() {
    return READ_OPERATIONS.map((o) => ({ ...o }));
  }

  get trustSurface() {
    return "PUBLIC";
  }

  get readOnly() {
    return true;
  }
}
