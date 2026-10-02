# W4 — Semantic Plane Rebuild: Four Executable Work Packages

**Worker:** W4 · **Date:** 2026-09-24 ~05:20 MDT · **Scope:** planning + work packages, NO live writes, no commits, no staging, zero live-runtime mutations.
**Numbers in force** (Agent 14, 2026-09-23, read-only): Qdrant `knowledge` = 389 points (202 ollama / 187 fallback = 48% noise); `canonical_hash` null on 364/389 (94%, 25 present); `projected_at` null on 389/389; KG = 206 nodes / 0 edges, all candidate (brain-postgres, fresh) + 68 stale nodes (ping-postgres `crx_runtime`, 2026-09-16, writer unknown); brain-qdrant 1.18.2 REST unauthenticated; ping-qdrant unreachable; `POST /knowledge/nodes|/edges` unauthenticated; `toQdrantId` hex-normalization collision theoretical; KG `node_id` = 64-bit content hash, key-order-dependent; no delete in `QdrantAdapter`; no rebuild job; no re-embed path; `KnowledgePromoter` starved (approval events never fire).
**Findings backing:** F280–F289 (this worker), consuming F137–F143, F245, W20-F4.

---

## Package 1 — Agent 04: canonical_hash backfill + re-embed path + rebuild job

**Objective.** Make every live `knowledge` point verifiable: `canonical_hash` populated on 100% of points (so `EvidenceAuthority.verify()` passes its hash check), the 187 PRNG-noise fallback vectors re-embedded from the real provider, and a rebuild job that can re-derive the whole collection from source truth — with a delete lifecycle so superseded points stop accumulating forever.

**Preconditions.**
1. Agent 01/04 verdict on WHERE `canonical_hash` is computed: emit time (event metadata) vs projection time (hash recomputed from stored canonical bytes). Blocker-class: projection-time recompute is only faithful if the hash function is deterministic over the canonical bytes of the stored event — requires the single CanonicalizationService authority (S3: currently PARTIAL, F144). Do not start the backfill until this is decided.
2. Identity decisions from Package 2 (Agent 05) are landed — point IDs may change under the new scheme; backfill must write the final IDs, not the legacy ones.
3. Ollama reachable and healthy (re-embed requires the embedding provider; `embedding:'fallback'` exists precisely because it wasn't).
4. Write surfaces hardened per Package 3 — the backfill/rebuild jobs run as the AUTHORIZED vector writer, not as anonymous REST calls (F287).
5. Read-only baseline snapshot: current point count, payload coverage counters (`canonical_hash` non-null, `embedding` ollama/fallback, `projected_at` non-null) — the acceptance gate compares against this.

**Exact scope.**
- `ping-runtime/embeddings/embedding_service.js` (`projectToQdrant`, `seededVector`, `_fallbackEmbed`, `projected_at`).
- `ping-runtime/search/qdrant_adapter.js` (ADD a `delete`/`deleteByFilter` method — the adapter's first destructive primitive; gate it behind the authorized-writer check from Package 3).
- One new backfill script (dry-run first, `--dry-run` default): recompute `canonical_hash` for the 364 starved points via the decided derivation, re-embed the 187 fallback points via Ollama, set `projected_at` to real timestamps (includes PATCH-01-projected_at, still NOT applied to live core).
- One new rebuild job (design doc + dry-run implementation): re-derive `knowledge` from `ping_events` (source of truth), diff against live collection, report orphan/stale/superseded points; defines the supersession rule (e.g., newer event of same aggregate type → mark old point `superseded`, then delete per the new delete path).
- Explicitly OUT of scope: constitutional_documents fossil (F142 — leave archived), constitutional_memory (leave aspirational), chunking (leave aspirational), the Python worker (dormant; no resurrection without a separate decision).

**Step-by-step plan.**
1. Land the Agent 01/04 emitter-vs-projection verdict on `canonical_hash` derivation; document the chosen function and its input bytes in the design doc.
2. Implement the derivation at the chosen layer; add a unit test that `verify()` passes on a freshly projected point.
3. Backfill dry-run over all 389 points: recompute hashes, list the 187 fallback candidates, output the diff; human (or authorized operator) reviews the diff — this is a mass write, it needs a named approver per standing rules.
4. Backfill apply: write `canonical_hash` to the 364 starved points (upsert by existing point ID; IDs do not change in this step).
5. Health-check Ollama; re-embed the 187 fallback points; assert `embedding:'ollama'` and vector ≠ seeded-PRNG output (recompute the seeded vector for the text and compare — must differ).
6. `projected_at`: write real ISO timestamps on all touched points (PATCH-01 goes live as part of this step).
7. Add `delete` to `QdrantAdapter` behind the authorized-writer check; define the supersession lifecycle in the design doc (what makes a point stale: newer event same aggregate → old point deleted or marked).
8. Rebuild job dry-run: full re-derivation from `ping_events` → diff vs live → orphan report (points whose `source_event_id` has no journal row). No live delete on first run; deletes are a separate approved action.
9. Re-run the retrieval probe (`POST /knowledge/search` + per-hit `verify()`) against the touched corpus.

**Proof of completion.**
- `canonical_hash` non-null = 389/389 (100%).
- `embedding:'fallback'` = 0 (or: only points whose source text is empty, explicitly listed).
- `projected_at` non-null on all points written after the change.
- Rebuild dry-run: re-derived set == live set (diff empty), or every diff row has a named explanation (orphan, superseded-pending-delete).
- Retrieval probe: `verify()` returns `verified:true` on 100% of returned hits (the F289 gate).
- No new writes went through an unauthenticated path (audit: all writes via the authorized writer from Package 3).

**Sequencing dependencies.** AFTER Package 2 (identity — point IDs must be final before mass backfill) and AFTER Package 3 (the jobs must be the authorized writer). Precondition 1 (Agent 01/04 canonical_hash verdict) is its own gate. CO-RUNS with Package 4 step 1–2 (generation reconciliation) since both read the same stores, but Package 4's promotion work needs Package 1's verify() leg passing first.

---

## Package 2 — Agent 05: toQdrantId + node ID remediation

**Objective.** Collision-safe, canonical-bytes-stable identity for semantic records: remediate `toQdrantId`'s lossy normalization, and replace the 64-bit content-derived KG node IDs (with their key-order-dependent serialization and silent-merge semantics) with an identity scheme anchored in the CP-9 decision.

**Preconditions.**
1. CP-9 stands: Authority A (constitutional IA, versioned envelope, undefined→null) wins for all new minting; Authority B is a frozen legacy-verification shim. (Agent 20, 2026-09-24, 80%+.)
2. Agent 05's digest-stability migration analysis for B-derived persisted IDs is complete — changing ID schemes must not silently rebind existing records.
3. Live inventory (read-only): enumerate all 389 point IDs + all 206 (+68 stale) node IDs; confirm zero actual collisions today (theoretical only so far).

**Exact scope.**
- `toQdrantId` (`embedding_service.js:38-42`): remediation for the strip-non-hex/zero-pad normalization. Minimum: assert-and-reject non-hex source IDs (fail closed) OR define a collision-free encoding for non-hex IDs (e.g., hash-prefix namespace). Decision owned by Agent 05; the live 389 are all hex, so this is forward-defense.
- KG `node_id` (`knowledge_graph.js:87-91`): replace `sha256(type:label:JSON.stringify(data))[0:16]` with (a) canonical-JSON serialization (fix the F8-class key-order dependence), (b) full 256-bit or 128-bit minimum output (end the 64-bit birthday risk), and (c) event-anchored identity — the current convention (`label` embeds `event_id.slice(0,12)`) becomes LAW: node identity derives from `source_event_id`, with content hash as a version/dedup signal, not the identity.
- The silent-merge semantic (`ON CONFLICT DO UPDATE`): explicit decision — keep (documented as upsert-by-content-version) or replace with versioned nodes + `SUPERSEDES` edges. No silent behavior left undocumented.
- The dormant Python worker's `str(uuid.uuid4())` chunk IDs (F142): declared broken-by-design; if that worker is ever resurrected, chunk IDs must be deterministic (`hash(document_id:chunk_index)`). Record the rule now so the design can't regress.
- Explicitly OUT of scope: minting new nodes under the old scheme once the decision lands (freeze date recorded).

**Step-by-step plan.**
1. Read-only inventory: all point/node IDs, collision check (0 expected), non-hex ID check (0 expected), duplicate `(type,label,data)` check (silent-merge exposure count).
2. Agent 05 decision record: winning derivation for point IDs and node IDs, with canonical-JSON spec and bit-length, referencing CP-9.
3. Migration design: old-ID → new-ID map; backfill writes BOTH (new ID as primary, old ID in payload as `legacy_id`) so `verify()` and citations survive the cutover; digest-stability analysis for any B-derived persisted IDs.
4. Freeze: no new records minted under the old scheme after the recorded freeze date.
5. Hand the final ID scheme to Package 1 (backfill writes final IDs) and Package 4 (generation reconciliation merges on final IDs).

**Proof of completion.**
- Decision record exists and cites CP-9; canonical-JSON spec referenced.
- Inventory proves 0 live collisions under both old and new schemes.
- Migration dry-run: old→new map complete for 389 points + 206 nodes; every new ID recomputes deterministically from its source (recompute check passes 100%).
- `verify()` and HybridSearch citations resolve through `legacy_id` during the transition window.

**Sequencing dependencies.** FIRST, alongside Package 3 (both are decision packages that constrain all later writes). Package 1 is blocked on its output. Package 4's merge/dedupe needs the final node-ID scheme.

---

## Package 3 — Agent 06: write-surface hardening (who may write vectors, failure semantics)

**Objective.** A closed, named set of authorized semantic-layer writers and explicit failure semantics for every one of them. Closes the F287 generic class: no store in the semantic plane accepts writes outside the canonical pipeline.

**Preconditions.**
1. Inventory is complete and PROVEN (Agent 14, F137/F287): brain-qdrant REST (unauth, all collections), `POST /knowledge/nodes`, `POST /knowledge/edges`, `EmbeddingService` (live vector writer), `KnowledgeGraph.addNode/addEdge` (live graph writer), root operator scripts (manual), direct psql (credential holders).
2. F137 hardening note (below) is reviewed — the Qdrant-auth decision is propose-only and needs a named approver before any live config change.
3. No live writes during the design phase (this package designs the gates; applying them is a separate approved action).

**Exact scope.**
- Authorized-writer matrix: WHO (service identity) × WHAT (vectors / graph nodes / graph edges / collection admin) × THROUGH WHICH PATH (journal-subscribed projection only; direct HTTP only for explicitly listed operator tooling with credentials).
- `POST /knowledge/nodes|/edges`: authN/authZ design (options: bearer-token middleware shared with the gateway's existing auth; or removal of the routes if no legitimate caller exists — Agent 14 found zero legitimate callers; removal is the cheapest hardening and is the recommended default, pending Agent 06's caller audit).
- `QdrantAdapter`: the new `delete` primitive from Package 1 is gated behind the authorized-writer check — the FIRST destructive vector primitive must not be the second unauthenticated one.
- Failure semantics table (fail-closed, typed): Qdrant unreachable → projection dead-letters + retries with backoff, never silently skips (today: zero Qdrant error lines in the log is GOOD, but there is no dead-letter proof — define it); Ollama unreachable → projection must either block (no point written) or write a point EXPLICITLY marked `embedding:'deferred'` that the re-embed job (Package 1) will pick up — never again write silent PRNG noise (F281); Postgres unreachable → graph projection dead-letters; `verify()` failure → `verified:false` + `rejected++` stays (honest), and repeated rejection rate becomes a Package-1 repair trigger.
- Explicitly OUT of scope: live credential rotation, live firewall/config changes (propose-only, see F137 note); the Python stack's dormant writers (stay dormant).

**Step-by-step plan.**
1. Caller audit: enumerate every caller of `POST /knowledge/nodes|/edges` and of brain-qdrant :6333 (logs, code grep). If zero legitimate callers → recommend route removal.
2. Write the authorized-writer matrix; name the service identities (not "the gateway" — the specific projection subscribers).
3. Design the auth mechanism for each surface (bearer middleware for the routes; API key for Qdrant per the F137 note options; credential scoping for operator scripts).
4. Write the failure-semantics table; add the `embedding:'deferred'` contract (replaces silent fallback) to the Package 1 design doc.
5. Define the audit proof: every future vector/graph write carries writer identity in the payload (`written_by`), so the NEXT forensic pass can verify the closed set.

**Proof of completion.**
- Matrix + failure table exist as a design artifact; caller audit shows the route-removal (or auth) decision with evidence.
- Dry-run: a probe against each surface demonstrates the gate (propose-only until the approver signs; the PROOF is the signed design + a staged config diff, not a live lockout).
- Package 1's backfill/rebuild jobs are registered in the matrix as the authorized writer before they run.

**Sequencing dependencies.** FIRST, alongside Package 2. Package 1's mass writes and Package 4's reconciliation writes are blocked until the matrix names them as authorized.

---

## Package 4 — Agent 13: the two node generations remediation

**Objective.** One live `knowledge_nodes` generation; the stale generation archived (not silently dropped); the candidate→knowledge promotion path either fed or explicitly retired by decision; edge semantics defined before any edge is ever written.

**Preconditions.**
1. Package 2's node-ID decision is landed (reconciliation merges on final IDs).
2. Package 3's writer matrix exists (reconciliation writes are authorized writes).
3. Read-only inventory of both generations: brain-postgres 206 (fresh) vs ping-postgres `crx_runtime` 68 (stale, 2026-09-16) — field-level diff, overlap count, writer-of-stale identified or declared UNKNOWN with evidence of the search.

**Exact scope.**
- Stale-generation writer identification (code grep for the `crx_runtime` writer; if unidentifiable, record UNKNOWN with the search evidence — do not assert).
- Reconciliation rule: the fresh generation wins; stale rows that have no counterpart in the fresh generation are exported (read-only dump) to an archive artifact, then the stale table is retired (propose-only; the archive is the proof nothing was destroyed — "archive before destroying").
- Promotion path decision: `KnowledgePromoter` is wired for `SNIPPET_APPROVED`/`AI_RESPONSE_ACCEPTED`, which never fire. Two options, Agent 13 + Nolan's call: (a) feed the loop — define WHO approves (human operator? owner?) and wire the emitter; (b) retire promotion by decision — all nodes stay `candidate` and consumers treat `candidate` as the terminal assessed state, with the decision recorded. "Wired but starved" is not a third option.
- Edge semantics: define the FIRST edge type before any edge is written (recommended: `SUPERSEDES` for the Package 1 stale-point lifecycle, and `DERIVED_FROM` for claim→observation links). `POST /knowledge/edges` stays gated per Package 3 until semantics exist.
- Explicitly OUT of scope: backfilling edges for the existing 206 nodes (no retroactive graph invention); the Neo4j adapter (dormant, F142).

**Step-by-step plan.**
1. Identify (or declare UNKNOWN with evidence) the stale generation's writer.
2. Field-level diff of the two generations; produce the archive dump of stale-only rows.
3. Reconciliation dry-run: merge on final node IDs (Package 2); output the merge plan (keep fresh / archive stale-only / conflict list — conflicts resolved by rule, newest `updated_at` wins, recorded).
4. Promotion decision: feed-or-retire, with the approver named if fed; if retired, record the decision and update consumer contracts (`candidate` = terminal).
5. Edge-type design doc: `SUPERSEDES` (+ optionally `DERIVED_FROM`); wire the Package 1 supersession lifecycle to emit `SUPERSEDES` edges through the authorized writer.
6. Re-run the KG inventory probe: exactly one live generation; edge count ≥ 1 once the first supersession occurs, or the retired-by-decision record stands.

**Proof of completion.**
- Exactly one live `knowledge_nodes` generation; stale generation archived (dump artifact exists) and retired.
- Promotion: either approval events firing (nodes observed transitioning candidate→approved) or a signed retire-by-decision record.
- Edge semantics doc exists; no edge is written before its type is defined.
- F289 gate: edge count > 0 OR explicit retired-by-decision with rationale.

**Sequencing dependencies.** AFTER Package 2 (node IDs) and Package 3 (writer matrix). CO-RUNS with Package 1 steps 1–6 (both touch the stores; coordinate to avoid write conflicts). Package 1's verify() leg passing is a precondition for feeding promotion (never promote unverifiable nodes).

---

## Phase sequence

| Phase | Packages | Gate to next phase |
|---|---|---|
| **Phase 0 — decide, propose-only** | F137 hardening note reviewed; all four packages as planning artifacts (this file). | Named approver signs the F137 direction and the Package 1 mass-write approval. |
| **Phase 1 — constrain all future writes** | Pkg 2 (identity decisions, ID freeze) + Pkg 3 (writer matrix, failure semantics). | Decision records signed; new-ID scheme final; backfill/rebuild jobs registered as authorized writers. |
| **Phase 2 — repair the corpus** | Pkg 1 steps 1–7 (canonical_hash verdict → backfill → re-embed → projected_at → delete primitive) + Pkg 4 steps 1–3 (generation reconciliation). | F289 sub-gates: hash coverage 100%, noise 0%, one live node generation. |
| **Phase 3 — rebuild + lifecycle** | Pkg 1 steps 8–9 (rebuild job dry-run, retrieval probe) + Pkg 4 steps 4–6 (promotion feed-or-retire, edge semantics). | Full F289 invariant met (below). |

No phase writes live data until its gate is signed. Phase 1 produces decisions; Phases 2–3 produce writes, each write through the Package 3 authorized path.

---

## F137 propose-only hardening note: brain-qdrant REST unauthenticated (P0)

**Status:** PROVEN (F137; HTTP 200 with no key, 2026-09-23). NO live config changes made or proposed for direct application — options only.

**Option A — API key on Qdrant (`QDRANT__SERVICE__API_KEY`), clients updated.**
- Pros: native Qdrant mechanism; read/write key separation possible; minimal new infrastructure.
- Cons: key must be distributed to the gateway container and any operator tooling; rotation story needed; both Qdrant instances (brain-qdrant AND ping-qdrant, if it is ever revived) need it; a leaked key returns us to today.
- Cost: low. Risk of misconfiguration: medium (a bad key deploy breaks the live projection path — the thing currently working).

**Option B — Remove the host port publish (`0.0.0.0:6333`), bind loopback/internal only.**
- Pros: kills the network-reachable attack surface entirely with one compose change; no secrets to manage; operator scripts on the Pig still work via loopback.
- Cons: does NOT protect against container-network peers or a compromised container; breaks any remote (off-Pig) operator access to :6333; slightly reduces debuggability.
- Cost: trivial. Risk: low (loopback probing still possible for forensics).

**Option C — Auth reverse-proxy in front of :6333.**
- Pros: full authN/authZ policy (per-key scopes, audit logging) without touching Qdrant config.
- Cons: new moving part in the data path; latency; proxy becomes the availability bottleneck for retrieval.

**Recommended direction (propose-only): A + B combined** — API key for defense-in-depth on the container network, no host-port publish to remove the network-reachable surface. C only if per-key audit becomes a requirement. Rationale: B alone leaves container-peer writes open; A alone leaves a key-management burden with the port still exposed. Together they close both the network and the anonymous-peer vectors.

**Tradeoff that must be named:** any of these will break today's anonymous read-only forensic probes (including this program's). The program's read path must be migrated to the credentialed path at the same time — coordinate with whoever holds the Pig's compose authority. **Do not apply without a named approver and a rollback plan** (a bad Qdrant auth deploy silently breaks the live `EmbeddingService` projection, which is currently the only healthy writer).

---

## End-state invariant: "semantic plane healthy" (measurable)

All six must hold simultaneously; the plane is healthy when the gate below reads GREEN on a live probe:

1. **Hash coverage:** `canonical_hash` non-null on 100% of `knowledge` points (today: 6%).
2. **Noise-vector share:** `embedding:'fallback'` = 0% of points (today: 48%); any future provider outage produces `embedding:'deferred'` (re-embed job picks it up) — never silent noise again.
3. **Retrieval verify() pass rate:** 100% of hits returned by `POST /knowledge/search` carry `verified:true` (today: 0% — fail-closed on the whole corpus).
4. **Graph reality:** exactly one live `knowledge_nodes` generation; edge count > 0 with defined edge types, OR a signed retired-by-decision record with rationale (today: 206 nodes / 0 edges, all candidate, two generations).
5. **Write closure:** no unauthenticated vector/graph writes possible; every write attributable to a Package 3 matrix writer (today: REST + two routes fully open).
6. **Rebuildability:** rebuild job dry-run reproduces the live collection from `ping_events` with an empty unexplained diff; `projected_at` non-null on all points; delete path exists and the supersession lifecycle is exercised at least once (today: rebuild claimed-only, no delete, `projected_at` null on 100%).

**Steady-state guardrails (post-gate):** re-embed job runs on a schedule (or on provider-recovery signal); drift between `ping_events` and `knowledge` is measured (orphan/stale counts) and alerted, not just repairable; the F289 gate re-runs as a periodic probe — health is a maintained property, not a one-time fix.
