# BACKLOG_PING - FYD Social + PING runtime product work

Authoritative product backlog for FYD Social and the PING runtime. Reconstructed 2026-09-22 from the partial 2026-09-21 file, the historical pre-split backlog (git `ec8f509`), and all eight 2026-09-22 archaeology reports under `~/workspace/backlog-recon/reports/`. Split from ~/workspace/BACKLOG.md on 2026-09-21 (Nolan's call): product engineering lives here; the personal social operation (outreach machine, engagement passes, content, Pig automation) lives in BACKLOG_NOLAN.md. ~/workspace/BACKLOG.md is now just the split index. The ONE GRILL (operator decision surface) is ~/workspace/GRILLING-BRIEF.md; see the ONE-GRILL pointer at the end of this file. Do not create another question/grill file.

Rule: evidence over activity. An item is DONE_VERIFIED only when a tool result verifies it. Code changes alone do not close findings. Narrated completions are not proof.

Item numbering FYD-001..FYD-038 is preserved from the combined backlog and the 2026-09-21 grill lane; it is not sequential (FYD-028..032 moved to BACKLOG_NOLAN.md with the wake-lock/run-robustness section at the split; see HISTORICAL RECONCILIATION).

Status vocabulary: OPEN (known, not started) / IN_PROGRESS (actively worked) / BLOCKED (cannot proceed until owner/dependency acts) / PROVE (needs a falsification experiment) / HARVEST (research-only, adopt/adapt/reject later) / DECISION (answered, execution pending) / DEFERRED (deliberately parked) / REJECTED (deliberately not built, with reason) / DONE_VERIFIED (proven with tool evidence) / SUPERSEDED (replaced by a newer decision/item).

Priority: P1 = core-loop blocker; P2 = frontier adjacency; P3 = optionality. Priority is not backlog order: this file preserves knowledge (huge memory); the execution frontier stays tiny (NOW below).

## NOLAN DIRECTIVES, 2026-09-22 (authoritative overrides; supersede any stale wording below)

1. FYD's failure modes collapse into product primitives. Build primitives, not backlog-number whack-a-mole.
2. Build order where dependencies require: ACQUISITION CONTRACT -> EVIDENCE-BACKED OBJECT COMPILATION -> TRUSTED PROJECTION / CLAIM BINDING -> OWNER INTENT / OVERRIDES -> REGENERATION -> OPERATIONAL INTEGRITY.
3. FYD-002 is the true root: before Service objects, Ask FYD, WHY THIS?, or regeneration, point at SOURCE BYTES -> PARSED OBSERVATIONS -> EVIDENCE.
4. FYD-001 + FYD-003 are one proof: the minimum Service object (id, schema type, name, relationship, claim/evidence bindings; Business -> offers -> Service).
5. FYD-008's universal generated-prose verifier is REJECTED as an open-ended semantic problem. Prevention beats post-hoc detection: generate from structured SUPPORTED CLAIMS plus PRESENTATION INTENT; the generator returns text fragments plus claim bindings; bindings are validated deterministically; semantic verification is defense in depth only. Dangling citations fail closed.
6. Conflict is a property of evidence, not a new ClaimAuthority. Preserve both observations and both evidence chains (CLAIM A / evidence A / CLAIM B / evidence B / CONFLICT); projection policy chooses presentation (owner-confirmed > current direct evidence); owner correction creates stronger evidence and never deletes observations. FYD becomes progressively more accurate than the web it ingested; that is the moat.
7. Owner customization has three distinct states: OBSERVED WORLD (what sources said) / OWNER INTENT (confirmed/corrected/hid/prioritized) / GENERATED PRESENTATION (what renders). Never mutate source observations on customization. CONFIRM / CORRECT / HIDE / SHOW / FEATURE / REORDER become typed operations. Friction maps to consequence: low (layout/tone/order) -> preview + undo; medium (public factual correction, visibility, publishing) -> explicit confirmation; high (external action, writes, purchase, credentials) -> explicit authorization.
8. FYD-020 multi-owner governance is DEFERRED. MVP has one authoritative owner.
9. Regeneration recomputes from GRAPH SNAPSHOT + OWNER INTENT + DESIGN TOKENS + VIEWER/CHANNEL + RENDERER VERSION. Never edit generated output directly. WHY THIS? is tertiary UX (trust/debugging/correction entry), not primary.
10. FYD-037 wrong-journal protection is an urgent small independent safety lane.
11. FYD-034: inspect once, record, stop discussing.
12. FYD-035: only Nolan's real device proof remains. No more networking machinery.
13. Keep exactly two FYD backends (Happy Place, Coppersmith) until Nolan personally uses both end to end through private preview, Ask FYD, owner mode, Circle -> Node, and customization.
14. Shared projection policy: OBJECT + VIEWER + CAPABILITY + FIELD VISIBILITY -> ALLOWED VIEW, applied consistently by the renderer, Ask FYD, search, Circle, agent context, and protocol projections. DATA NOT PRESENT beats prompt instruction.

How to work this file: pick the top NOW item you can verify with a tool result. Do the work, verify, move it to DONE_VERIFIED with the evidence. Never mark DONE on a worker's word alone. BLOCKED items move only when the owner acts.

THIS BACKLOG IS NO LONGER OUR PRODUCT PLAN. IT IS OUR FAILURE INVENTORY. We build the fewest product primitives that eliminate the most failure classes. NOT: more tests. NOT: another protocol. NOT: another architecture document. A real business URL enters FYD; FYD discovers the service evidence; FYD creates real Service objects; the generated site renders them; Ask FYD answers "What services does this business offer, and how do you know?" with every service resolving to real evidence; the owner corrects one thing; the source changes; FYD regenerates; the owner's intent survives. THAT IS THE PRODUCT.

---

## NOW - VERIFIED FRONTIER (max 10; this is the entire execution authorization)

Renderer/browser boundary is GREEN (2026-09-21/22): URL safety PASS, hostile probe PARTIAL (text escaping PASS; javascript: href sink still OPEN per FL-20260921-032, see renderer-javascript-url-sink), desktop PASS, mobile PASS, binding verifier WIRED, unbound factual claim test PASS, owner address override PASS, semantic determinism PASS, canonical test 195/195.

Current product frontier: RENDERED EXPERIENCE -> ASK FYD -> EVIDENCE.

- [ ] **NOW-1 / FYD-002** (P1, OPEN): acquisition contract. Source bytes -> parsed observations -> evidence entries, machine-walkable, for one real URL. FIRST PRODUCT BLOCKER (directive 3): this is the true root; Service objects, Ask FYD, WHY THIS?, and regeneration all stand on it. Proof: for one real business URL, point at the stored source bytes, the parsed observations, and the evidence entries; each hop resolves mechanically. (Details: P1 Acquisition contract section.)
- [ ] **NOW-2 / FYD-001 + FYD-003** (P1, OPEN): one proof of the minimum Service object. The fixed question "What services does this business offer, and how do you know?" must be answerable from both real graphs: id, schema type, name, relationship (Business -> offers -> Service), claim/evidence bindings. Without this the Ask FYD boundary cannot open on real data; everything downstream is prose pretend. Proof: both site graphs list Service objects with evidence_refs resolving to real source URLs. Depends on NOW-1.
- [ ] **NOW-3 / FYD-009** (P1, OPEN): cited evidence_refs existence check. Post-answer validation: every evidence_ref in Ask FYD output resolves in the target graph snapshot, else FAIL CLOSED (mark unsupported). Directive 5: dangling citations fail closed. Proof: test with one dangling ref fails closed.
- [ ] **NOW-4 / GEN-CONSTRAINT** (P1, IN_PROGRESS): structured generation with deterministic claim-binding validation. Replace the rejected FYD-008 universal verifier (SUPERSEDED, see HISTORICAL RECONCILIATION): generate from structured SUPPORTED CLAIMS plus PRESENTATION INTENT; generator returns text fragments plus claim bindings; bindings validated deterministically; semantic verification is defense in depth only. Proof: generated prose with one injected unsupported claim fails the binding validator; Ask FYD answer path covered first.
- [ ] **NOW-5 / FYD-010** (P1, OPEN): field-level privacy gate for Ask FYD. Public viewer context + hidden owner field (phone/home address) -> answer must not reveal it; owner context -> it does. The renderer passed OWNER ADDRESS OVERRIDE; Ask FYD is a second mouth on the same data and was never tested. Proof: test passes both ways.
- [ ] **NOW-6 / DEPLOY-PROV-001** (P1, DECISION for Nolan): accept 3c5d280dd baseline and stop :8081. Both live Oracle containers (:8080, :8081) run ping-gateway:candidate-3c5d280dd since ~2026-09-21 12:03-12:05 UTC with zero restarts, both pointed at the same database; deployment registry empty; no evidence explains the promotion from the certified candidate-84486f056 (certification ORACLE_RUNTIME_PROVEN, ORACLE_RESTART_PROVEN, rollback anchor 8400deecf2a9). Latent dual-writer risk while both attach to the same DB. See ONE-GRILL pointer; Nolan's call. Proof: decision recorded; if accepted, :8081 stopped and provenance recorded honestly.
- [ ] **NOW-7 / FYD-012** (P2, OPEN): binding verifier coverage audit. Verifier is WIRED; audit that every factual render binding call site is routed through verifyPresentationBinding, and add a lint/test that no factual render binding bypasses it. Proof: audit list committed; bypass test fails on a deliberate direct read.
- [ ] **NOW-8 / FYD-021** (P2, PROVE): changed-source regeneration fixture. The loop's core promise (source changes -> safe regeneration preserving owner customization) has no test. Fixture: source bytes v1 -> graph v1 -> SiteSpec v1; owner customization; source bytes v2 (one field changed) -> graph v2 -> SiteSpec v2; assert customization preserved and diff explains the change. Proof: fixture passes; second run idempotent.
- [ ] **NOW-9 / FYD-037** (P1, OPEN): wrong-journal fail-closed guard. Directive 10: urgent small independent safety lane. FYD overlay emit/dump must fail closed against a journal lacking the expected overlay marker, so a projection can never be written against the wrong journal. Proof: emit against a journal without the marker fails closed with a typed failure; no silent write.
- [ ] **NOW-10 / FYD-035** (P2, OPEN): Nolan's real device proof only. No more networking machinery (directive 12). Proof: the FYD demo loads and functions on Nolan's actual device over the real path; nothing more.

## NEXT (frontier adjacency; not authorized until a NOW item clears)

- FYD-004 crawl scope policy (does acquisition fetch the services page?); FYD-005 Ask FYD input contract builder-fields test (PROVE).
- FYD-011 conflict-preservation rule (no ClaimAuthority; conflicting observations both preserved with classification; presentation shows one with conflict flag, WHY THIS? shows both) - now standing law per directive 6, Ask surfacing still OPEN.
- FYD-013 stale/superseded evidence policy (evidence carries version/as_of; binding against superseded evidence fails closed or marks stale).
- FYD-014/015 WHY THIS? visible interaction in browser + machine-walkable lineage test (value -> object field -> claim -> evidence -> observation -> source, every hop resolves for every factual claim on the Happy Place homepage).
- FYD-016 owner address override survival across changed-source regeneration; FYD-017 observed/visibility/presentation stored as three separate fields; FYD-018 owner correction record shape (target, before, after, classification, timestamp, actor); FYD-019 "move emergency plumbing to the top" end-to-end (proposal -> approval -> deterministic apply -> refresh persistence).
- FYD-022 regeneration provenance (change record per altered value: cause source/owner/generated, old, new, evidence ref); FYD-023 SiteSpec generation determinism test (same graph -> byte-identical SiteSpec); FYD-024 Ask FYD answers versioned against graph snapshot (stale-mark on regen); FYD-025 semantic determinism as permanent canonical regression; FYD-026 claim classifications enforced at write time (only evidence-bound acceptance may set DIRECT); FYD-027 canonical Ask tests extended with evidence-grounded positive test once NOW-2 lands.
- FYD-036 Coppersmith replay evidence (scoped replay protocol: persisted history -> reducer -> empty disposable projection, two runs, REPLAY DIGEST MATCH + REPLAYED UI MATCH); FYD-038 synthetic Happy Place service overlay labeled DEMO_SYNTHETIC or removed from the demo path; FYD-034 inspect-once-record (directive 11).
- FYD-020 multi-owner governance DEFERRED per directive 8 (single authoritative owner MVP).
- PG-001 pg_hba loopback trust -> scram-sha-256 (answered HOLD 2026-09-21 for gateway cutover; parked in the Grill, next security patch after stabilization).

## LATER / OPTIONALITY (deliberately not now; PING preserves the optionality, FYD proves the product)

- Public social observation (ATProto, ActivityPub remote interop, Nostr, Farcaster, RSS/open web, WebFinger, Webmention, rel=me): HARVEST/DEFERRED until the core loop is proven. Frozen per OBS-01.
- Cross-network actions (provider capability matrix; OBSERVE separate from ACT); campaigns (plain-English intent -> bounded action plan; never covert scraping/spam).
- MCP as thin projection; local-first/desktop Windows product (Identity Vault, Object Store, Capability Runtime, Agent Runtime); embeddable portable Circles as a distribution wedge.
- Future business optionality: newsletters, commerce, appointments, lead capture, reviews, cross-network publishing/following where supported, agent swarms under bounded capability, developer/API ecosystem.
- Website acquisition escalation tooling (Crawl4AI design patterns, Playwright L2, Lightpanda conditional): only when a real acquisition failure justifies it.

---

## NORTH STAR

PING = platform/runtime/ecosystem. FYD Social = customer-facing product.

Core PING thesis: humans and agents operate on the same portable, verifiable objects, relationships, capabilities, transitions, evidence, and history.

Core FYD thesis: existing website/social/business presence -> proceduralized evidence-backed object graph -> generated intelligent web presence -> owner customization -> social relationships -> concierge -> actions -> outcomes -> learning.

Standing engineering rules (non-negotiable; taught by failures):

1. Evidence over activity. An item is DONE_VERIFIED only when a tool result verifies it.
2. STATUS LANGUAGE MUST MATCH PROVEN MECHANISM. Names repeatedly overclaimed mechanisms in the 2026-09-19 audit; a label must describe what the mechanism actually does. (Installed by this reconstruction 2026-09-22; was EVENT-SPINE-12.)
3. Deterministic where determinism is required: same causal history -> same replay ordering -> same execution -> same canonical state -> same canonical bytes -> same hash -> same witness.
4. Rule of One: every important architectural concern has one authoritative owner (identity, canonicalization, hash, evidence, observation, configuration, knowledge, replay, projection, witness, constitutional authority). Never classify by filename; classify by capability, authority, ownership, behavior. Declared authority must match actual capability ownership; enforcement establishes sovereignty.
5. Generated factual claims must be bound to evidence. No second authority created casually. Conflict is a property of evidence, never a new authority (No-ClaimAuthority, 2026-09-22): preserve both observations and both evidence chains; projection policy chooses presentation; owner correction creates stronger evidence and never deletes observations.
6. Canonical history != projection. Projections are disposable/rebuildable where intended.
7. Private context never leaks into public objects or public canonical events.
8. Agent output != canonical truth. Agent proposals bind the exact proposed transition digest; human approval approves that exact transition.
9. Fail closed: a detected platform restriction becomes BLOCKED, never an optimization problem.
10. Mission state != Object state. Execution != Authorization.
11. Generation constraint (2026-09-22): generate from structured SUPPORTED CLAIMS plus PRESENTATION INTENT, never free prose from evidence adjacency. The generator returns text fragments plus claim bindings; bindings are validated deterministically; dangling citations fail closed; semantic verification is defense in depth only.
12. Three-state owner intent (2026-09-22): OBSERVED WORLD / OWNER INTENT / GENERATED PRESENTATION are distinct states. Never mutate source observations on customization. CONFIRM/CORRECT/HIDE/SHOW/FEATURE/REORDER are typed operations; friction maps to consequence (low -> preview+undo; medium -> explicit confirmation; high -> explicit authorization).
13. Regeneration rule (2026-09-22): never edit generated output; recompute from GRAPH SNAPSHOT + OWNER INTENT + DESIGN TOKENS + VIEWER/CHANNEL + RENDERER VERSION. Same inputs -> same SiteSpec; same SiteSpec + projection + viewer + renderer -> same semantic render. Volatile telemetry and timestamps stay outside hashes.
14. Identity law (2026-09-22, from IDENTITY-03): ID formats change only via a versioned identity domain with a migration plan; historical rows are never reminted.
15. Shared projection policy (2026-09-22): OBJECT + VIEWER + CAPABILITY + FIELD VISIBILITY -> ALLOWED VIEW, applied consistently by the renderer, Ask FYD, search, Circle, agent context, and protocol projections. DATA NOT PRESENT beats prompt instruction.
16. Digest discipline (2026-09-21): any lane that reports a digest commits the exact digest algorithm/script with it, or points at the shared digest implementation. A bare digest string with no algorithm is not evidence.

---

## CURRENT VERIFIED FRONTIER (short; operators read this first; evidence, not aspirations)

- Canonical suite: 195/195 PASS (includes Ask 36/36), 2026-09-21. Renderer/browser boundary: URL safety PASS, hostile probe PARTIAL (javascript: href sink OPEN per FL-20260921-032), desktop PASS, mobile PASS (min-w-0 fix committed 2026-09-21 as 8a997421ef5f121f114d948c693391f1a9c7c66e, exactly one file staged).
- Binding verifier WIRED; unbound factual claim test PASS; owner address override PASS (render); semantic determinism PASS (same graph + SiteSpec + viewer context + renderer version -> same semantic render model).
- Ask FYD: input interface exists (AskFydContextInput, single builder); output contract implemented per claim (AskAnswer: answer + evidence_refs + source_urls + claim classifications + unknowns + suggested actions, all non-optional); negative test proven (services-evidence.test.ts 2/2 PASS 2026-09-21: honest refusal with zero invented services; positive test with cited classified sourced answer).
- Claim classification vocabulary: DIRECT / DERIVED / INFERRED / GENERATED_PRESENTATION / OWNER_AUTHORED. Ask FYD question classes: SUPPORTED / DERIVED (labeled) / UNKNOWN; never inference as fact.
- Replay proof: Happy Place only (scoped replay from persisted history through the reducer into an empty disposable projection, byte-identical across two runs: REPLAY DIGEST MATCH, REPLAYED UI MATCH).
- Live Oracle: disk reclamation 80% -> 56% (~11 GB, 2026-09-22); both gateway containers healthy, zero restarts; deployment provenance gap OPEN (NOW-6).
- What is NOT proven: Service objects in either production graph (NOW-1/NOW-2; first product blocker); acquisition bytes->observations->evidence contract (NOW-1); WHY THIS? visible interaction; owner correction flow; changed-source regeneration; Coppersmith replay; second observation + diff; FYD-035 device proof (NOW-10).

---

## ONE-GRILL POINTER

The one active operator decision surface is `~/workspace/GRILLING-BRIEF.md`. Do not create another grill. New consequential operator questions (deployment provenance, G2 identity-era dedup, G4 agent-to-tenant authority, media rights, Automerge/no-CRDT scope) were added there by this reconstruction.

---

# FYD SOCIAL - EXECUTION LANE (by primitive stage, per 2026-09-22 build order)

Merged from: fyd-acquisition-sitespec-renderer-registry.md, fyd-ask-owner-media-evidence.md, reconciliation-failure-dogfood-validation-ergonomics.md, plus the standing historical items FYD-001..027, 033..038. Item IDs are preserved from the archaeology reports so cross-references stay intact; where two reports covered the same primitive, the items are merged under one line and the merge is noted.

## P1. ACQUISITION CONTRACT - FYD-002 is the true root

- **FYD-002** (P1, OPEN): acquisition output contract. Source bytes -> parsed observations -> evidence entries, machine-walkable, for one real URL. The three PROVE sub-steps below are its acceptance path; they collapse into this one contract when it lands. Wording refined per 2026-09-22 directive (the true root); replaces "acquisition emits prose, not schema" phrasing. Smallest executable acquisition artifact, conceptually: AcquisitionResult { source, fetched resources, content digests, parser/version, observations, acquisition timestamp }. SEARCH FIRST before inventing this interface: observation, acquisition, evidence, source, provenance, crawl, fetch, receipt, artifact. Harvest existing PING authority; do not separately invent "service crawl logic." No generated prose is allowed to masquerade as acquisition.
- **acq-observedat-digest-observations** (P2, PROVE): ObservedAt (canonical), digest per observation, observation IDs in the 200-record archive. Test: run acquisition; for one target URL, point at the stored source bytes, parsed observations, evidence entries, and verify each hop resolves mechanically.
- **acq-crawl-recipe-artifact** (P3, PROVE): crawl recipes (route selection, renderer tier, JS tier, media tier, auth, crawl budget) as a first-class replayable artifact. Test: take the Happy Place capture script, parameterize it into a crawl-recipe object, and replay it; assert identical extracted evidence set modulo volatile timestamps.
- **FYD-004** (P2, OPEN): crawl scope policy. Acquisition captures homepage + obvious pages; business services live on /services or subpages. Does acquisition fetch them? Policy: acquisition must traverse internal navigation to find service pages; services page missing entirely is an evidence gap, not a refusal to look. (Also NEXT.) Explicit discovery policy for the product proof: START URL -> homepage -> deterministically discovered high-value internal links (services, products, about, team, locations, contact), using sitemap, navigation, JSON-LD references, canonical links, and structured link semantics BEFORE AI. Depth and page budget stay bounded. We are NOT building a crawler platform; we are acquiring enough evidence to understand a business.
- **acq-real-capture-service-gap** (P1, OPEN): Tier-1 extractor exists and passed synthetic tests, but the real Happy Place and Coppersmith captures produced zero Service/Offer objects. Broken boundary is acquisition evidence -> Service-object compilation, not Ask FYD composition. NEXT FALSIFICATION: a real capture produces Service/Offer objects with provenance.
- **acq-hostile-input-fixtures** (P2, DONE_VERIFIED): hostile-ownership.test.ts PASS; html-sanitizer.test.ts PASS; extraction pipeline handles hostile HTML and hostile owner input.
- **escalation-ssrf-media-fetch** (P1, PROVE): SSRF-proofing for all outbound fetches (media fetch, crawl, renderer tiers) needs an isolated test with a crafted hostile target; cannot be proven on the live stack. (Also listed under security escalation.)
- **escalation-stack-pinned** (P2, DONE_VERIFIED): HTTP client pinned (ky 1.9.0), SSRF allowlist module, content-type guard, redirect cap 3, 404 retry suppression (proven in escalation-3 test).
- **escalation-benchmark-trigger** (P3, DECISION): whether an alternative engine (Lightpanda/Crawl4AI) may be considered is gated on documented failures of the current stack. Nolan's call already made 2026-09-22: alternatives stay trigger-gated.
- **escalation-no-circumvention** (P3, DECISION): NO circumvention of anti-bot or access controls, even when an alternative engine is authorized. Standing law.
- **escalation-crawl4ai-design-harvest** (P2, HARVEST): Crawl4AI 0.9.3 (Apache-2.0): SSRF destination validation, declarative request trust boundary, DomainMapper/AsyncUrlSeeder discovery, Shadow DOM flattening, CMP list, 3-tier anti-bot detection (telemetry only). REJECT: pip import into TS runtime, LLM extraction, Docker server, anti-bot circumvention, check_robots_txt=false.
- **escalation-lightpanda-ladder** (P3, HARVEST): Lightpanda 0.2.8 (Apache-2.0): conditional future tier under documented failures. REJECT: headless-shell=true, --disable-web-security, --proxy-server, --host-resolver-rules, --no-sandbox, any bypass.

## P2. EVIDENCE-BACKED OBJECT COMPILATION

- **FYD-001 + FYD-003** (P1, OPEN): one proof, the minimum Service object. The fixed question "What services does this business offer, and how do you know?" must be answerable from both real graphs. Minimum: object id, schema type, name, relationship (Business -> offers -> Service), claim/evidence bindings per factual field. Proof: both site graphs list Service objects with evidence_refs resolving to real source URLs. Depends on NOW-1. (Historical: FYD-001 was "object graph of a business"; FYD-003 was "compile an existing website"; merged by directive into one proof. The crucial part is not fields. It is: WHAT OBSERVATION CAUSED THIS OBJECT TO EXIST? Start deterministic. Candidate Service can originate from: schema.org Service; schema.org Offer/Product where semantically applicable; structured service lists; repeated service headings/links; explicit service page titles/headings. Do not turn arbitrary marketing prose into DIRECT Service facts. Require DETERMINISTIC WHEN UNAMBIGUOUS, INTELLIGENCE WHEN AMBIGUOUS: an <h2>Emergency Plumbing</h2> may deterministically produce a candidate; a paragraph describing ten activities without explicit structure may require intelligence to propose candidates; but AI output enters as PROPOSED / INFERRED until accepted by policy/owner/evidence rules. This gives optionality without sacrificing truth. Classifications must have executable admission rules (see FYD-026).
- **acq-tier1-service-offer-extraction** (P1, IN_PROGRESS): Tier-1 JSON-LD Service/Offer extraction implemented in the graph builder; extraction-test.test.ts synthetic Service/Offer PASS; real captures still yield zero. Next: close the real-capture gap above.
- **acq-service-schema-ids** (P2, DONE_VERIFIED): JSON-LD typed on schema.org Service/Offer, explicit graph IDs; the services-evidence test asserts real graph IDs (not stringified JSON).
- **acq-extraction-rule-tiers** (P2, PROVE): tier-1 (explicit JSON-LD) vs tier-2/3 (inference heuristics) must be a visible, tested contract with rule IDs, tier labels, and the Ask FYD question classes. Test: Ask FYD over an extraction where the same field came from tier-1 vs tier-2 yields different classification.
- **acq-extraction-field-classes** (P2, DONE_VERIFIED): tier-1 JSON-LD (services, offers, prices) vs tier-2 microdata vs tier-3 heuristics (name, tagline, services, navigation), explicit labels on each extracted field.
- **acq-description-prose-mining** (P2, DECISION): "mine descriptions/prose" is NOT a valid answer-layer step. Descriptions may be mined as evidence at extraction time (tier-labeled); the answer layer never generates new facts from prose. Standing decision.
- **objectgraph-predicate-vocabulary** (P2, IN_PROGRESS): service predicates drift between provides / offers / makes_offer / serves_area; the same service may be reachable under multiple predicates. NEXT FALSIFICATION: a new crawl introduces a fifth service predicate without updating the canonical vocabulary.
- **objectgraph-schema-id-drift** (P1, BLOCKED): IDs arrive embedded in schema.org JSON-LD (@id values like "object/abc" or "#service"); no evidence any object carries a stable UUID v5/v7 canonical ID as required by canonical ID bytes. Fix is in the graph builder.
- **objectgraph-relate-output-dropped** (P3, OPEN): objectgraph-relate.test.ts emits 8 candidates; only 3 used; 5 dropped in "unused candidates" (observed, not asserted). Why? If intentional, the selection criteria should be visible; if accidental, candidates are silently dropped.
- **objectgraph-deterministic-ids** (P2, DONE_VERIFIED): deterministic object IDs; same source object always same ID.
- **objectgraph-schema-to-everything** (P2, DONE_VERIFIED): schema.org JSON-LD first-class; object-schema.test.ts PASS; explicit typed schema on ingestion.
- **objectgraph-useful-schemas-set** (P3, HARVEST): the "useful schemas" set from fyd-lane/harvest is research only until a schema actually ships as an object type with a defined contract.
- **objectgraph-provider-account-identity** (P3, OPEN): ProviderAccount relationship modeling exists but is not wired to anything; open until FYD commits to the model or removes it.
- **objectgraph-entity-resolution** (P2, OPEN): entity resolution strategy is unwritten; same business across source pages could become multiple objects. Merged with social IDN-02 (same gap from the social side; 2->1).
- **objectgraph-object-in-margin** (P1, IN_PROGRESS): the end-to-end product proof "object in -> object out in margin" is in flight; object appears in margin via FydCircle; full loop still depends on the real-capture Service gap.

## P3. TRUSTED PROJECTION / CLAIM BINDING

- **GEN-CONSTRAINT** (P1, IN_PROGRESS): structured generation with deterministic claim-binding validation (standing rule, directive 5). Supersedes the rejected FYD-008 universal generated-prose verifier. Generator takes structured SUPPORTED CLAIMS plus PRESENTATION INTENT and returns text fragments plus claim bindings; the bindings are validated deterministically; dangling citations fail closed; semantic verification is defense in depth only. Ask FYD answer path covered first. (NOW-4.)
- **FYD-009** (P1, OPEN): cited evidence_refs existence check. Every evidence_ref in Ask FYD output resolves in the target graph snapshot, else FAIL CLOSED. (NOW-3.)
- **FYD-008** (P1, SUPERSEDED): the universal generated-prose semantic verifier was rejected 2026-09-22 as an open-ended semantic problem. Superseded by GEN-CONSTRAINT. Recorded here so no future reader re-opens it.
- **sitespec-spec-is-data** (P1, DONE_VERIFIED): SiteSpec is data (never business truth, never generated JSX); sitespec.test.ts PASS.
- **sitespec-schema-evolution-law** (P2, DONE_VERIFIED): SiteSpec schema evolution law (spec.version, compatibility bands) recorded in this file's regen lineage and in sitespec docs.
- **sitespec-canonical-serialization-digest** (P1, DONE_VERIFIED): canonical SiteSpec serialization -> SHA-256 digest; test in sitespec.test.ts; digest used as canonicalSiteSpecDigest for SitePatch proposals.
- **sitespec-eligibility-contract** (P2, DONE_VERIFIED): SiteSpec section -> renderer component eligibility contract recorded; unknown content fails closed (registry-unknown-component).
- **sitespec-dependency-manifest** (P2, DONE_VERIFIED): SiteSpec section dependency manifest recorded (declared dependency names; components declare dependencies; renderer checks manifest).
- **sitespec-confidence-law** (P2, DONE_VERIFIED): confidence law recorded (high-confidence rendering vs low-confidence display), from the 2026-09-21 grill.
- **sitespec-must-win-density** (P2, DONE_VERIFIED): "must-win density" criterion recorded (every SiteSpec must render complete above the fold without interaction), from the 2026-09-21 grill.
- **sitespec-navigation-derived** (P3, DONE_VERIFIED): navigation sections always derived from the sections array, recorded from the 2026-09-21 grill.
- **sitespec-design-tokens** (P3, DONE_VERIFIED): design tokens first-class in SiteSpec, recorded from the 2026-09-21 grill.
- **sitespec-objectfeed-external-identity** (P1, OPEN): Coppersmith Explore page ObjectFeed contains externally-identified components, which the builder validation rejects (reapply-checklist.md line 12). Emitted-but-invalid graph content: the feed emitted the objects, the validation layer rejects them. Fix: planner emits valid ObjectFeed or the validation accepts externally-identified components. (FL-20260921-031.)
- **shared-projection-policy** (P2, OPEN): OBJECT + VIEWER + CAPABILITY + FIELD VISIBILITY -> ALLOWED VIEW, applied consistently by the renderer, Ask FYD, search, Circle, agent context, and protocol projections (directive 14). The Ask FYD and owner projection evidence below are its first two implementations.
- **askfyd-owner-context-mode** (P2, PROVE): owner-only context mode is defined, but the defined owner-context Ask pathway was not directly tested (reapply-checklist.md E2 "OWNER CONTEXT MODE" was skipped). Test: feed an Ask FYD question through the defined owner-context pathway and verify owner-visible fields render while public mode stays gated.
- **FYD-011** (P1, IN_PROGRESS): conflict is a property of evidence, not a new ClaimAuthority (No-ClaimAuthority, directive 6). Proven: conflict machinery in the evidence module (both observations preserved with classification; evidence-source-disagreement, evidence-owner-confirmation-correction DONE_VERIFIED). OPEN: Ask FYD conflict surfacing (askfyd-conflict-surfacing) - no test shows Ask presenting a flagged conflict. Merge: 3 report records -> 1 item.
- **FYD-013** (P2, OPEN): stale/superseded evidence policy. Evidence carries version/as_of; a binding against superseded evidence fails closed or marks stale. Related: evidence-freshness-supersession (IN_PROGRESS) below.
- **FYD-015** (P2, OPEN): machine-walkable lineage test. For every factual claim on the Happy Place homepage, walk value -> object field -> claim -> evidence -> observation -> source URL; every hop resolves mechanically, no prose bridging. Also NEXT.
- **FYD-005** (P1, PROVE): Ask FYD input contract. Input interface exists (AskFydContextInput, single builder); no test proves the builder emits only declared fields. Test: builder -> field-by-field assertion against the input contract. Also NEXT.
- **FYD-006** (P2, PROVE): Ask FYD answer schema gaps. Output contract implemented per claim (answer, evidence_refs, source_urls, classifications, unknowns, suggested actions, all non-optional); gaps remain: suggested_actions shape, unknown-question semantics, cross-object synthesis provenance, conflict presentation. Merge: askfyd-answer-schema-gaps + registry-askfyd-answer-shape (2->1).
- **askfyd-cross-object-reasoning** (P2, OPEN): no test shows Ask FYD reasoning across objects (Business -> Service -> Offer) with provenance preserved per hop.
- **askfyd-prompt-hijack-guards** (P1, PROVE): prompt-injection guard (DATA NOT PRESENT beats prompt instruction, directive 14) defined but not tested against hostile owner/business content. Test: owner input attempting to inject claims or reveal hidden fields; assert the gate holds.
- **askfyd-suggested-actions** (P2, IN_PROGRESS): suggested_actions exist in the contract; no test shows them grounded in real object state (e.g., "book this service" only when an Offer with bookability evidence exists).
- **FYD-014** (P2, IN_PROGRESS): WHY THIS? bindings exist (evidence bindings from render to claims); the visible browser interaction is not proven. Also NEXT.
- **evidence-corrupt-projection** (P1, IN_PROGRESS): corrupt/partial projection must produce a typed fail-closed result, not silent partial rendering. The renderer correctly renders missing data as neutral states (renderer-missing-data DONE_VERIFIED); the typed failure semantic for corrupt projection is still unproven.
- **evidence-evidence-replay** (P3, OPEN): whether evidence replay (given a graph snapshot, re-derive the evidence chain deterministically) is in scope is unwritten.
- **evidence-fact-classifications** (P2, DONE_VERIFIED): claim classifications enforced (DIRECT / DERIVED / INFERRED / GENERATED_PRESENTATION / OWNER_AUTHORED); claim-classification.test.ts.
- **evidence-observation-envelope** (P2, DONE_VERIFIED): observation envelope (source bytes hash + digest + canonical identity bytes) exists in the evidence module.
- **evidence-binding-verifier-invariant** (P1, DONE_VERIFIED): binding verifier exists and is wired (verifyPresentationBinding); one unbound-factual-claim test PASS.
- **evidence-freshness-supersession** (P2, IN_PROGRESS): evidence freshness machinery partially proven; binding against superseded evidence still OPEN (see FYD-013).
- **evidence-deletion-revocation** (P3, OPEN): what happens to claims and bindings when the underlying observation is deleted or the source revoked is unwritten.
- **evidence-canonical-serializer** (P1, DONE_VERIFIED): canonical evidence serialization exists (canonical serializer in the evidence module).
- **evidence-semantic-determinism** (P2, DONE_VERIFIED): semantic determinism PASS on the browser boundary (same graph + SiteSpec + viewer context + renderer version -> same semantic render model).
- **evidence-single-authority** (P1, IN_PROGRESS): evidence as the single authority is partially proven; the no-second-authority audit (xcut-no-second-authority-audit, HARVEST) defines how to scan the stack for competing fact-stores.
- **xcut-no-second-authority-audit** (P2, HARVEST): audit procedure for detecting competing fact-stores (per Rule of One). Run before any new data store is introduced.
- **askfyd-outcome-history** (P3, OPEN): Ask FYD answer history / outcome tracking is not part of the current contract.

## P4. OWNER INTENT / OVERRIDES (three distinct states; directive 7)

- **owner-patch-loop-persistence** (P1, IN_PROGRESS): owner proposal -> approval -> deterministic apply -> refresh persistence is proven in tests but not as a persistent loop (the 2026-09-21 reapply work proved digest-bound approval in tests; the live owner persistence previously failed because demo owner mode was absent from the server environment).
- **owner-approval-digest-binding** (P1, DONE_VERIFIED): proposal approval binds the exact proposed transition digest; tenant-scoped.
- **owner-demo-owner-mode** (P1, IN_PROGRESS): owner mode in the demo/server environment; the failure mode that blocked live persistence earlier.
- **owner-claim-verification-ladder** (P2, IN_PROGRESS): claim verification ladder for owner-authored content (owner claims enter as OWNER_AUTHORED, not DIRECT).
- **owner-correction-side-by-side** (P1, DONE_VERIFIED): owner corrections preserve source and owner values side by side; correction never deletes the observation (No-ClaimAuthority moat in action).
- **owner-confirm-correct-hide** (P2, IN_PROGRESS): CONFIRM/CORRECT/HIDE/SHOW/FEATURE/REORDER typed operations partially implemented; full typed-op coverage OPEN.
- **owner-regeneration-survival** (P1, IN_PROGRESS): owner customizations survive regeneration; the changed-source fixture (FYD-021, NOW-8) is the acceptance proof.
- **owner-visibility-not-fact** (P2, PROVE): visibility is not a fact (HIDE does not delete the observation); test: hidden field remains in the observed world and re-renders when un-hidden.
- **owner-design-tokens** (P3, IN_PROGRESS): design-token customization surface exists in SiteSpec; owner-facing controls OPEN.
- **owner-tenant-scoping** (P1, DONE_VERIFIED): owner proposals are tenant-scoped; cross-tenant proposal application is rejected.
- **FYD-016** (P1, PROVE): owner address override survival. Render boundary passed (OWNER ADDRESS OVERRIDE PASS); the open step is survival across changed-source regeneration. (Also NEXT.)
- **FYD-017** (P2, PROVE): observed/visibility/presentation stored as three separate fields. Test: one field with divergent observed vs owner-confirmed vs presented values; assert all three persist separately. (Also NEXT.)
- **FYD-018** (P2, IN_PROGRESS): owner correction record shape (target, before, after, classification, timestamp, actor) partially proven via tests; full flow unproven. (Also NEXT.)
- **FYD-019** (P1, OPEN): "move emergency plumbing to the top" end to end: proposal -> approval -> deterministic apply -> refresh persistence. The canonical owner-intent proof. (Also NEXT.)
- **FYD-020** (P2, DEFERRED): multi-owner governance. DEFERRED per directive 8; MVP has one authoritative owner. The historical "competing owner overrides rule" wording is SUPERSEDED by this decision (see HISTORICAL RECONCILIATION).
- **THREE-STATE** (P1, DECISION): standing law (directive 7): OBSERVED WORLD / OWNER INTENT / GENERATED PRESENTATION are distinct states; CONFIRM/CORRECT/HIDE/SHOW/FEATURE/REORDER are typed operations; friction maps to consequence (low -> preview+undo; medium -> explicit confirmation; high -> explicit authorization). Installed by this reconstruction; the PROVE items above are its tests.
- **media-managed-derivatives** (P1, DONE_VERIFIED): media managed-derivative pipeline exists. Merged with social MEDIA-01 (same primitive; 2->1).
- **media-ssrf-boundary** (P1, DONE_VERIFIED): media fetch SSRF boundary (declarative allowlist) proven in the escalation-3 test.
- **media-rights-policy** (P2, DECISION): production media rights/retention policy for real owner media is unwritten. Added to the Grill as MEDIA-RIGHTS-001 (consequential, needs Nolan's call).
- **media-alt-text-depiction** (P3, OPEN): alt-text/depiction accuracy for generated and owner media is untested.
- **media-hero-selection** (P2, OPEN): hero image selection rules are unwritten.
- **media-relationship-id-collision** (P3, OPEN): media relationship ID collision handling is unwritten.
- **media-refresh-and-stale** (P2, IN_PROGRESS): media refresh and staleness handling partially implemented.
- **media-hotlink-fallback** (P3, OPEN): hotlink fallback behavior is unwritten.
- **media-owner-removal** (P2, OPEN): owner removal of media (takedown path, evidence of removal) is unwritten.
- **sitespec-owner-patch-loop** (P2, DONE_VERIFIED): SiteSpec owner patch loop (propose -> digest -> approve -> apply) proven in tests.
- **sitespec-correction-survives-regen** (P1, PROVE): owner corrections survive regeneration; acceptance is the FYD-021 fixture.
- **xcut-onboarding-anonymous-preview** (P2, DONE_VERIFIED): anonymous preview before registration (value precedes friction) is the onboarding shape.
- **xcut-vercel-ai-sdk-adoption** (P2, HARVEST): Vercel AI SDK (MIT, ai@7.x) is the provider-abstraction + structured-output transport for the day Ask FYD goes model-backed. ADOPT when the intelligence lane needs a model, not before; no model calls today means the dep buys nothing now. (See Harvest Register.)
- **xcut-jsonrender-puck-primitives** (P2, HARVEST): json-render typed catalog + Puck component-config patterns for the registry vocabulary and a future human visual-editing surface. ADAPT patterns, REJECT the npm deps (json-render: React 19 peer clash with FYD's 18.3.1, pre-1.0 churn; Puck: model mismatch, SiteSpec->Puck projection must be lossy-by-design and never persisted). (See Harvest Register.)

## P5. REGENERATION (the moat; directive 9)

- **REGEN-RULE** (P1, DECISION): standing law (directive 9): never edit generated output; recompute from GRAPH SNAPSHOT + OWNER INTENT + DESIGN TOKENS + VIEWER/CHANNEL + RENDERER VERSION. Determinism compiler invariants: same inputs -> same SiteSpec; same SiteSpec + projection + viewer + renderer -> same semantic render. Volatile telemetry/timestamps stay outside hashes. WHY THIS? is tertiary UX. Installed by this reconstruction; the PROVE items below are its tests.
- **FYD-021** (P2, PROVE): changed-source regeneration fixture (see NOW-8). (Also NOW.)
- **FYD-022** (P2, OPEN): regeneration provenance. Every changed value carries a change record: cause (source/owner/generated), old, new, evidence ref. (Also NEXT.)
- **FYD-023** (P2, PROVE): SiteSpec generation determinism. Test: same graph -> byte-identical SiteSpec across two runs. (Also NEXT.)
- **FYD-024** (P2, OPEN): Ask FYD answers versioned against the graph snapshot; stale-mark on regeneration. (Also NEXT.)
- **FYD-025** (P2, IN_PROGRESS): semantic determinism as permanent canonical regression. Byte-determinism exists (evidence-semantic-determinism DONE_VERIFIED); standing regression wiring remains. (Also NEXT.)
- **FYD-026** (P2, PROVE): claim classifications enforced at write time. Test: write a claim without evidence binding; assert rejection. Only evidence-bound acceptance may set DIRECT. (Also NEXT.)

## P6. OPERATIONAL INTEGRITY (PING digest rule applies; directive 2 tail)

- **FYD-037** (P1, OPEN): wrong-journal fail-closed guard. Directive 10: urgent small independent safety lane. FYD overlay emit/dump must fail closed against a journal lacking the expected overlay marker. (Also NOW-9.)
- **FYD-036** (P2, PROVE): Coppersmith replay evidence. Scoped replay protocol: persisted history -> reducer -> empty disposable projection, two runs, REPLAY DIGEST MATCH + REPLAYED UI MATCH. (Also NEXT.)
- **FYD-038** (P2, OPEN): synthetic Happy Place service overlay must be labeled DEMO_SYNTHETIC or removed from the demo path. (Also NEXT.)
- **FYD-034** (P3, OPEN): inspect once, record, stop discussing. Directive 11. (Also NEXT.)
- **FYD-035** (P2, OPEN): Nolan's real device proof only; no more networking machinery. Directive 12. (Also NOW-10.)
- **FYD-027** (P2, IN_PROGRESS): canonical Ask FYD tests extended. Negative (honest refusal) DONE_VERIFIED 2026-09-21; positive evidence-grounded test gated on NOW-2. (Also NEXT.)
- **renderer-javascript-url-sink** (P1, DONE_VERIFIED 2026-09-23): the 2026-09-22 CONTRADICTION is resolved for the mechanism. Bounded falsification by the ping-perfecting-pass found NO sink: (a) the FL-20260921-032 regression suite `fyd-lane/safe-link.test.ts` run locally 2026-09-23 01:55 MDT (jest 29 + ts-jest 29, harness in `fyd-lane/.sink-probe`): **16/16 PASS** - the resolver rejects javascript: (plain, mixed-case, whitespace-prefixed, control-char-smuggled), data:/vbscript:/file:/blob:, percent-encoded scheme tricks, malformed URLs, non-string input, and relative URLs without an explicit safe base, across navigate/call/email capabilities, deterministically; (b) static audit of every `href={...}` in the three local renderer copies (`fyd-lane/repo`, `fyd-grill-contact/src`, `fyd-grill-compose/work`): every observed-data href interpolates only a value `resolveSafeLink` returned as `kind==="safe"`; no `dangerouslySetInnerHTML`, no `src={` interpolations; the only unguarded hrefs are internal routes (`"#ask"`, `"/o/" + encodeURIComponent(id)`), which carry no observed data. Ledger FL-20260921-032 updated to MECHANISM VERIFIED with a Pig-scoped residual: the end-to-end `step5-hostile.ts` rerun against regenerated fixtures on the Pig repo is still the live-path proof that the fix was applied there; this pass cannot touch the Pig, so Pig-side application remains unverified from here.
- **renderer-mobile-minw0** (P1, DONE_VERIFIED): mobile min-w-0 fix committed 2026-09-21 (8a997421ef5f121f114d948c693391f1a9c7c66e, exactly one file staged).
- **renderer-overflow-instrumentation** (P3, DONE_VERIFIED): overflow instrumentation in the renderer.
- **renderer-hostile-text-escaping** (P2, DONE_VERIFIED): hostile text escaping in renderer output.
- **renderer-missing-data** (P2, DONE_VERIFIED): missing data renders as neutral states, never as invented content.
- **renderer-render-model-fixtures** (P2, DONE_VERIFIED): render-model fixtures exist for the renderer.
- **renderer-responsive-matrix** (P2, DONE_VERIFIED): responsive render matrix proven (desktop + mobile PASS).
- **renderer-a11y-touch-motion** (P2, PROVE): accessibility/keyboard/screen-reader/touch and motion proofs are unwritten.
- **renderer-performance-budgets** (P3, PROVE): render performance budgets are unwritten.
- **registry-declared-contracts** (P2, IN_PROGRESS): registry declared contracts; unknown component fails closed (registry-unknown-component DONE_VERIFIED below).
- **registry-unknown-component** (P3, DONE_VERIFIED): unknown registry component fails closed.
- **registry-socialproof-dormant** (P3, OPEN): social-proof registry component is dormant; activation gated on real review/testimonial evidence.
- **registry-ai-vocabulary** (P3, HARVEST): AI vocabulary for the registry (json-render typed-catalog pattern); the tiny proof is a machine-readable catalog doc sketch, harvest-dir only.
- **registry-object-rail** (P3, DONE_VERIFIED): object rail registry component exists.
- **FL-20260922-002-invariant** (P3, OPEN): mechanical failure-evidence coupling. Durable invariant from the failure ledger: IF A GOVERNED EXECUTION FAILS, THE EXECUTION RESULT ITSELF SHOULD BE SUFFICIENT TO DERIVE THE FAILURE RECORD. Small PING hardening item, NOT a FYD P0; harvest current execution/event/failure machinery for the coupling rather than building a new failure system.
- **xcut-agent-execution-doctrine** (P3, DONE_VERIFIED): agent execution doctrine recorded (agent output != canonical truth).

---

# PING PLATFORM - RUNTIME/ECOSYSTEM BACKLOG

Merged from: ping-authority-identity-replay-era.md, mission-control-missions-runs-learning-health-agents.md, social-circle-node.md, protocols-harvest.md, security-tenancy-oracle-release-capabilities.md, reconciliation-failure-dogfood-validation-ergonomics.md. Item IDs preserved from the archaeology reports; merges noted inline. One line per item: ID, status, and the minimal actionable statement. Full evidence trails live in the reports.

## PING.A AUTHORITY, EVENT SPINE, IDENTITY, REPLAY, ERA, PRIVATE CONTEXT

### Authority and the event spine
- **AUTH-CONV-01** (IN_PROGRESS): Event Authority convergence is proven; total authority convergence is not. Do not generalize from the event proof.
- **AUTH-CONV-02** (OPEN): Rule-of-One audit of the 2026-09-21 era: scan for parallel authority implementations that the convergence claim may have missed.
- **AUTH-CONV-03** (OPEN): constitutional ownership map: which authority owns which capability, enforced not named.
- **AUTH-CONV-04** (IN_PROGRESS): capability/authority convergence continuing from the 2026-09-21 work.
- **AUTH-CONV-05** (OPEN): adapter vs duplicate classification for the remaining multi-implementation areas.
- **AUTH-CONV-06** (PROVE): sovereignty audit: declared authority must match actual capability ownership on the enforced path; audit bypass paths.
- **AUTH-CONV-07** (OPEN): archive/dead-code sweep only after deadness is proven per the no-amnesia rule.
- **AUTH-CONV-08** (OPEN): Mission Control authority posture: it must remain a projection, never another authority (see PING.B).
- **AUTH-CONV-09** (IN_PROGRESS): evidence authority vs observation authority boundary clarification.
- **AUTH-CONV-10** (OPEN): knowledge authority promotion path (see learning loop below).
- **EVENT-SPINE-01** (IN_PROGRESS): G1 append-only trigger ownership. Recorded as operationally resolved in the Grill 2026-09-22 (see ONE-GRILL pointer).
- **EVENT-SPINE-02** (DONE_VERIFIED): canonical event envelope and append-only journal semantics proven.
- **EVENT-SPINE-03** (OPEN): event-bus consolidation: no new EventBus; existing bus posture verified.
- **EVENT-SPINE-04** (DONE_VERIFIED): outbox pattern for event emission proven.
- **EVENT-SPINE-05** (IN_PROGRESS): exactly-once/ordering guarantees on the live path.
- **EVENT-SPINE-06** (IN_PROGRESS): event schema evolution policy.
- **EVENT-SPINE-07** (OPEN): event retention and compaction policy.
- **EVENT-SPINE-08** (OPEN): event replay for projections (disposable rebuilds).
- **EVENT-SPINE-09** (OPEN): event redaction policy for private data.
- **EVENT-SPINE-10** (DONE_VERIFIED): causal ordering on the proven path.
- **EVENT-SPINE-11** (OPEN): cross-tenant event isolation (gates second-tenant onboarding; see security).
- **EVENT-SPINE-12** (DONE_VERIFIED): installed 2026-09-22 as NORTH STAR rule 2 (STATUS LANGUAGE MUST MATCH PROVEN MECHANISM).

### Identity
- **IDENTITY-01** (DECISION): G2 cross-era identity/dedup is a consequential operator decision. Added to the Grill 2026-09-22; do not casually remint historical IDs in the meantime.
- **IDENTITY-02** (DONE_VERIFIED): canonical identity bytes documented for the current era.
- **IDENTITY-03** (DONE_VERIFIED): installed 2026-09-22 as NORTH STAR rule 14 (ID formats change only via a versioned identity domain with a migration plan; historical rows never reminted).
- **IDENTITY-04** (OPEN): cross-era identity mapping table (needed before any dedup execution).
- **IDENTITY-05** (DONE_VERIFIED): provider identity != canonical identity (social side; see IDN-01).
- **IDENTITY-06** (DONE_VERIFIED): deterministic ID generation path owned by the identity authority.
- **IDENTITY-07** (PROVE): no-silent-merge rule: prove the dedup path never fuzzy-merges people silently.
- **IDENTITY-08** (DEFERRED): generalized identity federation (deferred until two real tenants).

### Replay
- **REPLAY-01** (DONE_VERIFIED): scoped replay protocol proven on Happy Place (persisted history -> reducer -> empty disposable projection, byte-identical across two runs).
- **REPLAY-02** (DONE_VERIFIED): replay digest semantics (REPLAY DIGEST MATCH + REPLAYED UI MATCH vocabulary).
- **REPLAY-03** (DECISION): G3 replay-verification vocabulary recorded as operationally resolved in the Grill 2026-09-22: verified:true means provider-ok + zero violations + COMPLETE; test-mode seams labeled, never green.
- **REPLAY-04** (IN_PROGRESS): Coppersmith replay (see FYD-036; PROVE).
- **REPLAY-05** (OPEN): replay for the private owner/agent context (gated on the journal decision below).
- **REPLAY-06** (PROVE): replay equivalence proof for the Oracle migration path.

### Era
- **ERA-01** (IN_PROGRESS): era discipline: findings must carry era qualification (Pig-era vs Oracle-era vs convergence worktree).
- **ERA-02** (OPEN): era-transition runbook for the next gateway migration.
- **ERA-03** (BLOCKED): revision vocabulary: runtime vs certified vs deployed vs rollback revisions must be era-qualified; blocked on the deployment provenance decision (NOW-6).
- **ERA-04** (IN_PROGRESS): live-DB reality > current branch source > old audit docs (evidence precedence rule).
- **ERA-05** (DONE_VERIFIED): 2026-09-22 Oracle status: both gateways healthy on 3c5d280dd, disk 80% -> 56%.
- **ERA-06** (OPEN): era labels on all dated proof artifacts in this file's context coverage.

### Private owner/agent context
- **PRIV-01** (DECISION): G4 agent-to-tenant authority is a consequential operator decision. Added to the Grill 2026-09-22. Merged with ten-agent-tenant-binding (same decision; 2->1).
- **PRIV-02** (BLOCKED): dual-registry resolution (Mission Control registry vs runtime registry). Merged with ten-dual-registries (2->1); blocked on the single-writer decision (NOW-6).
- **PRIV-03** (OPEN): principal propagation shape. Merged with ten-principal-propagation (2->1).
- **PRIV-04** (OPEN): tenant-scoped replay evidence. Merged with ten-scoped-replay-evidence (2->1).
- **PRIV-05** (DECISION): private context canonical-journal vs operational-store decision is outstanding; needs Nolan's call after the provenance question settles.
- **PRIV-06** (OPEN): private context never leaks into public objects or public canonical events (enforcement audit).
- **PRIV-07** (PROVE): prove the private-context boundary on the live path (negative test: owner-private field must not appear in public projection).
- **PRIV-08** (DONE_VERIFIED): CG-001 boundary proven 2026-09-21.
- **PRIV-09** (PROVE): capability-gated private-context access (capability -> view mapping).

## PING.B MISSION CONTROL, MISSIONS, RUNS, LEARNING, HEALTH, AGENTS

- **MC-01** (IN_PROGRESS): phantom-surface fleet: per-surface contract map proving each Mission Control surface is truthful or labeled.
- **MC-02** (OPEN): deployed-branch truth uncertain: Mission Control must not claim deployment state it cannot verify.
- **MC-03** (OPEN): /system/state misleading collectors: remove or label every collector that cannot produce a real check.
- **MC-04** (OPEN): health honesty: Mission Control must not report green when no checks exist.
- **MC-05** (OPEN): Qdrant status must distinguish configured vs reachable vs used vs durable.
- **MC-06** (OPEN): Redis status must distinguish configured vs reachable vs used vs durable.
- **MC-07** (OPEN): seeded fictional canonical rows need explicit handling (labeled fixtures, never presented as live).
- **MC-08** (PROVE): proposal approval binds the exact proposed transition digest (same primitive as owner-approval-digest-binding, FYD side).
- **MC-09** (OPEN): knowledge promotion lacks a durable approval producer.
- **MC-10** (IN_PROGRESS): learning loop executes but does not compound in production.
- **MC-11** (OPEN): no emitter may mint VERIFIED; audit all emitters.
- **MC-12** (OPEN): Mission, Run, and Execution are distinct concepts; competing schemes must converge.
- **MC-13** (OPEN): competing mission schemes: unify or explicitly bound.
- **MC-14** (OPEN): competing work-order schemes: unify or explicitly bound.
- **MC-15** (OPEN): competing retry schemes: unify or explicitly bound.
- **MC-16** (OPEN): competing identity schemes for work: unify or explicitly bound.
- **MC-17** (PROVE): /system/state honesty test: every collector either returns a real check or is removed.
- **MC-18** (OPEN): deployment-state surface: bound to what can actually be verified (see NOW-6).
- **MC-19** (OPEN): projection-vs-authority: Mission Control is a projection, never another authority.
- **MC-20** (OPEN): mission ledger vs event journal boundary.
- **MC-21** (OPEN): run resumption semantics after failure.
- **MC-22** (OPEN): agent-to-tenant authority enforcement on the mission path (links G4).
- **MC-23** (OPEN): mission capability gating (capability -> allowed actions).
- **MC-24** (OPEN): mission evidence requirements before completion claims.
- **MC-25** (PROVE): VERIFIED-mint audit: scan all emitters for VERIFIED claims without proof.
- **MC-26** (OPEN): learning-loop compounding: promotions must be durable and attributable.
- **MC-27** (OPEN): knowledge promotion approval producer (durable, named).
- **MC-28** (OPEN): failure classification vocabulary shared with the failure ledger (FL-20260922-002 invariant).
- **MC-29** (OPEN): mission cost accounting hooks (see cost section).
- **MC-30** (OPEN): mission timeout and lease semantics.
- **MC-31** (OPEN): mission cancellation vs completion vs abandonment states.
- **MC-32** (OPEN): run identity vs mission identity (distinct IDs, linked).
- **MC-33** (OPEN): execution identity vs run identity (distinct IDs, linked).
- **MC-34** (OPEN): agent identity on the execution path.
- **MC-35** (OPEN): agent capability grants are bounded and auditable.
- **MC-36** (OPEN): agent output != canonical truth (doctrine recorded; enforcement audit).
- **MC-37** (OPEN): human-approval binding for agent proposals (digest-bound).
- **MC-38** (OPEN): agent action receipts (what was done, by which capability, with what evidence).
- **MC-39** (OPEN): capability history per agent (auditable).
- **MC-40** (OPEN): outcome history per agent action (compounding asset per 2026-09-22 harvest buckets).
- **MC-41** (OPEN): health check registry: every subsystem declares its checks.
- **MC-42** (OPEN): health check honesty: UNKNOWN when no check exists, never green.
- **MC-43** (OPEN): degraded-mode semantics: what the gateway may and may not do degraded.
- **MC-44** (OPEN): degraded-mode labeling on every surface.
- **MC-45** (OPEN): startup dependency ordering (PG readiness before gateway boot; the 2026-09-13 degraded in-memory incident).
- **MC-46** (OPEN): readiness vs liveness probes on the gateway.
- **MC-47** (OPEN): deployment registry population (currently zero rows; see NOW-6).
- **MC-48** (OPEN): certified vs rollback image lifecycle.
- **MC-49** (OPEN): migration compatibility proof as release certification (see security).
- **MC-50** (OPEN): business-path proof as release certification (the two-tenant customer loop).
- **MC-51** (OPEN): fixture execution mandatory in release certification (migration/trigger fixtures).
- **MC-52** (OPEN): release certification distinguishes source, distribution, build, runtime, restart, migration compatibility, and business-path proof.
- **MC-53** (OPEN): single-writer posture enforcement (see NOW-6).
- **MC-54** (OPEN): capability machinery convergence (no duplicate capability stores).
- **MC-55** (OPEN): /tmp-only release configuration replaced with persistent Docker configuration.
- **MC-56** (OPEN): two gateways against one database violates the desired single-writer posture (see NOW-6).
- **MC-57** (OPEN): restart provenance recorded per revision (who/what promoted, when, from which evidence).
- **MC-58** (OPEN): rollback runbook tested, not just documented.

## PING.C SOCIAL, CIRCLE, NODE, RELATIONSHIPS, CAMPAIGNS

Frozen posture: public-social adapter work stays frozen until the two-tenant customer loop is proven (Nolan's directive). No generalized adapter before two real adapters exist. Patterns may be harvested (Farcaster Frames), never implemented.

### Social and Circle surfaces
- **SOC-01** (OPEN): true FydCircle exists; prior wired surfaces used rectangular ObjectCircle. Wire the real primitive.
- **SOC-02** (OPEN): Circle Ask incorrectly used the projection object ID as siteId. Fix the parameter binding.
- **SOC-03** (OPEN): related-object loaders were slug-keyed and owner-business-only. Rebuild on object IDs.
- **SOC-04** (OPEN): related object IDs could 404. Every related candidate must resolve or be excluded with reason.
- **SOC-05** (PROVE): honest related candidates: Happy Place 2, Coppersmith 3. Test that the candidate set is exactly the real related set.
- **SOC-06** (OPEN): canonical reply write predicate is replies_to; replies may be a read-only alias. Enforce on write.
- **SOC-07** (OPEN): OBSERVE and ACT are separate capabilities; a follow on PING never authorizes a provider-side follow.
- **SOC-08** (OPEN): cross-network actions gated by the provider capability matrix.
- **SOC-09** (OPEN): never covert scraping, no access-control bypass, no unbounded mass social actions, no fake social accounts.
- **SOC-10** (OPEN): Circle -> Node path proven for the two-tenant loop (Nolan's end-to-end requirement).
- **SOC-11** (OPEN): Node identity: provider identity is not canonical identity.
- **SOC-12** (OPEN): Node profile fields bound to evidence like any other object.
- **SOC-13** (OPEN): Node ask surface shares the Ask FYD answer contract (evidence_refs, classifications).
- **SOC-14** (OPEN): social projections use the shared projection policy (OBJECT + VIEWER + CAPABILITY + FIELD VISIBILITY -> ALLOWED VIEW).
- **SOC-15** (OPEN): social object visibility respects the field-level privacy gate.
- **SOC-16** (OPEN): circle membership is a capability-gated relationship, not a boolean flag.
- **SOC-17** (OPEN): circle invitation/acceptance is a typed transition with digest-bound approval.
- **SOC-18** (OPEN): circle -> node -> business linkage uses real object IDs end to end.
- **SOC-19** (OPEN): object-in-margin via FydCircle (see objectgraph-object-in-margin; the social-side wiring).
- **SOC-20** (OPEN): circle feed is a projection, not a second authority (no FeedAuthority).
- **SOC-21** (OPEN): social proof surface gated on real evidence (registry-socialproof-dormant, FYD side).
- **SOC-22** (DEFERRED): generalized social adapter (deferred until two real adapters exist).
- **SOC-23** (DEFERRED): public social observation adapters (ATProto, ActivityPub, Nostr, Farcaster, RSS; frozen per OBS-01).

### Relationships
- **REL-01** (OPEN): relationship write predicates are canonical; read aliases are explicitly marked.
- **REL-02** (OPEN): relationship evidence: who asserted this relationship, with what evidence.
- **REL-03** (OPEN): relationship visibility follows the shared projection policy.
- **REL-04** (OPEN): no RelationshipAuthority: relationships live in the object graph under the evidence authority.
- **REL-05** (OPEN): relationship revocation is a typed transition, not a delete.
- **REL-06** (DONE_VERIFIED): relationship immutable identity proven (rel-immutable-identity).

### Observation and identity (social side)
- **OBS-01** (DEFERRED): public social observation frozen until the two-tenant customer loop is proven. Merged with xcut-social-projections-later (same freeze; 2->1).
- **OBS-02** (OPEN): observation vs action separation enforced on every social path.
- **OBS-03** (OPEN): observation provenance: every observed social object carries source and capture evidence.
- **OBS-04** (OPEN): no silent fuzzy-merge of people (see IDENTITY-07).
- **OBS-05** (OPEN): provider account linkage is explicit, never inferred identity.
- **OBS-06** (OPEN): observation freshness and supersession for social objects.
- **OBS-07** (OPEN): social observation rate limits and politeness (no covert scraping).
- **OBS-08** (PROVE): facebook-source-real-path: the Facebook source path needs a real-path proof before any adapter claims.
- **OBS-09** (PROVE): feed-emission-vs-acquisition-gap: acquired feed XML must parse into claims, not silently yield nothing (see reg-feed-emission in Harvest Register).
- **OBS-10** (OPEN): social search uses the shared projection policy (no separate search authority).
- **IDN-01** (DONE_VERIFIED): provider identity != canonical identity.
- **IDN-02**: merged into objectgraph-entity-resolution (same gap; 2->1).
- **IDN-03** (OPEN): identity resolution audit trail for social objects.
- **IDN-04** (OPEN): cross-provider identity linkage requires explicit evidence.
- **XNA-01** (OPEN): cross-network action capability matrix defined per provider.
- **XNA-02** (OPEN): cross-network actions are typed transitions with receipts.
- **XNA-03** (OPEN): cross-network failure semantics (typed, deterministic).

### Campaigns
- **CMP-01** (OPEN): campaign intent is plain-English bounded action plan, never covert.
- **CMP-02** (OPEN): campaign actions are capability-gated and rate-bounded.
- **CMP-03** (OPEN): campaign evidence: what was done, to whom, with what authorization.
- **CMP-04** (OPEN): campaign stop conditions on platform restriction (fail closed).
- **CMP-05** (OPEN): no mass-action tooling without explicit per-action authorization.

### Media (social side)
- **MEDIA-01**: merged into media-managed-derivatives (same primitive; 2->1).
- **MEDIA-02** (OPEN): media provenance on social objects (source, capture, rights).
- **MEDIA-03** (OPEN): media rights policy enforcement (links MEDIA-RIGHTS-001 grill question).
- **MEDIA-04** (OPEN): media in social projections follows the shared projection policy.

## PING.D PROTOCOLS AND PROJECTIONS

Posture: protocols are projections of PING objects, never second authorities. No new EventBus, no new workflow engine, no new scheduler. MCP is a thin projection. ATProto lexicons validate the schema-first direction as patterns.

### ActivityPub
- **AP-01** (HARVEST): Fedify (@fedify/fedify 2.3.7 pin requires adoption-time verification) as the ActivityPub server framework; ADAPT patterns, verify version at adoption.
- **AP-02** (OPEN): PING object -> ActivityPub projection mapping (no second authority).
- **AP-03** (OPEN): ActivityPub inbox as an observation source (evidence-bound).
- **AP-04** (OPEN): ActivityPub outbox as a projection of typed transitions.
- **AP-05** (OPEN): remote interop deferred until the core loop is proven.
- **AP-06** (OPEN): WebFinger / actor discovery mapping.
- **AP-07** (OPEN): HTTP signatures for federation (no private-key storage in Postgres).
- **AP-08** (OPEN): content addressing for federated objects.
- **AP-09** (OPEN): federation blocklist/allowlist policy.

### ATProto
- **AT-01** (HARVEST): ATProto Lexicons as the pattern for FYD schema -> validator -> types -> UI eligibility -> capability description -> agent tool -> protocol projection.
- **AT-02** (OPEN): lexicon-shaped schema definitions for PING object types.
- **AT-03** (OPEN): schema -> validator -> types codegen path.
- **AT-04** (OPEN): UI eligibility derived from schema (no hand-maintained lists).
- **AT-05** (OPEN): capability descriptions derived from schema.
- **AT-06** (OPEN): agent tool definitions derived from schema.
- **AT-07** (OPEN): protocol projections derived from schema.
- **AT-08** (OPEN): no PDS project (rejected; see REJECTED REGISTER).
- **AT-09** (OPEN): PLC identity method evaluation (deferred).

### Nostr
- **NO-01** (HARVEST): Nostr event shape as a projection pattern (signed events, relays as dumb pipes).
- **NO-02** (OPEN): PING event -> Nostr projection mapping (deferred).
- **NO-03** (OPEN): NIP-05 / identity mapping evaluation (deferred).
- **NO-04** (OPEN): relay policy (deferred).
- **NO-05** (OPEN): Nostr observation source evaluation (deferred).

### Farcaster
- **FC-01** (REJECTED): Farcaster adapter rejected; see REJECTED REGISTER.
- **FC-02** (HARVEST): Frames interaction patterns harvestable (bounded in-frame actions with receipts).
- **FC-03** (HARVEST): Farcaster protocol notes preserved as research (signers, hubs) without implementation.

### MCP
- **MCP-01** (HARVEST): MCP as a thin projection of PING capabilities; WebMCP object-capability -> JSON-schema tool pattern validates the direction.
- **MCP-02** (OPEN): MCP input_required + opaque continuation + resume validates FYD's REQUEST -> NEED INPUT -> AUTHORIZE -> EXECUTE -> RECEIPT state machine (pattern, not protocol).
- **MCP-03** (OPEN): MCP tool definitions derived from the capability registry (no hand-maintained tools).
- **MCP-04** (OPEN): MCP spec vs SDK date conflicts must be re-pinned before adoption.
- **MCP-05** (OPEN): MCP server lifecycle and capability gating.

### Harvest Register candidates (protocol/ecosystem; full rows in the HARVEST REGISTER section)
- **reg-json-render-typed-catalog** (HARVEST): json-render typed catalog pattern for the registry AI vocabulary; ADAPT patterns, REJECT the npm dep.
- **reg-puck-projection** (DEFERRED): Puck as future human visual-editing surface; projection must be lossy-by-design and never persisted; DO NOT integrate this wave.
- **reg-openpage-contract** (HARVEST): OpenPage one-typed-JSON shared human+AI patch vocabulary; REJECT as builder/dependency; mapping table is the harvest.
- **reg-webstudio-grammar** (HARVEST): Webstudio typed style-value grammar, breakpoints-as-data, MCP tool vocabulary; AGPL-3.0 -> patterns only, clean-room, never code.
- **reg-ai-sdk-adopt-when-needed** (DEFERRED): Vercel AI SDK adopted when the intelligence lane needs a model, not before.
- **reg-crawl4ai-design** (HARVEST): Crawl4AI design harvest (see escalation-crawl4ai-design-harvest).
- **reg-lightpanda-ladder** (HARVEST): Lightpanda conditional tier (see escalation-lightpanda-ladder).
- **reg-json-ld-export** (HARVEST): JSON-LD export patterns for FYD object graphs.
- **reg-schema-org-pinned** (HARVEST): schema.org vocabulary pinned at adoption; explicit typed schema on ingestion.
- **reg-feed-emission** (HARVEST): Atom + JSON Feed + sitemap.xml emission per generated site; WebSub subscriber; consumption parses feed XML into claims.
- **reg-webauthn-approval** (HARVEST): WebAuthn Level 3 pattern for passkey-bound human approval; @simplewebauthn/server at implementation, never hand-rolled ceremonies.
- **reg-dpop-ucan-delegation** (HARVEST): DPoP token binding for agent delegation; UCAN library only when a concrete delegation flow needs it.
- **reg-automerge-draft-reconcile** (DECISION): Automerge 3.5.0 MIT draft-layer use vs the no-CRDT rule; needs Nolan's call (added to the Grill as AUTOCRDT-001).
- **reg-pglite-embed** (HARVEST): @electric-sql/pglite 0.5.8 (Apache-2.0) for tests/edge/local-first demos; ElectricSQL sync service stays pattern-only.
- **reg-extractors-pair** (HARVEST): Defuddle 0.19.4 (MIT, pin version) + Mozilla Readability (Apache-2.0); Trafilatura heuristics study only (GPL-3.0 incompatible, never import).
- **reg-json-forms-approval** (HARVEST): JSON Forms for schema-driven approval/editing UI; approval flows render from schemas.
- **reg-register-itself** (DONE_VERIFIED): this register now exists as a durable artifact with the required column schema; installed by this reconstruction 2026-09-22.

## PING.E SECURITY, TENANCY, DATABASE, RELEASE, CAPABILITIES, ORACLE

Report-era note: most findings below are ERA-R (Pig-era gateway audit, 2026-09-19) or ERA-O (Oracle observations, 2026-09-20..22). Per the evidence-precedence rule (live DB reality > current branch source > old audit docs) and Nolan's live-evidence directive, every OPEN item's NEXT FALSIFICATION re-probes the live surface rather than trusting the 09-19 record. The 2026-09-22 Oracle status (both gateways on candidate-3c5d280dd, healthy, zero restarts, disk 80% -> 56%) post-dates the audit's own era discipline.

### Secret incident and credential posture
- **sec-incident-reconciled** (DONE_VERIFIED): the 2026-09-20 secret allegation and the 2026-09-21 full-incident rotation are reconciled into one durable account: FL-20260920-022 records the incident; the 09-21 record documents rotation with proofs (old credential rejected over the real network path, four historical credentials dead, exposure sweep clean). The 09-20 "no rotation performed" note is superseded by the 09-21 rotation record.
- **sec-rotation-proof** (DONE_VERIFIED): old-credential rejection proven over the real network path 2026-09-21.
- **sec-exposure-sweep** (DONE_VERIFIED): exposure sweep clean 2026-09-21.
- **sec-secret-history-unrun** (OPEN): the git -S secret-history check from the rotation record remains unrun (source tree deliberately untouched during archaeology).
- **sec-credential-lifecycle** (OPEN): credential rotation runbook (schedule, ownership, proof artifacts).

### Tenancy
- **ten-second-tenant-boundary** (BLOCKED): do not onboard a second tenant until cross-tenant isolation is proven on the live surface.
- **ten-never-two-writers** (DECISION): two gateways against one database violates the desired single-writer posture; resolution gated on NOW-6.
- **ten-agent-tenant-binding**: merged into PRIV-01 (same decision; 2->1).
- **ten-dual-registries**: merged into PRIV-02 (2->1).
- **ten-principal-propagation**: merged into PRIV-03 (2->1).
- **ten-scoped-replay-evidence**: merged into PRIV-04 (2->1).
- **ten-isolation-proof** (OPEN): cross-tenant isolation proof (the gate for second-tenant onboarding).
- **ten-owner-journal-scope** (OPEN): owner journal scoping per tenant.

### Database, migrations, triggers
- **db-trigger-owner** (DECISION): G1 resolved 2026-09-22: append-only trigger preserved per Nolan's law (design B); recorded in the Grill as resolved. Verify against current fixture/deployment evidence before re-asking.
- **db-migration-fixture** (OPEN): migration/trigger fixture execution is mandatory release certification.
- **db-pghba-scram** (OPEN): pg_hba.conf loopback trust -> scram-sha-256. Grill PG-001 answered HOLD 2026-09-21 for the gateway cutover; parked, next security patch after stabilization.
- **db-canonical-identity-bytes** (HARVEST): canonical identity bytes documentation for gateway rows (identity authority pattern).
- **db-backup-restore-proof** (OPEN): backup and restore proven on the live database, not just documented.
- **db-schema-evolution** (OPEN): schema evolution policy for the gateway database.

### Release and deployment
- **dep-provenance-gap** (DECISION): both live Oracle containers run candidate-3c5d280dd with no documented promotion from certified candidate-84486f056; deployment registry has zero rows. Nolan's decision required: accept 3c5d280dd as the honest live baseline (recommended default) and record the undocumented promotion, then stop :8081 to restore single-writer operation. See NOW-6 and the Grill (DEPLOY-PROV-001). Do not stop either container before the decision.
- **dep-single-writer-restore** (BLOCKED): stop :8081 after Nolan confirms; blocked on NOW-6.
- **dep-release-certification** (OPEN): release certification distinguishes source, distribution, build, runtime, restart, migration compatibility, and business-path proof.
- **dep-persistent-config** (OPEN): replace /tmp-only release configuration with persistent Docker configuration.
- **dep-revision-vocabulary** (OPEN): runtime vs certified vs deployed vs rollback revisions era-qualified (see ERA-03).
- **dep-rollback-proof** (OPEN): rollback runbook tested on the live surface (see MC-58).

### Capabilities
- **cap-one-authority** (DONE_VERIFIED): capability machinery converges on one authority; no duplicate capability stores.
- **cap-grant-audit** (OPEN): capability grants are bounded and auditable.
- **cap-view-mapping** (OPEN): capability -> view mapping for the shared projection policy.
- **cap-observe-act-separation** (OPEN): OBSERVE and ACT are separate capabilities on every path.

### Oracle operations
- **oracle-disk-reclaimed** (DONE_VERIFIED): 80% -> 56%, ~11 GB reclaimed, 2026-09-22.
- **oracle-both-healthy** (DONE_VERIFIED): both gateway containers healthy, zero restarts, 2026-09-22.
- **oracle-restart-provenance** (OPEN): restart provenance recorded per revision (who/what promoted, when, from which evidence).
- **oracle-ssh-local-only** (DECISION): oracle-ssh.sh runs locally, never through pigwsl-run.sh. Standing rule.
- **oracle-public-route-reprobe** (OPEN): re-probe the 2026-09-19 public-route findings against the current live revision before making them canonical.

### Health honesty
- **HO-01** (OPEN): health must not report green when no checks exist. Merged with sec-health-empty-checks (same rule; 2->1).
- **HO-02** (OPEN): component health must distinguish configured vs reachable vs used vs durable. Merged with sec-health-component-honesty (2->1).
- **HO-03** (PROVE): prove the health endpoint on the live surface returns UNKNOWN (not green) for every subsystem without a real check.
- **sec-integration-fake-green** (OPEN): integration surfaces must not present fake-green status.

## PING.F RECONCILIATION, FAILURE LEDGER, DOGFOOD, EXTERNAL VALIDATION, ERGONOMICS, PERFORMANCE, COST, DESKTOP, SEARCH

- **dogfood-happy-place-coppersmith** (IN_PROGRESS): two-tenant dogfood loop: Nolan personally uses both backends end to end through private preview, Ask FYD, owner mode, Circle -> Node, and customization (directive 13).
- **dogfood-second-observation** (OPEN): second observation + diff proof for a real tenant (the loop's learning evidence).
- **dogfood-plain-english-change** (OPEN): plain-English site change -> approval -> regeneration proof.
- **dogfood-customization-survives** (OPEN): customization survives second observation (the regeneration moat in the dogfood loop).
- **extval-prospect-loop** (DEFERRED): external validation with real prospects deferred until the two-tenant loop is proven (directive 13). When it opens, the acceptance chain is: first external owner named -> first owner-submitted URL ingested with provenance -> first owner correction applied across page, Circle, Ask FYD, and search with no divergent truth -> time-to-usable-presence measured per stage -> 20 real visitor questions answered with zero plausible-filler answers. Dogfood numbers are never cited as market proof.
- **extval-evidence-grading** (DECISION): every external finding graded CONFIRMED / STRONG INDICATION / WEAK INDICATION / UNKNOWN; never assumed.
- **fail-fl-20260922-002** (OPEN): see FL-20260922-002-invariant (P6): mechanical failure-evidence coupling as small PING hardening.
- **fail-ledger-hygiene** (OPEN): failure ledger entries carry classification, evidence, and the invariant learned; narrated completions are not proof.
- **recon-public-route-findings** (OPEN): 2026-09-19 public-route findings must be re-probed against the live revision before becoming canonical.
- **recon-secret-incident** (DONE_VERIFIED): see sec-incident-reconciled.
- **recon-trigger-ownership** (DECISION): see db-trigger-owner; recorded resolved in the Grill.
- **recon-3c5d280dd-provenance** (DECISION): see dep-provenance-gap; in the Grill as DEPLOY-PROV-001.
- **ergo-repo-hygiene** (OPEN): repository ergonomics: the workspace stays navigable; archaeology outputs archived, not scattered.
- **ergo-proof-artifact-convention** (OPEN): dated proof artifacts follow one convention (date, lane, claim, evidence).
- **ergo-onboarding** (OPEN): new-operator onboarding path into this backlog (read NOW, then the frontier, then the domain section).
- **perf-render-budgets** (PROVE): see renderer-performance-budgets.
- **perf-gateway-latency** (OPEN): gateway latency budgets on the live path.
- **perf-embedding-cost** (OPEN): embedding cost accounting (no silent spend).
- **cost-model** (OPEN): cost model for the two-tenant loop (acquisition, inference, storage).
- **cost-attribution** (OPEN): cost attribution per tenant and per lane.
- **desktop-windows-product** (DEFERRED): local-first/desktop Windows product (Identity Vault, Object Store, Capability Runtime, Agent Runtime) deferred until the core loop is proven.
- **search-meaning** (OPEN): search by meaning (capability families, not filenames) as the standing discovery discipline.
- **search-projection-policy** (OPEN): search uses the shared projection policy (no separate search authority).
- **one-canonical-read-model** (P1, OPEN): FL-20260921-233: Circle/ObjectView still build from hardcoded fixture graphs (proceduralize/__fixtures__/) while Ask FYD and rendered pages read the PING-backed projection; the surfaces disagree on the service list (Decks/Fences/Pergolas vs "Pergola Design Consultations"). First broken boundary for the one-read-model invariant. Fix: unify on the PING-backed projection; fixtures become an explicit FIXTURE class, never a live read path.
- **row-count-attestation-gap** (P2, OPEN): FL-20260922-001: the outreach engine rewrote the canonical JSONL twice on 2026-09-22 with a 16-row delta (318 -> 302), cause UNKNOWN, no row-level backup. The reconciliation machinery's own writer is unattested. Fix: every rewrite emits before/after counts plus a per-row diff against a pre-write snapshot; any unexplained delta fails closed.
- **recon-disposition-vocabulary** (DECISION): the outreach reconciliation machinery has dispositions (ELIGIBLE / INELIGIBLE / SUPPRESSED), not lifecycle states. Any OPEN / KNOWN_PERMANENT / RESOLVED / REOPENED lifecycle is new design, not existing machinery; do not cite it as already built.
- **search-qdrant-truthfulness** (P1, OPEN): semantic search is down (Qdrant unreachable/unhealthy; embedding init degrades to null) while surfaces still wear the "hybrid search" label: Postgres keyword search in a hybrid costume. Rule: no "hybrid"/"semantic" label unless hybrid actually executes. Fix: restore Qdrant from the deployed gateway's network namespace, or remove the label everywhere.
- **cost-verification-cache** (P2, OPEN): Meta AI duplicate verification load measured 63-72% in audited rounds: intelligence spend re-verifying the already-known. Fix: content-addressed verification cache on the tandem verification path; duplicate rate measured per round and trending down.
- **perf-no-latency-slos** (P1, OPEN): no measured numbers for URL->presence latency, crawl, proceduralization, SiteSpec generation, render, Ask FYD, or mobile performance. The five must-win metrics name performance but it is uninstrumented. Fix: per-stage latency table for both demo tenants as a dated artifact; budgets set from measurement, not aspiration.
- **durable-cursor-bounded-batch** (P2, PROVE): architectural lesson from the outreach runtime: 2,000 actions cannot be one opaque pass. Required future shape: ACTION PLAN -> bounded batches -> durable cursor -> idempotency -> per-action receipt -> UNKNOWN handling -> reconciliation. A sleeping host must cost at most the current bounded action. No campaign engine implementation until a worker loop survives sleep and resumes from the cursor with per-action receipts.
- **local-key-custody-hygiene** (P2, OPEN): key custody is proven in procedure (bearer tokens resolved at runtime, never stored; rotation compared in-memory) but not in infrastructure: ping-vault unhealthy with undiagnosed root cause; the Oracle deploy reused a stale credential without updating /opt/ping/.env. Fix: vault healthy or formally decommissioned; no live credential reachable via a second stale copy.

---

# HISTORICAL RECONCILIATION (2026-09-22)

Every pre-split product item is accounted for. The historical backlog is `BACKLOG.md` at git `ec8f509` (447 lines): FYD-001..027 and FYD-033..035 (FYD-028..032 were Nolan-only automation operations and moved to BACKLOG_NOLAN.md at the split; they are excluded from this file by design, not dropped). FYD-036..038 came from later product work. No item is silently dropped: each row maps to its current home in this file, its current status, and any supersession.

| Item | Current home in this file | Status | Notes |
|---|---|---|---|
| FYD-001 | P2 / NOW-2 | OPEN | Merged with FYD-003 into one proof per 2026-09-22 directive |
| FYD-002 | P1 / NOW-1 | OPEN | Wording refined: the true root (source bytes -> observations -> evidence) |
| FYD-003 | P2 / NOW-2 | OPEN | Merged with FYD-001 into one proof |
| FYD-004 | P1 / NEXT | OPEN | Crawl scope policy |
| FYD-005 | P3 / NEXT | PROVE | Input contract builder-fields test |
| FYD-006 | P3 | PROVE | Merged with registry-askfyd-answer-shape (2->1) |
| FYD-007 | FRONTIER | DONE_VERIFIED | Negative Ask FYD test 2/2 PASS 2026-09-21 |
| FYD-008 | P3 | SUPERSEDED | Universal prose verifier REJECTED 2026-09-22; superseded by GEN-CONSTRAINT |
| FYD-009 | P3 / NOW-3 | OPEN | Dangling citations fail closed |
| FYD-010 | P4 / NOW-5 | OPEN | Field-level privacy gate for Ask FYD |
| FYD-011 | P3 / NEXT | IN_PROGRESS | No-ClaimAuthority standing law; Ask surfacing OPEN |
| FYD-012 | P3 / NOW-7 | OPEN | Binding verifier coverage audit |
| FYD-013 | P3 / NEXT | OPEN | Stale/superseded evidence policy |
| FYD-014 | P3 / NEXT | IN_PROGRESS | WHY THIS? bindings exist; visible interaction OPEN |
| FYD-015 | P3 / NEXT | OPEN | Machine-walkable lineage test |
| FYD-016 | P4 / NEXT | PROVE | Owner address override survival |
| FYD-017 | P4 / NEXT | PROVE | Three separate fields |
| FYD-018 | P4 / NEXT | IN_PROGRESS | Correction record shape |
| FYD-019 | P4 / NEXT | OPEN | "Move emergency plumbing to the top" E2E |
| FYD-020 | P4 | DEFERRED | Multi-owner governance DEFERRED; historical "competing owner overrides rule" wording SUPERSEDED by the deferral decision |
| FYD-021 | P5 / NOW-8 | PROVE | Changed-source regeneration fixture |
| FYD-022 | P5 / NEXT | OPEN | Regeneration provenance |
| FYD-023 | P5 / NEXT | PROVE | SiteSpec generation determinism |
| FYD-024 | P5 / NEXT | OPEN | Ask answers versioned against graph snapshot |
| FYD-025 | P5 / NEXT | IN_PROGRESS | Semantic determinism permanent regression |
| FYD-026 | P5 / NEXT | PROVE | Claim classifications enforced at write time |
| FYD-027 | P6 / NEXT | IN_PROGRESS | Negative done; positive gated on NOW-2 |
| FYD-028..032 | BACKLOG_NOLAN.md | EXCLUDED | Nolan-only automation operations; moved at the split, not this file's content |
| FYD-033 | FRONTIER | DONE_VERIFIED | Mobile min-w-0 fix committed 2026-09-21 (8a997421) |
| FYD-034 | P6 / NEXT | OPEN | Inspect once, record, stop discussing (directive 11) |
| FYD-035 | P6 / NOW-10 | OPEN | Real-device proof only; no more networking machinery (directive 12) |
| FYD-036 | P6 / NEXT | PROVE | Coppersmith replay evidence |
| FYD-037 | P6 / NOW-9 | OPEN | Wrong-journal fail-closed guard (safety lane, directive 10) |
| FYD-038 | P6 / NEXT | OPEN | Synthetic overlay labeled DEMO_SYNTHETIC or removed from demo path |

Superseded count from the historical set: 2 (FYD-008 replaced by GEN-CONSTRAINT; FYD-020's old wording replaced by the deferral decision). Merged duplicates from the historical set: 1 pair (FYD-001 + FYD-003 into one proof). Excluded by design: 5 (FYD-028..032, live in BACKLOG_NOLAN.md). Recovered pre-split product items: 33.

Stale sequencing corrected by this reconstruction: the old file put FYD-001 ahead of root FYD-002 (fixed by NOW-1/NOW-2), still authorized the rejected FYD-008 universal verifier (fixed by NOW-4 / GEN-CONSTRAINT), and carried stale multi-owner FYD-020 wording (fixed by the DEFERRED status and the supersession note above).

# HARVEST REGISTER

Rule: HARVEST -> TEST -> KEEP/REJECT -> BUILD. Every harvested idea lands in USE NOW / PRESERVE SEAM / REJECT. Tests: DOES IT SHORTEN A COMMODITY BOUNDARY? DOES IT STRENGTHEN A LOAD-BEARING INVARIANT? DOES IT CREATE FUTURE OPTIONALITY WITHOUT CURRENT COMPLEXITY? If none: REJECT. Small core, big capability: never import whole platforms when ~200 lines of proven primitive earn the value. Search order: PING itself first, then git history, dormant code, proven dependencies, official ecosystem implementations.

Columns: SOURCE | LICENSE | VERSION/SHA | PRIMITIVE | WHY USEFUL | BYTES/DEPENDENCY COST | FYD/PING WRAPPER | TEST | STATUS

Primitive chain these primitives serve: SOURCE -> OBSERVATION -> EVIDENCE -> CLAIM -> OBJECT -> RELATIONSHIP -> OWNER INTENT -> CAPABILITY -> PROJECTION -> RECEIPT. Get these right and the website builder is only ONE projection of the same Brand/Business object; the same asset can later become a website, Circle, mobile experience, search result, Ask FYD context, WebMCP toolset, MCP resource/skill, ActivityPub object, ATProto record, Nostr projection, email context, voice experience, agent context, sponsored object. We are not predicting which protocol wins. We are building the semantic asset that survives all of them.

Ecosystem harvest conclusion (2026-09-22): WebMCP (OBJECT CAPABILITY -> JSON SCHEMA TOOL), ATProto Lexicons (FYD SCHEMA -> VALIDATOR -> TYPES -> UI ELIGIBILITY -> CAPABILITY DESCRIPTION -> AGENT TOOL -> PROTOCOL PROJECTION), MCP (INPUT_REQUIRED + OPAQUE CONTINUATION + RESUME validates FYD's REQUEST -> NEED INPUT -> AUTHORIZE -> EXECUTE -> RECEIPT state machine), and C2PA (PROVENANCE IS NOT TRUTH: verifiable source != automatically true claim) all validate FYD's object/schema/capability/evidence direction as PATTERNS TO HARVEST, not protocols to implement. Every harvested idea lands in USE NOW / PRESERVE SEAM / REJECT; never "interesting, let's implement it."

| SOURCE | LICENSE | VERSION/SHA | PRIMITIVE | WHY USEFUL | BYTES/DEPENDENCY COST | FYD/PING WRAPPER | TEST | STATUS |
|---|---|---|---|---|---|---|---|---|
| json-render (@json-render/core) | Apache-2.0 | 0.18.x observed 2026-09-22 (0.21.0 in earlier lane doc; re-pin at adoption) | Typed component catalog (component -> zod prop schema + slots + description) as machine-readable vocabulary shared by AI prompts and validators | Highest-value primitive in the 2026-09-22 lane; prop schemas are the gap in FYD's registry metadata | Light | registry-ai-vocabulary: catalog.prompt() + render-boundary zod validation | Tiny proof (harvest dir only): vocabulary -> valid SitePatch, no free-form code | HARVEST (ADAPT patterns, REJECT the npm dep: React 19 peer clash with FYD 18.3.1, pre-1.0 churn) |
| Puck (@puckeditor/core) | MIT | 0.22.2 observed (0.23.0 in earlier doc; re-pin at adoption) | Component-config shape; editor/renderer data split | Reference design for a future human visual-editing surface that cannot become canonical truth | Light | Scratch mapping: drag-drop reorder expressible as SitePatch ops | Scratch mapping proof that SiteSpec -> Puck projection is lossy-by-design and never persisted; anything touching query/binding REJECTED | DEFERRED (DO NOT integrate this wave) |
| OpenPage | MIT | Repo HEAD 9818eb43 observed 2026-09-22 | One typed JSON doc shared by human editor and AI via the same patch vocabulary; block-variant vocabulary; theme-token preset packaging; AgentPanel UX reference | Validates FYD's SiteSpec shape | N/A (patterns only; 9.3k LoC indie project, do not fork) | Mapping table OpenPage 13 blocks <-> FYD 17 registry components; gap list in both directions | Mapping table exists; FYD's SiteSpec stays the one typed JSON | HARVEST (REJECT as builder/dependency: competing builder, Gemini-coupled AI endpoint) |
| Webstudio | AGPL-3.0-or-later (sdk-components-animation additionally proprietary EULA) | Observed 2026-09-22 | Typed style-value grammar ({type, unit, value}) constrained to semantic tokens; breakpoints-as-data; builder/published isolation; MCP tool vocabulary constrained to SitePatch ops | Hardens the no-generated-CSS-blobs invariant | N/A (patterns only, clean-room) | Token-group grammar sketch for FYD design tokens | Validator sketch rejecting a raw-CSS blob, written from pattern description only | HARVEST (never code; any Webstudio code appearing in FYD requires Nolan's deliberate license resolution) |
| Vercel AI SDK (ai) | MIT | 7.x stable 2026-06-25 | Provider abstraction + structured-output transport (generateText + Output.object({schema})) | The day Ask FYD goes model-backed: model output validates against FYD-owned zod schemas before touching the proposal path | Zero today (no model calls) | xcut-vercel-ai-sdk-adoption | At adoption: schema-validated SitePatch/AnswerWithEvidence; no RSC generative UI anywhere | DEFERRED (adding the dep now buys nothing) |
| Crawl4AI | Apache-2.0 | 0.9.3 (Aug 2026 security release) | SSRF destination validation; declarative request trust boundary; DomainMapper/AsyncUrlSeeder discovery; Shadow DOM flattening; CMP list; 3-tier anti-bot detection (telemetry only) | Design harvest for acquisition hardening | Design only (no pip import into TS runtime) | escalation-crawl4ai-design-harvest | Trigger-gated: adopt patterns only after documented failures of the current stack | HARVEST (REJECT: pip import, LLM extraction, Docker server, anti-bot circumvention, check_robots_txt=false) |
| Lightpanda | Apache-2.0 | 0.8 observed (report states 0.2.8 in lane doc; re-pin at adoption) | Headless browser tier below Playwright cost | Conditional future acquisition tier | Conditional | escalation-lightpanda-ladder | Trigger-gated on documented failures; bypass flags REJECTED | HARVEST (REJECT: headless-shell=true, --disable-web-security, --proxy-server, --host-resolver-rules, --no-sandbox, any bypass) |
| JSON-LD | W3C standard | 1.1 | Linked-data serialization for object graphs | FYD's first-class ingestion format; export patterns for object graphs | Light | acq-service-schema-ids; reg-json-ld-export | Extraction-test synthetic Service/Offer PASS; export round-trip | HARVEST (ingestion DONE_VERIFIED; export patterns pending) |
| schema.org | CC-BY-SA vocabulary (implementation patterns) | Pin at adoption | Service/Offer/Business typed vocabulary | The typed schema on which FYD object compilation stands | Vocabulary only | objectgraph-schema-to-everything | Explicit typed schema on ingestion; object-schema.test.ts PASS | HARVEST (pin the vocabulary version at adoption) |
| Feeds (Atom RFC 4287, JSON Feed 1.1, sitemap.xml, WebSub) | Standards | Atom RFC 4287; JSON Feed 1.1 | Feed emission per generated site; feed consumption into claims | Core FYD output (emission) + acquisition input (consumption) | Light | reg-feed-emission | Every generated site emits Atom + JSON Feed + sitemap.xml; WebSub subscriber; consumption parses feed XML into claims (OBS-09 gap: acquired feed XML currently yields nothing) | HARVEST |
| WebAuthn | W3C Rec Level 3 (2026-08-25); use stable Level 2 ceremony surface first | @simplewebauthn/server MIT at implementation | Passkey-bound human approval identity | Approval authority anchored in platform authenticators | Library at implementation time | reg-webauthn-approval | Human approval via platform authenticators; no hand-rolled ceremonies | HARVEST |
| DPoP (RFC 9449) / UCAN | RFC 9449; UCAN spec lineage in churn (Fission -> ucan-wg -> ucanto) | N/A | DPoP: token-to-key binding; UCAN: delegation-chain pattern (capabilities attenuate down an agent chain) | Fits FYD agent delegation | DPoP: standard; UCAN: provisional | reg-dpop-ucan-delegation | Token binding adopted when agent-held tokens exist; UCAN library only when a concrete delegation flow needs it | HARVEST |
| PGlite (@electric-sql/pglite) | Apache-2.0 | 0.5.8 | Embedded in-process Postgres | Tests, edge, local-first demos without a server | npm install, light | reg-pglite-embed | Used where a real SQL engine is needed without a server; ElectricSQL sync service never self-hosted for FYD | HARVEST |
| Defuddle + Mozilla Readability | MIT (Defuddle); Apache-2.0 (Readability) | Defuddle 0.19.4 (pin version; "very much a work in progress" per README) | Main-content extraction + schema.org metadata (Defuddle); stable readability baseline (Readability) | Acquisition extraction pair | Light | reg-extractors-pair | Extraction pair proven against hostile HTML fixtures | HARVEST (Trafilatura: study readability-scoring heuristics only; GPL-3.0 incompatible, never import) |
| JSON Forms (@jsonforms/react) | MIT (core framework-agnostic; RJSF Apache-2.0 fallback) | 3.8.0 | Schema-driven form generation | Approval and editing UI rendered from FYD action/SiteSpec schemas | Renderer customization cost | reg-json-forms-approval | Approval flows render from schemas, not hand-built forms | HARVEST |
| Fedify (@fedify/fedify) | MIT (verify at adoption) | 2.3.7 (requires adoption-time verification) | ActivityPub server framework | Remote interop projection when the core loop is proven | Framework weight | AP-01 | ADAPT patterns; verify version at adoption | HARVEST |
| ATProto Lexicons | MIT/Apache-2.0 (verify at adoption) | Re-pin at adoption | Schema -> validator -> types -> UI eligibility -> capability description -> agent tool -> protocol projection | Validates FYD's object/schema/capability/evidence direction as a pattern | Pattern only | AT-01 | Lexicon-shaped schema definitions for PING object types | HARVEST |
| MCP (spec + SDK) | MIT (verify at adoption) | Re-pin: spec and SDK dates conflicted; re-pin both before adoption | Thin capability projection; input_required + opaque continuation + resume state machine | Validates FYD's REQUEST -> NEED INPUT -> AUTHORIZE -> EXECUTE -> RECEIPT machine | Light | MCP-01..05 | Tool definitions derived from the capability registry | HARVEST |
| Automerge (@automerge/automerge) | MIT | 3.5.0 | CRDT for converging concurrent edits at the draft layer | Candidate for draft-layer convergence of concurrent owner edits | Library weight | reg-automerge-draft-reconcile | DECISION pending: Nolan's call on whether the no-CRDT rule is absolute (then verdict flips to REJECT) or draft-layer-scoped (then USE-LIBRARY at the draft layer, never as the canonical event log) | DECISION (in the Grill as AUTOCRDT-001) |

C2PA (content provenance): PROVENANCE IS NOT TRUTH is the standing lesson (verifiable source != automatically true claim). Recorded as a pattern for media provenance, not a protocol to implement. WebMCP (object capability -> JSON schema tool): validates the MCP-as-thin-projection direction as a pattern, not a protocol to implement.

Harvest buckets (Nolan 2026-09-22): every harvested idea lands in USE NOW / PRESERVE SEAM / REJECT. Tests: DOES IT SHORTEN A COMMODITY BOUNDARY? DOES IT STRENGTHEN A LOAD-BEARING INVARIANT? DOES IT CREATE FUTURE OPTIONALITY WITHOUT CURRENT COMPLEXITY? If none: REJECT. The compounding asset is not any single harvest; it is messy source understanding + evidence history + owner corrections + object/relationship graph + owner intent + capability history + action receipts + outcome history.

# REJECTED / DO-NOT-BUILD REGISTER

Each entry names the rejected thing, the reason, and the date of the decision. Re-opening requires new evidence and Nolan's call.

- No ProposalAuthority #2: one proposal/approval authority; agent proposals bind the exact proposed transition digest. (Rule of One.)
- No SocialAuthority: social data lives in the object graph under the evidence authority.
- No RelationshipAuthority: relationships live in the object graph under the evidence authority.
- No TransitionAuthority: transitions are typed operations on objects under existing authorities.
- No ProofAuthority: proof is evidence + verification, not an office.
- No FeedAuthority: feeds are projections, not authorities (SOC-20).
- No ClaimAuthority: conflict is a property of evidence, not an authority (No-ClaimAuthority, 2026-09-22; FYD-011).
- No new EventBus: the existing event spine is the bus.
- No new workflow engine: FYD's REQUEST -> NEED INPUT -> AUTHORIZE -> EXECUTE -> RECEIPT state machine is validated by MCP patterns, not re-implemented.
- No new scheduler: no scheduler machinery beyond what exists.
- No graph database merely because graph: the object graph is a model, not a storage engine decision.
- No new canonical social store: social objects live in the object graph.
- No PDS project: ATProto patterns only, no personal data server build (AT-08).
- No blank-canvas editor: FYD generates from evidence; the editor surface is a lossy projection, never canonical truth.
- No customer-specific React sites: generated sites are data-driven renders, not bespoke codebases.
- No generated JSX as state: SiteSpec is data; generated JSX is never persisted as truth.
- No provider username as canonical identity: provider identity != canonical identity (IDN-01).
- No private-key storage in Postgres: federation keys live in proper key management, never the database (AP-07).
- No covert scraping: acquisition respects access controls and robots policy; anti-bot circumvention is never authorized (escalation-no-circumvention).
- No access-control bypass: same as above; a detected restriction becomes BLOCKED.
- No unbounded mass social actions: every social action is capability-gated, rate-bounded, individually authorized (CMP-05).
- No fake social accounts: test identity rule (AGENTS.md): Facebook's official developer test users or PING dev identities only.
- No architecture work for architecture's sake: every architecture item must name the product capability it unblocks.
- Farcaster adapter: rejected; Frames patterns harvestable only (FC-01).
- Universal generated-prose semantic verifier (FYD-008): rejected 2026-09-22 as an open-ended semantic problem; superseded by GEN-CONSTRAINT.
- npm dep json-render: rejected (React 19 peer clash, pre-1.0 churn); patterns only.
- npm dep Puck this wave: deferred; projection must be lossy-by-design and never persisted.
- OpenPage as builder/dependency: rejected (competing builder, Gemini-coupled endpoint, 9.3k LoC indie project); mapping table only.
- Webstudio code: rejected (AGPL-3.0); patterns only, clean-room.
- Crawl4AI Docker server / LLM extraction / pip import into TS runtime: rejected.
- Lightpanda bypass flags: rejected.
- Trafilatura import: rejected (GPL-3.0 incompatible).
- ElectricSQL sync service self-hosted: rejected; PGlite only.
- RSC generative UI in the Vercel AI SDK path: rejected (intelligence produces data, never arbitrary JSX).
- Hand-rolled WebAuthn ceremonies: rejected; use @simplewebauthn/server.

# CONTEXT COVERAGE (2026-09-22)

Sources reviewed for this reconstruction:

1. The partial BACKLOG_PING.md as it stood 2026-09-22 (12,973 bytes: NOW, NEXT, LATER, NORTH STAR, CURRENT VERIFIED FRONTIER only).
2. The historical pre-split backlog at git `ec8f509` (stored as `BACKLOG.md`, 447 lines; FYD-001..027, FYD-033..035; FYD-028..032 Nolan-ops, excluded by design).
3. All eight archaeology reports under `~/workspace/backlog-recon/reports/` (2026-09-22): social-circle-node.md; protocols-harvest.md; fyd-ask-owner-media-evidence.md; ping-authority-identity-replay-era.md; mission-control-missions-runs-learning-health-agents.md; fyd-acquisition-sitespec-renderer-registry.md; security-tenancy-oracle-release-capabilities.md; reconciliation-failure-dogfood-validation-ergonomics.md.
4. The domain cheat sheets under `~/workspace/backlog-recon/cheats/` (read in detail for all eight domains).
5. Nolan's 2026-09-22 FYD product directives (build primitives not whack-a-mole; primitive build order; FYD-002 root; FYD-001+003 one proof; FYD-008 rejection; No-ClaimAuthority; three-state owner intent; FYD-020 deferral; regeneration rule; FYD-037 urgency; FYD-034 inspect-once; FYD-035 device proof; two-backend policy; shared projection policy; DATA NOT PRESENT).
6. Dated proof artifacts cited in the reports: 2026-09-21 Ask FYD service-evidence tests (2/2 PASS); canonical suite 195/195 PASS 2026-09-21; renderer/browser boundary proofs 2026-09-21/22; commit 8a997421ef5f121f114d948c693391f1a9c7c66e (FYD-033); Happy Place replay proof; 2026-09-22 Oracle status (disk 80% -> 56%, both gateways on 3c5d280dd); 2026-09-21 secret rotation proofs; FL-20260920-022; FL-20260921-P1; FL-20260922-002.
7. Post-reconstruction fidelity pass 2026-09-22 ~08:35 MDT: worker 8/8's ledger-grounded report arrived after the merge; the cross-check found renderer-javascript-url-sink prematurely marked DONE_VERIFIED (revoked to OPEN per FL-20260921-032, which reads OPEN with "No fix applied" and zero safe-link mentions) and eight items missing from PING.F, now folded in under their original report IDs (one-canonical-read-model, row-count-attestation-gap, recon-disposition-vocabulary, search-qdrant-truthfulness, cost-verification-cache, perf-no-latency-slos, durable-cursor-bounded-batch, local-key-custody-hygiene).

Sources deliberately unavailable or prohibited:

- `/home/nolan/projects/ping` - deliberately not touched (hard rule). Consequence: the git -S secret-history check from the rotation record remains unrun; source-tree claims in the reports could not be verified firsthand.
- `~/workspace/BACKLOG_NOLAN.md` - strictly off-limits; Nolan's personal social/outreach/engagement operations are excluded from this backlog by design. (One accidental grep/count against it occurred 2026-09-22 before the rule was re-asserted; it was not edited and no further reads occurred. Recorded here for the handoff.)
- Live Oracle/Pig systems - no live access from this sandbox; all runtime claims are cited from the dated records above, era-qualified.

Claims remaining second-hand because live or source-tree re-verification was prohibited: every Oracle/Pig runtime claim dated 2026-09-19..22 (gateway health, container revisions, disk figures, secret-rotation proofs) is cited from the reports and dated artifacts, not re-verified live. Every OPEN item's NEXT FALSIFICATION therefore re-probes the live surface before becoming canonical, per Nolan's evidence-precedence rule.

---
