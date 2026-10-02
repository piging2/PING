# LANE N — HARVEST REPORT: external lineage / provenance systems

## PROBLEM
Make SOURCE → OBSERVATION → EVIDENCE → OBJECT → SITE SECTION → ANSWER → ACTION queryable end to end, with honest gaps, no second provenance authority, and no new database or service.

## PING ALREADY HAS
- `src/fyd/lineage/tracer.ts` (LANE-LIN spike, 1109 lines, untracked): machine-verified 7-stage claim trace with resolved/missing verdicts and `needed` fields.
- `ObjectProvenance` on every object (kind/ref/updatedRefs/derivedAt).
- `ExtractedField` observation records with deterministic `evidenceRefForFact` (`web:` + sha12).
- observation→evidence join via entityId ↔ relationship evidenceRef.
- `WhyThis` customer surface; ask-composer `evidenceRefs` + `claimClassifications`; projection meta (overlayEventIds, eventSequences, graphDigest) for change attribution.
- Canonical identity/hash/event authorities (phase0 tracing; lineage reuses, never re-mints).

## EXTERNAL CANDIDATES (evaluated 2026-09-23)
1. **OpenLineage** — lineage event *spec* (job/run/dataset/inputs/outputs + facets), not a server. The standard the ecosystem instruments against.
2. **Marquez** — OpenLineage reference server (Java/Dropwizard, relational store, UI).
3. **DataHub** (LinkedIn) — full metadata platform (Kafka + MySQL + GMS + frontend), lineage as one feature.
4. **Apache Atlas** — governance/catalog lineage (HBase-backed, Hadoop-centric).
5. **OpenMetadata** — unified metadata + lineage platform (requires Elasticsearch).
6. **dbt artifacts** (manifest.json) — pipeline DAG lineage for SQL transforms.
7. **MLflow** — experiment/run lineage for ML.
8. **Spline** — Spark-only execution lineage.
9. Precedent found in the wild: `ai-riksarkivet/rask` ships a "lightweight Marquez" (few hundred lines over a graph store, same OpenLineage ingest contract) — evidence that teams adopt the *contract idea* and reject the server.

## LICENSES
All Apache 2.0 — license-compatible. License is not the blocker; architecture is.

## TESTED
- Spec review of OpenLineage core model (job/run/dataset, facet pattern, run-start/run-complete events).
- Marquez: release history (no releases since 2024), documented severe performance issues consuming lineage events, Java service weight.
- DataHub: deployment topology (Kafka, MySQL, schema registry, GMS, frontend) — heaviest option by distance.
- Atlas: HBase storage layer, high CPU/memory in production, Hadoop-centric.
- Fit-check against PING: TS monorepo, no JVM/Python sidecars in the hot path, event authority canonical, observations already deterministic.

## WINNER
**None as an adopted dependency.** The mechanism ideas win; every server loses.

## ADOPT-ADAPT-REJECT
- **ADAPT (ideas only, zero bytes):**
  - OpenLineage's *append-only typed run events with input/output sets* → already PING's shape: acquisition run records with content digests in, observation records out. No import needed; the design's `LineageEdge` transition vocabulary (ACQUIRED/EXTRACTED/RESOLVED/…) is the PING-native equivalent.
  - OpenLineage's *facet pattern* (namespaced extensible metadata on core entities) → maps to PING's `provenance.ref` + `fields` + edge `detail` (hash/pointer only). Principle adopted: core schema stays closed, detail stays open.
  - The rask "lightweight Marquez" precedent → confirms the verdict: build the minimal query layer over records PING already emits.
- **REJECT as adoption targets:** Marquez, DataHub, OpenMetadata, Atlas, Spline, MLflow, dbt artifacts. Veto-gate failures: new hosted database (DataHub ×3, Atlas/HBase, OpenMetadata/Elasticsearch), new orchestration plane, large runtime dependency (JVM), canonical-data dependency risk (a lineage server that owns the graph becomes a second truth authority), weight dwarfs value (PING's entire lineage corpus per FYD is kilobytes; these systems are built for petabyte warehouses), PING already solves the mechanism in TS.
- **Experimentation note (per Nolan's standing decision):** nothing here needs a benchmark — the rejection is architectural (wrong shape, wrong runtime, wrong authority model), not performance-tunable. No install performed; no worktree needed.

## CODE WE DO NOT NEED TO WRITE
- A lineage event schema: OpenLineage's exists but PING's `ExtractedField` + `LineageEdge` + journal events already cover it with less.
- A lineage server, graph store, or UI: the `LineageIndex` is a rebuildable derived projection; queries are pure functions; `WhyThis` is the UI.
- A connector-identity system: `connectorId` on acquisition records + lane M's registry.

## MINIMAL PING WRAPPER
None. The design adds exactly one record kind (`LineageEdge`, append-only, derived from journal + observations) and one new writer (the `ActionRecord` on action execution). Everything else is reuse.

## FAILURE TEST
- Kill the LineageIndex: rebuild from journal + observations; verify `indexDigest` matches. (Proves the index is a cache, not truth.)
- Feed a source rewrite (digest change): expect new ACQUISITION → new OBSERVATION → RESOLVED(supersedes) → MATERIALIZED; old chain untouched; `whyDidThisChange` shows both digests.
- Feed two conflicting DIRECT_FACTs: expect CONTESTED edge persisted, both values retrievable, deterministic resolution recorded with event id.
- Delete a customer data package: expect evidence byte pointers to become typed gaps (hash retained); no customer bytes in lineage records.
- Query a pre-lineage object: expect `status: "gap"` at exactly the missing hop with a `needed` field — never a forged link, never a total failure.

## PRODUCT CAPABILITY UNLOCKED
- "Why this?" on every rendered claim, answered from records.
- "Why did the site change?" with event, actor, and source per field.
- Blast-radius analysis before a source is disconnected.
- Auditor-grade answer bundles: every Ask FYD answer traceable to raw bytes.
- Contested claims surfaced with both sources instead of silently resolved.

## BYTES-DEPENDENCY COST
Zero new dependencies. Zero new services. One new append-only record kind + one new writer + pure query functions. Estimated new code: ~400 lines TS for the index builder + queries (prototype in lane dir first), converging on the existing 1109-line tracer spike rather than replacing it.
