# MEM-C — Memory Harvest
ORCA FINISH, lane MEM-C. Session 09e00d4a. Run: 2026-09-24 05:07-05:40 MDT.

Continues the program harvest sequence (MEM-A H-1..H-12, MEM-B H-13..H-34).
Candidates for the real memory system (deliverable-level, NOT written there).
Each carries all 9 mandatory fields: problem / scope / evidence / mechanism /
fix / test / version / applicability / counterexample.

H-35..H-43 are memory-loop failure classes (this lane's attack suite + MEM-A/B
confirmations). H-44..H-48 are new sibling-lane failures harvested since MEM-B
21:22 MDT 2026-09-23.

### H-35: Index serves deleted content with no staleness marking
- problem: File-level deletion of a memory entry is not observable through retrieval; the search index serves deleted content with no staleness marking for an unmarked window.
- scope: muse.memory_search index vs ~/memory daily-log files.
- evidence: TEST (MEM-A 20:59 MDT 09-23: deleted v1.0 probe still served; MEM-B 20:56 09-23: still served while file grep = 0 hits; MEM-C 05:09 MDT 09-24: no longer served — convergence took somewhere inside the ~8h window) + TEST (MEM-C scratch M-10: pre-deletion snapshot serves 5 deleted fragments; old citation L1 rots to unrelated store content).
- mechanism: The index is a point-in-time snapshot with no invalidation propagation on delete and no as-of marking on served results.
- fix: Propagate deletions (tombstones) or stamp served results with index-as-of; consumers treat retrieval as possibly-stale for an unmarked window.
- test: Write probe, delete, poll search at 1/5/15/60 min; assert disappearance or staleness marking within the bound.
- version: 1.0 (2026-09-24).
- applicability: Any agent relying on FORGET semantics (privacy removal, correction propagation); any "current value" resolution.
- counterexample: If the indexer publishes a bounded staleness SLA and surfaces it on results, downgrade to documentation.

### H-36: Supersede is declaration-only; stale versions co-retrieved
- problem: Writing a v1.1 entry that declares supersession of v1.0 invalidates nothing at any layer; both versions are co-retrieved indefinitely and ranking decides which is seen.
- scope: Daily-log memory: store + index + retrieval.
- evidence: TEST (MEM-A stage 8: v1.1 declared supersession of v1.0; MEM-C scratch M-8: fresh index returns v1.0 AND v1.1 lines with no invalidation marker; MEM-C A1: superseded 20/day entry co-retrieved with current 10/day, naive consumer used the stale value).
- mechanism: No version/invalidation data structure exists; supersede is a `version`-field convention readable only by agents that reassemble entries and check links.
- fix: Real supersede relation (entry carries supersedes:<id>; "current" queries filter superseded versions) or the enforced agent procedure (INJECT, then check supersede links, then date-order).
- test: Scratch: write v1.0, then v1.1 superseding; assert retrieval marks v1.0 superseded or hides it from current-queries.
- version: 1.0 (2026-09-24).
- applicability: Every "current setting" resolution (caps, quotas, sprint windows, engagement settings).
- counterexample: Declaration-only supersede suffices if every consumer runs INJECT-then-link-check; the defect is that nothing enforces or even suggests it.

### H-37: Fragment-level retrieval defeats entry-level conventions
- problem: Retrieval returns line-granularity fragments, but the integrity conventions (date-ordering by entry decided-date, supersede-link checks, provenance grading) need entry-level metadata that lives on different lines than the facts; applied to bare fragments, the conventions misfire.
- scope: muse.memory_search result chunking; scratch retrieval model.
- evidence: TEST (MEM-C A6: fragment-level date-ordering parsed the plant's CLAIMED date 2026-09-30 as the entry date and adopted the plant; entry-level date-ordering after INJECT reassembly correctly picked the genuine entry, decided 2026-09-23 over 2026-09-21; MEM-A: schema-complete entries arrive disassembled and must be reassembled).
- mechanism: Line-granularity chunking strips entry context; dates, provenance, and version live on sibling lines, while content dates on the fact line masquerade as entry dates.
- fix: Standing procedure: never date-order or provenance-grade bare fragments; INJECT (reassemble) first, then apply conventions. Longer term: return entry-scoped chunks with metadata headers.
- test: A6 re-run: assert fragment-level and entry-level orderings disagree on the planted case and entry-level picks genuine.
- version: 1.0 (2026-09-24).
- applicability: Every consumer applying conventions to search results.
- counterexample: If the indexer ever returns entry-scoped chunks with metadata, the reassembly step becomes redundant; the procedure should then be re-tested, not assumed.

### H-38: Contradictions are never surfaced; silent date-resolution can pick the plant
- problem: Two entries asserting X and not-X coexist with no conflict signal; the standard agent defense (newest-date wins) silently resolves the conflict, and when the newer entry is the plant it adopts the false value with no warning.
- scope: Memory retrieval + agent convention layer.
- evidence: TEST (MEM-C A2: genuine 10/day vs planted 25/day dated newer; system surfaces no contradiction; silent date-order picks 25, the attack value; naive consumer saw no conflict at all; MEM-A real-memory twin: one query returned 4 mutually contradictory "current" FB engagement settings).
- mechanism: No contradiction detection at any layer; recency is a heuristic, not a truth signal, and it is adversarially gameable by dating.
- fix: Conflict-surfacing rule: when two entries assert different values for the same fact slot with no supersede link between them, surface CONFLICT and refuse silent resolution (ask, or fail closed to the canonical file).
- test: A2 re-run: assert the hardened consumer emits CONFLICT instead of a value.
- version: 1.0 (2026-09-24).
- applicability: Any "current value" question with 2+ dated assertions and no supersede links.
- counterexample: If one entry carries an explicit supersede link to the other, date-ordering is safe; the rule fires only on unlinked conflicts.

### H-39: No tenant isolation in memory
- problem: The memory system has no tenant concept: no tenant field on entries, no tenant parameter on retrieval, one shared namespace; tenant B's context retrieves tenant A's content indistinguishably.
- scope: muse.memory_search / muse.memory_get tool surface + store.
- evidence: TEST (MEM-B F-3: tenant-B-framed query returned Nolan's content with zero tenant attribution; MEM-C A4: ALPHA phone 555-0100 returned for a BETA-framed query, naive consumer adopted it as BETA's; citations are bare line numbers) + TEST (MEM-C A4b constructive proof: namespaced store + tenant parameter -> beta-context retrieval returned only beta's phone, alpha phone did not leak).
- mechanism: Single shared namespace; no attribution signal exists in result metadata.
- fix: Tenant-namespaced stores (or tenant field) + tenant parameter on retrieval; fail closed on unattributable entries in tenant-scoped questions. Standing: PING is the intelligence substrate, not a tenant store (09-13 directive).
- test: A4b re-run: assert tenant-B-context retrieval never returns tenant-A lines.
- version: 1.0 (2026-09-24).
- applicability: Any multi-tenant future for memory-backed agents.
- counterexample: Single-tenant deployment today: the absence is structural, not a live leak; it becomes P0 the moment a second tenant exists.

### H-40: No provenance enforcement; unsourced entries served at equal weight
- problem: Entries with no source, no version, and no date are stored and served identically to schema-complete entries; nothing grades, quarantines, or downranks them.
- scope: Store + retrieval + (absent) schema layer.
- evidence: TEST (MEM-C A7: anonymous-forum deploy-window claim adopted as fact by the naive consumer; A10: sourceless rollback-time entry adopted as fact; schema_check flagged all 9 fields missing yet the store accepted it identically; MEM-A attacks 7/10 projected absorbed, now observed).
- mechanism: No provenance field, no source grading, no schema enforcement at any layer; the entry's own honesty is the only signal and it is voluntary.
- fix: Mandatory-schema write convention (INCOMPLETE marking for partial entries) + provenance-demand at read (quarantine unsourced entries: never adopt as fact, withhold or verify independently).
- test: A7/A10 re-run: assert the hardened consumer marks QUARANTINE and withholds the value.
- version: 1.0 (2026-09-24).
- applicability: Every consumer of recalled facts.
- counterexample: If an entry's content is independently re-verifiable against a live source, provenance matters less; still record the verification, don't skip it.

### H-41: Retrieval has no relevance threshold and ranking is not a context bound
- problem: Retrieval returns noise by term overlap with no relevance floor, and top-k ranking without a token budget does not bound context: a flood of low-value lines consumes the inject budget while the inject layer itself never truncates.
- scope: Retrieval ranking + inject layer.
- evidence: TEST (MEM-C A9: 11 of top-15 fragments were lunch/parking noise for a quota query; a summarizing consumer ingested noise into its answer; A8: top-40 retrieval = 670 approx tokens unbounded; explicit budget=300 held inject to 289 tokens with 23 dropped; direct inject of the 3KB line: sentinel intact, no truncation at the inject layer; the overlong line was buried by flood in ranking, not truncated).
- mechanism: No relevance threshold; no token budget at inject; ranking orders but does not limit; inject reads are faithful regardless of length.
- fix: Explicit token budget + top-k cap at the inject layer; relevance judgment stays agent-side but must be explicit (question-term coverage), never assumed from rank.
- test: A8/A9 re-run: assert budgeted inject stays under budget and the noise ratio is reported alongside results.
- version: 1.0 (2026-09-24).
- applicability: Every retrieval-inject path; long-horizon agents with large memories.
- counterexample: Small clean memories may never hit the bound; the budget is defense-in-depth, not a live fix.

### H-42: Index ingestion lag breaks write-then-read loops
- problem: The search index ingests writes on a slow or stalling schedule; a write followed by retrieval within minutes-to-an-hour may not see the write, while the store already has it — the two layers disagree with no signal.
- scope: muse.memory_search ingestion pipeline.
- evidence: TEST (MEM-A: write 20:06 retrievable 20:09; writes 20:14 and 20:18 never retrievable through 21:00+; MEM-B F-2: 3 timestamped probes, 0 ingested in 70+ minutes: STALLED, not slow-batch; MEM-C scratch models ingestion as an explicit snapshot).
- mechanism: Unknown batch/stalling ingestion pipeline; no write-through or read-your-write guarantee; no ingestion-health signal.
- fix: Consumers never rely on write-then-read within a session; verify writes via the store (grep), not via search; re-run the 3-probe cadence measurement after any memory-system change.
- test: 3-probe cadence measurement: write timestamped probes, poll at 1/5/15/30/60 min, record time-to-retrievable.
- version: 1.0 (2026-09-24).
- applicability: Every lane writing findings and re-reading them in-session; any loop with a write-then-read step.
- counterexample: If the indexer regains a tight cadence, the hazard shrinks to the staleness window; keep the probes running rather than assuming.

### H-43: Concurrent-writer namespace sharing on the daily log
- problem: Independent lanes append to the same production daily file with no collision detection, namespacing enforcement, or ownership; one lane's cleanup script can delete another lane's entries if prefixes collide.
- scope: ~/memory/2026-09-23.md (shared daily file); all probing lanes.
- evidence: LIVE (MEM-B F-5: within one hour MEM-A wrote 66 [PROBE] lines, Agent 19 wrote 3 [PROBE2] entries including a wrong-tenant probe, MEM-B wrote 3 cadence probes; [PROBE] vs [PROBE2] prefixes are voluntary conventions, not enforced).
- mechanism: No write ownership, no locking, no namespacing at the file layer.
- fix: Cross-lane probe registry or time-slicing (needs parent call); lane-scoped scratch files for probes (this lane used scratch/, zero production writes).
- test: During concurrent runs, grep for prefix collisions and verify each lane's cleanup script is prefix-scoped.
- version: 1.0 (2026-09-24).
- applicability: All lanes running memory probes concurrently.
- counterexample: Prefix discipline held this run (no collision observed); the hazard is structural, not yet realized.

### H-44: Transactional loop with no bounded retry wedges silently on pool disappearance (chaos-a FC-2/MC-2)
- problem: A transactional loop with no bounded retry wedges silently when the DB pool disappears: it emits no error, only absence of progress, so monitoring that watches for errors never fires.
- scope: chaos-a behavioral harness (file-backed SQLite on this host; behavioral re-proof, not the A5 modules).
- evidence: TEST (chaos-a FC-2 / MC-2: pool disappearance -> silent wedge; only absence of progress observed).
- mechanism: Unbounded wait on pool acquisition with no retry budget and no stuck-progress detector; absence-of-progress is not an alertable signal anywhere.
- fix: Explicit retry budget plus a stuck-progress detector on every DB-touching loop; bounded retry with escalation. Infinite retry is not the fix.
- test: Re-run FC-2: kill the pool mid-loop; assert escalation fires within the budget.
- version: 1.0 (2026-09-24).
- applicability: Any DB-touching loop (coordinator, scheduler, bridge, janitor).
- counterexample: If the loop already surfaces pool errors loudly (not silently), severity drops to the retry-budget question alone.

### H-45: Dispatch intent must be durable before the coordinator's first write (chaos-a FC-3/MC-3)
- problem: A coordinator that dies after deciding but before its first durable write loses private intent unrecoverably, even when crash recovery is otherwise perfect; the next reign cannot distinguish "never decided" from "decided but unwritten".
- scope: chaos-a behavioral harness.
- evidence: TEST (chaos-a FC-3 / MC-3; the adopt pattern — next reign stamps the epoch on pre-enqueued intent — is the proven shape).
- mechanism: Intent exists only in the dead coordinator's memory; recovery reconciles durable state, never undecided intent.
- fix: Make dispatch intent durable BEFORE the first write (pre-enqueue intent, then stamp the epoch on adoption by the next reign).
- test: Re-run FC-3: kill the coordinator between decision and first write; assert the next reign recovers the intent.
- version: 1.0 (2026-09-24).
- applicability: Any coordinator with decide-then-write sequencing.
- counterexample: Epoch fencing and locks protect reign transitions, not intent that never existed (chaos-a's own note) — do not cite fencing as the fix.

### H-46: Probe idempotency-key reuse misreads dedup as failure (chaos-a MC-4; GC-12 sibling)
- problem: Globally-unique idempotency keys must be unique per probe invocation; if a probe reuses a key across runs, the mechanism under test correctly dedupes against the prior run and the probe misreads the dedup as a failure — a false negative manufactured by the harness.
- scope: chaos-a probes; any idempotency/dedup verification harness.
- evidence: STATIC (chaos-a MC-4 memory candidate; noted design hypothesis: cross-run key reuse is a real production aliasing hazard, not just a harness artifact).
- mechanism: Dedup is keyed globally, not per-run; the probe's key space collides with its own history.
- fix: UUID-suffix every probe invocation's idempotency keys; lint for key reuse across runs.
- test: Run the same probe twice with a fixed key; assert the second run's "failure" disappears with a fresh key.
- version: 1.0 (2026-09-24).
- applicability: Every idempotency/dedup verification harness. GC-12 family: methodology defects in verification, not code defects.
- counterexample: If the mechanism under test scopes dedup keys per-run, reuse is safe; verify the key scope before applying the fix.

### H-47: Terminal-set misquote across two state machines (orca-b LA-13; vocabulary-level contradiction)
- problem: The work-order LEDGER (orca_status_model.js: terminal = FAILED/VERIFICATION_FAILED/CLOSED, no COMPLETED state) and the DURABLE WORK-ORDER RECORD (objective-runtime.js / isTerminalWorkOrder: terminal = COMPLETED/FAILED/VERIFICATION_FAILED/BLOCKED) are two different state machines; quoting one set for the other produces false verdicts, and neither machine has an UNKNOWN state.
- scope: orca-b lane checkpoint 2026-09-24 (corrected after critic-semantic audit); any doc quoting terminal sets.
- evidence: STATIC (orca-b T+75 adopted the critic-semantic correction; LA-13 misquote caught by critic-semantic STATIC audit; orca-b VERDICTS.md semantic rules section).
- mechanism: Shared vocabulary ("terminal", "work order") across distinct state machines; memory entries quote terminal sets without naming the machine, so the contradiction is invisible at retrieval.
- fix: Every terminal-state claim names the state machine (ledger vs durable record) with file:line; the critic-semantic glossary is the authority.
- test: Grep program docs for bare "TERMINAL =" claims; assert each names its machine.
- version: 1.0 (2026-09-24).
- applicability: Every lane issuing lifecycle verdicts. GC-3/GC-9 family (verification-scope / claim-vs-source).
- counterexample: None; the two machines are confirmed distinct by source read.

### H-48: Untracked patch bundle would resurrect dead requires (critic-archdel GC12-REGREP hygiene note)
- problem: worktrees/oracle-assembly/oracle-assembly-patches/gateway/bootstrap/gateway_runtime.js is UNTRACKED, UNREFERENCED by the tracked tree, week-old (2026-09-16), and requires D-2/D-3/D-7 (commit_authority, patch_authority, filesystem_authority) — modules the deletion docket proved dead. Applying the bundle would resurrect dead requires and instantiate `new FilesystemAuthority(...)`.
- scope: /home/nolan/ping worktrees/oracle-assembly (Pig-side).
- evidence: STATIC (GC12-REGREP-REPORT.md 2026-09-24: 24/24 docket entries survive the all-quote-forms re-grep; the only hits triage to this untracked bundle).
- mechanism: Stale staging copies outside the tracked tree are invisible to docket and grep hygiene; a future "apply the patches" step reintroduces dead code as live.
- fix: Do not apply oracle-assembly-patches without re-review against the docket; quarantine or remove stale untracked bundles that contradict docket verdicts.
- test: Scan for untracked bundles referencing docketed-dead modules; assert none is appliable without review.
- version: 1.0 (2026-09-24).
- applicability: Any deletion docket (GC-10/GC-12); any repo with untracked staging copies.
- counterexample: If the bundle is intentionally preserved as a rollback reference, mark it superseded/quarantined in place rather than deleting.

## SCHEMA-COMPLIANCE AUDIT (self-check)
- H-35..H-48: all 9 fields present on all 14 entries: PASS (14/14). Checked: problem, scope, evidence, mechanism, fix, test, version, applicability, counterexample each non-empty.
- No INCOMPLETE entries presented as done. Positive results (orca-b H1-H4 harvest specs, gauntlet synthetic 9/9, critic-security killed attacks, A4b isolation proof) are recorded in MEMORY-PROOFS.md narrative, not as candidates.
- Program harvest sequence is now H-1..H-48 with no gaps.

## FOLLOW-ON QUEUE
1. Track H-35..H-48: candidates, NOT written to real memory. Re-run the corresponding attack if any get fixed at the system level (tenant support, tombstones, schema enforcement, entry-scoped chunks).
2. The F-A6 content-date-confusion finding (MEMORY-PROOFS.md) should enter the agent-side convention docs: never date-order bare fragments; INJECT first.
3. Cross-lane probe coordination (MEM-B F-5/H-43): needs a parent call; do not build unasked.
