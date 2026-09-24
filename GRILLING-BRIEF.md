# GRILLING BRIEF - the ONE active operator decision surface

For Nolan. Last updated: 2026-09-23 (2026-09-23 changes: nine new active questions on the Jev promotion / production gate closure / Orca A6 / dependency program, per Nolan's "grill me as much as possible"; each carries a recorded default the agent proceeds on unless overridden).

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

### INGEST-001: authorize the first live canonical-journal write (2,487 git observation envelopes)?

QUESTION: Lane A built a git→PING observation adapter, proven in dry-run (2,487 envelopes: 2,380 OBJECT_CREATED + 107 RELATIONSHIP_CREATED, all logicalIds unique, all in the registered /ingest vocabulary, evidence = packet SHA-256). The only unproven step is POSTing them to the Pig gateway's /ingest and reading back ping_events. Authorize the live write?

WHY IT MATTERS: This is the first real canonical-journal write of the build program and the gate for the first major milestone (PING MULTI-SOURCE ACQUISITION: git repo → observation, GitHub → observation, one business connector → observation, all through UnifiedEventRuntime.emit). Without it, canonical persistence/replay/idempotency/restart-recovery proof stays theoretical.

WHAT EVIDENCE SAYS: Phase 0 proved the seam (POST /ingest → CanonicalizationService → UnifiedEventRuntime.emit, idempotent INSERT ... ON CONFLICT DO NOTHING, content-deterministic SHA-256 event IDs). Envelopes carry lifecycleStage "observation" + confidence 0.5 ("observations are not knowledge"), source-attributed git-ingestor:lane-a. Re-POST is safe by design (deduplicated:true, no handler re-trigger). The adapter's live mode is built but gated on this decision. Nothing else in the program can answer it empirically.

CONTRADICTION / TRADEOFF: (a) GO: 2,487 labeled observation rows land in the journal; the milestone proof becomes real; duplicates are harmless by idempotency. (b) HOLD: the journal stays pristine; the milestone stays dry-run-proven; the wiring wave proves everything short of the live write.

DEFAULT IF NOLAN DOES NOTHING: (b) HOLD. The adapter stays dry-run-proven; the wiring wave proceeds without live journal writes.

RECOMMENDED NEXT EXPERIMENT: If GO, the wiring wave POSTs, reads back ping_events, diffs journal rows against envelope logicalIds, verifies idempotent re-POST, and reports the row count.

### ELV2-001: Nango commercial license decision for connector auth/proxy?

QUESTION: Lane BCQ's verdict is ADOPT, bounded: self-hosted Nango for AUTH + PROXY / CONNECTION MANAGEMENT ONLY (never syncs, never authority), behind the AuthBroker SPI with the secret key in lane L's broker. Nango is Elastic License 2.0: permits internal self-hosting, restricts offering it as a hosted/managed service. Is commercial ELv2 use acceptable, or do we build the hand-rolled fallback?

WHY IT MATTERS: This is the connector program's auth story. ELv2 is not open source; using it in a commercial product without a decision is exactly the kind of licensing debt that becomes expensive later. No live OAuth round trip is proven yet either (builds were OOM-killed), so this decision gates production, not the spike.

WHAT EVIDENCE SAYS: Nango harvested from source (7bf896bb): refreshOrTestCredentials before proxy injection, single-flight refresh + Redis TTL lock. Wrapper red-team 7/7 (no credential-returning API, cross-tenant substitution rejected, caller Authorization stripped). The AuthBroker SPI means a hand-rolled fallback stays swappable.

CONTRADICTION / TRADEOFF: (a) Accept ELv2 for self-hosted auth/proxy: fastest path to live connector credentials, known license terms. (b) Reject: hand-rolled OAuth broker via the AuthBroker SPI; more code we own, zero license surface.

DEFAULT IF NOLAN DOES NOTHING: No Nango in production; the spike stays experimental; connector auth waits for the hand-rolled broker.

RECOMMENDED NEXT EXPERIMENT: None empirical; this is a licensing/business judgment. Live OAuth proof only matters after the decision.

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

### Resolved by the Decisions-Locked directive (2026-09-22 20:08 MDT) — the five FYD questions are answered and none blocks the product loop. Clock started.

- FYD-BAR-001: RESOLVED. Freeze 12 cold URLs now (4 trades/home services, 4 retail/food/local commerce, 4 professional/creator/service), no cherry-picking after. Measure per URL: time to first useful preview, identity/contact/location accuracy, service/product discovery, unsupported factual claims, mobile usability, contact/action discoverability, performance, owner corrections required. Initial operational bar: median useful preview under 10 minutes; architectural target is roughly a minute; first break time down by stage (fetch/extract/resolve/graph/plan/render). QUALITY GATE: zero unsupported published factual claims. Structured per-site observations (what FYD got right/missed/wrong/invented/made easier, what original did better, generic failure class); cluster failures generically (acquisition/extraction/entity resolution/graph/planner/media/renderer/performance/owner policy) and fix the highest-frequency/highest-impact generic cause. Nolan judges the first run; then the real bar is set from the measured baseline.
- FYD-OWNER-001: RESOLVED. Attempt legitimate owner participation; Monument View is NOT a blocker. Gate is ONE REAL OWNER uses their own FYD presence (see/correct/regenerate/correction survives/plain-English change/approve/see change/return/intent survives), not one specific owner. DemoOwnerContext behind an OwnerContext interface until real auth is wired; no scattered demo-owner conditionals; never pretend demo auth is production auth.
- FYD-CONFLICT-001: RESOLVED. Owner assertion governs the owner's FYD projection on explicitly corrected fields; untouched fields update per evidence policy. If the source later changes a corrected field, do NOT overwrite: raise SOURCE_CHANGED_AGAINST_OWNER_ASSERTION and surface "Website now says midnight. You previously set 10 PM. KEEP MINE / ACCEPT SOURCE / INSPECT."
- FYD-KNOW-001: RESOLVED. Tenant-local by default. No promotion of one customer's correction into shared PING knowledge; future promotion needs explicit semantics and consent. A correction may improve generic software only if it teaches a non-customer-specific parser/planner rule without leaking customer data.
- MEDIA-DEMO-001: RESOLVED. Authorized demo sources: download, digest, preserve provenance, derive optimized versions, serve FYD copies (proves the future media pipeline). Random cold third-party URLs: do not assume republication rights; reference metadata or omit unless reuse authority is clear. Hotlinking is not the default rights strategy. Media pipeline must not become the sprint.
- JEV-KILL-001: RESOLVED (per the earlier grill adjudication). Do NOT kill PING/FYD on Jev disagreement rate (wrong scope). FYD kill/rethink criteria are product failures: cold sites repeatedly un-understandable with reasonable acquisition; owners consistently distrust/correct most content; no advantage over commodity builders; corrections/regeneration fail to reduce owner effort; Ask FYD no better than generic RAG; real owners do not value the product. Jev gets a separate falsification criterion.



### V4-RPCBIND-001: disable the undocumented rpcbind :111 listener on ping-core-01 (DECIDED 2026-09-24, Nolan: GO — bounded ops lane dispatched)

Nolan ordered execution with the bounded constraints: measure before limiting, conservative ceilings with headroom, prove restart/recovery, rollback on contradiction, Postgres-native mechanisms first, restore drill before green, RPO/RTO measured from drill, Qdrant classified by rebuildability.

### V4-HEALTH-001: set container memory limits and add the gateway healthcheck (DECIDED 2026-09-24, Nolan: GO — bounded ops lane dispatched)

Nolan ordered execution with the bounded constraints: measure before limiting, conservative ceilings with headroom, prove restart/recovery, rollback on contradiction, Postgres-native mechanisms first, restore drill before green, RPO/RTO measured from drill, Qdrant classified by rebuildability.

### V4-BACKUP-001: authorize backup automation, set the RPO, consolidate artifacts (DECIDED 2026-09-24, Nolan: GO — bounded ops lane dispatched)

Nolan ordered execution with the bounded constraints: measure before limiting, conservative ceilings with headroom, prove restart/recovery, rollback on contradiction, Postgres-native mechanisms first, restore drill before green, RPO/RTO measured from drill, Qdrant classified by rebuildability.

### V4-QDRANT-001: set a snapshot cadence and authorize a restore drill on a staging host (DECIDED 2026-09-24, Nolan: GO — bounded ops lane dispatched)

Nolan ordered execution with the bounded constraints: measure before limiting, conservative ceilings with headroom, prove restart/recovery, rollback on contradiction, Postgres-native mechanisms first, restore drill before green, RPO/RTO measured from drill, Qdrant classified by rebuildability.

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

## Active questions — from the improvement sweep (2026-09-23)

### G1. brain-postgres backup
- **QUESTION:** Authorize daily pg_dump -Fc of the live brain-postgres/ping_runtime, staged on the Pig and copied off-host to Oracle, 14-day retention, with weekly automated restore-verification?
- **WHY IT MATTERS:** This is the only production database with no verified backup. The mission pipeline writes every ~5 seconds; every day widens the unrecoverable-loss window. It is the single highest value-per-effort item in the sweep.
- **WHAT EVIDENCE SAYS:** No verified backup of the live DB was found; existing pg_dump files have unknown provenance; no crons touch either plane; the DB sits on a single-volume Windows box that already lost Docker to disk pressure.
- **CONTRADICTION / TRADEOFF:** A tiny amount of Pig I/O daily and backup storage versus an unrecoverable production loss window. Fully reversible, read-only to the live DB.
- **DEFAULT IF NOLAN DOES NOTHING:** The gap stays open and the loss window keeps widening.
- **RECOMMENDED NEXT EXPERIMENT:** Approve scope, destination, retention, scheduler, and restore-verification questions; build and run the first restore-verification into a scratch container.

### G3. Credential hygiene batch
- **QUESTION:** Which credential fixes to authorize? (a) rotate live brain-postgres POSTGRES_PASSWORD and convert the compose line to env-file interpolation — note the compose entry may be the stale 5433 postgres, so name which credential you want rotated; (b) chmod 600 + chown on the world-readable .env.muse holding live gateway API keys (zero downtime, cheapest real exposure closed); (c) strike dev-mode ping-vault from the trust story or fund a real Vault project; (d) name an owner and rotation procedure for the MUSE keys, or rotate now (requires gateway restarts).
- **WHY IT MATTERS:** Literal PG password in a compose file, live gateway keys in a world-readable file, a dev vault posing as a secret store, keys with no owner or rotation.
- **WHAT EVIDENCE SAYS:** Read-only verification, no values viewed. Literal PG password at C:\Users\nolan\PING\docker-compose.yml:40 (~12 chars); .env.muse truly world-readable (755 on ext4) holding both live gateway API keys; vault dev-mode with trivial root token; MUSE key ownership/rotation unknown; Oracle backup artifacts 664 and unencrypted. Correction: the "777" Pig perms are a drvfs artifact; real Windows ACLs are Nolan/Admins/SYSTEM plus read-only sandbox users. Exposure is narrower than feared but genuine.
- **CONTRADICTION / TRADEOFF:** Rotation is the only fix for secrets already on disk; (b) is zero-downtime. None of this is proposed to run without your word.
- **DEFAULT IF NOLAN DOES NOTHING:** Credentials stay as-is; the .env.muse exposure stays genuinely open to sandbox processes.
- **RECOMMENDED NEXT EXPERIMENT:** Authorize the batch or pick sub-items; start with (b) as the cheapest real exposure closed.

### G4. Oracle gateway API has no authentication
- **QUESTION:** Port the Pig's exterior-auth middleware into the Oracle gateway image (rebuild + redeploy = release action, brief gateway downtime, must not break the event bridge), or formally record "loopback-binding is the intended and sufficient control"?
- **WHY IT MATTERS:** Anyone or anything on the Oracle host reads the event stream with no credentials. The two planes have divergent auth postures.
- **WHAT EVIDENCE SAYS:** The Oracle gateway image has no auth middleware; /health and /events return 200 with no credentials and with a bogus bearer. The Pig gateway HAS the middleware.
- **CONTRADICTION / TRADEOFF:** A rebuild/redeploy is a release action on the frozen Oracle baseline versus blessing an unauthenticated API by design.
- **DEFAULT IF NOLAN DOES NOTHING:** The unauthenticated API stays as-is; the divergence stays undocumented.
- **RECOMMENDED NEXT EXPERIMENT:** Record the posture decision in writing either way; if porting, run a non-business-hours redeploy of the pinned digest with bridge-verification before and after.

### G5. brain-postgres network exposure + backup encryption
- **QUESTION:** (a) Rebind brain-postgres from 0.0.0.0:5432 to 127.0.0.1 (brief DB downtime on container recreate; reversible)? (b) Encrypt Oracle backups at rest with a Nolan-held key + chmod 600, and keep or delete the two mislabeled .env.bak-* files?
- **WHY IT MATTERS:** The production DB is LAN-reachable with password as the only control, on a machine that travels. Any local foothold on the Oracle host yields the full production DB dump in plaintext today.
- **WHAT EVIDENCE SAYS:** brain-postgres publishes 0.0.0.0:5432; Oracle backup artifacts are 664 and unencrypted; two mislabeled .env.bak files exist.
- **CONTRADICTION / TRADEOFF:** Brief, reversible downtime versus LAN exposure; key management burden versus plaintext dumps.
- **DEFAULT IF NOLAN DOES NOTHING:** LAN reachability and plaintext dumps persist.
- **RECOMMENDED NEXT EXPERIMENT:** Authorize (a) and (b) together or separately; (b) can be done without any downtime.

### G6. Vercel env allowlist + prober follow-up + Orca watch cron
- **QUESTION:** Three sub-decisions. (a) Check in a VERCEL_ENV_ALLOWLIST.md and get a Vercel-team-scoped read token so a scheduled job can diff project env against the allowlist and alert? (b) For the unknown PG prober: (A) nothing further, (B) enable log_connections + %h in log_line_prefix via pg_reload_conf() (no restart) so the next probe is attributable, or (C) one deeper forensics pass? (c) Activate the Orca watch cron now, keep deferred, or drop it?
- **WHY IT MATTERS:** "No secrets in Vercel env" is currently convention-only and unauditable. The prober question needs attribution policy. The Orca watch design is complete and waiting for a go/no-go.
- **WHAT EVIDENCE SAYS:** The connected Vercel credential sees zero projects and gets 403 on teams, so current env is unauditable. The prober was a misconfigured local client during the 9/21 deploy window, not an external attacker; the one password-failed-for-user-"ping" line proves container-network source. Orca watch cron confirmed absent on all three surfaces.
- **CONTRADICTION / TRADEOFF:** Read tokens are new credentials to manage; connection logging is cheap and no-restart; the watch cron is persistent state that keeps running.
- **DEFAULT IF NOLAN DOES NOTHING:** Convention-only env rule, no prober attribution, watch stays deferred.
- **RECOMMENDED NEXT EXPERIMENT:** (b)-B is no-restart and one command; (c) activate now; (a) decide token scope.

### G7. Docker VHDX compaction window (6.2 GB)
- **QUESTION:** Approve a maintenance window with shutdown order: stop containers → stop Docker Desktop/WSL backend → compact → restart → verify all containers healthy + gateway /health green?
- **WHY IT MATTERS:** Disk pressure already killed the Docker daemon once; 6.2 GB is trapped inside the VHDX. Downtime pauses the mission pipeline and the gateway.
- **WHAT EVIDENCE SAYS:** Prior disk-pressure incident killed the daemon; the alerting path (claimable task 20) is the early-warning fallback.
- **CONTRADICTION / TRADEOFF:** Controlled downtime on the Pig (Nolan's machine) versus another uncontrolled disk-pressure kill.
- **DEFAULT IF NOLAN DOES NOTHING:** No compaction; rely on alerting.
- **RECOMMENDED NEXT EXPERIMENT:** Authorize the window; run the alerting task first so the next incident warns before it kills.

### G8. piging2/fyd default branch → main
- **QUESTION:** In the same browser session as the Vercel import, flip the repo default branch from fyd/builder-composition to main (~2 minutes, removes the wrong-branch trap permanently)?
- **WHY IT MATTERS:** The wrong default branch is the trap that would import the builder composition instead of the proven candidate into Vercel.
- **WHAT EVIDENCE SAYS:** GitHub shows default branch fyd/builder-composition; the proven candidate is main at a69bb68f.
- **CONTRADICTION / TRADEOFF:** Two minutes, fully reversible, removes the trap permanently.
- **DEFAULT IF NOLAN DOES NOTHING:** The wrong-branch trap stays; Vercel import must explicitly select main every time.
- **RECOMMENDED NEXT EXPERIMENT:** Do it in the Vercel import session.

Note: G2 (dual-writer) already lives in this grill as DEPLOY-PROV-001; not duplicated. Sweep's concrete breakage modes: duplicate micro-mission emission, duplicate completion/event IDs (CE-001 fragility modes multiply), migration or advisory-lock contention. No active corruption observed; evidence of duplicate events attributable to the second writer would flip the recommendation to stop :8081 immediately.

## Active questions — Jev promotion / production gate closure / Orca A6 / dependency program (2026-09-23)

Nolan's decision 2026-09-23: PROMOTE the verified Jev/gateway candidate, with production gate closure as the acceptance criteria. Promotion is not green until the running 8080 image is proven to contain and enforce the P0 gate. Branch fixed is not production fixed. Orca A6 re-proof decoupled. Dependency forensics after the gate is closed. Each question below carries a recorded default; the work proceeds on defaults unless Nolan overrides.

### GATE-PROV-001: is the gateway image build reproducible, or is behavioral proof the only real provenance?

QUESTION: For this promotion, is "source SHA → image digest → deployed container" a cryptographically reproducible chain, or a recorded claim backed only by the behavioral gate test? And do we invest in reproducible gateway builds after this cutover, or accept behavioral proof as the provenance mechanism?

WHY IT MATTERS: The decision makes the chain "source SHA → image digest → deployed container → behavioral gate test" the evidence standard for every security-sensitive promotion. That standard is only as strong as its weakest link. If the image is built by an unrecorded manual docker build, the digest does not bind to the source SHA; the provenance record is then "we wrote down what we believe we built," and a future image could again ship without the gate while the paperwork looks clean.

WHAT EVIDENCE SAYS: The candidate source SHA fffe99f7a was independently reproduced from a clean checkout, but that reproduced the SOURCE, not the IMAGE build. DEPLOY-PROV-001 (still active above) shows the failure mode is real: candidate-3c5d280dd reached :8080 with zero deployment-registry rows and no documented promotion. The pattern is provenance gaps at the image layer, not the git layer.

CONTRADICTION / TRADEOFF: (a) Invest in reproducible builds (pinned base, recorded build command, digest comparison across two builds): real provenance, real work, slows future promotions slightly. (b) Accept behavioral proof as the mechanism: the gate test is what actually catches a bad image, and it is cheaper; but the SHA→digest link stays a claim. (c) Hybrid: record the exact build invocation plus base image digest this time, defer full reproducibility.

DEFAULT IF NOLAN DOES NOTHING: Proceed with (c) now; during this promotion, build the candidate image twice from the same SHA and compare digests. Match = reproducible, record the procedure. Mismatch = scope the reproducibility work as its own item and keep behavioral proof as the bar.

RECOMMENDED NEXT EXPERIMENT: The double-build digest comparison during this promotion IS the experiment.

### GATE-TEST-001: what proves THE GATE denied the request, not just auth?

QUESTION: Does the acceptance proof distinguish "the P0 gate denied it" from "the auth layer denied it"? And what is the legitimate governed path for POST /orchestration/engine/loop after the gate, if any?

WHY IT MATTERS: The route was reachable WITHOUT authentication, so "unauthorized → DENIED" is trivially satisfied by auth middleware and proves nothing about the gate. The dangerous case is an AUTHENTICATED caller shaping a bypass (auto_scan / bypass_type material). If the proof's bypass test runs unauthenticated, we will certify the auth layer and call it the gate. Separately, the report expects "legitimate governed request → accepted through intended authority path," but no legitimate caller of autonomous-loop start is named in the evidence. If the gate disables the loop by default with no legitimate caller, that expectation is undefined and the "legitimate governed path broken" rollback condition is vacuous.

WHAT EVIDENCE SAYS: P0 framing: route reachable without auth, hardcoded 0.85 fabricated confidence, bypass_type='auto_scan' synthetic stamp. The gate's job is to block autonomous start by default. No legitimate autonomous-loop caller appears in the forensic evidence.

CONTRADICTION / TRADEOFF: (a) Define the matrix now: unauth → denied (auth layer), auth'd + gate closed → denied BY THE GATE with a typed gate error, auth'd + explicitly enabled → governed path; and either name the legitimate caller or declare "no legitimate autonomous starts; healthy = route denies them all." (b) Leave the matrix implicit: the proof tests something, we may certify auth as gate, and the rollback condition stays undefined.

DEFAULT IF NOLAN DOES NOTHING: (a). The proof writes the 4-row expectation matrix with the expected DENYING LAYER per row before running, and asserts layer, not just outcome.

RECOMMENDED NEXT EXPERIMENT: The matrix-first proof plan IS the experiment; review it before the isolated candidate proof runs.

### GATE-ORDER-001: A6 kill test vs. promotion cutover on shared live state

QUESTION: Confirm the ordering: Orca A6's witnessed kill-and-restart run completes BEFORE the promotion's STEP -1 re-observe, with the two proofs' verdicts independent but the mutating runs ordered? Or do you want them fully concurrent?

WHY IT MATTERS: Decouple the verdicts, yes; but the STEP -1 rule says "if unexplained runtime state changed: STOP AND RECONCILE BEFORE CUTOVER," and the A6 proof deliberately kills a process and triggers restart reconciliation. Run concurrently against the same live runtime, each run's evidence confounds the other's: the promotion's journal-count/projection-digest baseline shifts mid-proof, and the A6 run's restart state could coincide with the 8080 cutover.

WHAT EVIDENCE SAYS: Orca's EventRepository is a derived audit/projection adapter over the shared event runtime (UnifiedEventRuntime.emit()); the A6 proof's kill points and the promotion's re-observe both read live runtime state. Neither proof's verdict depends on the other.

CONTRADICTION / TRADEOFF: (a) Ordered mutating runs, independent verdicts: A6 proof runs, then STEP -1 re-observes fresh, then cutover. Honors the reconcile rule; adds wall-clock time, no logical coupling. (b) Fully concurrent: faster, but either side can trip the other's tripwires and both proofs lose cleanliness.

DEFAULT IF NOLAN DOES NOTHING: (a). The A6 proof runs first, then re-observe, then promote; the ordering is operational, not logical, and is recorded as such.

RECOMMENDED NEXT EXPERIMENT: None needed; this is a confirm-or-override on the default.

### GATE-HIST-001: the unprovable window, do we review downstream decisions?

QUESTION: The route existed ungated in the Sep 16 and Sep 20 images; pre-Sep-22 container logs are gone, so invocation is unprovable. Do we run a bounded review for decisions made under possibly-synthetic autonomous-loop output in that window, or accept the gap and claim only "no durable contamination found"?

WHY IT MATTERS: "No durable contamination" is about ROWS. But a synthetic 0.85 finding read by a human or an agent in real time could have shaped a decision that left no auto_scan row: a brief, a summary, a judgment call. The forensic honesty ("do not claim the route was never exercised") opens this; leaving it unexamined keeps a soft spot in the story.

WHAT EVIDENCE SAYS: 33-table sweep: zero auto_scan/bypass_type rows, all 64 REPLAY_COMPLETED events carry source='replay'. File sinks clean. The window is roughly Sep 16 to Sep 22. No evidence of invocation; invocation unprovable either way.

CONTRADICTION / TRADEOFF: (a) Bounded review: grep decision records, briefs, and summaries from Sep 16-22 for autonomous-loop citations or 0.85-confidence findings; if none, close the question with evidence. Small, finite. (b) Accept the gap: honest, cheaper, but the "was anyone influenced" question stays open.

DEFAULT IF NOLAN DOES NOTHING: (b). We claim only what the forensics prove, no review.

RECOMMENDED NEXT EXPERIMENT: If (a) is wanted: grep decision/brief artifacts in the window for autonomous-loop citations. Empty result closes GATE-HIST-001 with evidence.

### GATE-ROLLBACK-001: what is the rollback target, given the old image is known-vulnerable?

QUESTION: If the promotion fails post-cutover, is the rollback target the previous (known-ungated) image, or is this a forward-fix-only promotion with the old image held for non-security regressions?

WHY IT MATTERS: "Rollback first, investigate second" is the right instinct, but rolling back to the Sep 20 image reopens the exact hole being closed. A rollback that restores a known live security defect is not a safety net; it is re-exposure with extra steps. The rollback plan needs a target that does not reintroduce the vulnerability, or an explicit acknowledgment that post-cutover failure means forward-fix under pressure.

WHAT EVIDENCE SAYS: Both deployed images (Sep 16, Sep 20) lack the P0 gate; the route is ungated in every image that has ever run it. Listed rollback conditions: health regression, authority bypass, unexpected journal mutation, projection divergence, restart loop, secret leakage, provenance mismatch, legitimate path broken.

CONTRADICTION / TRADEOFF: (a) Rollback target = previous image + route disabled at the edge (or container stopped): safe, but means downtime if the candidate fails. (b) Forward-fix-only: no safe rollback exists; a failed candidate gets a patched rebuild, not a revert. Honest but high-pressure. (c) Roll back to the old image as-is: fast, reopens the hole.

DEFAULT IF NOLAN DOES NOTHING: (a). Previous image is held for NON-SECURITY regressions only; any security-relevant failure rolls to "route closed" (stop/disable), never to the ungated image.

RECOMMENDED NEXT EXPERIMENT: None empirical; confirm or override the default before cutover.

### ORCA-A6-001: does the kill plan include the worst kill point?

QUESTION: Does the witnessed A6 re-proof kill at the rendezvous window (after external effect dispatched, before the durable record lands), or only at clean points? And is "UNKNOWN external outcome stays distinguishable" implemented or merely specified?

WHY IT MATTERS: A kill-and-restart proof that only kills at convenient points proves the easy case. The entire value of 6a342dd27's crash-safe dispatch rendezvous is the ambiguous middle: the process died and the adapter cannot prove whether the external effect happened. The directive is explicit: never convert "we don't know whether the external effect happened" into FAILED. If the implementation collapses UNKNOWN into FAILED (or SUCCESS), the proof will certify a contract the code does not honor.

WHAT EVIDENCE SAYS: 6a342dd27 implements durable SHA-256 objective/work-order identity, crash-safe dispatch rendezvous, reconcileStartup(). The author marked T1 and T9 untested. File forensics found no Jev authority collision. The proof has never been witnessed.

CONTRADICTION / TRADEOFF: (a) Require the kill-point list up front, including the rendezvous-window kill, and assert UNKNOWN distinguishability in the final state. Stronger proof, harder to stage. (b) Kill at clean points: easier, witnesses a restart, proves less.

DEFAULT IF NOLAN DOES NOTHING: (a). The kill-point list and the UNKNOWN assertion are required in the proof plan before the run.

RECOMMENDED NEXT EXPERIMENT: The proof plan itself is the experiment; review the kill points before authorizing the run.

### DEP-INV-001: who consumes the dependency inventory?

QUESTION: What is the first consumer-facing decision the hot-path dependency inventory will drive? And do we scope it to volatility-proven dependencies first, or inventory the whole hot path as ordered?

WHY IT MATTERS: A 15-field inventory across the full hot path (URL → acquisition → parsing → evidence → objects → relationships → SiteSpec → renderer → Ask FYD → capability → proposal → event → projection) is a large artifact. The standing rules push both ways: "complexity must be purchased by evidence" and "do not build plugin architecture theater." An inventory with no consumer is documentation theater; an inventory scoped to proven volatility is a tool.

WHAT EVIDENCE SAYS: The jsonld@9.0.0 pin is cited as the right pattern, so the inventory's natural consumers are the pinning/upgrade policy and the capability resolver. But "capability-based selection" and "escalation chains" are new machinery with no proven-volatility purchase yet. Proven-volatility candidates: JSON-LD processor, browser/acquisition engine, LLM provider, embedding provider.

CONTRADICTION / TRADEOFF: (a) Full hot-path inventory now: complete, expensive, no defined first consumer. (b) Volatility-proven first: inventory + narrow contracts for the 3-4 dependencies with actual breakage evidence; the rest when they earn it. (c) Name the consumer decision first (e.g., "the next pin/replace decision after jsonld"), then inventory only what that decision needs.

DEFAULT IF NOLAN DOES NOTHING: (b). After gate closure, inventory the volatility-proven set first and record the first consumer decision before expanding.

RECOMMENDED NEXT EXPERIMENT: Before the inventory starts, name which dependencies have actual breakage evidence (not hypothetical volatility) and the single next pin/replace/adapter decision the inventory must support.

### FYD-SCOPE-001: does the promotion lane assess the FYD product frontier?

QUESTION: Should the promotion report include "FYD CURRENT FRONTIER" and "FIRST BROKEN PRODUCT STEP," or stay scoped to gate facts plus a bounded post-promotion smoke?

WHY IT MATTERS: Frontier assessment is the product lane's verdict, and the 2026-09-23 FYD directive says Nolan verifies the live experience himself and no new architecture waves start. A security promotion judged on product state mixes lanes; a promotion worker doing product assessment is unscoped work that can delay or confuse the gate verdict.

WHAT EVIDENCE SAYS: The specified report format asks for both gate facts and product frontier. The FYD object shape is frozen; the current frontier is OBJECT GRAPH → SITE SPEC → RENDERER → BROWSER → ASK FYD → WHY THIS → CORRECT → REGENERATE.

CONTRADICTION / TRADEOFF: (a) Gate facts + bounded smoke (site still renders, Ask FYD answers, no regression from the cutover): promotion stays pure, product lane keeps its verdict. (b) Full frontier assessment in the promotion report: one report, but the security lane grades the product.

DEFAULT IF NOLAN DOES NOTHING: (a). The promotion reports gate evidence and a bounded smoke; frontier assessment stays in the product lane.

RECOMMENDED NEXT EXPERIMENT: None; confirm or override.

### GATE-SECRET-001: how is "no secret leakage" verified in the proof?

QUESTION: The acceptance criteria include "no secret leakage," and the proof needs live DB access to re-query durable state. How do we verify the proof artifacts themselves leak nothing, given the forensic worker had to scrub Pig-side /tmp scripts that held the live DB password?

WHY IT MATTERS: A proof that leaks the DB password into logs, scripts, or chat while proving "no secret leakage" fails its own criterion. PG-001 (pg_hba loopback trust) is still on HOLD, so the DB password is load-bearing; the proof must not widen the exposure the forensic pass already had to clean up.

WHAT EVIDENCE SAYS: The forensic worker used the live credential on the Pig and deleted /tmp scripts afterward. Proof scripts for the candidate-image test and post-promotion attack need the same access pattern.

CONTRADICTION / TRADEOFF: (a) Proof runs with the existing credential pattern + a post-proof scrub audit (grep artifacts for credential material, verify no values in logs/chat). (b) Mint a read-only verification credential for the proof: cleaner, but a new credential to manage while the gateway's own access still uses the live one.

DEFAULT IF NOLAN DOES NOTHING: (a), with the scrub audit as a checklist item in the report.

RECOMMENDED NEXT EXPERIMENT: None; this is execution discipline, recorded here so the criterion is verifiable.

### FYD-Q1: ambiguity notice — approve fail-closed public copy when an owner correction conflicts with observations?

QUESTION: When an owner correction conflicts with >=2 independent observations on contact fields, should the projection suppress the contested contact facts and show an explicit public ambiguity notice ("We have conflicting information about this business and are holding the facts until the owner confirms. [Business] requested verification")? If no, the fallback is owner-wins silently.

WHY IT MATTERS: Publishing either version while evidence genuinely conflicts risks publishing a wrong phone or address to the public. Fail-closed copy protects visitors and the owner; owner-wins-silently is a simpler surface but a weaker privacy posture when the owner might be wrong or the sources might be stale.

WHAT EVIDENCE SAYS: SYNTH lane proposal; no production traffic yet and no live conflict has occurred. Invariant inv-09 (conflicting evidence) passes at the test level, so the machinery exists; this question is only about the public-facing copy under ambiguity.

CONTRADICTION / TRADEOFF: (a) Ambiguity notice: honest, but puts a "we don't know" state on a business website, which costs some visitor trust. (b) Owner-wins silently: clean surface, but may publish a fact that two independent sources dispute, and the visitor never learns there was a question.

DEFAULT IF NOLAN DOES NOTHING: (a). Fail closed with the notice; the product's trust posture is that uncertainty is shown, not smoothed over.

RECOMMENDED NEXT EXPERIMENT: None empirical; confirm or override the copy wording.

### FYD-Q2: D-501 — address-visibility propagation (owner-intent semantics)

QUESTION: When an owner hides the business address, should the HIDE propagate to related public location objects carrying the same normalized address value at the reader, or is HIDE scoped per-object only?

WHY IT MATTERS: An owner hides the address on the business object, but the same address survives on a related public location object, and the Ask FYD concierge cites it via located_at traversal. A privacy hide that does not hide is worse than no hide: the owner believes something is private that the site still serves.

WHAT EVIDENCE SAYS: D-501 documents this as leak class G2. The reader currently does not propagate. The lane's recommendation is propagation at the reader, fail-closed for privacy: the hide is about the fact, not the object.

CONTRADICTION / TRADEOFF: (a) Propagate at the reader: closes G2, but changes projection semantics for every address-kind fact across related objects. (b) Per-object scope, documented: simpler, but leaves the leak class open and the owner exposed.

DEFAULT IF NOLAN DOES NOTHING: (a). Propagate; privacy semantics must be fact-scoped, not object-scoped.

RECOMMENDED NEXT EXPERIMENT: After a HIDE on the live demo, probe the concierge for the same address via traversal to confirm the class closes.

### FYD-Q3: D-015 — Phase 17 publish gate: approve the factory's gap list?

QUESTION: Approve the factory's 7-item unauthenticated-visitor-publish readiness list as the go/no-go gate: (1) H4/R-H4 two-verifier seam, (2) R-MODEL /sites wiring, (3) SEC-FIX integration, (4) F-1..F-8 fail-closed under pressure, (5) rate limiting / abuse controls, (6) rollback plan, (7) Nolan sign-off in this brief. And is the threat model "safe"?

WHY IT MATTERS: This decides when an unauthenticated visitor may publish. A wrong call either publishes a business presence with unverified claims or opens an abuse vector that damages real businesses.

WHAT EVIDENCE SAYS: This is the factory's half of the readiness list, post-integration. No visitor publish is live today; everything is demo-mode. The owner-auth half of the gate is a separate item.

CONTRADICTION / TRADEOFF: (a) Approve the full list as the gate: disciplined, slower to ship. (b) Narrower gate: faster, accepts residual risk on items like rate limiting and rollback.

DEFAULT IF NOLAN DOES NOTHING: (a). The gate stands until all 7 close; nothing unauthenticated publishes before that.

RECOMMENDED NEXT EXPERIMENT: None empirical; confirm or override the list.

### FYD-Q4: golden-set bar — adopt tiered bars?

QUESTION: Adopt tiered golden-set bars: 0.95 per-mission pass rate for presentation seams, 1.0 for safety-critical seams (identity, visibility, claim binding, link gating, export)? Red-run response: the integration worker halts the wave and routes to the coordinator; Nolan is notified, not asked, unless the bar itself is disputed.

WHY IT MATTERS: Without a bar, wave results drift into "green enough." The 1.0 bar on safety-critical seams is the product's no-leak guarantee in measurable form; the 0.95 bar keeps presentation work from being strangled by perfection.

WHAT EVIDENCE SAYS: D-012/D-213/D-214/D-217 define the metric as per-mission pass rate over the golden set. Prior waves ran without an adopted bar.

CONTRADICTION / TRADEOFF: (a) Tiered bars: strict where it matters, pragmatic where it doesn't. (b) Single bar: simpler, either too lax for safety seams or too strict for presentation work.

DEFAULT IF NOLAN DOES NOTHING: (a). The tiered bars are adopted for the next wave.

RECOMMENDED NEXT EXPERIMENT: Run the next wave against the bars and report the per-seam pass rates.

