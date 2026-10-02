# LANE I — MCP EDGE

Status: PROVEN (spike scope: stdio MCP server + 3 lane-S capabilities + red-team; integration into the PING repo is NEXT and needs coordinator convergence)

## Ledger
- RESEARCHED: 2026-09-23 — charter (OWNERSHIP.md). P2, bounded: must not steal P0 effort.
- RESEARCHED: 2026-09-23 — PING repo (read-only, Pig): no MCP server exists. Only node_modules MCP hit is Playwright's own (browser automation), not a PING MCP server. No @modelcontextprotocol dep in package.json.
- RESEARCHED: 2026-09-23 — reuse candidates found in repo: `src/fyd/customize/propose.ts` (proposeSitePatch, SitePatchBody, digest-bound; stale proposal = 409), `src/fyd/customize/owner-proposal.ts` (compile -> draft -> approve -> apply -> replay; capability verdict gate; proposals are DATA not mutations), `src/fyd/ask/envelope.ts` (Ed25519 signed envelope kit, sha256-canonical-json-v1 serializer pin), `src/fyd/ask/concierge.ts` (ConciergeGrade SUPPORTED/DERIVED/INFERRED/UNKNOWN), `src/fyd/owner-mode/visibility-policy.ts`, `src/fyd/capabilities/runtime.ts`.
- DESIGNED: 2026-09-23 — MCP-EDGE-DESIGN.md (6-tool surface, auth tiers, hard boundaries, result envelope, red-team).
- HARVESTED: 2026-09-23 — HARVEST-REPORT.md: @modelcontextprotocol/sdk ADOPT-for-framing, fastmcp-TS REJECT, hand-rolled JSON-RPC REJECT, Python SDK REJECT. Vendor veto gate run (Nolan 2026-09-23): no trigger fires; small mature library, no CEO approval needed; import into PING repo still needs coordinator convergence.
- IMPLEMENTED: 2026-09-23 — spike/search-objects: read-only search_objects against synthetic data, viewer-scoped, capped pagination, envelope with claim bindings + evidence refs + result digest. Run: `node spike/search-objects.mjs`. TESTED: 2026-09-23 — all 15 assertions passed (visibility scoping, secret stripping, injection-as-data, caps, determinism, invalid-input rejection).
- IMPLEMENTED: 2026-09-23 — spike/mcp-edge: real MCP server over stdio via @modelcontextprotocol/sdk 1.30.1 (installed in the spike dir only — experimentation per Nolan's vendor-veto standing decision; NOT imported into the PING repo). edge.mjs (registry + resolution + per-call auth + envelopes + proposals + approval binding), tools.mjs (one tool per resolved lane-S record), server.mjs (stdio, principal bound at spawn). Run: `cd spike/mcp-edge && node proof.mjs`.
- TESTED: 2026-09-23 — proof.mjs 19/19: discovery scoping, authorized read, forbidden calls with exact rules (visibility.owner.no-leak generic; visibility.owner; grant.missing), approval-bound proposal draft, forbidden registrations (raw DB, secret args, secret params, duplicates, candidates), TOCTOU re-check, approval digest binding + single-use + replay refusal, stale-base 409, idempotency, timeouts, rate-freeze. Determinism verified: identical calls => identical result_digest.
- TESTED: 2026-09-23 — redteam.mjs 10/10: RT1 description injection sanitized at registration (+RT1b poisoned result data causes no action), RT2 argument smuggling rejected at wire + edge (strict zod), RT3 confused deputy (args-principal ignored both directions), RT4 approval replay refused (digest-mismatch + already-consumed), RT5 tool impersonation rejected (name-conflict, dead-capability ride, no shadow duplicates).
- STANDING (Nolan 2026-09-23, binding): connector credentials QUEUED FOR MORNING — no live credentials in this lane tonight; fixtures/synthetic only. Nolan picks the real account tomorrow. Auth model uses lane-L capability handles; connect flow design deferred to morning queue.

## Current position
Design complete and spike-proven on synthetic data. The edge is deliberately thin: PING keeps all authority (identity, events, search via lane F, capability verdicts via owner-mode, proposals via the OwnerProposal loop). The MCP server is a protocol translator, never an authority.

## Integration points (coordinate, never duplicate)
- Lane F (object search): search_objects must consume lane F's search authority when wired live; this spike is synthetic-only, not a second search implementation.
- Lane G (context compiler): tool result envelope mirrors the claim-binding discipline (grades SUPPORTED/DERIVED/INFERRED/UNKNOWN from concierge.ts). Lane G's ContextPacket is the deeper consumer; MCP envelope is its tool-shaped sibling.
- Lane L (secret broker): auth model assumes lane L capability handles; the MCP edge must never hold tokens.
- Lane J (observability): every tool call must emit source/run/call/tool/principal/started/finished/status/errors/rate-limited/bytes records.

## NEXT
1. Wire read tools to lane F's search authority when lane F proves it (do not build a parallel search); wire proposal tools to the real OwnerProposal loop (src/fyd/customize/owner-proposal.ts) instead of the spike-local proposal store.
2. Draft the remaining 3 tool adapters against the design doc (ping_get_object, ping_get_evidence, ping_get_relationships, plus propose_site_patch) as uncommitted spikes in this lane only — reusing the edge.mjs registry/envelope machinery proven tonight.
3. Integration request to coordinator when a live read-only MCP edge is wanted: transport choice (stdio vs gateway HTTP), lane-L handle plumbing for session principals, lane-J audit wiring (auditLog[] is the seam), Ed25519 proof signing per envelope.ts.
4. Do NOT import the SDK into the PING repo until coordinator approves (decision here is ADOPT-for-framing; the import needs a transport home). The spike's node_modules stays in spike/mcp-edge/ and out of the repo.
