# MarketingOS incident scoring: 10 real PING incidents, one recommended first artifact
2026-10-01. Analysis only. No building, no publishing, no new stores, no new authorities.
Read-only w.r.t. all production state.

## Method

Each incident was verified against real records (memory logs, workspace files) before scoring.
Scores are per-dimension, 1-5, components preserved, no combined magic number:

- N = NOVELTY: would a competent senior engineer probably not already know this?
- D = TECHNICAL DEPTH: how deep does the mechanism/invariant go?
- E = EVIDENCE QUALITY: strength of the support set behind the claim.
- R = REPRODUCIBILITY: could a skeptical engineer reproduce the core demonstration?
- A = AUDIENCE RELEVANCE: how many of Nolan's audience clusters feel this pain?

Evidence profile keeps source quality separate from verification state, per the CEO order:
source in {SOURCE CODE, LIVE EXECUTION, CONTROLLED REPRODUCTION, PRIMARY DOCUMENTATION,
MEASUREMENT, INDEPENDENT CORROBORATION, VENDOR CLAIM, MODEL INFERENCE, UNKNOWN};
verification in {REPRODUCED, OBSERVED_ONCE, REPORTED, INFERRED, UNVERIFIED}.
Where records were thin, evidence is marked UNVERIFIED rather than reconstructed.

---

## 1. The VHDX storage incident (2026-09-30)

- CLAIM: On Windows/WSL2 with dynamic VHDX backing, deleting files inside the guest does
  not reclaim host disk space; the VHDX only shrinks on explicit compaction.
  Incident -> mechanism -> invariant -> lesson: full-C: crisis -> dynamic VHDX allocation
  never returns blocks to the host without compaction -> guest deletion != host reclaim
  -> logical storage accounting != physical capacity recovery.
- TYPE: MEASUREMENT (with OPERATING LESSON)
- EVIDENCE PROFILE: MEASUREMENT / REPRODUCED. C: 25.39 GB (5.1%) -> 71.03 GB (15.37%),
  ~39.8 GB logical removed, both VHDXs compacted, brain-postgres backup GREEN with
  restore proven. The initial voice-memo hypothesis (audio files eating disk) was falsified
  by measurement: full-C: audio scan = 121 files, 0.06 GB total (memory/2026-09-29.md#L3748).
- NOVELTY: a competent engineer has usually heard of dynamic VHDX growth, but most have
  not measured the guest-delete/host-reclaim gap themselves.
- SURPRISE DELTA: expected deleting ~40 GB frees ~40 GB -> observed almost nothing freed
  -> gap = dynamic VHDX allocation holds freed blocks until compaction -> consequence =
  standing invariants (BACKUP GREEN, RESTORE PROVEN, C: 15%+ headroom) and the principle
  that the backup/restore proof outranks the bytes recovered.
- REPRODUCIBILITY: anyone with WSL2 + Docker Desktop can reproduce: fill, delete, measure
  host bytes, compact, measure again.
- COUNTEREVIDENCE: Microsoft documents dynamic VHDX behavior (PRIMARY DOCUMENTATION exists);
  fixed-size VHDX, native Linux, and Docker Desktop's own disk-image settings change the
  picture; the voice-memo anecdote is one team's story.
- SECURITY/PRIVACY: none. Disk statistics only.
- OWNED vs BORROWED: ORIGINAL OBSERVATION + ORIGINAL EXPERIMENT.
- SCORES: N2 D3 E5 R5 A4

## 2. The tenant self-attestation authorization bug

- CLAIM: An authorization check that accepts the requester's self-asserted approver identity
  is not authorization; a self-asserted approver is indistinguishable from a forgery.
  Required chain: AUTHENTICATED ACTOR -> EXACT PROPOSAL DIGEST -> AUTHORIZATION ->
  APPROVAL EVENT -> EFFECT. Asserting a tenant header (or an approver name) is not
  authorization.
- TYPE: SECURITY RESULT
- EVIDENCE PROFILE: LIVE EXECUTION / OBSERVED_ONCE. POST /api/mc/approvals on Pig :3100
  was unauthenticated and accepted a self-asserted approver; a real APPROVED decision
  (p0prop-ac04480a6d1809fd, 2026-09-28) drove a real site effect through that path
  (memory/2026-09-30.md#L2934, L3385). The record notes this came from investigator
  handoff evidence, not an independent live re-probe. The route was subsequently gated as
  the first authorized block of the 99-hour program (approver derived from the
  authenticated caller key).
- NOVELTY: self-attestation is a known anti-pattern; senior security engineers know it.
  The concrete "authorization test passed for exactly the reason it was insecure" shape
  is the interesting part.
- SURPRISE DELTA: expected the approvals route is gated -> observed it was unauthenticated
  and a real site change went through it -> gap = the route was built for an internal
  operator UI and never hardened -> consequence = gate or remove the route, preserve
  history, classify weak-route approvals accurately.
- REPRODUCIBILITY: low for outsiders (requires Nolan's Pig); the pattern is reproducible
  as a code-review exercise on any approvals route that reads identity from the request.
- COUNTEREVIDENCE: the route may have been protected by its network binding (Pig-local,
  Tailscale); self-asserted identity in a single-operator tool can be acceptable if the
  network boundary is the real gate; exactly one proposal went through.
- SECURITY/PRIVACY: LOW-MEDIUM. The lesson is publishable; exact route payloads and any
  auth material stay out. Never print credential values.
- OWNED vs BORROWED: ORIGINAL OBSERVATION.
- SCORES: N2 D4 E3 R2 A4

## 3. UNKNOWN-after-effect (worker success did not establish the external effect)

- CLAIM: A worker returning success (or undefined) does not establish that the external
  effect occurred; acknowledgement travels a separate path from the effect. An ambiguous
  post-effect state is UNKNOWN, not FAILED, and must not be auto-retried.
  ATTEMPT != RESULT != EFFECT != VERIFICATION != OUTCOME. HOLD is a safety state, not a
  delayed retry queue.
- TYPE: ARCHITECTURAL INVARIANT (with FAILURE MODE)
- EVIDENCE PROFILE: CONTROLLED REPRODUCTION / REPRODUCED. WorkerRuntime duplicate-effect
  contract: a worker can perform an effect, return undefined, be misread as NO_MATCH, and
  trigger an automatic duplicate retry (memory/2026-09-26.md#L1905). Proven by
  deterministic rendezvous kill: worker crosses the effect boundary, acknowledgement never
  lands, worker/host killed -> EFFECT_UNKNOWN -> HOLD; lease expiry, scheduler sweeps,
  restarts all leave it at HOLD; only the reconciler may move it (memory/2026-09-28.md#L100).
  Regression: EFFECT -> undefined -> exactly one physical effect.
- NOVELTY: retry-safety is well-trodden, but the rendezvous-kill proof and the
  HOLD-as-safety-state framing are original demonstrations most engineers have not run.
- SURPRISE DELTA: expected worker result == outcome -> observed the effect occurred with
  no acknowledgement -> gap = the acknowledgement path is separate from the effect path
  -> consequence = reconcile-first discipline; UNKNOWN != FAILED; never blindly retry a
  consequential effect.
- REPRODUCIBILITY: the rendezvous-kill procedure is precisely specified and re-runnable
  against the PING runtime; the general pattern is reproducible against any worker
  runtime with killable workers.
- COUNTEREVIDENCE: idempotency keys + at-least-once delivery with dedup is the standard
  answer and often sufficient; HOLD adds latency; for non-consequential effects blind
  retry is fine and cheaper.
- SECURITY/PRIVACY: none.
- OWNED vs BORROWED: ORIGINAL EXPERIMENT (rendezvous kill) + ORIGINAL SYNTHESIS.
- SCORES: N3 D5 E5 R4 A4

## 4. Source/build/deployment divergence (all tests passed, production ran older bytes)

- CLAIM: Green tests on a worktree prove nothing about the served runtime.
  SOURCE TREE != SERVED RUNTIME until a certified chain closes:
  SOURCE -> BUILD -> DEPLOYMENT -> PROCESS -> SERVED BYTES -> SERVED BEHAVIOR.
  Worktree inventory is not served truth. Until certified, Mission Control shows
  DEPLOYMENT = UNKNOWN.
- TYPE: ARCHITECTURAL INVARIANT (with OPERATING LESSON)
- EVIDENCE PROFILE: LIVE EXECUTION + SOURCE CODE / OBSERVED_ONCE. Deployed /ingest
  required bearer authentication while the examined worktree had no matching middleware;
  deployed gateway storage targets differed from worktree documentation
  (memory/2026-09-30.md#L2238). The new MC shell's expected routes were unverified against
  the served tree: "Worktree inventory is not served truth" (memory/2026-09-30.md#L3209).
  Nolan's standing warning applies: this forensic evidence is branch- and time-specific
  and needs re-verification before being presented as current runtime fact.
- NOVELTY: deployment drift is ancient ("works on my machine"); the certified
  deployment chain as a standing displayed invariant is the fresher packaging.
- SURPRISE DELTA: expected merged + tested = deployed -> observed production served older
  bytes with different auth and storage targets -> gap = no deployment provenance chain;
  container-FS fixes traded provenance for speed -> consequence = runtime manifest stays
  HOLD; MC renders DEPLOYMENT = UNKNOWN.
- REPRODUCIBILITY: low for outsiders (requires Nolan's deployment); the audit procedure
  (enumerate container/image/digest/source SHA/command/port/auth/DB, trace one
  observation end to end) is reproducible as a method.
- COUNTEREVIDENCE: standard CI/CD with pinned image digests solves this; the divergence
  was partly self-inflicted by the no-push discipline and live-container fixes; on a
  single machine the lesson generalizes less than it appears to.
- SECURITY/PRIVACY: MEDIUM. Bearer/auth material and DB connection details stay out;
  never print credential values.
- OWNED vs BORROWED: ORIGINAL OBSERVATION + ORIGINAL SYNTHESIS.
- SCORES: N2 D4 E3 R2 A3

## 5. The engagement eligibility bypass (FB pass 173, 2026-10-01)

- CLAIM: A rule in a document is not a control; a rule in an agent prompt is not a
  control; a human remembering the rule is not a control. The control exists only when
  the external effect cannot occur without passing it. AI proposes, deterministic
  software decides eligibility, capability authorizes, executors accept only authorized
  envelopes, evidence records outcomes.
- TYPE: ARCHITECTURAL INVARIANT (with SECURITY RESULT flavor)
- EVIDENCE PROFILE: LIVE EXECUTION + CONTROLLED REPRODUCTION / REPRODUCED. 34-like
  curated job dispatched containing known-ineligible candidates (out-of-corridor,
  previously blocked businesses, already-engaged pages); human review killed the worker;
  2 ineligible likes escaped (recorded EXECUTED in the intent ledger), 31 stopped
  (~/workspace/outreach/eligibility-audit-2026-10-01.md). The repaired authority replays
  all 34 offline with zero external actions: 25 INELIGIBLE, 9 ELIGIBLE, 0 mismatches vs
  the human corrections; deterministic re-run identical
  (~/workspace/outreach/eligibility-replay-173-2026-10-01.md). Adversarial suite 12/12
  fail-safe (~/workspace/outreach/eligibility-adversarial-2026-10-01.md). One deterministic
  eligibility function enforced at plan time (tamper-evident per-action envelopes, SHA-256,
  6h TTL), dispatch time (live re-evaluation + evidence check in run_pass.sh), and staged
  worker-side verification. A 4-like validation batch was dispatched through the full
  chain (pass fb-20261001-053221).
- NOVELTY: "policy as code" is known (OPA, Cedar), but the concrete incident shape
  (documented policy bypassed because the manual curation path skipped the builder's
  blocked-check entirely) and the three-point envelope design are an original,
  complete demonstration most AI-agent builders have not worked through.
- SURPRISE DELTA: expected the curated job was safe (a human reviewed it) -> observed 34
  ineligible candidates dispatched and 2 likes escaped before the kill -> gap = curation
  bypassed candidate_blocked; the guard had no corridor or blocked-business concept;
  cross-posts with new permalink IDs defeated the already-engaged index -> consequence =
  one deterministic eligibility authority; precedents become data; free-form notes never
  authorize actions.
- REPRODUCIBILITY: the offline replay is fully reproducible from workspace files
  (fb173-curated-job.json + eligibility data); the adversarial suite is scripted.
- COUNTEREVIDENCE: the escape was low-harm (ordinary likes on real business posts) and a
  human was in the loop and caught it; "executable policy" is established practice (OPA);
  the incident is partly a process failure (hand-curation) dressed as architecture.
  Honest boundary recorded: two items the human dropped on taste return ELIGIBLE because
  no deterministic rule covers them; taste belongs in a separate curation layer.
- SECURITY/PRIVACY: LOW. No customer data; the escaped likes are public likes on public
  business posts. The Facebook account is Nolan's own business account; no account
  internals beyond what the incident record already contains.
- OWNED vs BORROWED: ORIGINAL OBSERVATION + ORIGINAL EXPERIMENT (authority build + replay).
- SCORES: N3 D5 E5 R5 A4

## 6. The 8-competing-identity-authorities forensic (retry-scheduler lineage)

- CLAIM: Classifying architecture by filename produces false convergence. A full-tree,
  all-worktree semantic search falsified the "8 competing identity authorities" claim:
  three share deterministic-identity semantics, one is an interface, the rest are
  semantically different identifier utilities or scoped identities. Collapse authority,
  never collapse semantics.
- TYPE: OPERATING LESSON (with MEASUREMENT flavor)
- EVIDENCE PROFILE: SOURCE CODE / OBSERVED_ONCE. Full-tree forensic classified all eight
  reported implementations (memory/2026-09-29.md#L2934). Standing law resulted: search
  the entire repo including all worktrees for semantically overlapping authority
  capabilities before any sprint.
- NOVELTY: the falsification story is original; the general lesson (search by meaning,
  not filename) is known but rarely demonstrated with a clean before/after.
- SURPRISE DELTA: expected 8 competing identity authorities -> observed 3 sharing
  semantics + 1 interface + 4 different utilities -> gap = filename-based classification
  -> consequence = the pre-sprint authority-overlap search law.
- REPRODUCIBILITY: low for outsiders (requires the PING tree); the method (semantic
  family search) is reproducible anywhere.
- COUNTEREVIDENCE: the "8 authorities" claim may have been a strawman the forensic
  itself erected; the story is internal to PING and only meaningful to readers who care
  about PING's architecture; limited transferability.
- SECURITY/PRIVACY: none.
- OWNED vs BORROWED: ORIGINAL OBSERVATION.
- SCORES: N3 D3 E4 R2 A2

## 7. JEV quarantine / evidence-journal seal

- CLAIM: Under uncertainty, seal the evidence journal and quarantine the untrusted actor
  rather than stopping the system or risking corrupt writes. Probability is evidence
  input, never authorization. Promotion path, if earned by replay evidence:
  SHADOW -> ADVISORY -> CONFIDENCE-GATED -> AUTOMATED LOW-RISK.
- TYPE: SECURITY RESULT (with OPERATING LESSON)
- EVIDENCE PROFILE: LIVE EXECUTION / OBSERVED_ONCE (REPORTED via watch logs). Oracle
  read-only running state: ping-gateway running, writes blocked at DB, journal sealed at
  2,557 rows max(seq)=91, /health=503 (memory/2026-09-30.md#L4252 and repeated watch
  entries). Jev enters Mission Control in SHADOW mode as a typed decision plane with
  zero execution authority (memory/2026-09-26.md#L2949).
- NOVELTY: degraded read-only modes are textbook (replicas, feature flags); the
  shadow-promotion ladder is decent packaging but not novel.
- SURPRISE DELTA: expected a broken DB means downtime -> observed the gateway kept
  serving read-only with a sealed journal -> gap = the journal is append-only evidence,
  so sealing it is safe -> consequence = Oracle stays observable read-only with write
  authority removed (evidence/rollback archaeology posture).
- REPRODUCIBILITY: low as an incident (requires Nolan's Oracle); the pattern
  (read-only degraded mode) is trivially reproducible.
- COUNTEREVIDENCE: /health=503 in read-only mode is arguably wrong (503 signals
  failure, not degraded-ok); this is more a standing posture than a single incident with
  a narrative arc; "quarantine" language may overdramatize a cautious default.
- SECURITY/PRIVACY: none beyond omitting DB internals.
- OWNED vs BORROWED: ORIGINAL OBSERVATION.
- SCORES: N2 D3 E3 R2 A2

## 8. OBJECT seam / Ask FYD finding-set persistence seam

- CLAIM (as far as records support): findings from the Ask FYD gold set must persist as
  regression examples; the seam under FOCUS-9 is closing the loop between a found defect
  and a durable regression artifact.
- TYPE: OPERATING LESSON
- EVIDENCE PROFILE: UNKNOWN / UNVERIFIED. The Ask FYD gold set exists (32 questions, 4
  per category across 8 categories; baseline claim support 1.0; exposed AG-001, ASK-020,
  ASK-030; memory/2026-10-01.md#L114). The persistence seam itself is a pending FOCUS-9
  item with no incident record yet. Per constraints, this is marked UNVERIFIED rather
  than reconstructed.
- NOVELTY: regression-test discipline is standard; the gold-set design (required/
  allowed/forbidden evidence per question, epistemic status) is decent but the seam
  story is unfinished.
- SURPRISE DELTA: no crisp violated expectation on the public record; the gold set
  exposing real defects (AG-001 UNKNOWN_LIMITS wording, ASK-020 disputed value repeated
  as fact, ASK-030 stale forbidden claim after owner correction) is the substantive
  part, and it belongs to the gold-set story, not the seam.
- REPRODUCIBILITY: the gold set is re-runnable in principle; the seam has nothing to
  reproduce yet.
- COUNTEREVIDENCE: scoring an unfinished item is speculative; there is no incident
  narrative, only a backlog item.
- SECURITY/PRIVACY: none.
- OWNED vs BORROWED: ORIGINAL OBSERVATION (gold set); the seam claim is UNVERIFIED.
- SCORES: N2 D2 E1 R1 A2

## 9. Instagram unfollow cron-parent-death (2026-09-29)

- CLAIM: In an orphan-safe dispatch model, the parent dying does not kill the worker;
  the result file is the truth, and recovery is reconciliation of the result, not
  re-dispatch. A crash between intent and outcome leaves UNKNOWN_EXECUTION, which the
  next pass refuses until reconciled; never blindly re-fire.
- TYPE: FAILURE MODE (with OPERATING LESSON)
- EVIDENCE PROFILE: LIVE EXECUTION / OBSERVED_ONCE. Cron parent died 12:43 MDT
  (runtime drain, infra not account); the Pig worker finished independently at 13:26 MDT
  (job-igunfollow-20260929-173222.json.result.json), ok:true, 100/100 unfollowed, zero
  warnings, canary_verified:true; rate NOT halved (memory/2026-09-29.md#L3305).
- NOVELTY: supervisor/worker separation is standard practice; the compact anecdote
  (parent died of infra, worker lived, result file recovered) is clean but familiar.
- SURPRISE DELTA: expected the batch died with the parent -> observed the worker finished
  independently and the result file was the recovery path -> gap = detached worker +
  fsync'd progress file + idempotent collector -> consequence = orphan sweep collects
  results; the next pass's refuse filter closes UNKNOWN_EXECUTION fail-closed.
- REPRODUCIBILITY: moderate; the orphan model is documented and the pattern is standard,
  but replaying the exact incident needs the Pig + cron runtime.
- COUNTEREVIDENCE: this is textbook (systemd/nohup/detached workers); the incident
  resolved itself cleanly with zero loss; low stakes; the "never re-fire" discipline is
  the UNKNOWN-after-effect lesson applied, not a new insight.
- SECURITY/PRIVACY: none (unfollow counts only).
- OWNED vs BORROWED: ORIGINAL OBSERVATION.
- SCORES: N2 D3 E4 R3 A3

## 10. The 25 stuck missions with no consumer (2026-09-30)

- CLAIM: A queue holding canonical work with no consumer is a broken execution seam.
  Archaeology first: the 25 stuck CLAIM_GENERATE missions were one problem, not 25.
  MissionRuntime.failWithRetry()'s retry-schedule UPDATE excluded 'retry_pending',
  creating an immortal poison pill at the head of getPending() that starved everything
  (69k log lines / 6h of the same 3 missions failing on the jev-shadow namespace error).
  One-line fix (mission_runtime.js line 228), verified: 3 poison missions exhausted to
  failed, one CLAIM_GENERATE mission traced end-to-end (created 5 days -> claimed ->
  ClaimWorker 17ms -> CLAIM_CREATED with upstream event threading), all 25 drained via
  the standard scheduler path, no row patching.
- TYPE: FAILURE MODE (with MEASUREMENT)
- EVIDENCE PROFILE: LIVE EXECUTION + SOURCE CODE / REPRODUCED (verified drain).
  Caveats on the record: the fix lives in container FS only (lost on image rebuild);
  the jev-shadow namespace-owner defect is the upstream cause and a Nolan governance
  decision (memory/2026-09-30.md#L3474).
- NOVELTY: poison-pill head-of-line blocking is textbook, but the concrete numbers and
  the "first missing edge" method (trace one mission created->claim projection, mark
  the exact first missing edge) give it original shape.
- SURPRISE DELTA: expected 25 stuck missions = 25 problems -> observed one poison pill
  at the head of getPending() starving all 25 -> gap = the retry-schedule UPDATE excluded
  'retry_pending' -> consequence = fix the edge, prove one mission end-to-end, drain a
  bounded subset; no new scheduler, queue, or worker framework.
- REPRODUCIBILITY: the trace procedure is specified; replaying needs the PING runtime.
  The container-FS-only fix weakens durability claims.
- COUNTEREVIDENCE: poison pills are textbook queue pathology; the root cause
  (jev-shadow namespace defect) is PING-specific; overlaps the identity/Jev themes;
  the non-durable fix is a legitimate knock on "proven."
- SECURITY/PRIVACY: none.
- OWNED vs BORROWED: ORIGINAL OBSERVATION + ORIGINAL EXPERIMENT.
- SCORES: N3 D4 E4 R4 A3

---

## Ranked (by component profile, not a blended number)

| # | Incident | N | D | E | R | A | Notes |
|---|----------|---|---|---|---|---|-------|
| 1 | Eligibility bypass (pass 173) | 3 | 5 | 5 | 5 | 4 | Strongest evidence + reproducibility; complete arc |
| 2 | UNKNOWN-after-effect | 3 | 5 | 5 | 4 | 4 | Deepest invariant; controlled reproduction |
| 3 | 25 stuck missions | 3 | 4 | 4 | 4 | 3 | Best debugging story; PING-specific root cause |
| 4 | VHDX storage | 2 | 3 | 5 | 5 | 4 | Most relatable; lowest novelty (documented behavior) |
| 5 | IG unfollow orphan | 2 | 3 | 4 | 3 | 3 | Clean anecdote; textbook pattern |
| 6 | Self-attestation | 2 | 4 | 3 | 2 | 4 | Sharp security hook; evidence via handoff, low reproducibility |
| 7 | 8 identity authorities | 3 | 3 | 4 | 2 | 2 | Good falsification story; PING-internal audience |
| 8 | Source/build/deploy divergence | 2 | 4 | 3 | 2 | 3 | Important invariant; evidence needs re-verification per Nolan's warning |
| 9 | JEV quarantine / journal seal | 2 | 3 | 3 | 2 | 2 | Posture, not an incident arc |
| 10 | Finding-set seam | 2 | 2 | 1 | 1 | 2 | Unfinished; evidence UNVERIFIED |

---

## Recommendation: the first end-to-end artifact

**The engagement eligibility bypass (FB pass 173).**

Why it wins:

1. **It is the only candidate with the complete MarketingOS path already walked.**
   REAL INCIDENT -> audit -> claim set -> counterevidence (the taste-boundary honesty:
   two items return ELIGIBLE because no deterministic rule covers them) ->
   CONTROLLED REPRODUCTION (offline replay, 0 mismatches, deterministic re-run identical;
   adversarial 12/12) -> verdicts -> technical thesis ("a rule in a document is not a
   control") -> live validation batch through the full chain. The artifact would
   demonstrate the pipeline by having already run it, which is itself the strongest
   proof of the method.
2. **The invariant is the most shareable and identity-valuable.**
   "A rule in a document is not a control" lands directly on Nolan's audience clusters:
   AI-infra engineers handling agent effects, security engineers interested in authority
   boundaries, founders operating agent automation. Sharing it makes the reader look
   technically serious about the exact problem the industry is currently failing at
   (agents with external effects and no executable policy). The hook writes itself:
   "Our authorization test passed for exactly the reason it was insecure" is the
   self-attestation hook; for this piece it is "The human reviewed every action. Two
   ineligible likes escaped anyway."
3. **It answers all six close-bar questions excellently.**
   What is claimed (executable eligibility, three enforcement points); how we know
   (ledger records, replay tables, adversarial results); reproduce it (workspace files,
   deterministic replay); what would change our mind (a mismatch in the replay, an
   adversarial escape); what is still unknown (worker-side re-evaluation window,
   explicitly documented); why care (any agent with external effects).
4. **Honest limitations are already on the record**, which is a trust feature under the
   CEO order: the taste boundary, the staged-not-deployed worker check, the TOCTOU
   window the dispatch-side TTL covers. A piece that shows its own weaknesses is the
   piece a senior engineer forwards.
5. **Clean security screen.** No secrets, no customer data, no exploit detail. The
   escaped likes are public likes on public business posts from Nolan's own business
   account.

Runner-up: **UNKNOWN-after-effect** (#2). Deeper invariant, broader distributed-systems
audience, controlled rendezvous-kill reproduction. It loses on shareability: the
exactly-once literature is crowded, and its surprise delta ("acknowledgement travels a
separate path from the effect") is less viscerally surprising than "the reviewed batch
escaped anyway." It is the natural second artifact.

## Single biggest falsification risk for the recommendation

A senior engineer could argue the incident was **trivially preventable process failure,
not deep architecture**: the builder already had a blocked-check, the curator just
didn't call it, so the "bypass" is "someone skipped a step," and the envelope machinery
(TLS-style per-action envelopes with TTLs for Facebook likes) is over-engineering for
the stakes. If that reading sticks, the piece reads as "we built a linter for our
Facebook bot."

The defense, which the artifact must carry explicitly rather than assume:

- The process failure IS the architectural insight: humans are not controls, and any
  system whose safety depends on a human remembering to call the check has no control.
  The adversarial suite is the proof this is structural, not anecdotal: tampered
  envelope, stale evidence, mid-run state change, duplicate candidate, worker restart,
  page death, and retry-after-ambiguous-outcome all fail safely by construction, not by
  vigilance.
- The machinery is sized for the general case the invariant names (any agent, any
  external effect), and the piece must show the abstraction ladder doing that work:
  incident (34 likes) -> mechanism (curation bypassed the check; guard lacked the
  concepts) -> invariant (the effect cannot occur without passing the control) ->
  general lesson (AI proposes, deterministic software decides, capability authorizes,
  executors accept only authorized envelopes).
- The taste-boundary honesty (two items ELIGIBLE that humans dropped) must stay in the
  piece. Removing it to reach 100% agreement would be exactly the kind of papering-over
  the order forbids, and a skeptical reader who finds it missing will trust nothing else.

## Do-not-publish screen (all 10)

- No secrets, customer data, or exploit-enabling detail in any candidate's publishable
  core. Two items need active redaction if published: source/build/deploy divergence
  (bearer/DB auth material stays out) and self-attestation (route payloads stay out;
  the lesson, not the exploit, is the content).
- Nothing in this analysis authorizes publishing. Per the CEO order, every consequential
  claim needs the falsification pass (researcher/skeptic/reproducer/senior
  reviewer/editor) and human approval before distribution.
