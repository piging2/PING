# DEPENDENCY INDEX DESIGN (Lane O)

**Status:** design complete, awaiting factory LANE-INCREMENTAL adoption + spike proof.
**Date:** 2026-09-23. **Author:** lane S+O worker.

## 1. Problem

The factory program (BUILD-BUSINESS-SPEC.md) regenerates SiteSpecs from scratch on every source refresh: stage 8's `generateSiteSpec` is pure and deterministic, and LANE-REG proved byte-identical output for unchanged input. That proof is the trap. Byte-identical for unchanged input says nothing about CHANGED input, and at 500 businesses x 12 stages x N refreshes, regenerating the universe on every refresh is the single biggest cost lever in the factory. The factory's own program names it: LANE-INCREMENTAL wants "content-addressable digests, dependency tracking, deterministic work identity."

The dependency index is the disposable projection that answers, for any source change, the single question the batch scheduler needs: **what exactly must be recomputed, and what is already proven fresh?**

## 2. What PING already has (harvest, not invention)

| Asset | Location (Pig, read-only) | What we take |
|---|---|---|
| DependencyManifest + forward/reverse walk | src/fyd/builder/manifest.ts | The authoritative section-layer edge source. The planner emits bindings alongside the spec; reverseWalk(objectFieldOrClaimRef) is the proven change-impact primitive. Lane O does NOT re-derive section edges; it consumes the manifest. |
| RegenerationAction kinds + ACTION_RANK | src/fyd/builder/semantic-diff.ts | The regeneration vocabulary (no-op < reverify-graph < review-owner-conflict < record-source-drift < regenerate-binding) and the reverify-first ordering law. |
| Seed object->section index + pagesForSections | src/fyd/refresh/dependency-index.ts | The merge() contract shape and the pagesForSections page mapping idea, generalized to full spec pages. |
| Content-addressed stage outputs + digest chain | fyd-factory/orchestration/BUILD-BUSINESS-SPEC.md sections 3-5, I5 | Every stage output persisted with its content digest; the index plugs into this, not around it. |
| Volatile-stamp exclusion + canonical JSON digests | semantic-diff.ts header, REG-PROOF.md | createdAt/updatedAt/generatedAt excluded from semantic hashes; canonicalJson (key-sorted) as the digest input. |

The gap: nothing connects OBJECT changes to ASK FYD contexts, feeds, or protocol projections; nothing is incrementally updatable from the event stream; nothing gives the batch scheduler a regeneration PLAN with a dedup guarantee.

## 3. The chain

One tenant's projection chain, identity-addressed at the nodes, content-hashed at the values:

```
SOURCE(bytes) -> OBSERVATION(occurrence) -> EVIDENCE(claim) -> OBJECT(field)
  -> SECTION(bindingId) -> PAGE(slug) -> PROJECTION{siteSpec, askContexts, feeds, protocolProjections}
```

The index stores EDGES between identity-addressed nodes, and PINS (content digests) on recomputable nodes. Edges say "A feeds B." Pins say "B's content currently equals digest D." Invalidation walks edges; early cutoff compares pins.

## 4. Content hashes vs identity-addressed nodes

Rule: **identity for things that must survive content change (lineage, ownership, correction replay); content hash for things whose freshness is the question (recomputation identity).**

| Node | Addressed by | Why |
|---|---|---|
| source artifact | identity (source_id) + content hash (sha256 of bytes, stage 1 already pins this) | The bytes are the input; hash detects re-fetch changes. |
| observation occurrence | identity = hash(source_id, fact_ref, normalized value) — occurrence-based identity | Idempotent: the same observation re-ingested collapses to one occurrence; no duplicate keys across replays. The VALUE carries a content hash for change detection. |
| evidence claim | identity (claim_id, deterministic); value content-hashed | Claim grades and provenance must survive rewording; the hash decides "did the claim change." |
| object field | identity (object_id, field path); value content-hashed per field | Owner corrections target (object_id, field). The field hash excludes volatile stamps. Relationship edges: identity by (subject, predicate, object) tuple hash; presence/absence is the value. |
| capability record | identity (capability_id = hash(tenant, kind, endpoint identity)); status + params content-hashed | Lane S consumer: a withdrawn capability keeps its identity so Ask FYD can never resurrect it. |
| section (bindingId) | identity (pageSlug:component:index — the spec's deterministic id); rendered content pinned by digest | The spec generator owns these ids. The pin is sha256 over the binding's canonical rendered model. |
| page | identity (slug); rendered HTML pinned by digest | Page HTML is a pure function of its sections + tokens; the pin enables page-level early cutoff. |
| ask context | identity (context_id = hash(target_object_id, viewer_class, question_class)); packet pinned by digest | Lane G's context compiler is the producer. Until lane G ships, this edge layer is DEFERRED (see section 9). |
| feed / protocol projection | identity (feed_id / protocol name + target); output pinned by digest | Deferred until producers exist (lane PROTO). |

Why not content-address everything: content-addressed identity is unstable for lineage. An owner correction pins to (object_id, field); if identity moved with every rewording, corrections would orphan and conflict records would lose their contenders. Identity-addressed nodes + content-hashed values gives both: stable anchors for the owner loop, hash comparison for the scheduler.

## 5. Record formats

```jsonc
// One index per tenant. Stored as one JSONL file per tenant (append-rebuildable),
// or rows in an existing store; NEVER a second canonical store.
{
  "index_version": "ping-dep-index@1",
  "tenant_id": "clearwater-plumbing-demo",
  "built_at": "2026-09-23T19:30:00.000Z",
  "index_digest": "sha256 over canonical JSON of {nodes, edges, pins} excluding built_at",
  "nodes": {
    "<node_id>": { "kind": "source|observation|evidence|object|field|section|page|context|feed|projection",
                   "identity": "<stable id>", "pin": "<hex64 content digest or null>" }
  },
  "edges": [
    { "from": "<node_id>", "to": "<node_id>", "kind": "feeds|renders|binds|contextualizes|projects",
      "via": "<manifest version or producer id>" }
  ],
  "watermark": { "stream": "ping_events", "seq": 1042, "at": "2026-09-23T19:29:00.000Z" }
}
```

Reverse edges are DERIVED at load (from + to inverted), never stored separately: one edge list, two views. This keeps the forward and reverse maps from ever disagreeing.

## 6. Build / refresh strategy

**Build (from canonical state):** for one tenant, load (object graph, site spec, dependency manifest, ask-context registry when it exists). Register nodes and pins; emit edges:
- object field -> bindingId (from the planner's DependencyManifest: binding.objectField -> binding.bindingId; the "owner" field maps to the owner object id).
- bindingId -> page slug (from spec.pages: section.id membership).
- section/page -> projection outputs (spec_digest, ask contexts, feeds) when producers register them.
Pin each recomputable node's digest. Record the index_digest. This is a pure function of canonical state: losing it costs only recomputation.

**Refresh (incremental, from the event stream):** the index subscribes to the event stream (lane N's lineage; the PING event authority per OWNERSHIP phase0) with a per-tenant watermark (stream seq). On each tick:
1. Read events since watermark: observation ingested, claim graded, object field changed, relationship changed, owner assertion recorded, capability status changed.
2. Translate each event to a CHANGED NODE (identity-addressed, using the node table above). Events that carry no content change (volatile stamps, duplicate deliveries) are dropped HERE: hash the event's payload against the current pin first; equal pins mean no propagation at all. Duplicate-delivery safety comes free from occurrence identity.
3. Run the propagation algorithm (section 7) over the changed nodes.
4. Apply the resulting regeneration plan; on success, update pins and the watermark ATOMICALLY (one write). If the run crashes mid-way, the watermark stays behind the work: the next tick replays and idempotent re-application converges (occurrence identity + pin comparison make replay a no-op for already-done work).

**Disposable by design:** the event stream + canonical state are the source of truth; the index is a cache with a rebuild procedure. Any process may drop the index file; the rebuild (section 10) recreates it byte-identically from canonical state (modulo built_at).

## 7. Invalidation propagation algorithm

```
propagate(index, changedNodes, tickId):
  # DEDUP RULE (the storm killer): within one run, each node is visited at most
  # once, keyed by (tenant_id, node_id, tickId). Multiple changed upstream nodes
  # merge into ONE invalidation record per node with all causes attached.
  # Re-queueing an already-queued node is a no-op that appends the cause.
  queue    = unique changedNodes by (tenant, node_id)
  visited  = empty set
  invalid  = empty map: node_id -> { causes: [changeRef...], pin_before }

  while queue not empty:
    node = queue.pop()
    key  = (node.tenant, node.id)
    if key in visited: continue
    visited.add(key)

    for edge in index.consumersOf(node):        # reverse walk, forward direction
      consumer = edge.to
      if (consumer.tenant, consumer.id) in visited: continue

      newPin = recomputeDigest(consumer)         # pure: hash of consumer's canonical inputs
      if newPin == index.pin(consumer):
        continue                                # EARLY CUTOFF: content unchanged,
                                                # propagation DIES on this branch.
                                                # Siblings and downstream never wake.
      invalid[consumer.id].causes.push({from: node.id, tick: tickId})
      invalid[consumer.id].pin_before = index.pin(consumer)
      queue.push(consumer)

  # Rank into a regeneration plan using the semantic-diff ACTION_RANK law:
  # reverify-graph (re-attest changed objects) < review-owner-conflict <
  # record-source-drift < regenerate-binding/section/page/projection.
  plan = rankActions(invalid)   # deterministic sort by (rank, node_id)
  return plan
```

Storm prevention is fourfold, all in this algorithm:
1. **Early cutoff.** A changed input whose recomputed output is byte-identical kills the branch. The most common factory event (re-fetch with identical bytes, re-ingest with identical claims) propagates ZERO nodes past the pin check. This is the mechanism the ecosystem converged on (salsa, Bazel, Turborepo) and it is what makes 500 tenants x hourly refreshes affordable.
2. **The dedup rule.** Fan-in merges: if hours changed AND phone changed and both feed the contact section, the contact section is invalidated ONCE with two causes. Without this, a 10-field source rewrite would queue the hero section 10 times.
3. **Coalescing tick.** Events are batched per tenant per tick (the scheduler's tick, section 8); one propagation run per tick per tenant, never one run per event.
4. **Fan-out tripwire.** A node with more than FANOUT_LIMIT (default 64) direct consumers is legal (the owner business object legitimately feeds hero/about/contact/footer/ask contexts) but is REPORTED per run (lane J observable). A node whose fan-out grows without bound is a schema smell (e.g. a "last_updated" stamp smuggled into every binding), and the tripwire catches it before it becomes a permanent storm tax. Volatile stamps must NEVER be edges: section 4's pin rule (stamps excluded from semantic hashes) is enforced at edge-registration time.

Cycles: the graph is a DAG by construction (source -> ... -> projection, edges never point upstream). If a cycle is ever introduced, visited-set termination still bounds the run; the run REPORTS the cycle as a defect.

## 8. Invalidation rules (what counts as a change)

- **Semantic change only.** Field value hash differs (normalized, stamps excluded) -> changed. Relationship added/removed -> changed. Visibility changed -> changed (public->hidden invalidates every consumer; hidden->public re-validates).
- **Not a change:** volatile stamp movement; byte-identical re-ingest; claim rewording that normalizes identically; duplicate event delivery.
- **Owner assertions** (CONFIRM/CORRECT/HIDE) are changes with a special rank: they invalidate the projection layer but NEVER the source/evidence/object layers (the owner loop's invariant: owner intent survives regen). A HIDE invalidates the section but the fact stays in the graph.
- **Capability status changes** (lane S) invalidate ask contexts and any section rendering capability affordances, but not the underlying object fields.
- **Owner conflict** (semantic-diff's OwnerConflict): the affected bindings get a review-owner-conflict action ranked BEFORE any regenerate action on the same bindings. Conflict gates regeneration: the surface it touches does not regenerate until the conflict resolves. This is the ACTION_RANK law, enforced by the planner, not by convention.

## 9. The minimum viable index for the 500-site stress run

The factory's first 500-site stress is synthetic graph compilation jobs (MISSION-STATE line 244): throughput, latency, memory, cache hit rate. The MVI ships with ONLY what the 500-run measures:

**MVI scope:**
- Node kinds: source, observation, evidence, object field, section (bindingId), page.
- Edges: object field -> bindingId from the planner's DependencyManifest (ALREADY EMITTED per build); bindingId -> page from spec.pages; source -> observation -> evidence -> object field from the stage 1-6 outputs.
- Pins: source bytes digest (stage 1 already has it), object field value digests, section rendered-model digests, page HTML digests, spec digest.
- One per-tenant JSONL index file + watermark. Rebuilt from canonical state on demand.
- The propagation algorithm (section 7) with early cutoff and the dedup rule.

**Explicitly DEFERRED from the MVI (recorded here so nobody builds them twice):**
- Ask FYD context edges: blocked on lane G's context compiler producing a context registry with stable context_ids. Until then, an object-field change invalidates the SPEC and the batch marks ask contexts dirty by tenant (coarse, honest, bounded: one boolean per tenant).
- Feed edges and protocol-projection edges: blocked on lane PROTO producers registering projections. Same coarse fallback.
- Cross-tenant edges: none. Tenants are independent subgraphs; the only shared nodes are code versions (planner version, component registry version), which invalidate by VERSION BUMP (a registry deploy invalidates pinned componentVersion bindings across tenants, batched, not stormed).

**What the 500-run measures to validate the MVI:** invalidation set size per refresh vs full-regen node count; early-cutoff rate (fraction of changed inputs that die at the pin check); dedup merge rate; tick latency p50/p95/p99; watermark lag (staleness, section 11). If early-cutoff rate is low on synthetic data, the synthetic changes are too coarse and the measurement is dishonest; the run must include a no-op re-ingest cohort.

## 10. Rebuild procedure (index lost)

The index is disposable; this procedure is the proof.

```
rebuildIndex(tenant_id):
  1. Load canonical state: object graph, site spec, dependency manifest,
     owner journal heads, capability records (when lane S ships).
     All from their canonical stores. The index file is NOT read.
  2. Register nodes + edges + pins exactly as in section 6 (same pure function).
  3. Compute index_digest over canonical JSON of {nodes, edges, pins}.
  4. Compare against the last PINNED index_digest recorded in the tenant's
     build result (stage 12 certifies it; see INTEGRATION-NOTE-FACTORY.md).
     - Match: the rebuilt index is proven identical to the lost one. Adopt it.
     - Mismatch: canonical state moved during the rebuild (a refresh landed
       mid-rebuild). DISCARD the rebuild and retry from step 1. Bounded retries
       (default 3); on exhaustion, report BLOCKED with the divergent node ids.
  5. Reset the watermark to the stream seq of the newest event already reflected
     in canonical state (from the lineage store), then let the next tick catch up
     incrementally. Never rewind the watermark to zero: replaying the whole
     stream is correct but wasteful, and idempotent re-application makes it safe
     only as a last resort.
```

Rebuild cost is O(tenant graph + spec), never O(history). The pinned digest is what makes "lost" detectable and "rebuilt" verifiable instead of hopeful.

## 11. Staleness budget: who decides, how it is enforced

The index does not decide staleness. **The batch policy decides; the index measures; lane J observes; the certifier enforces.**

- **Who decides:** the factory batch policy (owned by the factory coordinator), per fact class, recorded in the tenant's batch config. Defaults proposed:
  - identity/contact/claim-honesty facts (name, phone, email, address, hours, prices): invalidate -> regenerate within ONE batch tick (the refresh cadence; proposed 15 minutes for the stress run, 1 hour production). A change here that is not reflected within the budget BLOCKS the next READY certification for that tenant (it becomes a certifier finding, not a silent lag).
  - standard facts (services, descriptions, reviews): within 24h.
  - generated presentation copy: within 7 days, or next owner-visible change, whichever comes first.
  - ask contexts: same budget as the facts they bind; the coarse tenant-dirty fallback (section 9) inherits the tightest budget of the tenant's invalidated facts.
- **How it is enforced:** every invalidation record carries `invalidated_at`; every completed regeneration carries `refreshed_at`. Staleness = refreshed_at - invalidated_at per node, aggregated per tenant per tick. The batch scheduler's tick loop checks: any node past budget -> escalate (retry with priority, then alert). Lane J records invalidated/refreshed timestamps so WHY DID FYD CHANGE can answer "the hours changed at T, the contact section refreshed at T+9min, inside budget."
- **What staleness never means:** serving a projection the index knows is invalid. The serving layer reads pins: a page whose pin is older than its invalidated_at is served with the last-known-good pin AND flagged, or withheld for identity/contact facts. The budget bounds the lag; it never authorizes lying.

## 12. Regeneration planner (consumer of the index)

The planner turns an invalidation plan into executable, ordered, bounded work. Full API in INTEGRATION-NOTE-FACTORY.md; the semantics:

1. Input: the ranked invalidation plan from section 7 + tenant batch config (budgets, worker bounds).
2. Group by action kind following ACTION_RANK: all reverify-graph actions first (re-attest changed objects through the object builder), then review-owner-conflict (human or policy gate), then record-source-drift, then regenerate (section -> page -> projection order, leaves before roots so a page regenerates once after all its sections).
3. Bound the work: MAX_REGEN_UNITS per tick per tenant (default: 2x the tenant's median tick work, tuned from the 500-run measurements). Overflow spills to the next tick with causes preserved; the spill is REPORTED (lane J), never silently dropped. This is the backpressure that keeps one pathological tenant from starving the other 499.
4. Emit RegenerationJobs with deterministic work identity: job_id = hash(tenant_id, tick_id, action_kind, target_node_id). Deterministic job ids make retries idempotent and make the 500-run's measurements reproducible.
5. On job completion: recompute the target's pin, verify against the job's expected post-state (for regenerate actions: the new pin must differ from pin_before unless the action was a no-op re-verify), update the index, advance the watermark.

## 13. Worked example: business-hours observation changes

Tenant: clearwater-plumbing-demo (the factory's proven fixture). A scheduled refresh re-fetches the business website; the hours claim changed:

- before (website_statement): "Mon-Fri 7:00 AM - 6:00 PM; Sat 8:00 AM - 12:00 PM; Emergency service 24/7"
- after (website_statement): "Mon-Fri 7:00 AM - 6:00 PM; Sat 8:00 AM - 2:00 PM; Emergency service 24/7"

Propagation:

1. **Source -> observation.** Source bytes digest changed (stage 1 re-pins). New observation occurrence for (source_id=site, fact_ref=hours) with a different value hash. Old occurrence is superseded, not deleted (lineage).
2. **Observation -> evidence -> object.** Claim graded website_statement (stage 3); the object field (cw-biz-01, hours) value hash differs -> CHANGED NODE: (object_id=cw-biz-01, field=hours).
3. **Conflict check.** The GBP source still says Sat 12:00 PM. Stage 5 emits a ConflictRecord; under conflict_policy=manual this is an unresolved conflict on a contact-adjacent fact. The planner ranks review-owner-conflict BEFORE any regenerate action touching the hours bindings.
4. **Object field -> sections.** reverseWalk over the planner's DependencyManifest for "cw-biz-01" + field "hours": bindings whose objectField references the owner object and render hours. In the clearwater spec: the contact section binding (home:Contact:0), the footer binding (renders hours line), and the estimate-form section (shows "Sat hours" note). Exactly these three bindingIds invalidate; the hero, services, projects, reviews, about sections' pins are recomputed and hit EARLY CUTOFF (their canonical inputs did not change), so they never regenerate. The dedup rule merges the website-hours cause and the GBP-conflict cause into one invalidation record per binding.
5. **Sections -> pages.** bindingId -> page: home:Contact:0 lives on pages "/" and "/contact"; footer on every page; estimate-form on "/contact" and "/estimate". Union: {/, /contact, /estimate}. Pages /work and /reviews are untouched.
6. **Ask FYD contexts.** MVI coarse fallback: tenant ask-dirty = true; the tightest budget applies (hours are contact-adjacent: one tick). When lane G ships, the context registry gives exact context_ids (e.g. the "what are your hours" canonical question context) and only those invalidate.
7. **Planner output.** RegenerationJobs (deterministic ids): reverify-graph(cw-biz-01) first; review-owner-conflict(hours) gating the three bindings; then regenerate-binding x3, regenerate-page x3, refresh ask contexts. Total recompute: 3 sections + 3 pages + contexts, out of a site with ~10 sections and 5 pages. The 500-run measures exactly this ratio.

If instead the re-fetch had returned byte-identical HTML, step 1's pin check would have killed propagation at the source node: zero invalidations, zero jobs, watermark advanced. That is the early-cutoff proof the MVI must demonstrate.

## 14. Red team: index staleness and integrity

**Threat 1: stale index causes missed regeneration.** A lost or corrupted index that is NOT detected would serve old pins as fresh, and the scheduler would skip regeneration the tenant needed. Mitigations: the pinned index_digest in the build result makes staleness/corruption detectable at certify time (stage 12 verifies the digest chain; a missing or mismatched index digest is a certifier finding, never a silent pass). The serving layer's pin-age check (section 11) is the second net.

**Threat 2: stale index causes over-regeneration (storm).** An index whose pins lag canonical state (e.g. pins updated but watermark not advanced, then a crash) would invalidate everything on the next tick. Mitigations: pin and watermark update atomically; on crash the replay is idempotent (pin comparison makes already-done work a no-op); the per-tick work bound (section 12) caps the blast radius; lane J records the anomaly.

**Threat 3: poisoned edges.** A compromised planner manifest could register bogus edges (every field -> every section), turning every change into a full regen (availability attack on the factory's economics). Mitigations: edge registration is validated (bindingIds must exist in the spec; objectFields must exist in the graph); the fan-out tripwire (section 7) flags pathological manifests; the manifest itself is content-addressed and versioned (plannerVersion in the manifest), so a bad planner version's blast radius is identifiable and revertible.

**Threat 4: watermark forgery / replay.** An attacker (or a bug) advancing the watermark past unprocessed events would silently drop changes. Mitigations: the watermark advances only with a completed, pin-verified tick; the index_digest covers the watermark; the incremental-vs-full equivalence check (below) catches systematic drops.

**Threat 5: event-stream gaps.** If the stream itself drops an event, no index design can recover it from the stream. Mitigation: the periodic full-rebuild equivalence check: on a schedule (proposed: every Nth tick per tenant, N tuned from the 500-run), rebuild the tenant's pins from canonical state and compare to the index pins. Divergence -> quarantine the index, rebuild from canonical state (section 10), report. This is the same check LANE-INCREMENTAL's proof will run; the index provides the pin-comparison hook.

**Non-threat (explicitly):** the index is not a trust boundary for content. It never decides WHAT is true; it decides WHAT to recompute. Claim honesty stays with the grader, the conflict machinery, and the owner loop.

## 15. Kill criteria and optionality (per OWNERSHIP.md)

- **Kill the Ask-FYD-context edge layer** if lane G's compiler cannot produce stable context_ids; the coarse tenant-dirty fallback is the permanent design, not a temporary hack.
- **Kill per-field pins** if field-level hashing costs more than it saves at 500 tenants (measure in the stress run); object-level pins are the fallback granularity.
- **Reject any proposal** to make the index writable by the renderer or readable as lineage: the index is a scheduler cache, not evidence. Lineage queries go to lane N.
- **Optionality test:** can we replace the index's storage (JSONL file -> existing store rows) without touching the planner API? Yes: the API in INTEGRATION-NOTE-FACTORY.md is storage-agnostic. Can we rebuild the projection without the index? Yes: full regen from canonical state always works; the index only makes it cheaper. Can we trace a regeneration decision to evidence? Yes: every invalidation record carries causes back to observation occurrences.

## 16. What we did not build (and why)

- No new database. The index is a JSONL file per tenant (or rows in an existing store the factory already runs). A new store would be a VETO GATE trigger (new hosted database) and is unnecessary: the access pattern is whole-tenant load, tick, atomic rewrite.
- No new event authority. The index consumes the PING event stream (phase0's forensic subject); it creates no events of its own except through the planner's job records, which are scheduler state, not canonical events.
- No LLM in the invalidation path. Propagation is hash comparison and graph walking: deterministic, byte-reproducible, cheap.
