# GRILLING BRIEF - the ONE active operator decision surface

For Nolan. Last updated: 2026-09-22 (2026-09-22 changes: PG-001 parked as answered-HOLD; stale ACTIVE GATEWAY-001 removed; G1 and G3 recorded operationally resolved; DEPLOY-PROV-001, G2-IDENTITY, G4-AGENT-TENANT, MEDIA-RIGHTS-001, AUTOCRDT-001 added).

This file is the ONE canonical GRILL deliverable. ALL lanes, agents, workers, audits, backlog processors, convergence work, marketing work, runtime work, and self-improvement work route consequential operator questions through this file.

Do not create parallel `OPERATOR_DECISIONS_REQUIRED.md`, `QUESTIONS_FOR_NOLAN.md`, `DECISIONS_NEEDED.md`, `GRILLING_BRIEF_2.md`, or lane-specific decision inboxes as competing operator-question authorities. Existing artifacts may remain for history. Do not delete them. This file is the active surface.

Live operational note: the 2026-09-19 backlog lane touched canonical status fields ahead of tonight's 09-20 UTC queue (fires 18:00 MDT). Snapshots of the backfill are in the outreach goal's `hidden_files/backfill-snapshots/`.

## THE ONE GRILL RULE

From now on there is exactly ONE canonical GRILL deliverable. ALL lanes, agents, workers, audits, backlog processors, convergence work, marketing work, runtime work, and self-improvement work route consequential operator questions through that ONE GRILL.

## GRILL RETENTION RULE

A Grill is NOT a permanent graveyard of answered questions. When Nolan answers a question:

1. record the decision in the appropriate durable system/history;
2. remove it from the ACTIVE QUESTIONS portion of the Grill;
3. propagate the decision to the work that needs it.

However, preserve/resurface an answered question in the Grill when the answer is meaningfully:

```text
CONTRARIAN
UNINTUITIVE
CONTROVERSIAL
HOT TAKE
HIGHLY REVERSIBLE BUT HIGH CONSEQUENCE
```

and therefore worth periodically challenging. Those retained decisions belong in:

```text
DECISIONS WORTH RE-GRILLING
```

They are not presented as unanswered. Do not retain ordinary resolved questions merely for historical completeness. Git/history/evidence already provides history. The Grill is for DECISION PRESSURE.

## WHAT BELONGS IN THE GRILL

Route something into the Grill when it requires Nolan's judgment because it involves:

```text
constitutional authority
destructive action
meaningful product/business choice
competing truths/owners
material money/reputation/customer risk
security boundary
irreversible or difficult-to-reverse decision
contrarian architectural choice
human-value judgment
genuine ambiguity not answerable from evidence
```

Do NOT Grill Nolan about questions the agent can resolve empirically. Agents should investigate first.

Every ACTIVE question carries:

```text
QUESTION
WHY IT MATTERS
WHAT EVIDENCE SAYS
CONTRADICTION / TRADEOFF
DEFAULT IF NOLAN DOES NOTHING
RECOMMENDED NEXT EXPERIMENT if empirical resolution remains possible
```

Do not manufacture decisions just to populate the Grill.

## ACTIVE QUESTIONS

### DEPLOY-PROV-001: accept candidate-3c5d280dd as the honest live baseline, then stop :8081 to restore single-writer?

QUESTION: Accept ping-gateway:candidate-3c5d280dd as the honest live baseline (recording the undocumented promotion), and stop :8081 to restore single-writer operation?

WHY IT MATTERS: Since ~2026-09-21 12:03-12:05 UTC both Oracle gateway containers (:8080 and :8081) run candidate-3c5d280dd, healthy, zero restarts, both attached to the same database. The certified image was candidate-84486f056 (ORACLE_RUNTIME_PROVEN, ORACLE_RESTART_PROVEN, rollback anchor 8400deecf2a9). No record in the current context explains the promotion of 3c5d280dd to :8080, and the deployment registry has zero rows. Two gateways against one database violates the desired single-writer posture (latent dual-writer risk).

WHAT EVIDENCE SAYS: FL-20260921-P1 documents the candidate's build provenance (commit `3c5d280dd3735ceb2deb4433384902d07552d372`, P1 battery green on :8081). GATEWAY-001 authorized the 8080 swap to this exact candidate on 2026-09-21 (Nolan: GO), so the build itself was authorized; what is undocumented is the observed outcome (both ports now on the candidate, promotion unrecorded). Disk reclamation 80% -> 56% (~11 GB) happened in the same window. No container was stopped; certified and rollback images remain preserved.

CONTRADICTION / TRADEOFF: (a) Accept: record the baseline honestly, keep the running candidate, stop :8081 to restore single-writer. (b) Roll back :8080 to the certified image: returns to the documented baseline, but re-runs a migration on the live DB during active use. (c) Do nothing: both containers keep running the candidate with the provenance gap open and the dual-writer risk latent.

DEFAULT IF NOLAN DOES NOTHING: (c) - nothing stops without his word; the gap stays open.

RECOMMENDED NEXT EXPERIMENT: None empirical; this is a judgment call. If he accepts: stop :8081, record the provenance honestly, populate the deployment registry.

### G2-IDENTITY: cross-era identity/dedup posture - unify or keep eras separate?

QUESTION: Adopt a cross-era identity/dedup policy (identity formats differ across eras; define the canonical mapping and dedup rules), or keep eras strictly separate?

WHY IT MATTERS: Identity formats conflict across eras (Pig-era vs Oracle-era vs convergence worktree). Casual reminting of historical IDs would silently rewrite history and break provenance. G2 cross-era dedup is a consequential operator decision per the 2026-09-22 archaeology.

WHAT EVIDENCE SAYS: ID formats are documented per era; no dedup has been executed. The identity law was installed 2026-09-22 as NORTH STAR rule 14 (ID formats change only via a versioned identity domain with a migration plan; historical rows are never reminted).

CONTRADICTION / TRADEOFF: (a) Define mapping + dedup rules: one identity space, but dedup execution is consequential and irreversible. (b) Keep eras separate: safe, but identity stays fragmented and every cross-era join needs manual qualification.

DEFAULT IF NOLAN DOES NOTHING: (b) - eras stay separate, no reminting, no dedup.

RECOMMENDED NEXT EXPERIMENT: None empirical; this is genuine operator judgment.

### G4-AGENT-TENANT: define the agent-to-tenant authority boundary?

QUESTION: Define the agent-to-tenant authority boundary (which agents may act for which tenant, under what capability grants), or leave it on the current implicit grant?

WHY IT MATTERS: Agents (Hermes, workers, discovery lanes) act across tenant boundaries; without an explicit binding, an agent could exercise authority it was never granted. CG-001 names the tenant owner as the human decider; the agent side of that boundary is undefined, and the 2026-09-22 archaeology flags it as consequential.

WHAT EVIDENCE SAYS: Nolan granted agents surgical write authority 2026-09-16 with hard boundaries (no pushes, no main commits, no credential exposure, no destructive actions, no restriction bypass); capability machinery converges on one authority (cap-one-authority DONE_VERIFIED). The binding shape itself is unwritten.

CONTRADICTION / TRADEOFF: (a) Explicit binding: auditable, but adds a grant ceremony to every agent path. (b) Leave implicit: fast, but agent authority stays un-auditable.

DEFAULT IF NOLAN DOES NOTHING: (b) - implicit; agents act under the 2026-09-16 grant and the standing hard boundaries.

RECOMMENDED NEXT EXPERIMENT: None empirical; this is constitutional judgment.

### MEDIA-RIGHTS-001: production media rights/retention policy for FYD?

QUESTION: Define the production media rights/retention policy for real owner media in FYD (who may upload, how long media is retained, takedown path, provenance records), or defer until the first real owner media arrives?

WHY IT MATTERS: The media pipeline exists (managed derivatives, SSRF boundary proven in the escalation-3 test). The moment real owner media enters, rights and retention become legal/reputation risk. The policy is currently unwritten (media-rights-policy, DECISION-pending in BACKLOG_PING.md).

WHAT EVIDENCE SAYS: Media fetch SSRF boundary proven; owner removal path unwritten; alt-text/depiction accuracy untested; media refresh/staleness partially implemented.

CONTRADICTION / TRADEOFF: (a) Write the policy now: front-loads the decision before real media exists. (b) Defer: faster now, but the first real media lands with no policy in place.

DEFAULT IF NOLAN DOES NOTHING: (b) - unwritten until the first real owner media.

RECOMMENDED NEXT EXPERIMENT: None empirical; this is policy judgment.

### AUTOCRDT-001: is the no-CRDT rule absolute or draft-layer-scoped?

QUESTION: Is the no-CRDT rule absolute (the Automerge harvest verdict flips to REJECT), or draft-layer-scoped (USE-LIBRARY at the draft layer for converging concurrent edits, never as the canonical event log)?

WHY IT MATTERS: Two harvest docs disagree and must be reconciled before anything is decided. The ecosystem harvest says @automerge/automerge 3.5.0 (MIT) is USE-LIBRARY "at the draft layer for converging concurrent edits; never as the canonical event log." The 2026-09-22 lane states "FYD has a no-CRDT rule" (Puck collaboration context), with the SitePatch seam as the only channel and structured patches only.

WHAT EVIDENCE SAYS: Automerge 3.5.0 MIT; the SitePatch seam is the only structured-patch channel; draft-layer concurrent edits are the unmet need the library would serve.

CONTRADICTION / TRADEOFF: (a) Absolute: simpler and consistent, but concurrent draft edits need another mechanism. (b) Draft-layer-scoped: converges concurrent edits with a proven library, but introduces a CRDT at one layer.

DEFAULT IF NOLAN DOES NOTHING: No adoption; the harvest stays undecided.

RECOMMENDED NEXT EXPERIMENT: None empirical; this is architectural judgment.

## PARKED - ANSWERED, AWAITING TRIGGER

Not active. Answered; the trigger for execution is named. Do not present as unanswered.

### PG-001: pg_hba trusts loopback - tighten to scram-sha-256? (Nolan's call 2026-09-21: HOLD)

Content as previously briefed: tighten pg_hba.conf on the Oracle postgres from `trust` (local + 127.0.0.1/32 + ::1/128) to scram-sha-256, or leave loopback trust in place? The DB password is not checked on loopback, so anyone with `docker exec` on ping-postgres gets passwordless DB access. The rotation completed cleanly with trust in place; all five consumers agree on the new 48-char credential. Tightening requires a postgres reload (low risk).

Trigger: make it the NEXT SECURITY PATCH immediately after the gateway stabilizes. Do not leave loopback trust indefinitely merely because password rotation succeeded.

### G-LANEB-1: Should completed mission results auto-project into the knowledge graph as candidate nodes?

QUESTION: Add `MISSION_COMPLETED` to the 18 business event types projected into the knowledge graph as candidate nodes, keep business-events-only, or allowlist selected mission types?

WHY IT MATTERS: Discovery Lane B proved two things on 2026-09-20: (1) the worker's actual product (`dispatchResult`) is discarded at `mission_scheduler.js:371`, so 144 completed missions' products are unrecoverable from the durable record; (2) the KnowledgePromoter was registered but reachable by nothing (zero emitters, no bridge entries, no worker-map routing), and the lane closed the routing edge (`KNOWLEDGE_PROMOTE` -> knowledge-promotion, commit `ed0de7edd` on the discovery branch). The promoter path now exists, but `MISSION_COMPLETED` is excluded from the graph-projection list (`core_event_spine.js:70`), so machine-produced results can be approved but never enter organizational knowledge. The first missing edge from completed work to durable knowledge is this projection decision.

WHAT EVIDENCE SAYS: `HybridSearch` already returns approved+candidate mixed, so the consume side works once candidates exist (Lane B: 10/10 on `test_knowledge_search.js`). CG-001 keeps approval human either way, so projecting as candidates does not auto-promote anything. Risk: graph noise from machine output of uneven quality.

CONTRADICTION / TRADEOFF: (a) Add `MISSION_COMPLETED` to projection: machine output becomes approvable knowledge, closing the loop, but risks graph noise. (b) Keep business-events-only: 144 missions' products never enter knowledge; the promoter stays idle for machine work. (c) Allowlist selected mission types: targeted, but a new policy surface.

DEFAULT IF NOLAN DOES NOTHING: (b) - business-events-only; machine products stay outside the graph.

RECOMMENDED NEXT EXPERIMENT: After LANEB-002 (persist worker output in the result column), project one mission type as candidates for 7 days, measure the approval/rejection rate, and decide on evidence.

### THREADS-002: threads.com fails to load ONLY inside the ig-profile Chrome (profile-state poisoning); clear threads.com site data or hold?

QUESTION: Authorize clearing threads.com site data (cookies/cache/storage for that origin only, via CDP in the live ig-profile Chrome) and then attempting a Threads session relink, or hold the Threads surface quarantined?

WHY IT MATTERS: As of 2026-09-20 ~07:00 MDT, every Threads discovery attempt fails at the first navigation: net::ERR_HTTP_RESPONSE_CODE_FAILURE at https://www.threads.com/. Zero Threads engagement is possible while this persists. The brand-launch lane is dark on Threads until resolved.

WHAT EVIDENCE SAYS: Three controlled read-only tests on the Pig (2026-09-20 08:55-09:02 MDT) isolated the fault precisely: (1) threads.com returns HTTP 200 in 0.41s via curl.exe from the same machine, so Meta is not down and there is no network block; (2) in the same ig-profile Chrome, instagram.com loads fine (title "Instagram") while threads.com fails with the identical error, so the failure is Threads-specific, not browser-wide; (3) threads.com LOADS in an incognito context of the same Chrome (title "Threads"), which proves the fault lives in the persistent profile state for threads.com (poisoned cookie, cache, HSTS entry, or service worker), not in the browser install. Zero engagement actions were executed during any probe. Replay: ~/workspace/pig-fb/th-load-boundary-probe.js via the bridge; results at goals/ping-social-brand-launch/hidden_files/engagement-passes/th-load-boundary-job-*.result.json.

CONTRADICTION / TRADEOFF: Clearing threads.com site data is scoped to one origin (does not touch the IG session), but it is a mutation of the live profile, which standing rules put behind your word (the 2026-09-16 force-kill lesson). Clearing also likely logs Threads out; the historical relink path (th-restore.js "Continue to Threads" confirmation click) has been inert to automation since passes 3-4, so a manual click by you in the Pig's ig-profile Chrome is probably still required. Doing nothing keeps the surface quarantined and every Threads pass failing closed honestly at zero yield.

DEFAULT IF NOLAN DOES NOTHING: Threads surface stays quarantined BLOCKED; passes keep probing twice per the recovery budget and failing closed honestly. No profile mutation, no relink attempt.

RECOMMENDED NEXT EXPERIMENT: Approve the scoped clear (threads.com origin only) in the next decision window; if it works, one read-only discovery probe to confirm enumeration is back, then one canary relink attempt; if the SSO confirmation click is still inert, it needs your manual click in the ig-profile Chrome.

### THREADS-001: like-from-feed failing enumeration 5 passes straight; investigate, reroute, or pause Phase B?

QUESTION: Authorize an investigation of the Threads like-from-feed worker's feed enumeration (feed tab state, sort order, scroll wait timing), a Nolan-authorized alternative approach to profile-post likes, or a pause of Threads Phase B until the enumeration defect is understood?

WHY IT MATTERS: Threads engagement passes 46 through 50 (2026-09-19 15:01 to 23:01 MDT) all landed zero actions. Phase A discovery is healthy (24 candidates each pass, 6 eligible after the guard and intent ledger). Every planned like fails closed with "post not found in Following feed within scroll budget": the worker finds the posts on the seed profiles but cannot locate them in the /following/ feed within the 12-round scroll budget. Each pass burns discovery plus guard plus intent-ledger cycles for guaranteed-zero yield. Heavy mode is your standing order and the lane is dark.

WHAT EVIDENCE SAYS: The like-from-feed redesign was canary-verified end to end on the live session ~13:45 MDT (like landed, Unlike state verified), so the mechanism is proven; the failure is enumeration (profile posts and feed posts are different enumerations, and the feed scroll budget bounds which profile posts are reachable). Five consecutive identical fail-closed outcomes means the failure is reliable, not flaky. No action block, checkpoint, or restriction on the account; logged_in:true every pass, the account itself is healthy. Failure classes do not count toward the yield empty streak, so the schedule holds its 2h baseline. The overnight sprint is scoped to PING convergence and must not trample the operational engine, so it is not picking this up.

CONTRADICTION / TRADEOFF: Pausing Phase B saves cycles but keeps the Threads lane at zero output during a brand push. Investigating feed enumeration is real engineering work in the engagement lane (needs an authorized owner and a lane, not the convergence sprint). Widening the scroll budget speculatively or force-clicking without a probe is forbidden by the standing rule; a fix must come from evidence.

DEFAULT IF NOLAN DOES NOTHING: Passes keep running every 2h, failing closed honestly at zero yield, classified TEMPORARY_FAILURE each time. Safe but wasteful; the lane stays dark.

RECOMMENDED NEXT EXPERIMENT: Authorize a read-only feed-enumeration probe (no likes fired): capture the /following/ feed's tab state, sort order, and which profile posts are reachable at which scroll depths, then decide from evidence whether to fix the worker, change the approach, or pause.

### STORAGE-001: Authorize VHDX compaction to buy real C: headroom?

QUESTION: Authorize compacting the Docker data VHDX (151.63 GB) and possibly the Ubuntu VHDX (62.01 GB) via `wsl --shutdown`, knowing the payoff is unproven?

WHY IT MATTERS: The active writer is proven and contained (qwen3-tts-service download, stopped ~16:55 MDT; growth 0 GB/h; C: stable at 93.1%, 31.87 GB free). But there is NO migration target on this machine: single 512 GB NVMe, C: only, no USB, no network shares. Compaction is the only remaining path to real C: headroom and the only way to get under 90% and unfreeze convergence writes.

WHAT EVIDENCE SAYS: Agent A's fsutil allocation-range probe FALSIFIED the old "~17 GB sparse slack" estimate: physical == logical on both VHDXs, zero sparse slack. The unaccounted ~17 GB is VHDX-internal (ext4 metadata, un-zeroed freed blocks). Compaction yield is therefore UNKNOWN and likely smaller than first estimated. Reclaimable logical bytes exist but convert to C: free only through compaction: 28.34 GB images (Nolan's word per image), 20.48 GB build cache (logical only), 619.5 MB unreferenced volumes, 671 MB modelscope debris (VHDX-internal only); Windows-side candidates: pigi browser profiles 15.60 GB, Chrome 9.98 GB (weights.bin 3.98 GB regeneratable), opencode.db 8.13 GB (DO NOT TOUCH without Nolan's word, still growing). One more unknown: a one-time +9.5 GB C: step ~16:56-16:59 is unexplained (VSS reads 0 bytes now; pre-incident shadow auto-purge unproven). Safe direction, stable since.

CONTRADICTION / TRADEOFF: Compaction needs `wsl --shutdown`: brief full PING downtime (Docker, Postgres, gateway, all containers), and its payoff cannot be measured without doing it. The surgical order explicitly forbade compaction without explicit operator authorization. Doing nothing keeps the machine safe and stable at 93.1%, but convergence writes stay frozen indefinitely and any future incident has no headroom.

DEFAULT IF NOLAN DOES NOTHING: Sit at 93.1% with 0 GB/h growth, convergence frozen, no migration possible. Stable but brittle.

RECOMMENDED NEXT EXPERIMENT if empirical resolution remains possible: Approve per-image deletions first (each image by Nolan's word) to convert logical reclaimable bytes into un-zeroed VHDX blocks, then measure the real compaction yield in ONE authorized downtime window instead of two.

### H-001: h-marketing-intelligence is blocked from dispatch by the objective/contract gate. Give it its own contract block, or re-scope it as a prospect-list prompt?

QUESTION: The research brief `h-marketing-intelligence` produces marketing-intelligence output, but the tandem's OUTPUT CONTRACT demands a numbered business list, so the objective/contract gate (shipped 2026-09-20, `tandem/check-objective-contract.py`, 15-case test suite, hooked into `pig-fb/meta-pass.sh` and `tandem/next-brief.py`) refuses to dispatch it. Should h get its own contract block (a prompt_block pairing a marketing-intelligence objective with a marketing-intelligence contract), or should the brief be re-scoped as a prospect-list prompt that returns businesses with a marketing angle?

WHY IT MATTERS: h has been BLOCKED since the gate shipped; every 6h pass skips it loudly and the rotation advances past it. Marketing intelligence (weak-website signals, competitor patterns, segment heat) is a real input to the outreach engine, but right now it produces zero output. The same latent defect exists in intel briefs e/f/g/i/j/k, so this decision sets the precedent for all of them.

WHAT EVIDENCE SAYS: The gate is working as designed (fail-before test proved the defect real). The fix options are both small and reversible: a per-brief contract prompt_block is the surgical path; re-scoping h as prospect-list is simpler but constrains what the brief can return. Marketing sections from earlier h runs produced 0 promoted claims (secondary sources unverified), so the bar for marketing claims should stay high either way.

CONTRADICTION / TRADEOFF: (a) Own contract block: h produces real marketing intelligence with honest typing, but it adds a second contract surface to maintain and verify. (b) Re-scope as prospect-list: keeps one contract, but h's marketing-intelligence output is lost and the brief just becomes another b-variant. (c) Leave blocked: zero output, zero risk, and the gate's loud skip keeps it visible.

DEFAULT IF NOLAN DOES NOTHING: (c) - stays blocked, rotation advances past it, zero output, machinery honest about it.

RECOMMENDED NEXT EXPERIMENT: Approve the per-brief contract prompt_block for h (marketing-intelligence objective paired with a marketing-intelligence OUTPUT CONTRACT with the same verification gate), run one pass, and check whether any marketing claim survives verification before deciding on e/f/g/i/j/k.

Every question on the previous brief has been answered by Nolan (see RESOLVED below) or assigned as an empirical investigation (see below). New entries must earn their place with the shape above. An empty Grill is a healthy Grill.

## DECISIONS WORTH RE-GRILLING

Answered, retained, challengeable. Not presented as unanswered.

### CG-001: TENANT OWNER is the default human decision authority

TENANT OWNER is the default human decision authority for tenant/business decisions. Nolan is NOT globally the human decider for every tenant. Model: PING recommends, the authorized tenant owner decides, the decision becomes canonical history. For Nolan's own tenant/system, Nolan may be tenant owner. For PING constitutional/system-governance decisions, Nolan currently remains the constitutional operator/owner unless governance explicitly delegates that authority later.

Do not collapse SYSTEM CONSTITUTIONAL AUTHORITY and TENANT BUSINESS DECISION AUTHORITY into one identity.

Retained because the distinction between platform constitutional authority and tenant human authority is foundational and potentially unintuitive.

### 300-row JSONL freeze: DROP THE ARBITRARY CAP

The canonical prospect dataset should grow with the legitimate pipeline. Quality belongs at admission, deduplication, exclusion, validation, and state transition, not at "stop storing canonical prospects after row 300". The freeze was shrinking the pre-send gate's JSONL coverage as the actual pipeline grew.

Retained because deliberately allowing the canonical dataset to grow rather than protecting a neat quality cap is a meaningful operating-policy reversal.

### Status store authority: canonical prospect JSONL wins

CANONICAL MACHINE-READABLE PROSPECT STATE sits above projections/views. The canonical prospect JSONL is the status authority for prospect records that exist there, with coverage expanding as the pipeline grows. CSV, pipeline.md, leads.md, and queue files are projections, operational views, evidence, or execution artifacts per their actual roles; they must not independently overrule canonical prospect status. Do not blindly overwrite conflicting records: inventory fields and current writers/readers first, then converge with evidence.

Preserve this distinction: the queue remains authoritative for the exact SEND INTENT being executed, but accepted execution outcome must flow back into canonical prospect state. QUEUE = intended operation. CANONICAL PROSPECT STORE = durable prospect state. GMAIL/PLATFORM = external execution evidence. CSV/pipeline.md/leads.md = projections/views.

Retained because the queue can be authoritative for execution intent while NOT being authoritative for durable prospect truth.

## RESOLVED / EXECUTE NOW

Recorded, propagated, off the active surface.

### G1: append-only trigger ownership (OPERATIONALLY RESOLVED 2026-09-22)

Nolan's law holds (design B: the append-only trigger is preserved). Recorded as resolved by the 2026-09-22 archaeology. Do not re-ask; before any future trigger change, re-verify against current fixture and deployment evidence instead.

### G3: replay-verification vocabulary (OPERATIONALLY RESOLVED 2026-09-22)

verified:true means provider-ok + zero violations + COMPLETE; test-mode seams are labeled, never green. Recorded as resolved by the 2026-09-22 archaeology.

### GATEWAY-001: authorize the 8080 swap to candidate-3c5d280dd (DECIDED 2026-09-21, Nolan: GO)

Controlled promotion of the proven candidate via runbook v2. Execute with step -1 mandatory, all pre-swap gates, fail closed, roll back fast.

Basis: P0 rotation proven (old credential dead, five consumers agree, journal intact at 2550 events, gateway healthy); candidate passed the full P1 battery on 8081; no unexplained recreation (the 11:25Z recreation was the rotation itself, verified in FL-20260920-022).

Update 2026-09-22: both Oracle containers (:8080, :8081) observed running candidate-3c5d280dd since ~2026-09-21 12:03-12:05 UTC, healthy, zero restarts, both attached to the same database; the deployment registry has zero rows and the promotion is undocumented. The provenance/single-writer decision is now active as DEPLOY-PROV-001 (see ACTIVE QUESTIONS); do not stop either container before Nolan decides.

Controlled promotion of the proven candidate via runbook v2. Execute with step -1 mandatory, all pre-swap gates, fail closed, roll back fast.

Basis: P0 rotation proven (old credential dead, five consumers agree, journal intact at 2550 events, gateway healthy); candidate passed the full P1 battery on 8081; no unexplained recreation (the 11:25Z recreation was the rotation itself, verified in FL-20260920-022).

Boundary: This is not authorization for any other production migration, database rewrite, trigger change, secret exposure, or irreversible operation. pg_hba hardening explicitly held for a separate patch (PG-001, next security patch after stabilization).

Status: executing 2026-09-21.

### CE-001: patch the smallest deterministic completion-identity fix NOW

Do not wait for another proposal round. Evidence already falsified current completion identity: `Date.now()` participates in the completion preimage, duplicate event IDs are possible for one logical completion, crash-after-accept has no reconciler, the lease-reaper can duplicate, emit-before-check exists.

Implement the smallest correction consistent with existing constitutional identity authority. Do NOT redesign the entire event identity system. Use existing IdentityAuthority / HashAuthority / canonicalization mechanisms where they already own this decision.

Required invariant:

```text
same logical completion -> same completion identity
```

across retry, lease expiration, process restart, crash-after-accept, and reconciliation.

Before patch: prove the failing behavior. After patch: prove deterministic completion behavior with targeted tests. Record evidence. Commit only the coherent CE-001 unit under the continuous-engine commit discipline. Then immediately discover the next candidate.

### Status-projection owner: the operation that creates the state change

Send accepted -> send round records/projections occur in the same operation. Reconciliation is the BACKSTOP, not the normal writer. Round 87 proves the primary operation currently fails this invariant; audit the last three send rounds for the same lapse before assuming round 87 was isolated.

### Fenix and Cooley's: parked, OUTCOME_UNKNOWN

Leave parked until manually verified. Do not infer success. Do not repeat-submit. Do not manufacture an outcome to clear the backlog. State explicitly represents OUTCOME_UNKNOWN / MANUAL_VERIFICATION_REQUIRED. They enter the Grill only if manual verification specifically requires Nolan to perform an external action; otherwise they stay in the operational backlog as blocked.

### Threads worker: re-dispatched, idempotently

There is no completion evidence, so re-dispatch. Before performing each external action, observe current state. For the six follows: already followed -> record observed completion, DO NOT repeat the action; not followed -> execute the authorized action, verify, record evidence. Same for the targeting redesign deliverable. Do not credit prior work without evidence. Do not duplicate already-completed platform actions.

### Observe -> review: the continuous engine owns the loop

After Sunday's post: PUBLISH -> wait for a meaningful observation window -> OBSERVE real platform metrics -> RECORD evidence -> REVIEW previous assumptions/scores -> UPDATE the learned model/rules -> propose the next action. Self-assessed content scores are hypotheses. Observed platform outcomes are evidence. Do not allow the publishing lane to grade its own success permanently.

### Worker-deliverable validator: build the scripted gate

The "no consumer = shelfware" objection has now been falsified by repeated operational failures. The consumer is real: worker completion -> validator -> acceptance/merge/use. Round 91's 14/17 duplicate/exclusion failure is enough evidence that manual vigilance is not the permanent control.

Build the SMALLEST validator around actual recurring acceptance invariants. Do not build a generalized QA framework. Start with proven failure classes: duplicate, exclusion violation, required deliverable missing, claimed completion without evidence, schema/shape violation where applicable. The validator must be invoked by a real acceptance path in the same unit. A validator script with no caller is NOT completion.

### FYD-S1: bootstrap demo business (DECIDED 2026-09-21, Nolan)

The bootstrap proof does NOT depend on third-party consent or handoff. Proof order: (1) PING/FYD as the control/dogfood site, (2) ONE already-authorized real business fixture as the arbitrary-business proof. The proof is: SAME BUILDER yields materially different entity graphs yielding materially different sites. Monument View is NOT on the critical path; it is a post-proof candidate (easy site to beat, rich known context) for the "get one real owner in front of it" step, which stays Nolan-gated like the external owner test. The compiler/builder gets proven before customer coordination enters.

### FYD-S2: sprint execution mode (DECIDED 2026-09-21, Nolan)

Checkpointed shifts, not wall-clock 24h. Do not get stuck on the hours; stay productive as long as possible. For long-running authorized jobs on AC: bounded wake lock for the job duration, checkpoint progress, resumable work, release afterward. Never globally disable sleep. Design for interruption; the Pig has already proven sleep/wake can destroy browser targets.

### FYD-S3: object-in-margins restore scope (DECIDED 2026-09-21, Nolan)

Harvest the existing object machinery (Circle, ObjectView, /o/, object API) into the NEW composition system. Object presence is a generic layout capability: main content plus contextual object rail/margin plus mobile object drawer/sheet. No bespoke PING placement, no bespoke plumber placement. No resurrection work on obsolete demo routes.

### FYD-S4: template variations shape (DECIDED 2026-09-21, Nolan)

ONE DESIGN SYSTEM, THREE ARCHETYPE PROFILES: KNOWLEDGE, TRADES, TECHNICAL/ENTERPRISE. Same objects, components, layout primitives, tokens, SiteSpec, renderer. Different composition rules, density, hierarchy, typography scale, media treatment, CTA emphasis, object prominence. Archetypes are parameterized starting points built as DATA/TOKENS/RULES, not three template codebases, not cages.

## EMPIRICAL INVESTIGATIONS

Continuous-engine queue. Resolve from evidence. Grill Nolan only if evidence forces operator judgment.

1. **Stale "in-follow-up-ladder" suppression vocabulary.** The queue instruction using that value is stale (deprecated by the 2026-09-13 vocabulary migration). Find the current canonical vocabulary, update the producer/template generating the stale queue prose, and verify existing canonical records are not being newly contaminated. Do not revive deprecated state vocabulary.
2. **Content ranking contradiction.** Rule says signal frequency outranks everything; the queue artifact is ordered by discovery date. Do not ask Nolan which wins until the ranking rule's currency is established. If canonical, fix the projection/ranking implementation. If competing current policies exist, put the conflict in this Grill.
3. **Chat Math.random() status pills - HIGH PRIORITY.** If the UI fabricates green health while backends fail, that is a truthfulness/integrity defect. Prove the exact code path and user-visible behavior. If confirmed: remove the fabricated status behavior and bind the UI to real states. Valid states include HEALTHY, DEGRADED, UNAVAILABLE, UNKNOWN. Do not turn missing telemetry into green.
4. **Recommendation dead-end.** PING dead-ending at RECOMMENDATION_CREATED is a major product/runtime boundary. Do not immediately invent autonomous action. Investigate the smallest representation for DECISION_ACCEPTED, DECISION_REJECTED, DECISION_DEFERRED, or existing canonical equivalents, now that CG-001 names the tenant owner as the human authority. Do not invent event names if the existing ontology already covers them. Critical invariant: AI recommendation != human decision, and the human decision must become canonical history before consequential execution.

## EVIDENCE PRESERVED

The 2026-09-19 backlog lane's verified claims are preserved in git history for this file. Condensed: 9 backlog items closed on tool-verified evidence (18 legacy CONTACTED statuses reconciled to zero; 8 round-87 sends backfilled into JSONL/CSV status fields after the engine failed same-run projection); one new defect fixed (the projection lapse); one received-wisdom correction (the two JSONL copies are one symlink, not drift; the real problem was the projection lapse). `your_files/western-co-prospects.jsonl` is a symlink to the canonical file.

## REPORTING

Normal progress stays compact. Interrupt Nolan immediately only for genuinely consequential categories already established. ALL operator questions go through this ONE GRILL. At each Grill update:

1. remove ordinary answered questions;
2. add genuinely new consequential questions;
3. retain answered questions only under DECISIONS WORTH RE-GRILLING when they are contrarian/unintuitive/controversial/hot-take decisions;
4. include evidence against Nolan's current assumptions when evidence warrants it;
5. do not soften contradictions;
6. do not create another Grill artifact.

The Grill should become sharper over time, not longer by accumulation.
