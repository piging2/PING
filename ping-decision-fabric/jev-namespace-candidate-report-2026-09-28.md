# JEV NAMESPACE GATEWAY CANDIDATE — LANE REPORT (2026-09-28)

Owner-authorized narrow fix. Live gateway NOT deployed, NOT modified.

## JEV OWNER PROVEN: YES (5/5)

1. **Intended producer namespace.** The deployed producer is the JevShadowWorker
   (`/home/nolan/workspace/jev-stage/shadow_worker.js`, `this._name = 'jev-shadow'`);
   its header documents one `JEV_DECISION_EVALUATED` record per claim through the
   canonical event mechanism. The live registry
   (`gateway/generated/event_registry.json`) holds exactly one
   `JEV_DECISION_EVALUATED` entry: `authority_owner: "JevShadowWorker"`,
   `event_class: "inference"`, `source: "production"`. Governance
   `_extractNamespace()` derives `jev` deterministically from the `JEV_` prefix.
   The live rejection `NAMESPACE_VIOLATION "No owner defined for namespace 'jev'"`
   proves the emission already passes the verdict gate with the genuine producer
   string; only the ownership map is missing. Owner value `PING`: every other
   constitutional namespace maps to `PING`; the worker is a PING worker; PING
   stays the authority, Jev a provider only.

2. **Exact event type.** `JEV_DECISION_EVALUATED`, exactly one of 235 registry
   events (`/home/nolan/workspace/jev-stage/typed_decision.js:26`).

3. **No other namespace owns the event.** One registry entry; namespace derived
   deterministically from the event-type prefix; full-registry snapshot
   (live vs candidate, 235 events) shows exactly one verdict change.

4. **External callers cannot acquire JEV authority by declaration.** POST /events
   (`/app/gateway/routes/events.js:113,136`) hardcodes
   `eventRuntime.emit(event_type, 'api', ...)`. `_assertVerdictAuthority`
   requires source exactly `jev-shadow` plus `mode:'shadow'` and an `evaluations`
   array, and runs BEFORE governance and before the `_skipGovernance` branch.
   The ownership namespace is derived from the event type, never from caller
   input. Proven by matrix: api source, lookalike source, and missing-provenance
   payloads all rejected with `verdict_not_authorized` / `verdict_provenance_missing`.

5. **Auth/governance ordering preserved.** Emit order is fixed in code:
   (1) deterministic id, (2) EventValidator type registration, (2b) verdict
   authority (unskippable), (3) governance (registration, owner match, canonical
   namespace format, namespace ownership), (4) persistence, (5) dispatch.
   The patch adds one key to `NAMESPACE_OWNERS`; it reorders, bypasses, and
   weakens nothing.

## PATCH (exact diff, one file)

File: `ping-runtime/events/event_governance.js` (in `NAMESPACE_OWNERS`):

```diff
   knowledge: 'PING',
   object: 'PING',
 
+  // JEV shadow-decision namespace (2026-09-28, owner-authorized narrow fix):
+  // the JevShadowWorker emits JEV_DECISION_EVALUATED through the canonical
+  // event mechanism. PING stays the authority; Jev remains a provider only.
+  // This registers ownership so the detector accepts the legitimate producer.
+  // It does NOT weaken validation: the verdict gate still requires
+  // source='jev-shadow' with shadow provenance, and POST /events still
+  // hardcodes source='api'.
+  jev: 'PING',
+
   // Business namespaces
```

## FILES

- Build source (pure): `/home/nolan/ping/worktrees/gw-jevcandidate-pure/event_governance.js`
  (+ `Dockerfile`: `FROM ping-gateway:repair-cert-20260924` + one `COPY`).
- Candidate image: `ping-gateway:jev-ns-pure-20260928` (live + exactly one layer;
  17 layers vs live 16; new layer contains only the patched file).
- Proving harness (used via stdin, not baked in): `/tmp/prove_jev_candidate.js`,
  `/tmp/snap.js` (sandbox copies).

## PROOF RESULTS (pure candidate, via real admission choke point)

- LEGITIMATE JEV: PASS (source `jev-shadow` + shadow provenance accepted)
- WRONG NAMESPACE: PASS (rejected `INVALID_NAMESPACE`)
- UNAUTHORIZED JEV: PASS (api source, lookalike source, missing provenance all rejected)
- EXISTING NAMESPACES: PASS (235/235 registry events: exactly one verdict change,
  `JEV_DECISION_EVALUATED` INVALID -> valid; claim/observation end-to-end emits unchanged)
- VERDICT AUTHORITY: PASS (existing `gateway/test_verdict_authority.js`: 34/34)
- SHADOW AUTHORITY: ZERO (`MayExecutePolicy.mayExecute()` hardcodes
  `{allowed:false, mode:'shadow', reason:'JEV_SHADOW_ONLY'}`; zero subscribers to
  `JEV_DECISION_EVALUATED`; no bridge mission mapping; terminal by construction)
- GATEWAY CANDIDATE: PASS
- LIVE GATEWAY: UNCHANGED (container `ping-gateway`, image
  `ping-gateway:repair-cert-20260924`, running; `/health` still reports
  `event_governance: degraded`; no redeploy, no file touched, no DB mutation)
- Secret scan of diff: clean.

## RETRY DEFECT: OPEN (separate, not fixed here)

Three scheduler missions (`402152d14539171b`, `70e962a9d257c6dc`,
`a5dc21a36107b0a5`) retry jev-shadow emissions on a fixed ~5s cadence. Each
attempt fails at the governance layer with `NAMESPACE_VIOLATION`, a
non-transient configuration rejection. Observed: ~360 failures per mission per
30 minutes (~1,080 total in live governance stats). A governance/configuration
rejection must not produce an infinite fixed-cadence hammer; needs backoff /
dead-letter. Recorded as a separate reached-path defect per owner order.
Do not pause or mutate the missions in this lane.

## CONTEXT PATCH: READY

Reached-loop table re-run (targeted, 2026-09-28 ~15:30 MDT):
- `:3100` healthy; canonical tree HEAD `0264d517` (same as table);
  MC dispatch route still has zero `compileAskContext` references (pre-patch).
- ContextPack branch `decision-fabric/contextpack-wire-2026-09-28`
  (`9a555021`) still isolated, unmerged.
- Live gateway unchanged; JEV candidate built but NOT deployed.
- The JEV namespace fix lives in the gateway event-governance subsystem; the
  MC dispatch loop's evidence-to-context edge is untouched.

UPDATED FIRST FAILED REACHED EDGE: **EVIDENCE -> MODEL CONTEXT** (unchanged).
The dispatch loop still mints params-only `context.json`; no evidence-bound
package is compiled before decision.

NEXT SMALLEST CONVERGENCE PATCH: merge `9a555021` (wire `compileAskContext()`
into MC dispatch) — the condition Nolan set is met. After merge, re-verify the
edge flips to PASS from a clean checkout before any further convergence work.

## MATERIAL FINDING (not a defect of this lane)

The gateway build-snapshot dirs (`/home/nolan/ping/worktrees/gw-repair-build`
and the 4 identical copies) contain Lane L tenant-isolation code in
`ping-runtime/events/unified_event_runtime.js` and `gateway/routes/events.js`
that the live `repair-cert-20260924` image does NOT have. The first candidate
built from the snapshot therefore shipped unpushed Lane L work silently; it
was discarded (`docker rmi`) and replaced by the pure live+one-layer candidate.
This corroborates the standing flag: the nine unpushed constitutional-runtime
commits (incl. Lane L) must be audited and landed/split before the next real
gateway build. The pure candidate is unaffected.

## JEV STATUS

- SHADOW EXECUTION: PROVEN
- AUTHORITY: ZERO
- QUALITY: INSUFFICIENT SAMPLE
- PROMOTION: NOT UNDER CONSIDERATION
