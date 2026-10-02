# Ask FYD Context Compiler — design

## Position in the sacred loop
ASK FYD sits between RENDERER/BROWSER and OWNER ACTION. The compiler is the
single gate through which graph state reaches any reasoner (concierge,
LLM, MCP consumer). It does not answer questions; it assembles the
visibility-bounded, evidence-bound, digest-identified packet a reasoner is
allowed to see. The model reasons over the packet, never over raw
canonical state.

## What the factory already owns (do not duplicate)
- src/fyd/ask/concierge.ts: deterministic answers to 7 canonical questions
  from the visible graph, claim grades SUPPORTED/DERIVED/INFERRED/UNKNOWN.
- src/fyd/owner-mode/visibility-policy.ts: per-fact public|hidden policy.
- src/fyd/ask/capabilities.ts: FORBIDDEN_AGENT_EFFECTS, agentGrants strip.
- src/lib/ping/ask-composer.ts: canonicalize (sha256-canonical-json-v1),
  bounded context, epistemic classification from provenance.
- ask-pipeline.ts: tenant-scoped, visitor=public-only, mode "owner" stubbed
  (grants nothing today), 3-class contract, tenant-mismatch refusal.

## What the compiler adds (the gap)
1. Viewer-scoped packets beyond public/visitor: owner/staff/agent tiers with
   real visibility rules (owner sees hidden facts flagged; agent gets
   capability-stripped grants). mode "owner" stops being a stub.
2. Question-aware relevance: deterministic intent-signal scoring, bounded
   selection, sort-stable output. buildAskContext takes relatedObjects
   wholesale; the compiler selects.
3. Packet discipline: every object content tagged DATA; consumer firewall
   rules embedded; explicit exclusion ledger; non-inference rule stated.
4. Claim-binding verification: verifyAnswerClaims rejects answers whose
   citations point outside the packet evidence registry (anti-smuggling).
5. Deterministic packet digest: same (question, graph state, viewer) ->
   same packetId. Nondeterminism belongs to the model, not the assembly.

## Security invariants (red-teamed)
- Visibility enforced at ASSEMBLY, never via prompt instructions
  (external prior art: ACL pre-filtering; post-filtering at the LLM is not
  access control).
- Missing visibility metadata on an object -> treated as private (fail closed).
- Dangling/foreign relationship endpoints -> excluded + ledgered (kills
  cross-tenant traversal).
- Absence is not evidence: exclusion ledger never carries values; the
  packet states the non-inference rule explicitly (kills existence leaks).
- Object content can never reach an instruction section of the packet
  (structural separation: instructions live in consumerRules, content in
  objects[] with contentRole DATA).
- Claim bindings are checked against the registry the viewer could see;
  smuggled evidence ids fail closed.
