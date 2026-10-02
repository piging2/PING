# ASK 37 QUESTIONS (Batch 5)

Date: 2026-09-26

During the 24-hour design sprint (T+24 deadline about 2026-09-27 18:55 MDT) and the parallel ORCA/Mission Control convergence track, these are the product, architectural, authority, and owner-judgment decisions the system cannot make on its own. Each question passed the grill-20 classifier (it failed at least one check, which is why it is reaching you). Each carries evidence-backed context, a recommended default, what happens under the default versus the alternative, and the cost of being wrong. Answer per question, or accept all defaults.

## 1. Freeze :3100 during the sprint, or let it move?

**Context:** :3100 currently serves the pre-redesign PING, HPP, and Coppersmith sites, and the T+2 baseline screenshots were captured against it. The sprint builds the new projection in isolated worktrees, and those URLs are the final deliverable you will judge. Rebuilding :3100 progressively would let you peek at progress, but you could land on a half-built intermediate.

**Recommended default:** Freeze :3100 on the current build until the T+24 proof, then swap in the finished system.

**On default vs alternative:** On the default, the URLs stay stable and unremarkable until Sunday about 19:00 MDT, when they swap to finished work; you judge finished work, never scaffolding. On the alternative, you can watch the build converge live, but a mid-sprint click could show a broken intermediate.

**Cost of being wrong:** If we freeze and you wanted to watch, you lose a day of visibility (low cost). If we let it move and you click mid-sprint, you see breakage and lose confidence and time (higher cost, borne by you).

## 2. Intelligence spend ceiling for the 24 hours?

**Context:** 16 sprint lanes plus vision critics, research harvesters, and the parallel ORCA track all burn model compute tonight. Your standing rules cover Copilot (burn freely on real work) and Jev ($5/day ceiling), but there is no stated ceiling for the sprint's own subagent usage.

**Recommended default:** Full useful burn, no cap, with the total reported at T+24.

**On default vs alternative:** On the default, the fastest possible convergence, and the bill is whatever it is. On the alternative (a hard cap), I throttle or park lanes when the cap binds, which slows the generate-judge-improve loop exactly when speed matters most.

**Cost of being wrong:** No cap on a runaway loop could burn real money overnight. A cap that binds could stall the sprint and waste the 24-hour window, which is the bigger loss.

## 3. Font loading on generated sites: self-hosted OFL, system stack, or Google Fonts hotlink?

**Context:** Lane 6 is building the type system now, and the sprint demands real typographic drama. A Google Fonts hotlink is easiest but sends every visitor's IP to Google. Self-hosted OFL fonts keep full privacy with full drama; a system font stack needs no loading at all but limits the drama.

**Recommended default:** Self-hosted open-licensed (OFL) fonts for display type, system stack as fallback. Never hotlink a third-party font CDN on a customer projection.

**On default vs alternative:** On the default, full typographic drama with zero licensing risk and zero visitor tracking. On the alternative (Google hotlink), simpler to build, but every customer site leaks visitor IPs to Google.

**Cost of being wrong:** A hotlink decision bakes third-party tracking into every site FYD generates, contradicting the privacy stance and creating a licensing and trust liability that is expensive to unwind later.

## 4. Lab discoverability: linked from the footer, or unlinked plus noindex?

**Context:** The engineering/trust lab will sit behind an Advanced/Trust/Developer surface containing digests, capability verdicts, and raw graph data. It can be linked from the visitor footer, or reachable only by direct URL and marked noindex so search engines never list it.

**Recommended default:** Unlinked plus noindex for the sprint demos.

**On default vs alternative:** On the default, the lab is yours alone; zero chance a customer or prospect stumbles into digests and capability verdicts. On the alternative (footer link), more transparent, but anyone curious lands in the engine room and could misread the product.

**Cost of being wrong:** A discoverable lab leaks internal semantics (verdicts, digests) to prospects, which is exactly the failure the sprint exists to fix; once indexed, it cannot be unseen.

## 5. What does the estimate CTA do on the demo sites?

**Context:** The sprint mission requires an obvious contact/estimate path on HPP and Coppersmith, but neither has an owner relationship, so no estimate request can reach a human. A form that submits into the void is dishonest; a dead button is a broken promise.

**Recommended default:** Real tap-to-call and contact info drawn only from evidence; estimate intent routes into Ask FYD ("ask about estimates") instead of a fake form.

**On default vs alternative:** On the default, every CTA is honest and functional, and estimate intent exercises the Ask FYD loop. On the alternative (a demo-marked form), it shows the UI pattern for the eventual owner, but it is theater.

**Cost of being wrong:** A fake form that ships in a screenshot or gets clicked teaches everyone (including future owners) that FYD invents functionality; the honesty loss exceeds the UI-pattern gain.

## 6. PING stress test: real public facts or synthetic facts?

**Context:** The sprint uses PING Social as the high-design stress test alongside the two trades. Real public facts make the output potentially shippable as your actual site; synthetic demo facts keep it a throwaway.

**Recommended default:** Real public facts only, nothing non-public.

**On default vs alternative:** On the default, the stress test is real and you might get your actual website out of the sprint. On the alternative (synthetic), safer, but the work is disposable and the stress test proves less.

**Cost of being wrong:** Synthetic facts waste the one chance to ship your real site from this work; real facts risk nothing non-public since only public facts are used, so the cost asymmetry favors real.

## 7. Analytics default on generated sites: none, privacy-preserving, or owner-added later?

**Context:** Real customer sites usually want visitor stats, and owners will ask where they are. Options: bake in privacy-preserving analytics, bake in nothing, or leave it as an explicit owner decision after handoff.

**Recommended default:** Bake in nothing. Privacy is a product value; the owner adds analytics as explicit intent.

**On default vs alternative:** On the default, FYD never tracks anyone's visitors and the product story stays clean. On the alternative (baked-in analytics), owners get stats on day one, but FYD becomes a tracking vendor by default.

**Cost of being wrong:** Baking in tracking makes FYD a surveillance vendor by default, which contradicts the "no surveillance" stance and becomes a trust liability with every privacy-aware owner.

## 8. Sprint contingency: if the sites are not passing at T+24, extend or ship the honest partial?

**Context:** The deadline is about 2026-09-27 18:55 MDT, and acceptance is your pride plus the factual, privacy, security, and determinism gates. If the sites are not passing at T+24, I need to know now whether you want more time or the honest current state.

**Recommended default:** Ship the honest partial at T+24 (URLs, screenshots, five improvements, and a clear list of what failed). A deadline that moves is not a deadline.

**On default vs alternative:** On the default, you get a truthful snapshot on time and we plan the next push from reality. On the alternative (extend), the sprint continues until it passes, but the 24-hour commitment slips.

**Cost of being wrong:** Extending burns tired lanes on worse decisions and teaches the system that deadlines are soft; shipping a partial that you mistake for a promise could cost trust, which is why the partial must be labeled as partial.

## 9. ORCA inventory dead code: who authorizes deletion?

**Context:** The convergence track's Phase 0 read-only inventory will classify dead orchestrators and retired harnesses. Deletion is recoverable through git, but it is still destructive across shared history.

**Recommended default:** The track may delete freely inside its own worktrees and branches (git preserves everything); nothing reaches a shared branch without normal merge review, and nothing reaches main without your word.

**On default vs alternative:** On the default, the track moves fast without risking shared history. On the alternative (per-item approval), cleaner conscience for the tree but decision fatigue for you on every dead file.

**Cost of being wrong:** Deleting on shared branches without review could destroy history someone depends on; requiring your approval for every file stalls the track on trivia.

## 10. Reaper versus HOLD: does the reaper reset HOLD missions?

**Context:** Flagged in AGENTS.md as needing your call. After a HOLD record, the mission sits in _processing, the lease expires, and the reaper resets it to created, which re-dispatches about 60 seconds later. That is an automatic retry of a mission whose outcome is explicitly UNKNOWN.

**Recommended default:** HOLD must pin the mission (no reaper reset). Resumption is explicit, never automatic, after unknown outcomes.

**On default vs alternative:** On the default, no silent duplicate side effects; the "worker disappeared after the side effect" case stays prevented. On the alternative (keep auto-retry), faster recovery from stalls, but an unknown-outcome mission can execute side effects twice.

**Cost of being wrong:** Auto-retry after UNKNOWN is the one failure mode that double-executes side effects (double outreach, double sends); pinning costs at most a manual resume.

## 11. Where does HPP's media-management machinery resurface?

**Context:** You directed that the media-management machinery be preserved and eventually brought back, while the sprint focuses on the consumer site. The owner commands ("use this picture as the hero," "use my logo here") need a media picker to be real rather than chat-only.

**Recommended default:** Inside the owner experience (Customize with FYD opens the media manager when a command needs it), not in the lab.

**On default vs alternative:** On the default, conversational commands stay usable for real owners and the preserved machinery earns its keep. On the alternative (lab only), the machinery survives but the people who need it cannot reach it.

**Cost of being wrong:** Lab-only placement strands the machinery where owners never go, so the owner commands stay half-real and the preservation work was wasted.

## 12. Factual data corrections during the sprint: fix or freeze?

**Context:** T+2 found factually wrong graph data with visible consequences (the wrong service taxonomy, an invented "LLC," duplicated About copy). The sprint is about projection quality, but the T+24 demo would otherwise assert false claims about real businesses.

**Recommended default:** Lanes may correct narrowly-cited factual errors from source evidence (the taxonomy, the LLC). Judgment calls stay in the owner loop.

**On default vs alternative:** On the default, the demo stops asserting false things and the truth gates pass on real facts. On the alternative (freeze all data), the projection is judged on known falsehoods.

**Cost of being wrong:** Freezing means the T+24 demo asserts false claims about real businesses in screenshots you might share; over-correcting means lanes rewrite data on judgment calls, which is why corrections stay narrowly-cited.

## 13. ping-mark.png: approve as the working logo or keep evaluating?

**Context:** The medallion derivative exists as a candidate. Workstream A will build the PING hero around it as the logo mark, and the sprint treats the logo as presentation (swappable), not identity.

**Recommended default:** Approve it as the working logo mark for the sprint. Swapping later is cheap because it is presentation, not identity.

**On default vs alternative:** On the default, the hero lane builds on a decided mark instead of hedging. On the alternative (still evaluating), the hero uses the full artwork with no mark and the logo decision waits.

**Cost of being wrong:** Approving a mark you dislike costs a cheap swap later; refusing to decide costs the hero lane a full day of hedging.

## 14. /build cutover after T+24: automatic or pinned to the old projection?

**Context:** /build (P-01's URL-to-site compiler) shares the renderer, so the new projection flows into it automatically on the next :3100 build. The old projection could be kept as a fallback behind a flag.

**Recommended default:** Cut over automatically (the new projection IS the product; lane 16 proves it end to end). Keep the old code reachable in git but not served.

**On default vs alternative:** On the default, one system and no fork, and the new projection gets real use immediately. On the alternative (pin /build to the old projection), a safety net, but two systems to maintain and the new one never gets exercised.

**Cost of being wrong:** Auto-cutover on a flawed projection ships flaws to every /build user; pinning preserves a dead-end fork that splits maintenance and delays real-world proof.

## 15. Near-empty graph: refuse with a checklist or generate a fallback?

**Context:** One click plus a near-empty graph (a name and a phone number, nothing else). Options: always generate something (a designed fallback), or refuse with a checklist of what is missing.

**Recommended default:** Refuse with a checklist ("I need services, a service area, and one way to contact you to build this honestly"). It drives acquisition and never ships a thin fake site.

**On default vs alternative:** On the default, honesty becomes a feature and the refusal tells the owner exactly how to get a real site. On the alternative (always generate), every click produces a site, but thin ones embarrass the product.

**Cost of being wrong:** Always-generate teaches owners that FYD invents content, which destroys the honesty story; refusing costs a click that was never going to produce a good site anyway.

## 16. Production owner auth: roadmap item or deferred?

**Context:** FYD-010 found no production verified owner-auth provider, so owner mode stays demo-only and visitor-safe. The owner experience cannot be a real product without verified owner identity.

**Recommended default:** Yes, a post-sprint roadmap item, with DNS TXT domain claim as primary and Google OAuth as an optional connector (per your batch-2 lock).

**On default vs alternative:** On the default, the owner experience has a path to production instead of being a permanent demo. On the alternative (defer), FYD stays demo-only until a real customer forces the issue.

**Cost of being wrong:** Deferring leaves the owner experience without a trust story when the first real owner arrives; committing now spends post-sprint planning on auth before the product is proven.

## 17. Lab versus Mission Control: separate surfaces or converged?

**Context:** The design sprint builds a per-site engineering/trust lab; the ORCA track builds Mission Control as the operator surface for missions. They overlap (events, evidence, digests, replays), and convergence pressure will push toward merging them.

**Recommended default:** Separate surfaces with cross-links (the lab is site truth, Mission Control is mission truth; the lab links "view in Mission Control" for the generating mission).

**On default vs alternative:** On the default, each surface serves its user cleanly. On the alternative (merge), one surface that serves neither the debugging developer nor the operating owner well, and the sprint's lab work gets pulled into MC scope debates.

**Cost of being wrong:** Merging creates a surface that serves nobody well and drags the sprint into convergence architecture; separating risks some duplication, which cross-links mitigate.

## 18. Category norms as weak compositional priors?

**Context:** When the graph is thin on character signals, the composition can use trade-category norms as weak priors (a plumber leads with emergency service; a remodeler leads with a portfolio), or every choice must trace to the business's own evidence.

**Recommended default:** Allow weak priors, always overridable by the business's own evidence and by owner intent.

**On default vs alternative:** On the default, sites feel like they understand the trade even when the graph is thin. On the alternative (evidence-only), no stereotyping ever, but thin graphs produce bland sites.

**Cost of being wrong:** Priors can stereotype a business that breaks the mold (the evidence override is the safeguard); evidence-only can produce sites so bland they fail the pride test.

## 19. PING: same grammar or bespoke design?

**Context:** PING is a product/AI site, not a trade site. The composition grammar is being built for tradesmen, and PING is the stress test that proves range.

**Recommended default:** Same grammar, different compositional choices. If PING needs a one-off design, the grammar failed its own test.

**On default vs alternative:** On the default, one system with proven range, and PING's site is evidence the grammar generalizes. On the alternative (bespoke PING), possibly a better PING site tonight, but the grammar is proven only on trades.

**Cost of being wrong:** Bespoke wastes the stress test and leaves the grammar unproven on non-trade sites; same-grammar risks a weaker PING site if the grammar truly cannot stretch, which is itself valuable evidence.

## 20. T+24 one-click: frozen graph or fresh re-acquisition?

**Context:** "Take the same pipeline and generate" could mean re-crawling the live web (tests acquisition too) or regenerating from the frozen graph (tests the generator). The known taxonomy bug sits in the acquisition layer.

**Recommended default:** Frozen graph. The sprint is about projection quality; re-acquisition introduces uncontrolled variables, and the known taxonomy bug would confound the proof.

**On default vs alternative:** On the default, a clean test of the generator on known inputs. On the alternative (re-acquire), a stronger end-to-end test, but a crawl failure or taxonomy artifact could mask a good projection.

**Cost of being wrong:** Re-acquiring lets an acquisition flake or the known taxonomy bug fail the demo for reasons that are not the projection's fault; frozen graph means the acquisition layer goes untested at T+24.

## 21. Ask FYD on the T+24 demo sites: live, or visitor-projection only?

**Context:** The sprint defines three experiences (visitor, owner, lab), and Workstream B preserves Ask FYD loop-quality work in parallel. The mission does not say whether Ask FYD is live on the T+24 demo sites. A half-integrated Ask FYD could distract from the projection judgment.

**Recommended default:** Visitor-projection only for the T+24 judgment; Ask FYD stays on its own track and joins the demo when its loop work lands.

**On default vs alternative:** On the default, the T+24 judgment stays clean and focused on the projection, with no half-built conversational layer to explain. On the alternative (Ask FYD live), the demo shows the full loop, but any ask-loop rough edge becomes part of what you are judging.

**Cost of being wrong:** Including a rough Ask FYD lets loop issues contaminate the projection verdict; excluding it means the T+24 demo does not prove the loop, which was never the sprint's acceptance bar.

## 22. Public Vercel demo: refresh after T+24 on your word, or auto-refresh?

**Context:** happy-place-platform.vercel.app is the portfolio proof you cite in revamp pitches. If the sprint produces a better HPP, the public demo goes stale. Updating it is publication, which is your call.

**Recommended default:** Refresh only on your explicit word after T+24.

**On default vs alternative:** On the default, the sales asset never ships unjudged work. On the alternative (auto-refresh), the demo is always current, but it could update while you are mid-pitch.

**Cost of being wrong:** Auto-refresh could put an unjudged build in front of a prospect mid-pitch; manual refresh risks a stale demo, which costs nothing since the current demo already works.

## 23. Lab: read-only, or with action buttons?

**Context:** The lab preserves replay, transition state, and raw graph. It could be a pure inspection surface, or expose actions (re-run, re-verify, regenerate).

**Recommended default:** Read-only, with "open in Mission Control" for actions. The lab stays a safe inspection surface; consequential actions live where the capability system watches them.

**On default vs alternative:** On the default, you can look without risk of a mis-click. On the alternative (actions in the lab), handier, but a mis-click runs consequential work outside the approval flow.

**Cost of being wrong:** Action buttons in the lab let a mis-click trigger consequential work outside the capability system's watch; read-only costs one extra click to reach Mission Control.

## 24. Visitor spots an error: route it to the owner, or dead-end?

**Context:** A visitor notices wrong hours or a wrong phone number. Options: the report dies with the visitor, or FYD captures it as an unverified suggestion for the owner (never auto-applied).

**Recommended default:** Capture as an unverified owner suggestion, with abuse controls (rate-limited, never auto-applied, owner reviews before anything changes).

**On default vs alternative:** On the default, the site gets better from real-world eyes and the owner stays in control. On the alternative (no routing), simpler and zero abuse surface, but corrections only come from the owner noticing.

**Cost of being wrong:** No routing leaves false facts live indefinitely; routing without strong abuse controls invites spam into the owner's inbox, which is why the controls are part of the default.

## 25. JSON-LD on generated sites: emit or omit?

**Context:** Acquisition reads JSON-LD, and the renderer could write it (good for SEO and machine-readable facts). It is another surface that must stay truthful and must mirror the visible page exactly.

**Recommended default:** Emit JSON-LD mirroring exactly the visible facts, nothing more.

**On default vs alternative:** On the default, better search presence for free, with honesty enforced by construction. On the alternative (omit), one less surface to keep honest, but SEO starts from zero.

**Cost of being wrong:** Emitting JSON-LD that drifts from the visible page creates a machine-readable lie (worse than no data); omitting leaves search visibility on the table.

## 26. Maps: embed a map, or list towns?

**Context:** A map proves "local." A Google Maps embed means visitor tracking by Google plus an API key (whose key, who pays, whose quota). A town and service-area list from evidence proves local without either.

**Recommended default:** Town and service-area list from evidence; no third-party map embed in v1.

**On default vs alternative:** On the default, no tracking, no key management, no quota to babysit. On the alternative (embed), stronger local proof, but Google sees every visitor and the key becomes an operational dependency.

**Cost of being wrong:** An embed bakes Google tracking and a key dependency into every site; a town list is weaker visual proof of "local" but costs nothing and leaks nothing.

## 27. Demo gating: is Tailscale enough, or token gate now?

**Context:** The T+24 demo runs with demo-owner mode ON (anyone on your tailnet can customize) and the lab unguarded. Tailscale is private, but it is a network boundary, not a login.

**Recommended default:** Tailscale is sufficient for the sprint demo; a proper gate lands if the lab outlives the demo.

**On default vs alternative:** On the default, zero friction for your testing tonight. On the alternative (token gate now), safer against a tailnet-compromise scenario, but another thing to build tonight, stealing a lane from visitor work.

**Cost of being wrong:** A tailnet compromise with demo-owner mode on lets an intruder customize demo sites (embarrassing, not destructive); building a token gate tonight steals visitor-work hours for a threat that has not materialized.

## 28. The Circle goal: park it, close it, or keep it parallel?

**Context:** The fyd-social-product-build goal (businesses as tiny circular projections) has been idle since 9/21 and predates the website-quality pivot. The sprint is building full websites, not circles, and the goal's premise is now in tension with the current product direction.

**Recommended default:** Park it (keep the thinking, no active work) until the website product is proven.

**On default vs alternative:** On the default, no stale goal pretends to be active, and the idea survives if the website product later wants a compact projection. On the alternative (keep parallel), a second product thread splits focus during the sprint. (Close it outright only if you consider the circle idea dead.)

**Cost of being wrong:** Parking a live idea loses momentum; keeping it parallel splits the sprint; closing it destroys thinking that might be valuable later.

## 29. Bank the win or keep pushing, if the sites pass early?

**Context:** If the sites pass your owner-pride test before T+24, the loop could stop and harden, or keep pushing for a better result with the remaining hours.

**Recommended default:** Bank the win; use remaining time only for hardening and gates. Do not risk a good result chasing a better one at 02:00.

**On default vs alternative:** On the default, the T+24 proof is stable and rested-on. On the alternative (keep pushing), possible upside, but real risk of breaking something good in the small hours with nobody fresh to catch it.

**Cost of being wrong:** Pushing past a passing result risks breaking it at 02:00 with no fresh eyes; banking early leaves potential improvements on the table, which the hardening time partially recovers.

## 30. Grammar versioning: pin at generation, or auto-update sites?

**Context:** The determinism law already versions the renderer. When the grammar improves, existing generated sites could auto-update to the new grammar or stay pinned to the version that generated them.

**Recommended default:** Pin at generation; updates are owner-approved through the proposal flow.

**On default vs alternative:** On the default, no site ever changes without its owner's say, which is the trust story. On the alternative (auto-update), sites keep improving silently, but a business could wake up to a stranger.

**Cost of being wrong:** Auto-update means a grammar regression hits every live site at once and owners lose control of their presence; pinning means sites go stale, which the owner-approved update flow addresses.

## 31. Re-observation cadence: on-request, or scheduled?

**Context:** Mission Control's first mission was "re-observe this owned website, tell me what changed." The cadence shapes the scheduler the ORCA track is building: on owner request, or on a schedule.

**Recommended default:** On owner request, plus change alerts (FYD notices a change, the owner decides what to do). Never silent auto-regeneration of a live site.

**On default vs alternative:** On the default, owners stay in control of their live presence. On the alternative (scheduled), fresher sites, but surprise diffs, wasted crawls, and the risk of regenerating a site the owner was happy with.

**Cost of being wrong:** Scheduled re-observation can surprise an owner with a changed live site; on-request can let a site go stale, which the change alerts mitigate.

## 32. Lab polish: functional-raw, or designed?

**Context:** The 24 hours are for the visitor. The lab could stay functional-raw (your tool, built fast) or get design attention (lanes, hours).

**Recommended default:** Functional-raw. It is your tool; every lane-hour spent on the lab is stolen from the visitor.

**On default vs alternative:** On the default, the sprint stays focused where the judgment happens. On the alternative (polish the lab), nicer for you to use, weaker visitor result.

**Cost of being wrong:** Polishing the lab spends the scarcest resource (lane-hours) on the surface you judge least; raw is ugly but the visitor never sees it.

## 33. Lab audience: you-only, or technical owners too?

**Context:** The pivot puts the lab behind Advanced/Trust/Developer. A technical owner might genuinely want it, but its rawness could confuse a non-technical one, and support burden follows access.

**Recommended default:** You and developers only, for now. Owners get Customize plus the quiet Source disclosures on the visitor site.

**On default vs alternative:** On the default, no confused owners and no support burden during the sprint. On the alternative (open to technical owners), real transparency, plus the cost of explaining digests and capability verdicts to customers.

**Cost of being wrong:** Opening the lab to owners invites support load and misreadings of internal data; keeping it closed withholds transparency that technical owners would value.

## 34. Empty media slots on customer sites: intentional empty frame, or omit the slot?

**Context:** Nolan's new PING media-slot rule says to leave the intentional media frame empty rather than filling it with generic AI art. But the sprint's composition root cause says absent data means omit or recompose, never empty ugly components. For HPP and Coppersmith, when no legitimate media exists for a slot, these two directives point in different directions.

**Recommended default:** Omit or recompose for customer sites (follow the composition rule); the intentional empty frame is a PING-specific treatment for a site Nolan controls. An empty frame on a customer's site looks broken to their visitors.

**On default vs alternative:** On the default, customer sites never show broken-looking empty frames; the composition adapts to available media. On the alternative (intentional empty frame everywhere), visual consistency with the PING rule, but a customer's visitors see empty boxes.

**Cost of being wrong:** Empty frames on customer sites look like bugs to visitors and fail the pride test; omitting risks under-decorated pages, which the composition rules mitigate by recomposing.

## 35. Lab on your phone: required, or desktop-only?

**Context:** You judge from your phone, and the lab is the surface you would use to verify a suspicious claim or check provenance. Making it phone-usable costs lane-12 effort tonight.

**Recommended default:** Yes, phone-usable. If you cannot verify from the couch, the lab fails its purpose.

**On default vs alternative:** On the default, you can inspect evidence anywhere, which is when you will actually use it. On the alternative (desktop-only), cheaper tonight, but the lab is out of reach exactly when you are mobile and curious.

**Cost of being wrong:** Desktop-only means the verification surface is unavailable in the moments you want it; phone-usable spends lane-12 hours that could go to the visitor.

## 36. "Powered by FYD": plain text, or a link?

**Context:** The subtle neutral footer attribution is locked from batch 3. Whether it links (and where it points) is open: a link builds FYD's brand, but it also sends the business's visitors elsewhere.

**Recommended default:** Plain text, no link. The business's site should not donate its visitors; FYD's brand builds through owners, not through clicks siphoned from customer sites.

**On default vs alternative:** On the default, clean, and the attribution never competes with the business. On the alternative (link to the PING site), brand impressions at the cost of visitor leakage from every customer site, forever.

**Cost of being wrong:** A link siphons every customer site's visitors to FYD forever, which owners will eventually notice and resent; plain text forgoes brand impressions that were never the product's job to generate.

## 37. T+24 delivery order: proof first, or improvements first?

**Context:** You asked for the URLs, the screenshots, and the five biggest improvements. If the improvements come first, they frame (and bias) your viewing; if they come last, you judge fresh and the list becomes accountability afterward.

**Recommended default:** URLs and screenshots first, the five improvements after. Your unframed judgment is the gate; my list is the accountability.

**On default vs alternative:** On the default, a clean read, and the improvements list has to survive contact with your actual viewing. On the alternative (improvements first), you get context up front, but you see my framing before the sites.

**Cost of being wrong:** Framing first biases your judgment and lets my list grade itself; proof first risks you missing context, which the improvements list then supplies.

---

Classifier note: every question above was run through the grill-20 classifier before reaching you. Each failed at least one check: unresolved product intent, subjective judgment, external contact or authorization, publication or spend, irreversible or uncertain effects, new credential authority, or owner authority. The full per-question analysis is filed in the SI-03 escalation log.