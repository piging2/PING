# LANE N — DATA LINEAGE
Status: PROVEN (prototype) — design + 2 prototypes green; integration pending phase0/lane-M/lane-O confirmations

Mission: make SOURCE → OBSERVATION → EVIDENCE → OBJECT → SITE SECTION → ANSWER → ACTION queryable end to end. Do NOT create a new provenance authority: PING already has one (see findings).

## Standing decisions (binding, 2026-09-23 night shift)
- Connector credentials: QUEUE FOR MORNING, do not assume. Tonight: fixtures/recorded responses only. Lineage design records `connectorId` on acquisition records; no tokens, no secrets in any lineage record, ever (lane L boundary).
- Vendor veto: experimentation free, adoption gated. Applied to all harvest decisions.

## Ledger
- RESEARCHED: OWNERSHIP.md program charter + lane scope; phase0 STATE.md (event authority forensics in progress, read-only).
- RESEARCHED: `src/fyd/lineage/tracer.ts` (LANE-LIN spike, 1109 lines, UNTRACKED in repo, created 2026-09-23) — machine-verified 7-stage trace: SOURCE BYTES → OBSERVATION → EVIDENCE → OBJECT FIELD → SITESPEC BINDING → RENDERED CLAIM → ASK FYD ANSWER, with resolved/missing verdicts and `needed` fields. This is the mechanism to converge on, not duplicate.
- RESEARCHED: canonical provenance types — `ObjectProvenance` (src/lib/ping/types.ts:96): kind ∈ {canonical-journal, website-derived, overlay-authored}, ref, updatedRefs?, derivedAt. Every PingObject carries it.
- RESEARCHED: observation record — `ExtractedField` (src/fyd/proceduralize/proceduralizer.ts): name/value/sourceUrl/sourceType/observedAt/evidenceRef/confidence/factClass/visibility/claimKind/property/entityId/evidenceDetail/extractor. Emission choke point `provenance()`; deterministic `evidenceRefForFact` = `web:` + sha256(sourceType|name|JSON(value)|entityId)[:12].
- RESEARCHED: observation→evidence join — relationship `evidenceRef` ends with observation `entityId` (proceduralizer mints both).
- RESEARCHED: conflict handling today — `resolve()` in proceduralizer: source-type tier json-ld > opengraph > html-meta > rss > atom > sitemap > html; first verbatim wins; inferred fills gaps only. No conflict record persisted (gap).
- RESEARCHED: query surface precedents — `WhyThis` (src/fyd/ui/why-this.tsx: customer drill-down claim → evidence steps); ask-composer `evidenceRefs` + `claimClassifications` (answer → evidence binding); projection meta (overlayEventIds, eventSequences, baseDigest, graphDigest) for change attribution.
- RESEARCHED: action seam — `planActions` (src/lib/ping/action-planner.ts) plans actions deterministically; actions have NO lineage back to the answer/claim that prompted them (gap).
- RESEARCHED: deletion semantics — none exist for lineage. `grep tombstone` hits only social readers + a harvest doc. Owner overlays support supersede; no upstream-deletion model (gap).
- RESEARCHED: ecosystem — OpenLineage (spec only, Apache 2.0), Marquez (Java server, no releases since 2024, perf issues), DataHub (Kafka/MySQL/GMS/frontend stack), Apache Atlas (HBase, Hadoop-centric), OpenMetadata (requires Elasticsearch), dbt artifacts, MLflow. See HARVEST-REPORT.md.
- DECIDED: REJECT all lineage servers as adoption targets (veto-gate fails: new hosted DB, orchestration plane, JVM weight, canonical-data dependency, PING already solves the mechanism). ADAPT mechanism ideas only: append-only typed edge events; facet-pattern extensible metadata; run-as-event with input/output sets.
- DESIGNED: LINEAGE-DESIGN.md — lineage as a derived projection over journal + observations (never a second authority), LineageEdge record schema, 8 question→field mappings, 5 query functions, worked example, tombstone semantics, red-team verdicts.
- NEXT: prototype lineage query functions against synthetic records in lane dir (prototype/lineage.mjs).
- PROTOTYPED: prototype/lineage.mjs — schema-true synthetic records (Sunrise Plumbing worked example + source rewrite + facebook conflict + pre-lineage gap + tombstoned source + ACTION link), LineageIndex builder, all 5 query functions. All queries verified; red-team self-checks pass (R1 conflict preserved/visible, R2 rewrite chain intact, R3 typed gap not forged, R4 no secrets, tenant scoping).
- PROVEN: prototype/lineage-proof.mjs (companion to lineage.mjs; zero deps) — REAL Coppersmith path from the LANE-LIN verify-test expectations (object id website-business-2f1327c09d622175-service-139408827c27, rel rel-f450fdb901a6baa3, sections home:Services:2/services:Services:0, real claim text), all digests computed with node:crypto sha256 (answer digest reuses the proposal digest-law shape sha256-canonical-json). Backward walk ANSWER->SOURCE: 8 hops, every hop identity+timestamp+causedByEventId. Forward walk: blast radius returns objects/sections/answers/actions + regenerationSet for lane O. Source-change simulation: new acquisition digest -> RESOLVED edge supersedes edge:resolved:01, old chain intact, affected artifacts flagged. Red-team: R1 forged mid-chain hop -> status=missing + needed (no fake pass); R2 evidence-byte deletion -> LINEAGE_GAP with hash retained; R3 identical answer id in two tenants stays strictly scoped (no leak); R4 planted secret absent from all records (pointers+hashes only); R5 pre-lineage object resolves with no invented observation. ALL TESTS PASS.
- NEXT: file INTEGRATION-REQUEST to the LANE-LIN spike owner (converge query functions onto src/fyd/lineage/ types once committed); confirm connectorId registry format with lane M; confirm causedByEventId canonical shape with phase0; run proof prototype against REAL pipeline fixtures (read-only) to replace synthetic supporting records.

## Gaps this lane must close (vs PING today)
1. ACTION link: no record ties an executed action back to the Ask FYD answer + claim bindings that prompted it.
2. Reverse index: no source → observations → objects → sections → answers index (WHAT BREAKS IF THIS SOURCE DISAPPEARS? unanswerable today).
3. Field-level change history: journal has overlay deltas but no field → event-id index (WHY DID THIS CHANGE? partially answerable).
4. Tombstone/deletion: upstream source deletion has no model; lineage never marked stale.
5. Conflict record: `resolve()` drops the loser; no persistent CONTENDING_OBSERVATION + resolution event.
6. Connector attribution: `SourceRecord` has no connectorId; per standing decisions, connect flow lands in the morning.

## Integration points (owned by others — requests, not writes)
- LANE-LIN spike (untracked `src/fyd/lineage/`): convergence target for the query functions; file INTEGRATION-REQUEST when functions proven.
- Phase0: canonical identity/hash/event authorities — lineage reuses their outputs, never re-mints.
- Lane J (observability): run records feed the ACQUISITION/RUN lineage nodes.
- Lane M (source registry): operational metadata, not lineage truth; connectorId registry is the join key.
- Lane T (action planner): ACTION records land here once the planner executes.
- Lane O (dependency index): shares the reverse index; coordinate, do not duplicate.
- Lane P (content-addressable media): media evidence by content hash; lineage references the hash.
