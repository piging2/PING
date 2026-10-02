# LANE S — Business Capability Discovery

Status: PROVEN (spike green against the real Coppersmith fixture; 24/24 tests)

## Ledger
- RESEARCHED: 2026-09-23 — charter (OWNERSHIP.md): observation -> resolved capability ONLY after policy check.
- RESEARCHED: 2026-09-23 — PING ALREADY HAS (Pig, /home/nolan/projects/ping @ e48ef710, branch fyd-factory, read-only): portal Circle capability runtime (follow/like/ask/website, src/fyd/capabilities/runtime.ts); Ask FYD agent capability boundary (grant authority, fail-closed, src/fyd/ask/capabilities.ts, FORBIDDEN_AGENT_EFFECTS); ObjectCapability union on object views (view/ask/follow/like/call/email/website/directions/reference, src/fyd/object/types.ts); ContactMethod evidence-backed contact flow (phone/email, src/fyd/components/contact-link.tsx); owner.correct-fact capability gate (src/fyd/owner-mode/corrections.ts); FydGrant vocabulary (src/lib/ping/types.ts). NONE of these derive capabilities from observations; no discovery pipeline, no candidate->resolved lifecycle, no capability records in the graph. Lane S discovers + resolves; it does NOT create a second authority.
- RESEARCHED: 2026-09-23 — git history: contact-flow seam decision (2026-09-22: no tel:/mailto: outside the FYD contact flow), evidence-gated ask capability on object views, capability gating as a factory invariant.
- DESIGNED: 2026-09-23 — CAPABILITY-DISCOVERY-DESIGN.md (detector set over observations, POLICY GATE that must pass before candidate becomes resolved, capability record format, capability lifecycle incl. withdrawal with lineage).
- PUBLISHED: 2026-09-23 — CAPABILITY-RECORD-FORMAT.md: canonical record (id, description, owning object, required principal + scope, policy preconditions, effects, reversibility, cost, approval class), resolution rules R0-R4, TOCTOU execution guard, enumeration guard, lane-T projection table, lane-G compiler contract, declarative extension rule. This is the contract lanes T/G/I build against.
- RED-TEAMED: 2026-09-23 — capability spoofing via malicious/compromised site content; detector-path determinism (no LLM in detection); owner attestation outranks first-party observation; traversal bypass; TOCTOU; enumeration-as-harvesting; no-leak denials.
- SPIKED: 2026-09-23 — lane-s/spike (pure JS, zero deps): 6 detectors (phone/email/form/booking/newsletter/location) with a declarative registry (spike/detectors.registry.json), deterministic cap_id occurrence identity, 7-check fail-closed policy gate, principal resolution (R0-R4), executeGuard, queryCapabilities, reresolve (withdrawal + value-change owner review), lane-T status projection.
- TESTED: 2026-09-23 — node --test spike/detectors.test.js spike/resolution.test.js: 24/24 PASS, incl. PROOF-1..7 against the REAL Coppersmith fixture (read-only snapshot spike/fixtures/coppersmith-business.json from src/fyd/object/__tests__/fixtures/projections/coppersmith-plumbing.json @ e48ef710): phone + visit.in_person discovered from the fixture's fields + website-derived provenance, resolved through the gate.
- FIXED: 2026-09-23 — gate safety check rejected display-only capabilities (no URI to check): now passes when there is no URI to gate (visit.in_person). Found by real-fixture execution, fixed, re-verified green.
- FALSIFIED: nothing outstanding. A second capability authority was considered and rejected (lane S is the discovery/resolution layer; the authority stays PING's).

## Proof summary (for the parent orchestrator)
- Owner (controllerId identity_fyd_compiler_test): 4/4 capabilities granted (phone, directions, fact.correct, revenue-insights).
- Random visitor: phone + directions granted; owner-only denied (fact.correct names rule `visibility.owner`; revenue-insights denied generically, no leak).
- Unauthorized agent: public presentable capabilities granted; fact.correct DENIED with the exact rule: "Ask FYD agent boundary: 'business.mutate' is never agent-authorized." (FORBIDDEN_AGENT_EFFECTS).
- Withdrawal: phone observation removed -> status=withdrawn (lineage + gate decision retained), owner resolution no longer offers it, no stale capability.
- Red team: "we offer refunds" text -> no candidate; premium-rate number on third-party -> authorization fail; premium-rate number replacing the resolved number -> needs_review (owner review, never auto-resolve); business B's phone via relationship from A -> invisible (`capability.object-binding`); executeGuard refuses withdrawn/changed records at use time; cross-tenant kind queries refused (`enumeration.cross-tenant-denied`).

## Capability record format — published for lanes T/G/I
See CAPABILITY-REQUEST contract in CAPABILITY-RECORD-FORMAT.md (full field list + lane-T projection table + lane-G compiler contract). Lane T: your section-4 consumer contract is satisfied via the projection table in section 3 of that file; S kind strings pass through verbatim outside your listed union. Lane G: INTEGRATION-NOTE-lane-g.md carries the no-leak visibility semantics.

## Current position
Discovery -> gate -> principal resolution is proven end to end in the spike against a real factory fixture. Not wired into the PING repo (read-only rule; wiring is a factory-lane decision). The design + spike + tests are the handoff artifacts.

## NEXT
1. Factory-lane decision: where the capability registry JSONL lives and which factory stage emits candidates (design proposes stage 4 BUILD_GRAPH / stage 6 ATTEST_PROVENANCE).
2. Lane I: MCP tool eligibility consumes resolved-only records (contract in CAPABILITY-RECORD-FORMAT.md section 2).
3. Lane G: answer the open question in INTEGRATION-NOTE-lane-g.md (disclose owner-only existence generically? default: no).
4. Lane N: CapabilityRecord lineage joins the SOURCE->OBSERVATION->EVIDENCE->OBJECT chain (lineage.observationIds + detector already present).
5. Standing: no idle state — next gap after handoff is the connector-sourced capability path (capabilities discovered from connected-source observations, e.g. GBP messaging button via lane CONN).
