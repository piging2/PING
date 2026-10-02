// AuthenticatedPingClient: authenticated reads only. No operator mutations.
//
// This follows the ACTIVE ADR (section 6.1) as the authority: the
// authenticated client is read-only; mutation constructors live on
// OperatorPingClient as human-gated authority requests. Event emission and
// mission creation are real gateway operations (POST /events,
// POST /missions, auth'd) but they are not exposed here until a contract
// change is explicitly reviewed (activation section 0; Nolan confirmed
// 2026-09-17 that the authenticated tier stays read-only).
//
// Operation table provenance (2026-09-17): derived from the static gateway
// route inventory (docs/gateway-route-inventory-2026-09-17.md). The auth
// GET families are PROVEN by live probes from authorized environments;
// nothing is WIRED from the contract-repo host. Removed in this revision:
// getEventStats (/events/stats) and getRecentEvents (/events/recent) were
// never evidenced and are no longer wrapped; listTenantMissions carried an
// unevidenced tenant query param implying per-tenant scoping the backend
// does not prove (ADR boundary A).

import { PublicPingClient } from "./public-client.mjs";

const AUTHED_READ_OPERATIONS = Object.freeze([
  { op: "listMissions", method: "GET", path: "/missions", capability: "mission.read (PROPOSED)", surface: "AUTHENTICATED", authSurface: "auth", routeProof: "PROVEN", note: "MissionRuntime over ping_missions; lifecycle created -> assigned -> running -> completed/failed -> archived" },
  { op: "getMission", method: "GET", path: "/missions/:id", capability: "mission.read (PROPOSED)", surface: "AUTHENTICATED", authSurface: "auth", routeProof: "PARTIAL", note: "list is PROVEN; detail route shape not separately evidenced outside the ORCA family" },
  { op: "listEvents", method: "GET", path: "/events", capability: "event.read (PROPOSED)", surface: "AUTHENTICATED", authSurface: "auth", routeProof: "PROVEN", note: "proven read/write split: readers may see repository_events with ping_events fallback" },
  { op: "getEvent", method: "GET", path: "/events/:id", capability: "event.read (PROPOSED)", surface: "AUTHENTICATED", authSurface: "auth", routeProof: "PROVEN" },
  { op: "getEventDescendants", method: "GET", path: "/events/:id/descendants", capability: "event.read (PROPOSED)", surface: "AUTHENTICATED", authSurface: "auth", routeProof: "PROVEN", note: "full causal chain (verified 8-deep live 2026-09-12)" },
  { op: "getEventAncestors", method: "GET", path: "/events/:id/ancestors", capability: "event.read (PROPOSED)", surface: "AUTHENTICATED", authSurface: "auth", routeProof: "PROVEN" },
  { op: "getCorrelation", method: "GET", path: "/events/correlation/:id", capability: "event.read (PROPOSED)", surface: "AUTHENTICATED", authSurface: "auth", routeProof: "PROVEN", note: "correlation is a derived grouping, never run identity" },
]);

export class AuthenticatedPingClient extends PublicPingClient {
  #token;

  constructor(transport, token) {
    super(transport);
    if (!token || typeof token !== "string")
      throw new TypeError("AuthenticatedPingClient requires a bearer token");
    this.#token = token;
  }

  /** Mission list. Enforcement is the gateway's, not this client's. */
  listMissions(params = {}) {
    return this._authedGet("/missions", { limit: params.limit, offset: params.offset });
  }

  getMission(id) {
    if (!id) throw new TypeError("mission id is required");
    return this._authedGet(`/missions/${encodeURIComponent(id)}`);
  }

  listEvents(params = {}) {
    return this._authedGet("/events", { limit: params.limit, offset: params.offset, type: params.type });
  }

  getEvent(id) {
    if (!id) throw new TypeError("event id is required");
    return this._authedGet(`/events/${encodeURIComponent(id)}`);
  }

  getEventDescendants(id) {
    if (!id) throw new TypeError("event id is required");
    return this._authedGet(`/events/${encodeURIComponent(id)}/descendants`);
  }

  getEventAncestors(id) {
    if (!id) throw new TypeError("event id is required");
    return this._authedGet(`/events/${encodeURIComponent(id)}/ancestors`);
  }

  getCorrelation(correlationId) {
    if (!correlationId) throw new TypeError("correlation id is required");
    return this._authedGet(`/events/correlation/${encodeURIComponent(correlationId)}`);
  }

  // Internal: authenticated GET. Still GET-only; the parent's _readVia
  // hard-rejects any other method.
  _authedGet(path, query) {
    return this._readVia("GET", path, query, this.#authHeaders());
  }

  #authHeaders() {
    return { Authorization: `Bearer ${this.#token}` };
  }

  /** The token is never printed, logged, or serialized. */
  toJSON() {
    return { trustSurface: this.trustSurface, readOnly: true, token: "[redacted]" };
  }

  /** All operations this client can express: public ops plus authed reads. */
  describe() {
    return [...super.describe(), ...AUTHED_READ_OPERATIONS.map((o) => ({ ...o }))];
  }

  get trustSurface() {
    return "AUTHENTICATED";
  }
}
