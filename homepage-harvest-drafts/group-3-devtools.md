# Homepage design-intelligence harvest: Group 3, developer tools

Assignment: read-only research for the PING website homepage redesign. Mechanism harvest only. No branding, artwork, or site identity copied.

Source date: 2026-09-17. Every entry below is supported by fetched live homepage text, fetched feature pages, or a fetched public design-system spec. Anything visually unverifiable (exact animation, exact responsive behavior) is marked UNKNOWN.

## Sites reviewed (10)

| # | Site | Homepage URL | How confirmed |
|---|------|--------------|---------------|
| 1 | Linear | https://linear.app | Fetched live; title "Linear – The system for product development" |
| 2 | Stripe | https://stripe.com/en-th (locale variant) | Fetched live via web search result |
| 3 | Supabase | https://supabase.com/features?products=database | Fetched live via web search result (features page; homepage root not returned by search) |
| 4 | Resend | https://resend.com | Fetched live; title "Resend · Email for developers" |
| 5 | Clerk | https://clerk.com | Fetched live; title "Clerk | Authentication and User Management" |
| 6 | Liveblocks | https://liveblocks.io | Fetched live; title "Liveblocks | Realtime and sync for the agentic web" |
| 7 | Sentry | https://www.sentry.io | Fetched live; title "Application Performance Monitoring & Error Tracking Software | Sentry" |
| 8 | PostHog | https://posthog.com | Fetched live; title "PostHog – We make your product self-driving" |
| 9 | Vercel (discovered) | https://vercel.com | Fetched live; title "Agentic Infrastructure - Vercel" |
| 10 | Neo4j (discovered) | https://neo4j.com | Fetched live; title "Neo4j Graph Intelligence Platform" |
| 11 | Inngest (discovered) | https://www.inngest.com | Fetched live; title "Durable Execution for Workflows & AI | Inngest" |

Supporting evidence also fetched: Linear design-system spec (galyarder-framework design-md-linear.app SKILL.md, GitHub), Clerk docs/blog positioning text, Stripe en-th homepage structure, PostHog 2026 positioning.

## Top 5 mechanisms for PING

1. **Linear's live activity-feed hero**: the hero visual is a working issue card whose Activity feed shows real relative timestamps ("moved from Todo to In Progress · just now"). PING's hero should show the system remembering and acting, not a static diagram.
2. **PostHog's context-warehouse loop line**: "turn 'tell me what happened' into 'here's what to fix next.'" PING's whole promise (observes, remembers, connects, acts) is exactly this observe-to-act arc stated in one plain sentence.
3. **Clerk's literal authority language**: "Leverage Clerk as the source of truth for your user data." PING's candidate moment "One authority, many runtimes" can be said in equally plain authority language instead of hiding behind abstract nouns.
4. **Resend's weight discipline**: roughly twelve homepage sections, but each one is a short headline, one line of copy, and one small visual. PING's 14 equal-weight sections problem is solved by making most sections light, not by deleting content.
5. **Neo4j's knowledge-layer triad**: "context, memory, and map of your data." Three concrete nouns that name what a business graph is for. PING can borrow the triad structure (three concrete nouns) without copying the words.

---

## Ideas organized by PING problem

### A. HERO CLARITY

**IDEA H-1: Category phrase hero**
- SOURCE: Linear
- URL: https://linear.app
- ROUTE/SECTION: Hero headline
- SECTION DESCRIPTION: Hero reads "The product development system for teams and agents." No feature list, no stats, no sub-navigation in the headline. One noun phrase that names the category the product claims to own.
- WHAT IT DOES: Compresses the entire positioning into a single definitional sentence. The visitor files the product into a mental slot in seconds.
- WHY IT WORKS: It answers "what kind of thing is this" before "what does it do." Teams and agents are named as the two runtimes the system serves.
- PING PROBLEM IT COULD SOLVE: hero clarity
- PING ADAPTATION: Write PING's hero as a definitional noun phrase in the same mold, e.g. "The business memory system for people and agents" or "Persistent business intelligence infrastructure." One phrase, no hedging.
- COPY RISK: Low. Definitional phrases are generic marketing structure, not copyrightable expression.
- VISUAL RISK: None. Pure copy mechanism.
- MOBILE BEHAVIOR: UNKNOWN (hero type scaling per the Linear design spec is 72 to 48 to 32px with proportional tracking, but that spec is third-party documentation, not verified from the live page).
- PRIORITY: P1

**IDEA H-2: Three-word compressed hero**
- SOURCE: Resend
- URL: https://resend.com
- ROUTE/SECTION: Hero headline
- SECTION DESCRIPTION: Hero reads "Email for developers" (three words), followed by one supporting sentence: "The best way to reach humans instead of spam folders. Deliver transactional and marketing emails at scale."
- WHAT IT DOES: Makes the hero memorable by making it short. The supporting line carries the differentiation (humans, not spam folders) so the headline does not have to.
- WHY IT WORKS: Three words are unforgettable and impossible to skim past. The bold second sentence ("humans instead of spam folders") states the enemy, which gives the short headline its edge.
- PING PROBLEM IT COULD SOLVE: hero clarity
- PING ADAPTATION: Constrain PING's hero to under six words, then give the one-line differentiation to the subhead. Naming an enemy (forgotten knowledge, lost context, repeated questions) sharpens a short headline.
- COPY RISK: Low. Brevity is a technique, not owned expression.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

**IDEA H-3: Negation kicker above the hero**
- SOURCE: Inngest
- URL: https://www.inngest.com
- ROUTE/SECTION: Above the hero headline
- SECTION DESCRIPTION: Page opens with "No workers. No queues. No refactoring." immediately before the hero "From background jobs to agents, in one codebase."
- WHAT IT DOES: Lists what the visitor will never have to do again, in staccato fragments, before stating the positive promise.
- WHY IT WORKS: Negation is specific where benefits are vague. "No refactoring" names a concrete pain being removed; the hero then names what replaces it.
- PING PROBLEM IT COULD SOLVE: hero clarity
- PING ADAPTATION: Open PING's hero area with what the business no longer loses: no repeated briefings, no lost decisions, no starting from zero. Then the positive claim.
- COPY RISK: Low.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

**IDEA H-4: Outcome hero with honest voice**
- SOURCE: PostHog
- URL: https://posthog.com
- ROUTE/SECTION: Title and "Shameless CTA" section
- SECTION DESCRIPTION: Title tagline is "We make your product self-driving." Lower on the page, a section literally titled "Shameless CTA" jokes about classic marketing tactics (fake eco-friendly badge, "Not endorsed by Kim K", "Act now and get $0 off your first order").
- WHAT IT DOES: Pairs an ambitious outcome claim with self-aware humor that disarms the visitor's marketing defenses.
- WHY IT WORKS: The humor is a trust device. A company that jokes about its own CTA reads as confident and honest, which makes the big outcome claim ("self-driving") more believable.
- PING PROBLEM IT COULD SOLVE: hero clarity, status honesty
- PING ADAPTATION: Keep PING's outcome claim plain and large, then earn trust with one section that speaks plainly (or playfully) about what PING is and is not. Do not overdo the humor; one honest aside beats a comedy page.
- COPY RISK: Medium. The humor style is distinctive to PostHog; borrow the mechanism (self-aware honesty), not the jokes.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

### B. LIVING SYSTEM HERO AND LIVE FEEL

**IDEA LS-1: Hero visual with a live activity feed**
- SOURCE: Linear
- URL: https://linear.app
- ROUTE/SECTION: Hero visual
- SECTION DESCRIPTION: The hero visual is a working issue card ("Faster app launch / Render UI before vehicle_state sync when minimum required state is present, instead of blocking on full refresh during iOS startup") with an Activity feed underneath: "Linear created the issue via Slack on behalf of Karri · 2min ago", "Triage Intelligence added the labels Performance and iOS · 2min ago", "Linear moved from Todo to In Progress · just now." Timestamps are relative ("2min ago", "just now"), and each entry names the actor and the channel ("via Slack").
- WHAT IT DOES: Shows the system acting in the present tense. The product is not illustrated; it is caught mid-work.
- WHY IT WORKS: Relative timestamps and named actors make the visitor believe the screen is alive. Provenance (who did what, through which channel, when) is exactly what makes PING trustworthy, and here it doubles as marketing.
- PING PROBLEM IT COULD SOLVE: living system hero
- PING ADAPTATION: Make PING's hero visual a live-feeling evidence card: an observation being recorded, a connection being made, an action being taken, each stamped with relative time and source. Even if rendered statically, the timestamps and provenance make it read as a living system.
- COPY RISK: Low. Activity-feed structure is generic; invent PING's own sample content.
- VISUAL RISK: Low if rendered as original UI; do not copy Linear's issue-card styling.
- MOBILE BEHAVIOR: UNKNOWN. The Linear design spec (third-party) says hero visuals simplify on mobile with fewer floating UI elements, but this is not verified on the live page.
- PRIORITY: P0

**IDEA LS-2: Agent work shown with duration**
- SOURCE: Linear
- URL: https://linear.app
- ROUTE/SECTION: Homepage agent interaction blocks
- SECTION DESCRIPTION: Conversational agent interactions show prompts ("@Linear create issues and assign to me", "what are the three most important customer requests around permissions? add them to the Access Controls project") followed by results and a duration badge: "Worked for 8 sec", "Worked for 1 min".
- WHAT IT DOES: Quantifies invisible agent labor as concrete effort with a clock on it. The visitor sees what was asked and how long the work took.
- WHY IT WORKS: Duration is evidence of real work. "Worked for 8 sec" turns an abstract AI claim into a believable transaction: input, effort, output.
- PING PROBLEM IT COULD SOLVE: knowledge compounding loop, evidence
- PING ADAPTATION: Show PING's agent actions with their own provenance and duration: a recalled answer cites what it drew on and how long it took to assemble. This is the knowledge-compounding loop made visible.
- COPY RISK: Low.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

**IDEA LS-3: System shows its own prioritization**
- SOURCE: Linear
- URL: https://linear.app
- ROUTE/SECTION: Homepage triage block
- SECTION DESCRIPTION: A block titled by behavior: "Three issues ranked by customer impact: ENG-2298 Add granular project permissions, ENG-2647 Let guests access multiple teams, ENG-2352 Create custom roles with scoped access. I've added them to Access Controls."
- WHAT IT DOES: Demonstrates judgment, not just retrieval. The system ranks by a stated criterion (customer impact) and shows the criterion.
- WHY IT WORKS: Stating the ranking criterion ("ranked by customer impact") makes the AI's reasoning legible. The visitor trusts the output because the input to the decision is named.
- PING PROBLEM IT COULD SOLVE: intelligence vs authority, knowledge compounding loop
- PING ADAPTATION: Show PING ranking or connecting things by a stated rule: "Ranked by recency and corroboration," "Connected because both cite the same source event." The criterion is the trust device.
- COPY RISK: Low.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

**IDEA LS-4: Evidence enumerated as the ingredients list**
- SOURCE: Sentry
- URL: https://www.sentry.io
- ROUTE/SECTION: "Debugging needs context—with or without AI"
- SECTION DESCRIPTION: Sentry's AI debugger Seer is introduced with its ingredients named: "uses Sentry context – logs, commits, traces, stack trace – so you can stop guessing and it can fix issues for you."
- WHAT IT DOES: Lists the concrete evidence types that feed the intelligence, turning "AI" from a black box into a recipe.
- WHY IT WORKS: Naming the inputs (logs, commits, traces, stack trace) makes the claim auditable. The visitor can map each ingredient to something they have.
- PING PROBLEM IT COULD SOLVE: evidence, authority
- PING ADAPTATION: Present PING's intelligence the same way: name the ingredients of every answer (events, documents, conversations, records) so the visitor sees that answers are assembled from evidence, not generated from nothing.
- COPY RISK: Low.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

**IDEA LS-5: Name the conflict, position as the resolution**
- SOURCE: Liveblocks
- URL: https://liveblocks.io
- ROUTE/SECTION: "Realtime infrastructure for collaborative AI"
- SECTION DESCRIPTION: "When people and AI agents work on the same data, concurrency becomes the problem. Liveblocks keeps everything in sync so updates stay consistent."
- WHAT IT DOES: States the structural tension of the product's world (people plus agents editing the same data) in one sentence, then positions the product as the resolution mechanism.
- WHY IT WORKS: It teaches the visitor the problem before selling the solution. "Concurrency becomes the problem" is a diagnosis the visitor can verify from their own experience.
- PING PROBLEM IT COULD SOLVE: hero clarity, intelligence vs authority
- PING ADAPTATION: Diagnose first: "When people and agents both act on your business, memory becomes the problem." Then PING as the resolution. The diagnosis does the persuasive work.
- COPY RISK: Low (do not copy the concurrency framing; write PING's own diagnosis).
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

**IDEA LS-6: The loop itself as the story**
- SOURCE: Inngest
- URL: https://www.inngest.com
- ROUTE/SECTION: "Observe and optimize" step (01 Install the SDK, 02 Deploy alongside your app, 03 Observe and optimize)
- SECTION DESCRIPTION: A numbered three-step flow closes with: "The data that makes code durable is the same used to make it better. Fix fast, and continuously improve."
- WHAT IT DOES: Makes the feedback loop the headline insight: durability data and improvement data are the same data.
- WHY IT WORKS: One sentence fuses two product stories (reliability, improvement) into a single compounding mechanism. The loop is the differentiator.
- PING PROBLEM IT COULD SOLVE: knowledge compounding loop
- PING ADAPTATION: State PING's loop in one sentence: the evidence that makes answers trustworthy is the same evidence that makes the next answer better. Observe, remember, connect, act, preserve: the exhaust of each cycle feeds the next.
- COPY RISK: Low.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

### C. SCROLL STORY AND SECTION WEIGHT

**IDEA S-1: Many sections, each deliberately light**
- SOURCE: Resend
- URL: https://resend.com
- ROUTE/SECTION: Full page (Integrate, First-class developer experience, Test mode, Modular webhooks, Write using a delightful editor, Go beyond editing, Contact management, Broadcast analytics, Develop emails using React, Reach humans not spam folders, Everything in your control, Beyond expectations)
- SECTION DESCRIPTION: The page has roughly twelve sections, but nearly every one is a short headline, one or two lines of copy, and one small visual or video. "Test mode" is a headline plus a single sentence: "Simulate events and experiment with our API without the risk of accidentally sending real emails to real people."
- WHAT IT DOES: Solves the many-sections problem with weight discipline instead of deletion. Each section is a glance, not a chapter.
- WHY IT WORKS: Short sections create scroll rhythm. The visitor gets breadth (the product is complete) without fatigue (nothing demands sustained reading).
- PING PROBLEM IT COULD SOLVE: scroll story, section transitions (directly addresses the 14 equal-weight sections problem)
- PING ADAPTATION: Keep PING's breadth but stratify weight: 3 to 5 unforgettable moments get full visual weight; the rest become Resend-style one-liners with a small visual. Decide per section: is this a moment or a mention.
- COPY RISK: Low.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P0

**IDEA S-2: Engineering-document figure labels on marketing sections**
- SOURCE: Linear
- URL: https://linear.app
- ROUTE/SECTION: Pillar blocks (Purpose-built, Powered by agents, Designed for speed)
- SECTION DESCRIPTION: Each pillar carries a figure label: "Fig 0.1", "Fig 0.2", "Fig 0.3". The marketing page is laid out like a technical document with numbered exhibits.
- WHAT IT DOES: Gives scroll sections the authority of documentation. The labels imply the claims are exhibits in a larger system, not ad copy.
- WHY IT WORKS: Engineers trust numbered figures. The convention signals that the marketing is downstream of a real system with real artifacts.
- PING PROBLEM IT COULD SOLVE: section transitions, evidence
- PING ADAPTATION: Label PING's key sections as exhibits of the system: numbered figures that read like evidence from a working architecture (e.g. a graph excerpt, an evidence chain, a replay record). The numbering makes the scroll feel like a guided tour of proof.
- COPY RISK: Low.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

**IDEA S-3: Three-pillar value structure**
- SOURCE: Linear
- URL: https://linear.app
- ROUTE/SECTION: "A new species of product tool" pillars
- SECTION DESCRIPTION: Three parallel pillars, each a two-word title plus one sentence: "Purpose-built. Linear is shaped by the practices and principles of world-class product teams." / "Powered by agents. Designed for workflows shared by humans and agents. From drafting PRDs to pushing PRs." / "Designed for speed. Reduces noise and restores momentum to help teams ship with high velocity and focus."
- WHAT IT DOES: Compresses the whole value proposition into three parallel beats with identical shape (title, one line), which is easy to scan and remember.
- WHY IT WORKS: Parallelism is memorable. Three beats fit in working memory; identical sentence shapes let the visitor compare without effort.
- PING PROBLEM IT COULD SOLVE: scroll story
- PING ADAPTATION: Give PING a parallel triad in the same mold, e.g. observes / remembers / acts, or one authority / many runtimes / permanent evidence. Keep the sentence shapes identical.
- COPY RISK: Low. Triad structure is generic.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN (third-party spec says feature cards collapse 3 to 2 to 1 column, but unverified on the live page).
- PRIORITY: P1

**IDEA S-4: Customer stories tagged with the capabilities they used**
- SOURCE: Stripe (https://stripe.com/en-th), Vercel (https://vercel.com)
- URL: both
- ROUTE/SECTION: Stripe "Powering businesses of all sizes"; Vercel feature-story blocks
- SECTION DESCRIPTION: Stripe's story cards pair each customer with a "Products used" list ("Payments, Terminal, Connect, Radar and Stripe Sigma"). Vercel does the same: each story ("Notion powers millions of agent conversations daily on Vercel") is followed by feature chips (Durable Orchestration, Sandboxed Environments, AI Model Gateway, Fluid Compute).
- WHAT IT DOES: Turns testimonials into proof of the modular platform. Each story demonstrates a different subset of one system, which is exactly how a "one authority, many runtimes" story gets told with evidence.
- WHY IT WORKS: The capability tags make the stories composable evidence: the platform is one thing, and each customer uses a different slice. The visitor learns the module catalog without reading a features page.
- PING PROBLEM IT COULD SOLVE: multi-runtime, graph
- PING ADAPTATION: Show PING applied in different business contexts, each tagged with the PING capabilities that context used (observe, remember, connect, act, preserve evidence). The tags are the quiet argument that PING is one system, not five tools.
- COPY RISK: Low.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

**IDEA S-5: Heterogeneous entry paths to one infrastructure**
- SOURCE: Stripe
- URL: https://stripe.com/en-th
- ROUTE/SECTION: "Choose an integration path"
- SECTION DESCRIPTION: Three parallel paths: "Don't code? Set up billing... no code required." / "Use a pre-integrated platform." / "Build your own integration. Use our SDKs, APIs, MCP server and AI developer tools."
- WHAT IT DOES: Shows one infrastructure serving three different kinds of users without fragmenting the story. Each audience sees its own door into the same building.
- WHY IT WORKS: It resolves the breadth paradox: the platform is deep for experts and accessible for beginners, and neither audience feels the page was written for the other.
- PING PROBLEM IT COULD SOLVE: multi-runtime, scroll story
- PING ADAPTATION: Give PING explicit entry paths (owner with no technical staff, operator with tools already, builder integrating via API) that all lead into the same intelligence substrate. Same system, different doors.
- COPY RISK: Low.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

### D. STATUS HONESTY

**IDEA SH-1: Maturity labels on every capability**
- SOURCE: Supabase
- URL: https://supabase.com/features?products=database
- ROUTE/SECTION: Features catalog (79 features)
- SECTION DESCRIPTION: Every feature carries a maturity label (GA, Beta, Public Alpha, Public Beta) and a product-family tag (Database, Auth, Realtime, Storage, Platform, Functions, Studio, Vector). Examples: "Auth Hooks ... Beta Auth", "MCP Server ... Public Alpha Database Platform", "Branching ... Beta Database".
- WHAT IT DOES: Makes honesty structural. The visitor sees exactly what is production-ready and what is experimental, per capability, without reading a disclaimer page.
- WHY IT WORKS: Labeling the unfinished parts makes the finished parts more believable. It also sets expectations before signup, which reduces churn and support load.
- PING PROBLEM IT COULD SOLVE: status honesty
- PING ADAPTATION: If PING's homepage lists capabilities (observe, remember, connect, act, preserve), tag each with its real maturity. Anything less proven gets a Beta/Alpha label rather than being hidden or oversold. This is the mechanism behind the parent brief's honesty concerns.
- COPY RISK: Low. Maturity labels are industry convention.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P0

**IDEA SH-2: Public roadmap as a homepage section**
- SOURCE: Linear
- URL: https://linear.app
- ROUTE/SECTION: Roadmap block
- SECTION DESCRIPTION: A month grid (MAR through SEP) with milestone labels placed on it: Alpha, Beta, Public Beta, GA, Internal, plus dated items (Oct 2025, Nov 2025, Dec 2025, Jan 2026, Feb 2026).
- WHAT IT DOES: Puts the product's future on the marketing page as a concrete artifact, not a vague "coming soon."
- WHY IT WORKS: A dated roadmap with named maturity stages is a commitment the visitor can hold the company to. That commitment is a trust signal stronger than any claim of velocity.
- PING PROBLEM IT COULD SOLVE: status honesty
- PING ADAPTATION: A compact public roadmap strip on PING's homepage showing which capabilities are live, in beta, and planned, with real dates or quarters. Keeps public claims aligned with actual architecture state.
- COPY RISK: Low.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

**IDEA SH-3: Changelog as a homepage section**
- SOURCE: Linear
- URL: https://linear.app
- ROUTE/SECTION: "Changelog" (page end)
- SECTION DESCRIPTION: The homepage closes with a Changelog section, making the shipping record part of the marketing.
- WHAT IT DOES: Ends the pitch with proof of ongoing work. The last impression is "this team ships," not "this team claims."
- WHY IT WORKS: A changelog is evidence you cannot fake cheaply. Placing it on the homepage says the company expects to be judged on its record.
- PING PROBLEM IT COULD SOLVE: status honesty
- PING ADAPTATION: Close PING's homepage with a brief, honest shipping log or a "what changed recently" strip. Even a short one signals a living system and invites return visits.
- COPY RISK: Low.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

**IDEA SH-4: Trust infrastructure in the footer**
- SOURCE: Resend
- URL: https://resend.com
- ROUTE/SECTION: Footer
- SECTION DESCRIPTION: Footer columns include Changelog, Status, Security, SOC 2, GDPR alongside product and company links. "Test mode" (simulate events without sending real emails) is also a first-class homepage section: safety as a feature.
- WHAT IT DOES: Makes operational honesty (status page, compliance, changelog) as discoverable as the product features. Test mode reframes caution as a capability.
- WHY IT WORKS: Visitors who care about reliability look for the status page before they look at pricing. Surfacing it in the footer says the company is not hiding its operational record.
- PING PROBLEM IT COULD SOLVE: status honesty
- PING ADAPTATION: Put PING's honesty artifacts (status, changelog, evidence methodology, limitations) one click from every page. Consider a "safe mode" style story: how PING prevents acting on unverified information, framed as a feature like Resend's test mode.
- COPY RISK: Low.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

### E. AUTHORITY

**IDEA A-1: Category expansion framing**
- SOURCE: Clerk
- URL: https://clerk.com
- ROUTE/SECTION: Hero
- SECTION DESCRIPTION: Hero reads "More than authentication, Complete User Management." The subhead: "Need more than sign-in? Clerk gives you full stack auth and user management, so you can launch faster, scale easier, and stay focused on building your business."
- WHAT IT DOES: Reframes the product upward from a feature (authentication) to the whole system it belongs to (user management). The visitor's mental category for the product gets bigger.
- WHY IT WORKS: "More than X" borrows the visitor's existing understanding of X and then expands it. It is more efficient than defining a new category from scratch.
- PING PROBLEM IT COULD SOLVE: hero clarity, authority
- PING ADAPTATION: If visitors file PING as "a notes tool" or "a chatbot," use the same move: "More than memory, complete business intelligence." Borrow the small category, then expand it to the system PING actually is.
- COPY RISK: Medium. The "More than X, Complete Y" shape is recognizable from Clerk; use PING's own words and do not mirror the phrasing.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

**IDEA A-2: Literal "source of truth" authority language**
- SOURCE: Clerk
- URL: https://clerk.com
- ROUTE/SECTION: "Integrations"
- SECTION DESCRIPTION: "Leverage Clerk as the source of truth for your user data and integrate with the tools that you already depend on."
- WHAT IT DOES: States the authority claim in the plainest possible words. Not "unified identity layer" or "canonical user graph," but "the source of truth for your user data."
- WHY IT WORKS: Plain authority language is credible because it is checkable. The sentence also positions integrations as downstream of the authority, which is exactly the "one authority, many runtimes" architecture.
- PING PROBLEM IT COULD SOLVE: authority
- PING ADAPTATION: Say PING's authority claim this plainly: "the source of truth for what your business knows." Then show other tools and agents consuming it. Do not let the authority claim hide behind abstract nouns.
- COPY RISK: Medium. "Source of truth" is generic industry language, but pair it with PING's own object ("what your business knows") rather than copying the sentence.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P0

**IDEA A-3: Authority shown as boundary-management primitives**
- SOURCE: Clerk
- URL: https://clerk.com
- ROUTE/SECTION: "Multi-tenancy"
- SECTION DESCRIPTION: "Everything your B2B SaaS needs" is unpacked as four concrete primitives: custom roles and permissions, auto-join by email domain, invitations, organization UI components. Each is one line.
- WHAT IT DOES: Makes an abstract authority claim (manages your users and organizations) concrete by listing the boundary operations it performs.
- WHY IT WORKS: Primitives are legible. "Custom roles and permissions" tells an engineer exactly what the system controls; no metaphor required.
- PING PROBLEM IT COULD SOLVE: authority
- PING ADAPTATION: Unpack PING's authority into its boundary primitives: what it observes, what it is allowed to remember, who can ask, what it can act on, what evidence it preserves. A short list of named primitives beats a paragraph about "intelligence."
- COPY RISK: Low.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

**IDEA A-4: The knowledge layer as the map between business and AI**
- SOURCE: Neo4j
- URL: https://neo4j.com
- ROUTE/SECTION: Hero ("Build the knowledge layer for AI you can trust")
- SECTION DESCRIPTION: "A knowledge layer provides the context, memory, and map of your data that your AI needs to make trustworthy decisions. It connects your essential enterprise knowledge to your AI and agentic systems, so that AI can understand the relationships, history, and decisions behind your business."
- WHAT IT DOES: Defines the product as the layer between raw business knowledge and AI systems. The triad "context, memory, and map" names three distinct jobs the layer does.
- WHY IT WORKS: "Layer" is an architecture word engineers trust, and the triad makes the abstract concrete. "Map" in particular gives the graph a job the visitor can picture. "Relationships, history, and decisions" names what gets connected.
- PING PROBLEM IT COULD SOLVE: authority, graph, hero clarity
- PING ADAPTATION: This is the closest existing articulation of PING's "business graph" and "one authority" moments. Adapt the structure (layer metaphor plus a concrete triad), not the words: PING connects the business's events, knowledge, and decisions to the people and agents that need them.
- COPY RISK: Medium. The layer-plus-triad structure is the mechanism; write PING's own triad and sentences.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P0

**IDEA A-5: Frictionless adoption claim**
- SOURCE: Sentry
- URL: https://www.sentry.io
- ROUTE/SECTION: "Get started in minutes"
- SECTION DESCRIPTION: "Five lines of code. That's it. No complex setup, no performance hits, no waiting around."
- WHAT IT DOES: Collapses the entire adoption story into a number and three negations. The visitor's remaining objection (integration effort) is answered before it forms.
- WHY IT WORKS: Specific numbers beat adjectives. "Five lines" is checkable in a way "easy setup" is not.
- PING PROBLEM IT COULD SOLVE: hero clarity
- PING ADAPTATION: If PING has a genuinely small integration surface, state it as a number. If not, do not invent one; the mechanism only works when it is true.
- COPY RISK: Low.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

### F. GRAPH

**IDEA G-1: Show the interaction model, not just the claim**
- SOURCE: Neo4j
- URL: https://neo4j.com
- ROUTE/SECTION: "Get started your way" workflow strip
- SECTION DESCRIPTION: A four-step strip demonstrates the product's interaction model in plain verbs: "Import and model. Easily import data from CSV, JSON, APIs, or integrations like Kafka and Spark. Use our intuitive tools to model your data as a graph, capturing entities and relationships without rigid schemas." / "Query. Use simple, intuitive queries with Cypher to find patterns in your data quickly." / "Explore. Visualize your data as graphs with our interactive tools. Spot patterns, refine queries, and explore relationships, no extra code required."
- WHAT IT DOES: Teaches the visitor how they would actually work with the graph, in the order they would do it. The homepage is a miniature tutorial.
- WHY IT WORKS: Interaction models are more persuasive than feature lists because the visitor can mentally rehearse using the product. Verbs (import, model, query, explore) beat nouns.
- PING PROBLEM IT COULD SOLVE: graph, scroll story
- PING ADAPTATION: Show PING's interaction model as a verb sequence on the homepage: observe, remember, connect, act, preserve. Let the visitor rehearse the loop before they ever sign up.
- COPY RISK: Low.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

**IDEA G-2: Let customers state the thesis**
- SOURCE: Neo4j
- URL: https://neo4j.com
- ROUTE/SECTION: Customer quotes
- SECTION DESCRIPTION: The sharpest positioning line on the page is a customer quote: "Agentic AI without a knowledge graph is like a self-driving car with no GPS map. Kind of brilliant, but dangerously unaware." (Natalie Romanov, Merck Group). Other quotes explain the graph's job in plain terms ("a natural way to express interconnected data").
- WHAT IT DOES: Outsouces the boldest claim to a credible third party. The company page stays measured while the customer says the memorable thing.
- WHY IT WORKS: A thesis stated by a customer reads as observed truth, not marketing. The analogy (self-driving car with no GPS map) is vivid precisely because the company did not write it.
- PING PROBLEM IT COULD SOLVE: graph, hero clarity
- PING ADAPTATION: When PING has real users, solicit thesis-grade quotes that state the business-graph argument in their own words. Until then, do not fabricate this; the mechanism requires real voices.
- COPY RISK: Low (quotes must be real).
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

**IDEA G-3: The graph visual as "map"**
- SOURCE: Neo4j
- URL: https://neo4j.com
- ROUTE/SECTION: Hero imagery ("Build the knowledge layer for AI", "Manage Context Diagram")
- SECTION DESCRIPTION: Hero imagery is described as knowledge-layer and context diagrams. The copy repeatedly frames the graph as a "map of your data" that AI uses the way a driver uses GPS.
- WHAT IT DOES: Gives the abstract graph one concrete visual metaphor (a map) that is reused across the page.
- WHY IT WORKS: One metaphor, consistently applied, is easier to hold than a technically precise but shifting description. "Map" implies navigation, completeness, and trust in a single word.
- PING PROBLEM IT COULD SOLVE: graph
- PING ADAPTATION: Give PING's business graph one stable metaphor and reuse it everywhere. Candidates: map, ledger, record. Pick one and do not mix metaphors across sections.
- COPY RISK: Low.
- VISUAL RISK: Medium if the visual borrows Neo4j's node-link aesthetic; use an original visual language for the metaphor.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

### G. KNOWLEDGE LOOP

**IDEA K-1: The observe-to-act arc in one sentence**
- SOURCE: PostHog
- URL: https://posthog.com
- ROUTE/SECTION: "All your data, working together"
- SECTION DESCRIPTION: "Combine everything in PostHog's context warehouse so that you, your agents, and your dashboard can query it directly." Then the payoff line: "Ready to turn 'tell me what happened' into 'here's what to fix next.'"
- WHAT IT DOES: States the full loop (capture everything, make it queryable, turn questions into actions) and then compresses the value into a before/after sentence.
- WHY IT WORKS: The quoted before/after ("tell me what happened" vs "here's what to fix next") is the entire product story in twelve words. Naming "your agents" as first-class consumers alongside humans mirrors PING's people-plus-agents world.
- PING PROBLEM IT COULD SOLVE: knowledge compounding loop, hero clarity
- PING ADAPTATION: Write PING's equivalent before/after: from "what did we know and when" to "what should we do next, and here is the evidence." Name both humans and agents as consumers of the same memory.
- COPY RISK: Low. Before/after sentence structure is generic; write PING's own version.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P0

**IDEA K-2: Data precedes intelligence**
- SOURCE: PostHog
- URL: https://posthog.com
- ROUTE/SECTION: "All your data, working together"
- SECTION DESCRIPTION: "The data your agents need to make good decisions is already here." The context warehouse "ships with" a data warehouse, 120+ sources/destinations, SQL editor, BI, data viz, user activity feed, API, webhooks. The page leads with the data substrate, not the AI features.
- WHAT IT DOES: Establishes that intelligence is downstream of captured context. The product's first job is to have the data; the smart features follow.
- WHY IT WORKS: It is honest about the dependency: no context, no good decisions. Leading with the substrate also differentiates from AI products that promise smarts with no memory.
- PING PROBLEM IT COULD SOLVE: knowledge compounding loop, intelligence vs authority
- PING ADAPTATION: Lead PING's story with the captured record (the observations, the evidence), then show intelligence as what that record makes possible. The authority (what PING knows) comes before the intelligence (what PING concludes).
- COPY RISK: Low.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

**IDEA K-3: One integrated context plane**
- SOURCE: PostHog
- URL: https://posthog.com
- ROUTE/SECTION: "All your data, working together"
- SECTION DESCRIPTION: "Whether you're analyzing customer usage or directing AI, you should be operating with the full context." The page lists everything that ships built-in rather than as separate products: "Built-in, the context warehouse ships with" a data warehouse, sources, SQL editor, activity feed, APIs.
- WHAT IT DOES: Argues that context should be one plane, not scattered across tools. "Built-in" is doing the work: the integrations are not add-ons, they are the product.
- WHY IT WORKS: It reframes completeness as architecture. The visitor stops comparing feature checklists and starts comparing whether their context is whole or fragmented.
- PING PROBLEM IT COULD SOLVE: authority, multi-runtime
- PING ADAPTATION: Frame PING's memory as one plane that every runtime (people, agents, tools) draws from, rather than as another tool in the stack. The argument is wholeness versus fragmentation.
- COPY RISK: Low.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

### H. EVIDENCE, REPLAY, LINEAGE

**IDEA E-1: Provenance in the UI (who, via what, when)**
- SOURCE: Linear
- URL: https://linear.app
- ROUTE/SECTION: Hero activity feed
- SECTION DESCRIPTION: Every activity entry carries full provenance: "Linear created the issue via Slack on behalf of Karri · 2min ago." Actor (Linear, Triage Intelligence), channel (via Slack), beneficiary (on behalf of Karri), timestamp (2min ago).
- WHAT IT DOES: Shows that the system records not just what happened but how it entered the system. The marketing visual is simultaneously a demo of the product's evidence model.
- WHY IT WORKS: Provenance is what separates a claimed action from a proven one. Showing it in the hero teaches the visitor, without a lecture, that this system keeps receipts.
- PING PROBLEM IT COULD SOLVE: evidence, replay, lineage
- PING ADAPTATION: Every PING visual that shows an action should carry its provenance: what was observed, from which source, when, and what it caused. Make "show the receipt" a visual convention across the homepage.
- COPY RISK: Low.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

**IDEA E-2: Operational detail as authenticity texture**
- SOURCE: Linear
- URL: https://linear.app
- ROUTE/SECTION: Homepage issue blocks and releases
- SECTION DESCRIPTION: Real-looking operational identifiers throughout: issue IDs (ENG-2298, ENG-2844, ENG-2920, 61039, 62048), statuses ("Working…"), labels (Bug, Design, AI, Performance, API, Maps, UI), cycle markers ("Cycle 144"), release versions ("Linear App 1.6881... Jun 25"), specific dates (Oct 6, Oct 2, Oct 7, Oct 10, Oct 9, Oct 4).
- WHAT IT DOES: Fills the page with the texture of a real operating system. The specificity is what makes the page feel like a product rather than a pitch.
- WHY IT WORKS: Concrete identifiers resist the generic-marketing read. A visitor who sees "ENG-2298" assumes there is a real ENG-2297 behind it.
- PING PROBLEM IT COULD SOLVE: live feel, evidence
- PING ADAPTATION: Use PING's own real identifiers in homepage visuals: event IDs, observation counts, replay hashes, dates. Never fabricate identifiers that imply real records; use real ones or clearly illustrative samples.
- COPY RISK: Low, with the honesty caveat above.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

**IDEA E-3: Scale proof as a readable artifact**
- SOURCE: Stripe
- URL: https://stripe.com/en-th
- ROUTE/SECTION: "Businesses on Stripe generated US$1.9tn in 2025" plus annual letter link
- SECTION DESCRIPTION: A scale statistic ("US$1.9tn in payments volume processed in 2025", "99.999% historical uptime", "135+ currencies") is paired with a link to the annual letter: "Our annual letter explores the trends defining the internet economy."
- WHAT IT DOES: Backs the big number with a long-form artifact the visitor can actually read. The letter is evidence; the statistic is the headline.
- WHY IT WORKS: Numbers without sources are claims. The annual letter gives the number a provenance and gives serious visitors somewhere to go.
- PING PROBLEM IT COULD SOLVE: evidence, status honesty
- PING ADAPTATION: When PING has real scale numbers (observations recorded, replays verified, decisions informed), pair each with the artifact behind it. Until then, prefer small true numbers over big vague ones.
- COPY RISK: Low.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

**IDEA E-4: Incident-to-evidence drilldown as the product story**
- SOURCE: Sentry (homepage) plus Sentry docs positioning (error events, stack traces, breadcrumbs, release and commit info, user context, profiles)
- URL: https://www.sentry.io
- ROUTE/SECTION: "Everything's connected" / "Debugging needs context"
- SECTION DESCRIPTION: The homepage story is a drilldown: from an incident, into connected context (logs, commits, traces, stack trace), to a fix. The docs and product pages enumerate the evidence chain per issue: error event, stack trace, breadcrumbs, release and commit, user context, profile.
- WHAT IT DOES: Makes the evidence chain the narrative arc of the page. Each layer of context is one more reason to believe the fix.
- WHY IT WORKS: Drilldown is a story shape engineers already live inside. The page mirrors the user's own debugging motion, so the product feels inevitable.
- PING PROBLEM IT COULD SOLVE: evidence, replay, lineage
- PING ADAPTATION: Structure one PING homepage section as an evidence drilldown: a business question, the connected observations behind it, the lineage of each, the action taken, the preserved record. Let the visitor drill from answer to evidence in the visual.
- COPY RISK: Low.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

### I. MULTI-RUNTIME

**IDEA M-1: Humans and agents named as the runtime pair**
- SOURCE: Liveblocks
- URL: https://liveblocks.io
- ROUTE/SECTION: "Realtime infrastructure for collaborative AI" and CTA
- SECTION DESCRIPTION: "When people and AI agents work on the same data, concurrency becomes the problem." CTA: "Turn your product into the space where people and AI collaborate."
- WHAT IT DOES: Names both runtimes (people, AI agents) in the same sentence as first-class participants in one shared space.
- WHY IT WORKS: It normalizes the mixed human/agent world instead of treating agents as a feature. The shared substrate (the space where they collaborate) is the product.
- PING PROBLEM IT COULD SOLVE: multi-runtime
- PING ADAPTATION: Name PING's runtimes explicitly and equally: people, agents, and tools drawing on one memory. "One authority, many runtimes" should be said in those plain words somewhere on the page.
- COPY RISK: Low.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

**IDEA M-2: One plane across heterogeneous runtimes**
- SOURCE: Sentry
- URL: https://www.sentry.io
- ROUTE/SECTION: Customer quote (Instacart)
- SECTION DESCRIPTION: "The signal we get from Sentry is the most reliable indicator of software issues and is used throughout Instacart because it can be easily configured for each service regardless of the language or framework." (Igor Dobrovitski, Infrastructure Software Engineer, Instacart)
- WHAT IT DOES: A customer states the multi-runtime argument: one signal plane, any language, any framework, every service.
- WHY IT WORKS: "Regardless of the language or framework" dissolves the visitor's "but our stack is different" objection in one clause, and it comes from a peer, not the vendor.
- PING PROBLEM IT COULD SOLVE: multi-runtime
- PING ADAPTATION: State PING's runtime-agnosticism the same way: one memory, whatever the business runs on (people, software, agents, tools). When real customers exist, let them say it.
- COPY RISK: Low.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

**IDEA M-3: The substrate deploys inside your runtimes**
- SOURCE: Inngest
- URL: https://www.inngest.com
- ROUTE/SECTION: "Deploy alongside your app"
- SECTION DESCRIPTION: "Deploy within your existing app, on your favorite cloud provider, serverless, traditional, or anywhere." Combined with "Durability that runs on top of existing code, not alongside it in separate infrastructure."
- WHAT IT DOES: Positions the system as living inside the visitor's existing runtimes rather than as another separate platform to adopt.
- WHY IT WORKS: "Not alongside it in separate infrastructure" removes the adoption-fear objection. The system goes where the work already is.
- PING PROBLEM IT COULD SOLVE: multi-runtime
- PING ADAPTATION: Frame PING as observing inside the business's existing runtimes (the tools, conversations, and records already in use) rather than as a new destination. Memory goes where the work is.
- COPY RISK: Low.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

### J. TYPOGRAPHY

**IDEA T-1: Three-tier weight system as visual hierarchy**
- SOURCE: Linear design-system spec (galyarder-framework design-md-linear.app SKILL.md, fetched from GitHub)
- URL: https://github.com/galyarder-labs/galyarder-framework/blob/HEAD/skills/design-md-linear.app/SKILL.md
- ROUTE/SECTION: Typography Rules and Do's and Don'ts
- SECTION DESCRIPTION: Three weights with assigned jobs: 400 (reading), 510 (emphasis and UI; the signature between-weight), 590 (strong emphasis; the maximum, no 700 bold anywhere). Display sizes get aggressive negative letter-spacing (-1.584px at 72px, -1.056px at 48px, -0.704px at 32px). OpenType features cv01 and ss03 enabled globally give the typeface a geometric character. Body text sits at 15 to 16px with relaxed line height.
- WHAT IT DOES: Encodes importance in weight, not in competing colors or sizes. The visitor feels the hierarchy before reading a word.
- WHY IT WORKS: Restraint is legible. When 510 is the loudest voice most of the time, 590 actually means something, and headlines do not have to shout to lead.
- PING PROBLEM IT COULD SOLVE: typography (directly relevant to the 14 equal-weight sections: weight discipline is how sections stop competing)
- PING ADAPTATION: Assign PING's type weights fixed jobs: one weight for unforgettable moments, one for supporting sections, one for reading text, and never promote a supporting section to moment weight. The type system enforces the editorial hierarchy.
- COPY RISK: None.
- VISUAL RISK: Low. Use PING's own typeface; borrow the discipline (fixed weight roles, negative display tracking), not Linear's exact values or Inter itself unless it fits.
- MOBILE BEHAVIOR: Per the spec (third-party, unverified on the live page): display 72 to 48 to 32px down the breakpoints with tracking adjusted proportionally; below 24px spacing relaxes toward normal.
- PRIORITY: P1

**IDEA T-2: Luminance ramp instead of color for information density**
- SOURCE: Linear design-system spec (same as T-1)
- URL: https://github.com/galyarder-labs/galyarder-framework/blob/HEAD/skills/design-md-linear.app/SKILL.md
- ROUTE/SECTION: Color Palette, Do's and Don'ts
- SECTION DESCRIPTION: Four text tiers on near-black: #f7f8f8 (primary), #d0d6e0 (secondary), #8a8f98 (muted), #62666d (most subdued). Brand indigo (#5e6ad2 / #7170ff) is reserved for primary CTAs and interactive accents only; success green only for status indicators. Borders are whisper-thin semi-transparent white. Explicit rule: do not use the brand color decoratively.
- WHAT IT DOES: Manages dense information with luminance steps instead of color variety. Color is rationed so that when it appears, it means "act" or "status."
- WHY IT WORKS: On a dark, dense page, color noise destroys hierarchy. Rationing color to action and status makes the interactive elements findable and the content calm.
- PING PROBLEM IT COULD SOLVE: typography, scroll story
- PING ADAPTATION: Give PING's homepage a strict luminance ramp for text tiers and reserve PING's accent color for CTAs and live-status indicators only. Supporting sections drop to muted tiers; unforgettable moments get full luminance. This is the visual implementation of the weight discipline in S-1.
- COPY RISK: None.
- VISUAL RISK: Low if PING keeps its own palette; the mechanism is rationing, not the specific colors.
- MOBILE BEHAVIOR: UNKNOWN on the live page; the spec notes dark backgrounds let screenshots blend at any viewport.
- PRIORITY: P2

### K. DELIBERATE MOBILE TRANSFORMATIONS

**IDEA MOB-1: Simplify, do not just shrink**
- SOURCE: Linear design-system spec (same as T-1)
- URL: https://github.com/galyarder-labs/galyarder-framework/blob/HEAD/skills/design-md-linear.app/SKILL.md
- ROUTE/SECTION: Responsive Behavior
- SECTION DESCRIPTION: Documented collapsing strategy: navigation collapses to hamburger at 768px; feature cards go 3-column to 2-column to single column; hero display type steps 72 to 48 to 32px; section spacing drops from 80px+ to 48px on mobile; product screenshots keep aspect ratio and border treatment; and notably, "hero visuals simplify on mobile (fewer floating UI elements)."
- WHAT IT DOES: Treats mobile as a deliberate simplification pass, not a mechanical shrink. The busiest visual (the hero) gets quieter, not just smaller.
- WHY IT WORKS: A dense living-system hero that works on desktop becomes noise on a phone. Removing floating elements preserves the idea (the system is alive) while respecting the viewport.
- PING PROBLEM IT COULD SOLVE: deliberate mobile transformations
- PING ADAPTATION: Design PING's mobile hero as a simplified version of the desktop living-system visual: one evidence card instead of a feed, one timestamp instead of five. Decide per section what gets removed on mobile, not just resized.
- COPY RISK: None.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: Documented in the third-party spec; exact live behavior UNKNOWN.
- PRIORITY: P2

---

## Harvest notes and gaps

- Supabase homepage root was not returned as a verbatim search result, so the Supabase harvest comes from the live features page (maturity labels, product-family tags). The "one authoritative center, many capabilities" reading is supported by that page's structure.
- Clerk's homepage fetched cleanly at https://clerk.com. The authority framing ("source of truth for your user data") is verbatim from the live page.
- Animation details on all sites: UNKNOWN (no screenshots or live interaction available in this research pass).
- Exact responsive behavior on all live pages: UNKNOWN except where the third-party Linear design spec documents it (flagged as such per entry).
- PostHog's current positioning ("We make your product self-driving") and context-warehouse framing are from the live homepage fetched 2026-09-17.
- No site branding, artwork, proprietary visuals, or site identity were copied. All adaptations are mechanisms expressed in PING's own words.

## Idea count

40 harvested ideas: H-1..H-4 (4), LS-1..LS-6 (6), S-1..S-5 (5), SH-1..SH-4 (4), A-1..A-5 (5), G-1..G-3 (3), K-1..K-3 (3), E-1..E-4 (4), M-1..M-3 (3), T-1..T-2 (2), MOB-1 (1). Priorities: P0 x6 (LS-1, S-1, SH-1, A-2, A-4, K-1), P1 x17, P2 x17.
