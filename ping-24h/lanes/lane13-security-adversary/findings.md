# LANE 13: Continuous Security Adversary — findings.md

Session: 258abc44-5384-43bc-b5ae-0b988ec90c0d | T+0 = 2026-09-28 14:26 MDT
Role: hostile red team, NO implementation, reproductions only. READ ONLY on all canonical trees.
Canonical tree: Pig WSL /home/nolan/projects/ping, HEAD 0264d517 (hardening: fail-closed vocabulary gate + SSRF effective-destination boundary), branch hardening/2026-09-28-vocab-ssrf. Uncommitted working-tree changes from the authorized patch lane (decision-fabric/contextpack-wire-2026-09-28) visible as `M` in git status; call site src/app/api/mc/dispatch/route.ts is OWNED AND LOCKED by that lane. Read only.

Prior state absorbed: one-reached-loop-report-2026-09-28.md (10 attacks with verdicts; attacks 1-8 PASS EXISTING, 9-10 MISSING).
Secret-rotation incident is CLOSED; do not re-litigate, test current state only.
Secret invariant: no secret values in this file, scripts, commands, or logs. Attacks needing real secrets are UNTESTED-WOULD-NEED-SECRET.

Verdict legend: PASS EXISTING (cite test/file) | FAIL (repro under repro/) | UNKNOWN (name missing evidence) | PARTIAL (cite exact gap)

---

## 2026-09-28 14:31 MDT — Session start + /HEALTH investigation (NAMESPACE_VIOLATION x963 / jev-shadow missions)

[entries below]

## 2026-09-28 14:35-15:10 MDT — JEV NAMESPACE_OWNERS fix: security assessment

Context: shadow-Jev seam lane CONFIRMED the live defect (gateway NAMESPACE_OWNERS
map has no jev entry; every JEV_DECISION_EVALUATED emission rejected as
NAMESPACE_VIOLATION; 3 scheduler missions 402152d14539171b, 70e962a9d257c6dc,
a5dc21a36107b0a5 in fail/retry, /health degraded). Parent verified the missing
key in the live container. Fix (register jev:'PING' + image rebuild, or pause
the 3 missions) HELD for owner authorization. This entry assesses the fix's
SECURITY implications only. I did not duplicate the diagnosis.

Method: read-only docker exec into ping-gateway (image
ping-gateway:repair-cert-20260924, restarted ~13:52 MDT per lane 9), then a
hermetic repro running the ACTUAL live-container modules
(UnifiedEventRuntime.emit + EventGovernance) with a fake pg pool, CURRENT vs
PATCHED (one-line map addition). Repro:
[repro/jev-fix-assessment.sh](repro/jev-fix-assessment.sh)

Emit path (verified in code):
1. deterministic event_id = sha256({eventType, source, [namespace], [logical_id|payload]})
2. registration check (eventValidator)
2b. verdict-class admission: source must equal VERDICT_PRODUCERS[eventType]
    (JEV_DECISION_EVALUATED -> 'jev-shadow') + provenance shape
    (mode==='shadow' && Array.isArray(evaluations)). Runs BEFORE the
    _skipGovernance branch: unskippable.
3. governance: UNREGISTERED_EVENT reject; OWNER_MISMATCH (only if the event
    declares authority_owner); canonical namespace core::/tenant:: check;
    _validateNamespace: NAMESPACE_OWNERS[prefix(event_type)] must exist.
4-6. persist (ON CONFLICT DO NOTHING + semantic-collision fail-closed) + dispatch.

Repro results (actual modules):
CURRENT: genuine jev-shadow emit -> REJECTED "No owner defined for namespace 'jev'".
  Forgery from source='api' -> REJECTED verdict_not_authorized.
  Forgery from source='classification' -> REJECTED verdict_not_authorized.
  Genuine source + bad shape -> REJECTED verdict_provenance_missing.
PATCHED: genuine -> EMITTED. source='api' -> still REJECTED (verdict gate
  survives). source='classification' -> still REJECTED. bad shape -> still
  REJECTED. _skipGovernance bridge attempt with source='repository_events' ->
  still REJECTED (verdict gate runs before the skip branch).
  In-process caller passing source='jev-shadow' + valid shape -> EMITTED.

Findings:
F1. The external HTTP seam (POST /events, gateway/routes/events.js:87) hardcodes
    source='api' in both branches. Registering jev opens NO new external
    forgery path: the verdict gate rejects source='api' for JEV_DECISION_EVALUATED
    before and after the fix. A tenant cannot forge JEV events.
F2. The residual forgery surface is in-process only: any code in the gateway
    process can call emit() with source='jev-shadow' + shape-valid payload and
    be accepted after the fix. The code comment claims "the string alone is not
    trust - the binding of string-to-execution-context at this choke point is",
    but _assertVerdictAuthority is a STRING COMPARISON; no mechanical binding
    exists. This is a pre-existing property of ALL verdict classes (replay,
    witness, lineage), not introduced by the jev fix. Mitigation in practice:
    all in-process code is the baked image, worker set fixed at bootstrap
    (gateway_runtime.js:541).
F3. The current rejection DOES provide real defense-in-depth: today even an
    in-process forger cannot persist a forged JEV verdict. Registration removes
    that blanket block, leaving source-string + shape as the only barriers.
    The value is real but incidental (it is a misconfiguration, not a designed
    control), and it currently also blocks the legitimate producer.
F4. Blast radius of a forged JEV event is bounded: JEV_DECISION_EVALUATED has no
    bridge mission mapping (terminal), no worker handlers subscribe to it; it
    would pollute ping_events (readable via GET /events/:stream) but drive no
    decision. Jev stays a shadow sensor, never an authority, per standing policy.
F5. Latent defect (not changed by the fix, noted): the OWNER_MISMATCH check in
    EventGovernance.validateEvent is DEAD at this choke point - emit() never
    passes authority_owner in the validated object, so a mismatch can never
    trigger. If owner semantics are ever meant to be enforced, that is a gap.
F6. The owner VALUE in the map is currently cosmetic: _validateNamespace checks
    key existence only. jev:'PING' vs jev:'JEV' changes nothing mechanically
    today; keep 'PING' for policy clarity or make the value enforced later.

VERDICT: FIX NEEDS GUARD.
Guards: (1) pin the verdict gate as the surviving control: re-run
gateway/test_verdict_authority.js (A5 covers the api-source rejection) against
the fixed image before/after deploy; (2) record that in-process source-string
spoofing is possible-by-design and the "execution-context binding" comment
overstates the mechanism - if the threat model ever includes untrusted
in-process code, verdict emission needs a real capability binding, not a
string; (3) optional: enforce the NAMESPACE_OWNERS value (not just key
existence) and revive the OWNER_MISMATCH check by passing authority_owner
through emit().

## 2026-09-28 15:10-15:35 MDT — Lane 11 T1/T2 verification (issue->invoke gap)

Claim (hypothesis from lane 11): mc.authorize_work_order/v1 re-runs at issue
time, BUT the issue->invoke boundary trusts the carried WorkOrder with no
redeem-time re-decide, and workOrderId is a deterministic ID, not a
kernel-derived fingerprint over (tool, identity, args, targets).
Verified read-only in /home/nolan/workspace/orca-adapter:

- authorizeWorkOrder at vendor/external_agent_adapter.js:185: 8 ordered
  fail-closed checks (known agent; blockedExternal+expiry; not PENDING_AUTH;
  capability in allowedCapabilities; namespace regex; constraints object;
  constraints tighten vs maxConstraints; no_canonical_events &&
  no_mission_state_writes). CONFIRMED.
- issueWorkOrder re-runs authorizeWorkOrder and throws on denial. CONFIRMED.
- workOrderId(taskId) = sha256('workorder:'+taskId).digest('hex').slice(0,16).
  Deterministic ID from taskId; carries NO fingerprint of tool/identity/args/
  targets. CONFIRMED.
- adapter.js dispatchExecution: step 2 authorize -> 2b tenant -> 2c reconcile
  gate -> step 3 issueWorkOrder -> buildWorkerPrompt(workOrder) ->
  invokeTransport(prompt, timeoutMs). No re-decide, no signature, no digest
  between issue and invoke. CONFIRMED as stated.
- BUT the WorkOrder never crosses a trust boundary in that gap: it is an
  in-memory object in the same process. Tampering there requires in-process
  code execution, at which point all bets are off regardless. Exploitability
  of the pure gap: LOW.
- The redeem-time check that DOES exist: verifyResultEnvelope binds the
  result to the issued work order: work_order_id + context_pack_id echo,
  workOrder.agent_id === invokedAgentId === result.agent_id (the adapter's
  own invocation record), capability echo, status/output/error shape,
  verifiedAt <= deadline. result_id = sha256('external-result:' +
  stableStringify(binding over work_order_id, mission_id, task_id, attempt,
  agent_id, capability, context_pack_id, namespace)). This is an ECHO check
  against the in-memory workOrder, not a re-decide. T2 GAP CONFIRMED as
  stated (no kernel-derived fingerprint, no TTL on the grant beyond
  deadline, no target re-measurement).
- Sharper adjacent residual (see envelope-framing entry): the prompt is the
  trust-boundary crossing, and envelope selection from stdout is
  attacker-influenceable.

VERDICT: T1 PARTIAL and T2 GAP CONFIRMED as code facts. Pure issue->invoke
tamper needs in-process execution (low value as an attack); the actionable
residual is the prompt/envelope boundary, not the in-memory handoff.

## 2026-09-28 15:35-16:00 MDT — Lane 5 donor findings vs PING (4 items)

Item 1 - Goated G-3 AUTHORITY BYPASS (worker self-reports completion via bare
--run-id, no process/nonce binding; worker promotes output to truth).
PING equivalent checked in orca-adapter:
- Result attribution is process-bound: dispatchHermes spawnSync captures the
  child process's stdout; extractEnvelope parses THAT stdout. Not a bare
  run-id assertion.
- verifyResultEnvelope echo-binds result to the issued in-memory work order
  (ids above) + invokedAgentId (adapter's own record of who it invoked).
  Cross-work-order result replay is rejected.
- recordVerifiedResult explicitly records effect_state 'effect_unknown':
  "worker self-report is a claim, not verification (O5)". Verified
  completions never render as clean success.
VERDICT: PING STRONGER than Goated on this axis. Residual: no nonce; the
worker sees work_order_id/context_pack_id in the prompt, so a
prompt-compromised worker can forge a fully-valid envelope. Defense is prompt
integrity (taskBrief/input from the trusted caller) + effect_unknown
semantics bounding the blast radius.

Item 2 - MatrixClaw per-adapter default postures (external children launched
bypass by ADAPTER DEFAULT: defaultApprovalPolicy="never",
defaultSandbox="danger-full-access", no authorization delta from native).
PING checked (AGENT_PROFILES in vendor/external_agent_adapter.js):
- Every profile carries restrictive maxConstraints {read_only: true,
  no_writes: true, no_network: true} + capability allowlists +
  hard-required no_canonical_events/no_mission_state_writes.
  authorizeWorkOrder enforces; constraints may only TIGHTEN.
- Unknown transport throws ("only 'hermes' is proven" at the adapter.js
  invoke site; profiles declare their own transports).
- No adapter grants bypass by default. The MatrixClaw flaw is ABSENT.
Residual: for hermes, enforcement is prompt-level + --safe-mode, not
OS-level (codex gets `codex exec -s read-only --ephemeral`, a hard OS
sandbox). The hermes profile comment says "Toolsets restricted per work
order" but also "The bridge NEVER passes toolset flags" - mechanical
toolset restriction for hermes is NOT evidenced in the adapter. UNKNOWN:
exact hermes tool surface vs prompt constraints (needs hermes-agent
evidence, out of scope for this lane tonight).

Item 3 - MatrixClaw Interrupt declared but unimplemented, error swallowed
(external_agent_execution.go:424). PING cancellation checked:
- No interrupt/cancel API exists in adapter.js at all. Cancellation =
  synchronous spawnSync timeout -> honest UNKNOWN ("dispatcher_timeout";
  "the worker may still be running"). No falsely-advertised capability,
  no swallowed error.
- Limitation (honest): no way to cancel an in-flight mission; a
  timeout-killed worker may keep running remotely (Pig-side hermes), which
  the UNKNOWN classification covers.
VERDICT: ABSENT, honestly so. Not a falsified claim. Recommend keeping it
that way: if a cancel API is ever added, it must assert real interrupt
acknowledgment or mark UNKNOWN-effect (the test lane 5 proposes).

Item 4 - MyAgens name-based worker selection ("auto" silently resolves to
native). PING selection checked:
- MC route: body.agent must be in SLICE_AGENTS (fixed allowlist:
  ['ollama','identity_1'..'identity_4']); no 'auto'. Tenant derived from
  x-mc-caller-key server-side registry; body tenant mismatch -> 403.
- Adapter re-gates: authorizeWorkOrder is final; identity_5..10 fence.
- Selection is caller-driven WITHIN the allowlist; the adapter decides
  grant/deny. The model never resolves a runtime name.
VERDICT: PING STRONGER than the MyAgens flaw. Residual: a compromised
caller key can dispatch to any allowlisted agent - that is the key's
intended authority, not a bypass.

## 2026-09-28 16:00-16:20 MDT — Lane 8 donor benchmarks (2 items)

Bench 1 - ShibaClaw per-iteration nonce-delimited tool-result framing
(fresh secrets.token_hex(8) per loop, closing-tag escaping,
injection-phrase sanitizer). PING tool-result ingestion checked
(adapter.js extractEnvelope):
- ABSENT. extractEnvelope takes the FIRST '{' in worker stdout and scans
  for the balanced close. No nonce, no delimiters, no framing.
- Compensating controls: (a) stdout is process-bound (spawned child's
  pipe); (b) verifyResultEnvelope echo-binds the parsed object to the
  issued work order - a wrongly-selected JSON blob fails closed to
  UNKNOWN/escalated, honestly.
- Residual (real): an attacker who influences the worker's stdout PREFIX
  (via prompt-injected task input) chooses WHICH balanced JSON object
  becomes the envelope; ids are in the prompt, so a fully-valid forged
  envelope is constructible by a prompt-compromised worker. First-brace
  selection is the weak link.
- Fix shape (donor-derived, for the owning lane): nonce-delimited framing
  per ShibaClaw, or cheaper: extract ALL candidate balanced objects and
  accept the first that passes verifyResultEnvelope instead of the first
  that parses. I write no implementation.
VERDICT: defense ABSENT; compensating echo-binding present; residual is
genuine but bounded by effect_unknown.

Bench 2 - ShibaClaw fingerprint-bound approve-once grants (SHA-256 of exact
schedule+payload, recomputed at execution, drift auto-voids). PING
approval/grant binding checked:
- FYD customize approve path: server-computed canonical payload digest
  (canonicalPayloadDigest, sha256 over canonicalized payload; client never
  supplies the digest); re-verified at execute; stale -> 409
  STALE_APPROVAL / idempotency_conflict. Base-state digest captured at
  derive time; state move between derive and execute trips STALE_APPROVAL
  instead of silently rebasing. This MATCHES the donor shape (drift
  auto-voids).
- VOLATILE_KEYS (proceduralize/patch.ts) excludes proposalDigest,
  createdAt, generatedAt, nonce from digest inputs: metadata only, not
  semantic content; the digest's self-exclusion avoids circularity. No
  hole evidenced.
- Gaps vs the ideal: approvals carry no TTL (a stale-but-unchanged
  approval executes arbitrarily late); no target re-measurement at
  execute time (matches lane 11 T2). MC dispatch-path approvals are
  digest-pinned per the loop report; the orca-adapter WorkOrder grant
  has a deadline but no approval TTL concept.
VERDICT: PING MATCHES the fingerprint-bound shape on the FYD approve path;
residuals are no-TTL and no-target-re-measurement.

## 2026-09-28 16:20-16:35 MDT — Lane 7 donor benchmarks (2 items, last input)

Bench NM-1 - Sentinel layered policy (fixed evaluation order:
deny -> rules -> overrides -> risk x mode -> taint-escalation -> warning
override; warnings never waved through) + task-scoped capability grants
bound to (tool,target), scopes once/task/session/24h/always, created only
by UI/policy, never by agents.
PING grant/capability evaluation checked (authorizeWorkOrder):
- Fixed deny-first evaluation order, 8 checks: known agent ->
  blockedExternal(+expiry) -> not PENDING_AUTH -> capability in
  allowedCapabilities -> namespace regex -> constraints object ->
  constraints tighten vs maxConstraints -> no_canonical_events &&
  no_mission_state_writes. Matches the layered-policy shape.
- Grants (WorkOrders) bind (agent_id, capability, namespace, constraints,
  task_id, mission_id, attempt, deadline, result_path); created ONLY by
  the adapter authority (issueWorkOrder); the worker never issues,
  broadens, or renews. Matches "created only by policy, never by agents".
- No explicit taint-escalation or warning-override layers; scopes are
  deadline+attempt+idempotency-key rather than once/task/session/24h.
  Delegation-chain monotonicity (MyAgens MA-1: authority can only stay
  equal or decrease down a delegation chain) is not stated as an
  invariant anywhere in the adapter.
VERDICT: shape MATCHED on order + grant provenance; taint model ABSENT;
recommend stating the MA-1 monotonicity invariant explicitly.

Bench Pi-3 - offered-set kernel gating (tool calls outside the
preparation-time offered set close with not_offered; hook identity
mutation blocked). PING tool-offer surface checked:
- Offered set exists at ADMISSION: allowedCapabilities per profile,
  enforced by authorizeWorkOrder at issue time. A capability outside the
  profile is DENY, never silent.
- No per-tool-call kernel gating DURING execution: hermes tool use is
  prompt-level; codex is OS-sandboxed. PING workers are subprocesses,
  not tool-loop agents, so there is no in-loop tool-call choke point to
  gate. "Hook identity mutation blocked" has no direct analog.
VERDICT: offered set enforced at admission; runtime per-call gating
ABSENT by architecture (subprocess workers). Not a hole in PING's model,
but the model should stay explicit: admission-time capability gating is
the WHOLE of the tool-offer enforcement for hermes.

## Runtime context notes (from lane 9, honored throughout)
- :3100 serves a STALE .next build (2026-09-27 21:00:32, ~17.5h old,
  predates HEAD). All verdicts above are CODE-LEVEL unless stated;
  runtime observations via :3100 are labeled stale.
- fyd-journal-gateway events.jsonl quiet ~18h (last write 2026-09-27
  20:44 MDT): absence of recent events is UNKNOWN, not evidence of
  absence. Not used as evidence above.
- ping-gateway container restarted ~13:52 MDT; image unchanged
  (repair-cert-20260924). Container reads above are of the live image.
- Nothing restarted, nothing written to any canonical tree, no commits,
  no pushes. Secret invariant honored: no secret values in this file or
  in repro/jev-fix-assessment.sh.

## 2026-09-28 14:38 MDT - ContextPack patch review (read-only, branch decision-fabric/contextpack-wire-2026-09-28, commit 9a555021)

Read-only review of the authorized patch lane's new dispatch-path code: `src/app/api/mc/_lib/mc-context-pack.ts` (new, 83 lines) plus the wiring in `src/app/api/mc/dispatch/route.ts` (36-line diff). Nothing modified; the locked route was not touched.

What the patch does: replaces the params-only context.json mint with `buildDispatchContextPacket()`, which reads the live tenant graph + journal evidence via `getFydTenantGraph()` and compiles it with the existing `compileAskContext()` (ask lane). Fail-closed: graph/compilation failure emits MC_RUN_FAILED and returns FAILED before the executor runs.

### Verdicts on the new code path

1. FAIL-CLOSED WIRING: PASS EXISTING. The try/catch around `buildDispatchContextPacket()` fails the mission before `runOllama`/`runBroker` execute. No executor run without a compiled pack.

2. TENANT SCOPING: PASS EXISTING. The graph is keyed to the server-validated `tenant` (SLICE_TENANTS allowlist, rejected otherwise). A dispatcher cannot key the read to another tenant. `getFydTenantGraph()` recomputes the fixture base digest and throws on mismatch (fyd-tenant-graph.ts:174-178), so the read path is digest-pinned.

3. VIEWER TIER: PASS EXISTING. `DISPATCH_VIEWER = { id: null, tier: 'agent', grants: [], delegatedTier: 'visitor' }` resolves through `resolveViewerScope` to tier `visitor` with `public-only` rules applied (context-compiler.ts:91-100). Forbidden agent effects are stripped at the compiler's agent check (G8). The packet carries public claims only; no owner-tier data reaches the dispatch artifact.

4. EXECUTOR ISOLATION: PASS EXISTING. The executor receives only the bounded `prompt` (runOllama/runBroker). The compiled packet is serialized to `context.json` under `/home/nolan/workspace/mission-control/artifacts/<missionId>/` and is NOT passed to the worker. The result envelope carries only `context_pack_id` (the id string), not the packet. The API success response likewise does not return the packet body. Therefore compiled graph claims, including UNTRUSTED-DATA-BOUNDARY source excerpts, do not flow into the worker prompt. The new prompt-injection surface through this path is effectively zero.

5. ERROR DETAIL LEAK: MINOR. The fail-closed path builds `context pack unavailable: ${String(e).slice(0,300)}` from the raw exception and places it in both the MC_RUN_FAILED journal payload and the HTTP response. Exception text from the reader layer can carry filesystem paths and fixture digest prefixes. Informational only; no credential material observed in the read path. Recommendation: map to typed error codes before emitting.

6. RETRACTION TOCTOU: NOTED, residual minor. The packet is a point-in-time compilation; evidence retracted between pack compilation and mission completion is not re-checked (the compiler test covers recompilation-after-retraction, not in-flight invalidation). Impact is bounded because the executor never consumes the packet; staleness affects only audit readers, and the packet carries graphDigest plus (per compiler contract) compiled_at for replay detection.

7. QUESTION = RAW PROMPT: NOTED. The attacker-supplied prompt is used as the compiler's relevance question over the live graph. The compiled output lands in the artifact, not back to the caller, so this is not an exfiltration oracle: the caller learns nothing beyond the mission response, and the packet is visitor-tier public-only.

### Attack-plan impact

- Attack 9 (evidence fabrication/retraction): the patch's test asserts retracted overlay claims recompile as UNKNOWN. This strengthens, not weakens, the retraction boundary for the dispatch artifact. The previously missing evidence-retraction-after-compilation coverage now has a test at the unit level.
- Attacks 15/16 (SSRF/vocabulary): the new path adds no new URL fetching and no new vocabulary surface; the compiler is a pure function over an already-loaded graph. No change to the 0264d517 hardening boundary.
- Attack 19 (event collision): the packet carries `context_pack_id: mc-ctx-<missionId>` (stable, pre-existing scheme) and the params envelope verbatim as metadata. No new collision domain; missionId includes a timestamp and prompt digest.
- The reader injection seam (`reader?` param) is test-only; the live path uses the default reader. No production caller passes it.

No FAIL findings. The patch is a net security improvement: it replaces an unauthenticated-by-construction params blob with a digest-pinned, tier-scoped, evidence-bound packet, while keeping the executor's input surface unchanged.
