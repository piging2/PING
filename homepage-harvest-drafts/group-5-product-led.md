# Homepage Harvest — Group 5: Product-Led Sites

Harvester: subagent (group 5). Date: 2026-09-16.
Sites reviewed: Notion, Framer, Raycast, Dia (The Browser Company), Ramp, Mercury, Retool, Figma, Webflow.

## Method and limits

- For each site: `browser_search` to confirm the live homepage URL, then `browser_open` to fetch rendered page text.
- No screenshots were possible; no live-browser inspection. SECTION DESCRIPTION is written from page text order, headings, and image alt-text.
- What I could NOT determine from page text (marked UNKNOWN, never invented): exact animation feel, scroll-triggered motion, precise mobile breakpoints/behavior, exact visual dominance (inferred only from content order).
- Mechanisms only. No branding, artwork, or proprietary visuals copied.

---

## A. HERO — communicating a complex product in ~5 seconds

### A1 — Raycast: emotional reframe hero
- SOURCE: Raycast
- URL: https://www.raycast.com
- ROUTE/SECTION: `/` hero (top of page)
- SECTION DESCRIPTION: Page title "Raycast - Your shortcut to everything", one-line sub ("A collection of powerful productivity tools all within an extendable launcher. Fast, ergonomic and reliable."), then the dominant hero statement in two lines: "It's not about saving time." / "It's about feeling like you're never wasting it." Surrounding text renders keyboard key glyphs (esc, F1–F12, option, command) as a visual motif.
- WHAT IT DOES: Reframes a utilitarian tool (launcher) as an emotional outcome (never feeling wasteful) instead of listing features.
- WHY IT WORKS: The reader grasps the *felt value* in five seconds; the feature list arrives later. Short lines, high contrast between the negative ("not about saving time") and the positive.
- PING PROBLEM IT COULD SOLVE: A — PING's hero currently explains infrastructure; it should land the felt outcome first.
- PING ADAPTATION: Lead with the felt outcome of persistent memory ("Never lose what the business already learned." style), keep infrastructure language for later sections. Do not copy Raycast's wording.
- COPY RISK: Medium — emotional claims must stay honest; PING cannot promise feelings it cannot evidence.
- VISUAL RISK: Low — typographic, no brand borrowing.
- MOBILE BEHAVIOR: UNKNOWN (text order suggests the two-line statement stacks; key-glyph motif likely drops or simplifies on small screens).
- PRIORITY: P1

### A2 — Ramp: live-ticker eyebrow above the hero
- SOURCE: Ramp
- URL: https://ramp.com/
- ROUTE/SECTION: `/` above-the-fold, before the hero headline
- SECTION DESCRIPTION: The first visible line is a small label "AGENTS AT WORK TODAY:", followed by the social-proof headline ("Join 70,000 of the world's most ambitious companies..."), then the hero ("One platform for all of finance. Agents for every workflow, working 24/7.").
- WHAT IT DOES: A status-ticker eyebrow makes the product feel operational *right now*, before any claim is read.
- WHY IT WORKS: "Live" framing converts a marketing page into a system-status surface; it borrows credibility from operations rather than adjectives.
- PING PROBLEM IT COULD SOLVE: A, E — a living-system hero for PING.
- PING ADAPTATION: A small honest ticker above the PING hero, e.g. a real count of events observed / evidence preserved in the last 24h, pulled from the actual system. Must be REAL data or nothing at all.
- COPY RISK: High if faked — a fake ticker destroys trust permanently. Only ship with live data.
- VISUAL RISK: Low — a label, not a brand element.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1 (P0 if wired to real event data; do not ship otherwise)

### A3 — Dia: plainspoken two-line hero
- SOURCE: Dia (The Browser Company)
- URL: https://www.diabrowser.com
- ROUTE/SECTION: `/` hero
- SECTION DESCRIPTION: Title "Dia | A browser you won't dread opening". Hero is two short lines: "A browser you won't dread opening." then "Built for how you actually work". No feature list above the fold in the fetched text.
- WHAT IT DOES: Names the *annoyance being removed* (dreading opening the browser) rather than the technology (AI).
- WHY IT WORKS: Plain language, zero jargon, memorable because it validates a feeling the reader already has.
- PING PROBLEM IT COULD SOLVE: A — PING's current copy leans technical; the pain being removed (knowledge disappearing when people leave / busywork swallowing the day) could be named plainly.
- PING ADAPTATION: Name the business pain in plain words first ("Your business forgets everything." style), then introduce the system. Keep PING's voice, not Dia's.
- COPY RISK: Medium — must name a pain PING truly addresses.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

### A4 — Notion: ultra-short confident hero + verb-led rhythm
- SOURCE: Notion
- URL: https://notion.com/
- ROUTE/SECTION: `/` hero and first three capability blocks
- SECTION DESCRIPTION: Title "The AI workspace that works for you." Trust line directly under it: "Trusted by 98% of the Forbes Cloud 100". Hero headline is four words: "AI where your team works." Then three capability blocks, each a verb phrase plus an outcome headline: "Capture knowledge" → "Bring everything into one system of record." / "Find answers" → "Get answers, instantly—with citations." / "Automate busywork" → "Keep work moving 24/7 with agents."
- WHAT IT DOES: Compresses positioning into verb → outcome pairs. The verb tells you what you do; the headline tells you what changes.
- WHY IT WORKS: Scannable at speed; each pair is a complete thought; the pattern repeats so the reader learns the rhythm and reads faster as they scroll.
- PING PROBLEM IT COULD SOLVE: A, C — PING's 14 sections could compress into a verb-led rhythm.
- PING ADAPTATION: PING-native verb pairs: "Observe" → outcome, "Remember" → outcome, "Connect" → outcome, "Act" → outcome, "Prove" → outcome. The rhythm is the mechanism; the verbs are PING's own architecture language.
- COPY RISK: Low — verbs are generic; PING's outcomes must be honest.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN; the pair structure (short label + headline) is inherently stack-friendly.
- PRIORITY: P1

### A5 — Framer: positioning-as-authority statement
- SOURCE: Framer
- URL: https://framer.com/
- ROUTE/SECTION: `/` early section, directly under the hero ("Framer is the design agent for every step from idea to launch")
- SECTION DESCRIPTION: A standalone section headlined "Agents that work alongside you, not instead of you", followed by three agent capability blocks each paired with a live product visual: "Design with an agent — A professional design agent, native to the canvas. It works directly on your site to generate and refine in place, with every change visible, editable, and under your control." / "Run your CMS with an agent" / "Code with an agent".
- WHAT IT DOES: States the human/AI authority relationship as the product's core promise, before any feature detail.
- WHY IT WORKS: It answers the buyer's real fear (will the AI replace/bypass me?) in the headline, then proves control with the mechanism sentence ("every change visible, editable, and under your control").
- PING PROBLEM IT COULD SOLVE: A, H — PING's intelligence-vs-authority distinction deserves this level of headline prominence.
- PING ADAPTATION: A PING headline in the same structural slot: intelligence ≠ authority, stated as a promise ("AI can reason. It acts only where you've granted authority." style), followed by the concrete mechanism (CapabilityAuthority, approvals, audit). Do not copy Framer's wording.
- COPY RISK: Medium — the claim must match the real authority implementation.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

---

## B. SYSTEM VISUALIZATION

### B1 — Retool: real built artifacts as the marketing visual
- SOURCE: Retool
- URL: https://www.retool.com
- ROUTE/SECTION: `/` "Apps that mean business" gallery
- SECTION DESCRIPTION: A scrolling gallery of real customer-built app screenshots, each named by job: "Corporate treasury dashboard", "FinOps application", "Security operations console", "Demand forecasting app", "Real-time earthquake monitor", "Sales pipeline board", "Deployment monitoring app", "Employee benefits app", "Revenue forecasting dashboard", "Expense management dashboard", "Employee directory", "Logistics dispatch monitor", "Product analytics dashboard".
- WHAT IT DOES: Shows finished, serious, domain-specific artifacts instead of abstract illustrations or mockups.
- WHY IT WORKS: A real treasury dashboard teaches more about the platform's power than any diagram; naming each by job lets every reader find their own use case.
- PING PROBLEM IT COULD SOLVE: B, I — PING should show real projections/evidence views, not abstract diagrams, when it has them.
- PING ADAPTATION: When PING has real projections (business graph views, evidence timelines, replay traces), show them named by business job ("Monday morning: what changed on the Johnson job"). Until then, use honest labeled diagrams, never fake screenshots.
- COPY RISK: High if artifacts are fabricated — never render fake PING output.
- VISUAL RISK: Medium — must be PING's own UI, not Retool-like styling.
- MOBILE BEHAVIOR: UNKNOWN; gallery likely becomes horizontal swipe.
- PRIORITY: P1 (only when real artifacts exist)

### B2 — Framer: real system UI as the visual (CMS table, analytics)
- SOURCE: Framer
- URL: https://framer.com/
- ROUTE/SECTION: `/` mid-page "Not just vibes, a full platform" region
- SECTION DESCRIPTION: Instead of illustrations, the section embeds actual product UI: a CMS table view (columns Title, Status, Image, Category, Product, Draft; rows of real-looking content entries marked "Live"), a performance dashboard ("Core Web Vitals, GOOD, LCP, 1.1s, INP, 95ms, CLS, 0.01"), a live-analytics panel ("Live Visitors 400, Unique Visitors 1.7M, Total Pageviews 2.2M, Bounce Rate 40.9%"), an A/B testing table (Variant, Views, Events, Conversion, Lift, Best — "Home Page 2026, WINNER, 17.1%, 14.1%, 91%"), and a branches/versioning UI (Branches: Main / use-cases / publishing / content with timestamps).
- WHAT IT DOES: Makes "full platform" concrete by showing the unglamorous operational surfaces (tables, metrics, version lists) buyers actually live in.
- WHY IT WORKS: Operational UI signals seriousness; numbers signal honesty; nothing looks like a mockup.
- PING PROBLEM IT COULD SOLVE: B, E, I — PING's evidence/replay/projection surfaces are exactly this kind of operational UI.
- PING ADAPTATION: Show PING's real operational surfaces (event stream, evidence record, projection view, branch/lineage list) as the visuals for the evidence and replay sections. Real data only.
- COPY RISK: High if mocked — label clearly as illustrative if not live.
- VISUAL RISK: Low — it is PING's own UI.
- MOBILE BEHAVIOR: UNKNOWN; dense tables likely collapse to cards or horizontal scroll.
- PRIORITY: P1

---

## C. SCROLL STORY — sequencing and compression

### C1 — Notion: verb-led capability pairs (rhythm)
- SOURCE: Notion
- URL: https://notion.com/
- ROUTE/SECTION: `/` first three post-hero blocks
- SECTION DESCRIPTION: See A4. Three consecutive blocks, identical structure: short verb label ("Capture knowledge", "Find answers", "Automate busywork") above a larger outcome headline, each followed by a product visual (not captured in text).
- WHAT IT DOES: Creates a learnable reading rhythm; the page teaches you how to read it in the first block.
- WHY IT WORKS: Repetition of structure (not of content) reduces cognitive load; the reader scans faster with each block.
- PING PROBLEM IT COULD SOLVE: C — the 14-section problem is partly a rhythm problem: every section currently demands fresh parsing.
- PING ADAPTATION: Give PING's capability sections one repeated structure (verb label → outcome headline → one visual → one proof line). Vary the background or scale for signature moments only.
- COPY RISK: Low.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN; the structure stacks naturally.
- PRIORITY: P1

### C2 — Mercury: four-pillar compression
- SOURCE: Mercury
- URL: https://mercury.com
- ROUTE/SECTION: `/` mid-page, under "Run your business like a seasoned pro"
- SECTION DESCRIPTION: Four pillars, each a two-word label plus one sentence: "Total visibility — Get a clear view of all available funds and money in and out, in one snapshot." / "Automations — Reduce busywork with automated transfers, approval flows, and AI-powered transaction categorization." / "Team management — Curb team spend with card limits, spend controls, and granular user permissions." / "Guidance — Chat support for all customers, plus dedicated account management for those who qualify."
- WHAT IT DOES: Compresses a broad platform into four memorable nouns, each with a single concrete mechanism.
- WHY IT WORKS: Four is holdable in memory; the one-sentence mechanisms prevent the pillars from being empty slogans.
- PING PROBLEM IT COULD SOLVE: C — PING's many capabilities (observe, remember, connect, act, evidence, replay, runtimes) need a compression layer above the 14 sections.
- PING ADAPTATION: A four-pillar compression of PING (e.g. Observe / Remember / Act / Prove — to be validated against the real architecture), each with one concrete mechanism sentence. This becomes the page's table of contents, not just another section.
- COPY RISK: Low, provided pillars map to real capabilities.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN; four pillars typically become a 2x2 grid or vertical stack.
- PRIORITY: P1

### C3 — Retool: thesis-led sections instead of feature lists
- SOURCE: Retool
- URL: https://www.retool.com
- ROUTE/SECTION: `/` "Why enterprises choose Retool"
- SECTION DESCRIPTION: Three sections, each a thesis headline plus exactly two sentences, no bullets: "Production-ready from day one — Don't choose between moving fast or shipping something that'll actually pass a security review. What you build in Retool is enterprise-grade from the start—no rebuild, no audit scramble, no IT veto." / "From one great app to operational excellence — Point solutions help you build apps. You change how your business operates with Retool. One platform to manage, orchestrate, and scale everything you build." / "More teams building, no new risk — Business teams move fast, IT keeps full visibility, and governance is centralized. That's the foundation that makes app generation actually work."
- WHAT IT DOES: Argues a point of view per section instead of enumerating features.
- WHY IT WORKS: Each section lands one idea the reader can repeat; the two-sentence constraint forces editorial discipline.
- PING PROBLEM IT COULD SOLVE: C — several of PING's 14 sections could become thesis statements (intelligence vs authority; one authority many runtimes) rather than feature enumerations.
- PING ADAPTATION: Convert PING's authority section and multi-runtime section into thesis-led blocks: one arguable headline + two sentences + one visual each.
- COPY RISK: Low.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN; short text blocks are mobile-safe.
- PRIORITY: P1

### C4 — Webflow: audience-segmented tabs
- SOURCE: Webflow
- URL: https://webflow.com/
- ROUTE/SECTION: `/` "What marketing teams love about webflow" slider region
- SECTION DESCRIPTION: A tabbed/slider section segmented by persona (marketing teams, designers, engineers, agencies visible in the fetched content). Each tab shows a tailored feature list with its own visuals and proof stats (e.g. marketing tab: "Build and launch websites without filing a ticket", "Publish content without a developer", "Optimize for conversion" each with 3 bullets; proof cards like "$4M+ in pipeline attributed to organic content" for Copy.ai).
- WHAT IT DOES: Serves multiple buyers in one section's worth of scroll instead of one section per persona.
- WHY IT WORKS: Every reader finds their own door; the page stays short while coverage stays wide.
- PING PROBLEM IT COULD SOLVE: C — PING speaks to owners, operators, and technical buyers; tabs could compress persona-specific content.
- PING ADAPTATION: One "PING for…" tabbed section (owner / office manager / technician, or business-owner / technical-buyer), each tab showing the same system through that persona's jobs. PING Social as one tab's applied story.
- COPY RISK: Low.
- VISUAL RISK: Low — tabs are a neutral pattern.
- MOBILE BEHAVIOR: UNKNOWN; tabs typically become a horizontal chip scroller on mobile.
- PRIORITY: P1

### C5 — Raycast: rhythmic capability sentence-list
- SOURCE: Raycast
- URL: https://www.raycast.com
- ROUTE/SECTION: `/` "What else can Raycast do?" near the bottom
- SECTION DESCRIPTION: A single flowing paragraph of short sentences: "It can take notes. Track your flights. Convert anything. Search files. Run scripts. Manage your windows. Plan your day. Remind you of stuff. Translate into any language. Block distractions. Find text in screenshots. Insert Emojis." Followed by a link: "And much, much more."
- WHAT IT DOES: Dumps breadth without building a section per capability.
- WHY IT WORKS: The staccato rhythm makes a long list feel energetic rather than exhausting; "And much, much more" is an honest pressure valve.
- PING PROBLEM IT COULD SOLVE: C — PING's long capability inventory (workers, runtimes, integrations) needs a low-weight container.
- PING ADAPTATION: A single rhythmic paragraph for PING's capability inventory ("It can watch the inbox. Log the job. Nudge the follow-up. ..."), placed after the signature moments as a supporting beat.
- COPY RISK: Low, provided each verb is real.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN; paragraph reflows naturally.
- PRIORITY: P2

---

## D. SECTION TRANSITIONS

### D1 — Mercury: contrast couplets as transitions
- SOURCE: Mercury
- URL: https://mercury.com
- ROUTE/SECTION: `/` hero and inter-section transitions
- SECTION DESCRIPTION: The hero is a problem→relief couplet: "Banking's been a headache. Now, it's a head start." Later transitions reuse the device: "Get started fast. And never stop moving." / "Stop losing money to fees. Start using it to fuel your growth." / "You're creating something to stand the test of time. So are we."
- WHAT IT DOES: Each major beat opens with a two-sentence contrast that re-orients the reader before new information arrives.
- WHY IT WORKS: The first sentence names the old world, the second names the new; the reader crosses the bridge in one breath.
- PING PROBLEM IT COULD SOLVE: D — PING's 14 sections currently sit adjacent with no connective tissue.
- PING ADAPTATION: Write PING-native couplets for the 3–4 real transitions (problem→system, system→authority, infrastructure→applied layer). E.g. old-world/new-world pairs drawn from the business pain, not from Mercury's finance language.
- COPY RISK: Medium — couplets can tip into sloganeering; keep them plain.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN; short lines are mobile-safe.
- PRIORITY: P1

### D2 — Ramp: contrast-couplet closer
- SOURCE: Ramp
- URL: https://ramp.com/
- ROUTE/SECTION: `/` late page, pre-footer ("Scale the team. Shrink the paperwork.")
- SECTION DESCRIPTION: Two short imperative lines ("Scale the team. Shrink the paperwork."), then the payoff sentence "You had a bureaucracy. Now you have a business again.", then "70,000 teams and counting".
- WHAT IT DOES: Closes the narrative arc with a before/after in the reader's own language.
- WHY IT WORKS: It mirrors the hero's promise at the end, giving the page a sense of having traveled somewhere.
- PING PROBLEM IT COULD SOLVE: D — PING's page needs an ending that echoes its beginning.
- PING ADAPTATION: A PING closer couplet that mirrors the hero's felt outcome (e.g. the business that forgets → the business that remembers), then the honest proof line.
- COPY RISK: Medium.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

### D3 — Webflow: metric proof cards interleaved with features
- SOURCE: Webflow
- URL: https://webflow.com/
- ROUTE/SECTION: `/` throughout the persona-slider region
- SECTION DESCRIPTION: Feature rows alternate with big-number proof cards drawn from named customers: "$4M+ in pipeline attributed to organic content" (Copy.ai: "100 landing pages built in 2 hours", "Minutes vs. days to make site updates") / "$200M In new pipeline generated post-site launch" (ABM: "$25K Monthly cost savings", "3 hours vs. 3 weeks to publish content") / "2x Faster web builds" (Funsize) / "3.5 weeks from contract signed to live site" (Arkose Labs: "15 min to build a new page, down from 3 days", "81 Lighthouse speed up from 27").
- WHAT IT DOES: Alternates claim → proof → claim → proof, so no feature travels without evidence.
- WHY IT WORKS: The rhythm prevents "feature fatigue"; each proof card is a visual breather and a credibility deposit.
- PING PROBLEM IT COULD SOLVE: D, I — PING's sections can alternate system claims with evidence moments (build journal entries, replay traces, real metrics).
- PING ADAPTATION: Pair each PING capability section with one evidence card: a real build-journal entry, a replay trace excerpt, or an honest "what we measured" note. Where no evidence exists yet, the card says what is being built and its status — honesty as the pattern.
- COPY RISK: Medium — every number must be real and dated.
- VISUAL RISK: Low — cards are neutral.
- MOBILE BEHAVIOR: UNKNOWN; cards likely stack full-width.
- PRIORITY: P1

---

## E. LIVE FEEL — the page as an operating system

### E1 — Ramp: interactive entry demo ("See recommendations for your business")
- SOURCE: Ramp
- URL: https://ramp.com/
- ROUTE/SECTION: `/` directly under the hero
- SECTION DESCRIPTION: A section headlined "See recommendations for your business" with an input: "Start with your company website URL, then add any context about your business or spend challenges." Microcopy: "By continuing, you understand that Ramp uses AI to suggest content and acknowledge our Privacy Policy."
- WHAT IT DOES: Turns the CTA into a personalized demo: give us your URL, get AI-generated recommendations — value before signup.
- WHY IT WORKS: The visitor's own business becomes the demo content; the interaction proves the AI works rather than claiming it.
- PING PROBLEM IT COULD SOLVE: E — PING needs a "feel it working" moment.
- PING ADAPTATION: "See what PING would remember about your business — enter your website URL" returning an honest, labeled sample: what PING *could* observe/remember from public info, clearly marked as a sample, with the real system behind a follow-up. Must be genuinely generated, clearly labeled, and never presented as actual surveillance.
- COPY RISK: High — must not imply PING has already ingested the visitor's data; label as illustrative.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN; single input stacks fine.
- PRIORITY: P1 (only if the generation is real and honestly labeled)

### E2 — Framer: live terminal session embedded in marketing
- SOURCE: Framer
- URL: https://framer.com/
- ROUTE/SECTION: `/` "Connect to any AI" region
- SECTION DESCRIPTION: A rendered terminal session for "Claude Code v2.1.170" showing an agent working: "Initializing WordPress importer… └ WP REST API detected. └ Framer CMS connected." / "Skill(check-wordpress-auth) └ WordPress credentials verified." / "Bash(GET /wp-json/wp/v2/posts?per_page) └ 47 posts returned · 47 mapped to Blog schema." / "Bash(GET /wp-json/wp/v2/media × 47) └ titles, slugs, authors, dates, and cover images resolved." / "Import complete · 47 blog entries published to Framer CMS." with a "Copy install prompt" control. Adjacent prompt box: "Create a few layout variations of my site. Keep the content but try some different compositions." → "Thinking... Created a design plan, 2s, Placing layout variations side by side. GPT 5.6 Terra".
- WHAT IT DOES: Shows the agent's *work trace* — commands, intermediate results, completion — as the marketing visual.
- WHY IT WORKS: A trace is proof of agency; the reader watches the machine think and finish. Timestamps ("2s") and counts ("47 posts") make it feel real.
- PING PROBLEM IT COULD SOLVE: E, J — PING's multi-runtime story needs exactly this: a visible trace of work being done across runtimes.
- PING ADAPTATION: A PING run trace: an event arriving → worker pickup → evidence recorded → projection updated → replay available, rendered as a scrolling terminal/log with real (or honestly labeled sample) entries. This could be the "living system hero" visual.
- COPY RISK: High if fabricated — label sample traces as samples; prefer real anonymized traces.
- VISUAL RISK: Low — terminal aesthetics are generic.
- MOBILE BEHAVIOR: UNKNOWN; terminal likely becomes a simplified scrolling log.
- PRIORITY: P0 (as the signature "living system" visual, with honest data)

### E3 — Framer: real metrics dashboard ("Not just vibes, a full platform")
- SOURCE: Framer
- URL: https://framer.com/
- ROUTE/SECTION: `/` "Not just vibes, a full platform"
- SECTION DESCRIPTION: See B2. Performance panel ("Core Web Vitals, GOOD, LCP, 1.1s, INP, 95ms, CLS, 0.01"), "99.99% uptime", live analytics ("Live Visitors 400, Unique Visitors 1.7M, Total Pageviews 2.2M, Bounce Rate 40.9%"), and an A/B test results table naming a winner.
- WHAT IT DOES: Answers "but does it actually work?" with numbers instead of adjectives — including the section's own thesis in its title ("Not just vibes").
- WHY IT WORKS: Specific numbers (95ms, 0.01, 40.9%) are credible precisely because they are un-round; naming a test winner shows process, not just outcomes.
- PING PROBLEM IT COULD SOLVE: E, K — PING can show its own operational numbers (events processed, replay verifications, uptime of the demo) instead of claiming reliability.
- PING ADAPTATION: A "Not just promises" strip with PING's real numbers: events ingested, evidence records, replay checks passed, honest uptime. Only numbers the system actually produces.
- COPY RISK: High if numbers are invented — must be instrumented and real.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1 (gated on real instrumentation)

### E4 — Mercury: "Explore demo" → real interactive product
- SOURCE: Mercury
- URL: https://mercury.com
- ROUTE/SECTION: `/` "Mercury for business" section ("For $0/month, get started with business banking...")
- SECTION DESCRIPTION: A link labeled "Explore demo" pointing to demo.mercury.com — a full interactive demo environment, placed as the primary CTA of the product section rather than a signup form.
- WHAT IT DOES: Lets the visitor operate the product before creating an account.
- WHY IT WORKS: Removes the commitment step; the product sells itself.
- PING PROBLEM IT COULD SOLVE: E — PING's strongest asset is a working system; a demo environment would outperform any diagram.
- PING ADAPTATION: A public read-only PING demo (seeded fictional business, real event stream, explorable evidence/replay) linked from the homepage hero or evidence section. Read-only, seeded data, clearly labeled.
- COPY RISK: Low, if clearly labeled as a demo with sample data.
- VISUAL RISK: None — it is the product.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1 (significant build cost; high payoff)

### E5 — Framer: community live feed
- SOURCE: Framer
- URL: https://framer.com/
- ROUTE/SECTION: `/` "Built on a community that isn't going anywhere"
- SECTION DESCRIPTION: "20,970 Resources" header, then a feed of community posts with names and relative timestamps: "Lee Black, 7m — The only Framer Liquid Glass component that is cross browser and mobile friendly." / "Gustave Flowbert in Marketplace · 42m" / "Ben Fryc, 6h — in my fisheye era" / "Renny Mathew in Marketplace · 19h", plus "Trending Templates / Suggested for you" rails.
- WHAT IT DOES: Embeds living community activity (with real timestamps) inside the marketing page.
- WHY IT WORKS: Timestamps ("7m", "42m") prove the ecosystem is alive right now; names and artifacts make it concrete.
- PING PROBLEM IT COULD SOLVE: E — PING's build journal could be presented as a living feed rather than a static section.
- PING ADAPTATION: Render the PING build journal / changelog as a timestamped activity feed ("Replay verification passed · 2h ago", "New worker: InvoiceWatcher · 3d ago") with real entries. Honest recency or nothing.
- COPY RISK: Medium — timestamps must be real.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN; feed stacks naturally.
- PRIORITY: P2

---

## F. GRAPH

No site in this group presented an interactive node/edge graph as a marketing centerpiece. The nearest mechanisms are Retool's integration-ecosystem diagram (J2: services converging through a pipeline — a static topology, not an interactive graph) and Notion's "system of record" framing (a conceptual graph, not a visual one). Honest finding: this group does not inform the BusinessGraph visual directly; the graph harvest must come from other groups (infrastructure/developer-platform sites). Do not force a graph treatment from these sources.

---

## H. AUTHORITY — intelligence ≠ authority

### H1 — Dia: governance as visible on/off toggles
- SOURCE: Dia (The Browser Company)
- URL: https://www.diabrowser.com
- ROUTE/SECTION: `/` "Privacy first" section
- SECTION DESCRIPTION: Under "Privacy first" / "with you in control", the page renders what reads as a settings panel in marketing copy: "Block trackers On / Personalize new chats Off / Memory On / Block ads On / Share content data Off". Followed by: "You control whether Dia remembers your preferences and which tools connect to your workflow. Your data is never sold or used to build ad profiles — and with Sync, it's end-to-end encrypted." Then: "Dia for Work adds the guardrails that your team needs, like SSO and admin tools, so your team can stay secure."
- WHAT IT DOES: Makes governance *legible* — the reader sees the actual switches, not a paragraph about "taking privacy seriously".
- WHY IT WORKS: Toggles are the native UI of control; showing them in marketing collapses the distance between promise and product. "Off" states shown honestly (Personalize new chats: Off) build credibility.
- PING PROBLEM IT COULD SOLVE: H — PING's authority story (CapabilityAuthority, approvals, what agents may/may not do) is currently abstract.
- PING ADAPTATION: A PING "authority panel" visual: explicit allow/deny rows (Observe business inbox: ON / Act without approval: OFF / Access financial accounts: OFF / …), each row naming the real authority mechanism. Show at least one honest OFF. This could be a signature moment: "Intelligence is not authority."
- COPY RISK: Medium — every toggle must reflect the real implementation; an ON that isn't true is a lie.
- VISUAL RISK: Low — toggle rows are generic UI.
- MOBILE BEHAVIOR: UNKNOWN; rows stack naturally.
- PRIORITY: P0 (transformative for the authority story; directly PING-native)

### H2 — Framer: "alongside you, not instead of you"
- SOURCE: Framer
- URL: https://framer.com/
- ROUTE/SECTION: `/` "Agents that work alongside you, not instead of you"
- SECTION DESCRIPTION: See A5. The mechanism sentence: "It works directly on your site to generate and refine in place, with every change visible, editable, and under your control."
- WHAT IT DOES: Pairs the positioning claim with the concrete control mechanism in the same breath.
- WHY IT WORKS: "Visible, editable, and under your control" is a checkable promise — three specific properties, not a vibe.
- PING PROBLEM IT COULD SOLVE: H.
- PING ADAPTATION: PING's version of the checkable promise: "Every action proposed, approved, and replayable." — three checkable properties mapping to real mechanisms (proposal queue, approval paths, replay).
- COPY RISK: Medium — must be true.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

### H3 — Mercury: security as concrete mechanisms
- SOURCE: Mercury
- URL: https://mercury.com
- ROUTE/SECTION: `/` "Standard protection stops short. Mercury goes further."
- SECTION DESCRIPTION: Three mechanism-led blocks: "20x the usual coverage — Get up to $5M FDIC insurance through our partner banks and their sweep networks to ensure eligible deposits are protected." / "Next-level account security — Know your account is safe with tech-forward fraud and phishing protection, passkeys, dark web monitoring, and more." / "Controls at your fingertips — Decide who can view, move, or debit funds — with approval flows, locks, and permissions that keep you fully in control."
- WHAT IT DOES: Replaces "bank-grade security" with named mechanisms and numbers.
- WHY IT WORKS: Each claim names *how* (sweep networks, passkeys, approval flows); the reader can verify or at least picture each one.
- PING PROBLEM IT COULD SOLVE: H — PING must never say "secure" or "safe" vaguely; it should name authorities and controls.
- PING ADAPTATION: PING's authority section names the actual mechanisms: which authority grants what, where approvals happen, what the audit trail records. No security adjectives without a mechanism beside them.
- COPY RISK: Low, if mechanisms are real.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

### H4 — Retool: "Ship safely, with governance built in"
- SOURCE: Retool
- URL: https://www.retool.com
- ROUTE/SECTION: `/` governance block with compliance badges
- SECTION DESCRIPTION: Headline "Ship safely, with governance built in". Visual: "Retool apps layered over concentric arcs displaying compliance badges including SOC 2, SAML/SSO, and ISO 27001 on Retool Cloud." Copy: "Deploy with auth, access controls, and audit logging already in place. Fast to production, without sacrificing security."
- WHAT IT DOES: Treats governance as a first-class homepage section with its own visual, not a footer link.
- WHY IT WORKS: The concentric-arcs visual communicates "layers of control" instantly; naming the three concrete controls (auth, access controls, audit logging) keeps it honest.
- PING PROBLEM IT COULD SOLVE: H — governance deserves a visual, not just a paragraph.
- PING ADAPTATION: A PING "layers of control" visual: concentric or stacked layers naming the real authorities (identity → capability → approval → audit → replay), each layer one line. PING's own mechanism names, not compliance badges it doesn't have.
- COPY RISK: Medium — do not display badges or certifications PING lacks.
- VISUAL RISK: Medium — concentric arcs risk looking like a Retool echo; use PING's own diagram language.
- MOBILE BEHAVIOR: UNKNOWN; layered visual likely simplifies to a vertical stack.
- PRIORITY: P1

### H5 — Figma: humans and agents in shared context
- SOURCE: Figma
- URL: https://www.figma.com
- ROUTE/SECTION: `/` "Move fast in the right direction on an AI-native canvas."
- SECTION DESCRIPTION: "Teammates and AI agents work in the same space with shared context. Generate new design directions, refine, and align—together." Followed later by: "Start with design context. Build with consistency. Your context, codebase, and agents stay connected so what you design is what gets shipped."
- WHAT IT DOES: Frames agents as participants in a shared context, not as autonomous actors — "shared context" is the authority mechanism.
- WHY IT WORKS: It gives the reader a mental model for safe agency: the agent sees what you see, nothing more.
- PING PROBLEM IT COULD SOLVE: H — PING's agents act within tenant namespaces; "shared context, bounded authority" is the right mental model.
- PING ADAPTATION: "Agents work in your business's context — and only with the authority you've granted." Pair with the H1 toggle panel.
- COPY RISK: Low.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

---

## I. EVIDENCE / REPLAY / LINEAGE

### I1 — Notion: scenario proof cards ("See what Notion can do")
- SOURCE: Notion
- URL: https://notion.com/
- ROUTE/SECTION: `/` "See what Notion can do"
- SECTION DESCRIPTION: Five cards, each a concrete job with a product visual: "Triage product feedback" / "Resolve support tickets in Slack" / "Respond to security alerts faster" / "Automate weekly reporting" / "Create your own developer tools".
- WHAT IT DOES: Proves the product through named jobs instead of feature names.
- WHY IT WORKS: The reader pattern-matches their own job to a card; each card implies a before/after without stating it.
- PING PROBLEM IT COULD SOLVE: I — PING's evidence story should be told through business jobs, not architecture nouns.
- PING ADAPTATION: "See what PING remembers" — cards like "Onboard a new technician", "Answer: what changed on the Miller job?", "Prove the follow-up happened", each showing the evidence trail. Only jobs the system truly performs.
- COPY RISK: Medium — cards must reflect real capability.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN; cards likely become a swipe row or stack.
- PRIORITY: P1

### I2 — Ramp: "We've got the receipts."
- SOURCE: Ramp
- URL: https://ramp.com/
- ROUTE/SECTION: `/` late-page section header
- SECTION DESCRIPTION: A section headlined simply "We've got the receipts." (page text ends there in the fetch; it introduces the proof/customer-evidence region).
- WHAT IT DOES: Uses evidence idiom as the section's entire framing — the section promises proof, not claims.
- WHY IT WORKS: Colloquial, confident, and it sets the reader's expectation: what follows must be receipts.
- PING PROBLEM IT COULD SOLVE: I — PING's evidence section needs a frame that promises proof.
- PING ADAPTATION: PING's evidence section could carry a receipts frame ("Every claim comes with receipts." style), followed exclusively by real artifacts: event records, replay verifications, lineage traces. The frame is a contract: nothing under it may be a mockup presented as real.
- COPY RISK: Medium — the frame raises the bar for everything under it.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

### I3 — Webflow: branching and activity log as marketing
- SOURCE: Webflow
- URL: https://webflow.com/
- ROUTE/SECTION: `/` "Review, branch, and approve in one place"
- SECTION DESCRIPTION: "Page branching gives your team a safe space to design without affecting the original page. Branch any page, make your changes, and merge when you're ready." Bullets: "Create page branches for static and CMS pages" / "Resolve conflicts between a branch and the main site" / "Track branch activity in the Site Activity log".
- WHAT IT DOES: Markets versioning/lineage primitives (branch, merge, activity log) as buyer-facing features.
- WHY IT WORKS: It makes an abstract technical capability tangible: the reader instantly understands "a safe space to change things".
- PING PROBLEM IT COULD SOLVE: I — PING's replay/lineage is the same class of capability and deserves the same plain treatment.
- PING ADAPTATION: Present replay/lineage as "a safe record of everything": branch-like language for projections ("see the business as it was on any date"), an activity-log visual for the event stream. Plain words, real primitives.
- COPY RISK: Low.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

### I4 — Webflow: every feature paired with a customer metric
- SOURCE: Webflow
- URL: https://webflow.com/
- ROUTE/SECTION: `/` persona-slider proof cards (see D3)
- SECTION DESCRIPTION: See D3. Each feature row is adjacent to a big-number card with a named customer, a headline metric, and 2–3 supporting metrics plus a one-line story.
- WHAT IT DOES: Makes "evidence" a layout rule: no claim appears without a neighboring number.
- WHY IT WORKS: The pairing is the message — the page's structure says "we measure everything".
- PING PROBLEM IT COULD SOLVE: I, K — PING should adopt the pairing rule structurally.
- PING ADAPTATION: Layout rule for the PING homepage: every capability block gets an adjacent evidence cell (real metric, journal entry, or honest status label). Empty evidence cells are not hidden — they show the status ("In active development — journal entry 2026-09-14").
- COPY RISK: Medium — requires real numbers or honest status labels.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P1

---

## J. MULTI-RUNTIME — one authority, many execution runtimes

### J1 — Framer: "Connect to any agent" + live terminal trace
- SOURCE: Framer
- URL: https://framer.com/
- ROUTE/SECTION: `/` "Connect to any AI" / "Connect to any agent"
- SECTION DESCRIPTION: Headline "Connect to any agent" (also rendered as "Connect to any AI"). Copy: "Take action on your site from anywhere. Update copy from Slack. Trigger CMS changes from the terminal. Ship from a GitHub PR. Drive it all from your Terminal, Codex, Claude Code, Cursor, or any external agent." Named agent chips: framer-agent, claude, cursor, codex. Adjacent: the live terminal session (see E2) showing an external agent (Claude Code) performing real operations against the platform (skill invocations, API calls, "Import complete · 47 blog entries published to Framer CMS").
- WHAT IT DOES: Shows heterogeneous agents (Terminal, Codex, Claude Code, Cursor) converging on one governed platform — and proves it with a work trace.
- WHY IT WORKS: Naming the external agents makes the abstract concrete; the trace proves the convergence is real, not a logo slide. "From anywhere" lists the actual doors (Slack, terminal, GitHub PR).
- PING PROBLEM IT COULD SOLVE: J — this is the closest existing expression of PING's "ONE AUTHORITY / MANY RUNTIMES" story.
- PING ADAPTATION: A PING "run it from anywhere" section: one authority (tenant namespace, CapabilityAuthority) with named runtime doors (JS workers, Python workers, local execution, Codex, Hermes, Oracle, cloud) each shown issuing real operations through the same event/evidence plane, with a live trace. Runtime labels must reflect the real implementation status (BUILT / ACTIVE DEVELOPMENT / EXPERIMENTAL / DIRECTION) — verified against the actual /home/nolan/ping repo, never aspirational.
- COPY RISK: High — runtime status labels must be evidence-backed; this is the exact overclaim risk flagged in the project brief.
- VISUAL RISK: Medium — avoid a "logo slide of runtimes"; the trace is the visual.
- MOBILE BEHAVIOR: UNKNOWN; likely simplifies to a runtime list + condensed trace.
- PRIORITY: P0 (signature-moment candidate; gated on honest status labels)

### J2 — Retool: integration-ecosystem convergence diagram
- SOURCE: Retool
- URL: https://www.retool.com
- ROUTE/SECTION: `/` "Securely connect to your production data"
- SECTION DESCRIPTION: Copy: "Every app you build connects directly to your production data sources. Access is governed by your existing permissions—no extra configuration required." Visual (from alt text): "a visual diagram showing Retool's integration ecosystem, with connector lines linking services like Snowflake, PostgreSQL, AWS, and Anthropic to a sequential workflow of query, transform, and response steps."
- WHAT IT DOES: Visualizes many heterogeneous sources converging through one governed pipeline (query → transform → response).
- WHY IT WORKS: The convergence is the product: the diagram's left side is diversity, the right side is order. "Governed by your existing permissions" ties convergence to authority in one line.
- PING PROBLEM IT COULD SOLVE: J, B — PING needs exactly this visual grammar: many runtimes/sources on the left, one authority plane in the middle, governed outcomes on the right.
- PING ADAPTATION: A PING convergence diagram: runtimes/sources on the left (JS workers, Python workers, Codex, Hermes, local, Oracle, cloud — only those with real status), the event/evidence/authority plane in the middle, projections/actions on the right. One honest status label per runtime.
- COPY RISK: High — same status-label honesty requirement as J1.
- VISUAL RISK: Medium — must use PING's diagram language, not Retool's.
- MOBILE BEHAVIOR: UNKNOWN; convergence diagrams typically collapse to a vertical flow (sources → plane → outcomes) on mobile — a natural PING adaptation.
- PRIORITY: P0 (signature-moment candidate; the single clearest visual grammar for the multi-runtime story)

### J3 — Retool: three parallel build paths, one governed platform
- SOURCE: Retool
- URL: https://www.retool.com
- ROUTE/SECTION: `/` "Build powerful apps from anywhere" (three sub-blocks)
- SECTION DESCRIPTION: Three parallel entry paths, each with a live product visual: (1) chat-driven AI builder ("Describe what you want and get a full, production-ready app...") with a split view of chat + live preview; (2) "Build an app from your favorite AI coding agent" with a Claude Code terminal generating a Retool app ("deploy it here within your governed Retool environment") + MCP server docs link; (3) "Deploy apps built in Lovable, Replit, and other platforms. Upload a ZIP file or sync with GitHub."
- WHAT IT DOES: Shows that heterogeneous builders (chat, external agents, imported code) all land in the same governed environment.
- WHY IT WORKS: "Anywhere" is proven three ways; the repeated phrase "governed Retool environment" / "enterprise security and governance built in" makes the one-platform promise stick.
- PING PROBLEM IT COULD SOLVE: J — PING's runtimes are heterogeneous builders acting on one authority.
- PING ADAPTATION: Present PING's runtimes as parallel doors into one governed plane, each with its honest status. The repeated anchor line is the authority promise ("every action lands in the same evidence plane"), not a feature list.
- COPY RISK: High — status honesty again.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN; three paths likely stack.
- PRIORITY: P1

---

## K. STATUS / HONESTY

### K1 — Figma: dated stat sourcing
- SOURCE: Figma
- URL: https://www.figma.com
- ROUTE/SECTION: `/` social proof ("95% of the Fortune 500 uses Figma")
- SECTION DESCRIPTION: The stat is followed immediately by its provenance: "Based on data from March 2025."
- WHAT IT DOES: Dates the evidence, implicitly admitting stats age.
- WHY IT WORKS: A four-word provenance line converts a marketing number into a citable fact; it signals the company expects to be checked.
- PING PROBLEM IT COULD SOLVE: K — PING should date every number it publishes.
- PING ADAPTATION: House rule: every stat on the PING site carries its as-of date ("Events replayed: 12,408 — as of 2026-09-16"). No undated numbers.
- COPY RISK: Low.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN; provenance line is small text.
- PRIORITY: P2 (cheap, high-trust)

### K2 — Mercury: press-milestone cards
- SOURCE: Mercury
- URL: https://mercury.com
- ROUTE/SECTION: `/` "Mercury in the spotlight"
- SECTION DESCRIPTION: Three milestone cards: "Mercury hits $5.2B valuation" / "$650M in annual revenue and profitable" / "Mercury lands $300M Series C".
- WHAT IT DOES: Uses third-party milestones as a transparency device — "here is what actually happened, in public".
- WHY IT WORKS: Milestones are checkable; the card format keeps them scannable.
- PING PROBLEM IT COULD SOLVE: K — PING's build journal could use milestone cards instead of prose.
- PING ADAPTATION: "PING in the open" milestone cards drawn from the real build journal (e.g. "Replay verification: deterministic across 3 runs", "First worker promoted to production", each dated). Only real, dated milestones.
- COPY RISK: Medium — milestones must be real and dated.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN; cards stack.
- PRIORITY: P2

### K3 — Retool: changelog eyebrow above the hero
- SOURCE: Retool
- URL: https://www.retool.com
- ROUTE/SECTION: `/` top of page, above the logo wall
- SECTION DESCRIPTION: An announcement bar: "Secure your vibe-coded apps" / "New" / "Explore the new Retool app builder for free".
- WHAT IT DOES: Puts the newest shipped thing at the very top, signaling a shipping culture.
- WHY IT WORKS: "New" is a small word that says "this company ships"; it also gives returning visitors a reason to look.
- PING PROBLEM IT COULD SOLVE: K — PING's "Follow the build" positioning wants exactly this surface.
- PING ADAPTATION: A "Latest from the build" eyebrow above the PING hero, updated when something real ships (never a static fake "New"). If nothing shipped recently, the slot stays empty — an empty slot is itself honest.
- COPY RISK: Medium — must be updated truthfully or removed.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

### K4 — Dia: honest availability scoping
- SOURCE: Dia (The Browser Company)
- URL: https://www.diabrowser.com
- ROUTE/SECTION: `/` final CTA ("Ready for a better day?")
- SECTION DESCRIPTION: The closing CTA is followed immediately by a scope note: "Currently available on Apple macOS 14+ with M1 chips or later."
- WHAT IT DOES: States the product's limits at the moment of highest intent.
- WHY IT WORKS: Scoping at the CTA prevents disappointment and signals confidence — the company would rather tell you now than have you bounce later.
- PING PROBLEM IT COULD SOLVE: K — PING must scope availability (private build, limited tenants) at its CTAs.
- PING ADAPTATION: Every PING CTA carries its honest scope ("Private build — currently onboarding Western Colorado home-service businesses" style). No open-ended "Get started" that leads nowhere.
- COPY RISK: Low.
- VISUAL RISK: None.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

---

## L. TYPOGRAPHY

### L1 — Raycast: adjective value triad
- SOURCE: Raycast
- URL: https://www.raycast.com
- ROUTE/SECTION: `/` post-hero value block
- SECTION DESCRIPTION: Four one-word adjectives, each followed by a one-line proof: "**Fast.** Think in milliseconds." / "**Ergonomic.** Keyboard First." / "**Personal.** Your tools, your way." / "**Reliable.** 99.8% crash-free rate."
- WHAT IT DOES: Compresses four value props into eight short lines with a strict label→proof grammar.
- WHY IT WORKS: The bold adjective acts as an anchor; the eye scans the four anchors in under two seconds and reads only the proofs it cares about.
- PING PROBLEM IT COULD SOLVE: L — PING needs stronger typographic hierarchy for its value props.
- PING ADAPTATION: A PING value quad in the same grammar: **Observant.** … / **Persistent.** … / **Bounded.** … / **Provable.** … (words to be chosen against the real architecture; each with a one-line honest proof).
- COPY RISK: Low.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN; stacks naturally.
- PRIORITY: P1

### L2 — Mercury: verb-led micro-scenario cards
- SOURCE: Mercury
- URL: https://mercury.com
- ROUTE/SECTION: `/` hero-adjacent feature cards
- SECTION DESCRIPTION: Four cards, each headlined by an action in plain verbs: "Create cards in a couple of clicks" / "Watch bills pay themselves" / "Get paid without a patchwork of tools" / "Reconcile receipts without the runaround" — each followed by one mechanism sentence ("AI reads bills, populates details automatically, and remembers past recipients — so you can approve and pay in seconds.").
- WHAT IT DOES: Makes the headline the *action*, not the feature name; the mechanism sentence earns the headline.
- WHY IT WORKS: Verb headlines are instantly imaginable; the reader pictures themselves doing the thing.
- PING PROBLEM IT COULD SOLVE: L, C — PING's capability headlines currently name architecture nouns; verb headlines would be more imaginable.
- PING ADAPTATION: Rewrite PING capability headlines as verbs ("Watch a job remember itself" style — PING's own verbs), each with one mechanism sentence. Keep architecture nouns for the technology page.
- COPY RISK: Medium — verbs must describe real behavior.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN; cards are inherently mobile-friendly.
- PRIORITY: P1

### L3 — Figma: noun-verb capability pairs
- SOURCE: Figma
- URL: https://www.figma.com
- ROUTE/SECTION: `/` capability trio under the hero
- SECTION DESCRIPTION: Three paired blocks: "Design anything you can imagine — Turn your ideas into apps, websites, and products." / "Build with intention — Dev tools that take you all the way to production." / (plus the canvas statements "The intelligent canvas for infinite creativity" / "Move fast in the right direction on an AI-native canvas" / "Powerfully expressive. Incredibly precise.").
- WHAT IT DOES: Alternates imperative verb phrases ("Design…", "Build…") with short declarative craft lines ("Powerfully expressive. Incredibly precise.").
- WHY IT WORKS: The alternation creates rhythm: instruction, then poetry, then instruction — the page breathes.
- PING PROBLEM IT COULD SOLVE: L — PING's copy is currently all-instruction or all-explanation; alternation would give it rhythm.
- PING ADAPTATION: Alternate PING's imperative capability lines with short declarative craft lines about memory and evidence. Keep the declarations provable ("What happened, kept." style — PING's voice).
- COPY RISK: Low.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: UNKNOWN.
- PRIORITY: P2

---

## M. MOBILE

### M1 — Mercury: card-based micro-scenarios as the mobile-safe unit
- SOURCE: Mercury
- URL: https://mercury.com
- ROUTE/SECTION: `/` verb-led cards (see L2)
- SECTION DESCRIPTION: The capability content is already chunked into self-contained cards (headline + one mechanism sentence + one CTA each), which reflow without redesign.
- WHAT IT DOES: Uses the card — not the section — as the atomic responsive unit.
- WHY IT WORKS: Cards stack, swipe, or grid without content changes; the compositional work happens at the card level once.
- PING PROBLEM IT COULD SOLVE: M — PING's complex diagrams (business graph, topology) need deliberate mobile compositions, not shrunken desktop SVGs.
- PING ADAPTATION: Design PING's mobile story card-first: each signature moment gets a purpose-built mobile composition (e.g. the convergence diagram J2 becomes a vertical sources→plane→outcomes flow; the authority toggles H1 become a settings-list; the trace E2 becomes a condensed log). Desktop diagrams are never merely scaled down.
- COPY RISK: None.
- VISUAL RISK: Low.
- MOBILE BEHAVIOR: Partially UNKNOWN — inferred from the card structure; exact Mercury mobile behavior not verified.
- PRIORITY: P1 (as a standing rule for the redesign, not a single change)

### General mobile note
Exact mobile behavior (breakpoints, gesture patterns, which visuals are replaced vs. reflowed) could not be determined from page text for any site in this group. The mechanisms above are inferred from content structure (cards, tabs, short lines), which are inherently reflow-friendly. A dedicated mobile pass with rendered screenshots is still needed before finalizing PING's mobile compositions. Nothing in this harvest should be treated as verified mobile evidence.

---

## Cross-site patterns worth naming

1. **The convergence visual is the infrastructure homepage's signature move.** Retool (J2) and Framer (J1) both show many-things→one-platform. PING's one-authority/many-runtimes story belongs in this lineage — but PING's differentiator is that the "one" is an *authority and evidence* plane, not just a data plane.
2. **Governance is moving from footer to headline.** Dia (H1), Retool (H4), Mercury (H3) all give control mechanisms prominent placement. PING's authority story is on-trend and under-exploited.
3. **The trace is the new screenshot.** Framer's terminal session (E2) and Webflow's activity log (I3) show work *happening*, not interfaces *existing*. PING's event stream is natively a trace — the homepage should show it moving.
4. **Honesty is a layout rule, not a tone.** Webflow's claim→proof pairing (D3/I4), Figma's dated stats (K1), Dia's OFF toggles (H1) — all structural, not copywriting.
5. **Compression beats coverage.** Every site in this group says less than PING's current 14 sections: verb pairs (Notion), four pillars (Mercury), thesis blocks (Retool), persona tabs (Webflow), sentence-lists (Raycast).

---

## Harvest summary

- Sites reviewed: 9 (Notion, Framer, Raycast, Dia, Ramp, Mercury, Retool, Figma, Webflow)
- Ideas harvested: 30 (A: 5, B: 2, C: 5, D: 3, E: 5, F: 0 with honest note, H: 5, I: 4, J: 3, K: 4, L: 3, M: 1 + general note)
- P0: 4 (J1, J2, H1, E2)
- P1: 17
- P2: 9
