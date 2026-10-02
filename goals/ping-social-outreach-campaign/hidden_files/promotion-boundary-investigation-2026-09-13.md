# Promotion Boundary Investigation - 2026-09-13

Read-only constitutional investigation. No state was modified: no file writes outside this report, no event emissions, no DB writes, no restarts, no cron changes. Bearer tokens were resolved at runtime via the existing Pig SSH flow and never written to files. All gateway probes were GETs and code reads.

## The question (Nolan's)

Show the exact EXECUTABLE boundary that currently prevents a Marketing-local statement from acquiring VERIFIED or ACCEPTED_BY_PING status merely because it was written into the learning file. Trace one real candidate through every state transition with the code/spec/gate authorizing each. Demonstrate with the "email is the lowest-yield channel" incident whether the mechanism would have rejected it. If the boundary does not exist, name the smallest implementation seam that creates it. Name the first positive promotion test candidate.

## Short answer

There is no such executable boundary. Every gate on the emission path is structural (file exists, sidecar status, field presence, bearer validity) or self-attested (the engine runs the verifier on its own output). The "email is the lowest-yield channel" claim, had it been distilled into a learn file, would have passed every gate and would today sit in PING with verification_status "verified" and a complete 8-event witnessed lineage. The one epistemic rule in the path ("emit ONLY high-quality, generalizable, verified intelligence, never unverified claims") is cron prose, enforced by nothing executable.

---

## 1. Trace: the round-44 emission (event 3c7db6727f666b39b15782ad0810ef7525719051e34f70bd033b28f318fc56b5)

The emitted observation text (retrieved live from the gateway) bundles two learnings: the emerald ash borer demand signal and the chain-consolidation pattern (Alpine Tree Service GJ and Aspen Tree Service now part of national chain SavATree; re-check chain affiliation at outreach time, not just discovery time).

### T0. Research and observation authoring (no gate)

The outreach engine's round-44 sweep researched tree-care businesses and wrote its findings into `~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/learn-20260913-round44.md`.

- Authorizing spec: cron definition file `~/workspace/goals/ping-social-outreach-campaign/crons/hourly/ping-social-outreach-engine__interval@3h.md`, line 47 (step 7): "distill generalizable campaign learnings ... into hidden_files/meta-ai-intel/learn-<sweep-id>.md plus a provenance sidecar (status answer_captured, brief_id learn-<sweep-id>, empty transitions)".
- Gate on content: NONE. `~/workspace/tandem/validate-meta-answer.py` (the only content validator in the tandem path) applies exclusively to Meta AI answer files: it checks numbered-list presence (MIN_NUMBERED_ITEMS = 3) and minimum characters (MIN_ANSWER_CHARS = 1200), i.e. capture completeness, not truth. Learn files are written directly by the engine and never pass through it. This is confirmed by the script's own docstring ("Validate a pulled Meta AI answer file before it enters the pipeline") and by the absence of any invocation of it on learn files.
- The learn file applies its own "VERIFIED" labels ("VERIFIED this round: Alpine Tree Service ... announces it 'has joined forces with SavATree'"). These labels are engine prose. Nothing checks them.

### T1. Sidecar and ledger line (structural checks only)

`~/workspace/outreach/append-sweep-run.py --learn-brief learn-20260913-round44 --sidecar learn-20260913-round44.provenance.json` appended the learn run line to `runs.jsonl`.

- Checks performed (from source): `--learn-brief` must start with "learn-"; `--outcome` must be one of ok/partial/failed; stage counts default to 0. No content validation of any kind.
- Observed ledger line: `run_id "20260913-learn-round44"`, `outcome "ok"`, `brief_id "learn-20260913-round44"`, counts all zero including `"ping_emitted": 0` and `"evidence_observations": 0`, `started_at "2026-09-13T21:30:00Z"`.
- Integrity note: the ledger line claims `ping_emitted: 0` while its own sidecar proves one emission (event 3c7db672...), and the line's nominal `started_at` (21:30:00Z) postdates the actual emission (21:17:43Z) by 13 minutes. The ledger is bookkeeping prose, not an observed record. It understates what happened.

### T2. The "verification" transition: self-certification

`~/workspace/tandem/mark-verified.sh <answer-file> --by "outreach-engine round-44"` was run on the learn file. Observed sidecar transition: `{"state": "verified", "at": "2026-09-13T21:17:38Z", "by": "mark-verified.sh (outreach-engine round-44)"}`.

Checks the script actually performs (from source, all lines verified):
1. Answer file exists.
2. Answer file ends in `.md`.
3. Sidecar `<stem>.provenance.json` exists.
4. Sidecar is valid JSON.
5. Sidecar `status == 'answer_captured'`.
6. `--by` is non-empty free text.
7. Not already verified (idempotent).

Checks the script does NOT perform:
1. Whether any verification work happened (no evidence examined).
2. Whether `--by` names an authorized identity (free text; the engine named itself).
3. Whether the file's claims are supported by evidence.
4. Whether claim scope matches evidence scope.
5. Whether the invoker is independent of the author (the author and the verifier were the same engine run, 4 seconds before emission).

The cron prose at line 47 says the gate runs "(human or authorized gate, never automatic)", but the concrete command template in the same sentence instructs the autonomous engine to run `mark-verified.sh <answer-file> --by "outreach-engine round-N"` itself. The prose aspiration and the executable instruction contradict each other. At runtime the executable instruction wins: the engine certified its own output.

The learn file's own Provenance section then cites this as authority: "Status: VERIFIED per mark-verified.sh (human gate = outreach-engine round 44 operator review)." The engine's self-review is recorded as a human gate.

### T3. Emission precondition: structural, not epistemic

`~/workspace/tandem/emit-observation.py`, function `_require_verified`, lines 44-108 (verified from source).

Checks performed:
1. Newest `runs.jsonl` line with matching `brief_id` and `outcome == 'ok'` exists (resolved: the T1 ledger line).
2. That run's sidecar carries a transition with `state == 'verified'` (resolved: the T2 self-certification).
3. Duplicate guard: refuses when a sidecar `accepted_by_ping` transition carries a matching `observation_sha256`, unless `--force`.

Checks NOT performed: observation content, evidence references, sample size, scope, verifier independence, or anything about the truth of the claim. On success the script POSTs with `'verification_status': 'verified'` hardcoded in the payload (line ~150 of source). The string "verified" in PING is therefore an emitter assertion, not a PING determination.

Duplicate-guard blind spot (secondary): the round-44 `accepted_by_ping` transition carries no `observation_sha256` field (it was written by an older flow than the current script, which does write the hash). Re-running emission today with byte-identical text would NOT be blocked. `--force` overrides the guard by design in all cases.

### T4. Gateway acceptance: presence checks only, opaque payload

Deployed handler `/app/gateway/routes/events.js`, lines 71-91 (read live from the `ping-gateway` container, image `curious-squid-gateway:phase4-eventauth8`).

Checks performed:
1. `event_type`, `aggregate_id`, `aggregate_type`, `event_data` are present (line 72-75). Nothing else.
2. L1 bearer valid (exterior auth middleware; old keys return 401, verified in prior work).
3. `eventRuntime.emit(...)` returns status ok.

NOT checked: any schema on `event_data`. The `verification_status: "verified"` string is stored opaquely inside `payload` jsonb. PING performs no verification and owns no verification state. Any L1 keyholder can assert "verified" on any string.

Source is stamped `source: "api:muse"` from the authenticated agent (line 79-80). This is attribution of WHO submitted, not validation of WHAT was submitted.

### T5. The internal constitutional chain: processing pipeline, not epistemic gate

Observed live via `GET /events/correlation/3c7db672...`: OBSERVATION_CREATED (21:17:43) → CLAIM_CREATED (21:17:48) → CLASSIFICATION_CREATED (21:17:53) → RECOMMENDATION_CREATED (21:17:58) → PROJECTION_CREATED → REPLAY_COMPLETED → WITNESS_CREATED → LINEAGE_CREATED, at ~5s cadence. Fully automatic once the observation is accepted; no human or verification step intervenes.

Content check on the chain (from the live payloads): the CLAIM payload is template-level (`{"source":"api:muse","eventType":"OBSERVATION_CREATED","timestamp":...}`, no extracted statement, no entities). The CLASSIFICATION payload is `category "general"`, `confidence null`. The chain confers processing lineage (replay verified, witness created), not truth. A false claim would receive the identical 8-event treatment.

### T6. Schema fact: PING owns no qualification state

Live schema of `ping_runtime.public.ping_events` (read 2026-09-13): columns are `event_id, event_type, source, timestamp, payload (jsonb), metadata (jsonb), processed, created_at, namespace`. There is NO knowledge-state or verification-state column. Epistemic state exists only as emitter-supplied free text inside `payload`. This was confirmed by direct `\d` against the live database.

### Verdict on the boundary question

No executable boundary exists that prevents a Marketing-local statement from acquiring VERIFIED or ACCEPTED_BY_PING status by being written into the learning file. The complete inventory of what stands between a learn-file sentence and canonical PING state:

| Gate | Type | What it checks | Epistemic content |
|---|---|---|---|
| Cron step 7 prose ("never unverified claims") | Prose | Engine's own judgment | None executable |
| Learn-file "VERIFIED" labels | Engine prose | Nothing | None |
| mark-verified.sh | Structural | File/sidecar exist, status field, --by non-empty | None; self-certifiable |
| emit-observation.py _require_verified | Structural | ok run + verified transition exist | None; hardcodes "verified" |
| Gateway POST /events | Presence + auth | 4 fields present, bearer valid | None; payload opaque |
| Internal 8-event chain | Automatic processing | Nothing about truth | None; template-level |

Aggravating finding: `POST /knowledge/nodes` and `POST /knowledge/edges` in `/app/gateway/routes/knowledge.js` (lines 64-95, read live) contain no auth reference in their handlers, and the nodes handler accepts caller-supplied `status` and `confidence`. The prior exposure audit probed these as publicly reachable. So even the L1 bearer requirement on `/events` is not the only write path into PING-held knowledge: an unauthenticated caller can write knowledge-graph nodes with arbitrary status and confidence. (Handler-level confirmed; mount-level middleware not fully traced, behavioral probe from the exposure audit says public.)

---
## 2. The email incident test: would the mechanism have rejected the claim?

The offending statement (`~/workspace/outreach/angle-performance.md`, line 20, entry dated 2026-09-11): "First full-cap UTC day (10/10) since the cap started. Zero replies across 10 accepted sends (rounds 24-25 batches) and all prior batches except Thomas Friel's 'No interest.' on a round-15 form. Email is confirmed as the lowest-yield channel; keep it last in priority per Nolan's standing order."

Evidence that existed at the time: ~10 email sends, zero replies, one form decline. No cross-channel comparison volume. No deliverability measurement. Under Nolan's scope rule, Claim A ("10 emails produced zero replies") was supportable; Claim C ("email is the lowest-yield channel") was not.

Walk Claim C through the T0-T5 mechanism as if the engine had distilled it into a learn file:

- T0 (learn file): the engine writes the sentence with a "VERIFIED" label. No content check exists on learn files. PASSES.
- T1 (sidecar/ledger): structural checks only. PASSES.
- T2 (mark-verified.sh --by "outreach-engine round-30"): file exists, sidecar exists, status is answer_captured, --by is free text. The script does not count sends, does not ask for a comparison group, does not measure deliverability. PASSES. A 'verified' transition is appended.
- T3 (emit-observation.py): an ok run and a verified transition exist. The script does not read the claim. PASSES. It POSTs with verification_status hardcoded to "verified".
- T4 (gateway): four fields present, bearer valid. The payload is opaque. PASSES. Stored as a verified observation.
- T5 (internal chain): fires automatically. The false claim receives CLAIM_CREATED, CLASSIFICATION_CREATED, RECOMMENDATION_CREATED, PROJECTION_CREATED, REPLAY_COMPLETED, WITNESS_CREATED, LINEAGE_CREATED, identical to a true claim.

Nowhere in code is any of the following evaluated: sample size (10), comparison group (none exists), measurement definition (replies per send; deliverability unmeasured), time window, confounders (targeting, timing, offer, list quality), or the scope rule (a channel-general claim built from email-only data). The scope distinction Nolan requires, Claim A supportable versus Claim C not, is evaluated nowhere executable.

Stated plainly: the mechanism would NOT have rejected the claim. It would have promoted it. Today it would sit in PING with verification_status "verified" and a complete witnessed lineage, indistinguishable from genuinely verified knowledge. The boundary does not exist; this is not a gap in an otherwise working gate, it is the absence of the gate.

One precision: the claim as written lived in angle-performance.md, which is not on the emission path, so this specific sentence was never at risk of emission. The test above is about the mechanism, not the sentence: any sentence the engine chooses to distill into a learn file travels the same gateless path.

## 3. The smallest implementation seam

Constraints honored: no second database, no second scheduler, no second truth store, no second authority. The authority that performs acceptance remains PING; the verifier operates under PING's rules; Nolan governs the contract, not individual facts.

The seam has four parts, all inside systems that already exist:

(a) PING owns the qualification state. Add one PING-managed column (e.g. `knowledge_state`) to `ping_events` in `ping_runtime`. Today no such column exists (confirmed live); state lives only as emitter free text in `payload` jsonb. On ingest, `POST /events` (events.js:71-91) ignores or coerces any emitter-supplied verification claim into a non-canonical default (CANDIDATE or OBSERVED). Only PING-side transitions change the column. This is the projection seam investigator's recommendation, and it is load-bearing: without it, any downstream "what is verified?" query just echoes emitter assertions, which would launder the email incident into canonical truth.

(b) The VERIFIED transition becomes a PING-side operation, not a sidecar annotation. Add one verification path on the gateway (e.g. `POST /events/:id/verification`, or a VERIFICATION_RESULT event type): it requires a verifier principal distinct from the engine's L1 credential (the engine's key can create OBSERVATION, HYPOTHESIS, CANDIDATE_LEARNING, and VERIFICATION_REQUEST, and can never write VERIFIED); it applies the promotion contract deterministically against required fields (claim, claim_type, scope, evidence_refs, sample_size, comparison_group where the claim type is comparative, measurement_definition, time_window, confounders, verification_method); it checks that evidence_refs resolve to real artifacts and that claim generality does not exceed what the evidence supports (the scope rule, made executable: a comparative or channel-general claim with no comparison_group fails closed); it returns PASS, FAIL, or INSUFFICIENT with reasons; only on PASS does it set knowledge_state to VERIFIED, and only PING's own acceptance step later sets ACCEPTED_BY_PING. The AI verifier Nolan allows is this gate's operator, not its author: it applies the contract, it cannot redefine it.

(c) Emitter-side changes, all in existing files:
- `~/workspace/tandem/emit-observation.py`: stop hardcoding `verification_status: 'verified'`; emit candidate observations carrying the contract fields (claim, scope, evidence_refs, sample_size, etc.); rename the sidecar annotation from `accepted_by_ping` to `candidate_submitted` until PING confirms acceptance.
- `~/workspace/tandem/mark-verified.sh`: remove the engine's ability to self-certify. In its current form it must not remain on the engine's executable path for the engine's own outputs. Replace the cron step's invocation with a verification-request submission (which the engine IS authorized to create under Nolan's model).
- Cron definition `~/workspace/goals/ping-social-outreach-campaign/crons/hourly/ping-social-outreach-engine__interval@3h.md`, line 47: replace "pass the verification gate with mark-verified.sh --by 'outreach-engine round-N' (human or authorized gate, never automatic)" with "submit a VERIFICATION_REQUEST carrying the contract fields; never self-certify; the engine credential cannot write VERIFIED". The current line is the precise location where the prose aspiration and the executable instruction contradict; the fix is to make the instruction match the aspiration.

(d) Read-side: expose the PING-owned `knowledge_state` as a real filter on `GET /events` and `/knowledge/search` (today query params beyond limit/offset are silently ignored, confirmed by the projection seam probe). This is what makes "what does PING hold as verified?" answerable by PING itself, which the fresh-agent continuity test requires.

Why this is the smallest: one column, one endpoint, one credential separation, edits to two scripts and one cron line. Same table, no polling, PING remains the only store and the only acceptance authority.

Operational note (interim, no code): until the seam ships, learn-file emissions should not run unattended. Every mark-verified.sh invocation needs Nolan's explicit per-item approval in chat, with --by naming the human who actually reviewed. That is babysitting, but it is honest about the current state, and it is strictly better than the present fiction in which the engine reviews itself and the sidecar calls it a human gate.

## 4. First positive promotion test: which of the nine candidates

The nine candidates from the triage: (A1) seasonal demand calendar; (A2) brand-promise vs operational-reality gap; (A3) per-trade contactability/channel map; (A4) chain-consolidation suppression signal; (A5) FB groups discovery-unproductive; (A6) undated-negatives policy; (A7) review-lane rarity; (A8) zero-response baseline; (A9) form-route as intelligence lane.

Recommendation: A1, the seasonal demand calendar for Western Colorado home services (chimney season, September snow-contract timing, October irrigation blowouts, heating-season demand, pest pressure, seasonal trade shifts).

Against the four criteria:

- Evidence strength: the strongest of the nine. Cited across multiple rounds, supported by business websites and repeated research batches, not a single observation. Multiple entries, each with its own source trail.
- Scope definability: crisp. Each entry is trade x season x region (e.g. "chimney services: demand rises September to November in Western Colorado"). The scope rule can be applied per entry: each calendar row carries its own evidence and time window, so generality never exceeds support.
- Independent corroboration availability: the strongest of the nine, and the decisive point. Seasonal demand is corroborable from sources independent of our outreach: frost dates, weather patterns, industry publications, utility seasonal guidance, the businesses' own sites. The verification contract's evidence_refs and corroboration fields are actually satisfiable here. Contrast the email incident, which was self-referential (a claim about our own operation with no external anchor): A1 is a claim about the market, where the world can check our work.
- Measurability of downstream behavior change: binary and checkable. A fresh agent planning Q4 outreach either consults the calendar (times chimney, irrigation, and snow angles to the window) or does not. With decision provenance recording, the calendar entry visibly informs the timing decision. This is exactly Nolan's PING experiment: did canonical intelligence change downstream behavior, provable even with zero replies.

Why not the others: A4 is already partially emitted (round 44) and is narrower (a suppression rule); good second test. A2 is inferential ("likely struggles to fulfill") with fuzzier scope, harder to write a crisp contract for. A3 has strong counted evidence and is measurable (it stops wasted research) but is partly self-referential (about our research costs); good third test. A8 is a measurement state about our own operation; promoting it risks repeating the email incident's self-referential overgeneralization, and the round-44 copy-test protocol already treats it correctly as a baseline-to-beat hypothesis. A5, A6, A7, A9 are narrower operational policies with lower reuse value and weaker independent corroboration.

A1 also has the property Nolan's loop needs most: it is "why now" intelligence, the layer where PING knowledge most plausibly changes a fresh agent's next decision (whom to contact, when, with what angle). The positive test should be: candidate -> scope -> evidence -> independent corroboration -> contract -> result -> acceptance -> projection -> fresh mission -> decision, then check whether the fresh agent behaved differently because PING knew the calendar.

## 5. What remains UNKNOWN

- Knowledge router mount-level auth: the POST /knowledge/nodes and /edges handlers contain no auth reference (confirmed in handler source), and the prior exposure audit probed them as publicly reachable. Whether auth middleware is applied at the router mount point was not fully traced (gateway server file layout is unclear from the outside). Treat as: handler-level confirmed open, mount-level inferred from behavioral probe.
- The exact runtime identity that invoked emit-observation.py for round 44 (scheduled engine worker vs interactive session): the sidecar records the verify step as "(outreach-engine round-44)" and the accept step as "tandem/emit-observation.py". The invoker acted as the engine either way; the distinction does not change the verdict.
- Gateway migration mechanics: the live schema was read directly from ping_runtime; where schema migrations live in the repo versus the deployed container was not traced (the projection seam investigator noted the deployed code differs from the worktree). Any column addition needs to target the deployed migration path, not just the worktree.

## Evidence index (every factual claim above is grounded in one of these)

- Learn file: `~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/learn-20260913-round44.md`
- Sidecar: `~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/learn-20260913-round44.provenance.json` (verified 21:17:38Z by "(outreach-engine round-44)"; accepted_by_ping 21:17:42Z, event 3c7db672...)
- Ledger: `~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/runs.jsonl` (line `20260913-learn-round44`, outcome ok, ping_emitted 0, started_at 21:30:00Z)
- `~/workspace/tandem/mark-verified.sh` (checks enumerated from source)
- `~/workspace/tandem/emit-observation.py` (`_require_verified` lines 44-108; hardcoded `verification_status: 'verified'`)
- `~/workspace/tandem/validate-meta-answer.py` (docstring: Meta AI answer files only; numbered-item and char-count checks)
- `~/workspace/outreach/append-sweep-run.py` (structural checks only)
- Cron definition `~/workspace/goals/ping-social-outreach-campaign/crons/hourly/ping-social-outreach-engine__interval@3h.md`, line 44 (step 4e: boundary prose, self-run mark-verified instruction) and line 47 (step 7: PING distillation, "(human or authorized gate, never automatic)" vs `--by "outreach-engine round-N"`)
- Live gateway `POST /events` handler `/app/gateway/routes/events.js` lines 71-91 (presence checks only; source stamped api:muse)
- Live correlation chain `GET /events/correlation/3c7db672...` (8 events, ~5s cadence, template-level claim/classification payloads)
- Live schema `ping_runtime.public.ping_events` via `\d` (no knowledge-state column)
- Live knowledge handlers `/app/gateway/routes/knowledge.js` lines 64-95 (POST /nodes, POST /edges; no auth reference; caller-supplied status and confidence)
- Email incident: `~/workspace/outreach/angle-performance.md` line 20 (2026-09-11 entry)
