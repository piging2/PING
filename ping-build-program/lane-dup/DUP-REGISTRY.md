# DUP-REGISTRY — CONVERGENCE DECISIONS

Lane DUP (convergence engine). Living document. One row per mechanism pair examined.
Classification is exactly one of: AUTHORITY / ADAPTER / LEGACY / DUPLICATE / DERIVED.
Status: OPEN / CONVERGING / CONVERGED / WONTFIX-with-reason.

---

## R-01: Lineage — LANE-LIN tracer spike vs lane N query design [VERDICT ISSUED 2026-09-23 ~20:25 MDT]

| Item | Location | Classification |
|---|---|---|
| `traceClaim` 7-stage machine trace + LineageLink types | `src/fyd/lineage/tracer.ts` (1109 lines, UNTRACKED in repo, created 2026-09-23) | **AUTHORITY** — the lineage proof engine. Single per-claim verified backward walk SOURCE BYTES → OBSERVATION → EVIDENCE → OBJECT FIELD → SITESPEC BINDING → RENDERED CLAIM → ASK FYD ANSWER, resolved/missing + `needed`. There is exactly one such mechanism; it is the first and only instance. Single home: `src/fyd/lineage/`. |
| Lane N query functions `whyThis` / `whatEvidenceSupportsThisAnswer` | lane-n prototype, LINEAGE-DESIGN.md §4.1, §4.5 | **ADAPTER** for the backward-walk semantic unit — must DELEGATE per-hop verification to `traceClaim`, not reimplement the 7-stage trace. Two backward-walk implementations must not survive. |
| Lane N `whyDidThisChange` / `whatBreaksIfSourceDisappears`, LineageEdge, LineageIndex builder, ActionRecord, tombstone + CONTESTED semantics, connectorId | lane-n prototype, LINEAGE-DESIGN.md §2.3, §3, §4.2, §4.3, §5, §7, §8 | **AUTHORITY-IN-FORMATION** — new semantic units with no incumbent in the repo (gaps #1–#6: ACTION link, reverse index, field change history, tombstones, conflict record, connector attribution). First instances; proven at prototype. |
| `whatPageUsesThisObject` | lane-n §4.4 | **ADAPTER** — runs the same `resolveQuery` the tracer uses; shared mechanism, no conflict. |

Verdict: NOT DUPLICATES. Complementary layers of ONE lineage stack, one home (`src/fyd/lineage/`): tracer = proof engine (verification), lane N = derived-projection index + query API (records). The composition rule is: **backward-walk logic lives only in `traceClaim`; everything else queries the derived index.**

Convergence steps (lanes implement; DUP classified):
1. Commit `tracer.ts` (LANE-LIN owner, or lane N with coordinator approval) — no behavior change, just tracked. Lane N must not fork a copy into its lane dir. (Blocker for steps 2–4.)
2. Lane N implements the 5 query functions in `src/fyd/lineage/queries.ts` against the tracer's LineageLink types; `whyThis` and `whatEvidenceSupportsThisAnswer` call `traceClaim` for per-hop verification. Zero re-implementation of the 7-stage trace.
3. LineageEdge (transitions), LineageIndex (derived, rebuildable), ActionRecord, tombstone/CONTESTED semantics land in `src/fyd/lineage/` as the same subsystem.
4. Lane O consumes lane N's forward walk (`blastRadius` → `regenerationSet`) — see R-02.
5. Dependencies: phase0 gives `causedByEventId` shape; lane M gives `connectorId` format (`<provider>-<surface>`); lane J's `whyChanged` delegates to `whyDidThisChange` (already planned by lane J).

Status: OPEN (step 1 blocked on commit; verdict delivered to lane-n as DUP-FINDING-lineage-verdict.md). Ownership of implementation: lane N (their own recommendation; DUP classified).

---

## R-02: Reverse index — lane N LineageIndex vs lane O dependency index [OPEN]

| Item | Classification |
|---|---|
| Lane N LineageEdge derivation (journal + observations → edges) | **AUTHORITY** — the one edge derivation. |
| Lane N LineageIndex (lineage query projection) | AUTHORITY-IN-FORMATION for the lineage query projection. |
| Lane O dependency index (regeneration invalidation projection) | Separate projection over the same substrate, allowed ONLY if built from the same derived edge set. Never two independent derivations. |

Evidence: lane O DEPENDENCY-INDEX-DESIGN.md:85 refreshes from "the event stream (lane N's lineage...)"; :250 "Lineage queries go to lane N." Delegation is recorded; the shared-derivation contract is the open item.
Exact open item: lane O's INTEGRATION-NOTE-FACTORY.md API confirmation (buildIndex/propagate/planRegeneration/applyResult/rebuildIndex/verifyEquivalence) — verify both projections derive from the same edge set, not two independent ones.
Status: OPEN.

---

## R-03: Ask-context assembly — context-compiler.ts vs context-builder.ts vs lane G [CONVERGING]

| File | Lines | Classification | Evidence |
|---|---|---|---|
| `src/lib/ping/ask-composer.ts` | — | AUTHORITY | Live: buildAskContext, composeAnswer, proposalDigest, canonicalize. Used by site-patch.ts:14, ping-object-reader.ts:47. |
| `src/fyd/ask/context-builder.ts` | 41 | ADAPTER | Thin wrapper over ask-composer.buildAskContext + agent grant filtering. Only importer: tracer.ts. Self-describes "ONE builder". |
| `src/fyd/ask/context-compiler.ts` | 559 | LEGACY/DORMANT → AUTHORITY-IN-FORMATION (lane G) | Zero importers. Full visibility-bounded packet compiler, imports canonicalize from ask-composer. Test exists. |
| Lane G new design | lane-g | ADAPTER-to-compiler (no third module) | Coordinator redirected lane G 2026-09-23 ~19:58; lane-g/CONTEXT-COMPILER-DESIGN.md explicitly names `src/fyd/ask/context-compiler.ts` as the base. |

Verdict: lane G ADOPTS/EXTENDS the dormant compiler; context-builder's grant-filter logic merges into the compiler or stays as its adapter. No third context-assembly module.
Status: CONVERGING (verify at wiring that lane G extended rather than rebuilt).

---

## R-04: Canonical JSON serializers [OPEN]

| Serializer | File | Law | undefined policy |
|---|---|---|---|
| `canonicalize` | `src/lib/ping/ask-composer.ts:55` | "sha256-canonical-json-v1" | undefined → "null" (no filtering) — AUTHORITY (pinned 2026-09-21 decision: "One serializer for digests and signatures") |
| `canonicalizeJson` | `src/lib/ping/dev-signer.ts:46` | dev/BFF envelope | undefined DROPPED — DUPLICATE (live: social/envelope, social/transition-id, object/owner-events, ping-object-reader) |

Verdict: one serializer law. Migrate dev-signer consumers onto the pinned serializer with a documented undefined policy, or record an explicit fork boundary with a reason.
Exact open item: choose the undefined policy, then migrate. Status: OPEN.

---

## R-05: proposalDigest twin laws [OPEN]

`src/lib/ping/ask-composer.ts:82` proposalDigest vs `src/fyd/proceduralize/patch.ts:67` proposalDigest — two live digest laws over the same SitePatchBody family (patch.ts strips VOLATILE_KEYS; ask-composer does not). **DUPLICATE**.
Exact open item: determine whether the two laws ever verify each other's output; then migrate patch.ts onto the pinned law or record an explicit domain fork. (Pass-2 re-verify was blocked 2026-09-23 ~20:15 MDT: Pig SSH broken pipe; retry next pass.)
Status: OPEN.

---

## R-06: builder canonicalizeValue twins [OPEN]

`src/fyd/builder/canonical.ts:31` vs `src/fyd/builder/source-refresh.ts:81` — same name, same directory, divergent volatile-stripping rules (canonical.ts strips `*At`; source-refresh.ts doesn't). **DUPLICATE**.
Verdict: one shared module with a named strip policy (`stripVolatile: boolean`); source-refresh imports it. Latent digest-mismatch hazard in owner-layer survival proofs.
Status: OPEN.

---

## R-07: schema→component dual mapping [OPEN]

`SCHEMA_COMPONENTS` table (`src/fyd/sitespec/schemas.ts`) vs `acceptsSchemas` (`src/fyd/components/registry.ts`, whose header claims to be "the only place"). **DUPLICATE** — real drift risk (lane E, 2026-09-23).
Verdict: converge via lane E's ranked-tester mechanism (~40 lines, native ADAPT). Owner: schemas.ts/registry.ts owner (factory side); lane E hands off.
Status: **CONVERGED 2026-09-23 ~21:20 MDT (lane E, verified on Pig).** The hand-written `SCHEMA_COMPONENTS` table is DELETED; `eligibleComponents()` is now the inversion of the registry DEFINITIONS table (`COMPONENTS_BY_SCHEMA`, computed once at module load); `componentForSchema()` is its head. Schema roles moved verbatim to new leaf `src/fyd/sitespec/schema-roles.ts` (import graph acyclic; schemas.ts re-exports unchanged). Drift fixed in 4 places (business/service/location/knowledge-website gained RecentObjects/ObjectRail; business lost stale ObjectFeed — registry's component-authored coverage wins). Drift-guard test added to `schemas.test.ts`; equivalent assertions proven via tsx (repo jest cannot execute TS tests — pre-existing breakage, verified on untouched registry.test.ts). tsc --noEmit: zero new errors on touched symbols; import-order cycle check clean. Working tree diff uncommitted per lane policy.

---

## R-08: Failure taxonomy — lane K vs BCQ testkit enum [CONVERGED]

Lane K FAILURE-TAXONOMY.md (13 closed classes) vs testkit contract.py ErrorClass (12, built from the charter copy before K published). Missing: UNSUPPORTED. Coordinator applied the convergence 2026-09-23 ~19:55 MDT: UNSUPPORTED added to testkit ErrorClass; discovery assertion generalized. Both harnesses re-ran 18/18 post-change. **Lane K's taxonomy is AUTHORITY**; the testkit enum is a DERIVED mirror with a named drift guard (lane K §8 governance: "a lane that adds its own failure code is inventing a second taxonomy").
Status: CONVERGED.

---

## R-09: Lane R lab taxonomy copy [OPEN]

lane-r/lab carries a charter copy of the taxonomy, designed for one-line import swap to lane K v1. **DERIVED** (temporary, sanctioned).
Exact open item: swap the import to lane-k/FAILURE-TAXONOMY.md's published enum. Status: OPEN.

---

## R-10: Secret handling — scattered env reads vs lane L broker [OPEN]

No secret broker exists in the repo; lane L's design is the first instance (valid mission). Existing: env-var scattered reads (kit-adapter, blob-storage, identity/session), `src/lib/infrastructure/auth-manager.ts` (dormant concepts), FYD_DEV_KEY_DIR custody, redact-secrets.py (22 regression tests), dev-signer custody precedent. Classification: auth-manager.ts = LEGACY concepts to absorb; scattered reads = the custody to converge; lane L broker = AUTHORITY-IN-FORMATION.
Watch: when the broker lands, confirm env-scattered custody converges onto it (no parallel custody).
Status: OPEN.

---

## R-11: Service/source registry — controller.ts vs lane M registry [OPEN]

`src/lib/infrastructure/controller.ts` (+ auth-manager.ts + audit.ts): zero importers, **LEGACY/DORMANT**. Lane M SOURCE-REGISTRY-DESIGN.md: registry DERIVABLE never canonical; manifest vs registry split. Lane M's registry = AUTHORITY-IN-FORMATION (no existing SourceRegistry in PING).
Verdict: harvest controller.ts's service-config concepts; do not leave a second dormant registry standing beside the new one. Lane M noted "registries.ts are unrelated config registries (separate domain)" — verify in pass 2.
Status: OPEN.

---

## R-12: Retry engines — mission retry vs lane R reference vs lane X harvest [OPEN-WATCH]

- Existing mission retry (runtime): fixed 5000ms backoff, max_attempts 3 — WEAK, single instance.
- lane-r/lab reference mechanism: bounded retry honoring Retry-After, lane-K classification, typed FULL_RESYNC — PROVEN in fixtures.
- lane-xexec spike: typed retry policy, non-retryable classes — research, NOT landed; lane X falsified adopting Temporal/Trigger.dev as the plane (no second execution engine).

Verdict so far: no duplicate (only one production retry engine exists). If lane X's native mechanisms land, they must converge onto ONE retry engine — never a second one beside the mission authority.
Status: OPEN-WATCH.

---

## R-13: Action planners — affordances vs intent vs plan records [OPEN-WATCH]

- `src/lib/ping/action-planner.ts` `planActions` (lane N references it): deterministic planner; records not yet written.
- lane-A `action-planner.ts` (affordances: what an object offers) — lane T states complementary.
- lane T `planAction(intent, object, resolvedCapabilities, principal, grants, policy)` (intent→plan, pure) — lane T states complementary.

Classification: SEPARATE (intent resolution vs affordance enumeration vs plan record). No competing authority today. Watch: when ActionRecord lands (lane N) and lane T plans execute, verify one plan-record shape.
Status: OPEN-WATCH.

---

## R-14: Search — lane F vs existing normalize/matcher mechanisms [OPEN]

PING has no search infra of any kind (verified: no FTS/trigram/pgvector/Qdrant/embeddings/SQLite in src or package.json). Lane F's design is the first instance — valid.
- `src/fyd/resolve/spike/normalize.ts` + matchers.ts (EXACT tiers, proven on 328 candidates) = **AUTHORITY** for normalization/matching mechanism.
- lane-f/spike/normalize.ts = **DERIVED** (explicitly documented adaptation, standalone for benchmarking, `NORMALIZER_VERSION="lane-f-spike-v1"`).
Exact open item: on live wiring, lane F must consume the canonical normalize module, never ship the spike copy. The spike copy must not escape the lane dir.
- qdrant `knowledge` collection (144 pts, 768-dim) on the Oracle host: an external live store. If lane F ever adds vector retrieval, this collection is the incumbent to converge with, not a second store. Watch.
Status: OPEN.

---

## R-15: Media — media authority vs lane P gap fill [OPEN-WATCH]

`media.ts` Media Authority lifecycle + SHA-256 contentHash + PublishedMediaAsset guard; `blob-storage.ts` content-addressed keys + physical-byte verification; `media-kv-store.ts` rejects synthetic identity. All **AUTHORITY** for their units. Lane P fills gaps only (MIME verification, derivative policy, EXIF rule, SVG policy, binding record) — ADAPTER/extension posture recorded. No duplication.
Status: OPEN-WATCH.

---

## R-16: Observability — lane J vs existing run concepts [OPEN-WATCH]

No run-record concept exists in PING (`run-t2.ts` persists snapshots, records nothing about runs) — lane J's RunRecord is the first instance (valid). `audit.ts` JSONL-append pattern = AUTHORITY for the append pattern, reused by lane J (ADAPTER, not duplicate). Lane J's `whyChanged(entity,field)` explicitly "hands off to lane N/O" — delegation recorded, no duplicate.
Status: OPEN-WATCH.

---

## R-17: Event systems — separate domains, NOT duplicates [WONTFIX]

- `src/lib/editor/event-system.ts` + durable-event-store.ts + sequence-authority.ts (editor commands→events→projections): domain-scoped authority. Internally consistent (sequenceAuthority imported by both).
- `src/lib/events.ts` ("HPP Event Logger", marketing; warns not durable): LEGACY MVP. Cleanup candidate (migrate to canonical event path when available, or retire explicitly) — not a competing authority today.
- Canonical EventAuthority: separate runtime repo, absent from this repo by design (phase0 to confirm the runtime side).
WONTFIX reason: distinct domains, no live divergence risk. The HPP logger's retirement is an owner decision, not a lane-blocking duplicate.

---

## R-18: Slot registries — separate for now [WONTFIX-WATCH]

`src/lib/slot-registry.ts` (Workbench visual slots) vs `src/lib/editor/slot-registry.ts` (editor editable regions). SEPARATE — different capability shapes and consumers. Watch: if editor and Workbench slot concepts ever merge, converge then, not before.

---

## R-19: Provenance models — separate domains, NOT duplicates [WONTFIX-WATCH]

`src/lib/events.ts` EventProvenance (provider idempotency) vs `src/fyd/media/provenance.ts` (media asset) vs `src/fyd/lineage/tracer.ts` (pipeline trace). SEPARATE — different record kinds, one per domain per lane N §0.1.

---

## R-20: FYD identity derivation — DERIVED, pinned [OPEN]

`src/fyd/identity/uuid.ts` (uuidv5 + FYD_IDENTITY_NAMESPACE) reimplements the PING runtime kernel's derivation rule (`/home/nolan/ping/runtime/kernel/identity/canonical-id-generator.ts`). **DERIVED** — same deterministic rule, independent code. No competing identity authority in THIS repo (stdlib randomUUID used only for non-canonical IDs). Drift risk: runtime rule changes, FYD's copy doesn't.
Exact open item: pinned contract test asserting FYD's uuidv5 output matches known vectors from the runtime authority. Status: OPEN.

---

## R-21: sha256Hex one-liners [OPEN]

`src/fyd/proceduralize/sha256.ts` = **AUTHORITY** (shared module). Local copies: `src/fyd/data/fyd-tenant-graph.ts:127`, `src/fyd/ask/context-compiler.ts:254`, `src/fyd/customize/server.ts:39` — **DUPLICATE** (trivial mechanical fix: import the shared module).
Status: OPEN (low severity).

---

## R-22: Lane A vs lane-conn16 vs lane-conn (git/GitHub seam) [CONVERGED-BY-DESIGN]

lane-conn16's SOURCE-INVENTORY.md: "Lane A and lane-conn work extended as deltas, never redone." Lane A owns git ingestion; lane CONN owns the GitHub connector; the PR→commit-SHA seam is a coordination point, not a duplicate. No competing implementations.
Status: CONVERGED-BY-DESIGN (watch the seam when both wire live).

---

## R-23: Capability records — lane S vs lane E capability-options derivation [OPEN-WATCH]

Lane E proved "capability options" as a schema→derivation (tested, unconsumed). Lane S designs observation→resolved-capability records ("capability records are derived truth, registry alongside graph"). SEPARATE units today (schema-derived options vs observation-derived resolved records). Watch: at wiring, verify they do not become two capability registries — lane S's registry is the record home; lane E's derivation is a generator feeding it.
Status: OPEN-WATCH.

---

## R-24: Web acquisition — safe-fetch as the ONE gate [AUTHORITY-PINNED]

`src/fyd/net/safe-fetch.ts` = **AUTHORITY** (SSRF gate: scheme allowlist, per-hop DNS re-resolution, IP blocklist incl. 169.254.169.254 + CGNAT, 5 redirects, content-type allowlist, length pre-check + streaming abort). Lane D's HOSTILE-INPUT-CONTRACT and lane-conn both pin it as the single egress gate ("production must use it"). budgets.ts + rate-limit.ts exist as the single budget/rate authorities. Lane D's contract demands — never duplicates.
Status: CONVERGED-BY-DESIGN (watch pass 2: confirm no second fetch path in src/services or api routes).

---

## R-25: connectorId format — lane M registry key [DEPENDENCY]

Lane N's ACQUISITION records will carry `connectorId` (`<provider>-<surface>`, e.g. `facebook-graph`). Lane M owns the registry key format (AUTHORITY for operational metadata). Not a duplicate; a format dependency. Status: OPEN (await lane M confirmation).

## R-26: causedByEventId shape — phase0 event authority [DEPENDENCY]

Lane N's LineageEdge `causedByEventId` must match the canonical event-id shape. Phase0 forensics is the AUTHORITY (in progress, read-only). Not a duplicate; a shape dependency. Pre-authority data carries `gap` (LINEAGE_GAP), never forged ids. Status: OPEN (await phase0 WHO-CREATES-EVENT-ID answer).

---

## Escalations to coordinator (not DUP decisions)

1. **Oracle stack vs build-program output**: lane-oracle found a live P18-era stack (ping-gateway node 18, ping-postgres 17-alpine, ping-qdrant v1.7.0) with config drift (hand-run containers, no healthcheck, node 18 vs repo engines 24.x). "Convergence must decide whether this stack or the build program output is canonical." — Nolan's morning decision, not DUP's. Flagged 2026-09-23 ~20:30 MDT.
2. **lane-xexec harvest landing**: the 13 harvested execution semantics are research only; if they land natively, DUP must converge them onto the mission/retry authorities (R-12) before a second execution engine exists.
