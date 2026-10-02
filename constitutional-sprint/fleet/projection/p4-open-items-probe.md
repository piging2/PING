# P4 OPEN-ITEMS PROBE — AGENT-04 Projection + Retrieval leftovers

**Probe:** AGENT-04 OPEN ITEMS (bounded semantic-audit probe)
**Date:** 2026-09-24 ~05:10-05:35 MDT
**Mode:** READ-ONLY on all repos. COMMITS CREATED: NONE. No repo modified, no process touched, no secret values printed.
**Bases:** (a) LIVE CORE `/home/nolan/ping` (read-only; propose-only); (b) SERVED checkout `/home/nolan/projects/ping` @ `e48ef710` (read-only); (c) local program state `~/workspace/constitutional-sprint/`.
**Transport:** stdin-fed SSH to Pig WSL (`ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -s'`), passive `grep`/`sed`/`git` reads only.
**Prior reads:** `agent04-projection-retrieval/PROJECTION-RETRIEVAL.md` (F74-F77, V5, open items), `FINDINGS-LOG.md` (F76 at line 275), `agent14-semantic-knowledge/SEMANTIC-KNOWLEDGE.md` (F137-F143), `AUTHORITY-MAP.md`, `WRITER-OWNERSHIP.md`, `patches/agent04-projection-retrieval/PROPOSAL-qdrant-single-writer.md`.
**Finding IDs:** provisional W4-F1..W4-F4 (coordinator assigns canonical F-numbers on merge).

---

## TARGET 1 — AUTH ON /knowledge/nodes (served checkout) → **UNGATED (route absent in served checkout; still UNGATED at the gateway, unchanged since audit)**

**Verdict W4-F1:** The served checkout (`/home/nolan/projects/ping` @ `e48ef710`) contains **no `/knowledge/nodes` route at all** — it is a Next.js FYD website repo; the knowledge routes live exclusively in the external PING gateway, which is not present in that checkout. The one route that exists is `/home/nolan/ping/gateway/routes/knowledge.js` in the live core, and it remains **UNGATED**: no auth middleware at the mount or in the route file. `git status` shows `gateway/routes/knowledge.js` **unmodified** since the audit — the only dirty core files are `gateway/package-lock.json`, `gateway/package.json`, `ping-runtime/orchestration/execution/capability_registry.json`, and `tools/fyd-site-projection/dump.py`.

**File:line evidence:**
- `cd /home/nolan/projects/ping && find src/app/api -iname "*knowledge*"` → empty (no knowledge API routes in the served tree).
- `grep -rli "knowledge" src/app/api/` → empty; `grep -rln "knowledge/nodes\|knowledge/search" src/` → empty (served app never calls the knowledge routes).
- `src/middleware.ts` (served checkout): routing/page-disable middleware only — `DISABLED_PAGE_PREFIXES` 404s; explicitly states "API routes are never page-disabled". Zero auth logic.
- Live core: `grep -n -i "auth\|middleware" gateway/routes/knowledge.js` returns only comment text ("...boundary and is required — every result carries evidence + verification."). No auth middleware import, no `app.use` at mount. Confirms AGENT-04's observation (mount `gateway_runtime.js:798`).
- `git status --short` in `/home/nolan/ping`: knowledge route file clean.

**Classification:** UNGATED. Exploitability context (unchanged from F137/F74): `POST /knowledge/nodes` writes candidate nodes with caller-supplied fields and no `sourceEventId`; `hybrid_search.js:98` serves them `verified: true`. Auth state was not proven present by AGENT-04 ("no auth middleware observed") and nothing since has added it.

---

## TARGET 2 — DERIVED-NAMESPACE DECISION (PROPOSE ONLY)

**Context:** F76 (FINDINGS-LOG.md:275): `ProjectionWorker` journals `PROJECTION_CREATED` into sovereign `ping_events` (`canonical_workers.js:182-185`); it is embedded by Writer A; retry duplicates rows (wall-clock timestamp → distinct content-hash IDs). Journal mixes source and derived events, distinguishable only by the `event_type` string.

**One-authority proposal (propose only, no mechanism built):**

The derived-namespace decision is owned by **IdentityAuthority** — the authority that already owns event identity ("IdentityAuthority = event identity owner", standing PING authority law, MEMORY.md).

**Rationale:** Whether a row is a *source event* or a *derived event* is a question of event identity/classification, not of storage mechanics. Assigning it to UnifiedEventRuntime (acceptance) would conflate "accepted" with "sovereign source"; assigning it to CanonicalAuthority (canonical hash) would conflate "hash-verified" with "source-of-truth". IdentityAuthority is the only existing authority whose jurisdiction is "what kind of event is this".

**What changes (minimal, proposal only):**
1. IdentityAuthority maintains a typed event-type registry with a `DERIVED` classification (today it exists only implicitly as the `event_type` string).
2. `ProjectionWorker`'s `PROJECTION_CREATED` (and any future worker-derived types) is emitted classified `DERIVED` — e.g. metadata flag `derivation: { kind: "worker-projection", upstreamEventId }` — not as a bare sibling of source types.
3. Journal consumers that require source-only truth (`EvidenceAuthority.verify`, replay scope, INDEXABLE_TYPES policy) filter on the DERIVED classification deterministically.

**What stays:**
- `ping_events` remains the **one sovereign journal** — UnifiedEventRuntime keeps accepting derived rows. No separate derived-events table is created (a second journal would create a second canonical authority, which this proposal explicitly rejects).
- The worker still journals `PROJECTION_CREATED` (audit trail of the projection act); coverage via Writer A is preserved.
- Retry-dedup improvement rides on the DERIVED classification: dedupe key becomes `(derivation.upstreamEventId, event_type)` instead of the current wall-clock-timestamp hash.

Full text: `patches/p4-open-items-probe/PROPOSAL-derived-namespace-ownership.md`.

---

## TARGET 3 — dump.py PROVENANCE + MAX-AGE BOUND (PROPOSE ONLY)

**W4-F3a — The uncommitted modification (diff obtained, `/home/nolan/ping`, `tools/fyd-site-projection/dump.py`, +87/-9):**

The dirty working copy is v1.1.0 vs committed v1.0.0 (`index 100227c95..1be13ead0`). It adds a **presentation-intent layer** to the dump:
- New overlay op kinds `set_presentation_intent` / `clear_presentation_intent`, validated strictly (fail-closed: `intentId`, `siteIntent.kind`, `proposal.proposalDigest`, approval block with `proposalDigest`/`approvedBy`/`approvedAt`/`note`; approval digest must equal proposal digest; approval note must contain the "DEMO OWNER MODE" marker).
- Presentation intents accumulate in a journal-ordered list (upsert by `intentId`), **never merged into the object graph** — emitted as a separate `presentationIntent: { directives, provenance }` block in the projection JSON.
- `meta.presentationIntentDigest` = sha256 over the canonicalized intent block, mirroring `graphDigest`.
- `DUMPER_VERSION` bumped to `fyd-projection-dump@1.1.0`. On-disk live projections carry `dumperVersion: fyd-projection-dump@1.1.0` — the LIVE served projections were produced by this **uncommitted** code, confirming AGENT-04's §5 drift note.

**W4-F3b — Max-age/freshness bound: still NONE.**

- dump.py writes `meta.dumpedAt` (already present at v1.0.0) but no max-age constant, no config, no read-side age check exists. `SITES` config (`dump.py:87-97`) has `fixture`, `generatedAt`, `eventSequences` — no age bound.
- The served read seam (`ping-object-source.ts`) verifies `graphDigest` + `presentationIntentDigest` (tamper) but not age (F77, unchanged).
- Invocation is still manual (no cron/scheduler references `fyd-projections` in the live core; re-verified by grep in the served checkout too — no references).

**W4-F3c — Smallest ownership + max-age-bound patch (PROPOSE ONLY):**

- **Ownership:** the projection-schema contract is owned by the projection lane (WRITER-OWNERSHIP: agent04-projection owns "dump-projection, projectors" paths). The dumper (dump.py) and its read-seam verifier (ping-object-source.ts) are one contract — both change in one proposal, one owner.
- **Minimum change (drafted, not applied):** add `maxAgeSeconds` to the per-site `SITES` config in dump.py (default 86400, overridable), emit it as `meta.maxAgeSeconds`; the read seam (`ping-object-source.ts`, after digest verification passes) computes `now - meta.dumpedAt > meta.maxAgeSeconds` and exposes `stale: true` on the projection view (fail-soft badge on the public page; Ask-FYD seam may escalate to fail-closed). No cron, no scheduler, no re-run cadence change — the bound is a *signal*, not a trigger.
- **Left open for the coordinator (deliberately not decided here):** who owns re-running dump.py (the F77 dual-truth cadence question) and whether Ask FYD should fall back to D1 when the journal is dark. The signal patch does not preempt those calls.

Full text: `patches/p4-open-items-probe/PROPOSAL-dump-max-age-bound.md`.

---

## TARGET 4 — QDRANT SINGLE-WRITER STATUS → **STILL-OPEN**

**Verdict W4-F4:** `PROPOSAL-qdrant-single-writer.md` is **still unapplied** and **no new writer has appeared**.

**Evidence:**
- The direct-Qdrant block in `ProjectionWorker.handle` is intact at `ping-runtime/workers/canonical_workers.js:190-209` (`this._embeddingService.projectToQdrant({ id: event.event_id, ... })` at :193) — byte-equivalent to the version the proposal diffs against (the `PROJECTION_CREATED` journal emit at :182-185 is also intact).
- `grep -rn "projectToQdrant" --include='*.js' ping-runtime/ gateway/` (live core) shows exactly the two known live writers and nothing else:
  - `embedding_service.js:134` — Writer A (`EmbeddingService.subscribe`, emit path);
  - `canonical_workers.js:193` — Writer B (`ProjectionWorker.handle`, direct path);
  - plus non-live references only: `gateway/test_phase0_fixes.js:269` (test stub) and `gateway/archive/qdrant_integration.js:5` (archive doc comment).
- The served checkout (`/home/nolan/projects/ping`) has **zero** `projectToQdrant` callers — it contains no gateway/runtime code, so it cannot have added a writer.
- Minor drift noted (not a status change): the worker's emitted payload timestamp now reads `constitutionalTimeAuthority.nowAsISOString()` instead of the raw wall-clock call AGENT-04 cited; retry dedup is still absent (still wall-clock-derived IDs), so the F76 retry-duplicate mechanism is unchanged.

**Classification:** STILL-OPEN. The existing proposal remains the correct remedy; nothing has superseded it or made it stale.

---

## Scope notes

- Target 1 turned out to be a scope-check as much as a probe: the "served checkout" is the FYD website, not the gateway, so the knowledge routes cannot be gated there by construction. The real auth surface is the core gateway — verified unchanged and still unauthenticated at the route/mount layer.
- Target 3's diff (+87/-9) is larger than a probe ideally reads, but it is one coherent feature (presentation-intent layer), so it is reported in full rather than sampled.
- No target expanded beyond its bounds. All four completed within probe scope.
