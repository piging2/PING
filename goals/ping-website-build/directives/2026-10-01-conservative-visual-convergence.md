# PING WEBSITE — CONSERVATIVE VISUAL CONVERGENCE
Directive issued by Nolan, 2026-10-01 ~17:31 MDT. Filed verbatim.

> # PING WEBSITE — CONSERVATIVE VISUAL CONVERGENCE
>
> **KEEP GOING. DO NOT REDESIGN.**
>
> Codex has produced valuable visual language and integrated it into the actual site.
>
> Our job now is:
>
> `PRESERVE`
> `→ VERIFY`
> `→ REFINE`
> `→ CONNECT`
> `→ COMMIT`
> `→ THEN IMPROVE`.
>
> We are not starting another design sprint.
>
> ---
>
> ## P0 — PRESERVE TODAY'S WORK
>
> There are ~76 dirty/untracked entries on local HEAD `76248bda`.
>
> Before further substantial editing:
>
> `git status`
>
> classify ownership;
>
> identify exactly which files belong to today's Codex artwork/integration;
>
> review diff;
>
> run build;
>
> run visual/browser verification;
>
> stage **only owned files**;
>
> commit an honest atomic checkpoint.
>
> **DO NOT `git add .`.**
>
> **DO NOT `git add -A`.**
>
> **DO NOT sweep unrelated dirty state into the commit.**
>
> If today's website work spans multiple coherent units, use several commits:
>
> `ARTWORK SOURCES / OPTIMIZED ASSETS`
>
> `SYMBOL LANGUAGE`
>
> `SITE INTEGRATION`
>
> `VISUAL/MOBILE REFINEMENT`.
>
> If separating them would destroy an already-integrated coherent state, make one explicitly labeled integration checkpoint.
>
> Report SHAs.
>
> Nothing pushed.
>
> ---
>
> # THE VISUAL THESIS
>
> The strongest thing Codex appears to have discovered is that PING does not need decorative “AI art.”
>
> It needs a **visual grammar for its concepts**.
>
> The three families are already pointing toward that:
>
> **CONTINUITY**
>
> things persist and evolve without losing identity.
>
> **EVIDENCE**
>
> claims are grounded in observable support.
>
> **KNOWLEDGE**
>
> observations become connected understanding.
>
> The SVG symbol family adds the smaller vocabulary:
>
> identity;
>
> capability;
>
> event;
>
> lineage;
>
> relationship;
>
> evidence;
>
> object;
>
> execution;
>
> etc.
>
> **KEEP THIS.**
>
> Do not dilute it with generic gradient blobs, robot illustrations, stock photography, random dashboards, fake terminal windows, or generic AI-network imagery.
>
> PING should look like PING.
>
> ---
>
> # MAKE THE WEBSITE EXPLAIN THE PRODUCT
>
> Every major visual should answer a product question.
>
> The homepage should progressively explain:
>
> **1. WHAT IS PING?**
>
> A system that can understand what exists, preserve why it believes it, act under authority, observe what actually happened, and learn.
>
> **2. WHAT MAKES IT DIFFERENT?**
>
> It does not reduce everything to chat history or generated text.
>
> **3. WHAT DOES IT REMEMBER?**
>
> Objects, relationships, evidence, corrections, decisions, effects, outcomes.
>
> **4. WHAT CAN IT DO?**
>
> Research, understand, propose, execute authorized work, verify, learn.
>
> **5. WHY SHOULD I TRUST IT?**
>
> Show the evidence/authority/effect distinction.
>
> **6. WHAT DOES THIS BECOME?**
>
> A durable intelligence layer rather than another disposable AI session.
>
> The art should carry part of that explanation.
>
> ---
>
> # HERO — MAKE THIS EXCEPTIONAL
>
> Keep the Continuity artwork.
>
> The `Record / Connect / Carry-forward` interaction is promising because it communicates a system changing state rather than showing one static hero illustration.
>
> Refine it until the visual transformation itself teaches:
>
> `RECORD`
> observation enters the system;
>
> `CONNECT`
> it becomes related to existing knowledge;
>
> `CARRY FORWARD`
> useful context survives into future work.
>
> The controls must not feel like a carousel.
>
> They should feel like three views of one concept.
>
> Desktop:
>
> strong editorial headline;
>
> concise explanatory copy;
>
> obvious primary action;
>
> artwork has enough scale to feel intentional.
>
> Mobile:
>
> **HEADLINE FIRST.**
>
> Then visual.
>
> Then primary action immediately reachable.
>
> No giant decorative image forcing the CTA below several screens.
>
> Test narrow phones, not just one responsive screenshot.
>
> ---
>
> # TURN STATIC ART INTO A SYSTEM
>
> The generated PNG/WebP artwork should be treated as **canonical visual compositions**, not pasted illustrations.
>
> Where practical, recreate/reinterpret portions using the existing symbol/primitive language so the site can respond to:
>
> hover;
>
> selection;
>
> scroll;
>
> state;
>
> reduced-motion preference.
>
> But:
>
> **DO NOT REBUILD BEAUTIFUL WORK MERELY TO MAKE IT PROGRAMMATIC.**
>
> Preserve the rendered artwork where it is stronger.
>
> Interactivity must earn itself.
>
> ---
>
> # THREE.JS — USE SPARINGLY
>
> The existing primitive scene is allowed to stay because it exists and apparently works.
>
> Do not turn the website into a Three.js showcase.
>
> Use 3D only where depth actually explains:
>
> relationship;
>
> topology;
>
> lineage;
>
> continuity;
>
> object structure.
>
> If an equivalent static/SVG composition communicates the idea faster, prefer it.
>
> Performance and clarity beat spectacle.
>
> ---
>
> # EVIDENCE SECTION
>
> Make this one of the site's signature moments.
>
> Don't say merely:
>
> > PING uses evidence.
>
> Show:
>
> `CLAIM`
> `→ SUPPORT SET`
> `→ OBSERVATION`
> `→ SOURCE`.
>
> Then show uncertainty honestly:
>
> `SUPPORTED`
>
> `PARTIAL`
>
> `CONFLICTING`
>
> `UNKNOWN`.
>
> This directly connects the Evidence artwork to actual PING behavior.
>
> The visual should make somebody understand within seconds:
>
> **PING can tell you why it believes something.**
>
> ---
>
> # KNOWLEDGE / RELATIONSHIP EXPLORER
>
> The Knowledge artwork should transition naturally into the interactive relationship explorer.
>
> Don't make the explorer a random graph visualization.
>
> Give it a tiny understandable story:
>
> select one object;
>
> show its relationships;
>
> reveal evidence;
>
> reveal lineage;
>
> show how another observation changes understanding.
>
> Start constrained.
>
> Expand on interaction.
>
> Avoid “hairball graph” syndrome.
>
> ---
>
> # JOURNAL
>
> Make the journal visually distinct from knowledge.
>
> **KNOWLEDGE = WHAT PING UNDERSTANDS.**
>
> **JOURNAL = WHAT HAPPENED.**
>
> This distinction is central to the product.
>
> Journal visualization should emphasize:
>
> sequence;
>
> causation;
>
> decisions;
>
> effects;
>
> verification.
>
> Knowledge visualization should emphasize:
>
> objects;
>
> claims;
>
> evidence;
>
> relationships.
>
> Do not let both become the same nodes-and-lines graphic with different headings.
>
> ---
>
> # SHOW THE FULL INTELLIGENCE LOOP ONCE
>
> Somewhere below the conceptual introduction, give the visitor one compact real flow:
>
> `OBSERVE`
> `→ UNDERSTAND`
> `→ DECIDE`
> `→ AUTHORIZE`
> `→ ACT`
> `→ VERIFY`
> `→ LEARN`.
>
> Each stage can use the new symbol vocabulary.
>
> This becomes the bridge between abstract visual language and actual capability.
>
> Do not introduce seven paragraphs.
>
> Let interaction reveal depth.
>
> ---
>
> # FYD
>
> FYD should appear as the clearest demonstration of what PING's model enables—not as an unrelated second product dropped into the page.
>
> The Evidence artwork beside FYD's source explanation is therefore a good integration.
>
> Strengthen the story:
>
> `EXISTING PRESENCE`
> `→ OBSERVATIONS`
> `→ EVIDENCE`
> `→ OBJECT GRAPH`
> `→ SITE`
> `→ OWNER CORRECTION`
> `→ REGENERATION`.
>
> Show that the generated site is a projection of understanding rather than a template somebody filled out.
>
> That is visually interesting and product-distinctive.
>
> ---
>
> # MOTION
>
> Remember the stranded FYD motion-vocabulary work found earlier.
>
> **SEARCH BEFORE WRITING.**
>
> Do not invent another motion system if the existing stranded unit can be harvested safely.
>
> Motion should encode meaning:
>
> observation appearing;
>
> relationship forming;
>
> evidence attaching;
>
> state carrying forward;
>
> verification resolving;
>
> uncertainty remaining unresolved.
>
> Avoid motion whose only purpose is “premium feel.”
>
> Honor `prefers-reduced-motion`.
>
> ---
>
> # COPY
>
> Remove generic AI-company language aggressively.
>
> Ban phrases like:
>
> `AI-powered`
>
> `revolutionize`
>
> `unlock`
>
> `seamless`
>
> `next-generation`
>
> `transform your workflow`
>
> unless an extremely specific context earns them.
>
> Prefer concrete statements.
>
> PING's concepts are unusual enough that we do not need inflated copy.
>
> A useful test:
>
> **Could this sentence appear unchanged on 100 AI startup homepages?**
>
> If yes, rewrite it.
>
> ---
>
> # DESIGN PAGE
>
> Keep `/design`.
>
> Do not let it become an abandoned laboratory.
>
> Make it the internal canonical visual-language reference:
>
> artwork families;
>
> symbols;
>
> typography;
>
> spacing;
>
> motion;
>
> interaction states;
>
> dark/light treatment if both exist;
>
> primitive compositions.
>
> But the public homepage remains the product.
>
> `/design` cannot become the place where the beautiful version lives while production slowly diverges.
>
> ---
>
> # PERFORMANCE
>
> The WebP conversion was the correct direction.
>
> Now verify:
>
> intrinsic dimensions;
>
> responsive sizing;
>
> no unnecessarily giant hero downloads;
>
> lazy loading below fold;
>
> no layout shifts;
>
> Three.js loaded only where needed if practical;
>
> mobile GPU/CPU behavior;
>
> reduced-motion behavior.
>
> Do not destroy image quality to chase an arbitrary Lighthouse score.
>
> But don't ship 5 MB visual compositions when a visually indistinguishable 300 KB version exists.
>
> ---
>
> # ACCESSIBILITY
>
> Every interactive artwork needs:
>
> keyboard access;
>
> visible focus;
>
> semantic control names;
>
> meaningful fallback;
>
> sensible alt treatment.
>
> Decorative visuals should not dump meaningless prose into screen readers.
>
> Conceptual visuals should have concise textual equivalents.
>
> Color cannot be the only state indicator.
>
> ---
>
> # VISUAL QA
>
> After each meaningful integration unit:
>
> build;
>
> start clean preview;
>
> capture:
>
> desktop wide;
>
> normal laptop;
>
> tablet;
>
> narrow mobile.
>
> Inspect actual screenshots.
>
> Test controls manually.
>
> Check console/page errors.
>
> Verify image requests.
>
> Verify no horizontal overflow.
>
> Verify no text-image collision.
>
> Verify no giant blank zones.
>
> Verify headline/CTA hierarchy.
>
> Do not accept “build passes” as design verification.
>
> ---
>
> # DO NOT DO
>
> No new design system.
>
> No new website framework.
>
> No homepage rewrite.
>
> No generic component library migration.
>
> No replacing Codex artwork because another agent has another aesthetic idea.
>
> No adding imagery simply to fill whitespace.
>
> No huge video backgrounds.
>
> No gratuitous WebGL.
>
> No fake product screenshots.
>
> No invented customer logos/testimonials.
>
> No architectural claims the product cannot currently demonstrate.
>
> ---
>
> # SUCCESS
>
> The site should eventually feel like someone can infer PING's architecture **without reading architecture documentation**.
>
> They should leave understanding:
>
> **PING observes reality.**
>
> **PING preserves evidence.**
>
> **PING connects knowledge.**
>
> **PING distinguishes authority from truth.**
>
> **PING can act.**
>
> **PING checks what actually happened.**
>
> **PING carries learning forward.**
>
> And the visual language should make those ideas memorable.
>
> Preserve today's work first.
>
> Then refine the hero.
>
> Then Evidence.
>
> Then Knowledge/relationships.
>
> Then Journal.
>
> Then the full intelligence loop.
>
> **DO NOT ADD MORE VISUAL FAMILIES UNTIL THESE THREE ARE EXHAUSTED.**
>
> GO.

## Accompanying binding context (same message, not in the quoted block)

- Keep pushing the PING website, but do NOT let anyone restart the design from scratch. The Codex work crossed the boundary from "design study" to "real visual language inside the product site." Next job is refinement, coherence, storytelling, committing valuable state.
- Nolan checked canonical repos before the call: remote PING still at `81b3248`, remote FYD inaccessible via connected GitHub, CRX runtime at `6c4b531`. The local `ping-parallel` worktree is substantially newer than anything GitHub-visible. Do NOT treat remote main as the design authority.
- Continuity / Evidence / Knowledge could become PING's visual alphabet: same geometry, symbols, relationships, spatial rules recurring across homepage, Mission Control, FYD, diagrams, docs, social, MarketingOS. Website work feeds MarketingOS (e.g., Evidence/Continuity grammar depicting an effect entering unresolved verification). Do NOT ask Codex for another 30 images tonight; enough raw material exists. Make the existing work feel inevitable everywhere it appears.
- 76 uncommitted entries containing today's only copies of good design work = stranded valuable implementation the convergence laws were designed to eliminate. Commit it.

## Execution record

- P0 preservation worker dispatched 2026-10-01 ~17:35 MDT (see handoff when complete).
- Standing git rules for this directive: no `git add .` / `-A`; stage only owned files; unrelated dirty state and the 2026-09-24 stash preserved; nothing pushed, ever, without Nolan's explicit word.
