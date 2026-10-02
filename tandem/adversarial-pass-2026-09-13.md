# Adversarial Pass: Muse → Pig → Meta Seam
**2026-09-13. Skeptical pass over the interop audit. Nothing here is declared finished.**

Method: for each seam, assume the abstraction is lying and check it against executable reality. Findings are graded: **proven** (observed live), **code-verified** (read, not run), **assumed** (no evidence), **gap** (missing).

---

## 1. Capability-manifest drift: corrected and pinned

**Verdict: the manifest is now honestly labeled `DISCOVERY PROJECTION, NOT AUTHORITY`, with 28 contract tests as the anti-drift harness. It is not generated from the implementation; the tests are the next best thing.**

Per-capability verification (manifest → implementation → callable path → authority → scope → result → verification):

| Capability | Implementation | Callable path | Authority | Verification |
|---|---|---|---|---|
| research.ask | meta-ask.js via meta-pass.sh | `bash meta-pass.sh <slug> <job.json>` | scripts | live runs + failure-mode docs + locator telemetry |
| research.context | build-context-pack.py | `python3 build-context-pack.py <slug>` | script | every run; content-addressed cache |
| artifact.write/read | pig-ssh.sh pig_scp | `pig_scp <local> <remote>` | script | every run; byte-exact |
| browser.status | ensure-cdp.sh | exit 0/1 | script | kill tests x2; every run |
| validation.run | validate-meta-answer.py | exit 0/3/2 | script | live pass + fail traces |
| retention.sweep | pig-retention.sh | `--apply` on pass path (line 323, `\|\| true`) | script | dry-run + pass-path runs |
| job.record | meta-pass.sh EXIT trap | appends runs.jsonl | script | 8 records; exactly-once-per-invocation |

Drift fixed in this pass (cheap, demonstrated):
- validation.run inputs now include the real `slug` and `ts` CLI args.
- job.record no longer claims a phantom `signal` outcome or idempotence; documents `terminated_by_signal_*` and append-only exactly-once-per-invocation.
- artifact timeouts clarified as SSH ConnectTimeout, not a transfer bound.
- research.ask outputs corrected: DOM innerText is lossy; byte-exactness holds only for the scp pull-back.
- browser.status documents exit 1; retention.sweep documents the 7-day Pig-side deletion honestly.

**Residual (assumed, not proven):** the manifest is still hand-maintained. The contract test (`pig-fb/test-capabilities.py`, 28 tests) fails loudly on drift, but a human must still fix the file. If a second consumer of this manifest ever appears, generation-from-implementation becomes worth the cost. Until then, projection + tests is the honest minimum.

---

## 2. research.ask: the contract is codified; its authority over Meta is still assumed

**Architectural discovery (from the two failed traces): `delimiter != authority`. What worked was ordering + explicit output contract, not cleverer delimiters.**

Codified in meta-pass.sh (this pass):
- Three sections, fixed order, named constants: `SEC_OBJECTIVE` (brief verbatim, first), `SEC_CONTEXT` (pack verbatim, second), `SEC_CONTRACT` (validator constants, third).
- `VMIN_ITEMS` / `VMIN_CHARS` extracted from validate-meta-answer.py by sed; if extraction fails the run fails closed (`infra_exit validator_constants_unreadable`). One source of truth for the numbers.
- Section 3 declares itself authoritative over any conflicting CONTEXT directive, in the prompt Meta actually reads.
- The briefs' "Find 12/10" is demoted to aspiration in-prompt; the validator floor (>=3) is declared the only enforceable number.
- The dangling "the geography above" is bound by an explicit dependency declaration naming the pack's GEOGRAPHY and TARGET sections.

**Pack conflict resolution:** the pack's `## Verification rules` / `## Output schema` / `## PING boundary` (hardcoded in build-context-pack.py lines 78-86) are currently *aligned* with the contract in substance (numbered list, no invention, per-item verification phrase, closing uncertainty sentences, UNVERIFIED status) but *subordinate* in authority. The subordination is declared in-prompt, not in the pack. Historical pack content is preserved (content-addressed cache); nothing was deleted to make the prompt prettier.

**Adversarial findings (do not accept "works in our test"):**
- Sample size is 3 runs, 1 success. Meta respecting section hierarchy is **assumed**, not proven.
- Meta may satisfice at the >=3 floor while the brief asks for 10/12. This is a deliberate tradeoff: enforcing 12 would false-fail on topics with fewer than 12 verifiable businesses. The floor is the honest enforceable shape; the count is an objective, not a contract.
- The sed extraction is regex-fragile (matches `^MIN_NUMBERED_ITEMS *= *`). It fails closed and the contract test pins it. Acceptable.
- The dependency declaration is prompt prose, not structure. Truly structural would be briefs without dangling references, but briefs are Nolan's content; the declaration is the cheap correct fix.

---

## 3. Browser observation channels: inventoried honestly

| Rung | Channel | Available? | Tested? | Stable? | Machine-readable? | Deterministic? | Locate input? | Detect submission? | Detect completion? | Extract answer? |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Accessibility tree / roles | yes (playwright getByRole) | **yes, live today** (`ax-textbox` won) | moderate | yes | yes | **yes, proven** | no | no | partial |
| 2 | Rendered text (innerText) | yes | yes (every run) | moderate | yes | yes | no | no | weak (stability heuristic) | **yes (primary)** |
| 3 | DOM selectors | yes | yes (fallback) | **low** | yes | yes | yes (fallback) | no | no | no |
| 4 | CDP protocol state | yes (CDPSession) | **no** | high | yes | yes | no | possible | lifecycle only | no |
| 5 | Keyboard/focus | yes | yes (typing, Enter, activeElement) | high | yes | mostly | untested (Tab-walk) | no | no | no |
| 6 | Screenshot / visual | yes (page.screenshot) | no | moderate | **no** (needs vision) | no | no | no | no | no |
| 7 | OCR | **no** (tesseract not installed) | no | - | no | no | no | no | no | no |
| 8 | Network/app signals | yes (CDP Network) | **no** | high | yes | yes | no | possible | liveness only | no |
| 9 | Recovery / re-auth | yes (ensure-cdp.sh, watchdog) | **yes (kill tests x2)** | high | yes | yes | n/a | n/a | n/a | n/a |

**Adversarial findings:**
- Rungs 1-3 are three views of the **same renderer**, not independent channels. A renderer-level failure (page crash, wrong tab, full UI rewrite) defeats all three together. The ladder is defense against *locator* drift, not *substrate* failure. Do not mistake it for redundancy.
- The only truly independent observation channel is rung 8 (wire vs renderer). It is the honest cross-check and it is untested.
- Rung 6/7 are correctly **not** part of the architecture. Screenshots are non-deterministic pixels, not machine-readable state; "DOM failed, click pixels" is the failure mode Nolan forbade. Tesseract is not installed and should stay that way: it adds a dependency for zero determinism gain over DOM text.
- Rung 4 (CDP Target/Page lifecycle) is available and untouched. It can answer "is the page alive / crashed / navigated away" without any DOM parsing. Cheap future hardening if needed.

---

## 4. Network/application signals: useful as liveness, not as oracle

**Verdict: document the conclusion, do not build it yet.**

- CDP's Network domain (requestWillBeSent, responseReceived, dataReceived, loadingFinished) is available via playwright's CDPSession. Standard protocol, no private API, no access-control circumvention: it observes our own browser's traffic.
- What it **can** provide: streaming liveness (bytes flowing = Meta still generating), stall detection (network quiet + DOM stable = higher completion confidence; DOM stable + network active = keep waiting, do not declare done).
- What it **cannot** provide without coupling to meta.ai's undocumented API shape: semantic completion ("the answer is done"). The user forbade depending on private/undocumented Meta APIs. A GraphQL stream ending is a transport fact, not an answer-completeness fact.
- The current completion gate (DOM stability + growth-beyond-prompt-echo + false-success guard) conflates "stopped changing" with "finished." A network liveness cross-check would split those: *quiet wire + stable DOM* is a strictly stronger signal than *stable DOM alone*.
- **Recommendation:** design the hook (record last Network.dataReceived timestamp; feed it into the completion gate as a veto: never declare complete while the wire is hot), but do not implement until rung-1 locator telemetry shows the DOM gate actually failing. Today the DOM gate has 1 success and 2 correctly-rejected failures. That is not a failure record that justifies new machinery.

---

## 5. Chrome concurrency: lease designed, primitive proven, NOT implemented

**Verdict: the design is ready and the atomic primitive is proven live on the Pig. There is no second Chrome-touching worker and no observed collision, so implementation waits.**

Design (Pig-side, single file, not a database):
- Lease file: `C:/Users/nolan/.local/share/pigi/fb-engage/lease/browser-lease.json`
- **Acquire:** atomic create-or-fail. Proven today on the Pig: PowerShell `New-Item` fails if the file exists (atomic on NTFS; CREATE1 ok / CREATE2 failed as expected in the live test).
- Fields: lease_id, run_id, job_type, holder, acquired_at, heartbeat_at, expires_at, ttl_s (300).
- **Heartbeat:** holder rewrites every 60s, only if lease_id still matches (no blind overwrite).
- **Stale recovery:** takeover allowed only after expiry AND a post-write re-read confirming it is still expired (single-machine clock, no skew games).
- **Bounded wait:** acquirer retries up to N seconds, then fails `lease_busy`. No deadlock by construction: every lease self-expires.
- **Watchdog stays independent:** it owns Chrome *process* recovery only; never reads or writes lease state. The lease owns *job arbitration* only; never restarts Chrome.
- **Ledger stays truth:** lease events are fields on the run record, never a second record system. A dropped SSH connection does not release a lease (the worker may still be alive detached).

**Adversarial note:** a lease adds its own failure mode (stale lease blocks the queue until TTL expiry). The TTL + conditional takeover bounds it at 300s. Acceptable, and strictly better than silent concurrent interleaving once a second worker exists.

---

## 6. Rotation resumability: crash window CONFIRMED, smallest fix identified

**Verdict: the window is real. The ledger already contains everything needed to close it with existing files.**

Mechanism (cron doc `crons/hourly/meta-ai-intel-pass__interval@6h.md`, steps 1-3):
1. Read candidate slug from `hidden_files/meta-ai-intel/rotation.txt`.
2. Run meta-pass.sh (~15 min).
3. Advance rotation.txt to next slug.

If the worker dies between 2 and 3, the next invocation repeats the same slug. `meta-pass.sh` never touches rotation.txt (zero references in pig-fb/*.sh or tandem/*.py); the only writer is the worker following the doc. No other mechanism consults runs.jsonl; rotation.txt is the sole pointer. **Confirmed, not theoretical.**

Why it has not bitten yet: `grep -c "cron:" runs.jsonl` = 0 — no scheduled firing has occurred (all 8 ledger lines are manual runs). The ledger *is* durable before the script returns (EXIT trap appends the line before exit), so the evidence for the fix exists; it is just never read for rotation.

**Doc/behavior discrepancy:** step 3 says advance unconditionally; observed practice is advance-on-`ok` only (rotation was not advanced after the `b` infra failure or the aborted run, whose trap correctly recorded `unknown`/`terminated_by_signal_TERM` rather than `ok`).

**Smallest idempotent fix (existing files, no database):** derive the next slug from the run ledger instead of rotation.txt. Cron doc step 1 becomes: next slug = successor in (a→b→c→d→a) of the `brief_id` of the newest runs.jsonl entry with `outcome: ok` (skipping non-cycle slugs like the bogus-slug test entry); fallback to rotation.txt if no such entry, then to the existing default. Step 3 becomes optional: rotation.txt stays as a human-readable bootstrap cache but is no longer load-bearing. Codify "advance on `ok` only" to match behavior.

Why this closes the window: the `ok` line is appended by the EXIT trap strictly before meta-pass.sh returns, so no worker death after a successful run can un-append it, and the next invocation re-derives the advanced slug. Failed runs do not advance; `kill -9` mid-script leaves no ledger line, so the retry is correct. This collapses two sources of truth into one: the run ledger remains execution truth.

**Not implemented in this pass** per the stop rule. The invariant to enforce: *a successfully completed run cannot cause the next scheduled invocation to repeat the same logical work unless explicitly requested.*

---

## 7. Initiator/auth metadata: claimed vs authenticated, limitation recorded

**Verdict: no change. The env var is honest telemetry, not a security claim, and nothing authorizes on it.**

- `META_RUN_INITIATOR` / `META_RUN_AUTH_REF` are self-asserted by the caller (the cron doc instructs the worker to set `cron:meta-ai-intel-pass` and the standing-directive ref). Fallback `unknown` is honest.
- **Claimed identity** (the env var) vs **authenticated identity** (the runtime's job dispatch: only the scheduler invokes the cron; only this agent runtime can execute these scripts against this workspace). The actual authorization boundary is the latter. The env var rides on top of it. Any process that can run new-job.sh can claim `cron:meta-ai-intel-pass`; no runtime-injected, tamper-evident caller identity exists at this layer.
- Nothing in the code makes an authorization decision based on these fields — they are record-only. Verified: `emit-observation.py` never reads `META_RUN_INITIATOR`; the PING Bearer token is resolved from the container env. The weakness cannot currently authorize anything.
- If authoritative caller identity is ever genuinely required, the runtime scheduler would need to inject a signed/attested token — a runtime feature request, not something to build at this layer (a local attestation scheme would violate the no-new-subsystem constraint).
- Recorded limitation: at this layer, initiator is asserted, not derived. That is acceptable because it is labeled telemetry, not authority.

---

## 8. PING boundary: two of four states are unrepresentable

**Verdict: the manual gate is real (nothing auto-emits), but VERIFIED and ACCEPTED_BY_PING have no field and no writer. The 32-business run is correctly RESEARCHED+VALIDATED and nothing else.**

| State | Representable? | Evidence |
|---|---|---|
| RESEARCHED | yes | `outcome: ok` + raw file exists |
| VALIDATED | yes | `validation.exit: 0` |
| VERIFIED | **no** | sidecar `verification:` is stuck at `"pending"`; no code transitions it; no ledger field |
| ACCEPTED_BY_PING | **no** | `ping_outcome` exists but is only ever written as `"none"` (meta-pass.sh:121); no writer for the positive case |

**Skip-path audit (every code path that could collapse the distinction):**
1. `tandem/emit-observation.py` is the sole emission path. It is **manual-only**: nothing invokes it automatically (no cron, no hook, no worker calls it). Good.
2. **However:** when invoked, it POSTs `OBSERVATION_CREATED` with `verification_status: 'unverified'`, and the gateway pipeline auto-fires `EventToMissionBridge -> CLAIM_GENERATE -> ClaimWorker -> CLAIM_CREATED`. The `unverified` flag is the *only* guard between "recorded observation" and "generated claim." Whether the ClaimWorker respects that flag is **PING-side and unconfirmed in this pass**. Flagged for Nolan; not changed here (gateway is his domain, and this pass is read-only there).
3. No existing field *collapses* the four states; two are simply absent. Absence is the gap: a future reader of the ledger cannot distinguish "not yet verified" from "verified but unrecorded."

**Recommendation (no automation):** add an explicit `knowledge_state` to the ledger/sidecar (`researched -> validated -> verified -> accepted`), written only by the human verification step and the emission step. The manual gate stays manual; the states become observable.

---

## 9. /orchestration/*: 11 unauthenticated routes, blast radius confined, minimal fix identified

**Verdict: the earlier hardening finding is confirmed live and traced end to end. The blast radius is confined to the sandboxed Orca substrate; it cannot reach Postgres, the PING pipeline, secrets, or the repo. The minimal fix is one line using the existing middleware. Explicit approval required before any change.**

Trace method: read-only `docker exec` against the live `ping-gateway` container (image `curious-squid-gateway:phase4-eventauth6`), plus one live unauthenticated GET probe. No writes, no restarts, no repo changes. Full trace saved at `~/workspace/tandem/orchestration-auth-trace-2026-09-13.md`.

**(a) All 11 routes exist and ALL are unauthenticated.** Mount at gateway_runtime.js:872: `this._app.use('/orchestration', createOrchestrationRoutes(...))` — no middleware. Live-verified: `GET /orchestration/engine` with no credentials returned HTTP 200.

Unauthenticated writes, traced to implementation:
- `POST /missions` → injects arbitrary mission → engine's in-memory mission list.
- `POST /missions/:id/dispatch` → schedules workers, builds prompts, writes prompt artifacts to **container disk** (`/app/ping-runtime/orchestration/artifact_store/<sha256>.json`).
- `POST /missions/:id/output` → records worker output with **caller-chosen workerId, never verified**; writes a proposal artifact; calls `registry.recordQuality/recordConfidence` — **reputation poisoning with attacker-chosen confidence**; consensus evaluated, mission marked complete/failed.
- `POST /engine/loop` → starts the autonomous loop with caller-controlled `maxIterations`, **no upper bound**, fully synchronous — a large value blocks the Node event loop. Unauthenticated whole-gateway DoS.
- `POST /engine/compile`, `POST /engine/git-diff` → mission compilation, internal event with caller-supplied diff.

Unauthenticated reads disclose missions (incl. worker outputs and consensus), the worker registry with quality scores, and engine state.

**(b) Blast radius: confined, traced not assumed.** The engine's `_eventQueue` is engine-internal: zero `pool.query`/`pg` in engine.js, **no path to Postgres `ping_events` or the canonical PING pipeline**. No process spawning, no LLM calls (`OpenCodeWorkerPort` registered with `executor: null`), no repo modification (merge-gate path is read/validate as traced). An unauthenticated caller gets full integrity control over the Orca substrate (missions, dispatch, fabricated outputs, consensus, reputation, disk artifacts, CPU) but **cannot execute code, reach secrets, touch Postgres, enter the PING pipeline, or modify the repo**. Orca is live-but-disabled by standing decision; this substrate is not the canonical knowledge authority.

**(c) Minimal fix (NOT implemented): one line** at gateway_runtime.js:872, mirroring the existing pattern used for `/events` (:762) and `/missions` (:887):
```js
this._app.use('/orchestration', services.exteriorAuthMiddleware.middleware(), createOrchestrationRoutes(services.executionEngine));
```
Fit: the middleware is constructed unconditionally at boot (degrades gracefully when PG is down); no internal HTTP callers of `/orchestration/*` exist in `/app`, so nothing in-process breaks. Requires a container rebuild + restart (code is baked into the image).

**Caveats (do not overstate the fix):**
- It buys authentication + caller identity, **not least privilege**. L1 "Observe" could still POST. Per-level read/write restriction would be a separate second step.
- Could not determine read-only: whether any legitimate external caller currently POSTs to these routes without a token (such a caller would break); `MergeGate.validateFile` behavior on caller-influenced paths (a constrained container-local file-read primitive is plausible, not fully traced); per-iteration CPU cost of the loop DoS (no load test run deliberately); Bearer token distribution (out of scope).
- Adjacent unauthenticated write surfaces were observed but **not** deep-traced: `/knowledge`, `/ai-workspace`, `/reviews`, `/customers`, `/projects`, `/tenants`, `/deployments`, `/runtime`, `/api/v1/ollama`, `/api/v1/repository`, `/mc`, `/ops`, `/governance`. These widen the question beyond `/orchestration/*` and are flagged, not concluded.

---

## 10. MCP re-evaluated (correct framing)

**Question asked correctly this time:** not "can Meta use MCP" (it cannot; it sees prompt text), but "would MCP materially improve *Muse's* discovery/consumption of the machine capability surface?"

**Answer: still no.** Against the actual requirements:
- *Multiple tools / heterogeneous workers:* one orchestrator, one worker type, one transport (SSH). No second consumer exists.
- *Runtime discovery:* the manifest + 28 contract tests serve the single consumer.
- *Schemas / structured outputs:* bash/JSONL with fail-closed validation; no schema negotiation needed at this scale.
- *Long-running operations / tracing / authorization:* the job envelope + runs.jsonl already provide handles, lineage, and the existing auth model.

MCP would add a server process on the Pig (a new subsystem), transport and schema maintenance, for zero buyers. **Explicitly deferred**, with triggers: a second genuinely different worker, a third bespoke invocation protocol, a named external MCP client, or a real cross-process handoff incident. If it ever comes, it replaces the manifest *as discovery* — never the scripts, the job envelope, the ledger, or the prompt interface.

---

## 11. A2A re-evaluated (correct framing)

A2A is for agent-to-agent: independently-addressable agents, negotiation, input-required states, standardized federation. The current system is **orchestrator -> specialized worker**, where the "worker" is a script driving a research substrate, not an addressable agent. There is no negotiation, no counterparty, no federation. The job envelope + scheduler + run ledger already provide tasking, handles, and lineage. **Do not implement.** Revisit only when heterogeneous independently-addressable agents exist.

---

## 12. Architectural principle (now standing)

> **Never solve a transport problem at the semantic layer, and never solve a semantic problem with transport complexity.**

Added to AGENTS.md 2026-09-13. Applied in this pass: the lease is a filesystem primitive, not a database; the contract is prompt structure, not a protocol; identity is reused mission/run/job identity, not a new store.

---

## 13. Scalability: what generalizes, what does not

Target shape (Muse -> common job contract -> workers -> common capability model -> Pig substrate) holds up with one honest caveat:

- **Generalizes:** job envelope (worker-agnostic), runs.jsonl (already carries `research_agent`), SSH transport adapter, the lease primitive, the EXIT-trap ledger pattern.
- **Worker-specific (correctly):** meta-pass.sh prompt assembly, meta-ask.js, the pack builder, the validator. A future worker N needs its own pass script + capability entries + result contract. That matches the "adding worker N" list: capability declaration, worker implementation, transport adapter if needed, result contract compatibility. No new scheduler, DB, memory, orchestrator, truth store, or observability.
- **Honest caveat:** the "common capability model" today is the manifest, which is a *projection*, not a generated contract. It generalizes as an index, not as enforcement. Enforcement stays in the per-worker scripts. Do not pretend otherwise.

---

## Summary taxonomy

### Proven (observed live)
- Task-first ordering beats pack-first (3 traces: 2 fail, 1 success with 32 items).
- The codified 3-section contract assembles deterministically (byte-verified).
- Rung-1 ladder + closed loops: `ax-textbox` won live; the text-delta check **caught a real delivery stall** (760/4778 chars) and failed fast instead of typing into the void for 9 minutes.
- Atomic lease primitive on the Pig (New-Item create-or-fail).
- Byte-exact scp pull-back (every run); fail-closed validation (2 correct rejections).
- CDP recovery via watchdog + ensure-cdp.sh (kill tests x2).

### Assumed (no evidence yet)
- Meta respects OBJECTIVE/CONTEXT/OUTPUT-CONTRACT hierarchy (1/3 runs).
- The >=3 floor is sufficient signal per pass; Meta will not satisfice at 3 forever.
- No Chrome contention (true only while one worker exists).
- Initiator env vars are honest (no mechanism to lie *for* anything, but also no derivation).
- The gateway ClaimWorker respects `verification_status: 'unverified'` (**unconfirmed**; PING-side).
- Pack directives stay aligned with the contract (no enforcement).

### Fragile (can silently break)
- DOM selectors (mitigated by the ladder, not eliminated).
- Typing delivery / focus loss (1 observed stall; per-chunk recovery added, needs live re-verification — the b-run retest was aborted).
- Rotation crash window (confirmed; fix designed, not implemented).
- The sed extraction of validator constants (fail-closed, test-pinned; still regex).
- Single shared Chrome with no lease (fine today; a second worker breaks it).

### Missing (smallest actual primitives)
- VERIFIED state: no field, no writer.
- ACCEPTED_BY_PING: field exists, no positive writer.
- Rotation idempotency via ledger check (designed, not implemented).
- Network liveness cross-check for the completion gate (designed, deferred).
- Chrome lease (designed, primitive proven, deferred until a second worker or an observed collision).

### Redundant (can be removed or demoted)
- The pack's hardcoded CONTRACT prose duplicates the OUTPUT CONTRACT's authority. Keep as versioned evidence; authority explicitly demoted in-prompt. Do not delete.
- Pig-side `meta-answer-*.txt` after successful pull (retention already sweeps at 7d; refs marked transfer-only).
- The manifest's former "stable interface" claim (removed; now discovery-projection).

### Dangerous
- **`/orchestration/*`: 11 unauthenticated routes, confirmed live** (section 9). Unauthenticated mission injection, dispatch with disk writes, fabricated worker output with caller-chosen workerId, reputation poisoning, and an unbounded synchronous autonomous loop (event-loop DoS). Blast radius is confined to the Orca substrate: no Postgres, no PING pipeline, no code execution, no secrets, no repo writes. Minimal one-line fix exists using the current middleware; it buys authentication, not least privilege. **Awaiting Nolan's explicit approval.**
- Adjacent unauthenticated write surfaces observed but not traced (`/knowledge`, `/ai-workspace`, `/reviews`, `/customers`, `/projects`, `/tenants`, `/deployments`, `/runtime`, `/api/v1/ollama`, `/api/v1/repository`, `/mc`, `/ops`, `/governance`). Flagged, not concluded.
- The emit-to-claim auto-generation path with only the `unverified` flag as guard (PING-side; needs Nolan's confirmation, not our modification).

### Scalable
- Job envelope, run ledger, SSH transport, lease primitive, EXIT-trap pattern, `research_agent` field.
- Not yet scalable: the manifest as enforcement (it is an index); per-worker prompt/validation logic (correctly worker-local).

### Recommended (smallest next sequence)
1. **Nolan decisions:** approve/decline the `/orchestration/*` minimal fix (on section-9 handoff); confirm the ClaimWorker's handling of `unverified` observations; choose lease timing (now vs on second worker).
2. **Re-run the aborted live verification** of the fixed worker (b-new-business-radar): rung-1 + per-chunk recovery + codified contract, end to end.
3. **Rotation: derive next slug from the ledger** (existing files only) — newest `outcome: ok` brief_id's successor; rotation.txt becomes bootstrap cache. Closes the confirmed crash window; collapses two truths into one.
4. **Model the four PING states** explicitly (`knowledge_state`), writers limited to the human verification step and the emission step. No automation.
5. **Network liveness veto** only if rung telemetry shows the DOM completion gate failing. Not before.
6. **Do not build:** MCP, A2A, a second browser, a second database, a lease deployment, or any new authority. None have met their triggers.

---

*End of adversarial pass. The architecture is not declared finished. Open items: the aborted live re-verification, and Nolan's three decisions (orchestration auth fix, ClaimWorker/unverified confirmation, lease timing).*
