# INTEGRATION NOTE: DEPENDENCY INDEX -> FYD FACTORY BATCH PIPELINE

**From:** lane O (dependency index), ping-build-program.
**To:** factory coordinator / LANE-INCREMENTAL worker / batch pipeline implementer.
**Date:** 2026-09-23.
**Status:** proposed contract. Lane O owns the index design and this API shape; the factory owns adoption.

## 1. Where it plugs into BuildBusiness (12 stages)

The index is maintained by the batch scheduler, fed by stage outputs. No new stage; three touchpoints:

| Stage | Touchpoint | What happens |
|---|---|---|
| 8 GENERATE_SPEC | planner emits DependencyManifest | The batch indexer consumes the manifest + spec: registers object-field -> bindingId edges and bindingId -> page edges, pins section digests. Manifest version recorded on every edge (`via`). |
| 10 VERIFY_RENDER_MODEL / 11 RENDER_PROVE | pins recorded | Page HTML digests and spec_digest pinned to the index. Ask-context registry (lane G, when shipped) registers context edges here. |
| 12 REGENERATE_AND_CERTIFY | certifier verifies | The certifier recomputes the index_digest over {nodes, edges, pins} and compares to the pinned value in the build result. Mismatch or missing index = certifier finding (blocks READY, does not silently pass). The index_digest joins the digest chain the certifier already verifies. |

On source refresh (the batch scheduler's tick), the flow is: acquire -> extract -> grade -> build graph -> semantic diff -> **index.propagate(changes)** -> **planner.planRegeneration(...)** -> execute jobs -> update pins + watermark -> certify affected projections.

## 2. Record formats (exact)

All records are canonical JSON (key-sorted, UTF-8, no volatile stamps inside hashed fields). Hashes are sha256 hex.

### 2.1 IndexFile (per tenant, JSONL: one header line + one line per edge batch)

```jsonc
// line 1: header
{ "record": "index_header", "index_version": "ping-dep-index@1",
  "tenant_id": "clearwater-plumbing-demo",
  "built_at": "2026-09-23T19:30:00.000Z",           // excluded from index_digest
  "index_digest": "9f2c…",                            // sha256(canonical({nodes,edges,pins,watermark}))
  "watermark": { "stream": "ping_events", "seq": 1042, "at": "2026-09-23T19:29:00.000Z" } }
// lines 2..n: node pins (chunked, 500 nodes per line max)
{ "record": "node_pins", "chunk": 0,
  "pins": { "<node_id>": { "kind": "object_field", "identity": "cw-biz-01|hours",
                           "pin": "a1b2…" } } }
// following lines: edges (chunked, 1000 edges per line max)
{ "record": "edges", "chunk": 0,
  "edges": [ { "from": "objfield:cw-biz-01|hours", "to": "section:home:Contact:0",
               "kind": "binds", "via": "fyd-semantic-diff@1 / planner v3" } ] }
```

Node id scheme (deterministic, never random):
- `source:<source_id>`, `obs:<sha256(source_id|fact_ref|normalized_value)>` (first 16 hex),
- `claim:<claim_id>`, `objfield:<object_id>|<field_path>`, `rel:<sha256(subject|predicate|object)>` (first 16),
- `section:<bindingId>`, `page:<slug>`, `ctx:<context_id>` (lane G), `feed:<feed_id>`, `proj:<protocol>:<target>` (lane PROTO),
- `cap:<capability_id>` (lane S).

### 2.2 InvalidationPlan (output of propagate)

```jsonc
{ "plan_id": "inv_<tenant>_<tick>_<8hex>",           // 8hex = sha256(tick input)[:8]
  "tenant_id": "clearwater-plumbing-demo",
  "tick_id": "2026-09-23T20:00:00Z",
  "invalidations": [
    { "node_id": "section:home:Contact:0",
      "pin_before": "a1b2…",
      "invalidated_at": "2026-09-23T20:00:03.000Z",
      "causes": [ { "node_id": "objfield:cw-biz-01|hours",
                     "change_ref": "evt:seq-1044", "kind": "field_changed" } ] }
  ],
  "early_cutoffs": 41,        // branches killed by pin equality (the efficiency metric)
  "dedup_merges": 2,          // nodes reached by >1 cause and merged (storm metric)
  "fanout_flags": [ { "node_id": "objfield:cw-biz-01|name", "fanout": 71 } ],
  "cycles_detected": []
}
```

### 2.3 RegenerationJob (output of planRegeneration)

```jsonc
{ "job_id": "rg_<sha256(tenant|tick|action_kind|target)>[:16]",
  "tenant_id": "clearwater-plumbing-demo",
  "tick_id": "2026-09-23T20:00:00Z",
  "action": "reverify-graph | review-owner-conflict | record-source-drift | regenerate-section | regenerate-page | refresh-context | refresh-feed | refresh-projection | no-op",
  "target": "section:home:Contact:0",
  "rank": 4,                                        // ACTION_RANK order; lower runs first
  "causes": [ "inv:<plan_id>#section:home:Contact:0" ],
  "idempotency_key": "<job_id>",                    // retries reuse the job_id
  "budget_class": "critical | standard | relaxed"   // from the staleness policy
}
```

Action kinds extend the semantic-diff vocabulary (`regenerate-binding` generalizes to `regenerate-section`; page/context/feed/projection actions added) but keep the rank law: reverify (1) < review-owner-conflict (2) < record-source-drift (3) < regenerate-* (4). `review-owner-conflict` jobs gate: no regenerate-* job on the same target runs until the conflict job resolves.

### 2.4 JobResult (input to applyResult)

```jsonc
{ "job_id": "rg_…", "tenant_id": "clearwater-plumbing-demo",
  "status": "done | failed | deferred",
  "pin_after": "c3d4…",                             // null when the job re-verified no change
  "refreshed_at": "2026-09-23T20:00:41.000Z",
  "spilled": false,                                 // true if the job was deferred to next tick
  "error_class": "TIMEOUT | TRANSIENT | …",         // lane K taxonomy on failure
  "evidence_refs": ["evt:seq-1044"] }
```

## 3. Regeneration-planner API (the exact surface the batch pipeline calls)

Pure functions; the batch scheduler owns persistence and execution. TypeScript signatures (implement in the factory's language of choice; semantics are normative):

```ts
// Build or rebuild the index from canonical state. Pure: same inputs -> same index_digest.
buildIndex(input: {
  tenantId: string;
  graph: ObjectGraph;            // stage 4 output
  spec: FYDSiteSpec;             // stage 8 output
  manifest: DependencyManifest;  // stage 7/8 planner output (builder/manifest.ts)
  capabilities: CapabilityRecord[]; // lane S, optional until shipped
  contextRegistry?: ContextRegistry; // lane G, optional until shipped
}): IndexFile;

// Incremental step. Consumes events since the index watermark, returns the plan.
// Events with no semantic change are dropped inside (pin pre-check).
propagate(index: IndexFile, events: StreamEvent[], tickId: string): InvalidationPlan;

// Turn the plan into ordered, bounded, idempotent jobs.
planRegeneration(plan: InvalidationPlan, policy: {
  maxRegenUnits: number;         // per tick per tenant; overflow spills with causes preserved
  stalenessBudget: Record<FactClass, number>; // seconds; see DEPENDENCY-INDEX-DESIGN.md section 11
}): RegenerationJob[];

// Apply one completed job: verify pin_after, update pins, return the updated index.
// Atomic with watermark advancement by the caller.
applyResult(index: IndexFile, job: RegenerationJob, result: JobResult): IndexFile;

// Loss recovery. Rebuilds from canonical state and verifies against the pinned digest.
rebuildIndex(tenantId: string, canonical: CanonicalState, pinnedDigest: string | null):
  { index: IndexFile; verified: boolean; divergentNodes?: string[] };

// Scheduled integrity check: rebuild pins from canonical state, compare.
verifyEquivalence(index: IndexFile, canonical: CanonicalState):
  { equivalent: boolean; divergentNodes: string[] };
```

Execution-order contract the batch pipeline must honor:
1. Jobs run in (rank, job_id) order. All rank-1 (reverify-graph) jobs complete before any rank-4 job starts on the same tenant.
2. A `review-owner-conflict` job in state open blocks rank-4 jobs on its target bindings. The block is per-target, not per-tenant.
3. `applyResult` for every job in the tick, then ONE atomic write of (index pins + watermark). Never advance the watermark past unapplied jobs.
4. On tick crash: replay from the last persisted watermark. Idempotent job_ids make double-execution safe.

## 4. What the batch pipeline must NOT do

- Do not invent edge kinds. New edge kinds come from producer lanes (G, PROTO, S) with a registry entry, or they do not exist.
- Do not call propagate with ungraded observations. The input is the post-grade, post-conflict change set (stage 5 output + owner journal heads), not raw stage-2 observations.
- Do not persist the index as canonical. If any code reads the index to answer "what is true about this business," that is a layering violation: truth lives in the graph + evidence ledger; the index answers only "what to recompute."
- Do not skip the certifier's index_digest check. A build that cannot prove its index is disposable-by-rebuild is not READY.

## 5. Metrics the 500-site stress run must emit (per tenant per tick)

`invalidated_nodes`, `early_cutoffs`, `dedup_merges`, `regen_jobs`, `spilled_jobs`, `tick_latency_ms` (p50/p95/p99 across tenants), `watermark_lag_s`, `staleness_max_s` (max refreshed_at - invalidated_at among completed jobs), `index_rebuilds`, `equivalence_divergences`. Lane J records them; the factory's cohort escalation gate reads them.

## 6. Open coordination items

- O-INTEGRATION-1: LANE-INCREMENTAL confirms these record formats or proposes deltas before writing INCREMENTAL-SPEC.md. Deltas come back to lane O as an integration request; lane O does not unilaterally change the API after adoption.
- O-INTEGRATION-2: the staleness budget defaults (section 11 of the design doc) need the factory coordinator's sign-off; until then they are proposals.
- O-INTEGRATION-3: lane G must define ContextRegistry { context_id, bound_facts[], pin } before context edges activate; until then the tenant-dirty boolean stands.
- O-INTEGRATION-4: lane S must define CapabilityRecord { capability_id, status, evidence } before cap nodes activate.
