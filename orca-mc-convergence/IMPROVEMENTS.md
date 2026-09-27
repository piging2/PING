# ENGAGEMENT PIPELINE IMPROVEMENTS (all five platforms)

Lane: SPEC + SAFE-IMPLEMENTATION, engagement-pipeline convergence track.
Date: 2026-09-26. Author: the spec lane (my own enumeration).

Classification:
- SAFE: backward compatible, no live-schedule change, implementable now.
  Only the policy engine + its tests are implemented in this lane; other
  SAFE items are specified for a follow-up lane with no rollout
  coordination needed.
- SEQUENCE: correct but touches live cron bodies or Pig drivers; spec'd
  fully here, implementation needs rollout coordination. Do NOT implement
  in this lane.
- REJECT: considered and declined, with reason.

Cross-cutting items first, then per platform.

## Cross-platform

1. Deterministic policy engine (this lane). CONDENSES the per-cron
   policy prose into `pass_policy_engine.py`: candidate pipeline
   (guard -> refuse -> evidence -> format -> cap) with exhaustive reason
   codes, pass lifecycle state machine with in-run recovery transitions,
   `classify_pass_terminal` for the ten pass classes, `validate_manifest`
   for action-set schema rules. SAFE. IMPLEMENTED.

2. `MC_PASS_*` event types added to `mission-control/emit.py`
   (additive only; no caller changes). SAFE. IMPLEMENTED.

3. Wire stage events into cron bodies: each stage emits its `MC_PASS_*`
   event as it runs, so the pass-health panel and the three WHY-questions
   answer from the journal. SEQUENCE: touches all five cron bodies;
   coordinate with the parent so emission never blocks a pass (emit
   failures log, never abort).

4. Cron bodies shrink to the pipeline: discovery -> engine evaluate ->
   manifest -> intents -> executor -> outcomes -> verify. The prose
   paragraphs retired in PIPELINE-ENDGAME-SPEC.md section 7 are deleted
   from the bodies when sequenced. The bodies keep only platform targeting
   prose, voice rules, and seed lists (the parts that are genuinely
   platform judgment). SEQUENCE.

5. Yield telemetry as evidence: a pure read-only function folding the
   intent ledger + guard logs into per-(platform, action, target-bucket)
   yield (landed/planned, reply rate where known). Discovery consumes it
   as prioritization evidence. The function itself is SAFE (new file, no
   callers); wiring it into discovery prompts is SEQUENCE.

6. Generalize `sweep-stale-dispatches` beyond Facebook: every platform's
   dispatch gets the same stale-with-zero-evidence lifecycle, same
   never-infer-failed guarantee. SEQUENCE (new per-platform state paths).

7. Unified pass artifact schema: candidates/manifest/results share one
   field contract across platforms (account, url, action, posted_at,
   evidence{}). SEQUENCE (five bodies + drivers write these files).

8. Anomaly detector: prose log vs journal divergence (e.g. a pass log
   claims 40 likes but the journal shows 12 observations) surfaces as an
   anomaly row on the panel. SEQUENCE (new reader, no writer changes).

9. REJECT: auto-reconciling UNKNOWN_EXECUTION after N days. Reason: the
   never-silent-retry guarantee is the architecture's strongest feature;
   time-based auto-clear would reintroduce exactly the duplicate-action
   risk the ledger was built to kill. Deliberate reconciliation only.

10. REJECT: any new event store, database, or dashboard backend. Reason:
    forbidden by the convergence brief; the journal plus the ledger are
    sufficient, and a third store would fork truth.

11. REJECT: letting the LLM make cap, eligibility, or dedup decisions.
    Reason: architecture violation; the LLM sits beside the deterministic
    system, never above it.

## Instagram

12. Evidence-typed reel rule. Today "only engage a reel if it visibly has
    public comments" is LLM prose judgment. Discovery records
    `comments_visible: bool` per candidate; the engine's EVIDENCE_EVAL
    rejects reels without it. Removes a whole class of judgment drift.
    SEQUENCE (discovery output schema + engine rule).

13. Candidate evidence enrichment: every IG candidate carries posted_at,
    media type, and follower band at discovery time. Policy prefers
    <48h posts; stale candidates are rejected with reason instead of
    burning LLM vetting time. SEQUENCE.

14. In-run discovery fallback ladder: if the CDP funnel returns zero
    candidates, the engine's DISCOVERY_RECOVERY tries the seed-handle
    scan, then the tier-expansion scan, then the reply-thread scan
    (budgets already exist in prose; the machine now owns the ladder).
    Partially in this lane's state machine; the per-platform strategy
    list is SEQUENCE.

15. Comment proof capture: for comment actions, the executor records the
    posted comment's URL (observation evidence), not just ok=true. Closes
    the "did the comment actually land" gap that ok=true leaves open.
    SEQUENCE (ig-engage.js result shape).

16. REJECT: relaxing never-re-engage because the pool is thin. Reason:
    Nolan declined this explicitly 2026-09-26; zero-engagement passes are
    the honest signal, not a bug to engineer around. Radius expansion is
    the authorized answer, already in policy.

## Facebook

17. Deterministic job validator (`validate_manifest` in this lane's
    engine): FB job JSON is schema-checked before the guard filter,
    enforcing the page-name uniqueness rule (one distinct page string per
    post, the 2026-09-18 lesson) and the allowed-action set. Catches
    builder-LLM mistakes before they reach the Pig. SAFE. IMPLEMENTED.

18. Intent-id join for observations: include `intent_id` in the job file
    so `record-outcomes` joins worker results to intents on intent_id
    instead of the fragile (type, url) key. Eliminates the key-collision
    class entirely. SEQUENCE (run_pass.sh + engage.js + record-outcomes).

19. Page identity evidence: `check-page.js` already returns page fields;
    require `identity_match` evidence (phone/address/website) on the
    candidate before POLICY_EVAL, instead of LLM research prose. Moves a
    trust decision into evidence. SEQUENCE.

20. Driver health preflight as a typed event: the WMI launch, CDP
    attach, and lock acquisition each emit success/failure before any
    action, so DEPENDENCY_FAILURE names the failing layer (machine vs
    proxy vs route vs CDP vs browser) instead of "the pass failed".
    SEQUENCE.

## Threads

21. AUTH_PENDING as a first-class pass state signal: Threads still needs
    Nolan's manual login; today those passes log zero-engagement retries
    that look like failures. Emit the auth boundary as evidence so the
    panel shows "waiting on owner login", not a failure streak.
    SEQUENCE (cron body + one event).

22. Canary gate as code: the "first pass after login runs max 3 actions"
    rule is prose today. The engine takes `canary: bool` in the pass
    context and clamps caps deterministically. SEQUENCE (needs a durable
    login-event marker to key the canary off).

23. Tech-voice tier rotation: the seed list is static and will exhaust
    like IG's did. Adopt the tier model (core tech voices -> adjacent
    builders -> broader founders) with closest-first exhaustion, mirroring
    IG's geography tiers. SEQUENCE (discovery targeting).

24. Reply-thread discovery: replies to seed handles' posts surface new
    eligible voices the seed scan misses; bounded (top-level replies
    only, verified identity). SEQUENCE.

## TikTok

25. Discovery cool-down: a handle that yields zero usable videos twice in
    a row gets a 7-day discovery cool-down, so the probe budget is not
    burned re-scanning dead handles every 2h. Pure function over pass
    artifacts; the list itself is SAFE (new file), wiring into the probe
    call is SEQUENCE.

26. Ad evidence flag: "skip obvious ads" is LLM judgment today. The probe
    records `is_promoted` from the page's own promoted markers where
    visible; policy rejects flagged candidates with reason instead of
    relying on the LLM's eye. SEQUENCE.

27. Duet/stitch exclusion as evidence: engagement targets original videos
    only; the probe records video kind. SEQUENCE (probe output schema).

## X

28. X pair rule in the engine: "never like+comment the same post in one
    pass" is now `PAIR_RULE_VIOLATION`, enforced deterministically for
    platform x (IG/FB like+comment pairs unaffected). SAFE. IMPLEMENTED.

29. Follow outcome verification: the follow batch records post-action
    profile state (Following vs Follow) as observation evidence, so a
    silently-failed follow does not read as EXECUTED. SEQUENCE
    (x-follow-batch.sh result shape).

30. Probe staleness budget: `x-probe-discover.sh` per-handle runs are
    bounded; add a per-pass probe time budget with a typed
    PROBE_TIMEOUT -> comment/like leg skipped, follow leg continues
    (the X body already describes this; the machine now owns it).
    In this lane's transition table; the launcher-side timer is
    SEQUENCE.

31. Priority-target rotation state: the 7 priority comment handles rotate
    per pass from a durable cursor, not from LLM memory, so rotation is
    even and auditable. SAFE as a pure cursor file + function (new
    files); wiring into the body is SEQUENCE.

## Recovery behavior (all platforms)

32. In-run troubleshoot transitions are now in the state machine
    (DISCOVERY_RECOVERY, EXECUTION_RECOVERY) with the recovery budgets'
    numbers: 3 alternate discovery strategies, 2 browser/CDP attempts, 2
    auth attempts, 5/10/20m backoff then 24h quarantine, never hammer.
    The budgets JSON remains the numeric owner; the machine owns the
    transitions. Spec'd here; per-platform strategy lists are SEQUENCE.

33. Restriction signals stay a hard stop with next-pass resume at ramped
    caps (no-scale-back). Unchanged; now `PASS_HALTED` with the kind
    (restriction vs checkpoint) as evidence. In this lane's machine.

## Rollout order for the SEQUENCE items

S1: wire `MC_PASS_*` emission into one platform's cron body (X is
smallest), verify the panel answers the three WHY-questions from the
journal, then roll to the other four.
S2: shrink cron bodies to the pipeline (delete retired prose as the
machine proves each rule).
S3: cap table becomes the single writer (cron bodies read it; ramp
directives update it with dates).
S4: executor evidence upgrades (intent-id join, comment proof URLs,
follow verification, driver preflights).
S5: discovery evidence upgrades (reel comments flag, ad flags, page
identity, cool-downs, tier rotation).
S6: anomaly detector + yield telemetry consumers.
