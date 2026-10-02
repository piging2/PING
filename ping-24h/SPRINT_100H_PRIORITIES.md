# 100-HOUR SPRINT: TOP 30 PRIORITIES

Evidence-ranked and execution-ready. Not a feature backlog: each item names
the evidence that put it here and the concrete done-state. Ordered within
each category by leverage. Items marked IN FLIGHT have agents working now;
their verdicts land before the sprint clock starts.

## P0 PROOF BLOCKERS (the sprint means nothing without these)

### P1. Phase 1 approval door: 17/17 on both checkouts, byte-identical replay, lane frozen. [DONE 2026-09-28]
- EVIDENCE: was 16/17 on both checkouts; the only red was the gate-order question you resolved (terminal-first ratified).
- DONE: gate.ts brief, gate, and acceptance test match terminal-first (commit af7d2688); 17/17 in the implementation worktree AND the pristine replay checkout; replay artifacts byte-identical (proposal/base/pre/post/event/replay digests identical, digest-file sha256 matched on both); lane tagged phase1-frozen-2026-09-28 locally, NOT pushed; freeze record at ping-24h/phase1-freeze-2026-09-28.md. Full suite parity: 2336/2363 pass, 27 failures all in the TESTING.md known-failing list, zero approval-area failures. The green run surfaced two genuine fixes: test 8 now goes terminal via DENY (its old APPROVE mutated shared fixture state), and a latent crash in renderMcTerminalCard/renderMcWaitingCard on evidence-less denials was fixed (both fall back to "Evidence: none recorded").
- WHY FIRST: the approval door is the product thesis (WAITING_APPROVAL). Nothing downstream is trustworthy on a 16/17 gate.

### P2. Canonical SitePatch v1 defined from the three-vocabulary inventory, with the drag-vs-plain-English equivalence proof. [DONE 2026-09-28]
- EVIDENCE: three fragmented patch vocabularies existed in the tree; you barred wiring any editor before unification.
- DONE: inventory (26 ops, all nine columns) at builder-harvest/PATCH_VOCABULARY_INVENTORY.md; canonical v1 set (13 ops + 1 typed refusal, sitepatch/v1, sha256-canonical-json-v1 digests) at builder-harvest/SITEPATCH_V1.md; drag-vs-plain-English equivalence assertion specified. Canonical tree untouched (read-only). Honest gaps recorded: hard add/remove of sections/pages exists only in the convergence layer, not yet bound into the canonical apply-layer (Phase-2 work); EditorPanel approve path in site-client.tsx applies to local demo preview state only, not the governed path.
- WHY SECOND: every editing surface must emit the same contract. Without this, the sprint builds on three dialects.

### P3. Two-site private surface live with source/build/serve binding. [IN FLIGHT]
- EVIDENCE: a lane claimed conversational reorder worked live and survived regeneration, but it was never bound to source HEAD + build digest + served bytes. Your rule: the served bytes are the authority.
- DONE: Happy Place + Coppersmith on the private tailnet path, same backend and mutation contract; pinned HEAD, build digest, and served-asset digest recorded per site; refresh returns identical bytes.
- WHY THIRD: this is the object you want to test. Everything else is scaffolding around it.

### P4. Mobile fix isolated and committed, bound to served bytes. [IN FLIGHT]
- EVIDENCE: the one-line fix could not be attributed inside the dirty tree, so nothing was committed; the 195-test floor was not rerun after live changes.
- DONE: fix isolated to its own commit (no unrelated dirty files), floor green, served bytes on your phone prove it.
- WHY: an uncommitted fix is a hypothesis, and your phone is the courtroom.

### P5. Correction loop proven end to end on the live surface: OBSERVED FACT -> owner correct -> decision recorded -> projection changes -> regeneration -> decision survives.
- EVIDENCE: locked as the 2026-09-22 gate for the builder; never demonstrated on the live two-site surface with byte-level proof.
- DONE: one full loop per site, with version_id/parent/digests recorded and pre/post-regeneration served bytes compared.
- WHY: this loop IS the FYD product advantage (CONNECT -> BUILDS -> CORRECTS -> CUSTOMIZES -> KEEPS CURRENT).

### P6. Ask FYD evidence-bounded on the live surface: answers cite objects/evidence, refusals refuse.
- EVIDENCE: Ask FYD is required to answer from objects, relationships, evidence, and capabilities, never scraped rendered text; the refusal path has no product proof.
- DONE: five adversarial questions per site (including two the graph cannot answer); supported answers show evidence links, unsupported ones refuse with the owner-assert path offered.
- WHY: a concierge that confabulates is worse than no concierge.

### P7. Approve/reject + undo live as authorized transitions with full version records.
- EVIDENCE: undo-as-new-transition and the version record fields (version_id, parent, base/result/patch digests, actor, authorization, event ref) are decided but not exercised on the surface.
- DONE: approve, reject, and undo each produce a visible history entry with all fields; undo appends a transition toward the prior result, never a hidden stack.
- WHY: the owner must see that every change is authorized, reversible, and auditable, or the approval door is theater.

## ARCHITECTURAL COUPLING RISKS (stop now what becomes unfixable later)

### P8. No editor, agent, mobile UI, API, or MCP wired until SitePatch v1 lands (P2).
- EVIDENCE: your explicit bar; the riskiest hardening mistake identified was attaching any editor before unifying the vocabularies.
- DONE: a checklist gate in the sprint plan; any lane proposing a wiring gets stopped at P2.

### P9. Puck adapter replaceability test defined (not just the equivalence proof).
- EVIDENCE: Puck is interaction machinery only; the replaceability tests (swap Puck, LLM, crawler, renderer, surface without migrating canonical state) are demanded but unwritten.
- DONE: one written test plan stating exactly what "replace Puck without migrating customer state" would execute.

### P10. Binding verifier at the SiteSpec/projection seam specified with its failure posture.
- EVIDENCE: decided 2026-09-22 (FACTUAL must bind to graph/evidence); Q37 proposes downgrade-not-block.
- DONE: verifier spec + the downgrade/omit/log behavior implemented on the render path.

### P11. Tenant isolation proven by test on the shared backend, not assumed.
- EVIDENCE: tenancy model locked 2026-09-28 (tenant owns data; isolation at every boundary); the mechanism is unverified and Q22 gates real data on it.
- DONE: automated test proving tenant A's reads/writes/capabilities are unreachable from tenant B.

### P12. Demo-mode data namespaced and purgeable; no demo write may address a real tenant id.
- EVIDENCE: demo owner mode is the sprint harness; tonight's credential incident is the reminder that test surfaces must be clean by construction.
- DONE: separate demo tenant ids, one-operation purge, automated test that demo actions cannot touch real tenant state.

## PRODUCT USABILITY BLOCKERS (your hands decide)

### P13. Harness artifacts eliminated from the visitor page (the TRADESMAN(HPP) lesson).
- EVIDENCE: your standing verdict: the page was an engineering harness pretending to be a customer website; you verify by screenshot.
- DONE: your phone screenshot review of both sites with zero debug overlays, chat-widget aesthetics, or follower artifacts; page-anchored objects per the object-presence law.

### P14. Contact discoverability implemented per the Q9 spec (tap-to-call/text, hours, directions, two taps, mobile).
- EVIDENCE: named sprint metric; the spec is proposed in Q9 awaiting your word.
- DONE: both sites, bound to object fields, verified on your phone.

### P15. Service discoverability: full service list + top service detail within 10 seconds of landing.
- EVIDENCE: named sprint metric (Q10).
- DONE: timed walkthrough on your phone, both sites.

### P16. WHY THIS as quiet progressive disclosure on factual claims.
- EVIDENCE: decided (not the homepage centerpiece); the mixed EPISTEMIC_RANK map and Ask-composer provenance fallback were flagged as needing the locked boundaries.
- DONE: factual claims carry one-tap provenance showing classification (DIRECT_EVIDENCE / DERIVED / OWNER_ASSERTED / GENERATED_COPY) and the evidence or owner state behind them.

### P17. Plain-language timeline for version history (digests one tap away).
- EVIDENCE: Q34 proposes plain language first; the version record is digest-heavy by design.
- DONE: history reads as sentences, with the full digest chain available on demand.

## VERIFICATION AND REPLAY GAPS (trust machinery)

### P18. 195-test floor reinstated as a gate: green on the served tree after every live change.
- EVIDENCE: the floor was not rerun after the last live changes (2026-09-28).
- DONE: floor runs in CI-on-the-Pig after each change; red floor blocks certification claims.

### P19. Source/build/serve binding as a standing gate for every UI certification.
- EVIDENCE: your 2026-09-27 rule from the v3-polish falsification (a lane's 15/15 "fixes shipped" with none in the served bytes).
- DONE: every UI claim ships with pinned HEAD + build digest + served-asset digest, or it is not a claim.

### P20. Semantic render-model determinism test (Q25 assertion).
- EVIDENCE: determinism is a product guarantee; the exact assertion (byte-identical semantic model, HTML bytes excluded) is proposed but untested.
- DONE: the test exists and passes on both sites across two machines/runs.

### P21. Replay byte-identical evidence required for every lane's green claim (standing rule).
- EVIDENCE: the 2026-09-26 ask-lane case; Phase 1's replay is the first instance (P1).
- DONE: no lane is closed on its own report; the verifier's replay decides.

### P22. Qdrant-degraded Ask FYD path tested by deliberately taking Qdrant down.
- EVIDENCE: Qdrant last observed DEGRADED 2026-09-28 15:40 MDT; Ask FYD's retrieval dependency is unproven under degradation.
- DONE: degraded-mode test with visible "reduced retrieval" indicator; refuses rather than confabulates.

## PRIVATE TEST-SURFACE WORK (the object in your hands)

### P23. Tailscale-only exposure verified: both sites unreachable from the public internet.
- EVIDENCE: your order (privately available FYD sites); Q5 defaults to private-only.
- DONE: bind to tailnet/private interface only; public probe confirms unreachability.

### P24. Unmistakable demo owner mode on the surface (standing :3100 directive).
- EVIDENCE: :3100 serves demo-owner tenants only (NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1); a hand-restart without the flag 403s the customize approve path (2026-09-24 lesson).
- DONE: always-visible demo banner; restart only via /home/nolan/start-3100.sh with the flag verified live after every restart.

### P25. Owner correction survival across regeneration, byte-proven (feeds P5).
- EVIDENCE: the prior lane's survival claim was unbound; P5 requires the byte-level proof.
- DONE: pre/post-regeneration served bytes identical for owner-touched sections, both sites.

### P26. Refresh/replay equivalence on the live surface.
- EVIDENCE: your order (prove refresh and replay return the same result).
- DONE: double-fetch digest equality plus a replayed session producing identical served bytes.

## DEFERRED OPPORTUNITIES (explicitly not in the 100 hours)

### P27. First external FYD owner research (2-3 candidates, no contact).
- EVIDENCE: ordered as standing work; Q32 places it after the product gate.
- WHY DEFERRED: research theater must not substitute for product proof. Starts when the exit gate is green.

### P28. Jev shadow experiments (Ask FYD evidence reranking).
- EVIDENCE: standing posture is parallel/read-shadow/eval-first; a real owner experiencing FYD outranks the decision-plane experiment.
- WHY DEFERRED: the sprint is product proof, not decision-plane research.

### P29. FYD Social product build and PING website build goals.
- EVIDENCE: Q11 proposes pausing both during the sprint.
- WHY DEFERRED: single-product sprint; parallel goals split the machine and your attention.

### P30. Phase 2 (Mission Control backend seam) scope and the dirty-tree commit/revert decision.
- EVIDENCE: Q2 resolved as frozen; the commit/revert decision is deferred to before Phase 2.
- WHY DEFERRED: Phase 1 must freeze first (P1). No new architecture wave while the product proof is open.
