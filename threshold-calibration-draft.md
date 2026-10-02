# Knowledge Threshold Calibration (0.8): Instrumentation Status

**Date:** 2026-09-18
**Workstream:** ORCA AUTONOMY lead (g), knowledge-threshold instrumentation (Nolan directive section 13)
**Status of this doc:** instrumentation SPEC, not yet applied. See section 2 for the routing blocker.

## 1. Current threshold status: UNCALIBRATED

The 0.8 candidate-confidence threshold is kept at 0.8 for compatibility only. No live
confidence distribution has ever been observed against it. Do not calibrate it to a new
value on the basis of this doc.

Exact location of the threshold (read-only verified 2026-09-18):

- Repo: `/home/nolan/ping` (NOT the orca-autonomy worktree; see section 2)
- Branch: `sprint/harvest-12h` (HEAD `8fe3b8060`)
- File: `ping-runtime/context/context_compiler.js`
- Line 19: `const KNOWLEDGE_CANDIDATE_CONFIDENCE_THRESHOLD = 0.8;`
- Companion constants, lines 15-20: `KNOWLEDGE_MAX_APPROVED = 25`,
  `KNOWLEDGE_MAX_CANDIDATES = 50`, `KNOWLEDGE_MAX_REFS = 25`
- Comment tags: `// H69: knowledge read bounds...` (line 15) and the JSDoc on
  `_retrieveKnowledgeRefs` (lines ~111-116) describing the H69 write->read->act loop closure
- Selection path: `_retrieveKnowledgeRefs(namespace)` (lines ~117-155)
- Injection point: `compile()` (lines ~89-108); `pack.knowledge_refs` is set only when
  the refs list is non-empty, and the knowledge read runs AFTER pack ID generation so
  the pack ID is unaffected (fail-soft: absent/failed/empty graph leaves the pack
  byte-identical)

Selection behavior as coded (must be preserved exactly by any instrumentation):

1. Query the KnowledgeGraph for up to 25 `approved` nodes and up to 50 `candidate` nodes
   in the mission namespace.
2. All approved nodes are taken unconditionally.
3. Candidates are taken only if `confidence >= 0.8`. NULL/unset confidence is treated
   as 0 and rejected (confidence is NULL-preserving per the graph contract).
4. Dedup by `node_id`, deterministic sort by `node_id`, slice to at most 25 refs.
5. Any graph failure returns `[]`; the pack keeps no `knowledge_refs` key (byte-identical).

Existing tests for this path (also on `sprint/harvest-12h` only):
`ping-runtime/context/context_compiler.test.js` lines ~470-645 cover approved injection,
high-confidence injection, low-confidence exclusion, null-confidence exclusion,
empty-graph and throwing-graph fail-soft (byte-identical pack), and sort-plus-cap at 25.

## 2. Routing note: the code is not in the orca-autonomy worktree

The orca-autonomy worktree (`/home/nolan/worktrees/orca-autonomy`,
branch `feature/orca-autonomy`, HEAD `099927152`) contains NO `ping-runtime/context/`
directory, NO `ContextCompiler`, NO `knowledge_refs` literal, and NO 0.8 candidate
threshold. This was verified by full-worktree grep (also negative: H68/H69 tags,
`ContextCompiler`, `context_compiler`, `knowledge_refs`).

Branch relationship (verified): `feature/orca-autonomy` is an ANCESTOR of
`sprint/harvest-12h`. The H68/H69 ContextCompiler knowledge-injection code was added
on the sprint branch after the orca-autonomy branch point. H68 = the KnowledgeGraph
producer/consumer audit wave (`SPRINT-HARVEST-12H.md` line 2738); H69 = the
ContextCompiler knowledge read bounds and injection.

Consequences:
- No instrumentation was applied, because there is no code to instrument in the
  authorized work area, and the constraints forbid editing other branches/checkouts.
- No behavior changed. The threshold is exactly as before: 0.8, uncalibrated.
- The ORCA control-loop slice itself explicitly excludes the 0.8 threshold
  (`orca/control-loop/CONTROL-LOOP-DESIGN.md` lines 28 and 50), so this workstream's
  file area contains the ORCA loop code only, which has no injection path.

Decision needed by the program coordinator: route this spec to whoever owns the
`sprint/harvest-12h` branch (apply the instrumentation there), or merge/rebase the
H69 compiler code into the orca-autonomy branch so this workstream can apply it.

## 3. Instrumentation spec (ready to apply once routed)

Apply inside `_retrieveKnowledgeRefs` in `context_compiler.js` on the branch that owns
the code. The instrumentation computes statistics from the SAME rows the selection
already fetched: no extra graph queries, no change to take/reject decisions, no change
to ordering or slicing. Selection behavior is provably unchanged.

Record one observation per `compile()` call that performed a knowledge read
(even when the result is `[]`, including the fail-soft cases, so empty pools are
distinguishable from failures).

### 3.1 Fields to record per injection decision

- `observed_at` (ISO 8601, via the existing constitutional time authority)
- `context_pack_id`, `mission_id`, `namespace`, `query` (pack identity for later join)
- `graph_read`: `ok` | `empty` | `failed` | `absent` (absent = no knowledgeGraph wired)
- `approved_pool`: number of approved rows returned (before take)
- `candidate_pool`: number of candidate rows returned (before filtering)
- `candidate_confidences`: ordered list of candidate confidences, NULL-preserving
  (store `null` for unset; cap the list at 50 entries, the query already caps it)
- `candidate_histogram`: 10 fixed bins over [0,1), with NULLs counted separately
  (compact summary; the ordered list is the authoritative distribution)
- `accepted`: counts `{ approved, candidates }` and the injected `node_id` list
  (post-dedup, post-sort, post-cap; at most 25 ids)
- `rejected_candidates`: count plus ordered confidences of rejected candidates
  (the false/irrelevant-injection evidence lives here once usefulness labels exist)
- `threshold`: 0.8, and `threshold_status`: `UNCALIBRATED` (carried on every record so
  downstream analysis never forgets the provenance of the 0.8 value)

### 3.2 Where to record: existing PING persistence only

No new event store, database, or queue. Two ranked options, both existing:

1. Preferred: attach the observation to the mission's evidence through the
   `EvidenceAuthority` the compiler already requires (`accumulate()` is already called
   in `_verifyEvidenceBacking`, `context_compiler.js` line ~259 on the sprint branch).
   Emit the observation as a structured evidence record keyed by `context_pack_id` so the
   measurement workstream can query by pack.
2. Alternative: emit an `OBSERVATION_CREATED` event through the existing PING event
   path (the tandem pipeline already uses this route), with the same schema.

The coordinator should confirm which route the measurement workstream consumes.

### 3.3 Downstream usefulness signals (where measurable)

- Positive: a worker envelope or follow-up action references an injected `node_id`
  (join injected ids against worker output; the refs carry `node_type`, `label`,
  `source_event_id` for this).
- Negative: an injected ref (especially one with confidence just above 0.8) that no
  worker ever references, or that is explicitly flagged irrelevant.
- These are PHASE 2 correlations: record injection observations now; usefulness labels
  accrue as missions execute. Do not gate phase 1 recording on having usefulness labels.

### 3.4 Behavior-preservation test (to add alongside the instrumentation)

Extend `context_compiler.test.js` with: identical stub graph, compile twice (with and
without the observation hook), assert byte-identical packs including
`context_pack_id`, and assert one observation record exists with the expected pool
counts, accepted/rejected counts, and `threshold_status === 'UNCALIBRATED'`.
Existing tests (lines ~470-645) must pass unchanged: that is the proof the threshold
behavior did not move.

## 4. What data must accumulate before a calibration recommendation is valid

Recommended minima (workstream proposal; coordinator to ratify):

- At least 500 compile decisions with a knowledge read across at least 3 namespaces
  (namespaces with materially different graph populations).
- At least 100 decisions where the candidate pool is non-empty (the threshold only
  matters when there are candidates to filter).
- At least 60 observations with candidate confidences in the contested band
  [0.70, 0.90), so precision can be estimated just below and just above 0.8.
- At least 50 injected candidate refs (confidence >= 0.8) with a downstream
  usefulness label (referenced by a worker vs ignored), to estimate precision at 0.8.
- Distribution coverage: the ordered candidate-confidence lists must show the live
  shape (e.g., whether confidences cluster at 0.79/0.81 boundary artifacts or spread
  smoothly); do not recommend from a degenerate distribution.

Until these minima hold, any recommendation is a guess. The current state (zero live
observations) is explicitly insufficient.

## 5. The exact analysis that will produce the recommendation

Once the minima in section 4 hold:

1. Build the live confidence histogram from all `candidate_confidences` lists.
2. Compute precision at candidate thresholds {0.5, 0.6, 0.7, 0.8, 0.9}:
   precision(t) = useful_injected(t) / injected(t), using downstream labels from 3.3.
3. Compute the rejected-band miss rate: useful candidates with confidence < t that
   would have been injected at lower t (recall proxy).
4. Plot the calibration curve: confidence vs observed usefulness rate, per 0.05 band;
   check whether 0.8 sits on a cliff or in a flat region.
5. Recommend the threshold that maximizes precision subject to recall not dropping
   below the 0.8 baseline, with the evidence tables attached. If the data is
   inconclusive (flat precision, sparse contested band), the recommendation is
   "keep 0.8, extend observation window", not a new value.
6. Human gate: the recommendation is a proposal, never an automatic change; the
   0.8 constant changes only on explicit approval, with this doc updated to record
   the decision and the evidence.

No new threshold value is proposed in this doc. That is deliberate and required.

## 6. Remaining gaps

- G1 (routing): the H69 code and this workstream live on different branches; the
  instrumentation spec above is unapplied until the coordinator routes it.
- G2 (recording route): the measurement workstream must confirm whether it consumes
  EvidenceAuthority records or `OBSERVATION_CREATED` events (section 3.2).
- G3 (usefulness labels): no automated join yet between injected `node_id`s and
  worker usage; phase 2 needs a deterministic join definition (exact-match on
  `node_id` in worker envelopes is the starting proposal).
- G4 (live graph population): if the KnowledgeGraph has few or no candidates in
  live namespaces, the distribution will be degenerate and the observation window
  must extend; the histogram will reveal this.
- G5 (fail-soft coverage): observations must also be recorded for the
  absent/failed/empty graph cases, or the analysis will overstate injection rates.
