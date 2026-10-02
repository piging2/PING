# Homepage Harvest — Group 4: Network / Data / Voice / Answer Infrastructure

**Harvester:** design-intelligence subagent (group 4)
**Date:** 2026-09-16
**Sites studied live:** Cloudflare, Pinecone, Perplexity (homepages fetched directly). ElevenLabs, Qdrant, Hume (via search-result evidence; homepages not directly fetchable in this session — marked where inference is limited). Phind investigated and found SHUT DOWN in early 2026; included only as a historical note, not a live reference.
**Method note:** No screenshots or live-browser animation review was possible. Exact animation feel, scroll physics, and precise mobile behavior are marked UNKNOWN wherever they could not be determined from page text. Nothing here copies branding, artwork, or proprietary visuals — only mechanisms.

**PING context this serves:** PING is persistent business-intelligence infrastructure (observes, remembers, connects, acts, preserves evidence; knowledge compounds). PING Social is the applied layer. Current homepage has 14 sections at roughly equal visual weight — the working hypothesis is that 3–5 signature moments need dominance, not more sections.

---

## A. HERO — communicating complex infrastructure in ~5 seconds

### A1. Cloudflare: "Region: Earth" eyebrow + one-sentence claim + living network visual
- **SOURCE:** Cloudflare
- **URL:** http://cloudflare.com
- **ROUTE/SECTION:** Homepage hero (top of page)
- **SECTION DESCRIPTION:** Above-the-fold hero. Small eyebrow label reads "Region: Earth." Headline is the brand position itself ("Cloudflare: Build for the agent era"). One-line supporting claim: "One smart network for workloads + security — close to users, close to data." Dominant visual is a world map dotted with network locations. Primary CTAs sit beside it.
- **WHAT IT DOES:** Replaces a feature list with a single geographic conceit: the whole planet is the deployment region. The eyebrow does the conceptual heavy lifting before the headline is even read.
- **WHY IT WORKS:** "Region: Earth" is three syllables that collapse an entire infrastructure story (global anycast, edge compute, no regional config) into a label. The visitor gets scale instantly; the headline then only has to name the era, not explain the tech.
- **PING PROBLEM IT COULD SOLVE:** A
- **PING ADAPTATION:** A PING hero eyebrow in the same structural slot, but PING-native: something like "Scope: your whole business" or a continuity-flavored label ("Horizon: everything you've ever done"). Keep the pattern (tiny label carries the big idea; headline stays short), never the words.
- **COPY RISK:** Medium. "Region: Earth" is Cloudflare's phrasing; any planetary-scale label will read as derivative if too close. The label must be PING's own concept (continuity/memory), not geography.
- **VISUAL RISK:** Low if we avoid a dotted world map. PING's hero visual should be a *system* (events/knowledge), not a *map*.
- **MOBILE BEHAVIOR:** UNKNOWN (not determinable from page text).
- **PRIORITY:** P0

### A2. Pinecone: verb-first hero + terminal command as the CTA
- **SOURCE:** Pinecone
- **URL:** https://www.pinecone.io/
- **ROUTE/SECTION:** Homepage hero
- **SECTION DESCRIPTION:** Hero headline is three words: "Give agents knowledge." Subhead: "The knowledge platform for AI agents. Fast, accurate retrieval that doesn't get more expensive as it scales." Directly beneath the copy is a copy-pasteable terminal command: `$ claude plugin install pinecone`. No "Learn more" vagueness — the action is the install.
- **WHAT IT DOES:** Makes the hero an executable instruction. The visitor's first action is doing, not reading. The verb-first headline ("Give") positions the reader as the one granting capability.
- **WHY IT WORKS:** Developer audiences trust a command line more than a paragraph. The terminal block is both CTA and proof (it implies the product is real enough to install right now). Three-word headline keeps the 5-second test passable.
- **PING PROBLEM IT COULD SOLVE:** A
- **PING ADAPTATION:** PING's hero could carry a single concrete invocation-style line under the headline — not a fake command, but the real first step (e.g., the actual CLI/API call that starts an observation stream, if one exists and is honest). If no such one-liner exists yet, use a "see a live event" style interaction instead of inventing a command. Never ship a fake terminal command.
- **COPY RISK:** Low for the pattern; high if we invent a command that doesn't work. Only use a real, working invocation.
- **VISUAL RISK:** Low. Monospace command blocks are generic infrastructure language.
- **MOBILE BEHAVIOR:** UNKNOWN.
- **PRIORITY:** P1

### A3. Perplexity: the homepage IS the applied demo (use-case landing as root)
- **SOURCE:** Perplexity
- **URL:** https://perplexity.ai
- **ROUTE/SECTION:** Root route (currently serves a "Perplexity Computer" use-case page, e.g. Poshmark reseller)
- **SECTION DESCRIPTION:** The root URL does not show a generic "ask anything" box. It shows a complete applied product story: "Sell more on Poshmark in minutes. Perplexity Computer audits your closet, rewrites every listing, and builds a daily sharing schedule — automatically." The page then demonstrates the applied layer end to end (audit → rewrite → schedule), with capability cards and a CTA ("Put Computer to work").
- **WHAT IT DOES:** Collapses the platform-vs-application distinction. Instead of explaining the engine and then gesturing at use cases, the homepage leads with one fully-worked applied example and lets the engine's power be inferred.
- **WHY IT WORKS:** Concrete beats abstract for the 5-second test. A visitor who doesn't care about "answer engines" immediately understands "audits your closet, rewrites listings."
- **PING PROBLEM IT COULD SOLVE:** A, C
- **PING ADAPTATION:** This is the strongest structural precedent for PING's own positioning ("PING builds the infrastructure. PING Social applies it."). PING's homepage could open with the infrastructure claim but resolve the hero (or the first scroll) into one concrete PING Social applied story — e.g., a single business whose missed calls became captured knowledge — so the abstract system is always anchored to one vivid application. Do not copy Perplexity's reseller framing; use a real PING Social-shaped example.
- **COPY RISK:** Medium. "On autopilot" / "in minutes" style claims must be earned; PING must not promise outcomes it can't prove.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN.
- **PRIORITY:** P0

---

## B. SYSTEM VISUALIZATION — making massive scale comprehensible

### B1. Cloudflare: "Run everywhere / anywhere / at massive scale" triptych under the hero
- **SOURCE:** Cloudflare
- **URL:** http://cloudflare.com
- **ROUTE/SECTION:** Homepage, immediately below hero
- **SECTION DESCRIPTION:** Three short blocks, each with a bold two-word heading and one line of copy: "Run everywhere — Security, connectivity, and code run in 335+ cities around the world, within 50ms of 95% of the world's population." / "Run anywhere — Our network is close to your users, applications, and sites. It optimizes all your traffic from source to destination for low latency." / "Run at massive scale — No more capacity planning. Ever."
- **WHAT IT DOES:** Decomposes "global network" into three distinct comprehensions: where (everywhere), how it behaves (anywhere/optimal), what you never think about again (scale). Each block pairs one hard number with one relief statement.
- **WHY IT WORKS:** Parallel structure ("Run X") makes three ideas scan as one. The numbers (335+, 50ms, 95%) are doing the credibility work; the short second sentences ("No more capacity planning. Ever.") deliver the emotional payoff.
- **PING PROBLEM IT COULD SOLVE:** B, J
- **PING ADAPTATION:** A PING triptych with the same parallel-verb skeleton but PING-native verbs — e.g., "Observe everywhere / Remember everything / Act with evidence" — each pairing one concrete mechanism with one relief. This could become the visual frame for the multi-runtime story: one authority, many runtimes, expressed as three beats.
- **COPY RISK:** Medium-high. "Run everywhere/anywhere" is Cloudflare's cadence; the parallel-verb device is fine, but the verbs and numbers must be PING's own and the numbers must be real (no invented scale metrics).
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN.
- **PRIORITY:** P1

### B2. Cloudflare: "one network / one dashboard / billed as one platform" consolidation statement
- **SOURCE:** Cloudflare
- **URL:** http://cloudflare.com
- **ROUTE/SECTION:** Homepage, "Why choose Cloudflare" area ("One network for users, apps, and data")
- **SECTION DESCRIPTION:** A section whose entire job is consolidation: "Whether you're shipping code, securing employees, or connecting branches, it all runs on the same global network — managed from one dashboard, billed as one platform."
- **WHAT IT DOES:** Names the sprawl the buyer already feels (code, employees, branches = three different tools today) and resolves it into one sentence of unity. The mechanism is enumerating the fragments, then collapsing them.
- **WHY IT WORKS:** Enterprise buyers don't buy features; they buy the end of fragmentation. The sentence structure (list the pains → "it all runs on the same X") is the whole pitch.
- **PING PROBLEM IT COULD SOLVE:** B, J
- **PING ADAPTATION:** PING's equivalent: enumerate the fragments PING unifies (observations scattered across tools, knowledge in people's heads, actions without records) and collapse them — "it all lands in one event stream, under one authority, with evidence attached." This is the copy skeleton for the ONE AUTHORITY / MANY RUNTIMES signature moment.
- **COPY RISK:** Low for the structure; the fragments listed must be PING-true.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN.
- **PRIORITY:** P0

### B3. Qdrant: dense technical feature cards as the visualization (no picture needed)
- **SOURCE:** Qdrant
- **URL:** http://qdrant.tech/?via=dangai (homepage, per search result)
- **ROUTE/SECTION:** Homepage feature grid
- **SECTION DESCRIPTION:** From search-result capture of the homepage: a grid of short, precise capability cards — "Expansive Metadata Filters," "Native Hybrid Search (Dense + Sparse)," "Built-in Multivector," "Efficient, One-Stage Filtering (filters are applied during HNSW traversal — no pre- or post-filtering)," "Full-Spectrum Reranking." Each card is a technical claim with one explanatory clause, each linking to docs.
- **WHAT IT DOES:** Treats precision as the visual. No diagram; the grid of exact mechanisms (named algorithms, named behaviors) communicates depth to a technical reader faster than any illustration.
- **WHY IT WORKS:** For infrastructure buyers, named mechanisms ARE the visualization. "Filters are applied during HNSW traversal" tells an engineer more than a stock architecture diagram.
- **PING PROBLEM IT COULD SOLVE:** B, D (as a supporting-section pattern, not a signature moment)
- **PING ADAPTATION:** A PING "mechanisms grid" for a supporting section: named, real mechanisms (event canonicalization, witness, replay, lineage) each with one precise clause. This is how PING can show technical depth without turning the homepage into documentation. Every card must name something that actually exists.
- **COPY RISK:** Low, provided every mechanism named is real. High if aspirational items slip in — label those honestly per problem K.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN.
- **PRIORITY:** P1

---

## C. SCROLL STORY — homepage sequencing and narrative arc

### C1. Pinecone: hero → interactive estimator → console/terminal → architecture pipeline → Nexus → enterprise → CTA
- **SOURCE:** Pinecone
- **URL:** https://www.pinecone.io/
- **ROUTE/SECTION:** Full homepage sequence (top to bottom as fetched)
- **SECTION DESCRIPTION:** 1. Hero ("Give agents knowledge" + install command). 2. "Cost-performance at any scale" with an interactive cost estimator ("Estimate the cost of your workload"; fill-in-the-blank "I'm building a ___ for a ___"). 3. "Your indexes, always visible" (console vs. terminal duality: "a clean, fast console — or stay in the terminal. Your call."). 4. "Architecture" numbered pipeline (01 WRITE / 02 INDEX / 03 QUERY with latency numbers). 5. "Pinecone Nexus" (knowledge compilation concept). 6. Enterprise (governance/compliance). 7. Final CTA ("Start building knowledgeable AI today").
- **WHAT IT DOES:** Alternates proof types down the page: action (install) → money (cost estimator) → visibility (console) → mechanism (architecture) → concept (Nexus) → trust (enterprise) → action (CTA). No two adjacent sections ask for the same kind of attention.
- **WHY IT WORKS:** The rhythm prevents the "fourteen equal blocks" problem PING currently has. Each section has a distinct job and a distinct interaction texture (type, estimate, look, understand, imagine, trust, act).
- **PING PROBLEM IT COULD SOLVE:** C
- **PING ADAPTATION:** Map PING's 14 sections onto distinct jobs using this alternating-proof-type rhythm. Candidate arc: living hero (see) → continuity problem (feel) → knowledge loop (understand) → business graph (explore) → authority (decide) → evidence/replay (trust) → multi-runtime (grasp scale) → applied layer (believe) → CTA (act). The lesson is not the specific sections but that no two adjacent sections should do the same cognitive job.
- **COPY RISK:** Low.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN.
- **PRIORITY:** P0

### C2. Pinecone: interactive cost estimator as the second section ("I'm building a ___ for a ___")
- **SOURCE:** Pinecone
- **URL:** https://www.pinecone.io/
- **ROUTE/SECTION:** "Cost-performance at any scale" (second homepage section)
- **SECTION DESCRIPTION:** Instead of a pricing table, an interactive widget: "Estimate the cost of your workload" with a fill-in-the-blank sentence ("I'm building a [___] for a [___]") that presumably tailors the estimate. Pricing is encountered as a personalized answer, not a grid.
- **WHAT IT DOES:** Turns the most boring section (pricing) into the most interactive one. The visitor describes their situation and gets a number back — a tiny taste of the product's own value (input → computed answer).
- **WHY IT WORKS:** Participation creates ownership. A number computed for *your* inputs is more persuasive than a table of tiers.
- **PING PROBLEM IT COULD SOLVE:** C, E
- **PING ADAPTATION:** PING could adapt the *interaction shape* (not pricing): a small "describe your business" widget early on the page that returns what PING would observe/remember about it — e.g., pick a trade, see the event types PING would capture. This would be a memorable moment AND a demonstration of the product's core idea (observation → knowledge). Must be clearly illustrative, not a fake promise.
- **COPY RISK:** Medium. Must be framed as illustrative ("here's what PING would track") not as a guarantee.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN; fill-in-the-blank widgets need a deliberately different mobile composition (stacked inputs), not a shrunken row.
- **PRIORITY:** P2

### C3. Perplexity Computer: capability cards all starting with "Computer can…"
- **SOURCE:** Perplexity
- **URL:** https://perplexity.ai
- **ROUTE/SECTION:** Mid-page capability section
- **SECTION DESCRIPTION:** A series of cards each headed by a concrete capability in the form "Computer can audit every listing," "Computer can pull recently sold comps," "Computer can build a daily sharing and relisting schedule," "Computer can read from Google Sheets, Canva, Notion, and Airtable." Each card has one explanatory sentence. The repeated "can" verb is the organizing device.
- **WHAT IT DOES:** Replaces abstract feature names with agent-style capabilities. The reader mentally assembles a worker from the cards.
- **WHY IT WORKS:** "Can" verbs are testable claims — they invite the reader to imagine the action happening, which is more vivid than a noun ("Audit Module").
- **PING PROBLEM IT COULD SOLVE:** C (supporting sections), and the agent-authority story
- **PING ADAPTATION:** PING's capability sections could use the same verb-first card pattern — "PING can watch every channel," "PING can replay any decision," "PING can prove what it knew and when" — but ONLY for capabilities that exist, and with the authority distinction visible (can *observe* vs. can *act* should look different, supporting the intelligence-vs-authority moment).
- **COPY RISK:** Medium. Every "can" must be true today or labeled per problem K.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN.
- **PRIORITY:** P1

---

## E. LIVE FEEL — infrastructure that feels operational

### E1. Pinecone: system-state-as-copy in the architecture pipeline
- **SOURCE:** Pinecone
- **URL:** https://www.pinecone.io/
- **ROUTE/SECTION:** "Architecture" section (01 WRITE / 02 INDEX / 03 QUERY)
- **SECTION DESCRIPTION:** Each pipeline stage carries present-tense, operational microcopy: "vector throughput, streaming in," "index continuously rebalancing," "p99 latency, improving with scale." The copy describes the system as *currently running*, not as a static capability.
- **WHAT IT DOES:** Makes a static marketing page feel like a status dashboard. The verbs are all continuous aspect (streaming, rebalancing, improving).
- **WHY IT WORKS:** Infrastructure buyers want to feel the machine is alive and self-maintaining. Continuous-tense microcopy delivers that feeling in words alone, no animation required.
- **PING PROBLEM IT COULD SOLVE:** E
- **PING ADAPTATION:** PING's diagrams and section copy should use the same continuous-tense device: "events streaming in," "knowledge compounding," "evidence accumulating." This is cheap, honest (it describes the design, not fake live data), and makes the page feel operational without fabricating metrics. Never attach fake numbers to it.
- **COPY RISK:** Low, as long as no fake live numbers are shown. The tense describes behavior, not measurements.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** N/A (copy device).
- **PRIORITY:** P1

### E2. Hume: annotated transcripts — "timestamps and emotion data" per sentence
- **SOURCE:** Hume
- **URL:** https://hume.ai/empathic-voice-interface (EVI product page, per search result)
- **ROUTE/SECTION:** "Chat history" feature description
- **SECTION DESCRIPTION:** From search-result capture: "Access complete transcripts with timestamps and emotion data." EVI ties expression measures to each sentence of a transcript — the history is not a flat log but an annotated record.
- **WHAT IT DOES:** Turns a conversation log into evidence. Each utterance carries its metadata (when, with what measured expression), so the past is inspectable, not just readable.
- **WHY IT WORKS:** It demonstrates that the system *remembers richly*. Annotation is the difference between a log file and institutional memory.
- **PING PROBLEM IT COULD SOLVE:** E, I
- **PING ADAPTATION:** PING's evidence/replay section could show a single event rendered as an annotated record — timestamp, source, actor, evidence links, resulting knowledge — the way Hume shows a sentence with its emotion data. This is the concrete UI pattern for "what happened, why, who initiated it, what evidence exists." This could be one of the most PING-native adaptations in this harvest.
- **COPY RISK:** Low. Use a realistic illustrative event; label it as illustrative.
- **VISUAL RISK:** Low. Monospace annotated records are generic technical language.
- **MOBILE BEHAVIOR:** UNKNOWN; annotated records need horizontal-scroll or stacked treatment on mobile — must be designed, not shrunk.
- **PRIORITY:** P0

---

## G. KNOWLEDGE LOOP — retrieval → knowledge → compounding, shown not told

### G1. Pinecone Nexus: "compiles enterprise data into governed knowledge once"
- **SOURCE:** Pinecone
- **URL:** https://www.pinecone.io/
- **ROUTE/SECTION:** "Pinecone Nexus" homepage section
- **SECTION DESCRIPTION:** One concept, one sentence: "Compiles enterprise data into governed knowledge once, then serves it through a single query." It sits between the architecture pipeline and the enterprise section as the "so what" of the whole system.
- **WHAT IT DOES:** Names the compounding. Raw data goes in over time; what comes out is a compiled, governed asset ("knowledge") that serves every future query. The word "once" does enormous work — it promises the end of repeated work.
- **WHY IT WORKS:** It gives the visitor a noun for the outcome ("governed knowledge") instead of asking them to assemble it from pipeline stages. One memorable sentence beats three explanatory paragraphs.
- **PING PROBLEM IT COULD SOLVE:** G
- **PING ADAPTATION:** PING's knowledge loop needs its own "Nexus sentence" — one line that names what compounding produces. Candidate shape: "Every observation becomes evidence; every piece of evidence becomes knowledge; knowledge is compiled once and serves every future decision." Keep it to one breath. This sentence could anchor the knowledge-loop signature moment.
- **COPY RISK:** Low for the pattern. The PING sentence must describe the real pipeline (observation → evidence → event → knowledge), not invent stages.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** N/A.
- **PRIORITY:** P0

### G2. Perplexity Computer: "Knows Your Closet" — memory across sessions as a homepage card
- **SOURCE:** Perplexity
- **URL:** https://perplexity.ai
- **ROUTE/SECTION:** Capability cards, "Knows Your Closet"
- **SECTION DESCRIPTION:** A dedicated card: "Computer can remember your brands, sizing, pricing strategy, and past sales across sessions — so every audit builds on what came before."
- **WHAT IT DOES:** Makes compounding explicit and personal. The payoff clause ("so every audit builds on what came before") states the loop in plain language: past work improves future work.
- **WHY IT WORKS:** It answers the visitor's unspoken question ("why is this better than doing it once?") with the memory mechanism. "Across sessions" is doing the conceptual work of persistence.
- **PING PROBLEM IT COULD SOFT-SOLVE:** G
- **PING ADAPTATION:** PING should have an equivalent card/beat somewhere: "PING remembers [X] across [Y] — so every [Z] builds on what came before." The PING-native version is institutional memory for a business: "PING remembers every job, every promise, every outcome — so every future decision starts from what actually happened." This is arguably PING's core sentence.
- **COPY RISK:** Low, if the memory claims match real capability.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN.
- **PRIORITY:** P0

### G3. Perplexity Computer: "Stale Listing Alerts" — observation as an always-on capability
- **SOURCE:** Perplexity
- **URL:** https://perplexity.ai
- **ROUTE/SECTION:** Capability cards, "Stale Listing Alerts"
- **SECTION DESCRIPTION:** "Computer can watch your closet for listings losing visibility — and alert you when it's time to relist, drop price, or reshare."
- **WHAT IT DOES:** Shows the loop's first stage (observation) as a product feature. The system doesn't wait to be asked; it watches and nudges.
- **WHY IT WORKS:** "Watch" is the verb that makes an AI system feel like infrastructure rather than a tool. Tools wait; infrastructure watches.
- **PING PROBLEM IT COULD SOLVE:** G, E
- **PING ADAPTATION:** PING's "observes" stage should be presented with the same always-on framing — not "you can query PING" but "PING watches [channels/sources] and surfaces what matters." This verb choice (watch vs. query) is a small copy decision with large positioning consequences.
- **COPY RISK:** Low.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN.
- **PRIORITY:** P2

---

## H. AUTHORITY — trust and control at system scale

### H1. Qdrant enterprise: authority expressed as deployment control and access granularity
- **SOURCE:** Qdrant
- **URL:** https://qdrant.tech/enterprise-solutions/ (per search result)
- **ROUTE/SECTION:** Enterprise page sections
- **SECTION DESCRIPTION:** From search-result capture: "Flexible deployment options. Compliance ready." / "Ensure customer trust by safeguarding their data with top-tier security measures. We provide SOC2 Type 2 Certification, Hybrid Cloud deployments for highly regulated environments, and Private Cloud options to give you complete control and ensure data sovereignty." / "Secure Access & Authentication — Control who gets in and what they can do with Cloud RBAC, SSO, and granular Database API Keys." / "Advanced Monitoring & Observability — Prometheus/OpenMetrics, Datadog, Grafana."
- **WHAT IT DOES:** Communicates authority/control without any "trust us" language. Every claim is a concrete mechanism: RBAC, SSO, scoped API keys, deployment choice, data sovereignty, named observability integrations.
- **WHY IT WORKS:** Control is demonstrated through enumerating the actual levers, not asserted. "Granular Database API Keys" is more convincing than "enterprise-grade security."
- **PING PROBLEM IT COULD SOLVE:** H
- **PING ADAPTATION:** PING's authority section should follow the same rule: no "trust" nouns, only control verbs and named mechanisms. PING-native levers: capability authority (what an agent is allowed to do), workspace/filesystem/commit/patch authorities, witness requirements, replay. List the actual authorities the way Qdrant lists RBAC/SSO/keys. This is the visual/verbal language for "AI can reason ≠ AI has authority."
- **COPY RISK:** Medium. Every authority named must actually exist and be enforced (per PING's own sovereignty principle: declared authority must match actual capability ownership). Never list an authority that is aspirational without labeling it per problem K.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN.
- **PRIORITY:** P1

### H2. Cloudflare: "Secure by default — built into the network… from day one"
- **SOURCE:** Cloudflare
- **URL:** http://cloudflare.com
- **ROUTE/SECTION:** Homepage, "Why choose Cloudflare" ("Secure by default")
- **SECTION DESCRIPTION:** "DDoS protection, WAF, bot management, and Zero Trust controls are built into the network and run on every request from day one."
- **WHAT IT DOES:** Positions security as architectural (built into the network) rather than additive (a product you buy later). "From day one" + "every request" are universality claims.
- **WHY IT WORKS:** "Built into" vs. "bolted on" is a distinction technical buyers feel immediately. The sentence makes the alternative (security as an afterthought) sound negligent without saying so.
- **PING PROBLEM IT COULD SOLVE:** H
- **PING ADAPTATION:** PING's equivalent: evidence and authority as architectural properties, not features — "Every action leaves evidence. Every authority is checked on every execution. From the first event." The structural move (universality claim about a constitutional property) ports directly; the content must be PING's real guarantees.
- **COPY RISK:** Medium-high. Universality claims ("every request," "every execution") must be true or they become the exact kind of overclaim PING must avoid. Only use if the enforcement is real.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** N/A.
- **PRIORITY:** P2

---

## I. EVIDENCE / REPLAY / LINEAGE — verifiability as concrete UI

### I1. Perplexity: citations as the product's signature UI (in-text, hover-preview, click-through)
- **SOURCE:** Perplexity (secondary sources: eWeek cheat sheet, Digital Trends, SlashGear — homepage itself not text-descriptive of this)
- **URL:** https://www.perplexity.ai
- **ROUTE/SECTION:** Core answer UI (product behavior, described in secondary coverage)
- **SECTION DESCRIPTION:** Per secondary sources: every answer carries in-text citations; hovering a citation previews the source; clicking goes to the source. Answers are explicitly "backed by citations from trusted sources," and the format distinguishes Perplexity from chatbots ("not a chatbot" positioning).
- **WHAT IT DOES:** Makes verifiability the interaction, not a claim. The citation is a UI element with behaviors (hover, click), so "trust" is something the user *does*, repeatedly, rather than something the company *says*.
- **WHY IT WORKS:** It operationalizes honesty. Each citation is a small, checkable promise, and the accumulation of kept promises is what builds trust. No trust language is needed on the marketing page because the product demonstrates it.
- **PING PROBLEM IT COULD SOLVE:** I
- **PING ADAPTATION:** This is the single most portable mechanism in the harvest. PING's evidence/replay section should show citations-as-UI: an answer/decision with inline evidence markers that expand to show source events, timestamps, and lineage. PING's version is stronger than Perplexity's (deterministic replay, witness, provenance chain), but the *interaction shape* — inline markers → preview → full lineage — ports directly. This should be a signature-moment candidate.
- **COPY RISK:** Low.
- **VISUAL RISK:** Low. Citation markers are generic; PING's evidence markers should have their own visual identity (not Perplexity's brackets).
- **MOBILE BEHAVIOR:** UNKNOWN for Perplexity's exact behavior; PING's version needs tap-to-expand designed for touch, not hover-dependent.
- **PRIORITY:** P0

### I2. Hume: "Resume chats — pick up right where you left off with full context"
- **SOURCE:** Hume
- **URL:** https://hume.ai/empathic-voice-interface (per search result)
- **ROUTE/SECTION:** EVI feature list
- **SECTION DESCRIPTION:** From search-result capture: "Resume chats — Pick up conversations right where they left off with full context." Listed alongside "Chat history — Access complete transcripts with timestamps and emotion data."
- **WHAT IT DOES:** Frames continuity as a feature with a plain-language promise. "Full context" is the whole value proposition in two words.
- **WHY IT WORKS:** It names the failure mode everyone has experienced (starting over with a system that forgot) and promises its absence, concretely.
- **PING PROBLEM IT COULD SOLVE:** I (continuity/replay framing)
- **PING ADAPTATION:** PING's continuity story can use the same plain promise structure: "Pick up any thread with full context — every event, every decision, every piece of evidence intact." PING's actual differentiator (deterministic replay, not just history) should then be the one-sentence upgrade on this familiar promise.
- **COPY RISK:** Low.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN.
- **PRIORITY:** P2

### I3. Phind (HISTORICAL — shut down early 2026, not a live reference)
- **SOURCE:** Phind (defunct; via secondary sources)
- **URL:** https://www.phind.com (no longer operational as the original product)
- **ROUTE/SECTION:** Historical answer UI
- **SECTION DESCRIPTION:** Per secondary sources: Phind's answers placed source citations alongside code snippets so developers could verify solutions against official docs; no account required to try; "paste the stack trace" as the entry workflow.
- **WHAT IT DOES (DID):** Same citations-as-UI pattern as I1, in a developer context; plus a zero-friction trial (no account).
- **WHY IT WORKED:** Verification next to the claim; trying without signing up.
- **PING PROBLEM IT COULD SOLVE:** I (supporting evidence only — do not treat as a live design reference)
- **PING ADAPTATION:** None beyond reinforcing I1. Noted here only so the harvest doesn't silently present a dead site as live.
- **COPY RISK:** N/A.
- **VISUAL RISK:** N/A.
- **MOBILE BEHAVIOR:** UNKNOWN.
- **PRIORITY:** P2 (historical note only)

---

## J. MULTI-RUNTIME — one authority over heterogeneous infrastructure

### J1. Cloudflare: "Every service runs on every server in every location" + "one dashboard, one platform"
- **SOURCE:** Cloudflare
- **URL:** http://cloudflare.com (homepage + connectivity-cloud materials via search)
- **ROUTE/SECTION:** Homepage ("Why choose Cloudflare") and connectivity-cloud positioning
- **SECTION DESCRIPTION:** Two interlocking claims. (1) Architectural: "Every Cloudflare service can run on every server in every network location, meaning there's no downtime or redesign needed to add new capabilities." (2) Operational: "it all runs on the same global network — managed from one dashboard, billed as one platform." Supporting: "one pane of glass for all our services."
- **WHAT IT DOES:** Separates the *where/how* (uniform execution substrate) from the *control* (single dashboard, single bill). The visitor understands both the homogeneity of the substrate and the singularity of control.
- **WHY IT WORKS:** It answers the two questions a heterogeneous-infrastructure buyer always has: "will it run everywhere I need?" and "do I have to manage N things?" One sentence each.
- **PING PROBLEM IT COULD SOLVE:** J (this is the closest existing articulation of PING's ONE AUTHORITY / MANY RUNTIMES story)
- **PING ADAPTATION:** This is the structural template for PING's multi-runtime signature moment. PING-native version: (1) "Every capability runs under one authority — JS workers, Python workers, local execution, cloud runtimes all execute under the same constitutional authority." (2) "One event stream. One evidence record. One replay." — managed/observed as one system. The visual should show many runtime nodes converging through a single authority plane. Do not copy "one dashboard" language; PING's unity is the authority/event record, not a dashboard.
- **COPY RISK:** High if runtime claims outrun reality. Each named runtime must be labeled per problem K (BUILT / ACTIVE DEVELOPMENT / EXPERIMENTAL / DIRECTION). The *structure* (substrate sentence + control sentence) is safe; the *roster* must be honest.
- **VISUAL RISK:** Medium. A "many nodes → one plane" visual is the right shape, but must not look like Cloudflare's network map or a generic hub-and-spoke stock diagram. PING's plane is authority, not geography — the visual metaphor should be constitutional (gates/checks), not cartographic.
- **MOBILE BEHAVIOR:** UNKNOWN.
- **PRIORITY:** P0

### J2. Hume: "Bring your own LLM — switch models without changing your integration"
- **SOURCE:** Hume
- **URL:** https://hume.ai/empathic-voice-interface (per search result)
- **SECTION DESCRIPTION:** From search-result capture: "Bring your own LLM — Use any language model you want. EVI works seamlessly with Claude, GPT, Gemini, Grok, Kimi K2, Llama, and more. Switch models without changing your integration."
- **WHAT IT DOES:** Makes heterogeneity a feature: the interface is stable, the backends are swappable. Names the actual options (Claude, GPT, Gemini, Grok, Kimi, Llama) so the claim is concrete.
- **WHY IT WORKS:** Naming the roster converts an abstract "flexible" claim into a checkable one. "Without changing your integration" names the buyer relief precisely.
- **PING PROBLEM IT COULD SOLVE:** J
- **PING ADAPTATION:** PING's multi-runtime section should name its real roster the same way — but with honest status labels per runtime (the K dimension). The "switch without changing your integration" equivalent for PING: "add a runtime without changing the authority" — new execution environments plug into the same event/evidence record. Only promise what the architecture actually supports.
- **COPY RISK:** High if the roster includes runtimes that aren't real yet. Mitigate with per-runtime status labels (this is where J meets K).
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN.
- **PRIORITY:** P1

---

## K. STATUS / HONESTY — BUILT vs. direction, stated elegantly

### K1. Qdrant: engineering trade-off transparency (the ACORN decision-matrix pattern)
- **SOURCE:** Qdrant (via InfoWorld coverage of Qdrant 1.16 release notes)
- **URL:** https://www.infoworld.com/article/4099002/qdrant-vector-database-adds-tiered-multitenancy.html
- **ROUTE/SECTION:** Release-note / technical documentation pattern
- **SECTION DESCRIPTION:** Per coverage: Qdrant shipped ACORN (a retrieval mode) with an explicit published trade-off — "approximately 2x to 10x slower in typical scenarios but improves recall for restrictive filters," plus "a decision matrix on when to use ACORN." The docs say when the accuracy improvement justifies the performance cost, rather than claiming universal superiority.
- **WHAT IT DOES:** Turns a weakness (slower mode) into credibility by publishing the exact trade-off and the decision rule.
- **WHY IT WORKS:** Engineers trust vendors who quantify downsides. A published decision matrix is more persuasive than a superlative.
- **PING PROBLEM IT COULD SOLVE:** K
- **PING ADAPTATION:** PING's status labels (BUILT / ACTIVE DEVELOPMENT / EXPERIMENTAL / DIRECTION) gain credibility if each label links to the same kind of honesty: what works, what's slow, what's unproven, and the decision rule for using it. A "status" treatment that reads like an engineering decision matrix — not a project-management dashboard — keeps transparency from looking unfinished.
- **COPY RISK:** Low. This is a honesty pattern, not copy to reuse.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** N/A.
- **PRIORITY:** P1

### K2. Pinecone: honest engineering numbers as the credibility layer
- **SOURCE:** Pinecone
- **URL:** https://www.pinecone.io/ and https://www.pinecone.io/product/database/ (per search result)
- **ROUTE/SECTION:** Homepage architecture section + database product page
- **SECTION DESCRIPTION:** Latency is stated as percentile ranges, not single heroic numbers: "p50, 16ms, p90, 21ms, p99, 33ms" (dense index, 10M records). The architecture section says "p99 latency, improving with scale" — a claim about the *shape* of performance, not a cherry-picked figure.
- **WHAT IT DOES:** Percentiles signal that the vendor measured honestly. "Improving with scale" claims a property of the system rather than a leaderboard number.
- **WHY IT WORKS:** Anyone can claim "fast." Percentiles prove someone ran the benchmark. The shape-claim ("improving with scale") is memorable because it's unusual.
- **PING PROBLEM IT COULD SOLVE:** K
- **PING ADAPTATION:** Wherever PING states system properties, prefer shape-claims and ranges over single numbers — and only where measured. E.g., replay determinism is a property claim ("same history → same state, every time"), which is stronger and more honest than any latency number PING hasn't measured. Never invent percentiles.
- **COPY RISK:** High if numbers are invented. Only use measured values; otherwise use property claims.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** N/A.
- **PRIORITY:** P2

---

## L. TYPOGRAPHY — display scale, monospace, labels, metadata

### L1. Pinecone: monospace as the technical voice (terminal CTA, numbered pipeline, metric labels)
- **SOURCE:** Pinecone
- **URL:** https://www.pinecone.io/
- **ROUTE/SECTION:** Hero + Architecture section
- **SECTION DESCRIPTION:** Three monospace treatments in distinct roles: (1) the hero terminal command (`$ claude plugin install pinecone`) — monospace as *action*; (2) pipeline numbering "01 · WRITE", "02 · INDEX", "03 · QUERY" — monospace as *structure*; (3) metric labels "p50, 16ms, p90, 21ms, p99, 33ms", "<100ms acknowledgment" — monospace as *evidence*.
- **WHAT IT DOES:** Assigns monospace three jobs and never mixes them. The reader learns the visual grammar: mono = do this / this is the sequence / this is measured.
- **WHY IT WORKS:** Restraint. Most technical sites spray monospace everywhere; Pinecone rations it, so each use lands.
- **PING PROBLEM IT COULD SOLVE:** L
- **PING ADAPTATION:** Adopt the same three-role rationing for PING: mono for (1) the one real invocation/action, (2) pipeline/sequence numbering (the knowledge loop stages, the authority checks), (3) measured values only. Everything else stays in the display/body faces. This directly serves the "stronger typography hierarchy" need.
- **COPY RISK:** None.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN; monospace blocks need horizontal-scroll or wrap treatment on small screens.
- **PRIORITY:** P1

### L2. Hume: metric-as-typography ("~300ms Time to first byte")
- **SOURCE:** Hume
- **URL:** https://hume.ai/empathic-voice-interface (per search result)
- **ROUTE/SECTION:** "Real-time streaming" feature
- **SECTION DESCRIPTION:** From search-result capture: the feature's proof is set as a single large metric line — "~300ms Time to first byte" — rather than a paragraph about low latency.
- **WHAT IT DOES:** Lets one number carry the section. The tilde keeps it honest (approximate, not a lab-perfect figure).
- **WHY IT WORKS:** A single approximate number is more believable and more scannable than "blazingly fast real-time streaming."
- **PING PROBLEM IT COULD SOLVE:** L, K
- **PING ADAPTATION:** Where PING has a real measured property, set it as a single large metric line with honest approximation marking. Where it doesn't, use a property claim instead of a number. The tilde is a small honesty device worth stealing.
- **COPY RISK:** Medium — only with real measurements.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN.
- **PRIORITY:** P2

---

## M. MOBILE — complex visuals becoming different compositions

### M1. (Gap noted honestly)
- **SOURCE:** Multiple (Cloudflare, Pinecone, Perplexity, Hume, Qdrant)
- **URL:** N/A
- **ROUTE/SECTION:** N/A
- **SECTION DESCRIPTION:** None of the fetches or search results yielded describable mobile-specific compositions for these sites' complex visuals (network maps, pipelines, annotated transcripts). This harvest cannot report their mobile mechanisms from text evidence.
- **WHAT IT DOES:** N/A — this is a documented gap, not a finding.
- **WHY IT WORKS:** N/A.
- **PING PROBLEM IT COULD SOLVE:** M
- **PING ADAPTATION:** PING should still apply the principle found implicitly across these sites: the *interaction shape* changes per device (Perplexity's tap-vs-hover citations, Pinecone's fill-in-the-blank estimator needing stacked inputs, Hume's annotated transcripts needing stacked or horizontally-scrolling records). Recommendation: for each PING signature visual, specify the mobile composition as a separate design (e.g., the business graph becomes a tappable node list + detail cards; the multi-runtime visual becomes a vertical authority stack), not a scaled-down desktop frame. This needs dedicated design work in the implementation phase.
- **COPY RISK:** None.
- **VISUAL RISK:** None (no visual proposed).
- **MOBILE BEHAVIOR:** UNKNOWN by definition — flagged for the implementation phase.
- **PRIORITY:** P1 (as a process requirement, not a harvested mechanism)

---

## Cross-cutting observations

1. **Nobody explains; everybody demonstrates.** All four live sites put the product's core action (install command, applied demo, interactive estimator, playground) at or near the top. PING's 14 sections currently *explain*; the harvest says *demonstrate first*.
2. **The applied layer is the hero.** Perplexity's root route being a use-case page is the strongest validation of PING's "PING builds the infrastructure. PING Social applies it." The applied story may deserve hero-adjacent placement, not relegation to section 10.
3. **Honesty is a visual system, not a disclaimer.** Percentiles, tildes, trade-off matrices, named rosters, status labels — the credible sites distribute honesty into the typography and components, not a footnote.
4. **Parallel structure is the infrastructure copy device.** "Run everywhere / anywhere / at massive scale," "01 WRITE / 02 INDEX / 03 QUERY," "Computer can…" — the pattern is always: same skeleton, distinct content, one idea per beat.
5. **The strongest PING-native adaptations cluster around G, I, and J** (knowledge loop, evidence/replay, multi-runtime) — which matches the candidate signature moments. The harvest supports elevating those three plus the hero; it does not support 14 equal sections.

---

## Harvest tally

- **Sites reviewed live (homepage fetched):** Cloudflare, Pinecone, Perplexity
- **Sites reviewed via search evidence:** ElevenLabs, Qdrant, Hume
- **Sites investigated and excluded as live references:** Phind (shut down early 2026 — historical note only), Tailscale (search results yielded no design-mechanism evidence)
- **Ideas harvested:** 26 (A1–A3, B1–B3, C1–C3, E1–E2, G1–G3, H1–H2, I1–I3, J1–J2, K1–K2, L1–L2, M1)
- **P0 (transformative):** A1, A3, B2, C1, E2, G1, G2, I1, J1 (9)
- **P1 (strong improvement):** A2, B1, B3, C3, E1, H1, J2, K1, L1, M1 (10)
- **P2 (polish/inspiration/historical):** C2, G3, H2, I2, I3, K2, L2 (7)
