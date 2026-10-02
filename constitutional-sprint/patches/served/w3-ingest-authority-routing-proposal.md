# PROPOSAL — route the remaining ingest-authority bypasses through CanonicalizationService
**Worker:** W3. **Status:** PROPOSAL ONLY. Nothing applied, no commits, no live-runtime mutations.
**Findings:** F276, F277 (consumed: F144/CP-1 runner-up, F246; dedupe: Agent 01 owns `POST /events` — `patches/agent01-event-authority/CP-1-single-ingest-authority.md` is referenced, NOT duplicated here).
**Applies to (sprint worktree only):** `/home/nolan/projects/ping-constitutional` (`gateway/routes/canonical_events.js`, `gateway/routes/identities.js`, `gateway/canonical_event_envelope.js`). **Never applies to:** `/home/nolan/ping` (live runtime — propose-only always).

---

### WHY
After Agent 01's `/events` proposal, two HTTP ingest paths still bypass `CanonicalizationService`:

1. **`POST /canonical-events`** (`gateway/routes/canonical_events.js:29`, mounted `bootstrap:687`) → `executeEmitEvent` (`gateway/canonical_event_envelope.js:206`) mints its own receipt identity (UUID v5 over tenantId/type/timestamp/sequence — `canonical_event_envelope.js:130-147`), per-tenant MAX+1 receipt sequence, and inserts into `canonical_events` with a tenant CLAIM ("unverified here") — no `authorizeNamespace`, no `canonicalizeAndEmit`. The file itself declares this a "RECEIPT surface, not an acceptance authority" (`canonical_event_envelope.js:222-236`): constitutional identity/order/namespace arrive only IF the row later converges through `UnifiedEventRuntime.emit()` via the EventBridge 5s poll. That is a boundary bypass in time: rows are journaled before namespace authorization is decided (F276).
2. **`POST /identities`** (`gateway/routes/identities.js:178`, `OBJECT_CREATED`, mounted `bootstrap:683`) → direct `eventRuntime.emit`, skipping `authorizeNamespace`/`canonicalizeAndEmit` (AGENT01-EVENT.md W-4). The most authority-sensitive events (identity creation) take the least-gated path (F277).

### EVIDENCE
- AGENT01-EVENT.md §2.1 writers table: W-4 (`identities.js:178` → EMIT), W-3 (the sovereign: `canonicalization_service.js:143` `canonicalizeAndEmit`).
- AGENT01-EVENT.md §2.3 writers table: C-1..C-6 — six live callers through `executeEmitEvent`: the four business authorities (`ai_workspace_authority.js:88`, `review_authority.js:78`, `project_authority.js:150,197,301`, `customer_authority.js:541`), the route (C-5), the business-profile adapter (C-6).
- Forensics copy `~/workspace/forensics/transfer-2026-09-19/canonical_event_envelope.js:206-250`: `executeEmitEvent` destructure → receipt `generateEventId` → `MAX+1` sequence → direct `INSERT INTO canonical_events`; comments :222-236 state receipt semantics explicitly.
- Agent 01's §4 recommendation + proposal already define the authority contract: `CanonicalizationService` owns namespace auth + canonical envelope construction at the boundary; `UnifiedEventRuntime.emit` stays the sole durable-append primitive (write-gate rule 5: no EventAuthorityV2, no second store).
- Caveat: `routes/canonical_events.js:29` and `routes/identities.js:178` were not re-read from core source tonight (no Pig/core access in this subagent scope); evidence is AGENT01-EVENT.md + forensics copies. The seam points below are stable across copies because they are the only emit-adjacent call sites per those inventories.

### MINIMUM CHANGE
1. **`gateway/routes/identities.js:178`** — replace the direct `eventRuntime.emit(...)` with `canonicalizationService.canonicalizeAndEmit({ source, eventType: "OBJECT_CREATED", payload, namespace, ... })`. Fold the identity domain's namespace rule into `CanonicalizationService.authorizeNamespace`/`resolveNamespace` as a configured rule (same pattern Agent 01 proposes for `tenant::<id>`), not a route-level fork.
2. **`gateway/canonical_event_envelope.js:206`** (`executeEmitEvent` entry) — becomes a pre-canonicalization producer stage, not an identity minter: business authorities pass `{ tenantId, eventType, source, actor, payload, causationId, correlationId, metadata }` into `canonicalizeAndEmit` with a business-event namespace rule; the receipt INSERT into `canonical_events` is retained as a durable receipt log but stores the canonical `event_id` + canonical namespace RETURNED by the authority instead of minted receipt identities that must be rebound at convergence.
3. **`gateway/routes/canonical_events.js:29`** — passes the route body through the same `executeEmitEvent`-as-stage path (one call site, no new fork).
4. No new authority, no second store, no change to `UnifiedEventRuntime.emit` (the sole append primitive). EventBridge convergence keeps working: rows now converge with canonical identities already attached, so the bridge's receipt→canonical rebinding becomes a no-op for new rows.

### TEST
- Replay the 2026-09-16/17 probe matrix against a staging gateway, extended: malformed business-event namespace → 403; valid `ai_workspace_authority` emit → 200 + canonical `event_id` in BOTH `canonical_events` (receipt) and `ping_events` (canonical) with the same id — no rebinding at bridge time.
- `POST /identities` OBJECT_CREATED → row in `ping_events` with `canonicalizeAndEmit`-minted identity; duplicate identity POST → `ON CONFLICT (event_id) DO NOTHING` idempotency (no duplicate row, no handler re-fire).
- Existing route tests for `/canonical-events` and `/identities` (if any) updated to assert the canonicalization-service path; the C-1..C-4 in-process emitters are covered by the same namespace-rule config as their HTTP equivalents.

### RESULT
- All three HTTP ingest paths (`/events` via Agent 01, `/canonical-events`, `/identities`) share ONE decider: `CanonicalizationService` at the boundary; `UnifiedEventRuntime.emit` remains the single durable-append spine. No temporal bypass: namespace authorization is synchronous at ingress, and secondary tables store the authority's verdict instead of minting their own identities first.
- F144/CP-1 runner-up closes; F276/F277 remediated; F279 class 2 (secondary journals as temporal bypass) closed as a pattern.
- Open question for coordinator (shared with Agent 01's proposal): whether the BFF normalization adapters and the `canonical_events` receipt table stay as permanent journal infrastructure (recommended: yes — receipt logs are journals, not authorities; the defect was minting identities in them, not logging through them).

### What currently bypasses and what it costs
| Path | Bypass | Cost |
|---|---|---|
| `POST /canonical-events` → `executeEmitEvent` | Receipt UUID identity, per-tenant MAX+1 sequence, tenant claim unauthed at ingress; canonicalization deferred to EventBridge | Two identity schemes per event; rows readable pre-authorization; async rebinding at convergence |
| `POST /identities` → direct `emit` | Skips `authorizeNamespace`/`canonicalizeAndEmit` entirely | Identity-creation events (highest authority sensitivity) have the weakest gating; "journaled = canonicalized" is a false guarantee for them |
| (for context, Agent 01) `POST /events` → direct `emit` | Skips namespace auth + canonical envelope | Covered by `patches/agent01-event-authority/CP-1-single-ingest-authority.md` |
