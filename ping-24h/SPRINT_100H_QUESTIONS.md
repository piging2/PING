# 100-HOUR SPRINT: 40 HIGH-LEVERAGE QUESTIONS

Prepared 2026-09-28/29 for Nolan. These are consequential uncertainties NOT
recently covered: nothing here re-asks terminal-first approval semantics,
the Puck role, the Happy Place + Coppersmith controlled pair, Codex
dormancy, Jev shadow posture, the Copilot four-identity pool, the no-new-spend
rule, the stopped customer pursuit, the SitePatch[] contract, undo-as-transition,
demo owner mode, the binding verifier, or the RECORD LOSS policy. All of those
are decided and stay decided.

Format per question: RECOMMENDED DEFAULT (taken unless you say otherwise),
WHY OWNER DECISION IS REQUIRED, COST OF DEFAULT BEING WRONG, DEADLINE,
WHAT CONTINUES WITHOUT THE ANSWER, CLASS.

## PRODUCT

### Q3: When does the 100-hour clock start, and what single measurable outcome ends it?
- RECOMMENDED DEFAULT: Clock starts when you say GO. The sprint ends when you complete, unassisted, on your phone: object navigation -> Ask FYD with evidence -> a correction -> a customization by conversation AND by direct manipulation -> approve/reject -> undo -> refresh, on BOTH sites, with every step bound to source HEAD + build digest + served bytes.
- WHY OWNER DECISION IS REQUIRED: no start time was specified; without a pinned start and a one-sentence exit gate, 100 hours becomes motion instead of proof.
- COST OF DEFAULT BEING WRONG: the sprint optimizes for green tests instead of your hands on the product.
- DEADLINE: before the first sprint hour is spent.
- WHAT CONTINUES WITHOUT THE ANSWER: preparation continues on the default; nothing is called "done" until you run the exit gate yourself.
- CLASS: PRODUCT BLOCKER

### Q4: Is the sprint's exit gate your own unassisted phone test, or is served-byte verification sufficient?
- RECOMMENDED DEFAULT: your phone is the courtroom. Served-byte verification is necessary but not sufficient; the standing verdict on TRADESMAN(HPP) was a screenshot failure, not a test failure.
- WHY OWNER DECISION IS REQUIRED: it decides whether engineering declares victory or you do.
- COST OF DEFAULT BEING WRONG: we ship harness artifacts into the public page again and only learn it from your screenshot.
- DEADLINE: with Q3.
- WHAT CONTINUES WITHOUT THE ANSWER: both bars apply (served-byte binding AND your phone test); nothing is certified on tests alone.
- CLASS: PRODUCT BLOCKER

### Q5: Any public-facing milestone inside the 100 hours, or strictly private test surface?
- RECOMMENDED DEFAULT: strictly private. Both sites stay Tailscale-only; no public URL, no shareable link, no indexable surface.
- WHY OWNER DECISION IS REQUIRED: a public step changes the security, polish, and liability bar for everything built.
- COST OF DEFAULT BEING WRONG: premature exposure of demo-mode or fixture data as if it were a real business presence.
- DEADLINE: before the two-site surface goes live.
- WHAT CONTINUES WITHOUT THE ANSWER: private-only; any public step needs your explicit word.
- CLASS: SECURITY

### Q6: Is cold ingestion (URL -> credible presence) in scope for the sprint, or are the two sites hand-seeded fixtures?
- RECOMMENDED DEFAULT: hand-seeded fixtures first; cold ingestion is a separate falsification track. The sprint proves the owner loop (correct -> customize -> keeps current), not the crawler.
- WHY OWNER DECISION IS REQUIRED: ingestion quality is the biggest known risk (your 2026-09-22 note: cold real URLs first); mixing it into the sprint muddies what is being proven.
- COST OF DEFAULT BEING WRONG: sprint time burns on crawler tuning while the owner loop stays unproven.
- DEADLINE: sprint kickoff.
- WHAT CONTINUES WITHOUT THE ANSWER: fixtures; ingestion improvements land only if they do not disturb the owner-loop proof.
- CLASS: PRODUCT BLOCKER

### Q7: Single multi-tenant renderer (hostname -> TenantResolver -> published SiteSpec) vs the current per-tree dev servers: which serves the sprint's two sites?
- RECOMMENDED DEFAULT: keep the current dev-server path for the sprint; build the TenantResolver-backed single renderer only if the two-site proof needs it. Do not re-platform mid-sprint.
- WHY OWNER DECISION IS REQUIRED: the 2026-09-22 decision names the multi-tenant renderer as the target; the sprint must not silently fork the serving architecture.
- COST OF DEFAULT BEING WRONG: two serving architectures to maintain, and the sprint proof does not transfer.
- DEADLINE: before site 2 is exposed.
- WHAT CONTINUES WITHOUT THE ANSWER: current dev-server path; the TenantResolver design is documented as the migration target, not built speculatively.
- CLASS: TECH DEBT

### Q8: What numeric performance budget gates the sprint?
- RECOMMENDED DEFAULT: LCP under 2.5s on your phone over tailnet, total blocking time under 200ms, no layout shift on section reorder. If a budget is missed, the sprint records it as a named P0 rather than silently passing.
- WHY OWNER DECISION IS REQUIRED: "performance" is a named sprint metric but has no number; without one it is not a gate.
- COST OF DEFAULT BEING WRONG: a sluggish owner surface that technically works but no owner would tolerate.
- DEADLINE: before the exit gate run.
- WHAT CONTINUES WITHOUT THE ANSWER: the default numbers above apply; misses are recorded, not hidden.
- CLASS: PRODUCT BLOCKER

### Q9: What is the contact-discoverability spec for both sites?
- RECOMMENDED DEFAULT: tap-to-call phone, tap-to-text, hours, and map/directions reachable within two taps from any page, on mobile, with the numbers bound to object fields (not hardcoded copy).
- WHY OWNER DECISION IS REQUIRED: contact discoverability is a named sprint metric; the exact elements and their evidence binding are a product call.
- COST OF DEFAULT BEING WRONG: a beautiful site that does not convert a visitor into a call.
- DEADLINE: before the exit gate run.
- WHAT CONTINUES WITHOUT THE ANSWER: the default spec above; gaps are recorded as product blockers.
- CLASS: PRODUCT BLOCKER

### Q10: Service discoverability: what must a visitor find, and how fast?
- RECOMMENDED DEFAULT: the full service list and the top service detail within 10 seconds of landing, on mobile, without searching.
- WHY OWNER DECISION IS REQUIRED: same as Q9, it is a named metric without a concrete bar.
- COST OF DEFAULT BEING WRONG: visitors bounce before finding what the business sells.
- DEADLINE: before the exit gate run.
- WHAT CONTINUES WITHOUT THE ANSWER: the default bar; misses recorded.
- CLASS: PRODUCT BLOCKER

### Q11: FYD Social product build and PING website build goals: paused during the 100 hours, or running in parallel?
- RECOMMENDED DEFAULT: paused. The 100 hours are a single-product sprint; parallel goals split the machine and your attention.
- WHY OWNER DECISION IS REQUIRED: both goals currently show attention states; leaving them ambiguous invites scope bleed.
- COST OF DEFAULT BEING WRONG: the sprint's proof gets diluted across three products.
- DEADLINE: sprint kickoff.
- WHAT CONTINUES WITHOUT THE ANSWER: paused; they resume after the exit gate.
- CLASS: PRODUCT BLOCKER

### Q12: After the sprint: do the two sites keep running as durable fixtures, or is the sprint surface throwaway?
- RECOMMENDED DEFAULT: durable fixtures. The two sites and their version histories persist as the regression surface for every future change.
- WHY OWNER DECISION IS REQUIRED: throwaway vs durable decides how much versioning, data hygiene, and uptime discipline the sprint invests.
- COST OF DEFAULT BEING WRONG: the sprint's proof evaporates and the next change has no baseline to regress against.
- DEADLINE: sprint kickoff.
- WHAT CONTINUES WITHOUT THE ANSWER: durable; histories are kept.
- CLASS: TECH DEBT

## ARCHITECTURE

### Q13: Regeneration mechanics: what exactly must "owner correction survives regeneration" preserve?
- RECOMMENDED DEFAULT: regeneration replays from the pinned SiteSpec version plus the append-only owner-override layer; an owner correction is never silently dropped and never rewritten by a fresh crawl. The proof is byte-level: pre/post regeneration served bytes identical for owner-touched sections.
- WHY OWNER DECISION IS REQUIRED: this is the load-bearing product promise (FYD KEEPS IT CURRENT); its mechanics are still unproven on the live surface.
- COST OF DEFAULT BEING WRONG: owners learn their corrections vanish and stop trusting the product.
- DEADLINE: before the regeneration proof runs.
- WHAT CONTINUES WITHOUT THE ANSWER: the default mechanics; any weaker behavior is a FAIL, not a caveat.
- CLASS: CORRECTNESS

### Q14: Source-vs-owner conflict: when fresh evidence contradicts an owner correction, what does the owner see and who wins on the rendered page?
- RECOMMENDED DEFAULT: the owner correction wins on the rendered page (owner authority over presentation); the conflict surfaces to the owner as a visible flag with both values and the evidence link, and the owner resolves it explicitly. Source observations are never rewritten.
- WHY OWNER DECISION IS REQUIRED: the standing rule says corrections never rewrite source observations, but it does not say what the visitor sees during a conflict.
- COST OF DEFAULT BEING WRONG: silent flip-flopping between crawler truth and owner truth, which destroys trust in both.
- DEADLINE: before the conflict path is built (it is demanded architecture, not optional).
- WHAT CONTINUES WITHOUT THE ANSWER: the default; conflicts are flagged, never silent.
- CLASS: CORRECTNESS

### Q15: OWNER_ASSERTED facts: what validation before an unevidenced owner claim renders as fact vs labeled generated copy?
- RECOMMENDED DEFAULT: an owner assertion without evidence renders with the OWNER_ASSERTED classification visible in WHY THIS, never silently as DIRECT_EVIDENCE. It may render as a fact on the page (owner authority), but its provenance is one tap away.
- WHY OWNER DECISION IS REQUIRED: the factual classification system exists; its product rendering for owner assertions is undecided.
- COST OF DEFAULT BEING WRONG: the site launders unverified claims as established fact, which is exactly the failure mode the evidence system exists to prevent.
- DEADLINE: before owner assertions go live on either site.
- WHAT CONTINUES WITHOUT THE ANSWER: the default; provenance stays one tap away.
- CLASS: CORRECTNESS

### Q16: Ask FYD refusal UX: when the graph cannot support a claim, what does the product show and what path does it offer the owner?
- RECOMMENDED DEFAULT: a plain refusal with the reason (no supporting evidence found), plus an explicit path: "assert this as owner" (recorded as OWNER_ASSERTED) or "point me at evidence." Never a hedged hallucination.
- WHY OWNER DECISION IS REQUIRED: evidence-bounded refusal is decided; its product shape is not, and a bad refusal UX trains owners to distrust Ask FYD.
- COST OF DEFAULT BEING WRONG: refusals feel like brokenness, or worse, the model softens into unsupported claims.
- DEADLINE: before Ask FYD goes live on the surface.
- WHAT CONTINUES WITHOUT THE ANSWER: the default refusal shape.
- CLASS: PRODUCT BLOCKER

### Q17: Empty or wrong object graph: omit the section, show a placeholder, or block publish?
- RECOMMENDED DEFAULT: omit the section from the visitor page and flag it to the owner as missing evidence. Never render a placeholder as if it were content; never block the whole publish on one weak section.
- WHY OWNER DECISION IS REQUIRED: it sets the failure posture of the renderer, and "fact vs visibility are separate" needs a concrete rendering rule.
- COST OF DEFAULT BEING WRONG: placeholder junk on a business's public presence, or a single bad section holding the whole site hostage.
- DEADLINE: before the renderer proof.
- WHAT CONTINUES WITHOUT THE ANSWER: omit + flag to owner.
- CLASS: CORRECTNESS

### Q18: Draft vs published: does the sprint need a publish gate, and who can publish?
- RECOMMENDED DEFAULT: yes, draft/published distinction. Owner edits land as drafts (proposals through the approval door); publishing is an explicit owner action that pins a SiteSpec version. In demo mode, the demo owner can publish freely; the mode banner is always visible.
- WHY OWNER DECISION IS REQUIRED: without a publish gate, every keystroke is public, and the approval door has nothing to guard.
- COST OF DEFAULT BEING WRONG: half-finished owner experiments render to visitors.
- DEADLINE: before the approve/reject surface goes live.
- WHAT CONTINUES WITHOUT THE ANSWER: the default draft/publish split.
- CLASS: PRODUCT BLOCKER

### Q19: Version retention: append-only forever, or a pruning policy?
- RECOMMENDED DEFAULT: append-only for the sprint (no pruning). Revisit with a real retention policy only when storage or performance forces it, with your explicit word.
- WHY OWNER DECISION IS REQUIRED: append-only is the locked undo/versioning model; unbounded growth is its known cost.
- COST OF DEFAULT BEING WRONG: premature pruning destroys the audit trail the product promise depends on.
- DEADLINE: none urgent; decide only if growth becomes a problem.
- WHAT CONTINUES WITHOUT THE ANSWER: append-only; no silent pruning.
- CLASS: TECH DEBT

### Q20: Concurrent editors: two owners, same site, conflicting patches — last-writer-wins with conflict UI, or serialized proposals?
- RECOMMENDED DEFAULT: serialized proposals through the approval door; a conflicting patch against a stale base returns STALE_SUPERSEDED while pending (per the ratified semantics), and the second owner sees the conflict with both versions. No silent last-writer-wins.
- WHY OWNER DECISION IS REQUIRED: the terminal-first semantics cover pending vs terminal; the product behavior for two live editors is still open.
- COST OF DEFAULT BEING WRONG: one owner's work silently vanishes.
- DEADLINE: before any second editor touches a site.
- WHAT CONTINUES WITHOUT THE ANSWER: serialized proposals; conflicts are visible.
- CLASS: CORRECTNESS

### Q21: Restore semantics: can an owner jump back to a much older version directly, and does that require re-approval?
- RECOMMENDED DEFAULT: yes, restore-to-version is allowed, and it is a new authorized transition (a proposal like any other), subject to the same approve path. It never rewrites history; it appends a transition whose desired result equals the prior version.
- WHY OWNER DECISION IS REQUIRED: undo-as-transition is decided; long-range restore is its generalization and needs the same explicit rule.
- COST OF DEFAULT BEING WRONG: a "restore" that secretly mutates history, breaking the audit trail.
- DEADLINE: before the version/history UI goes live.
- WHAT CONTINUES WITHOUT THE ANSWER: restore = new authorized transition, approval required.
- CLASS: CORRECTNESS

### Q22: Tenant boundary on the shared backend: is TenantResolver proven or assumed, and what test proves isolation?
- RECOMMENDED DEFAULT: assumed until proven. The sprint must include a concrete isolation test: tenant A's owner actions and data are unreachable from tenant B's session at every read/write/capability boundary, verified by automated test, not by code inspection.
- WHY OWNER DECISION IS REQUIRED: tenancy is the locked model (customer data belongs to the tenant); the mechanism on the shared backend is unverified.
- COST OF DEFAULT BEING WRONG: cross-tenant data leakage on a system that will hold real business data.
- DEADLINE: before any real (non-demo) data enters the backend.
- WHAT CONTINUES WITHOUT THE ANSWER: demo data only, and the isolation test is a P0 before real data.
- CLASS: SECURITY

### Q23: Demo-mode data: does it persist, and what prevents it leaking into real tenant state?
- RECOMMENDED DEFAULT: demo actions persist within the demo tenant only, namespaced and labeled; a hard boundary (separate tenant id, never the real tenant id) prevents leakage. Demo data is purgeable in one operation.
- WHY OWNER DECISION IS REQUIRED: demo owner mode is the sprint's test harness; its data hygiene decides whether the harness can ever touch real state.
- COST OF DEFAULT BEING WRONG: demo edits polluting a real business presence.
- DEADLINE: before demo mode goes live.
- WHAT CONTINUES WITHOUT THE ANSWER: the default namespacing; no demo write may address a real tenant id.
- CLASS: SECURITY

## TESTABILITY

### Q24: Is the 195-test floor rerun part of the sprint's done criteria after every live change?
- RECOMMENDED DEFAULT: yes. The floor was not rerun after the last round of live changes; the sprint re-establishes it as a gate: no surface change is called proven until the floor is green on the served tree.
- WHY OWNER DECISION IS REQUIRED: the floor exists but its enforcement lapsed; reinstating it as a gate is a policy call.
- COST OF DEFAULT BEING WRONG: live changes silently regress the floor and nobody notices until a customer does.
- DEADLINE: sprint kickoff.
- WHAT CONTINUES WITHOUT THE ANSWER: the floor reruns after every live change; red floor blocks certification.
- CLASS: CORRECTNESS

### Q25: Semantic render-model determinism: what is the exact assertion?
- RECOMMENDED DEFAULT: same SiteSpec version + same object graph + same owner overrides => byte-identical semantic render model (the structured model the renderer consumes), regardless of machine, run, or ordering. Framework HTML bytes are explicitly excluded from the assertion.
- WHY OWNER DECISION IS REQUIRED: determinism is a product guarantee; without the exact assertion it cannot be tested.
- COST OF DEFAULT BEING WRONG: nondeterminism hides in ordering or timestamps and breaks replay trust.
- DEADLINE: before the determinism test is written.
- WHAT CONTINUES WITHOUT THE ANSWER: the default assertion; violations are P0.
- CLASS: CORRECTNESS

### Q26: What falsifies "trusted understanding" — is there a cold-comprehension test in the sprint?
- RECOMMENDED DEFAULT: yes, a small falsification panel: N cold businesses (not the two fixtures), FYD generates presence from public evidence only, and you grade accuracy claim-by-claim against the evidence. A fabricated or misattributed fact is a recorded FAIL, not a tweak.
- WHY OWNER DECISION IS REQUIRED: trusted understanding is the fifth named metric; without a falsification test it is a slogan.
- COST OF DEFAULT BEING WRONG: the product feels smart while quietly misrepresenting businesses.
- DEADLINE: mid-sprint, after the owner loop is green.
- WHAT CONTINUES WITHOUT THE ANSWER: the panel runs on the default; failures are recorded per the RECORD LOSS policy.
- CLASS: PRODUCT BLOCKER

### Q27: RECORD LOSS policy: if the original site beats the generated one on any metric, who runs the comparison and how often?
- RECOMMENDED DEFAULT: the sprint runs one honest comparison per fixture site against its original (where an original exists and is publicly reachable), scored on the five metrics. Losses are recorded in the ledger and each loss becomes a generator fix, never a hand-patch of the tenant.
- WHY OWNER DECISION IS REQUIRED: the policy is decided but its cadence and ownership are not.
- COST OF DEFAULT BEING WRONG: the generator quietly underperforms the original and nobody measures it.
- DEADLINE: before the exit gate run.
- WHAT CONTINUES WITHOUT THE ANSWER: one comparison per site, losses recorded.
- CLASS: PRODUCT BLOCKER

### Q28: Qdrant DEGRADED: what exactly degrades in Ask FYD and the builder when vector search is down, and is fail-closed proven?
- RECOMMENDED DEFAULT: Ask FYD degrades to keyword/structured retrieval with a visible "reduced retrieval" indicator, and refuses rather than confabulates when recall is insufficient. The degraded path is tested by deliberately taking Qdrant down in the test environment.
- WHY OWNER DECISION IS REQUIRED: Qdrant was last observed DEGRADED; Ask FYD's retrieval dependency makes this a product-relevant failure mode, not just infra.
- COST OF DEFAULT BEING WRONG: silent empty results presented as confident answers (the exact failure the constitution forbids).
- DEADLINE: before Ask FYD is called proven.
- WHAT CONTINUES WITHOUT THE ANSWER: the default degraded behavior; untested degradation is not shippable.
- CLASS: CORRECTNESS

### Q29: Device/browser matrix for "your phone is the courtroom" — just your phone, or more?
- RECOMMENDED DEFAULT: your phone first and binding. A second pass on a desktop browser catches layout-class bugs. No device lab, no emulator matrix during the sprint.
- WHY OWNER DECISION IS REQUIRED: it bounds the testing effort; an unbounded matrix eats the sprint.
- COST OF DEFAULT BEING WRONG: either untested real devices, or sprint time burned on a matrix nobody asked for.
- DEADLINE: sprint kickoff.
- WHAT CONTINUES WITHOUT THE ANSWER: phone + one desktop pass.
- CLASS: PRODUCT BLOCKER

### Q30: Who decides the owner journey is "green" enough to authorize Monument View first contact?
- RECOMMENDED DEFAULT: you do, on the evidence of your own exit-gate run plus the served-byte binding records. No lane, agent, or metric declares it green on your behalf.
- WHY OWNER DECISION IS REQUIRED: Monument View is a real relationship with a no-autonomous-contact rule; the green gate is the trust decision that lifts real-world testing.
- COST OF DEFAULT BEING WRONG: a premature real-owner test on an unproven loop burns your own social capital.
- DEADLINE: after the exit gate.
- WHAT CONTINUES WITHOUT THE ANSWER: the gate stays closed; Monument View waits.
- CLASS: PRODUCT BLOCKER

## OWNER EXPERIENCE

### Q31: Real-owner gate: does any real owner touch the surface during the 100 hours, or is it you-as-owner only?
- RECOMMENDED DEFAULT: you-as-owner only. Real owners enter only after the exit gate, starting with Monument View on your explicit word and your first contact.
- WHY OWNER DECISION IS REQUIRED: it sets the privacy, polish, and support bar for the sprint surface.
- COST OF DEFAULT BEING WRONG: a real owner hits a demo harness and concludes FYD is a toy.
- DEADLINE: sprint kickoff.
- WHAT CONTINUES WITHOUT THE ANSWER: you-as-owner only; the surface is built for your hands.
- CLASS: PRODUCT BLOCKER

### Q32: First external owner research (2-3 candidates, no contact): inside the 100 hours or after the product gate?
- RECOMMENDED DEFAULT: after the product gate. The sprint is product proof; candidate research is queued work that starts when the exit gate is green.
- WHY OWNER DECISION IS REQUIRED: the research was ordered as standing work; placing it inside the sprint splits focus.
- COST OF DEFAULT BEING WRONG: research theater substitutes for product proof.
- DEADLINE: sprint kickoff.
- WHAT CONTINUES WITHOUT THE ANSWER: research waits for the green gate.
- CLASS: PRODUCT BLOCKER

### Q33: Authorization policy for real mode: is every owner patch a proposal requiring explicit approve, or are some auto-applied?
- RECOMMENDED DEFAULT: every mutation is a proposal through the approval door; nothing auto-applies to the published site. Drafts may autosave, but publishing always requires the explicit approve. This is the product thesis made visible (WAITING_APPROVAL).
- WHY OWNER DECISION IS REQUIRED: it is the core product promise; auto-apply would dissolve it.
- COST OF DEFAULT BEING WRONG: the approval door becomes theater while mutations slip through a side path.
- DEADLINE: before the mutation contract goes live.
- WHAT CONTINUES WITHOUT THE ANSWER: everything through the door; no side paths.
- CLASS: PRODUCT BLOCKER

### Q34: Version history UX: what does the owner see — full digest chain or plain-language timeline?
- RECOMMENDED DEFAULT: plain-language timeline first ("You moved Services above Hero, approved 2:14 PM"), with the digest chain one tap away for audit. Digests are never the primary UI.
- WHY OWNER DECISION IS REQUIRED: the version record is digest-heavy by design; its owner rendering is a UX call that decides whether history is usable or decorative.
- COST OF DEFAULT BEING WRONG: an audit log no owner can read, so undo/restore never get used.
- DEADLINE: before the history UI goes live.
- WHAT CONTINUES WITHOUT THE ANSWER: plain language first, digests on demand.
- CLASS: PRODUCT BLOCKER

### Q35: Media: hotlink-or-omit per asset — who decides for the two test sites, and are generated images allowed?
- RECOMMENDED DEFAULT: you decide per asset during the sprint; generated images are allowed only where no real business media exists, and every generated image carries GENERATED_COPY-equivalent provenance in WHY THIS. Hotlink where rights are clear; omit where uncertain.
- WHY OWNER DECISION IS REQUIRED: media rights are a legal/licensing boundary and a standing wake-class item.
- COST OF DEFAULT BEING WRONG: unlicensed media on a business presence.
- DEADLINE: before either site renders media.
- WHAT CONTINUES WITHOUT THE ANSWER: the default; uncertain rights means omit.
- CLASS: SECURITY

### Q36: Evidence freshness: stale source facts — show with timestamp, hide, or flag the owner?
- RECOMMENDED DEFAULT: show with a visible freshness indicator where the fact is still plausibly true (hours, services), and flag the owner to confirm or refresh where staleness changes meaning (pricing, availability). Never silently present stale facts as fresh.
- WHY OWNER DECISION IS REQUIRED: "FYD KEEPS IT CURRENT" needs a concrete staleness policy or it rots quietly.
- COST OF DEFAULT BEING WRONG: visitors act on outdated hours or prices.
- DEADLINE: before the freshness indicator is built.
- WHAT CONTINUES WITHOUT THE ANSWER: the default; staleness is visible, never silent.
- CLASS: CORRECTNESS

## FAILURE BOUNDARIES

### Q37: If the builder produces a section with no evidence binding, does the binding verifier block render or downgrade the claim class?
- RECOMMENDED DEFAULT: downgrade, never silently block the whole page. A FACTUAL claim without binding becomes GENERATED_COPY with provenance shown, or the section is omitted per Q17. The verifier's decision is logged.
- WHY OWNER DECISION IS REQUIRED: the binding verifier is demanded architecture; its failure posture decides whether one weak section kills a site.
- COST OF DEFAULT BEING WRONG: either unbound facts rendering as truth, or a single gap blocking an entire business presence.
- DEADLINE: before the verifier goes live.
- WHAT CONTINUES WITHOUT THE ANSWER: downgrade + log; never silent truth-laundering.
- CLASS: CORRECTNESS

### Q38: Approval door downtime: if Mission Control or the proposal store is unreachable, do owner edits queue, block, or bypass?
- RECOMMENDED DEFAULT: queue locally as pending proposals, clearly marked unsynced; never bypass the door. The owner sees exactly what is queued and what is decided.
- WHY OWNER DECISION IS REQUIRED: the approval door is the product's trust anchor; its outage behavior is a correctness decision, not an ops detail.
- COST OF DEFAULT BEING WRONG: edits silently bypassing authorization during an outage.
- DEADLINE: before the door is load-bearing.
- WHAT CONTINUES WITHOUT THE ANSWER: queue, never bypass.
- CLASS: CORRECTNESS

### Q39: Regeneration or publish failure mid-flight: does the site keep serving the last good version?
- RECOMMENDED DEFAULT: yes, atomic publish. The published version only swaps on a fully verified new version; any failure leaves the last good version serving, and the failure is surfaced to the owner with the intact version named.
- WHY OWNER DECISION IS REQUIRED: it decides whether a bad build can take down a business's presence.
- COST OF DEFAULT BEING WRONG: a failed regeneration blanks or corrupts the live site.
- DEADLINE: before the publish path goes live.
- WHAT CONTINUES WITHOUT THE ANSWER: atomic publish; last good version always serves.
- CLASS: CORRECTNESS

### Q40: What is the sprint's stop condition — the "stop the wave" trigger if product proof is not converging?
- RECOMMENDED DEFAULT: if, at any checkpoint, the chain URL -> UNDERSTANDING -> FYD PRESENCE -> ASK -> EVIDENCE -> OWNER CHANGE -> PERSISTENCE has a broken arrow that two consecutive work cycles cannot close, the sprint stops adding surface and collapses onto that single arrow until it closes or you redirect.
- WHY OWNER DECISION IS REQUIRED: the 100 hours need a circuit breaker or they become sunk-cost motion.
- COST OF DEFAULT BEING WRONG: 100 hours of compounding infrastructure around an unproven core.
- DEADLINE: sprint kickoff.
- WHAT CONTINUES WITHOUT THE ANSWER: the default circuit breaker applies.
- CLASS: PRODUCT BLOCKER

### Q41: Secret handling on the test surface: what is the boundary between demo mode and real credentials?
- RECOMMENDED DEFAULT: demo mode carries zero real credentials: no production API keys, no real owner sessions, no bearer material anywhere in the demo path. Any step that needs a real credential fails closed and names what is missing.
- WHY OWNER DECISION IS REQUIRED: tonight's ChatGPT payload incident is the reminder; the test surface must be credential-clean by construction.
- COST OF DEFAULT BEING WRONG: a repeat of tonight's exposure class, inside the product itself.
- DEADLINE: before demo mode goes live.
- WHAT CONTINUES WITHOUT THE ANSWER: the default; missing credentials fail closed.
- CLASS: SECURITY

### Q42: If the mobile fix cannot be cleanly isolated, does the sprint proceed on the uncommitted tree or hold?
- RECOMMENDED DEFAULT: hold the certification, not the sprint. The sprint proceeds on the tree as-is, but the mobile surface is not called proven until the fix is isolated, committed, and bound to served bytes. An uncommitted fix is a hypothesis.
- WHY OWNER DECISION IS REQUIRED: it decides whether "proven" can ever rest on dirty state.
- COST OF DEFAULT BEING WRONG: a fix that cannot be attributed, reverted, or replayed becomes load-bearing.
- DEADLINE: when the isolation attempt concludes.
- WHAT CONTINUES WITHOUT THE ANSWER: the default; dirty-tree fixes are hypotheses until isolated.
- CLASS: CORRECTNESS
