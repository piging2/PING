# LANE 16 FALSIFIER REPORT: shadow Jev seam

Session: cb2bbfa5-62b4-40c8-bbce-e03ebea5805c. T+0 2026-09-28 14:26 MDT.
READ ONLY throughout. No commits, no pushes, no restarts, no gateway contact, no :3100 contact, no TypeSafe/Jev API calls (no credential use). All Pig reads via `~/workspace/pig-fb/pigwsl-exec.sh -s`, batched and light. Writes only inside this lane directory. No em dashes used.

Targets attacked: the shadow lane's claims as recorded in the program LEDGER (lines 33-41), the lane 11 decision-fabric report (`~/workspace/ping-24h/lanes/lane11-decision-fabric/report.md`), and the raw records at `~/workspace/ping-decision-seam/shadow-decisions-2026-09-28.json` (read in full). The shadow lane's report is the hypothesis; this report is the attack.

Lane 9 corrections incorporated throughout: the canonical tree was already dirty before T+0 (74 modified + 70 untracked, dirty batch stamped 2026-09-27 22:55-23:00 MDT); the served :3100 build is ~17.5h stale (2026-09-27 21:00:32); the patch branch `decision-fabric/contextpack-wire-2026-09-28` now EXISTS (created after T+0) and route.ts carries 121+/19- uncommitted changes; the nine unpushed constitutional-runtime commits (trunk @ 74fbb74) do not appear in this tree; the orca-adapter / fyd-journal-gateway identical-git-state anomaly is noted but does not affect file-content verification below.

Verdict scale: CONFIRMED (evidence supports as stated) / FALSIFIED (counter-evidence; corrected claim given) / WEAKENED (partially true; precise weaker claim given) / UNVERIFIABLE (exact evidence that would decide it is named).

Raw evidence: [raw/recompute-calibration.txt](raw/recompute-calibration.txt), [raw/claim1-authorizeWorkOrder-code.txt](raw/claim1-authorizeWorkOrder-code.txt), [raw/claim4-gateway-code.txt](raw/claim4-gateway-code.txt).

## Claim 1: Decision Unit mc.authorize_work_order/v1 at external_agent_adapter.js:185, 8 ordered fail-closed checks, STATUS DETERMINISTIC, C4

**Verdict: WEAKENED** (location, check count, and fail-closed ordering CONFIRMED; DETERMINISTIC weakened by a real time-dependence; C4 UNVERIFIABLE as a label).

Evidence (read-only, Pig WSL):
- `function authorizeWorkOrder({ agentId, capability, namespace, constraints })` is at line 185 of `/home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js`. CONFIRMED exactly.
- 8 ordered fail-closed checks, all sequential early `return { granted: false, reason }`: (1) unknown agent (`!profile`, line 186); (2) blockedExternal with blockedUntil expiry (lines 189-197); (3) PENDING_AUTH status (line 199); (4) capability in allowedCapabilities (line 203); (5) namespace matches NAMESPACE_RE `core::<name>` or `tenant::<id>` (line 207); (6) constraints is a non-array object (line 210); (7) constraints tighten relative to maxConstraints (lines 214-218); (8) `no_canonical_events` and `no_mission_state_writes` both true (line 220). CONFIRMED: 8 checks, ordered, each fail-closed. No model call, no randomness in the path.
- DETERMINISTIC is weakened, not confirmed as stated. Line 192-193 reads `Date.now()` for the blockedUntil expiry: `if (Number.isNaN(_until) || Date.now() < _until)`. The lane's own vocabulary defines DETERMINISTIC as "same inputs always produce the same output." That fails across the expiry boundary: identical requests for the codex profile before vs after 2026-09-17T06:01:00Z produce different verdicts (DENY then GRANT-eligible). The function is deterministic at a fixed wall-clock, but it is time-dependent. This is not a hypothetical: the codex profile in the same file (line 98) is the live example.
- C4: UNVERIFIABLE. No criticality scale (C1-C5 rubric) is recorded anywhere in the lane's documents. The substantive content (blast radius: one work order; reversibility: DENY is pure, GRANT reversible via reconciliation/HOLD) is stated, but "C4" itself is a bare label with no published meaning.

Corrected claim: `authorizeWorkOrder` at `external_agent_adapter.js:185` implements 8 ordered fail-closed checks with no model call in the path; it is deterministic at a fixed wall-clock but reads `Date.now()` for block expiry, so it is not time-invariant deterministic. Criticality C4 is an unlabeled label; the substantive criticality content is "blast radius one work order, DENY pure."

## Claim 2: 6/6 agreement at 0.5, Brier 0.0076, latency 334-566ms mean 422ms

**Verdict: WEAKENED, with one arithmetic FALSIFICATION.** Recomputed independently from the raw records (see raw/recompute-calibration.txt).

- 6/6 agreement at 0.5 threshold: CONFIRMED arithmetically (p values [0.95, 0.05, 0.02, 0.02, 0.06, 0.19] vs outcomes [GRANT, DENY x5]).
- Brier 0.0076: CONFIRMED (terms [0.0025, 0.0025, 0.0004, 0.0004, 0.0036, 0.0361], mean 0.0075833 rounds to 0.0076).
- Latency min 334 / max 566: CONFIRMED. **Mean 422ms: FALSIFIED.** Sum is 2579 over 6 samples; mean is 429.83ms, not 422. Corrected: 334-566ms, mean 429.8ms. (Small, ~1.9%, but it is the headline number and it is wrong.)
- Sample-selection bias: no evidence of a larger run exists (single records file; no S7+ anywhere; no other shadow run artifacts). The 6 samples are a hand-constructed coverage set, one per deterministic deny check plus one grant: S2=capability, S3=unknown agent, S4=namespace, S5=canonical writes, S6=blockedExternal, S1=all-pass grant. Three of the eight checks (PENDING_AUTH, constraints-shape, maxConstraints-tightening) are unexercised. The 6/6 is agreement on a non-representative coverage set with zero disagreement cases, zero repeated-call stability data, and zero abstention coverage. The lane's own report says "Calibration NOT established," which is the honest part.
- S6 attack: the opencode profile's block is a plain STRING (`blockedExternal: 'No headless CLI on the Pig...'`), so per the code `Number.isNaN(Date.parse(...))` is true and the check DENIES permanently, unconditionally. This is the case where the deterministic logic is MOST certain (a non-expiring hard block), and it is where the shadow was LEAST certain: p_grant=0.19, the highest grant probability of any deny sample. S6 contributes 79.3% of the total Brier sum. A 0.19 DENY probability means the shadow assigned 19% to GRANT on a deterministic hard DENY. The 0.5 threshold is doing the work here: any threshold in (0.19, 0.5] preserves 6/6, while a threshold at or below 0.19 flips S6 to GRANT (5/6). And the threshold is lane-imposed, not contract-defined: the raw records contain no `selected_output` field, so "agreement at 0.5" is post-hoc binarization of a point probability, not agreement with the contract's own output.
- Additional gap: `current_latency_ms` is 0 in the records. The deterministic baseline's latency was never measured, so no latency comparison exists; only shadow-side latency was recorded.

Corrected claim: 6/6 threshold agreement and Brier 0.0076 recompute exactly, but on a hand-picked n=6 coverage set (5 of 8 deny checks, no stability or disagreement data); the 0.5 threshold is lane-imposed; shadow latency mean is 429.8ms not 422ms; baseline latency unmeasured; S6 (permanent string block, p=0.19) carries 79% of the Brier and is the point where the shadow is least aligned with the deterministic logic.

## Claim 3: "Full distribution preserved" vs "API returns point probability not full distribution"

**Verdict: WEAKENED.** The program's own LEDGER already lists this as an UNKNOWN ("API returns point probability not full distribution"), so the claim was never more than a contract aspiration.

Evidence: the raw records carry exactly one observed number per sample: `p_grant`. No distribution object, no quantiles, no second moment, no abstention mass. The contract envelope (LEDGER line 34) defines a `distribution{GRANT:p, DENY:1-p}` slot, but for a binary outcome that slot is fully determined by p: DENY:1-p is the binary complement, constructed, not observed.

Corrected claim: the API evidence is a binary point probability p; the two-class "distribution" is constructed by complement (DENY = 1-p) and adds no information beyond p. "Full distribution preserved" is not honest phrasing; the honest statement is "binary point probability observed; distribution envelope constructed by complement."

## Claim 4: Gateway diagnosis (NAMESPACE_OWNERS missing jev; JEV_DECISION_EVALUATED rejected as NAMESPACE_VIOLATION; 3 missions in unbounded fail/retry, 1 failure/5s each, /health degraded)

**Verdict: mixed. CONFIRMED (missing key, rejection path) / FALSIFIED ("unbounded") / WEAKENED ("1 failure/5s each") / UNVERIFIABLE ("/health degraded").**

Evidence (read-only, source; live container not touched per constraints; the parent independently verified the missing key in the live container per LEDGER line 36):
- Missing jev key: CONFIRMED. `/home/nolan/wr-integrate/ping-runtime/events/event_governance.js` defines NAMESPACE_OWNERS (55 entries); grep for `jev` returns zero hits. The gateway route (`gateway/routes/governance.js:30`) imports this exact map.
- Rejection path: CONFIRMED. `event_governance.js:183`: `_validateNamespace` returns invalid for a namespace with no owner, and the caller does `return this._reject('NAMESPACE_VIOLATION', namespaceValid.reason)`. `JEV_DECISION_EVALUATED` is a registered event (present in `gateway/generated/event_registry.json`). The 2026-09-27 S1 forensic trace independently traced the identical mechanism inside the live container image (`/app/ping-runtime/events/event_governance.js:200`, "No owner defined for namespace 'jev'").
- "Unbounded fail/retry": FALSIFIED. `mission_scheduler.js:110` sets the default retry policy `{ max_attempts: 3, backoff_delay_ms: 5000 }`, attempts are counted (`reclaimRetryPending`, F-01), and the S1 forensic states explicitly: "each mission burns its 3 retries then goes to the DLQ." The steady-state failure stream is sustained by NEW doomed missions minted per CLAIM_CREATED, not by unbounded retries of the same 3 missions. Corrected: 3 missions in BOUNDED retry_pending (3 attempts, 5s backoff) then terminal/DLQ; the loop is re-minted, not unbounded.
- "1 failure/5s each": WEAKENED. 5s is the retry backoff cadence during a mission's 3-attempt window; as a permanent per-mission failure rate it is wrong (missions go terminal after 3 attempts).
- "/health degraded": UNVERIFIABLE from my allowed evidence. No /health observation is recorded in the lane reports (no "health" mention in the coordinator synthesis), and I am barred from touching the gateway. Evidence that would decide it: a recorded GET /health response (or gateway logs) from the failure window.

## Claim 5: "confidence:null never populated" and "codex blockedUntil 2026-09-17 expired"

**Verdict: mixed. confidence: UNVERIFIABLE as a positive API claim (records are consistent but contain no evidence). codex: CONFIRMED-expired, and "intended temporary" not "stale config," with a stated residual.**

- confidence: the raw records contain NO confidence field at all (verified programmatically). That is consistent with "never populated," but the positive assertion "the API returns confidence:null" has no recorded response body behind it; I did not call the API (no credential use) and the lane's raw dir contains no probe records. UNVERIFIABLE as stated; what would decide it is one recorded API response body.
- codex blockedUntil: CONFIRMED expired (`blockedUntil: '2026-09-17T06:01:00Z'`, line 98; today 2026-09-28). The code at lines 190-197 treats an expired blockedUntil as no longer blocking, so codex is grantable again through this gate. Stale vs intended: the config's own comment says "Do not retry before then" (2026-09-17 12:01 AM), i.e. a deliberate time-box, and the code implements expiry semantics. This is an intended temporary block that lapsed by design, not a stale-config bug. The LEDGER's open question ("stale config or intended?") resolves to intended-temporary on the config's own evidence. Residual, honestly carried: quota was never re-checked; codex's current grantability rests on a 2026-09-16 observation, with no re-verification mechanism. That residual is about quota state, not config staleness.

## Claim 6: "No writes, no commits, no pushes, no :3100 touch"

**Verdict: CONFIRMED, with the Lane 9 correction applied: the claim must read "no writes BY THIS LANE," not "clean tree."**

Evidence: both trees the lane read are dirty, and all dirty state predates T+0 (2026-09-28 14:26 MDT). Zero files in either dirty set have mtimes after 14:26 MDT. Latest orca-adapter commit 9652896 is dated 2026-09-28 12:14 UTC (06:14 MDT), before the lane ran; ping tree HEAD 0264d517 likewise predates it. No new commits, no pushes (upstream NONE on the ping branch), no :3100 contact by the lane. The lane's artifacts went to its own sandbox dir (`~/workspace/ping-24h/lanes/lane11-decision-fabric/raw/`, local, not a canonical tree). The Lane 9 correction stands: the dirty state (ping: 74 modified + 70 untracked per coordinator correction; orca-adapter: extensive dirty incl. lane-p01 and goals files) is pre-existing, stamped 2026-09-27 22:55-23:00 MDT. Judged against that baseline, the shadow lane wrote nothing.

Caveat for the record: the locked call site `src/app/api/mc/dispatch/route.ts` carries 121+/19- uncommitted changes and the authorized patch branch `decision-fabric/contextpack-wire-2026-09-28` now EXISTS (created after T+0; the lane11 report's "patch branch ABSENT" is stale as of this writing). Nothing in the shadow lane's evidence depends on that file, but no future claim should treat the patch lane's output as clean-checkout evidence without accounting for the dirty diff.

## Claim 7: "JEV SDK verified"

**Verdict: WEAKENED.** "Verified" as a blanket word is wrong; the honest partition is:

- VERIFIED (recorded evidence): endpoint reachability, 6/6 HTTP 200 from provider `typesafe/jev-latest` with per-call latencies 334-566ms; auth flow worked (200s carrying valid probability payloads; a 401/403 would have shown as such); response shape observed (point probability `p_grant` per call).
- NOT VERIFIED: model_version/commit (lane-asserted "NOT PUBLISHED (404s)" as U-02, but no probe artifact is recorded in the lane's raw dir; the 404s are asserted, not evidenced); SDK package surface (no SDK exists; the interface is REST, consistent with the `shadow_http` field and the absence of any SDK import, but "no SDK package" is a negative claim with no recorded search behind it); cost per call (UNKNOWN, API does not report it).

Corrected claim: Jev endpoint reachability, auth, and response shape (binary point probability + latency) are verified by 6 recorded calls; model version/commit, SDK surface, and cost are unverified or unknown. "JEV SDK verified" should read "Jev REST endpoint reachable and responding; identity metadata unverified."

## STRONGEST SURVIVING CLAIMS

1. The Decision Unit exists exactly where claimed (`external_agent_adapter.js:185`) and implements 8 ordered fail-closed checks with no model call in the authorize path. This survived byte-level code verification.
2. The gateway root cause: NAMESPACE_OWNERS has no jev key, and the fail-closed `_validateNamespace` path rejects every JEV_DECISION_EVALUATED emission as NAMESPACE_VIOLATION. This survived source verification AND the independent 2026-09-27 live-container forensic trace, and the parent independently verified the missing key in the live container.
3. Calibration is NOT established (n=6, hand-picked coverage set). This is the lane's own honest statement, and the attack confirms the evidence cannot support more.
4. The lane wrote nothing to any canonical tree; all dirty state predates T+0. This survived mtime and git-log verification against the Lane 9 pre-existing-dirty baseline.
5. The codex block was an intended temporary measure that lapsed by design. This survived the config's own comment plus the code's expiry semantics.

## SINGLE WEAKEST LINK IN THE SHADOW METHODOLOGY

The calibration narrative. The "6/6 agreement, Brier 0.0076" headline is arithmetically reproducible but evidentially hollow: n=6 hand-picked coverage samples (not a representative draw, 3 of 8 deny checks unexercised), a lane-imposed 0.5 threshold doing the decisive work on the hardest sample, a miscomputed latency mean (422 vs the true 429.8), an unmeasured baseline (`current_latency_ms: 0`), and the single hardest case (S6, a permanent string block) being exactly where the shadow was least aligned while contributing 79% of the Brier mass. The numbers are not wrong except for the mean; the inference drawn from them is. The lane's own "calibration NOT established" is the only load-bearing sentence in that section, and everything else should be read as a first smoke test, not a measurement.

---
Lane 16 complete. All observations read-only; nothing on any canonical tree was modified; no gateway, scheduler mission, :3100, or Jev API contact. This report is itself a hypothesis until replayed from a clean checkout.
