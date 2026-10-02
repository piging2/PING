# Homepage Harvest — Group 2: AI Platforms

Harvested 2026-09-16. Read-only research. No branding, artwork, or copy lifted from any site; only mechanisms.

## Sites reviewed

1. Anthropic — https://www.anthropic.com
2. OpenAI — https://openai.com
3. Cursor — https://cursor.com/home
4. Together AI — https://www.together.ai
5. Replicate — https://replicate.com
6. LangChain / LangSmith — https://www.langchain.com (LangSmith product homepage at smith.langchain.com requires login; covered via their changelog/blog descriptions instead)
7. Weights & Biases — https://wandb.ai/site/
8. Hugging Face — https://huggingface.co (discovered addition)
9. Daytona — https://www.daytona.io (discovered addition)

## Method note (read before using this document)

All pages were studied via text fetch, not a live browser. Consequences:

- Section order, headlines, supporting copy, CTA hierarchy, and information architecture are reliable.
- Exact animation feel, scroll-triggered motion, precise layout, and color are NOT reliably known from text fetch. Where I describe a visual, it comes from image alt text / filenames / structural cues in the fetch.
- Mobile behavior is marked UNKNOWN everywhere except Together AI, which ships a separately-named mobile hero image (concrete evidence of a deliberate mobile composition).
- Anthropic and OpenAI returned sparse text (JS-heavy pages); their harvests are thinner and flagged accordingly.

Each idea carries the required fields. Priority: P0 = transformative, P1 = strong improvement, P2 = polish/inspiration.

---

## ANTHROPIC (anthropic.com)

Fetch was sparse (JS-heavy). Hero headline captured: "At Anthropic, we build AI to serve humanity's long-term well-being." Page continues into a "Latest releases" card list with category labels (Announcements, Alignment Science, Education, Economic Research) and named trust objects (Claude's Constitution, Responsible Scaling Policy, Economic Index, Anthropic Academy).

### ANT-1 — Mission-only hero, zero product pitch

- **SOURCE:** Anthropic
- **URL:** https://www.anthropic.com
- **ROUTE/SECTION:** / hero
- **SECTION DESCRIPTION:** The entire above-the-fold is one sentence: "At Anthropic, we build AI to serve humanity's long-term well-being." No product name, no feature list, no CTA captured in text. The product (Claude) is assumed known.
- **WHAT IT DOES:** Substitutes brand/product explanation with a values claim, keeping the hero to ~12 words.
- **WHY IT WORKS:** Extreme confidence. When the product is already known, any further hero copy is noise. One sentence is instantly parseable.
- **PING PROBLEM IT COULD SOLVE:** A. HERO
- **PING ADAPTATION:** Only partially transferable. PING is not yet known, so a mission-only hero would leave visitors confused. The transferable mechanism is the *length discipline*: one sentence, no commas-stuffed feature list. PING's hero should aim for one sentence plus one concrete mechanism line, not a paragraph.
- **COPY RISK:** High if copied directly. "Serve humanity's long-term well-being" is Anthropic's voice; PING needs its own equivalent, grounded in business memory, not grandiosity.
- **VISUAL RISK:** Low. Short headlines are layout-agnostic.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P2

### ANT-2 — Release cards with persistent category taxonomy

- **SOURCE:** Anthropic
- **URL:** https://www.anthropic.com
- **ROUTE/SECTION:** / "Latest releases"
- **SECTION DESCRIPTION:** A card grid of releases. Every card carries a small category label: Announcements, Alignment Science, Education, Economic Research. The taxonomy is the navigation; you read the label before the title.
- **WHAT IT DOES:** Turns a changelog into an oriented feed. The label tells you *what kind of truth* the card contains before you read it.
- **WHY IT WORKS:** Categories act as eyebrows that pre-sort attention. Readers self-select (engineers read Alignment Science, everyone reads Announcements).
- **PING PROBLEM IT COULD SOLVE:** L. TYPOGRAPHY, I. EVIDENCE/REPLAY/LINEAGE
- **PING ADAPTATION:** PING's build journal / evidence feed should use a fixed category taxonomy as eyebrow labels (e.g., Event, Evidence, Replay, Decision, Direction). Same mechanism, PING's own categories.
- **COPY RISK:** Low. Taxonomy labels are functional, not voice.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P1

### ANT-3 — The constitution as a homepage-level trust object

- **SOURCE:** Anthropic
- **URL:** https://www.anthropic.com
- **ROUTE/SECTION:** / "Latest releases" (links to Claude's Constitution, Responsible Scaling Policy)
- **SECTION DESCRIPTION:** Anthropic publishes the actual governing documents (Claude's Constitution, Responsible Scaling Policy) and surfaces them as first-class homepage objects, not buried legal pages.
- **WHAT IT DOES:** Converts "trust us" marketing into "read the rules we bound ourselves with." The constraint document is the trust mechanism.
- **WHY IT WORKS:** It is falsifiable. A published constitution can be checked against behavior; a "trust" slogan cannot. Technical audiences respect the difference.
- **PING PROBLEM IT COULD SOLVE:** H. AUTHORITY, K. STATUS/HONESTY
- **PING ADAPTATION:** PING has a constitutional framing (authority boundaries, evidence, replay). Publish the actual authority rules (what agents may/may not do, what requires approval) as a readable, versioned document linked from the homepage's authority section. This is the strongest possible version of "intelligence vs authority": show the rulebook.
- **COPY RISK:** Medium. PING must write its own constitution; the mechanism is "publish the constraints," not any specific wording.
- **VISUAL RISK:** Low. A document link needs no special visual treatment; the power is in its existence.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P1

---

## OPENAI (openai.com)

Fetch was sparse (JS-heavy). Captured structure: a prompt-style hero ("What can I help with?"), then featured article cards with category + read-time metadata (e.g., "GPT-6 Astra: a new generation of intelligence — Research, 28 min read"), then sections: Recent news, Stories, Latest research, OpenAI for business, each with "view more" links.

### OAI-1 — Card metadata taxonomy (category + read time on everything)

- **SOURCE:** OpenAI
- **URL:** https://openai.com
- **ROUTE/SECTION:** / featured cards, Recent news, Latest research
- **SECTION DESCRIPTION:** Every card carries two metadata tokens: a category (Research, Safety, Engineering, Company, Product, Startup) and a read time ("28 min read", "6 min read"). The metadata is as visually present as the title.
- **WHAT IT DOES:** Lets visitors triage a dense feed in seconds. Read time sets a cost expectation; category sets a relevance expectation.
- **WHY IT WORKS:** Respects attention. A feed without metadata is a wall; with metadata it is a menu.
- **PING PROBLEM IT COULD SOLVE:** L. TYPOGRAPHY, C. SCROLL STORY
- **PING ADAPTATION:** Any PING feed (build journal, evidence, roadmap) should carry category + cost metadata on every item. Directly compatible with ANT-2's taxonomy idea; the two combine into one feed pattern.
- **COPY RISK:** None. Functional metadata.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P2

### OAI-2 — Homepage as a living publication, not a pitch

- **SOURCE:** OpenAI
- **URL:** https://openai.com
- **ROUTE/SECTION:** / full page arc
- **SECTION DESCRIPTION:** The homepage's dominant content is *what is new and true*: featured research, recent news, stories, latest research. The product pitch is minimal; the freshness of the feed is the message. Sections are dated (Sep 9 2026, Aug 25 2026).
- **WHAT IT DOES:** Makes the site feel alive and accountable. A dated feed cannot hide staleness; it must be maintained, which itself signals operational health.
- **WHY IT WORKS:** For infrastructure buyers, "are these people still shipping and thinking?" matters more than any hero claim. The feed answers it without saying it.
- **PING PROBLEM IT COULD SOLVE:** C. SCROLL STORY, K. STATUS/HONESTY, E. LIVE FEEL
- **PING ADAPTATION:** PING already has a build-journal section. Elevate it: make the journal a dated, categorized, metadata-tagged feed (with OAI-1 metadata and ANT-2 taxonomy) rather than a static section. The journal becomes proof of "knowledge compounds" because the visitor watches it compound.
- **COPY RISK:** Low, provided entries are real and dated. Never backdate or invent entries.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P1

### OAI-3 — "Stories": customer proof as narrative, not logo soup

- **SOURCE:** OpenAI
- **URL:** https://openai.com
- **ROUTE/SECTION:** / "Stories" ("Using ChatGPT to grow ATV Big Air Tour", "Supporting the blind community with ChatGPT", "Accelerating antibiotic discovery with ChatGPT")
- **WHAT IT DOES:** Proof section uses specific, named, dated stories with concrete outcomes instead of a logo wall.
- **WHY IT WORKS:** A logo says "they paid us." A story says "this is what changed." Stories are memorable; logos are wallpaper.
- **PING PROBLEM IT COULD SOLVE:** C. SCROLL STORY
- **PING ADAPTATION:** When PING has real applied-layer outcomes (PING Social), present 2-3 named stories with concrete before/after, not a logo strip. Until then, omit the section rather than faking it.
- **COPY RISK:** High if invented. Only real stories.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P2

---

## CURSOR (cursor.com/home)

Full text captured. Page arc: hero (headline + download CTA) → three capability blocks → install command as code → "The new way to build software." testimonial section (Diana Hu / Jensen Huang / Andrej Karpathy, full multi-sentence quotes) → "Stay on the frontier" (model choice, autonomous agents, enterprise trust) → "Cursor is an applied research team..." team section.

### CUR-1 — Capability triad: bold claim + one-line mechanism, three times

- **SOURCE:** Cursor
- **URL:** https://cursor.com/home
- **ROUTE/SECTION:** / capability blocks (below hero)
- **SECTION DESCRIPTION:** Three ### blocks in parallel structure: "Works autonomously, runs in parallel" / "Agents use their own computers to build, test, and demo features end to end for you to review." Then "In every tool, at every step" / "Cursor runs in your terminal, collaborates in Slack, and reviews PRs in GitHub." Then "Automate repetitive work" / "Set up always-on agents that run on schedules or triggers to build, maintain, and fix your software."
- **WHAT IT DOES:** Each block is a claim (bold, 3-6 words) immediately grounded by a mechanism (one sentence, concrete nouns: computers, terminal, Slack, GitHub, schedules, triggers).
- **WHY IT WORKS:** The claim creates the appetite; the mechanism sentence prevents it from floating into marketing. Parallel structure makes three ideas feel like one system with three facets.
- **PING PROBLEM IT COULD SOLVE:** A. HERO, C. SCROLL STORY
- **PING ADAPTATION:** PING's supporting sections should adopt the claim-plus-mechanism pair as the standard unit. E.g., "It remembers." / "Every observation becomes a timestamped event with provenance, replayable months later." Never a claim without its mechanism sentence.
- **COPY RISK:** Medium. The *pattern* is safe; each PING claim must be true and the mechanism sentence must name real PING concepts.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P1

### CUR-2 — The install command as the primary CTA, rendered as code

- **SOURCE:** Cursor
- **URL:** https://cursor.com/home
- **ROUTE/SECTION:** / mid-page CTA
- **SECTION DESCRIPTION:** Instead of (or alongside) a "Download" button, the page renders `` `curl https://cursor.com/install -fsS | bash` `` as a code block. It is the call to action.
- **WHAT IT DOES:** Speaks to developers in their native artifact (the terminal command) and collapses "learn more" into "do it now" with zero form friction.
- **WHY IT WORKS:** A code CTA is self-qualifying: the people who recognize it are the buyers. It also signals "this product is real enough to install."
- **PING PROBLEM IT COULD SOLVE:** A. HERO, E. LIVE FEEL
- **PING ADAPTATION:** PING's equivalent is not an install command but a *query*. A code block showing the simplest real PING interaction (ask a question, get an answer with evidence) could serve as the developer-native CTA. Only if the interface shown is real.
- **COPY RISK:** Low if the shown interaction is real; high if it depicts a fictional API.
- **VISUAL RISK:** Low. Code blocks are layout-simple.
- **MOBILE BEHAVIOR:** UNKNOWN (code blocks on mobile need horizontal scroll or wrapping; treat carefully)
- **PRIORITY:** P1

### CUR-3 — Testimonials as full expert arguments, not blurbs

- **SOURCE:** Cursor
- **URL:** https://cursor.com/home
- **ROUTE/SECTION:** / "The new way to build software."
- **SECTION DESCRIPTION:** Three quotes, each 2-4 sentences, each making a substantive point, attributed with name + title (Diana Hu, General Partner Y Combinator; Jensen Huang, President & CEO NVIDIA; Andrej Karpathy, CEO Eureka Labs). Karpathy's quote contains a genuinely technical concept (the autonomy slider), not praise.
- **WHAT IT DOES:** Borrows credibility, but more importantly borrows *ideas*. The reader remembers Karpathy's slider concept, not that Karpathy likes Cursor.
- **WHY IT WORKS:** Expert quotes that teach something are content; quotes that only praise are decoration.
- **PING PROBLEM IT COULD SOLVE:** C. SCROLL STORY, H. AUTHORITY
- **PING ADAPTATION:** PING has no such quotes yet; do not invent them. The transferable lesson: when PING earns expert validation, ask for an *idea*, not a blurb. A quotable concept (like the autonomy slider) is worth ten "great product" quotes.
- **COPY RISK:** Critical. Never fabricate testimonials.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P2 (mechanism only; no near-term application)

### CUR-4 — "Use the best model for every task": model-agnosticism as a headline feature

- **SOURCE:** Cursor
- **URL:** https://cursor.com/home
- **ROUTE/SECTION:** / "Stay on the frontier" → "Use the best model for every task" ("Choose between every cutting-edge model from OpenAI, Anthropic, Gemini, SpaceXAI, and Cursor.")
- **WHAT IT DOES:** Turns heterogeneity (many models) from a complexity into the selling point: the platform is the stable layer, the models are interchangeable.
- **WHY IT WORKS:** It reframes a potential weakness ("you don't have your own model") as architecture ("we are neutral, you get the frontier").
- **PING PROBLEM IT COULD SOLVE:** J. MULTI-RUNTIME
- **PING ADAPTATION:** This is the closest mainstream articulation of PING's "one authority, many runtimes." PING's version: "Use the best runtime for every job" — one authority plane, JS workers, Python workers, local, cloud. The mechanism to borrow is the *reframe*: heterogeneity as architecture, not fragmentation.
- **COPY RISK:** Medium. PING must only name runtimes that actually exist or are genuinely in development; label the rest as direction (see problem K).
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P1

### CUR-5 — The autonomy slider: authority as a gradient, not a binary

- **SOURCE:** Cursor (via Andrej Karpathy quote)
- **URL:** https://cursor.com/home
- **ROUTE/SECTION:** / testimonial — "The best LLM applications have an autonomy slider: you control how much independence to give the AI. In Cursor, you can do Cmd+K for targeted edits, or let it rip with the full autonomy agentic version."
- **WHAT IT DOES:** Articulates the intelligence-vs-authority distinction as a *slider* the user controls: targeted edits on one end, full autonomy on the other. Authority becomes a user-operated control, not a vendor promise.
- **WHY IT WORKS:** It names the exact anxiety (how much independence do I give this thing?) and answers it with a mechanism (a slider), not a slogan. Concrete endpoints (Cmd+K vs full agentic) make the abstraction tangible.
- **PING PROBLEM IT COULD SOLVE:** H. AUTHORITY
- **PING ADAPTATION:** This is P0 material for PING. Visualize PING's authority model as a gradient: observe-only → suggest → act-with-approval → act-autonomously, with the business owner holding the slider. PING's concrete endpoints (read-only evidence vs autonomous workers with replay) map cleanly. This could be a signature-moment visual: an actual interactive slider showing what the agent may do at each level.
- **COPY RISK:** Low for the concept; the phrase "autonomy slider" is Karpathy's — PING should use its own wording (e.g., "authority gradient") while crediting the concept's lineage in internal docs, not on the page.
- **VISUAL RISK:** Medium. An interactive slider must be genuinely operable and keyboard-accessible, or it becomes decoration. A static stepped diagram is the safe fallback.
- **MOBILE BEHAVIOR:** UNKNOWN. A slider needs a tap-friendly mobile treatment (stepped buttons rather than a drag handle).
- **PRIORITY:** P0

---

## TOGETHER AI (together.ai)

Full text captured (762 lines). Page arc: hero with abstract 3D visual → massive monochrome trusted-by logo wall (~40 logos) → "The Together AI Platform" with three stat blocks → "Full-stack cloud" tabbed product section (Inference / Compute / Model Shaping) → "Grounded in cutting-edge research" categorized research feed (Kernels / Agents / Inference / Architecture / Model Shaping / Applications, each card with category label, title, author list) → "recognized by" → "AI natives build on Together AI" customer stories.

### TOG-1 — Stat triad: giant number, tiny mechanism line

- **SOURCE:** Together AI
- **URL:** https://www.together.ai
- **ROUTE/SECTION:** / "The Together AI Platform"
- **SECTION DESCRIPTION:** Three stat blocks: "2x / Faster inference / powered by cutting-edge research." / "60% / Lower cost / with workload-specific optimization." / "2x→90% / Faster pre-training / with Together Kernel Collection." The number is enormous; the claim is 2-3 words; the mechanism is one small line.
- **WHAT IT DOES:** The number stops the scroll; the small line converts skepticism into understanding. Hierarchy does the persuasion: number → claim → mechanism.
- **WHY IT WORKS:** Three-part rhythm (big/small/smaller) is scannable in under two seconds and each stat is independently verifiable in principle.
- **PING PROBLEM IT COULD SOLVE:** A. HERO, E. LIVE FEEL
- **PING ADAPTATION:** Use with extreme care. PING's standing constraint forbids fake metrics. Only adapt with numbers PING can prove from the real system (e.g., events recorded, evidence items preserved). If no provable number exists, skip this mechanism entirely rather than weakening it with vague stats.
- **COPY RISK:** High. Any number on PING's page must be real and sourced.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P2 (powerful but currently unusable for PING without real numbers)

### TOG-2 — Separate mobile hero image (deliberate mobile composition)

- **SOURCE:** Together AI
- **URL:** https://www.together.ai
- **ROUTE/SECTION:** / hero images
- **SECTION DESCRIPTION:** The page ships two distinct hero images: `hp-hero_desktop.avif` and `hp-hero_mobile.avif` (alt text: "Abstract 3D shapes..."). The mobile hero is a different asset, not a scaled crop.
- **WHAT IT DOES:** Treats mobile as a separate composition problem. The desktop's wide abstract 3D scene is replaced by a mobile-native visual.
- **WHY IT WORKS:** Complex desktop visuals (topology, 3D scenes) rarely survive shrinking. A separate asset lets each composition be designed for its canvas.
- **PING PROBLEM IT COULD SOLVE:** M. MOBILE
- **PING ADAPTATION:** This is the only *concrete evidence* found of the exact mechanism the brief asks for. PING's complex diagrams (business graph, topology, multi-runtime) should each have a designed mobile alternative (e.g., the graph becomes a stepped list or a simplified radial on mobile), not a scaled-down SVG. Budget mobile compositions as separate design work, not responsive afterthoughts.
- **COPY RISK:** None.
- **VISUAL RISK:** Medium. Doubles visual production work per diagram; prioritize which diagrams earn a mobile variant (signature moments only).
- **MOBILE BEHAVIOR:** KNOWN — this IS the mobile behavior: distinct asset per breakpoint.
- **PRIORITY:** P1

### TOG-3 — Tabbed "full-stack" section: one section, user-controlled facets

- **SOURCE:** Together AI
- **URL:** https://www.together.ai
- **ROUTE/SECTION:** / "Full-stack cloud — Powering every step of the AI development journey—from experimentation to massive scale."
- **SECTION DESCRIPTION:** One section with tab navigation across Inference / Compute / Model Shaping. Each tab reveals sub-products (Serverless Inference, Batch Inference, Dedicated... / Accelerated Compute, Sandbox, Managed Storage / Fine-Tuning), each with a one-line description and its own image. The section never grows longer; the user chooses the facet.
- **WHAT IT DOES:** Compresses a large product surface into one scroll stop. Progressive disclosure without page bloat: complexity is available but not imposed.
- **WHY IT WORKS:** Tabs convert "14 sections of equal weight" into "1 section with 3 facets." The visitor controls depth. Each tab re-uses the same layout, so production cost is linear, not exponential.
- **PING PROBLEM IT COULD SOLVE:** B. SYSTEM VISUALIZATION, C. SCROLL STORY, D. SECTION TRANSITIONS
- **PING ADAPTATION:** P0 candidate. PING's 14 sections are the exact disease this cures. Candidate tabbed compressions: (a) the knowledge-loop stages as tabs within one "system" section; (b) runtime types (JS / Python / local / cloud) as tabs within one "execution" section. Tabs must be keyboard-accessible with proper tablist semantics.
- **COPY RISK:** Low. Tab labels are functional.
- **VISUAL RISK:** Medium. Tab content switching needs to feel instant and stable (no layout shift); each tab needs its own visual.
- **MOBILE BEHAVIOR:** UNKNOWN (tabs often become accordions or horizontal scrollers on mobile; either is acceptable if deliberate)
- **PRIORITY:** P0

### TOG-4 — Research feed as the evidence engine: the papers ARE the marketing

- **SOURCE:** Together AI
- **URL:** https://www.together.ai
- **ROUTE/SECTION:** / "Grounded in cutting-edge research — Foundational systems research for production AI."
- **SECTION DESCRIPTION:** A long feed of real research cards (ThunderKittens, FlashAttention-4, Mamba-3, Sequoia...), each with a category label (Kernels / Agents / Inference / Architecture / Model Shaping / Applications), a title, and a full author list. Dozens of entries. The feed is the proof of "research-optimized platform."
- **WHAT IT DOES:** Replaces claims about research with the research itself. Volume + specificity + attribution = credibility no slogan can match.
- **WHY IT WORKS:** It is checkable. Named papers with named authors can be verified; "cutting-edge research" cannot. The category labels make a long feed navigable.
- **PING PROBLEM IT COULD SOLVE:** I. EVIDENCE/REPLAY/LINEAGE, K. STATUS/HONESTY
- **PING ADAPTATION:** PING's analog is not papers but *evidence*: a feed of real timestamped events, replays, and decisions with provenance. The mechanism to borrow: volume + specificity + attribution as the trust strategy. PING's build journal should aspire to this density of checkable entries.
- **COPY RISK:** Low, as long as every entry is real.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P1

### TOG-5 — Persistent category eyebrows across the whole page

- **SOURCE:** Together AI
- **URL:** https://www.together.ai
- **ROUTE/SECTION:** / throughout (research feed, product tabs)
- **SECTION DESCRIPTION:** Category labels (Kernels, Agents, Inference, Architecture, Model Shaping, Applications) appear as small eyebrows on every card, consistently styled, creating a taxonomy the reader learns within one screen.
- **WHAT IT DOES:** Gives the reader a mental index of the company's world. After three cards, you know the categories; every subsequent card is instantly placed.
- **WHY IT WORKS:** Taxonomy reduces cognitive load. The reader stops reading titles cold and starts reading them *within* a known frame.
- **PING PROBLEM IT COULD SOLVE:** L. TYPOGRAPHY
- **PING ADAPTATION:** PING should define 4-6 canonical category eyebrows (candidates: Observe, Remember, Connect, Act, Prove, Govern — or Event, Evidence, Replay, Authority) and use them relentlessly across sections, diagrams, and the journal. Consistency is the mechanism.
- **COPY RISK:** Low. Pick PING's own terms once, then never deviate.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P2

### TOG-6 — Logo wall at scale, held calm by monochrome discipline

- **SOURCE:** Together AI
- **URL:** https://www.together.ai
- **ROUTE/SECTION:** / "Trusted by" logo wall
- **SECTION DESCRIPTION:** ~40 customer logos (Cursor, Decagon, DeepMind, ElevenLabs, Mozilla, Quora, Zoom, Weights & Biases...). Every logo is black or gray monochrome (`_black.svg` / `-gray.png` filenames). No color anywhere in the wall.
- **WHAT IT DOES:** Achieves scale-of-proof (40 logos) without visual chaos. Monochrome unifies wildly different brand marks into texture.
- **WHY IT WORKS:** Color is what makes logo walls noisy. Removing it converts the wall from "advertising" to "evidence."
- **PING PROBLEM IT COULD SOLVE:** C. SCROLL STORY
- **PING ADAPTATION:** Not currently applicable (PING has no customer logos to show). File as a future pattern: when PING earns logos, enforce monochrome.
- **COPY RISK:** None.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P2

---

## REPLICATE (replicate.com)

Full text captured. Page arc: "Run AI with an API" hero → "How it works": a three-rung ladder — Run models (one line of code, concrete flux-dev example with the prompt "An astronaut riding a rainbow unicorn, cinematic, dramatic") → Fine-tune models with your own data (longer code, named version hash) → Deploy custom models with Cog (cog.yaml + predict.py, most code).

### REP-1 — Progressive complexity ladder: 1 line → N lines → full config

- **SOURCE:** Replicate
- **URL:** https://replicate.com
- **ROUTE/SECTION:** / "How it works"
- **SECTION DESCRIPTION:** The page's core is a three-step ladder with an explicit framing sentence: "You can get started with any model with just one line of code. But as you do more complex things, you can fine-tune models or deploy your own custom code." Step 1 shows ~10 lines (run a model). Step 2 shows ~25 lines (train a fine-tune, with a full version hash). Step 3 shows a cog.yaml plus a predict.py class (deploy custom code). Each rung shows the *actual* code.
- **WHAT IT DOES:** Reveals complexity progressively while proving depth. The beginner sees rung 1 and stops; the expert scrolls to rung 3 and is satisfied. Nobody is lied to about simplicity, nobody is drowned in it either.
- **WHY IT WORKS:** It respects both audiences simultaneously. The framing sentence is honest about the tradeoff ("as you do more complex things..."), which paradoxically increases trust in rung 1's simplicity claim.
- **PING PROBLEM IT COULD SOLVE:** B. SYSTEM VISUALIZATION, C. SCROLL STORY
- **PING ADAPTATION:** P0 candidate. PING's homepage should be structured as a ladder, not a list: rung 1 = ask PING a question (one interaction); rung 2 = inspect the evidence behind the answer (a trace); rung 3 = run agents with authority boundaries (the full system). This directly attacks "14 sections at equal weight": the page becomes 3 rungs with increasing depth, and existing sections slot into rungs.
- **COPY RISK:** Medium. Each rung's example must be real (see REP-2). The framing sentence must be rewritten in PING's voice, not Replicate's.
- **VISUAL RISK:** Medium. Code rungs need careful responsive treatment (horizontal scroll on mobile, or simplified).
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P0

### REP-2 — The example is concrete, runnable, and slightly playful

- **SOURCE:** Replicate
- **URL:** https://replicate.com
- **ROUTE/SECTION:** / "Run models" code block
- **SECTION DESCRIPTION:** The rung-1 example is not `model.run(input)` pseudocode. It is a complete call with a real model (`black-forest-labs/flux-dev`), real parameters (aspect_ratio, num_outputs, output_format, output_quality), and a vivid prompt: "An astronaut riding a rainbow unicorn, cinematic, dramatic".
- **WHAT IT DOES:** Proves the API is real by showing a real call, and makes it memorable through specificity. The reader can picture the output.
- **WHY IT WORKS:** Abstract examples ("foo", "bar", "your data here") signal documentation; concrete examples signal a working product. Playfulness makes it stick without undermining seriousness.
- **PING PROBLEM IT COULD SOLVE:** E. LIVE FEEL
- **PING ADAPTATION:** PING's homepage examples must use concrete business content, never placeholders. Show a real question a contractor would ask, a real event with real fields, a real evidence trail. The "astronaut unicorn" lesson: pick one vivid, specific, true example and reuse it consistently so it becomes PING's canonical demo.
- **COPY RISK:** Medium. The example must be real; if it uses a fictional business, label it as illustrative.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P1

### REP-3 — Full version hashes shown in the open

- **SOURCE:** Replicate
- **URL:** https://replicate.com
- **ROUTE/SECTION:** / "Fine-tune models" code block (`version="ostris/flux-dev-lora-trainer:e440909d3512c31646ee2e0c7d6f6f4923224863a6a10c494606e79fb5844497"`)
- **WHAT IT DOES:** Displays the complete immutable version hash in marketing-page code. Versioning is treated as a feature, not an implementation detail.
- **WHY IT WORKS:** Hashes are honesty made visible. They say "this exact thing ran" in a way prose cannot. Technical audiences read hashes as care.
- **PING PROBLEM IT COULD SOLVE:** I. EVIDENCE/REPLAY/LINEAGE, K. STATUS/HONESTY
- **PING ADAPTATION:** PING's evidence/replay story should show real identifiers: event IDs, content hashes, replay cursors. Truncated hashes with copy affordance, shown in the evidence section and journal, would make "replayable" tangible rather than asserted.
- **COPY RISK:** Low, provided the IDs shown are real.
- **VISUAL RISK:** Low. Monospace, truncated with ellipsis is the standard treatment.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P2

---

## LANGCHAIN / LANGSMITH (langchain.com)

Full text captured. Page arc: hero ("the open agent platform to own your intelligence" + rotating fragments: "Put insights to work", "Smarter after every launch", "We catch your drift", with Einstein/Newton/Franklin themed visuals) → huge logo marquee → the six-stage lifecycle spine: Build / Test / Deploy / Monitor / Iterate / Govern (each: one-line description + 3 bold-verb bullets) → "Learn from teams running agents in production" → "Trusted by the largest builder community in AI" (350M+ monthly downloads, 7K+ LangSmith customers, 5 of Fortune 10) → "Get started with LangSmith" CTA.

LangSmith product homepage (from their changelog + blog, since the app requires login): reorganized into three areas — Observability, Evaluation, Prompt Engineering — each with a parenthetical purpose clause, e.g. "Observability (to identify issues quickly and understand your LLM app's performance over time)."

### LC-1 — The lifecycle as the page spine: six verbs, six screens

- **SOURCE:** LangChain
- **URL:** https://www.langchain.com
- **ROUTE/SECTION:** / Build → Test → Deploy → Monitor → Iterate → Govern
- **SECTION DESCRIPTION:** The homepage's middle is six consecutive sections, each named with a single verb. Each follows an identical template: verb headline, one-line description, three bullets. Build: "Build agents fast with or without code. Choose your model. Own your harness." Test: "Validate behavior before you ship. Turn traces into realistic datasets and eval every step." Deploy: "Ship agents on infra built for long-running tasks, persistent state, and secure execution." Monitor: "Catch issues in production with online evals, dashboards, and alerts built for agents." Iterate: "Compound agent intelligence through a feedback loop you own." Govern: "Enforce cost limits and detect sensitive data before damage happens."
- **WHAT IT DOES:** Turns the product surface into a narrative with a beginning, middle, and end. The verbs imply motion; the identical template makes six sections feel like one system with six phases rather than six disconnected pitches.
- **WHY IT WORKS:** A lifecycle is a story structure the reader already knows (plan → do → check). It gives every capability a *place*, which is what PING's 14 sections lack. Repetition of the template is a feature: the reader learns the rhythm once and then reads faster.
- **PING PROBLEM IT COULD SOLVE:** C. SCROLL STORY, G. KNOWLEDGE LOOP
- **PING ADAPTATION:** This is the strongest structural precedent for PING's knowledge loop as page architecture. PING's loop (Observation → Evidence → Event → Knowledge → Playbook → Automation → Memory) should be rendered as the page spine with the same verb-headline + one-line + bullets template. Caution: 7-8 stages may be too many for one rhythm; consider compressing to 5-6 (LangChain's count works because each stage is one screen). Candidate compression: Observe → Preserve (evidence+event) → Connect (knowledge+graph) → Act (playbook+automation) → Compound (memory) → Govern (authority).
- **COPY RISK:** Medium. PING must use its own verbs and resist mirroring LangChain's exact six.
- **VISUAL RISK:** Medium. Six same-template sections risk monotony; vary the visual per stage (diagram, code, feed) while keeping the text template constant — LangChain appears to do this via per-stage imagery.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P0

### LC-2 — "Detect / Find / Feed": the compounding loop in three verbs

- **SOURCE:** LangChain
- **URL:** https://www.langchain.com
- **ROUTE/SECTION:** / "Iterate — Compound agent intelligence through a feedback loop you own." Bullets: "**Detect** *production issues automatically with Engine, the agent for agent engineering*" / "**Find** *root causes and make targeted fixes*" / "**Feed** *every fix back into your eval loop*"
- **WHAT IT DOES:** Compresses the entire "knowledge compounds" thesis into three verbs that form a closed loop: detect → find → feed (back). The third verb closes the circle, which is what makes it compounding rather than linear.
- **WHY IT WORKS:** Three verbs are memorable; the loop-closing third verb is the insight. "Feed every fix back into your eval loop" is the whole PING thesis in eight words, applied to evals.
- **PING PROBLEM IT COULD SOLVE:** G. KNOWLEDGE LOOP
- **PING ADAPTATION:** PING should find its own three-verb (or four-verb) closed loop and repeat it everywhere: hero, section, journal. Candidates: "Observe → Preserve → Compound" or "Capture → Prove → Compound." The critical property: the last verb must feed back into the first. This is P0 because PING's current loop description is eight stages long, which nobody will remember.
- **COPY RISK:** Medium. Do not reuse "Detect/Find/Feed" verbatim; find PING's own verbs.
- **VISUAL RISK:** Low. A three-verb loop is the easiest compounding visual to draw (circular arrangement with a return arrow).
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P0

### LC-3 — Bold-verb + italic-mechanism bullets as the standard text unit

- **SOURCE:** LangChain
- **URL:** https://www.langchain.com
- **ROUTE/SECTION:** / all lifecycle sections, e.g. "**Debug** *agent runs with step-by-step tracing*", "**Require** *human approval for sensitive agent actions*", "**Run** *agent-generated code in isolated sandboxes*"
- **WHAT IT DOES:** Every bullet is two beats: a bold imperative verb (the action) and an italic clause (the mechanism). Eighteen bullets across six sections, all in the same rhythm.
- **WHY IT WORKS:** The bold verbs create a skim layer (read only the verbs: Debug, Query, Turn, Build, Standardize, Run...); the italics create a depth layer. Two reading speeds in one list.
- **PING PROBLEM IT COULD SOLVE:** L. TYPOGRAPHY
- **PING ADAPTATION:** Adopt as PING's standard bullet pattern across the homepage. It pairs naturally with CUR-1's claim-plus-mechanism blocks: the block makes the claim, the bullets enumerate with verb-first rhythm.
- **COPY RISK:** Low. The pattern is typographic, not verbal.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P1

### LC-4 — "Govern" as a lifecycle stage, not a footnote

- **SOURCE:** LangChain
- **URL:** https://www.langchain.com
- **ROUTE/SECTION:** / "Govern — Enforce cost limits and detect sensitive data before damage happens." Bullets: "**Control** *model calls, spend, and sensitive data with LLM Gateway*" / "**Require** *human approval for sensitive agent actions*" / "**Deploy** *in SaaS, BYOC, or self-hosted environments*"
- **WHAT IT DOES:** Places authority, permissions, and human approval as the sixth and final lifecycle stage — equal in weight to Build and Deploy, positioned as the culmination rather than a caveat.
- **WHY IT WORKS:** Sequencing is meaning. Putting Govern last says "maturity ends in control." It also normalizes authority as part of the workflow rather than a tax on it.
- **PING PROBLEM IT COULD SOLVE:** H. AUTHORITY
- **PING ADAPTATION:** PING's authority section should be positioned with equal weight to the knowledge loop — ideally as the stage that *completes* the loop (act → govern → compound). "Require human approval for sensitive agent actions" is the exact sentence pattern PING needs for its own approval gates. Combine with CUR-5's slider: Govern is the stage, the slider is the control.
- **COPY RISK:** Medium. Rewrite in PING's terms (approval gates, replay, evidence) rather than LangChain's (LLM Gateway, spend limits).
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P1

### LC-5 — Rotating hero fragments over a stable headline

- **SOURCE:** LangChain
- **URL:** https://www.langchain.com
- **ROUTE/SECTION:** / hero ("Put insights to work" / "Smarter after every launch" / "We catch your drift" over the stable "the open agent platform to own your intelligence")
- **SECTION DESCRIPTION:** The hero pairs one stable positioning headline with short rotating phrases (text fetch shows three fragments; the rotation animation itself could not be observed — likely a timed text swap, possibly with themed Einstein/Newton/Franklin visuals per fragment based on image filenames).
- **WHAT IT DOES:** Lets the hero say three things in the space of one. The stable line positions; the rotating line proves, with variety.
- **WHY IT WORKS:** Rotation converts a static hero into a multi-faceted one without adding length. Each fragment is short enough to read in the rotation window.
- **PING PROBLEM IT COULD SOLVE:** A. HERO
- **PING ADAPTATION:** PING's hero could rotate proof fragments over a stable headline: "It observes." / "It remembers." / "It proves." — each 2-3 words. Respects reduced-motion: the rotation must pause or degrade to a static list when prefers-reduced-motion is set.
- **COPY RISK:** Low.
- **VISUAL RISK:** Medium. Text rotation needs careful timing and reduced-motion handling; a badly timed rotator is worse than a static line.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P2

### LC-6 — Logo marquee at very large scale

- **SOURCE:** LangChain
- **URL:** https://www.langchain.com
- **ROUTE/SECTION:** / customer logo marquee (Listen, Rillet, Vanta, Clay, Rippling, Lyft, Harvey, Abridge, Expedia, Autodesk, Cisco, Nvidia, Coinbase, etc., repeated)
- **WHAT IT DOES:** A wide, repeating marquee of customer logos, grayscale, high count (~25+ unique).
- **WHY IT WORKS:** Same mechanism as TOG-6 (monochrome discipline at scale), with motion added. Repetition implies abundance.
- **PING PROBLEM IT COULD SOLVE:** C. SCROLL STORY (future)
- **PING ADAPTATION:** Not applicable until PING has customers. Noted for completeness; do not build a fake marquee.
- **COPY RISK:** None.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P2

### LC-7 — LangSmith's three-area product homepage with parenthetical purpose clauses

- **SOURCE:** LangChain (changelog + blog describing the redesigned LangSmith homepage)
- **URL:** https://www.langchain.com/blog/langsmith-homepage-redesign-and-resource-tags
- **ROUTE/SECTION:** LangSmith product homepage (smith.langchain.com; login-walled, described secondhand)
- **SECTION DESCRIPTION:** The LangSmith homepage is organized into three areas — Observability, Evaluation, Prompt Engineering — and each area carries a parenthetical purpose clause: "Observability *(to identify issues quickly and understand your LLM app's performance over time)*", "Evaluation *(to ensure continuous LLM app improvement by evaluating datasets and highlighting regressions)*", "Prompt Engineering *(to iterate and collaborate on prompts for optimization)*."
- **WHAT IT DOES:** Every section answers "what is this FOR?" in the same breath as naming itself. The purpose clause is part of the heading, not buried in body copy.
- **WHY IT WORKS:** It eliminates the most common homepage failure: named sections whose purpose the visitor must infer. The parenthetical is a contract: this section exists to do X.
- **PING PROBLEM IT COULD SOLVE:** C. SCROLL STORY, L. TYPOGRAPHY
- **PING ADAPTATION:** Every PING homepage section should carry a purpose clause in or directly under its heading. E.g., "Evidence *(so every answer can show its work)*", "Replay *(so any decision can be re-examined)*". This is cheap, high-leverage, and directly fixes "too many ideas at similar weight" by forcing each section to justify its existence in one clause.
- **COPY RISK:** Low. Purpose clauses are functional; write PING's own.
- **VISUAL RISK:** Low. Style as a subtitle or parenthetical in the eyebrow.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P1

---

## WEIGHTS & BIASES (wandb.ai/site/)

Text captured. Structure observed: nav (Models, Training, Inference, Weave, Registry, Core, Secure deployment) → cloud-provider logo strip (AWS, CoreWeave, Google Cloud, Azure) → iOS app announcement banner → compliance badge strip (ISO 27001, SOC 2, HIPAA, GDPR) → customer quote (Neuralift on Weave) → a large carousel of real code samples (weave.init with OpenAI / LangChain / LlamaIndex; wandb.init training loops across PyTorch, HF Trainer, Lightning, TensorFlow, Keras, XGBoost, sklearn). Hero headline text was not captured (likely JS-rendered); the page leads with product surface, not pitch.

### WB-1 — Homepage as a code-sample carousel: the product IS the API

- **SOURCE:** Weights & Biases
- **URL:** https://wandb.ai/site/
- **ROUTE/SECTION:** / mid-page code carousel
- **SECTION DESCRIPTION:** The page's largest content block is a carousel of 8+ complete, real, copy-pasteable code samples: `weave.init("weave-intro")` with an `@weave.op`-decorated function calling OpenAI; the same pattern with LangChain and LlamaIndex; then `wandb.init(project=...)` training loops across PyTorch, Hugging Face Trainer, PyTorch Lightning, TensorFlow, Keras, XGBoost, and sklearn. Real imports, real config, real log calls.
- **WHAT IT DOES:** Demonstrates the product by showing its actual usage surface. No mockups, no illustrations of the concept — the integration code is the visual.
- **WHY IT WORKS:** For a developer buyer, 10 lines of real code answer "how does this fit my stack?" faster than any diagram. The carousel format shows breadth (many frameworks) without lengthening the page.
- **PING PROBLEM IT COULD SOLVE:** E. LIVE FEEL, B. SYSTEM VISUALIZATION
- **PING ADAPTATION:** PING's "live feel" should come from real artifacts, not decorative animation: a rotating display of a real event JSON, a real evidence trail, a real replay command. If PING ever has a query API, its minimal invocation becomes the code sample. Until then, real event/evidence payloads are the honest equivalent.
- **COPY RISK:** Low if artifacts are real; critical if fabricated.
- **VISUAL RISK:** Medium. Code carousels need syntax highlighting, horizontal scroll on mobile, and must not autoplay too fast to read.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P1

### WB-2 — Compliance badges as a quiet strip, not a section

- **SOURCE:** Weights & Biases
- **URL:** https://wandb.ai/site/
- **ROUTE/SECTION:** / trust strip ("Certified under ISO 27001:2022, ISO 27017:2015, ISO 27018:2019; Compliant with SOC 2, HIPAA, NIST 800-53, GDPR")
- **WHAT IT DOES:** Compresses an entire trust argument into one quiet line of badges. No section, no headline, no paragraphs.
- **WHY IT WORKS:** Badges are binary (certified or not); they need no explanation. Giving them a full section would inflate their importance and invite scrutiny.
- **PING PROBLEM IT COULD SOLVE:** K. STATUS/HONESTY
- **PING ADAPTATION:** PING must not claim certifications it lacks. The transferable mechanism is the *quiet strip*: PING's honest statuses (BUILT / ACTIVE DEVELOPMENT / EXPERIMENTAL / DIRECTION) should be presented as a calm, compact strip or as small labels on sections — never as a dashboard, never inflated into a section. Understatement is the honesty signal.
- **COPY RISK:** High if PING implies certifications. Keep strictly to real statuses.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P2

### WB-3 — Framework matrix: one pattern, eight runtimes, shown not told

- **SOURCE:** Weights & Biases
- **URL:** https://wandb.ai/site/
- **ROUTE/SECTION:** / code carousel (PyTorch → HF Trainer → Lightning → TF → Keras → XGBoost → sklearn)
- **WHAT IT DOES:** Shows the *same* integration pattern (`wandb.init`, log calls) repeated across eight frameworks. The repetition is the argument: one platform, every stack.
- **WHY IT WORKS:** Multi-runtime claims are usually told ("works everywhere"). Showing the same three lines working in eight frameworks proves it without a single adjective.
- **PING PROBLEM IT COULD SOLVE:** J. MULTI-RUNTIME
- **PING ADAPTATION:** PING's multi-runtime story should be shown as one event flowing through multiple runtimes: the same canonical event rendered as handled by a JS worker, a Python worker, a local execution, a cloud execution. Same event, four handlers — the repetition is the proof of "one authority, many runtimes." This is stronger than any topology diagram for this specific claim.
- **COPY RISK:** Medium. Only show runtimes that genuinely exist; label others as direction.
- **VISUAL RISK:** Medium. Four parallel panels need a clean side-by-side on desktop and a deliberate stacked/tabbed treatment on mobile.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P1

---

## HUGGING FACE (huggingface.co) — discovered addition

Full text captured. Page arc: hero ("The AI community building the future." / "Create, discover and collaborate on ML better.") → four ultra-short sections (The collaboration platform / Move faster / Explore all modalities / Build your portfolio — each a 2-4 word headline, one line, one visual) → Team & Enterprise / Inference Providers / Compute → open-source library wall with live GitHub star counts (Transformers 166,257; Diffusers 34,531; smolagents 29,350; Datasets 21,978...).

### HF-1 — Four ultra-short sections: 3-word headline + one line + one visual

- **SOURCE:** Hugging Face
- **URL:** https://huggingface.co
- **ROUTE/SECTION:** / "The collaboration platform" / "Move faster" / "Explore all modalities" / "Build your portfolio"
- **SECTION DESCRIPTION:** Four consecutive sections, each approximately 15 words total. Example: "### The collaboration platform / Host and collaborate on unlimited public models, datasets and applications." Each pairs with one SVG visual (activity feed, code snippets, modality grid, profile). No section exceeds two sentences.
- **WHAT IT DOES:** Delivers breadth (four distinct value props) at minimum scroll cost. Each section is a glance, not a read.
- **WHY IT WORKS:** Extreme compression forces clarity: if you cannot say it in one line, you do not understand it. The uniform 15-word budget makes four sections feel like one idea with four facets.
- **PING PROBLEM IT COULD SOLVE:** C. SCROLL STORY
- **PING ADAPTATION:** PING's supporting sections (the ones that are NOT signature moments) should be compressed to this density: headline (≤4 words) + one mechanism line + one visual. This is how 14 sections stop feeling like 14 sections — most of them shrink to glances, leaving the signature moments dominant by contrast.
- **COPY RISK:** Low. Compression is a discipline, not a voice.
- **VISUAL RISK:** Low, but each glance-section still needs its one visual; low word count does not mean low design effort.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P1

### HF-2 — Live star counts as self-updating honest metrics

- **SOURCE:** Hugging Face
- **URL:** https://huggingface.co
- **ROUTE/SECTION:** / open-source library wall ("Transformers 166,257", "Diffusers 34,531", "smolagents 29,350", "Tokenizers 11,040"...)
- **WHAT IT DOES:** Shows real GitHub star counts next to each library. The numbers update themselves; they cannot be marketing-inflated without being checkable in one click.
- **WHY IT WORKS:** Self-updating metrics are the honest version of TOG-1's stat triad. The number is big, but its source (GitHub) is named, so skepticism has somewhere to go and be resolved.
- **PING PROBLEM IT COULD SOLVE:** K. STATUS/HONESTY, E. LIVE FEEL
- **PING ADAPTATION:** PING should only display metrics that are live-sourced and checkable: event counts from the real system, journal entry counts, replay counts. A number with a named live source beats a bigger number with no source. If PING cannot source it live yet, show nothing.
- **COPY RISK:** Low, provided the source is real and named.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P1

### HF-3 — The community's live activity feed as hero-adjacent visual

- **SOURCE:** Hugging Face
- **URL:** https://huggingface.co
- **ROUTE/SECTION:** / "The collaboration platform" visual ("Hub activity feed" SVG, light/dark variants)
- **SECTION DESCRIPTION:** Directly under the hero, the first visual is not a product mockup but an activity feed — the pulse of the community, rendered as a feed graphic with light and dark variants.
- **WHAT IT DOES:** Makes "community/platform" tangible by showing its *output* (activity) rather than its *interface*. The feed implies liveness without claiming real-time data.
- **WHY IT WORKS:** Activity is the most legible proof of a platform. A feed graphic says "things happen here" in one glance.
- **PING PROBLEM IT COULD SOLVE:** A. HERO, E. LIVE FEEL
- **PING ADAPTATION:** PING's "living system hero" candidate: the hero visual could be a stylized event feed — observations arriving, becoming evidence, compounding. Even a stylized (clearly illustrative, not fake-live) feed would communicate "this system is alive" better than any static diagram. If a real feed is possible later, it replaces the stylized one.
- **COPY RISK:** Medium. A stylized feed must not be presented as live data. Label illustrative visuals honestly or make them abstract enough that no one mistakes them for data.
- **VISUAL RISK:** Medium. Feed visuals can look busy; they need strong hierarchy (time, type, status).
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P2

---

## DAYTONA (daytona.io) — discovered addition

Full text captured. Page arc: hero ("Secure Infrastructure for Running AI-Generated Code" / "Fast, Scalable, Stateful Infrastructure for AI Agents." / giant "90ms" stat) → "Separated & Isolated Runtime Protection" → "Massive Parallelization for Concurrent AI Workflows" → "Programmatic Control. File, Git, LSP, and Execute API." → "AI-First Infrastructure. Optimized for LLMs, Agents, and Evals." → "More Than a Sandbox. The Runtime AI Agents Actually Need." → Computer Use sandboxes (Linux/Windows/macOS) → "Human in the Loop. Full Access for Debugging, Oversight, or Intervention — Without Breaking Autonomy." (SSH, VS Code browser, web terminal) → "Built to Run Untrusted Code. Protected Secrets. Your Cloud. Certified Security." (masked secret strings rendered visibly; "Daytona Secrets keep plaintext credentials outside the sandbox and substitute them at network egress") → "Customer-Managed Compute: Sandboxes run on isolated, customer-managed compute in your cloud. Daytona provides the control plane." → testimonials → FAQ.

Daytona is the most PING-relevant discovery: it sells sandboxed agent execution with explicit authority boundaries, which is PING's multi-runtime + authority story from an adjacent angle.

### DAY-1 — "The Runtime AI Agents Actually Need": the runtime as the product

- **SOURCE:** Daytona
- **URL:** https://www.daytona.io
- **ROUTE/SECTION:** / "More Than a Sandbox. The Runtime AI Agents Actually Need."
- **SECTION DESCRIPTION:** A section that positions the execution environment itself — not the model, not the agent framework — as the product. Supporting sections enumerate runtime capabilities: "Programmatic Control. File, Git, LSP, and Execute API.", "AI-First Infrastructure. Optimized for LLMs, Agents, and Evals.", Computer Use sandboxes across Linux/Windows/macOS.
- **WHAT IT DOES:** Inverts the usual AI stack pitch (model on top, infra invisible) by making the runtime the hero. The control plane is the thin layer; execution is the product surface.
- **WHY IT WORKS:** It names the thing everyone needs but no one markets. For agent builders, the runtime is where things actually break, so a vendor that takes it seriously earns attention.
- **PING PROBLEM IT COULD SOLVE:** J. MULTI-RUNTIME
- **PING ADAPTATION:** PING's architecture has the same shape inverted: PING is the authority/control plane, runtimes are the execution surface. Daytona proves the market understands "control plane + runtimes" as a story. PING's version: "One authority. Every runtime your work already runs on." Borrow the *inversion clarity*, not the sandbox specifics.
- **COPY RISK:** Low for the structural idea; PING must not imply it provides sandboxes itself.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P1

### DAY-2 — Masked secrets rendered visibly: the security mechanism IS the visual

- **SOURCE:** Daytona
- **URL:** https://www.daytona.io
- **ROUTE/SECTION:** / "Secrets Stay Out of Sandboxes — Daytona Secrets keep plaintext credentials outside the sandbox and substitute them at network egress." Rendered with visible masked strings: `M•P•L•E•9•9•9•z•9•9•_•A•7•K•4•Q•2•X•M••••••`, `s•k•_•l•i•v•e•_•5•1•N•z•E•7•p•Q•9•x••••••`, `g•h•p•_•R•8•x•4•L•m•2•N•p•7•Q•w•D•3•f•B••••••`
- **WHAT IT DOES:** Shows redaction itself as the visual proof of a security boundary. The masked characters are the design element; the mechanism (substitution at network egress) is stated in one line.
- **WHY IT WORKS:** It makes an invisible boundary visible without exposing anything. Redaction is universally understood; the visual teaches the architecture (secrets live outside, substituted at egress) in one glance.
- **PING PROBLEM IT COULD SOLVE:** H. AUTHORITY, I. EVIDENCE/REPLAY/LINEAGE
- **PING ADAPTATION:** P0-adjacent. PING's authority boundaries could be shown the same way: an agent action rendered with its approval gate visible — e.g., a proposed action with the approver, the evidence cited, and the grant/deny control. "Show the gate, not the claim." A PING visual of a held action awaiting approval, with masked/held fields, would make "intelligence ≠ authority" tangible.
- **COPY RISK:** Low. The pattern is visual-functional.
- **VISUAL RISK:** Medium. Must be genuinely readable (masked strings need monospace, good contrast) and must not accidentally resemble real secrets.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P0

### DAY-3 — "Human in the Loop... Without Breaking Autonomy"

- **SOURCE:** Daytona
- **URL:** https://www.daytona.io
- **ROUTE/SECTION:** / "Human in the Loop. Full Access for Debugging, Oversight, or Intervention — Without Breaking Autonomy." (SSH Access / VS Code Browser / Web Terminal)
- **WHAT IT DOES:** Names the exact tension in agent authority — oversight vs autonomy — and resolves it with mechanisms, not reassurance: SSH into any sandbox, open it in VS Code, get a web terminal. Oversight is *access*, not a dashboard.
- **WHY IT WORKS:** "Without Breaking Autonomy" acknowledges the fear (that oversight cripples the agent) and answers it. The mechanisms listed are tools the reader already trusts (SSH, VS Code), so the claim inherits their credibility.
- **PING PROBLEM IT COULD SOLVE:** H. AUTHORITY
- **PING ADAPTATION:** PING's replay/oversight story should be framed identically: "Full visibility into every agent action — without breaking autonomy." PING's mechanisms: replay any decision, inspect its evidence, see who approved it. The transferable sentence shape is "[Oversight capability]. [Access mechanisms]. Without breaking autonomy."
- **COPY RISK:** Low, rewritten in PING's terms.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P1 (pairs with DAY-2; together they form PING's authority section)

### DAY-4 — One giant stat as the hero ("90ms")

- **SOURCE:** Daytona
- **URL:** https://www.daytona.io
- **ROUTE/SECTION:** / hero ("Sub 90ms sandbox creation from code to execution." rendered as a giant "9 0 m s")
- **WHAT IT DOES:** Reduces the entire value proposition to one enormous number with a one-line mechanism. The hero is a metric.
- **WHY IT WORKS:** A single huge number is the fastest possible hero to parse. It works only because the number is specific, falsifiable, and central to the product.
- **PING PROBLEM IT COULD SOLVE:** A. HERO
- **PING ADAPTATION:** Not currently usable. PING has no single falsifiable performance number that defines it, and inventing one would violate the no-fake-metrics constraint. Noted as a pattern to revisit only if PING ever has such a number (e.g., proven replay determinism rate — but even that needs care).
- **COPY RISK:** Critical if invented. Do not use until real.
- **VISUAL RISK:** Low.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P2

### DAY-5 — "Your cloud. Our control plane.": one authority, many execution sites

- **SOURCE:** Daytona
- **URL:** https://www.daytona.io
- **ROUTE/SECTION:** / "Customer-Managed Compute — Sandboxes run on isolated, customer-managed compute in your cloud. Daytona provides the control plane. No shared compute. No cross-tenant risk."
- **WHAT IT DOES:** Articulates heterogeneous execution converging through one control plane in three short sentences: where execution happens (your cloud), what the vendor provides (the control plane), what that guarantees (no shared compute, no cross-tenant risk).
- **WHY IT WORKS:** It is the "one authority, many runtimes" story in its purest commercial form. Each sentence answers one question: where, what, so-what. "No shared compute. No cross-tenant risk." converts architecture into guarantees.
- **PING PROBLEM IT COULD SOLVE:** J. MULTI-RUNTIME
- **PING ADAPTATION:** P0. This is the closest in-the-wild articulation of PING's signature multi-runtime story. PING's version: "Workers run where your work runs — JS, Python, local, cloud. PING provides the authority plane: every action evidenced, every decision replayable." Same three-beat structure: where execution happens / what PING provides / what that guarantees. This could anchor the multi-runtime signature moment.
- **COPY RISK:** Medium. PING must only claim runtimes and guarantees that are real; the "so-what" sentence must be provable (evidence/replay), not aspirational.
- **VISUAL RISK:** Low. The three-beat structure works as text; the visual (topology of runtimes under one authority) is a separate design task.
- **MOBILE BEHAVIOR:** UNKNOWN
- **PRIORITY:** P0

---

## Cross-site patterns (synthesis)

These mechanisms appeared on multiple sites independently; convergence suggests they are load-bearing, not stylistic.

1. **Bold-verb bullets** (LangChain, Cursor, Daytona): verb in bold + mechanism in regular/italic. The skim layer is verbs; the depth layer is mechanisms. Adopt as PING's default list pattern. (L)
2. **Purpose clauses on sections** (LangSmith, Together): every section says what it is FOR, in the heading or directly under it. Adopt as a completeness check for every PING section. (C, L)
3. **Claim + mechanism pairs** (Cursor, Together stat triad, Daytona): no claim appears without its one-line mechanism. Adopt as a per-block rule. (A, C)
4. **Monochrome discipline for proof elements** (Together, LangChain logo walls): proof (logos, badges) is quiet; color is reserved for the product story. (C)
5. **Progressive disclosure over long pages** (Together tabs, Replicate ladder, LangChain lifecycle): complexity is available, never imposed. The page gets shorter by giving the visitor controls, not by deleting content. (B, C, D)
6. **Checkable over assertive** (Together research feed, Replicate hashes, HF star counts): the strongest trust signal on every site was something the visitor could verify, not something they were asked to believe. (I, K)

## What this group did NOT yield

- **F. GRAPH:** No site in this group had an interactive network/relationship graph that teaches. (Together's abstract hero shapes and HF's modality grid are decorative, not explanatory.) The graph harvest must come from another group.
- **D. SECTION TRANSITIONS:** Text fetch cannot reveal scroll transitions, sticky compositions, or background shifts. Nothing reliable harvested here; treat as UNKNOWN across all nine sites.
- **B. Topology visualization:** Daytona and Together describe topology in words, but no site showed a genuinely explanatory runtime-topology visual in a form text fetch can capture. PING's topology visual remains an unsolved design problem after this group.
- **M. MOBILE:** Only one concrete mechanism found (TOG-2, separate mobile hero asset). Everything else UNKNOWN.
- **E. True live feel:** No site streamed real live data on the homepage in a way text fetch could confirm. The "live" signals harvested (feeds, counts, carousels) are all static snapshots of live systems — which is itself a useful finding: even the best sites *imply* liveness rather than streaming it.

## Idea count

38 harvested ideas across 9 sites: Anthropic 3, OpenAI 3, Cursor 5, Together AI 6, Replicate 3, LangChain/LangSmith 7, Weights & Biases 3, Hugging Face 3, Daytona 5.
Priorities: P0 ×7, P1 ×18, P2 ×13.
