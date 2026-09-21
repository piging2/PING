# BACKLOG_PING — FYD Social + PING runtime product work

Authoritative product backlog for FYD Social and the PING runtime. Split from ~/workspace/BACKLOG.md on 2026-09-21 (Nolan's call): product engineering lives here; the personal social operation (outreach machine, engagement passes, content, Pig automation) lives in BACKLOG_NOLAN.md. ~/workspace/BACKLOG.md is now just the split index.

Rule: evidence over activity. An item is DONE only when a tool result verifies it.
Item numbering is preserved from the combined backlog; it is not sequential.

## FYD CUSTOMER LOOP (2026-09-21, grill lane; FOCUS NOW per Nolan)

Renderer/browser boundary is closed (195/195, min-w-0 fix at 320px). Frontier is now Ask FYD -> evidence. These items are the grill output. Nothing here is architecture for its own sake; each item is a concrete failure class waiting to happen.
### SERVICE EXTRACTION
**FYD-001 — No Service objects in either production graph.** Happy Place graph has 2 objects, Coppersmith has 4 (business, location, person, external_identity). Neither lists a Service object. The fixed first question "What services does this business offer, and how do you know?" cannot be answered from the graph today.
- EVIDENCE: 2026-09-21 FYD report graph summaries.
- VALUE: Without Service objects the Ask FYD boundary cannot open on the real data; everything downstream is prose pretend.
- FAILURE MODE: Ask FYD answers confidently from website prose behind the graph; object model looks like it worked when it did not.
- MINIMUM CHANGE: Service object type with extraction from structured acquisition, bound to evidence refs.
- PROOF: Graph for both sites lists Service objects with evidence_refs resolving to real source URLs.
- DEPENDENCIES: FYD-002 (acquisition input).
- RISK: high — a confident answer without service evidence is the exact architectural failure Nolan named.
- STATUS: OPEN
**FYD-002 — Acquisition emits prose, not schema.** The Happy Place extraction is a machine-generated 2-object summary; the 9-object rich fixture is a separate deliberate fixture. What structured acquisition actually produces (JSON-LD 9.x @graph?) is unclear from the evidence.
- EVIDENCE: happy-place-graph.ts vs happy-place-rich-graph.ts fixture-role separation.
- VALUE: If acquisition input is unstructured prose, every downstream object is an LLM guess with a fake lineage.
- FAILURE MODE: Lineage chain (source bytes -> observation) starts from generated prose; "evidence" is evidence of the generator, not of the business.
- MINIMUM CHANGE: One documented acquisition output contract: source bytes, fetched URLs, parse output schema.
- PROOF: For one real URL, show bytes -> observations file -> evidence entries, all machine-walkable.
- DEPENDENCIES: none.
- RISK: high.
- STATUS: OPEN
**FYD-003 — Service vocabulary mapping is undefined.** How does observed website prose ("Emergency plumbing 24/7") become a Service object with classified claims? No mapping rule exists.
- EVIDENCE: none found; gap found by grill.
- VALUE: Without a mapping rule, service extraction is an LLM judgment call that drifts between runs.
- FAILURE MODE: Same site re-acquired yields different service lists; owner corrects one, next regen re-invents it.
- MINIMUM CHANGE: Rule: Service object = (name span, source URL, claim class DIRECT/DERIVED, offered_by Business rel). Write it down, test against Coppersmith services page.
- PROOF: Two runs on same bytes produce the same Service set.
- DEPENDENCIES: FYD-002.
- RISK: medium-high.
- STATUS: OPEN
**FYD-004 — Does acquisition fetch the services page, or only the homepage?** If acquisition only crawls the homepage, services are structurally missing regardless of extraction quality.
- EVIDENCE: both graphs lack Service while both businesses obviously offer services; gap found by grill.
- VALUE: Fixes the broken step at the right layer (crawl scope) instead of over-tuning extraction.
- FAILURE MODE: Better extractor on insufficient crawl still yields nothing; the fix looks like extraction failure.
- MINIMUM CHANGE: One documented crawl scope policy for the customer loop: which pages, depth, and what "sufficient for services" means.
- PROOF: Acquisition log for Coppersmith lists the services page URL as fetched.
- DEPENDENCIES: FYD-002.
- RISK: medium.
- STATUS: OPEN
### ASK FYD EVIDENCE GROUNDING
**FYD-005 — Ask FYD input contract is not fixed.** Named inputs exist (viewer, target object, question, public/allowed fields, related objects, relationships, evidence references, allowed capabilities) but there is no schema and no test.
- EVIDENCE: 2026-09-21 CEO directive names the inputs; no schema found.
- VALUE: A fixed input contract is what keeps the LLM from reading arbitrary prose behind the graph.
- FAILURE MODE: Prompt assembly drifts; one day the LLM gets raw website text and nobody notices.
- MINIMUM CHANGE: One TS schema for AskFydInput, one for AskFydOutput, in the FYD lane.
- PROOF: Schema file committed; a builder that violates it fails type-check.
- DEPENDENCIES: FYD-001.
- RISK: high — unbounded input is how invention starts.
- STATUS: OPEN
**FYD-006 — Ask FYD output contract is not defined.** Required: answer + evidence_refs + source_urls + claim classifications + unknowns + suggested actions. No contract enforces this.
- EVIDENCE: gap found by grill.
- VALUE: Structured output is the only thing that makes "how do you know" verifiable instead of rhetorical.
- FAILURE MODE: Answer is a confident paragraph with no refs; WHY THIS? has nothing to point at.
- MINIMUM CHANGE: AskFydOutput schema requiring evidence_refs and classifications on every factual sentence.
- PROOF: One answer to the fixed question with every factual claim carrying a classification and a ref.
- DEPENDENCIES: FYD-005, FYD-001.
- RISK: high.
- STATUS: OPEN
**FYD-007 — No negative test: Ask FYD must say "I don't know" when the graph lacks facts.** Today neither graph has Service objects, so the honest answer to the fixed question is admission, not confidence. No test requires that.
- EVIDENCE: FYD-001 state; Nolan's 2026-09-21 note explicitly names this as the adversarial test.
- VALUE: This is the single test that proves the graph is the factual input space, not the website.
- FAILURE MODE: LLM invents services from latent knowledge; customer trusts a hallucinated service list.
- MINIMUM CHANGE: One canonical test: run fixed question against current Happy Place graph; assert answer contains explicit unknown and zero invented services.
- PROOF: Test passes with the "I don't know" shape; a variant with services present answers with refs.
- DEPENDENCIES: FYD-005, FYD-006.
- RISK: high.
- STATUS: OPEN
**FYD-008 — Generated prose verifier does not exist.** Generated presentation may summarize supported facts but may not silently introduce new factual claims. No verifier checks generated prose against evidence bindings.
- EVIDENCE: gap found by grill; verifyPresentationBinding covers render bindings, not prose.
- VALUE: This is where invention actually happens in practice: fluent summaries that add one unbound adjective per sentence.
- FAILURE MODE: "Trusted local experts serving the valley for decades" ships with no evidence for "decades."
- MINIMUM CHANGE: Rule + test: every factual assertion in generated prose must map to a bound evidence ref, or be labeled proposed/unsupported. Start with the Ask FYD answer path only.
- PROOF: Prose containing one injected unsupported claim fails the verifier test.
- DEPENDENCIES: FYD-006.
- RISK: high.
- STATUS: OPEN
**FYD-009 — Cited evidence_refs are not checked for existence.** "How do you know" must cite refs and URLs that exist in the graph. No check that a cited ref resolves.
- EVIDENCE: gap found by grill.
- VALUE: An LLM can cite plausible-looking refs that point nowhere; nobody catches it without the check.
- FAILURE MODE: Answer cites evidence_ref "svc-03" that does not exist; customer clicks WHY THIS? and gets nothing.
- MINIMUM CHANGE: Post-answer validation: every evidence_ref in output resolves in the target graph snapshot, else FAIL CLOSED (mark unsupported).
- PROOF: Test with one dangling ref fails closed.
- DEPENDENCIES: FYD-006.
- RISK: medium-high.
- STATUS: OPEN
**FYD-010 — Field-level privacy gate for Ask FYD is untested.** Inputs carry public/allowed fields; there is no test that a private owner field (phone, home address) is withheld from a public viewer but visible to the owner.
- EVIDENCE: OWNER ADDRESS OVERRIDE=PASS at render; Ask FYD path never tested.
- VALUE: Ask FYD is a second mouth on the same data; every gate the renderer passed must hold here too.
- FAILURE MODE: Ask FYD tells a public viewer the owner's hidden address because the context builder included it.
- MINIMUM CHANGE: One test: public viewer context + hidden address field -> answer does not reveal it; owner context -> it does.
- PROOF: Test passes.
- DEPENDENCIES: FYD-005.
- RISK: high (privacy).
- STATUS: OPEN
**FYD-011 — No ClaimAuthority means conflict resolution is undefined.** Two sources disagree (different hours on Google vs website). No single authority decides truth; the resolution policy is unwritten.
- EVIDENCE: gap found by grill; architecture says no ClaimAuthority but never says what resolves conflicts.
- VALUE: The first real-world data conflict will force an ad-hoc decision; better to have the rule.
- FAILURE MODE: Last-write-wins silently; or LLM picks the prettier number; conflict vanishes from evidence.
- MINIMUM CHANGE: Rule: conflicting observations are both preserved with classification; presentation shows one with conflict flag, WHY THIS? shows both. No silent resolution.
- PROOF: One fixture with conflicting hours; both preserved; presentation flags conflict.
- DEPENDENCIES: none.
- RISK: medium.
- STATUS: OPEN
### BINDING VERIFIER AND LINEAGE
**FYD-012 — Not all factual render paths are proven through verifyPresentationBinding.** Verifier is WIRED, but is every factual binding call site actually routed through it? One bypassing render path reintroduces invented claims.
- EVIDENCE: BINDING VERIFIER=WIRED in 2026-09-21 report; coverage audit not shown.
- VALUE: "Wired" must mean all facts, not the demo path.
- FAILURE MODE: A new section renders business hours from a direct graph read; verifier never sees it.
- MINIMUM CHANGE: Audit all factual binding call sites; add a lint/test that no factual render binding bypasses the verifier.
- PROOF: Audit list committed; bypass test fails on a deliberate direct read.
- DEPENDENCIES: none.
- RISK: medium-high.
- STATUS: OPEN
**FYD-013 — Partially-supported bindings have no policy.** One injected unsupported binding fails/omits, but what about a binding whose evidence exists yet is stale or superseded by re-ingestion? Policy undefined.
- EVIDENCE: UNBOUND FACTUAL CLAIM TEST=PASS; partial-support case not covered.
- VALUE: Source change + re-ingestion will create exactly this case on day one.
- FAILURE MODE: Stale fact renders as current because its ref still resolves.
- MINIMUM CHANGE: Rule: evidence carries version/as_of; binding against superseded evidence fails closed or marks stale.
- PROOF: Test with superseded evidence ref fails or marks.
- DEPENDENCIES: FYD-017 (graph versioning).
- RISK: medium.
- STATUS: OPEN
**FYD-014 — WHY THIS? visible interaction is unproven in browser.** The trust escape hatch must be visible and clickable, showing the evidence chain for a claim. No browser proof exists.
- EVIDENCE: gap found by grill; report shows internal plumbing, not the interaction.
- VALUE: WHY THIS? is the correction/dispute path; if it is not reachable, owner corrections cannot start.
- FAILURE MODE: Provenance exists internally but the owner has no way to reach it; correction flow dead on arrival.
- MINIMUM CHANGE: Minimal visible affordance on one claim per site; click shows lineage (value -> object field -> claim -> evidence -> observation -> source).
- PROOF: Browser evidence: click WHY THIS? on one claim, lineage panel shows real refs.
- DEPENDENCIES: FYD-005.
- RISK: medium.
- STATUS: OPEN
**FYD-015 — Evidence lineage is not machine-walkable end to end.** The chain visible value -> object field -> claim -> evidence -> observation -> source is asserted; no test walks it for a real claim.
- EVIDENCE: gap found by grill.
- VALUE: A broken link anywhere makes WHY THIS? and regeneration provenance theater.
- FAILURE MODE: WHY THIS? panel shows "evidence unavailable" for one link in the chain.
- MINIMUM CHANGE: One test walks lineage for every factual claim on the Happy Place homepage; every hop resolves.
- PROOF: Test passes.
- DEPENDENCIES: FYD-014.
- RISK: medium.
- STATUS: OPEN
### OWNER OVERRIDES AND CORRECTION FLOW
**FYD-016 — Owner address override preservation under regeneration is unproven.** OWNER ADDRESS OVERRIDE=PASS today, but no changed-source regeneration test shows the override surviving.
- EVIDENCE: 2026-09-21 report; regeneration test not run.
- VALUE: This is the pre-Ask-FYD gate that was explicitly named; it must hold across regeneration, not just render.
- FAILURE MODE: Source re-ingest overwrites the owner's hide/show choice; owner intent silently erased.
- MINIMUM CHANGE: Fixture test: owner sets visibility policy, source changes, regenerate, assert policy intact and observed value updated separately.
- PROOF: Test passes.
- DEPENDENCIES: FYD-019 (regen fixture).
- RISK: high.
- STATUS: OPEN
**FYD-017 — Observed value vs visibility policy vs presentation may be one field in practice.** Architecture separates the three; code must actually store them separately.
- EVIDENCE: gap found by grill; PASS was at behavior level.
- VALUE: Collapsed fields make the separation a comment, not an invariant.
- MINIMUM CHANGE: Code audit: show the three stored separately for address/phone on one object; one test that changing visibility does not touch observed value.
- PROOF: Audit + test.
- DEPENDENCIES: none.
- RISK: medium.
- STATUS: OPEN
**FYD-018 — CONFIRM/CORRECT/HIDE transitions have no recorded durable form.** The correction flow is named but not implemented; where the transition is recorded (owner state, signed, timestamped) is undefined.
- EVIDENCE: gap found by grill.
- VALUE: Corrections are owner intent; if they are ephemeral they will be lost at the first regen.
- FAILURE MODE: Owner corrects a service, approves, regen wipes it.
- MINIMUM CHANGE: One owner-state record shape for corrections: target, before, after, classification, timestamp, actor. Write the shape before the UI.
- PROOF: Record shape committed; one correction round-trips through apply + regen fixture.
- DEPENDENCIES: FYD-019.
- RISK: high.
- STATUS: OPEN
**FYD-019 — "Move emergency plumbing to the top" end-to-end is unproven.** The owner reorder request needs: proposal with before/after, explicit approval, deterministic application, refresh persistence. None exists for real.
- EVIDENCE: named as the owner request in 2026-09-21 directive; not implemented.
- VALUE: This is the first real customization through the whole loop; it proves proposal machinery, not prose.
- FAILURE MODE: Reorder stored in UI state only; refresh or regen loses it.
- MINIMUM CHANGE: Proposal record + approval record + deterministic apply + refresh persistence test on one list.
- PROOF: Browser evidence: reorder survives refresh; regen with changed source preserves it.
- DEPENDENCIES: FYD-018, FYD-021.
- RISK: medium-high.
- STATUS: OPEN
**FYD-020 — Competing owner overrides are unresolved.** Two authorized owners disagree (hide vs show phone). Resolution rule undefined.
- EVIDENCE: gap found by grill.
- VALUE: Multi-owner businesses are normal; the first disagreement needs a rule, not a crash.
- FAILURE MODE: Last write wins silently; one owner never knows.
- MINIMUM CHANGE: Rule: both recorded, conflict flagged, most restrictive default for sensitive fields, WHY THIS? shows the dispute. Write it down before it happens.
- PROOF: Fixture with two competing overrides resolves per rule.
- DEPENDENCIES: FYD-018.
- RISK: medium.
- STATUS: OPEN
### REGENERATION SAFETY
**FYD-021 — No changed-source regeneration fixture exists.** The loop's core promise (source changes -> safe regeneration preserving owner customization) has no test at all.
- EVIDENCE: gap found by grill; regeneration named everywhere, tested nowhere.
- VALUE: This is the whole FYD moat slice; everything else is scaffolding around it.
- FAILURE MODE: Every regen is a manual nervous moment; owner customizations get spot-checked by humans forever.
- MINIMUM CHANGE: Fixture: source bytes v1 -> graph v1 -> SiteSpec v1; owner customization; source bytes v2 (one field changed) -> graph v2 -> SiteSpec v2; assert customization preserved and diff explains the change.
- PROOF: Fixture test passes; second run idempotent.
- DEPENDENCIES: FYD-018.
- RISK: high.
- STATUS: OPEN
**FYD-022 — Regeneration provenance is missing.** When a projection changes, the system cannot say "changed because source changed" vs "changed because owner edited."
- EVIDENCE: gap found by grill.
- VALUE: Without this, owners cannot trust or debug regeneration; every change looks arbitrary.
- FAILURE MODE: Owner blames FYD for a change their own edit caused; or misses a source-driven change.
- MINIMUM CHANGE: Regen emits a change record per altered value: cause (source/owner/generated), old, new, evidence ref.
- PROOF: Fixture regen produces a readable change record.
- DEPENDENCIES: FYD-021.
- RISK: medium.
- STATUS: OPEN
**FYD-023 — SiteSpec generation determinism is unproven.** Semantic determinism passes at render-model level; is SiteSpec generation itself deterministic given the same graph? The planner is "deterministic data/config" by claim only.
- EVIDENCE: SEMANTIC DETERMINISM=PASS at render; planner claim untested.
- VALUE: Nondeterministic SiteSpec means every regen is a coin flip even with identical inputs.
- FAILURE MODE: Same graph, two regens, different section order; owner reorder fights the planner.
- MINIMUM CHANGE: Test: same graph fixture -> SiteSpec twice -> byte-identical (excluding declared volatile fields).
- PROOF: Test in canonical suite.
- DEPENDENCIES: none.
- RISK: medium-high.
- STATUS: OPEN
**FYD-024 — Ask FYD answers are not versioned against the graph snapshot.** An answer cites evidence from graph v3; the graph moves to v4. The answer is never stale-marked.
- EVIDENCE: gap found by grill.
- VALUE: Stale answers presented as current are invented claims with extra steps.
- FAILURE MODE: Owner corrects a fact; Ask FYD keeps quoting the old evidence.
- MINIMUM CHANGE: Rule: answers carry graph snapshot id; context rebuild on regen marks old answers stale.
- PROOF: Fixture: regen -> old answer marked stale.
- DEPENDENCIES: FYD-021.
- RISK: medium.
- STATUS: OPEN
### SEMANTIC DETERMINISM AND CLASSIFICATIONS
**FYD-025 — Semantic determinism regression must be permanent.** The invariant (same graph + SiteSpec + viewer context + renderer version -> same semantic render model) was proven once; it must be a standing regression in the canonical suite.
- EVIDENCE: SEMANTIC DETERMINISM=PASS 2026-09-21.
- VALUE: One-time proof rots; this invariant is load-bearing for regeneration trust.
- FAILURE MODE: A renderer refactor silently breaks semantic stability; noticed only after owners complain.
- MINIMUM CHANGE: Keep the test in the canonical suite; it already exists or must be added permanently.
- PROOF: Canonical suite includes it on every run.
- DEPENDENCIES: none.
- RISK: medium.
- STATUS: OPEN
**FYD-026 — Claim classifications are not enforced at write time.** DIRECT/DERIVED/INFERRED/GENERATED_PRESENTATION/OWNER_AUTHORED exist as vocabulary; nothing stops a GENERATED sentence from being stored as DIRECT.
- EVIDENCE: gap found by grill.
- VALUE: Classifications are the publication rules; unenforced vocabulary is a label printer.
- FAILURE MODE: GENERATED prose enters the graph as DIRECT; downstream treats it as accepted evidence.
- MINIMUM CHANGE: Rule: only evidence-bound acceptance may set DIRECT; generated content always GENERATED_PRESENTATION or proposed. One test enforces it.
- PROOF: Attempt to store generated prose as DIRECT fails.
- DEPENDENCIES: FYD-008.
- RISK: medium-high.
- STATUS: OPEN
**FYD-027 — Ask canonical tests (36/36) do not cover evidence-grounded answers.** The Ask suite passes, but what it tests is unclear; it does not cover the fixed question against real graphs.
- EVIDENCE: CANONICAL TEST 195/195 includes Ask 36/36; no evidence-grounding coverage shown.
- FAILURE MODE: Green suite, broken product boundary; the suite measures the wrong thing.
- VALUE: Suite must measure the frontier, not the past.
- MINIMUM CHANGE: Add the FYD-007 negative test and one positive evidence-grounded test to the Ask canonical set.
- PROOF: Suite runs them.
- DEPENDENCIES: FYD-007.
- RISK: medium.
- STATUS: OPEN
### WORKTREE AND GIT
**FYD-034 — 260-commit push status unknown.** No further Git network work until it is determined whether the earlier push landed.
- EVIDENCE: standing constraint.
- VALUE: Duplicate push or lost history.
- FAILURE MODE: Push twice, or assume pushed and lose local commits.
- MINIMUM CHANGE: Inspect branch/worktree/remotes once; determine push outcome; record it.
- PROOF: Recorded outcome in ledger or backlog note.
- DEPENDENCIES: none.
- RISK: medium.
- STATUS: OPEN
**FYD-035 — Demo server on Pig :3100 is user-reachable only after Nolan picks an access path.** Server itself is healthy: PID 88840, HEAD 8a99742 (the proven min-w-0 commit), worktree /home/nolan/projects/ping, branch fyd/sitespec-generator, routes / /sites/happy-place /sites/coppersmith-plumbing all 200 from WSL-local and from the Pig's Windows side via http://[::1]:3100/sites/happy-place. But there is NO proven reachable URL from Nolan's device: the Tailscale IP 100.79.154.43:3100 fails even from the Pig's own Windows side (WSL localhost relay only listens on ::1), so his iPhone on the tailnet cannot reach it either; the earlier "NOLAN CAN ACCESS: YES" claim is disproven.
- EVIDENCE: ~/workspace/fyd-lane/reachability-report.md (reachability lane 2026-09-21, HTTP-verified).
- VALUE: Nolan clicking a dead URL destroys trust in every PASS above.
- FAILURE MODE: Assuming reachable, or opening public firewall unauthenticated.
- MINIMUM CHANGE: Nolan's call between (a) Tailscale path: Windows port forward 3100 into WSL + Windows Firewall allow TCP 3100 on the Tailscale interface, then http://100.79.154.43:3100/sites/happy-place works from his tailnet devices; or (b) SSH tunnel: ssh -L 3100:localhost:3100 from his device, then http://localhost:3100/sites/happy-place. Both private, no public exposure.
- PROOF: Nolan loads a URL from his own device and gets 200.
- DEPENDENCIES: FYD-033 (fix must be in the served build).
- RISK: medium-high.
- STATUS: OPEN, awaiting Nolan's access-path call.
*FYD-033 moved to DONE (committed 2026-09-21).*
## OPEN (PING engineering)
9. **Projection digest algorithm must be preserved alongside any reported digest.** (from FL-20260920-031b, 2026-09-21 perfecting-pass triage): Lane B's commit reported an Oracle projection digest that no one can reproduce because the digest algorithm/script was never committed or recorded; 11 candidate formulations all failed, so the reported string is unverifiable forever. Independent determinism was still proven (two rebuilds with the compiled projector produced identical digests and counts), but a bare digest string with no algorithm is not evidence. Rule: any lane that reports a digest must commit the exact digest algorithm/script with it, or point at the shared digest implementation. Applies to PING Social sprint lanes and convergence lanes alike. Owner: the lane that reports the digest.
## BLOCKED (PING)
5. **GitHub push/repo creation** — blocked by the documented egress-proxy fault, not credentials. Owner: Nolan/platform.
6. **Commits frozen** — under the convergence program until the ordered proof sequence completes and Nolan authorizes. Owner: Nolan.
## DONE
**FYD-033 — Proven min-w-0 fix committed (2026-09-21).** The fix must be isolated, diff-verified to contain only the one line, and committed through the safe lane without touching unrelated WIP.
- EVIDENCE: 2026-09-21 report; git constraints in standing context.
- VALUE: A proven product fix floating in a dirty worktree is one bad command from lost.
- FAILURE MODE: Collateral commit of 23 unrelated files; or fix lost in a cleanup.
- MINIMUM CHANGE: Stage only src/app/sites/happy-place/site-client.tsx, verify diff is the one line, commit locally.
- PROOF: Commit contains exactly the min-w-0 line; git log shows it.
- DEPENDENCIES: confirm 260-commit push status first (FYD-034).
- RISK: medium.
- STATUS: DONE (2026-09-21: committed locally as 8a997421ef5f121f114d948c693391f1a9c7c66e, exactly one file staged, 23 unrelated dirty files preserved; canonical gate rerun on this SHA still pending)
## FUTURE SEAMS (Nolan 2026-09-20, recorded; explicitly NOT tonight's work)

These are future product consequences of the intelligent-node architecture. Record the seam, do not build the system.

1. **Voice memos on hover.** Eventually a Circle hover/tap should be able to play a voice memo from the identity. Seam: voice memo as a typed object (audio reference + transcript + duration + provenance), preview surface reserves a playback slot. No audio infrastructure tonight.
2. **Backend email sending.** The PING backend will eventually send emails (notifications, digests, Ask PING follow-ups, proposals awaiting approval). Seam: notification as a governed, approved action through the existing proposal/approval machinery; no external send without human authorization. No mail transport tonight.
3. **Full agent orchestration across the social substrate.** Agents reason broadly and propose; every external side effect stays behind capability + authorization. Tonight proves proposal/denial/approval and structured agent context; the wider orchestration (scheduled agents, multi-agent missions on social objects) is future work on the existing mission/worker machinery, not a new runtime.
4. **SponsoredObject seam.** Other PING members advertising around Nodes becomes a typed object/projection later: sponsor, target/context, creative/object reference, disclosure, validity, evidence/receipt. No bidding, auctions, payments, or targeting engine tonight or soon.
5. **Website builder as consequence.** If the object graph proves out (website → structured Business/Location/Service/Person/Article/SocialIdentity objects with provenance), an AI website builder becomes a future generator over the same graph, not a separate product. Do not build layout tooling until the graph is proven.
## How to work this file

- Pick the top OPEN item you can verify with a tool result. Do the work, verify, log it in learnings.md, move it to DONE with the evidence.
- Never mark DONE on a worker's word alone. Delivered artifacts and live verification outrank narration.
- BLOCKED items move only when the owner acts. Do not nudge Nolan on held items.
