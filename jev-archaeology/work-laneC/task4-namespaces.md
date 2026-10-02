# LANE C — TASK 4: NAMESPACES (read-only factual classification)

Date: 2026-09-22. Repo /home/nolan/ping @ cc6856c3b. NO behavior-changing conclusions drawn or proposed.

## Two distinct namespace systems (factual)

### System A — Ownership namespaces (event-type prefix)
- Policy: `NAMESPACE_OWNERS` in `ping-runtime/events/event_governance.js:11-76` (exported, line 256).
- Namespace derivation: `EventGovernance._extractNamespace(eventType)` (lines 139-149): first token before
  `.` or `_`, lowercased. NOTE: hyphenated prefixes are NOT split — `rule-engine` and `constitutional-ir`
  stay hyphenated.
- 58 namespaces derived from 234 registered events (`gateway/generated/event_registry.json`, regen 2026-09-21).
- Owners declared: `PING` (platform: artifact, claim, observation, projection, replay, witness, lineage,
  agent, worker, tenant, deployment, runtime, capability, workflow, context, system, event, hash, identity,
  proof, scheduler, diagnostic, consensus, merge, mission, governance, ownership, query, repair, rule,
  evidence, execution, constitutional_ir, canonical_hash, canonical_identity, classification,
  recommendation, citation, entity, relationship, topic, repository, file, snippet, ai, candidate,
  commit, compiler, hashing, prompt, git, knowledge, object, document);
  `HPP` (business: customer, review, lead, estimate, invoice, project, email, sms, google, github);
  `FYD` (fyd — added 2026-09-21 for site projections/owner overlays).
- Enforcement: `validateEvent()` (lines 151-186) rejects UNREGISTERED_EVENT, OWNER_MISMATCH, and —
  via `_validateNamespace` (lines 189-198) — any namespace with no owner entry ("No owner defined for
  namespace 'X'") or literal 'unknown' ("Cannot determine namespace"). `expectedOwner` falls back to
  'UNKNOWN' in the policy map (line 118) but validation still rejects at emit time.
- Route surface: `gateway/routes/governance.js` — 7 GET routes (/policy, /policy/:eventType, /namespaces,
  /namespaces/:namespace, /violations, /stats, /validate/:eventType); singleton constructed once at
  `gateway/bootstrap/gateway_runtime.js:224`.
- Missing-owner relationships: see "five unknown" below.

### System B — Canonical privacy namespaces (core:: / tenant::)
- Validation: `_validateCanonicalNamespace` (event_governance.js lines 200-211): regex
  `/^(core|tenant)::[a-zA-Z0-9_-]+$/`; `undefined`/`null` passes (optional field).
- Choke point: `ping-runtime/events/unified_event_runtime.js` `emit()` step 3 (per comment at line ~175).
- Defaults: `ping-runtime/canonicalization/canonicalization_service.js:29` `DEFAULT_NAMESPACE = 'core::owner'`;
  per-source map option (e.g. `{ 'review-authority': 'tenant::hpp' }`); invalid → throws
  "Invalid namespace ... (must be core::<name> or tenant::<id>)".
- Live producers of `tenant::hpp`: `gateway/bootstrap/gateway_runtime.js:445-454` (business sources default
  to `tenant::hpp`: review-authority, customer-authority, project-authority, email-connector, sms-connector).
- `core::system` default "is owned by UnifiedEventRuntime.emit() only"
  (ping-runtime/workers/intelligence_worker.js:29); privacy boundary core::system/core::owner/tenant::<id>
  "survives the full worker chain down to projection and knowledge graph" (canonical_workers.js:36-37).
- Test references: ping-runtime/evidence/test_evidence_authority.js uses core::owner and tenant::hpp.
- Related UNMERGED work: branch `feature/namespace-entitlements` ("per-principal namespace entitlements
  with fail-closed authorization", 49d25df31) is NOT an ancestor of HEAD — side effort, not in force.

## The "five / thirteen unknown namespace" situation (evidence)

- 2026-09-04 governance audit (recorded in AGENTS.md:3696-3708): ran the real `_extractNamespace` over
  233 event types → **13** NAMESPACE_OWNERS-undefined namespaces: rule-engine 8, hashing 8,
  constitutional-ir 9, diagnostics 7, commit 2, graph 2, object 3, compiler 3, parsing 2, candidate 1,
  knowledge 1, prompt 1, git 1 (+ `unknown` fallback, REJECTED). Classification doc
  GOVERNANCE_AUDIT_PHASE_C_CLASSIFICATION.md (now absent from tree): LIVE 8 / DORMANT 3 / DELEGATED 2.
- CURRENT state (re-ran the same algorithm live today): 234 events → 58 namespaces → **5 undefined**:
  1. `constitutional-ir` — 9 events; registry owner `ConstitutionalIRAuthority`; sources intent+authority;
     classes inference/system. NO implementation class exists; zero code emitters (quoted-literal grep empty).
     Intent manifest `intents/constitutional-ir/intent-manifest.yaml` (status: ratified) declares the intent
     and claims ownership of runtime/kernel/replay/ + runtime/kernel/identity/ — the kernel exists and is
     live, but the `constitutional-ir.*` event types are never emitted. Producer status: INTENT-ONLY.
  2. `diagnostics` — 7 events; registry owner `DiagnosticAuthority`; sources authority+intent. No class, no
     emitters. Producer status: INTENT-ONLY.
  3. `graph` — 2 events; registry owner `(commodity — delegated)`; source intent. Producer: DELEGATED
     (no in-repo implementation by design).
  4. `parsing` — 2 events; registry owner `(delegated to Tree-sitter)`; source intent. Producer: DELEGATED.
  5. `rule-engine` — 8 events; registry owner `RuleAuthority`; sources authority+intent. No class, no
     emitters. Producer status: INTENT-ONLY.
- Registry generation: `gateway/generated/event_generator.js` ("P024: Compiler generates event_registry.json
  from authorities and intents"; inputs `authorities/registry.yaml` + `intents/*/intent-manifest.yaml`),
  so these 5 namespaces' events enter the registry from intent manifests without any runtime producer.
- No code consumer subscribes to these event types either (canonical_workers.js / unified_event_runtime.js
  grep clean for the prefixes). The audit's recommended "classify producers live vs dormant" step maps to:
  3 intent-only (constitutional-ir, diagnostics, rule-engine) + 2 delegated (graph, parsing) — consistent
  with the audit's DORMANT 3 / DELEGATED 2 shape, though the audit doc itself is no longer in the tree.
- Hyphen mismatch (audit finding, still true): map holds `constitutional_ir` (underscore) but events use
  `constitutional-ir` (hyphen); `_extractNamespace` does not split hyphens, so the entry never matches.
  `rule-engine` has no map entry at all.

## Dead vs live producers (System A, summary)
- LIVE: PING-owned platform namespaces — emitted through UnifiedEventRuntime.emit() by gateway workers/
  authorities (e.g. artifact, observation, mission, worker lifecycles); HPP-owned business namespaces —
  connectors (email/sms/google/github) and project authorities; `fyd` — FYD_SITE_OVERLAY registered
  2026-09-21 (emitted by tools/fyd-site-projection/emit-overlay.py).
- DEAD/ABSENT: the 5 undefined namespaces above — declared in registry via intents, zero runtime emitters,
  zero subscribers. (Audit-time LIVE 8 of the 13 were later added to the map: hashing, commit, object,
  compiler, candidate, knowledge, prompt, git — all now PING-owned.)

## Evidence contradicting this conclusion
- Producer search used quoted event-type literals (`diagnostics.completed` etc.); a producer building event
  types dynamically (string concatenation) would not match. The registry `source` field (intent/authority,
  never a code module) and the absence of implementation classes bound the residual risk.
- The 2026-09-04 audit counted 13; I count 5 today — reconciled by map additions since (hashing,
  constitutional_ir[underscore], commit, object, compiler, candidate, knowledge, prompt, git). The
  GOVERNANCE_AUDIT_PHASE_C_CLASSIFICATION.md file itself is gone from the tree (was untracked); the
  LIVE 8/DORMANT 3/DELEGATED 2 figures come from AGENTS.md's record of it.
