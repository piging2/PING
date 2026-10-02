# Seam Hardening Examination: Muse / Pig Delegation Layer (2026-09-13)

Read-only examination. Nothing was modified, no Pig state changed, no repo
mutated, no commits, no container restarts. Seven parallel investigation
tracks examined Nolan's 8 flaws/risks against the new seam (job envelope +
`pig-capabilities.json` v1 + `runs.jsonl` joined on `run_id`) before it
hardens into architecture. Companion to the interop audit:
`~/workspace/tandem/interop-audit-2026-09-13.md`.

Anchoring traces: run 20260913-125900 (pack-first prompt, task appended) →
Meta answered the context pack conversationally, 0 numbered items, validator
exit 3. Run 20260913-191216 (task-first, pack as labeled reference) → Meta
answered the task: 32 numbered businesses, 18608 chars, validator exit 0,
ledger joined to the job envelope on run_id.

---

## Track 1: Manifest authority — documentation or authority?

**Verdict: documentation with testable seams, not authority — today.**

| Capability | Verdict | Key finding |
|---|---|---|
| research.ask (meta-ask.js) | TESTABLE | Exit codes 0/1/2/3 map exactly; poll budget fits "~15 min". Sloppiness: JSON claims "byte-exact answer text" but the capture is DOM innerText (lossy); byte-exactness only holds for the later scp pull. |
| research.context (build-context-pack.py) | TESTABLE | CLI, stdout-path/stderr-`PACK_VERSION=<sha1[:10]>` protocol, content-addressed cache, idempotent re-run all verified. Template prose stays human-authored. |
| artifact.write / artifact.read (pig-ssh.sh pig_scp) | TESTABLE (static) | Literally scp with pinned key/known_hosts/BatchMode. **Drift:** JSON "timeout: PIG_TIMEOUT (default 25s)" reads as a total-operation bound, but code sets only SSH `ConnectTimeout`; slow transfers can exceed 25s. Direction is usage convention, unenforced. |
| browser.status (ensure-cdp.sh) | TESTABLE (static) | Probe, recovery command, ~90s bound, exits 0/1 all match. **Gap:** JSON documents only exit 0. "Never touches Nolan's personal Chrome profile" spans the Pig-side scheduled task outside this repo — partially manual-only. |
| validation.run (validate-meta-answer.py) | TESTABLE | Thresholds, decode policy, exits 0/3/2, stdout format all match. **Drift:** JSON `inputs` lists only `out_path`/`raw_bytes`; real CLI takes four args — `slug` and `ts` missing. |
| retention.sweep (pig-retention.sh) | TESTABLE (static) | 7-day default, flags, dry-run gating, filter allowlist all match. **Ambiguity:** "never touches provenance-referenced files" needs scoping — Pig-side originals referenced in `runs.jsonl`'s `pig_answer` ARE deleted after 7 days (local copies remain). |
| job.record (meta-pass.sh EXIT trap) | TESTABLE, most drift | Exactly-once, append-only, truthful signal records verified against live ledger. **Drifts:** (a) JSON outcome list says "(ok/capture_failed/infra/signal)" but no `signal` outcome exists — signals record outcome `unknown` + classification `terminated_by_signal_TERM/INT`; (b) `"idempotent": true` is wrong for an append-only ledger (reruns append); true property is "exactly-once per invocation, append-only"; (c) JSON's `ledger_line` field list omits job_ref, mission_id, initiated_by, auth_ref, brief_id, research_agent, pack_version, timestamps, exit_code, ping_outcome, resume_note. |

**0 generatable, 8 testable, 0 manual-only** at the capability level — with
manual-only *fields* inside several entries (policy prose no generator can
derive). Recommendation: label the file explicitly as a discovery projection
(paste-ready `contract_status`/`contract_status_note` fields are specified in
the track notes: "DISCOVERY PROJECTION, NOT AUTHORITY… the scripts under
pig-fb/ and tandem/ are the sole authority"), delete the "stable interface"
description sentence, fix the three drifts, and land a cheap local
contract-test suite (static assertions + fixture batteries, no Pig, seconds).

---

## Track 2: research.ask as a real capability boundary

Run 125900 falsifies the delimiter sentence ("do not respond to this
material") as a load-bearing mechanism. Order plus the output contract holds.
The contract, ready to codify in meta-pass.sh:

- **SECTION 1 — OBJECTIVE (first, always).** Brief file verbatim,
  byte-identical. New structural element: an explicit dependency declaration
  naming which CONTEXT pack sections the objective binds to (Geography,
  Target) — all four briefs say "the geography above," false under task-first
  ordering.
- **SECTION 2 — CONTEXT (second, always).** Pack verbatim, byte-identical,
  inside a labeled boundary. Structural problem: the pack smuggles contract
  directives (`## Verification rules`, `## Output schema`, `## PING boundary`)
  — a second output authority beside the brief's "For each: … Numbered list."
  Codified decision: **Section 3 is the single authoritative restatement; on
  conflict, Section 3 wins.** Pack text stays verbatim (versioned source).
- **SECTION 3 — OUTPUT CONTRACT (third, always).** The validator contract in
  Meta-actionable terms, generated from the **same constants** the validator
  enforces: (1) numbered list ≥3 entries matching the enforced item shape
  (1–2 digits, `.`/`)`, whitespace, capital-led business name — plain-language
  ITEM_RE); (2) answer >1200 chars (MIN_ANSWER_CHARS); (3) no-invention rule;
  (4) per-item verification phrase + 2–3 closing sentences on uncertainty;
  (5) UNVERIFIED-external-research status. Excluded: strict UTF-8 decoding and
  the `'Ask Meta AI.'` chrome cut — transport properties Meta cannot act on.

Deterministic: section order, delimiter strings as named constants (not inline
`echo "===="` literals), verbatim bytes, output-contract numbers
single-sourced from `validate-meta-answer.py`. Prose carries only what
structure cannot.

**Three inconsistencies to resolve:** (1) three numbers for one requirement —
briefs say "Find 12…/10…", validator enforces ≥3, job envelope
`expected_output` says ">=3, >1200 chars" but is **never placed in Meta's
prompt** (delegator's contract and worker's contract are two different
documents today; Section 3 closes that); declare the validator floor the only
enforceable number. (2) "the geography above" — replaced by the structural
dependency statement. (3) Pack `## Output schema` vs brief `"For each:"` —
Section 3 declared tiebreaker.

---

## Track 3: Browser fallback ladder

**Current meta-ask.js** (~66 lines): CDP connect, fresh tab, `goto` + fixed 9s
sleep (only readiness gate). Input: single CSS strategy
`div[contenteditable="true"] || textarea`, no role/label/text; miss = exit 2.
Types in 400-char chunks into assumed focus (never verified), Enter to submit
(if meta.ai ever makes Enter a newline, the prompt sits unsent and polling
"happily succeeds" at waiting). Observation: `main.innerText` via evaluate,
36×15s polls; completion = 4 stable polls AND growth-beyond-prompt-echo
>600 chars. Exit 3 conflates "never sent" with "answer truncated".

**Ladder** (each rung: fixed action list, fixed health check, fixed
successor; no improvisation):

1. **Accessibility tree / semantic roles** — available today in
   playwright-core (`getByRole('textbox')`, AX tree via CDP). Survives class
   renames and React re-renders, the most common breakage mode. Cheapest rung.
2. **Stable user-facing text/labels** (`getByPlaceholder`, `getByLabel`,
   send-button lookup) — available today; independent failure mode from rung 1.
3. **DOM locators / structural selectors** — available today (partially used);
   fallback chain + `waitForSelector` + visibility checks; zero-new-dependency.
4. **CDP browser primitives** (DOM/Runtime/Input domains via
   `newCDPSession`) — available today; reaches shadow DOM, bypasses
   keyboard-layout issues; untyped and cryptic errors.
5. **Keyboard/focus navigation** (Tab-walk with `activeElement` checks,
   type-verification) — available today; input-agnostic; converts blind
   type-and-hope into a closed loop.
6. **Screenshot + visual grounding** — partially available: `page.screenshot()`
   is trivial, but the Pig-side Node worker has no grounding capability (the
   cloud `muse.visual_grounding` exists; shipping screenshots cloud-side adds
   a round trip and a new artifact path). Deep fallback only.
7. **OCR / coordinate fallback** — needs building (Tesseract or OCR API);
   strictly worse than grounding for interaction; only payoff is
   canvas-rendered text. Defer.
8. **Browser/network/application signals** (`waitForLoadState`, stop-button
   presence as completion signal, network quiescence, pageerror listening) —
   available today; an orthogonal *health layer* across all rungs, not a
   replacement step. The stop-regeneration control is the strongest completion
   signal available.
9. **Recovery / re-authentication** — infrastructure available (ensure-cdp.sh +
   watchdog); needs worker-level policy: one bounded recovery attempt, tab
   reload, one retry, then classified failure. Login-state probe before each
   pass; hard stop + human notification if logged out. **Never auto-re-login**
   — Nolan logs in manually, exactly like the Facebook arrangement.

**Progressive degradation design:** each rung returns
`{status: 'served'|'failed'|'skipped', evidence, rung_id}`; a static ordered
table, first `served` wins; the winning `rung_id` is recorded in the run
record so drift is visible (rung 1 stops serving for a week = schedule a
selector review). `skipped` (precondition unmet, e.g. no grounding endpoint)
is distinct from `failed`. Health checks per stage: input located → focused
(`activeElement`) → prompt delivered (text-delta ≥ 0.9× prompt length) →
submitted (stop control appears / composer clears within 20s — this fixes the
conflated exit 3: `NOT_SUBMITTED` vs `STREAM_STALLED` vs `STREAM_TRUNCATED`)
→ answer complete (stop control absent + text stable + growth gate).

**Recommended first step (~30 lines, one file, no new deps):** ordered
locator chain `getByRole('textbox')` → `getByPlaceholder` → current CSS
selectors; assert `activeElement` after click and text-delta after typing
(fail fast instead of typing into the void for 9 minutes); replace the 9s
sleep with `waitForLoadState` + wait-for-first-locator; print the winning
locator id on stdout so meta-pass.sh can log rung telemetry into runs.jsonl.

---

## Track 4: Outside-DOM signals

meta.ai streams answers over **POST to `/api/graphql/`** (GraphQL mutation,
incremental delivery), not a WebSocket.

| Channel | Observable today | Stability vs innerText |
|---|---|---|
| **CDP Network passive observer** (`Network.enable` on a per-page CDP session; filter POST `/api/graphql/` by timing + byte volume) | Yes | **More stable than innerText.** Depends on the API endpoint contract, not DOM/framework. Survives a full DOM rewrite. Breaks only on transport change. Yields request id, live byte progress (`dataReceived`), completion (`loadingFinished` = server closed the stream — ground truth, immune to the prompt-echo false-success bug), full body post-hoc via `getResponseBody`. ~50 lines. |
| Playwright `page.on('response')` | Yes | Same stability; zero raw CDP; body only at end (~15 lines). |
| Fetch-domain interception | Partial | **Less stable operationally** — pausing the response freezes the page's streaming UI; needs an envelope parser (unknown schema, one live trace to learn). Never primary. |
| MutationObserver via `Runtime.evaluate` | Yes | Same DOM dependence as innerText, but event-driven (no 15s polls), exact stall timing, no selectors needed. Strictly better mechanics, same fragility class. ~30 lines. |
| Accessibility-tree text (`getFullAXTree` StaticText concat) | Yes | More stable than innerText against DOM churn (rendered text, not markup); breaks on virtualization/ARIA changes; snapshot cost grows with page size. |
| Download/export artifact | No | meta.ai offers none. |
| Copy-button + clipboard | Partial | DOM-dependent + flaky permission grants; cute but fragile. |
| WebSocket frames | Yes, none observed | Contingency branch, ~5 lines marginal. |

**Completion, ranked:** (1) `Network.loadingFinished` on the identified
stream request — most stable signal available; (2) mutation quiescence
10–20s (confirms render caught up; network-done ≠ render-done); (3) AX
snapshot equality (expensive); (4) current growth heuristic — weakest, keep
as last resort.

**Recommended pairing:** keep `innerText` as primary capture (cheapest,
highest fidelity, proven) but rewire completion to
`loadingFinished` + mutation quiescence + growth heuristic last resort;
replace progress polls with `dataReceived` byte counts (free DOM-independent
liveness). Fallback chain: AX-tree text → fetch-intercept + envelope parser →
screenshot/OCR. **Confidence adjustment** recorded in the sidecar (new
advisory fields, no ledger schema change): `observation_channel`,
`completion_signal`, `confidence` (full/degraded/partial), `fallback_reason`.
`runs.jsonl` outcome stays ok/capture_failed; `degraded` suggests re-run or
eyeball before the verification gate; `partial` routes to the exit-3 path.
Output stays typed `unverified-external-research` regardless of channel.

---

## Track 5: Chrome concurrency lease

No demonstrated need for multiple Chrome profiles (would triple watchdog
complexity and break Nolan's single logged-in session — Facebook flags fresh
profiles). A mutual-exclusion lease covers the two CDP consumers (engage.js,
meta-ask.js).

- **Location/format:** `C:/Users/nolan/.local/share/pigi/fb-engage/lease/browser-lease.json`
  (lease_id, run_id, job_type, holder, allowed_ops [documentary — CDP has no
  per-client ACLs], acquired_at, last_heartbeat_at, expires_at,
  nonrenewable_after, heartbeat_interval_s=60, lease_ttl_s=300,
  max_duration_s per job_type [engagement 4h, meta_research 90min],
  released/released_at) + append-only `lease-log.jsonl` (30d retention).
  All timestamps Pig `[DateTime]::UtcNow`; cloud clocks never trusted.
- **Acquire:** atomic via `[System.IO.File]::Open(CreateNew)` in one
  PowerShell invocation over one SSH session — exactly one of two racing
  sessions wins; loser gets `LEASE_HELD_BY_OTHER`, waits with 60s+jitter
  re-probe, gives up after 30 min → infra exit. Order becomes:
  acquire → ensure-cdp → launch worker → release (ensure-cdp moves inside the
  lease so its on-demand Chrome restart serializes).
- **Heartbeat:** owned by the Pig-side worker (liveness sits next to the CDP
  user), every 60s: verify lease_id match + `released == false`, refresh
  timestamps. Foreign lease_id or `released == true` → halt CDP immediately
  (split-brain guard). Past `nonrenewable_after` → heartbeat refused → wind
  down, write partials, release.
- **Timeout/recovery:** expiry is a computed predicate on Pig clock
  (stale heartbeat OR duration cap OR corrupt-past-grace). Dead holder →
  silence → reclaimable ≤300s. Stuck-but-alive → duration cap → self-abort.
  Conditional takeover with post-write re-read; loser aborts.
- **Release:** conditional tombstone (`released: true`, kept 24h, then FREE);
  worker `finally`-block primary, wrapper-after-observed-death secondary.
  **Wrapper must NEVER release on SSH drop alone** — detached workers keep
  heartbeating and the lease correctly stays HELD.
- **State machine:** FREE → HELD (atomic create) → HELD (heartbeat) →
  RELEASED (tombstone) → FREE (24h); HELD → EXPIRED by clock predicate →
  HELD by conditional takeover.
- **Watchdog/lease separation (hard):** watchdog owns process recovery only
  (chrome.exe existence, CDP responsiveness, relaunch, its log) — never
  reads/writes lease files, never kills or prioritizes workers, never holds a
  lease. Lease owns job arbitration only — never restarts Chrome or judges
  CDP health. Boundary cases: watchdog restarting Chrome mid-lease is legal;
  the holder keeps heartbeating (file I/O), re-attaches with backoff,
  re-verifies the lease, resumes. Holder alive + CDP wedged → lease stays
  HELD; the holder's own error handling decides. On-demand recovery
  (ensure-cdp.sh → schtasks) may run only by the current lease holder.

---

## Track 6: PING gate states

| # | Nolan's state | Sidecar exact values | Ledger exact values |
|---|---|---|---|
| 1 | Meta produced research (presence-validated, unverified) | `status: answer_captured`, `verification: pending`, `ping_ingestion: pending` | `outcome: ok`, `classification: answer_captured`, `validation.status: passed`, `ping_refs: []`, `ping_outcome: none`, `last_verified_state: answer_captured_unverified` |
| 2 | Research validated (engine verified each business) | **No representation.** Census: 1 answer_captured, 6 capture_failed, 3 requested, 1 started; no `status: verified` in use. | **No representation.** No row carries a post-presence validation result. |
| 3 | Observation accepted (gateway took the event) | No field. | `ping_refs: []` in all rows — slot exists, no writer ever populates it. |
| 4 | PING mutation authorized | No field. | `ping_outcome: none` in all rows — no code path writes any other value. |

Terminal failures ARE well represented (capture_failed → verification failed /
ping not_attempted; infra → both not_attempted).

**Gaps:**
- **G1:** "Engine verified, not yet emitted" is unrepresentable. `last_verified_state`
  is write-once, derived from pass outcome only.
- **G2:** "Observation accepted but emission failed" is unrepresentable — a
  failed POST has no home except prose logs.
- **G3:** The post-verification sidecar write path exists only as cron-doc
  prose ("update the sidecar: status verified/failed…"); zero code implements
  it. Worse, it contradicts DELEGATION-ARCHITECTURE.md:135 ("Verification
  updates verification_status via a follow-up event, never by editing the
  original"). Surfaced, not resolved — needs Nolan's call on which doc wins.
- **G4:** The ledger is append-only ("never rewritten"), so post-pass
  transitions have no home: not the ledger (immutable), not the sidecar
  (forbidden to edit), not a follow-up event (specified in prose, never built).
- **G5:** Degenerate historical row (`20260913-125602-bogus-slug-xyz`:
  `outcome: unknown`, `exit_code: 0`, sidecar `started` with permanent
  `pending`) violates the exactly-one-terminal-record invariant.
- **G6:** `ping_refs`/`ping_outcome` assert a permanent negative — populated
  at pass time, never updated, so "not yet attempted" is indistinguishable
  from "attempted and recorded elsewhere."

---

## Track 7: /orchestration/* auth trace — TOP PRIORITY

**Route inventory** (all mounted at `gateway/bootstrap/gateway_runtime.js:872`
via `createOrchestrationRoutes(engine)`; engine = Orca ExecutionEngine):

| Route | Auth | Operation | Execution effect |
|---|---|---|---|
| POST /missions | NONE | push mission record | Injects arbitrary mission (type/target/priority/metadata/files, caller-controlled) into the engine's in-memory queue |
| GET /missions, GET /missions/:id, GET /workers, GET /engine, GET /engine/report | NONE | reads | Read-only state exposure |
| POST /missions/:id/dispatch | NONE | `engine.dispatchToAssignment` | Mission → processing; **writes a prompt-artifact JSON file** to the container's `artifact_store/` |
| POST /missions/:id/output | NONE | `engine.collectWorkerOutput` | **Most consequential.** Caller-chosen workerId + arbitrary findings → proposal artifact persisted to disk, per-worker quality/confidence stats poisoned under attacker-chosen ids, consensus evaluation → mission completed/failed with artifact persisted |
| POST /engine/compile | NONE | `engine.compileMissions` | In-memory mission compilation |
| POST /engine/loop | NONE | `engine.startAutonomousLoop` | Compile → dispatch → collectWorkerOutput with **fabricated outputs** (`bypass_type: 'auto_scan'`, confidence 0.85 hardcoded) → mass-resolves missions with fake consensus, artifact files to disk |
| POST /engine/git-diff | NONE | `engine.emitGitDiff` | String parsing only; pushes missions. Does NOT run git or touch the tree |

The mount at line 872 is the only secured-prefix mount missing
`services.exteriorAuthMiddleware.middleware()` as second argument
(compare lines 762/766/770/887/890/892). The comment at 883–886 documents why
mission injection must sit behind the same boundary; `/orchestration` missed it.

**Blast radius (precise):** full integrity compromise of the Orca engine
state — arbitrary mission injection, dispatch, fabricated worker outputs and
consensus decisions, poisoned per-worker reputation stats, artifact files
persisted to container disk (survive restarts; `_load` reloads up to 5000 on
init; disk-fill possible, one file per call, no rate limit). Audit path:
container stdout only. **Cannot:** spawn processes, touch the repo, reach
Postgres (no path from the engine to `ping_events`/`capability_requests` —
verified by code trace), access secrets, run Ollama inference (discovery
disabled, `executor: null`), or reach the live production spine
(`AIRuntime`/`WorkerRuntime.dispatch` are separate services). The engine is a
sandboxed, parallel, intentionally non-production authority — blast radius is
real but confined to its own in-memory state + artifact directory.

**Minimal fix proposal (for Nolan's explicit approval) — one line, existing
authority model, no new layer:**
`curious-squid/gateway/bootstrap/gateway_runtime.js:872`, replace
`this._app.use('/orchestration', createOrchestrationRoutes(services.executionEngine));`
with
`this._app.use('/orchestration', services.exteriorAuthMiddleware.middleware(), createOrchestrationRoutes(services.executionEngine));`
— byte-for-byte the pattern at 762/766/770/887/890/892. `middleware()`
returns 401 without a valid Bearer credential. All 11 routes covered at the
mount; no per-route changes. Per-route level: any active L1/L2 Bearer identity
is sufficient — no route anywhere on the gateway does per-route capability
checks, so adding `orchestration.read/write` profile capabilities would be a
*new* enforcement pattern, not the existing one. **Internal-caller inventory:
nobody.** Full-worktree grep, `~/workspace` scripts/crons, Pig-side agent
dirs — zero callers; the route file's "Desktop agents submit missions here"
consumer does not exist. Adding Bearer auth breaks zero production callers.
Requires container rebuild + restart to take effect. Audit gap remains
(orchestration calls never hit `capability_requests`/`ping_events`; noted,
out of scope for this fix).

**Same unauthenticated-write pattern found on other prefixes (flagged, need
their own traces before any fix — strictly worse than /orchestration,
PG-backed or repo-touching):** `/knowledge` (POST /nodes, POST /edges →
PG-backed KnowledgeGraph writes), `/tenants`, `/deployments`, `/runtime`
(full unauthenticated CRUD incl. rollback/delete), `/api/v1/ollama`
(POST /chat, POST /autocomplete → unauthenticated local inference),
`/api/v1/repository` (POST/DELETE objects), `/ai-workspace`, `/reviews`,
`/customers`, `/projects` (legacy HPP write families, services initialized).
Confirmed GET-only/read-only (no action): /health, /ops, /governance,
/constitution, /context, /system, /mc GETs, /capabilities/stats,
/capabilities/health.

**What was NOT done:** no file modified anywhere; no commits, restarts, or
container changes; no POST/PUT/DELETE sent (only GET-only unauthenticated
probes: `GET /orchestration/engine` → 200 confirmed); Bearer tokens never
resolved; POST routes not exercised against live (code trace sufficient).

---

## Track 8: MCP second look — still NOT YET

Spec re-verified against https://modelcontextprotocol.io/specification
(2026-07-28 revision): initialize handshake removed (SEP-2575, replaced by
per-request `_meta` + required `server/discover`); stateless Streamable HTTP
confirmed; official Tasks extension real (`io.modelcontextprotocol/tasks` —
async execution, polling, mid-flight input, durable handles); `traceparent`
in `_meta` confirmed (SEP-414); tools/resources/prompts + JSON Schema 2020-12
+ safety annotations confirmed. New since the first audit: **Skills-over-MCP**
extension (distributing agent-workflow instructions through MCP) and the
`server/discover` MUST — which validates our approach (`pig-capabilities.json`
is already our `discover`). Most favorable spec fact: **stdio servers SHOULD
NOT follow the OAuth spec and should take credentials from the environment**
— making stdio-over-SSH the designated low-ceremony topology *when* a trigger
fires. It does not move the trigger earlier.

**Sit/replace/untouched map:** the server would sit on the Pig as a stdio MCP
server wrapping the existing scripts, invoked over the existing SSH channel
(stdio is a subprocess protocol; over SSH it inherits channel auth with zero
new auth machinery — strictly better than Streamable HTTP, which would demand
an OAuth authorization server that does not exist). It would REPLACE
`pig-capabilities.json` as the discovery contract (`tools/list` + JSON
Schemas + annotations) and the two bespoke SSH invocation dialects the audit
caught (engage.js path, meta-ask.js path). It would NEVER touch: the scripts
themselves (MCP wraps, never rewrites), `runs.jsonl` (the protocol has no
immutable-audit primitive; Tasks are ephemeral handles, not evidence), the job
envelope (no "delegation request record" primitive — no answer to "why did
this run exist" joinable on `job_id == run_id`), the gateway's bespoke REST
(different plane; surgery on a live auth boundary with known holes), Meta's
prompt-text interface (any proposal routing MCP *toward* Meta repeats the
rejected framing), or the auth substrate (SSH key + Pig-local Bearer
resolution).

**Long-job fit:** MCP Tasks is a *state-handle* protocol, not an *evidence*
protocol. It fits 10–15 min research jobs syntactically (call-now/fetch-later,
progress notifications) and is the only sane shape for multi-hour engagement
passes — but handle durability is server-implementation-dependent (a Pig
reboot orphans a task unless we build a durable task store: a new database by
another name), and Tasks makes accidental concurrent invocation *easier*
(three `research.ask` calls, one CDP session — the unmanaged-concurrency FLAG
bites harder under MCP; it would demand a server-side mutex we don't have).

**Auth mapping:** stdio path transparent (inherits SSH; MCP adds nothing).
HTTP path demands OAuth 2.1 resource server + RFC 9728 metadata + an
authorization server — inventing a credential-issuing authority for exactly
two principals that already authenticate fine. The existing model (SSH key
for transport, Bearer profiles for the gateway, keys never leaving the Pig)
is already the right shape.

**NOT-YET trigger (falsifiable, any one fires it):** (1) second genuinely
different, externally-maintained worker needing runtime discovery (same
standing condition as deferred `RESEARCH_TASK_ASSIGNED`); (2) third bespoke
SSH invocation protocol invented in `~/workspace/pig-fb/` (today: 7
capabilities, 2 dialects); (3) named external MCP-compatible client requests
Pig access; (4) documented incident where a blocked worker's mid-flight state
was needed by a different process after client death (bar deliberately high —
the ledger file survives client death today); (5) Skills-over-MCP stabilizes
AND a concrete external agent should consume procedures through it.
**Anti-triggers:** single orchestrator/worker forever; scripts-behind-SSH
substrate (nested process boundaries); no OAuth AS operator; any Meta-facing
proposal; gateway-plane placement; evidence-grade continuity needs (the
protocol cannot express the ledger).

---

## Recommended implementation order

**1. `/orchestration/*` auth fix — PROPOSE-FIRST.**
The one-line proposal is precise and ready, but it touches the live gateway's
auth boundary and needs a container rebuild + restart. Nothing here proceeds
without Nolan's explicit approval. In the same decision, open dedicated
read-only traces for the other unauthenticated-write prefixes
(`/knowledge`, `/tenants`, `/deployments`, `/runtime`, `/api/v1/ollama`,
`/api/v1/repository`, `/ai-workspace`, `/reviews`, `/customers`,
`/projects`) — they are strictly worse than `/orchestration` and must be
traced handler-by-handler before any fix is proposed. Also: at implementation
time, consider cleaning the live container's `artifact_store/` (fabricated
artifacts reload on restart).

**2. `research.ask` contract codification — IMPLEMENT-NOW.**
Cloud-side, reversible, trace-proven (125900 falsifies the old shape, 191216
validates the new). Scope: three-section assembly with named delimiter
constants in meta-pass.sh; brief verbatim; pack verbatim; output contract
generated from the validator's constants (single-sourced); fix the briefs'
"the geography above" dangling reference with the structural dependency
statement; declare the validator floor (≥3 items, >1200 chars) the only
enforceable number and demote the briefs' 10/12 to aspiration; declare
Section 3 the tiebreaker over pack `## Output schema`. No new
infrastructure, no Pig changes, no protocol additions.

**3. Fallback ladder rung 1 — IMPLEMENT-NOW.**
~30 lines in the cloud copy of meta-ask.js (deployed via the normal per-run
scp): ordered locator chain `getByRole('textbox')` → `getByPlaceholder` →
current CSS selectors; `activeElement` assertion after click; text-delta
assertion after typing (fail fast, never type into the void for 9 minutes);
replace the fixed 9s sleep with `waitForLoadState` + wait-for-first-locator;
print the winning locator id on stdout so meta-pass.sh logs rung telemetry
into runs.jsonl. Converts the two most likely silent failures into loud fast
ones and buys drift telemetry for every deeper rung. Rungs 4–9 stay designed,
unbuilt, until the telemetry justifies them.

**4. Chrome concurrency lease — PROPOSE-FIRST.**
The design is complete and precise (atomic CreateNew, worker-owned
heartbeats, TTL-vs-duration-cap, tombstones, hard watchdog/lease separation),
but it creates new Pig-side state and reorders both worker wrappers for a
collision that is currently a future risk, not a demonstrated need. Implement
on Nolan's word; until then the two schedules (8h / 6h) make overlap
infrequent and the failure mode is a noisy infra exit, not silent corruption.

**Also implement-now (small, from Track 1):** the manifest contract tests
plus the three drift corrections and the discovery-projection label —
cloud-side, seconds to run, catches real drift already present.

**Explicitly not now:** MCP (triggers defined, none fired); the gate-state
follow-up-event mechanism (blocked on Nolan's G3 decision: cron doc says edit
the sidecar, DELEGATION-ARCHITECTURE.md forbids it — pick one before building
anything); any new auth layer anywhere (the orchestration fix reuses the
existing middleware or it doesn't happen).

---

## Appendix: read-only compliance

All seven tracks ran read-only. No script, file, repo, or Pig state was
modified; no commits; no container restarts; no POST/PUT/DELETE requests to
the gateway (only GET-only unauthenticated probes on Track 7). The only file
written in this examination is this report. All live-Pig inspection was
passive file reads and GET probes; Bearer tokens were never resolved, stored,
or reported.
