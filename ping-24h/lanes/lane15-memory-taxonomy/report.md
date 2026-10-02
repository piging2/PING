# LANE 15: PING Memory / Learning Taxonomy

**Lane:** 15 (memory/learning taxonomy) | **T+0:** 2026-09-28 14:26 MDT | **Completed:** 2026-09-28
**Mode:** READ ONLY. Canonical tree `/home/nolan/projects/ping` on Pig WSL at HEAD `0264d517` (branch `hardening/2026-09-28-vocab-ssrf`), read via `~/workspace/pig-fb/pigwsl-exec.sh -s`. Nothing written to any canonical tree. No commits, no pushes, no restarts. No secrets read or printed.

## Report status: HYPOTHESIS

This report is a hypothesis until its PING-relative verdicts are replayed from a clean checkout. All code claims were read directly from the stated tree; claim tags used: OBSERVED IN CODE / DOCUMENTED / INFERRED / NOT OBSERVED. Lane 4 (AgentArk/Pernix), Lane 6 (Hivekeep), Lane 9 (phase-0 inventory), and Lane 10 (ORCA knowledge) reports were consumed as inputs; their PING-relative claims are cited as lane hypotheses, not re-verified here. Raw evidence pointers: `raw/taxonomy-evidence-pointers.md`. Lane 10's 12-question knowledge-gap map and compiler analysis are not duplicated; this lane covers durable STORES.

Coordination note: two follow-up handoffs directed at Lane 14 (contract comparison: lane 11 decision-fabric findings T1/T2/P2; lane 10 executor-receives-raw-prompt finding) arrived in this lane's session. Lane 15 did not act on them. They are recorded at `raw/lane14-handoff-received.md` for re-routing.

---

## 1. THE TAXONOMY TABLE

Categories per the lane 4 frame: ARCHIVE / STANDING CONTEXT / SEMANTIC KNOWLEDGE / PROCEDURAL KNOWLEDGE / MODEL PARAMETERS / POLICY / UNCLASSIFIED. Nothing in PING is called just "memory"; the taxonomy fits well.

### ARCHIVE: append-only evidence of what happened

| Surface | Owner | Writer(s) | Reader(s) | Mutation rules | Evidence tags |
|---|---|---|---|---|---|
| `data/fyd-journal/events.jsonl` via `tools/fyd-journal-gateway/server.mjs` (canonical event log) | FYD journal lane | Gateway POST /events: `emitOverlayEvent` (:3100, bearer-gated via FYD_JOURNAL_WRITE_TOKEN; fail-closed 503 with no token configured); MC dispatch writes MC_* lifecycle events | `PingObjectReader.queryFydSiteOverlays` (sanitized overlay ops only, tenant-scoped at authority); `fyd-tenant-graph.ts` (fixture + overlay composition, digest verified at both layers); MC `projectMissions()`, approvals route | Append-only, immutable. No edit/delete path. Idempotent replay by request_id + tenant binding: same tenant replay returns original event (`deduped:true`), no new append; different-tenant reuse rejected 400 with zero disclosure of the original event_id. Corrupt lines skipped on index rebuild, keep serving | Per-overlay provenance `{kind, ref, derivedAt}` (kinds observed: `canonical-journal`, `overlay-authored`, `procedural-fixture`, `website-ingestion`, `directory`, `owner-authored`, `owner-correction`, `owner_asserted`, `demo-overlay`) |
| `data/fyd-owner/<objectId>.json` event log | Object layer (`src/fyd/object/owner-events.ts`, `owner-store.ts`) | Owner-intent routes: `overrides/route.ts` (PROPOSE then APPROVE, digest-bound, OwnerContext capability chain 403 on deny); customize route via `write-boundary.ts` | Read seam (`owner-overlay.ts`): site pages, Ask FYD, ObjectView, Circle projection | Append-only log; returned state is a pure projection over the log. Revert appends `owner.restored-fact`; the correction event stays in the log. Old mutable-store files migrated on read. All commands fail closed (typed OwnerCommandError, nothing written) | Per-event `{kind, ref, detail}` evidence (e.g. `source-snapshot` with the source value seen at correction time); `provenance.supersedes` chains (corrections.ts assertion algebra) |
| Claim records `data/fyd-claims/<resourceId>.json` | Claim lane (`src/fyd/claim/machine.ts`, `store.ts`) | `claims/[resourceId]/{claim,verify,release}/route.ts`; `onboarding/anonymous-preview.ts` | Claim projection (`claim-projection.ts`, viewer-kind shaped, fail-closed null) | Immutable transitions: OBSERVED -> CLAIMED -> VERIFIED-CONTROLLED, `release()` back to OBSERVED. Invalid transitions throw, change nothing. Atomic tmp+rename writes; invalid/missing reads return null, never invented state. Directory currently EMPTY (store wired, no records) | State itself is an evidence tag (observed = public evidence only; claimed = asserted identity; verified-controlled = proof-bearing). `verification` proof with human-readable basis; per-transition audit `history[]` (actor, type, detail) |
| `data/fyd-identity/audit.jsonl` | Identity lane (`src/fyd/identity/file-store.ts`) | Identity provider (sign_up events) | Identity provider | Append-only | Identity records (identityId, provider, providerAccountId), not epistemic tags |
| `data/fyd-idempotency/ledger.jsonl` + `locks/` | Customize lane (`src/fyd/customize/write-boundary.ts`) | write-boundary (approve/clear owner actions) | write-boundary (replay path reads ledger for decisions) | Append-only JSONL. Per-site scoped lock (in-process mutex + lockfile) closes the TOCTOU in the optimistic proposal-digest precondition. Crash between journal append and ledger record is safe because the gateway dedupes on request_id (retry converges on the original event_id) | Server-computed canonical payload digest (the client never supplies the digest: server is the digest authority). Same request_id + same digest = replay; same request_id + different digest = 409 CONFLICT |
| `data/fyd-idempotency/diagnostics.jsonl` | Customize lane | write-boundary | Nobody (explicitly) | Append-only | None. DOCUMENTED as "subordinate evidence only; never read for decisions" |

### STANDING CONTEXT: always-present behavioral content that shapes future interactions

| Surface | Owner | Writer(s) | Reader(s) | Mutation rules | Evidence tags |
|---|---|---|---|---|---|
| Owner-overlay projected state (the live projection over the owner event log, composed AFTER digest verification at the read seam) | Object layer (`src/fyd/object/owner-overlay.ts`) | Derived from owner event log (see above) | Every read-seam consumer: generated site pages, Ask FYD, ObjectView, Circle projection. Same EFFECTIVE value with same provenance on every surface, no per-surface patching | Projection, not a second write. Source projection never mutated; `sourceDrifted` derived per read, never written back. Source re-ingestion re-reads the owner store, so refresh can never silently wipe a correction | Each composed object carries the full correction record (source value, owner value, timestamp, actor label, basis); surfaces can render SOURCE SAYS X / OWNER SAYS Y honestly |
| Visibility policy (HIDE assertions consumed by the visibility layer) | Owner-mode lane (`src/fyd/owner-mode/visibility-policy.ts`) | Owner assertions (HIDE op) | Visibility layer | HIDE never changes the fact value; FACT and VISIBILITY kept separate (frozen semantics) | Linked to the assertion's provenance |
| `data/fyd-follows/local.json`, `data/fyd-likes/local.json` | Object layer (`src/fyd/object/follows.ts`, `likes.ts`) | Local engagement actions | Ask/product surfaces | Append/remove of site keys with `followedAt` | Minimal (site key + timestamp) |
| Onboarding build-job state (`compile-tenant.ts`) | Onboarding lane | Build pipeline | Job pages | Ephemeral stage state (ANALYZING -> UNDERSTANDING -> BUILDING -> READY/FAILED) | None. This is workflow scratch, not standing knowledge |

**Gap vs Hivekeep:** PING has NO curated agent standing-context document and NO standing-context admission rule (no boundary test like "should this influence most future conversations unprompted?"). The owner-overlay projection is the de facto standing context (owner intent that wins on every serve), but its admission is per-correction owner action, not a stated routing discipline. First-pass findings' MC change item 1 already flags this harvest.

### SEMANTIC KNOWLEDGE: falsifiable beliefs with evidence refs

| Surface | Verdict |
|---|---|
| Claim records (verification proofs, state machine, audit history) | NEAREST PRESENT. A claim is an assertion with a proof basis and an audit trail, but not a falsifiable hypothesis about behavior; it is an ownership/evidentiary record. |
| `verifyAnswerClaims` epistemic grades (SUPPORTED/DERIVED/INFERRED/UNKNOWN + B3 rank) | DECLAR
ED ONLY. Lane 10 OBSERVED: zero production callers. Not stored anywhere; per-request packet content. |
| Ask-path `AskClaimClassification` (DIRECT_FACT/DERIVED_FACT/INFERENCE/GENERATED_COPY/USER_OVERRIDE, plus CONFLICTED cites) | PRESENT at request time in the live serving path (ask-composer, visitor-answer). Not persisted as stored state. |
| MC projection vocab (PROVEN/OBSERVED/DERIVED/UNKNOWN/STALE/CONFLICTING/PROTOTYPE/UNWIRED) | PRESENT in MC surfaces (action-verifier.ts, MC routes). These are projection states, not tags on stored state. |
| Dream hypotheses (falsifiable beliefs about memory, Pernix-style with validation) | ABSENT. No belief store, no validation machinery. |
| Lesson store (mined candidates, confidence counters) | ABSENT. The PING target learning loop (OUTCOME -> candidate lesson -> evidence -> hypothesis -> replay/counterfactual -> falsification -> promotion) is DOCUMENTED as a target only (lane 4); no implementation found in the tree. |

### PROCEDURAL KNOWLEDGE: skills (capability packages, instructions for doing)

**ABSENT as a durable store.** No SKILL.md surface, no skill registry, no skill quarantine, no skill verify blocks found in the tree (filename greps for `skill*` returned zero). Procedural knowledge lives in code (acquisition adapter contracts, ask-composer, canonicalize) and docs, not as learning artifacts. Pernix's canary skill-verification pattern and AgentArk's `skill_patch` hard block have no substrate here: there is nothing for them to apply to. The knowledge-loop marketing diagram (`knowledge-loop.tsx`: input -> observation -> evidence -> canonical event -> knowledge -> business graph -> playbook -> automation -> new evidence) describes playbooks as a stage; no playbook store exists.

### MODEL PARAMETERS

Untouched by design. No weight updates, no optimizer, no embedding store for memory (Qdrant references in-tree are the MC technology tab's infrastructure inventory/health, not a memory vector store). The app-level embedding init state is UNKNOWN per lane 9. Bounded self-modification (lane 4's universal ceiling) holds by absence: the learner that could touch parameters does not exist.

### POLICY: durable behavioral rules the agent follows

All code, all observed, each with an owner:

| Policy surface | Owner | What it governs |
|---|---|---|
| `src/fyd/claim/machine.ts` (pure state machine, immutable transitions) | Claim lane | Claim lifecycle authority |
| `src/fyd/tenant/tenant-context.ts` (`requireTenant` REFUSE, typed error, never empty fallback; tenantId in every store key/path; worker paths carry explicit context) | Tenant lane | Tenant boundary (hard requirement) |
| `src/fyd/owner-mode/visibility-policy.ts` (FACT vs VISIBILITY separation, locked) | Owner-mode lane | Visibility semantics |
| `src/fyd/ask/field-conflicts.ts` (FYD-Q1 locked: both observations survive, disputed value suppressed, fixed public copy) | Ask lane | Conflict projection policy |
| `src/fyd/customize/write-boundary.ts` (client request_id / server digest authority / 409 conflict / UNKNOWN on timeout) | Customize lane | Idempotent owner actions |
| `tools/fyd-journal-gateway/server.mjs` (tenant admission, request_id tenant binding, bearer write token) | Journal lane | Event admission |
| `src/app/api/fyd/objects/[objectId]/overrides/owner-context.ts` + route (PROPOSE/APPROVE digest loop, capability chain; DemoOwnerContext today, one-class seam for real auth; "no production authentication on this route" stated honestly in code) | Owner-mode lane | Owner-mutation authorization |
| Epistemic vocabularies (three schemes, no canonical mapping: compiler's `classificationFromProvenance`, ask-path FactClass, MC projection vocab) | Ask lane / MC lane | Evidence grading |

**Machine-authored policy edits (Pernix Adaptive): ABSENT.** No `adaptive_proposals`, no veto window, no lint gate, no TTL expiry. The LESSON -> POLICY pipeline does not exist, so the LESSON != POLICY separation is mechanical-by-absence rather than enforced at a gate.

### UNCLASSIFIED

- MC dispatch's out-of-tree journal read path (`/home/nolan/workspace/fyd-journal-gateway/events.jsonl`): second sink path vs the gateway's in-tree default `data/fyd-journal/events.jsonl`. Whether the two converge in production is UNKNOWN (lane 9 anomaly). If they are two live journals, that is a second-truth risk on the archive surface; if the workspace path is legacy, it is dead config. Needs a replay check.
- The assistant's own operational memory (`~/MEMORY.md`, `~/memory/`, workspace notes): agent-level, not PING canonical tree. Out of scope for this taxonomy; noted so it is not mistaken for a PING product surface.

---

## 2. CONFLATION MAP: categories PING mixes that must stay separate

1. **Evidence identity vs evidence content in dispatch (FACT/POLICY).** `src/app/api/mc/dispatch/route.ts:314` mints `contextPackId = 'mc-ctx-' + missionId` from params only: the id claims a compiled evidence artifact exists when none does. The ContextPacket compiler exists but is unwired (lane 9, lane 10). The in-flight ContextPack patch resolves this; until it lands, the work-order artifact carries provenance it does not have. (Lane 10: "the executor receives the raw prompt, not the compiled artifact"; post-patch the packet binds the work order but not the executor's reasoning. Relevance to lane 14's contract work, recorded in `raw/lane14-handoff-received.md`.)

2. **Three epistemic vocabularies, no canonical mapping (SEMANTIC KNOWLEDGE).** The compiler's `classificationFromProvenance` (USER_OVERRIDE/DEMO_SYNTHETIC/DIRECT_FACT/website_statement/UNKNOWN), the live ask path's FactClass (DIRECT_FACT/DERIVED_FACT/INFERENCE/GENERATED_COPY/USER_OVERRIDE), and the MC projection vocab (PROVEN/OBSERVED/DERIVED/UNKNOWN/STALE/CONFLICTING/PROTOTYPE/UNWIRED) are three schemes with three owners and no mapping. Worse, `classificationFromProvenance` exists TWICE with different mappings (`context-compiler.ts:180` maps `directory` to DIRECT_FACT and owner kinds to USER_OVERRIDE; `ask-composer.ts` maps `owner` to `owner_authorship` with no `directory` case). Per the constitutional rule of one, these must converge; the compiler's version is the stronger candidate (lane 10 finding, endorsed here).

3. **Domain events and agent-operations events share one journal file (ARCHIVE).** The live workspace journal sink carries both `FYD_SITE_OVERLAY` (business-domain) and `MC_ARTIFACT_PUBLISHED` / `MC_RUN_SUCCEEDED` (agent-operations) records in one append-only file. Same category (archive), so this is mild, but readers filter by event_type with no enforced schema separation observed at admission. The governed seam (`PingObjectReader`) selects only `FYD_SITE_OVERLAY`, which contains the risk.

4. **Replay/ledger content vs diagnostic content (ARCHIVE).** Mostly clean: `ledger.jsonl` IS read for decisions (replay path; that is its purpose) while `diagnostics.jsonl` is explicitly "subordinate evidence only; never read for decisions." The separation is stated, not accidental. No change needed.

5. **Owner assertions ride the same graph as observed facts (FACT vs POLICY-ish).** This one PING gets RIGHT and the overlay machinery is the reason: owner corrections never mutate source state; they compose after digest verification with full correction records carried per object, so SOURCE SAYS X / OWNER SAYS Y stays distinguishable at every surface. The conflation risk would be real without the overlay; the overlay is the separator. (Same family as AgentArk's skill_patch hard block: a structural boundary, not an aspiration.)

6. **LESSON does not exist, so LESSON vs POLICY vs FACT is decided by absence, not by gate.** There is no mined-lesson store that could leak into policy (AgentArk's failure) or into capability (skill_patch block). The day a learning loop lands, its lesson store must be a separate surface with a typed promotion gate; today the taxonomy has an empty LESSON cell. Do not let a future lane file "learned procedures" into the policy code files (machine.ts, tenant-context.ts, write-boundary.ts) or the skill-shaped surfaces.

---

## 3. ABSENCE AUDIT: Hivekeep's absences, checked against PING

| Hivekeep absence | PING verdict | Evidence |
|---|---|---|
| Evidence tags on stored state (KNOWN/UNKNOWN/CONFLICTED/STALE/INFERRED) | **PRESENT (partial)** | Journal overlays persist provenance `{kind, ref, derivedAt}`; owner events persist `{kind, ref, detail}` evidence; claim records persist state + proof + history; ask-path fields carry FactClass. Gaps: STALE is derived per read (`sourceDrifted`, never written); CONFLICTED exists only in the live ask path (field-conflicts.ts), not as a persisted tag; `verifyAnswerClaims` grades (SUPPORTED/DERIVED/INFERRED/UNKNOWN) are declared-only (unwired compiler); three vocabularies with no canonical mapping (conflation #2) |
| Retraction/supersession lifecycle | **PRESENT** | Owner log: append-only, `owner.restored-fact` reverts, correction stays (owner-store.ts OBSERVED IN CODE). Assertion algebra: `provenance.supersedes` chains, chain-head-only apply (corrections.ts OBSERVED IN CODE). Claims: `release()` back to OBSERVED with history preserved (machine.ts OBSERVED IN CODE). Journal: immutable append-only; correction is a new overlay op. Stronger than Hivekeep's in-place overwrite + hard delete |
| Dedup behavior on embedding failure | **NOT APPLICABLE (no fail-open)** | PING has no embedding-based memory dedup surface. Dedupe that exists: request_id + tenant binding at the gateway, fail-closed on cross-tenant reuse (400, zero disclosure); payload-digest conflict (409) at the write-boundary ledger. One layering note: the gateway's dedupe is payload-blind (same tenant + same request_id returns the original event without comparing payloads); payload consistency is enforced one layer up in the ledger, not at the journal gate |
| Tenant isolation of memory surfaces | **PRESENT (designed + hostile-tested)** | `requireTenant` REFUSE contract (never empty/null fallback); gateway write-side bearer token + tenant_mismatch 400s + request_id_tenant_conflict 400; `queryFydSiteOverlays` filters at the authority; `f-journal-privacy.test.ts` hostile suite covers write spoofing, read fail-closed, per-tenant visibility, request_id conflict. Caveats: (a) overrides route runs on DemoOwnerContext ("no production authentication", labeled, one-class seam); (b) two journal sink paths observed (in-tree default vs out-of-tree MC read path), convergence UNKNOWN |

---

## 4. FAILURE-MODE SPECIMENS: donor failures vs PING surfaces

1. **Timeout-as-acceptance (AgentArk, REJECT).** NO ANALOGUE. PING is the opposite in code: write-boundary.ts contract states "A journal POST whose outcome is unknown (timeout / lost response) surfaces as UNKNOWN, never as failure. Timeout never means failed." (OBSERVED IN CODE). PING ALREADY STRONGER, confirmed directly in the tree.

2. **Veto-window auto-approve (Pernix, REJECT).** NO ANALOGUE. There is no adaptive-edit pipeline; no timer, retry, or expiry path transitions to APPROVED in any memory surface. First-pass findings item 3 ("Silence is never consent... Verified in mission-control/approval_request.py") is consistent with the tree as read. PING ALREADY STRONGER.

3. **Goal/budget self-mutation (Pernix, AUTHORITY BYPASS).** NO ANALOGUE in memory surfaces. Owner-event writers are owner-intent routes behind the OwnerContext capability chain (403 on deny; demo-seeded actor, labeled); an arbitrary agent turn cannot append owner assertions. The ask-ping AskProposal flow requires human approval of the exact digest. The adjacent authority-at-invoke-time question (who decides authority posture AT INVOKE TIME; lane 11's T1/T2 findings) is lane 14's contract domain, not a memory surface; recorded in `raw/lane14-handoff-received.md`.

4. **Harness-manufactured evidence (Pernix, AUTHORITY BYPASS).** NO ANALOGUE. The write boundary states the server is the digest authority: "Client-generated request_id per owner action; server-computed canonical payload digest (the client never supplies the digest)." The harness never completes evidence the producer did not supply. PING ALREADY STRONGER.

5. **Prose rails as authority (Pernix, AUTHORITY BYPASS).** NOT OBSERVED. The tenant boundary (`requireTenant` REFUSE), claim demo-context refusal (`DEMO_CONTEXT_IDS`), and capability-chain 403 are code gates, not docstrings. The one honest prose-adjacent seam is explicit: the overrides route's "no production authentication" is a labeled demo state behind a one-class seam, never presented as production auth.

6. **Feedback-loop retrieval (Hivekeep).** NO ANALOGUE observed. PING has no exposure-counted ranking on any memory surface (no retrieval_count, no importance self-ratings, no per-message auto-injection of memories). The context compiler's relevance scoring is deterministic and unwired; the live ask path's relevance architecture is per-request with no self-reinforcing input. The invariant (usefulness-unproven signals must never multiply a ranking score) should be stated as a negative constraint for any future ranked memory surface, including MC's search intent router (first-pass MC change item 2).

7. **Dedup fail-open (Hivekeep).** NO FAIL-OPEN ANALOGUE. Request_id dedupe is tenant-bound and fail-closed; embedding-failure dedup has no substrate. The payload-blindness at the gateway layer (same tenant + same request_id replays without payload comparison) is contained by the ledger-level 409 conflict one layer up. Not a bypass, but the layering should be documented as intentional.

8. **Weighted-scalar collapse / proposer-assigned confidence (AgentArk).** NOT APPLICABLE. No learning benchmark or lesson gate exists. When a learning loop lands, these are the two anti-patterns its promotion gate must be tested against (high proposer confidence + thin/correction-heavy evidence must fail the gate).

9. **Post-hoc safety as primary safety (Pernix).** PARTIAL ANALOGUE RISK, but structurally countered. MC_RUN_UNKNOWN as first-class state and the 409 HOLD machinery show typed UNKNOWN handling rather than ship-now-measure-later. The gap lane 9 flagged (no dedicated mission reconciler; HOLD in dirty uncommitted code, zero tests) means UNKNOWN states can currently sit unreconciled, which is an observability gap, not a safety posture failure.

10. **Auto-promote coexistence (AgentArk).** NOT APPLICABLE. No canary rollout, no auto-promote path. If PING adopts canary promotion, auto vs human approval must be explicit auditable policy per surface (lane 4).

---

## 5. SMALLEST OWNERSHIP PROPOSAL (no new stores)

For each category, the existing surface that should own it. Categories with no owner are named as gaps, not filled.

| Category | Owner proposal | Rationale / note |
|---|---|---|
| ARCHIVE (domain events) | `tools/fyd-journal-gateway` + `data/fyd-journal/events.jsonl` (FYD journal lane) | Already the de facto owner. Resolve the two-sink-path question (in-tree default vs out-of-tree MC read path) with a replay check; do not add a second journal |
| ARCHIVE (owner intent) | `src/fyd/object/owner-events.ts` + `owner-store.ts` (object layer) | Append-only owner log; already owned. Keep |
| ARCHIVE (claims) | `src/fyd/claim/` (machine.ts + store.ts) | Already owned. `data/fyd-claims/` is empty; the store is wired, awaiting first real claims |
| ARCHIVE (identity) | `src/fyd/identity/file-store.ts` | Already owned |
| ARCHIVE (idempotency) | `src/fyd/customize/write-boundary.ts` + ledger | Already owned; diagnostics subordinate-only by stated rule |
| STANDING CONTEXT (owner intent) | `src/fyd/object/owner-overlay.ts` read seam (object layer) | The projection that wins on every serve is the de facto standing context. No new profile store. Harvest to add: Hivekeep's boundary-test sentence as a stated admission/demotion discipline for what enters this projection vs stays in the archive |
| STANDING CONTEXT (engagement prefs) | `src/fyd/object/follows.ts`, `likes.ts` | Already owned |
| SEMANTIC KNOWLEDGE | **No owner; no store exists.** Nearest: claim records (claim lane) for evidence-bearing assertions | Do not invent. When a lesson/dream store lands, it must be a separate surface from POLICY code with a typed promotion gate (AgentArk hard-boundary pattern) |
| PROCEDURAL KNOWLEDGE | **No owner; no store exists** | Do not invent. Procedures live in code today; if a skill surface is ever introduced, it needs an owner and verify-blocks at that time |
| MODEL PARAMETERS | **No owner; no surface.** Ceiling: untouched by design | State the ceiling explicitly when the learning loop is specified |
| POLICY | Distributed, already owned: claim machine, tenant-context contract, visibility policy, field-conflicts, write-boundary, journal admission, overrides OwnerContext seam | Keep distributed (each is a small, tested, lane-owned contract). Do not consolidate into one policy blob; do converge the three epistemic vocabularies under the compiler's `classificationFromProvenance` as the canonical mapping |
| UNCLASSIFIED | Resolve or delete: the out-of-tree journal read path; agent operational memory stays out of the product tree | One replay check each |

**What PING should NOT build from this taxonomy:** a new memory store, a new graph, a new event spine, a curated agent profile document, or an embedding-backed recall layer. The stores exist and are lane-owned; the gaps are discipline gaps (admission rule, vocabulary convergence, wiring the declared compiler, replaying the two-sink question), not storage gaps.

**Open questions for the parent:** (1) The two journal sink paths need a clean-checkout replay to determine whether MC reads the live journal or a legacy copy. (2) The PING-relative verdicts in sections 4-5 rest on static reads of the worktree at 0264d517 with 74 dirty files; dirty-state behavior (409 HOLD, mc-dispatch identity/tenant gates) was not adjudicated here. (3) Lane 14-directed handoffs in `raw/lane14-handoff-received.md` need re-routing.

---
*Read-only investigation. No canonical tree modified, no processes restarted, no credentials touched. All verdicts are HYPOTHESIS until replayed from a clean checkout.*
