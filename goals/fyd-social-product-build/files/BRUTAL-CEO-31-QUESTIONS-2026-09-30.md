# BRUTAL CEO MODE: 31 QUESTIONS, ANSWERED FROM EVIDENCE

Nolan's directive, 2026-09-30 ~14:07 MDT. No architecture wave. No new authorities, stores, or writers proposed or created in this document. Every verdict below is one of: PROVEN / PARTIAL / UNPROVEN / FALSE / UNKNOWN. "We plan to" is not cited as evidence anywhere.

Grounding: fyd-build source (src/fyd/*), 195/195 green test suite, two fixture sites (Happy Place Carpentry, Coppersmith Plumbing) through one proceduralizer, served demo at :3100. Where the code proves it, the file is named. Where no owner has touched it, that is stated.

---

## 1. WHAT IS PING?

PING is the shared memory of everything the machine has seen and done, kept in a form strict enough that software can act on it and a human can audit it later. When a business's website is read, when an owner corrects a fact, when a message is sent on someone's behalf, when a claim is checked against its source: PING is the place that remembers what happened, what it was based on, who allowed it, and what came of it. It is the difference between a machine that does things and a machine that can be held to account for the things it does.

WHAT PAINFUL HUMAN PROBLEM EXISTS IF PING DOES NOT EXIST?

A business owner hands real authority to software: send this, publish that, answer customers as me. Without PING, every one of those acts is amnesiac. When something goes wrong, and it will, there is no answer to "what did it do, why, based on what, and who said it could." The owner cannot trust the machine with anything consequential, so the machine stays a toy. The painful problem is not missing features. It is the trust ceiling: without a faithful record, autonomous software can never be given real work.

Verdict on the explanation: PROVEN writable. The paragraph above uses none of the banned nouns.

---

## 2. WHAT IS FYD?

**C. Digital-presence compiler. Primary.**

FYD takes an existing digital presence (a website, a Facebook page, whatever the business already has) and compiles it into a living, owner-controlled representation: a website the owner can correct, a question-answerer that cites its sources, a record of what changed and why. The website builder (A) is the first output target of the compilation. The concierge (B) is the second output target. The marketing OS (E) is a future consumer of the compiled representation, not the thing itself. It is not a social network (D) and not an identity layer (F); those are PING's substrate concerns.

Why C and not A: a website builder starts from a blank canvas and the owner's labor. FYD starts from the business's existing presence and its own understanding. The atomic value is understanding-first, not canvas-first. If you removed the compilation (the extraction, the evidence binding, the object formation) and kept only the site assembly, you would have Squarespace. The compiler is the product.

---

## 3. WHAT IS THE MAGIC MOMENT?

The moment: the owner pastes a URL, and within seconds sees a page that already knows things they never typed. Not the business name (trivial). The services, the service areas, the tone, the distinctions that make this shop different from the one down the road. "HOLY SHIT, IT ALREADY UNDERSTANDS MY BUSINESS" happens when the machine demonstrates specific, non-obvious knowledge with receipts.

Time from URL submission to that moment: UNPROVEN. No real owner has done this yet. The pipeline stages exist (discover, acquire, parse, normalize, extract, provenance, resolve, relate, project in proceduralizer.ts), but the end-to-end latency from a cold URL to a rendered page in front of a human has never been measured with a human watching.

What currently prevents it: (a) the demo runs on fixtures, not live acquisition in front of owners; (b) Ask FYD answers two question shapes, so the "ask it anything" half of the magic is narrow; (c) no owner has been in the loop, so the correction half is untested. The magic moment is the single most important unproven claim in the company.

Verdict: UNPROVEN. This is the gap between 195 green tests and a business.

---

## 4. WHY DOES PING NEED TO EXIST UNDER FYD?

Rebuild FYD with Postgres + Next.js + an LLM + a crawler. What becomes impossible?

Honest accounting. Most of what FYD demonstrably does today could be rebuilt on that stack: the extraction pipeline, the site generation, the rendering, even the owner corrections (a table of overrides). Nothing about the current demo is impossible without PING-the-system.

What becomes materially worse, not impossible: the things that require every actor to share one memory. An LLM that answers from a Postgres row cannot tell you which observation that row came from, whether the observation was superseded, or whether the owner overrode it, unless you build all of that. You would rebuild it. The question is whether you rebuild it once, as a substrate, or five times, once per surface.

What survives the comparison as actual PING value: the discipline that claims carry their evidence, that observations are never mutated (only superseded), that owner intent lives outside the observed world, that every binding is verified before render. But note the brutal part: that discipline currently lives in FYD's code (claims.ts, the binding verifier, the owner store, regenerate.ts), not in PING as a separate running system. PING-the-infrastructure (journal, missions, coordinators) is not load-bearing for anything FYD demonstrably does today.

Verdict: PARTIAL. The semantic discipline is proven and load-bearing. PING as a separate substrate under FYD is UNPROVEN as necessary. Do not confuse the two.

---

## 5. DELETE THE OBJECT GRAPH

Suppose every extracted fact becomes ordinary relational rows: businesses, services, fields, with foreign keys. What customer experience breaks?

What breaks: the relationship-first queries that the product actually runs. "Which services does this business offer" is not a field lookup; it is a traversal of offers/provides edges (ask/answer.ts resolveServices). "What changed since the last observation" is a diff over versioned objects, not rows. The dependency index (object -> rendered sections) that makes regeneration surgical is a graph operation. The visibility policy filters objects and then prunes dangling edges, which is natural on a graph and fiddly in SQL.

What does not break: storing the facts. A well-designed relational schema could carry 80% of the data.

Demonstration: delete the relationships and keep the rows. Ask FYD's services answer stops working, because it resolves services exclusively through relationships. The regen dependency index has nothing to index. The site generator loses "which pages reference this service" (Q16's thesis). The facts survive; the connections die; the product is the connections.

Verdict: PARTIAL. The graph has earned its complexity for traversal, targeted regeneration, and relationship-scoped visibility. But the honest version: a relational model with a relationship table IS a graph. The earning is in the typed relationships with evidence refs and deterministic IDs, not in the word "graph."

---

## 6. DELETE THE EVENT HISTORY

What breaks? In FYD's current demonstrable loop: almost nothing. The refresh lane's types.ts states it plainly: "Nothing here writes to the PING journal; these are projection-side structures." Site generation, owner correction, regeneration, Ask FYD, and the binding verifier all run without the journal.

Can we no longer explain who changed something, why, from what evidence, under what authority, what an agent proposed, what a human approved, what external action happened? For owner corrections: the owner store records who (actor), what (before/after), and when (decidedAt). For agent proposals: the proposal/approval flow records the proposal body digest. For external actions: nothing in the current product takes external actions, so there is nothing to explain yet.

The brutal conclusion: replay and event history are currently marketed to ourselves beyond what the product needs. They become load-bearing the day an agent sends a message, spends money, or publishes externally on an owner's behalf. That day has not come. Until it does, the journal is optionality, not necessity.

Verdict: UNPROVEN as product-necessary today. Keep the substrate (it is cheap and the future needs it), but stop citing replay as a current differentiator. It is not one.

---

## 7. DELETE AGENTS

What remains? The entire deterministic pipeline: acquire bytes, extract fields, compile objects, generate a site spec, render it, accept owner corrections as typed overlays, regenerate with intent preserved, answer two question shapes from evidence with fail-closed refusal. That is a valuable product. It is a compiler with a correction loop. It needs no agent to be worth paying for.

Where intelligence produces nonlinear value (each must earn its invocation):
1. Extraction from hostile HTML: inferring structure from messy, inconsistent markup is judgment work. Deterministic extractors handle the machine-readable layers (JSON-LD first); the long tail of real websites needs inference.
2. The owner's one sentence: "make emergency service the main thing" must be interpreted into a FEATURE decision on the right object. That is language understanding, and it is the highest-leverage invocation in the system.
3. Open questions: anything beyond the two Ask templates needs retrieval plus composition under the evidence discipline. The discipline is what makes this safe; the intelligence is what makes it broad.

Everything else currently labeled "agent" should be deleted or demoted to a function. AI must earn every invocation, and most of the pipeline already runs without it (answer.ts: "No LLM calls, no network").

Verdict: PROVEN that the deterministic core is independently valuable. The agent surface should shrink to the three nonlinear points above.

---

## 8. WHY CAN'T CHATGPT + SQUARESPACE COPY THIS?

They can add citations. Citations are not the moat. The moat is what accumulates and cannot be re-crawled.

Ranking the three that matter:

**1. Owner corrections.** The only asset no competitor can acquire without the owner. Every correction ("we don't do drain cleaning anymore," "emergency service first") is a fact about intent, not about the world. It cannot be scraped, inferred, or bought. It compounds: each correction makes the representation more the owner's and less the crawler's, which raises switching costs monotonically.

**2. Source history.** The versioned record of what the business said about itself over time. This enables change detection ("they added drain cleaning"), conflict surfacing ("the site says X, the owner said Y"), and staleness judgment. A competitor starting today has no history. History is a time moat.

**3. Approved actions.** The record of what was proposed, what the owner approved, and what happened. This is the accountability substrate that lets the system graduate from "website" to "someone who acts for the business." Without it, every action is a first action. With it, the system learns the owner's approval patterns, which is the precondition for safe autonomy.

What does not make the top three: identity resolution and the relationship graph (infrastructure, replicable), conversation history (useful, but downstream of corrections), site customization (presentation, copyable), business outcomes (valuable but not yet produced).

Verdict: the ranking is reasoned from the code and the product logic. Whether the moat holds is UNPROVEN until a competitor tries.

---

## 9. WHO OWNS TRUTH?

For the generated claim "24-hour emergency plumbing," the complete chain as implemented:

**SOURCE BYTES** (the business's website HTML). Created by: the business (external). May modify: no one; bytes are digest-pinned at acquisition. May override: no one. Verified by: the digest check. Hidden by: no one (raw bytes are the ground). Published by: no one directly; they are the ground others cite.

**OBSERVATION** (a recorded sighting: "at time T, source S contained bytes B"). Created by: the acquisition/extraction pipeline. May modify: no one; observations are immutable. May override: no one; a new observation supersedes. Verified by: the pipeline's own digest and timestamp. Hidden by: the visibility policy (never shown raw to visitors). Published by: never directly; cited via evidence refs.

**EVIDENCE** (the resolvable record: observation id, source URL, observed-at). Created by: the loader from observations. May modify: no one; supersededBy marks replacement (FYD-013), never mutation. May override: no one. Verified by: validateClaims (resolves refs, rejects dangling/superseded). Hidden by: field-level visibility (evidence_ref is visitor-visible; raw records are not). Published by: cited in answers and Why This.

**CLAIM** ("the site states 24-hour emergency plumbing," grade website_statement). Created by: the extractor (website-derived) or the owner (OWNER_AUTHORED). May modify: no one; claims are validated at write time by makeClaim. May override: the owner, by issuing a correction (which creates an OWNER_AUTHORED claim, never edits the website's). Verified by: validateClaims against the evidence index, including the DIRECT admission rule. Hidden by: binding failure (unbound claims are omitted, not shown). Published by: the renderer, only through a verified presentation binding.

**OBJECT** (the Service object "Emergency Plumbing"). Created by: the proceduralizer (deterministic compilation). May modify: no one directly; the object is recompiled from observations. May override: the owner's field corrections apply as an overlay at presentation time. Verified by: provenance.ref must resolve (binding verifier). Hidden by: object visibility (private objects filtered per viewer). Published by: the site generator and Ask FYD.

**SITE SPEC** (the declarative description of the rendered experience). Created by: the generator (deterministic from graph + owner intent). May modify: no one by hand; it is compiled. May override: owner intent replays as digest-verified patches. Verified by: the SiteSpec schema validator. Hidden by: not applicable (it is the plan, not the secret). Published by: the renderer consumes it.

**RENDERED STRING** ("24-hour emergency plumbing" on the page). Created by: the renderer from the spec. May modify: no one at render time. May override: no one at render time (overrides happen upstream). Verified by: verifyPresentationBinding, per factual claim, fail-closed. The caller omits the value on failure; it never guesses. Hidden by: omission on binding failure. Published by: the renderer to the visitor.

There is no unnamed "AI decided" authority. The current pipeline contains no LLM calls in the claim path. Where judgment occurs (extraction inference), it is labeled INFERRED and may never wear the DIRECT label.

Verdict: PROVEN as implemented. The chain is machine-enforced, not documented aspiration.

---

## 10. CLAIM AUTHORITY

Do not create it. The invariant already exists in two cooperating pieces that explicitly refuse to be one authority (graph.ts: "This is a verifier, not an authority... No competing validator is created"):

- **Generation-time** (claims.ts): prose may be emitted only when it rests on structured claims whose evidence refs resolve in the evidence index. DIRECT and DERIVED claims must carry evidence refs; the DIRECT admission rule rejects circular, dangling, and superseded evidence.
- **Render-time** (verifyPresentationBinding): a field value may be shown only when its presentation binding resolves to accepted evidence (direct via provenance.ref), a deterministic transform of present evidence (derived), owner state (owner_authored), or a classified generated statement naming its generator (generated).

Nolan's preferred invariant maps exactly:
- "evidence-backed fact" = DIRECT / DERIVED / direct / derived bindings
- "explicit owner-authored content" = OWNER_AUTHORED / owner_authored
- "clearly labeled generated presentation copy" = GENERATED_PRESENTATION / generated (generatorRef required)
- "renderer must not present it as fact" = fail-closed omission (resolveBoundField returns undefined; the caller omits, never guesses)

Machine-testable today: validateClaims, the binding verifier tests, and the unbound-factual-claim test (all in the 195 green).

Verdict: PROVEN. Creating a ClaimAuthority would be the architecture wave Nolan forbade. The invariant is already enforced at the two correct chokepoints.

---

## 11. ADDRESS PRIVACY

Why did the machine withhold Coppersmith's street address? Mechanism, not policy meeting: the visibility pipeline applies a conservative default. coarsenAddress drops the street segment (keeps city/region/postal), and the field-level allowlist (VISITOR_VISIBLE_FIELDS) does not include street-address fields, so visitors never see them. The machine did not decide the address should be secret forever. It applied the safe default.

The required distinction is implemented as architecture: policy.ts states it as law: "object-level visibility lives in the graph; owner DECISIONS about visibility live OUTSIDE the graph (owner intent store) and never mutate observations." OBSERVED VALUE (the full address, recorded once, never mutated) is a different thing from VISIBILITY POLICY (what the current viewer may see, decided by the owner, stored outside the graph).

Owner control: the owner store already has HIDE and SHOW decision types. What is pending (stated in the code itself): how a suppressed value renders (whole-value suppression vs. substring redaction) is an owner decision "owned outside this file... still pending." The SHOW/HIDE/PUBLIC/PRIVATE vocabulary the question demands is partially built: the decision types exist, the per-field presentation policy UX does not.

Verdict: PARTIAL. The seam owns the distinction (proven). The owner-facing control for SHOW/HIDE/PUBLIC/PRIVATE is not yet built. Do not create another privacy authority; finish the seam.

---

## 12. IS "WHY THIS?" ACTUALLY A PRODUCT?

Probably not as a dashboard. The two UX paths are the correct test:

- Owner: "FYD got this wrong" -> correct. This path is load-bearing. Every correction is moat (Q8). The correction UX must be one tap from the wrong thing, not a provenance dashboard.
- Visitor: "How do you know they provide this?" -> Why This. This path is trust infrastructure. Most visitors will never tap it. Its value is that it exists and is honest when tapped, not that it is admired.

The moat (evidence binding) can and should exist without forcing customers to admire it. Provenance is like a building's foundation: the buyer does not tour it, but the building is worthless without it, and the inspector (owner, auditor, regulator) must be able to see it on demand.

Verdict: PARTIAL. The machinery exists (why/ lane, field-triple, conflict surfacing in Ask). Whether either path converts to owner confidence is UNPROVEN: no owner, no visitor, no taps.

---

## 13. WHAT DOES THE OWNER ACTUALLY DO?

Ideal interaction count:
1. Paste URL.
2. Look at the built site.
3. Correct thing one.
4. Correct thing two.
5. Say one sentence ("make emergency service the main thing").
6. Approve the change.
7. Publish.

Seven interactions. Every step beyond these must justify itself against a simple test: does it change what the business gets, or does it change what the machine feels good about? Configuration screens, onboarding wizards, plan pickers, template galleries: none survive the test. Preview-before-publish survives (it changes what the business gets: safety). Undo survives. Everything else is suspect.

Current state: the demo implements propose -> approve -> apply through DEMO OWNER MODE, which is close to steps 5-6. Steps 1-2 (paste URL, see the magic) have never happened with a real owner. Step 7 (publish) is unbuilt.

Verdict: the ideal is defined and the mechanism is close. UNPROVEN with a human.

---

## 14. AUTHORITY UX

The mapping is correct and should be adopted as product law:

- LOW CONSEQUENCE (reorder sections, restyle, rewrite nonfactual presentation copy): immediate, with undo. The typed-patch machinery already supports this; the digest pinning means every change is reversible by construction.
- MEDIUM CONSEQUENCE (change factual business information, publish a meaningful site change): preview plus confirm. The proposal flow exists; it needs the consequence classification wired to the friction, which is UX work, not architecture.
- HIGH CONSEQUENCE (send messages, spend money, publish externally, change provider state, bulk social actions): explicit authorization, every time, no implicit grants. This is where PING's authorization substrate earns its keep (Q6's future).

The constitutional model stays rigorous underneath. The plumber never sees it. The mapping from consequence to friction is a presentation-layer decision over the existing typed actions.

Verdict: UNPROVEN as UX (no users), PROVEN as mechanism (typed, digest-pinned, reversible patches). The work is wiring, not invention.

---

## 15. WHAT IS THE WEBSITE BUILDER?

Precisely: EVIDENCE GRAPH + OWNER INTENT + DESIGN SYSTEM + CAPABILITIES, compiled to a SITE SPEC, rendered as a DETERMINISTIC EXPERIENCE. Not a canvas (the owner does not place boxes). Not templates (the structure derives from the business's objects, not from a gallery). The generator is deterministic: same graph plus same intent yields the same spec, byte for byte.

What can a user express that this model cannot? Anything outside the schema vocabulary. A novel interaction (a configurator, a quiz, a custom tool), a content type with no object schema, a behavior (not a presentation). The model expresses presentations of known things, not new kinds of things. That is the limit, and it should be found now rather than discovered by the first owner who asks for something the vocabulary cannot say.

The honest consequence: FYD will never be the builder for businesses whose website IS the product (SaaS, interactive tools). It is the builder for businesses whose website REPRESENTS the business (trades, services, local). That is a feature, not a failure, provided it is stated.

Verdict: PARTIAL. The model is implemented and deterministic. Its expressive boundary is known in theory, untested against real owner desires.

---

## 16. HOW DO WE BECOME THE BEST BUILDER?

The thesis: the builder already knows what the business is, so owner intent compiles instead of being configured.

Technical proof, end to end: the object graph contains a typed Service object ("Emergency Plumbing") with an evidence ref to the observation that established it. An offers relationship connects it to the Business object. The dependency index maps the service's object id to the rendered sections that mention it (services, service-detail, estimate-form). The SiteSpec generator reads the graph deterministically. When the owner says "make emergency service the main thing," the sentence is interpreted to a FEATURE decision targeting the service's object id; the decision replays through the digest-verified patch machinery; the sections registered for that object re-render; everything else is untouched. Which service (the object), which evidence (the ref), which pages (the dependency index), which CTA (the section's capability binding), which location (the located_at relationship), which copy (the generated statements bound to the object): all resolve mechanically from the graph. That is the thesis, and it runs in tests today.

What would falsify it: an owner sentence whose target cannot be resolved to an object, or a change whose blast radius the dependency index cannot bound. Those are the tests to run with the first real owner.

Verdict: PROVEN as mechanism (regenerate.test.ts, correct-regen.test.ts). UNPROVEN as the experience of saying one sentence and watching the right thing happen.

---

## 17. WHAT IS CUSTOMIZATION?

The six categories, separated permanently in the implementation:

- SOURCE-DERIVED FACT: the observed graph. Never mutated. Superseded, never edited.
- OWNER CORRECTION: CORRECT decisions in the owner intent store, with before/after and classification. Applied as an overlay at presentation time; the observed graph is never mutated.
- OWNER PRESENTATION INTENT: REORDER, HIDE, SHOW, FEATURE decisions. Stored outside the graph, replayed as digest-verified patches.
- GENERATED PRESENTATION: the SiteSpec and its rendered strings. Compiled, deterministic, classified GENERATED_PRESENTATION where the words are the machine's.
- DESIGN TOKEN: the design system's values. Separate layer; not inspected in this pass but architecturally distinct from content.
- AGENT PROPOSAL: the proposal flow (propose -> approve -> apply). Proposals are typed, digest-pinned, and inert until approved.

They do not collapse into one mutable SiteSpec. The store's header states the law: "Customization never mutates source observations." Regeneration replays the decisions onto the new spec; it does not merge them into the observations.

Verdict: PROVEN as code (owner/store.ts, regenerate.ts, patch.ts). This is the separation the question demands, already built.

---

## 18. WHAT HAPPENS WHEN THE WEBSITE CHANGES?

Owner customized "Emergency service first." Source later adds "Drain cleaning." The implemented sequence (FYD-021, proved end to end by regenerate.test.ts):

1. New observation: the V2 source bytes are acquired and extracted with the same deterministic rules.
2. Evidence diff: V1 and V2 graphs are diffed at the object level (added/removed/changed services, each named with its observation id). V1 observations are never mutated; superseded marks are metadata.
3. Object update: the V2 graph is compiled; "Drain cleaning" appears as a new Service object with its own evidence ref.
4. Dependency impact: the dependency index maps the new object to its sections; only those sections invalidate.
5. Proposed/automatic safe regeneration: the V2 spec is compiled deterministically.
6. Preserve owner presentation intent: each recorded owner decision replays through the digest-verified patch machinery. The FEATURE decision on "Emergency Plumbing" still targets an existing object, so it reapplies. A decision whose target no longer exists lands in the report as unapplied with a typed reason, never silently dropped. CORRECT decisions apply as an overlay; if the source moved under a correction, the divergence is recorded in fieldDivergences.

This is the question's "correct answer," implemented and tested.

Verdict: PROVEN.

---

## 19. WHAT HAPPENS WHEN FYD IS WRONG?

This is more important than when it is right, and the machinery treats it that way:

- CORRECT: the owner issues a CORRECT decision; the value becomes OWNER_AUTHORED, which the binding verifier accepts as owner state. The correction is recorded with before/after, so the original observation is preserved, not rewritten.
- HIDE: the owner issues a HIDE decision; the object or section is excluded from presentation without deleting the observation.
- CONFIRM: the weakest of the three in the current implementation. There is no explicit "yes, that's right" confirmation primitive distinct from the absence of correction. This is a gap: confirmation is evidence too, and its absence means the system cannot distinguish "owner saw and approved" from "owner never looked."
- Does the correction become stronger evidence? Yes, structurally: OWNER_AUTHORED outranks website_statement in the presentation binding, and the correction carries the owner's authority rather than the site's.
- Does future regeneration respect it? Yes: the overlay wins, divergences are recorded, unapplied decisions are reported.
- Can contradictory source evidence surface a conflict without silently reverting the owner? Yes: the conflict model keeps both claims with provenance (FYD never silently picks), and the Ask/conflict surfacing shows the winner with the loser reachable.

Verdict: PROVEN for correct/hide/respect/surface. The CONFIRM primitive is the honest gap: UNPROVEN and currently unbuilt.

---

## 20. WHAT IS THE CONCIERGE?

Ask FYD must not be a chatbot attached to a website. The test question: "Which services does this company offer at this location, where did you learn each one, and what changed since the previous observation?"

What the current implementation can do: name the services via offers/provides relationships, cite one evidence record per service (business is [1]), and refuse when the evidence does not establish the answer. That covers "which services" and "where did you learn each one."

What it cannot do: "at this location" (no location-scoped service resolution in the two templates), and "what changed since the previous observation" (the refresh diff machinery exists but is not wired into Ask). A generic ChatGPT given one page cannot reliably answer any of the three parts with citations; Ask FYD answers two of three with citations and refuses the third rather than inventing it. The refusal is the differentiator, but the missing third is the gap.

Verdict: PARTIAL. Evidence-boundedness is proven (the fail-closed refusal is the product). Breadth is not: two intents, no location scoping, no temporal questions. The concierge thesis requires the refresh lane wired into Ask.

---

## 21. MEDIA

The default decision is implemented: the media pipeline (media/) ingests public business-site media with source URL, observed timestamp, digest, media type, dimensions, and rights basis preserved per asset (attach.ts carries digest, rights, rightsBasis, source_url, observed_at, dimensions). Safe optimized derivatives are generated (derivatives.ts). The manifest attaches media as objects with depicts/has_image relationships, so images participate in the same provenance and visibility discipline as facts.

The caution is also implemented, not just stated: rightsBasis is a first-class field, and the pipeline classifies provenance rather than asserting ownership. Publicly reachable is not treated as licensed.

What remains honest: the rights classification for demos (which images may be shown under what authorization) is recorded per asset but the demo-vs-production authorization boundary for media is not yet a tested product surface.

Verdict: PROVEN as ingest pipeline with provenance. PARTIAL on the authorization UX for demos.

---

## 22. OWNER AUTH

Not faked. DEMO OWNER MODE is implemented exactly within the permitted bounds: clearly marked (the :3100 restart protocol requires NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 and verifies it live; unmarked operation 403s the approve path), local/private, impossible to confuse with production authentication (the visibility policy labels it "unmistakably non-production; no crypto, no real authorization"), cannot grant external/provider capabilities (availableActions are bounded: ask_about_a_service, view_why_this), and logged as development-only (actor: "demo_owner" on every decision).

The real auth seam is preserved: production identity is explicitly "a later boundary owned by PING identity, not by this file" (policy.ts). No customer IAM system has been built, per the directive.

Verdict: PROVEN as demo posture. The production seam is defined but unbuilt, which is correct sequencing.

---

## 23. ASK FYD FOR VISITORS

The epistemic default is implemented: fail closed, with the KNOWN/SOURCE/UNKNOWN shape. noEvidenceAnswer states what the evidence does not establish, names the gap in unknowns, and invents nothing. Every emitted citation rests on a validated claim. The answer text itself carries the honesty label ("the site's own words... not independently verified").

But "FULL EVIDENCE-BOUNDED Q&A" overstates what exists. The composer handles two intents; everything else is refusal. That is the right failure mode (refusal beats fabrication), but it is not full Q&A. The product differentiator today is the discipline, not the breadth: no fabricated business facts, ever, in 195 tests.

Verdict: PARTIAL. The epistemics are proven and are the differentiator. The breadth ("full Q&A") is UNPROVEN and should not be claimed.

---

## 24. CURRENT MUST-WINS

MOBILE UX, CONTACT DISCOVERABILITY, SERVICE DISCOVERABILITY, PERFORMANCE: all table stakes, all copyable by any competent builder. They are measured in the test suite (mobile green through 320px, performance in the 195).

TRUSTED UNDERSTANDING is the thesis test and the only one competitors cannot copy by hiring a designer. Measure: did FYD correctly understand the business? The operational metric exists: owner corrections per site. Fewer corrections over time, across sites, is the measure of understanding. It is also the metric that compounds (Q8): each correction is training data no competitor has.

Verdict: the four are PROVEN as engineering bars. The fifth is defined and measurable, UNPROVEN in the field (no owners yet).

---

## 25. MEDIA + DESIGN MUST NOT DISTRACT

The ordering CORRECT > TRUSTWORTHY > USEFUL > FAST > BEAUTIFUL is honored in the architecture: the binding verifier can omit a beautiful lie (fail-closed omission), the claim gates run before any presentation decision, and the test suite grades binding coverage before aesthetics. A wrong fact never ships to make a page prettier; the renderer omits rather than invents.

The second half ("then improve beauty aggressively") is the standing risk: the demo sites must eventually pass the screenshot test with a real owner, and beauty work must not become an excuse to soften the binding discipline.

Verdict: the ordering is architecturally enforced (PROVEN). The aggressive beauty phase is pending and must not precede the owner test.

---

## 26. FUTURE OPTIONALITY

For each primitive, the unlocks listed are directionally right. The honest annotations:

- Evidence graph: trusted concierge, change detection, conflict detection, owner correction, auditable generation. All five are either implemented (correction, conflict detection) or directly entailed (change detection via refresh diff). PROVEN or entailed.
- Object graph: site generation (proven), search, social relationships, cross-page changes (proven via dependency index), campaign audiences, protocol projection. The latter three are UNPROVEN uses, not proven ones.
- Capabilities: safe agents, site editing, provider actions, commerce, scheduling, marketing. Almost entirely UNPROVEN as product; the vocabulary exists, the actions do not.
- Event history: undo, audit, replay, agent accountability, outcome learning. See Q6: optionality, not current product.
- SiteSpec: web (proven), mobile (proven), themes, agent editing, regeneration (proven), experimentation. Mixed.

The discipline the question demands: primitives survive only if they earn current product value. By that test, the evidence graph, object graph, SiteSpec, and regeneration earn it. Capabilities and event history are on probation: they must earn it or be cut.

---

## 27. THE OPTIONALITY TEST

Applied subsystem by subsystem, brutally:

- Claims/binding verifier: solves today's problem (no fabricated facts, machine-tested). Opens: concierge, audit, agent accountability. Cost: one vocabulary, enforced at write time. KEEP.
- Owner intent store + regeneration: solves today's problem (corrections survive). Opens: change detection, conflict surfacing, multi-version truth. Cost: an overlay model. KEEP.
- Proceduralizer: solves today's problem (URL to objects). Opens: any presence source (Facebook, listings). Cost: the pipeline stages. KEEP.
- Ask FYD composer: solves today's problem narrowly (two intents). Opens: full concierge. Cost: template maintenance. KEEP, but do not mistake two intents for a concierge.
- Visibility policy: solves today's problem (address withholding, field gating). Opens: per-field owner privacy UX. Cost: one file. KEEP.
- Media pipeline: solves a near-term problem (demo imagery with provenance). Opens: asset management. Cost: moderate. KEEP, watch the cost.
- Refresh/conflict/diff lane: solves a future problem (no live refresh in product yet). Opens: change detection, temporal Ask. Cost: a whole lane. PROBATION: wire it into Ask or cut it back.
- PING journal/missions/coordinators as FYD substrate: solves no current FYD problem (Q4, Q6). Opens: agent accountability, autonomy. Cost: enormous (the bulk of the system's complexity). PROBATION: the heaviest probation in the company. It must become load-bearing for something FYD demonstrably does, or it is infrastructure preference.

---

## 28. WHAT SHOULD REMAIN PING?

The split as drawn: PING owns the reusable substrate (identity, objects, relationships, evidence, capabilities, events, agent/action semantics, protocol adapters). FYD owns the business semantics (proceduralization, site semantics, SiteSpec, renderer, concierge UX, customer experience).

The boundary is currently drawn in code: FYD's lanes import PING types but own their semantics; the refresh lane explicitly does not write to the PING journal. The danger is drift: every time FYD needs something (a store, a registry, an authority), the temptation is to build it inside FYD rather than use or extend PING. The standing law from the audience-intelligence directive applies generally: if existing PING primitives can represent the requirement, wire them; do not invent another system.

Verdict: the boundary is defined and currently respected (PROVEN as posture). It needs a test: the next FYD need that PING cannot represent is the moment the boundary gets tested for real.

---

## 29. HARVEST EVERYTHING, DON'T INTEGRATE EVERYTHING

The five stages are the right discipline, and the current phase (broad research) is legitimate. The failure mode to watch: the workspace already shows the accumulation pressure (dozens of fyd-* and ping-* directories, 71 stranded worktrees noted in the convergence work). "Harvest" is already at risk of becoming "dependency accumulation."

The rule: a discovery enters HOT PATH only when a current product question cannot be answered without it. Everything else stays DISCOVERED or EVALUATED. The Q27 probation list is the enforcement: capabilities and event-history-as-substrate do not enter FYD's hot path until they earn it.

Verdict: process discipline, correctly stated. Its enforcement is the ongoing work.

---

## 30. THE CORE

Working hypothesis: FYD turns an existing digital presence into a trustworthy, living, owner-controlled representation of a real entity that humans and agents can understand and act through. PING is the substrate that lets that representation become persistent, verifiable, relational, agent-operable, portable.

Attempted disproof, honestly:

- "Trustworthy": the binding discipline is the strongest evidence for this word. It holds under tests. Stands.
- "Living": requires the refresh loop running against real sources on a schedule, with owners watching changes flow through. That does not exist in product today. The refresh lane is built and tested on fixtures. "Living" is UNPROVEN.
- "Owner-controlled": the correction and intent machinery exists and is tested. No owner has controlled anything. PROVEN as mechanism, UNPROVEN as experience.
- "That humans can understand": the rendered sites and Why This exist. No human has tried. UNPROVEN.
- "And act through": nothing acts through it yet. No agent operates through FYD in product. UNPROVEN.
- "Persistent, verifiable, relational": the graph, the evidence refs, the supersede-not-mutate discipline. PROVEN as properties of the representation.
- "Agent-operable, portable": no agent operates through it; portability is untested. UNPROVEN.

The disproof does not kill the hypothesis. It locates the exact frontier: everything up to "trustworthy representation" is built; everything from "living" onward is the work. The hypothesis survives, narrowed: FYD currently builds trustworthy, owner-correctable representations. Living, human-understood, and agent-operated are the next three proofs, in that order.

---

## 31. FINAL QUESTION

If we had to delete 80% tomorrow, the 20% kept by product leverage:

1. **The evidence-binding discipline** (claims.ts + the presentation binding verifier + the fail-closed omission rule). This is the one thing no competitor has and the foundation of every trust claim. Without it, FYD is a website generator with good marketing.
2. **The owner-intent overlay + deterministic regeneration** (owner store + regenerate.ts + dependency index). This is the moat machinery: corrections that survive, changes that flow through, intent that compounds. Without it, FYD is a one-shot generator.
3. **The proceduralizer** (source bytes to typed objects with provenance). This is the magic-moment machinery: understanding before building. Without it, FYD is Squarespace.

Everything else: the Ask templates (rebuildable once the discipline exists), the media pipeline (useful, not load-bearing), the refresh lane (promising, on probation), the PING substrate as currently constituted (must earn its place per Q27), the design system (important, not differentiating), the coordinators, the missions, the dashboards, the analytics.

Three modules. That is the company. Build less.

---

## VERDICT SUMMARY

PROVEN (mechanism + tests, no owner needed): 9, 10, 11 (seam), 17, 18, 19 (correct/hide/respect/surface), 22.
PROVEN as mechanism, UNPROVEN as human experience: 3 (partially), 12, 13, 14, 16, 20 (partially), 23 (partially), 24 (fifth).
PARTIAL: 4, 5, 11 (owner control), 15, 21.
UNPROVEN: 3 (magic moment), 6 (as product-necessary), 24 (fifth, in field).
FALSE or needing correction: the claim that PING-the-system is currently necessary under FYD (Q4); the claim that replay is a current differentiator (Q6); the claim that Ask FYD is full Q&A (Q23).

The core is now obvious. Build less.
