# MERGED FALSIFICATION: conflict-as-first-class-state family (F9-M1, F9-M2, F9-M3, F5-S1-partial, F3-S3-partial, LANE-14 handoff contract)

**Mode:** research only. No implementation code.
**Date:** 2026-09-23.
**Target:** the merged abstraction shared by the lane-survivors:
- F9-M1: conflict as first-class evidence state (CONFLICTING class; CLAIM A / evidence A / CLAIM B / evidence B / CONFLICT preserved)
- F9-M2: certainty attenuation at the answer seam (Ask FYD grammar gated on provenance; hedge or disclose on conflict)
- F9-M3: explicit auditable source-priority policy (loser stays visible; decisions logged with rule+version)
- F5-S1 (partial): binding verifier forces CONFLICTING classification to survive into the render model
- F3-S3 (partial): unknown-shape quarantine as UNRESOLVED_CONFLICT instead of first-seen-wins merge
- LANE-14 handoff contract (wave-1 survivor): conflicts carried with both provenances, resolution recorded, typed CONFLICTING state
- Note: the file `WAVE1-SURVIVOR-handoff-contract.md` does not exist in the challenge tree. The LANE-14 contract is characterized from FAIL-9-conflict-collapse.md section (a), "Wave-1 corroboration": the six-state handoff contract treats "Conflicting" (two workers' claims incompatible) as a first-class state with the prescribed action "preserve both sources, route to resolver/human." LANE-14 is an intra-pipeline worker-to-worker contract, not an end-to-end evidence-graph mechanism; that scoping matters in the attacks below.

**Method:** state the merged abstraction precisely, record where the members disagree with each other, then attack the merge itself rather than the members. Each attack names which family members it breaks and whether the merged abstraction survives. Verdict scale: WITHSTANDS / WEAKENED / FALLS, with the family's claimed classes pruned to honest form.

---

## 1. The merged mechanism, stated precisely

**The abstraction:** Contradiction is a durable, typed state of the evidence graph. When two observations assert non-identical values for the same field, the graph stores a CONFLICT record {claim A, evidence A, claim B, evidence B, detected-at, resolution state} with provenance class CONFLICTING on the affected claim. No merge step may destroy the fact of disagreement: storage has no slot for a resolved value that lacks evidence records, suppression is not deletion, and even a resolved conflict keeps both observations. Presentation is a separate policy decision: a versioned source-priority policy may pick a winner for rendering; the pick is recorded as an audit event with the rule that fired, the policy version, the winner, and the loser with its evidence. The loser remains retrievable from the graph. Answer and render grammar are gated on provenance class: a CONFLICTING claim cannot render as unqualified declarative fact at prose seams; it forces hedge-or-disclose shape, and the binding verifier forces the CONFLICTING classification to survive into the semantic render model. Conflicts that survive the policy become owner tasks; a conflict moves to resolved only through an owner action; the task queue is the only legitimate sink. Unresolved conflicts surface to the owner rather than resolving silently.

**The enemy this family was built to defeat:** the pipeline that ingests two disagreeing sources, silently picks one (usually last-write-wins), and leaves no trace that a disagreement ever existed, so every downstream consumer treats the winner as uncontested fact (FAIL-9's hours fixture: website 8-5 vs provider listing 9-5).

**What the family is not (already admitted in the sources):** it has no canonical normalization owner (FAIL-9 open question 1; FAIL-9 falsification cross-finding 2), no conflict lifetime or decay policy (FAIL-9 open question 2), no untested-safety-vs-priority precedence (FAIL-9 open question 3), no answer for owner-absent businesses (FAIL-9 open question 4), no agreed conflict granularity (open question 5), and no owner-identity resolution (open question 6). FAIL-5 section (d) admits the conflict rendering UX is undecided (both values, one value with a marker, omit). FAIL-3 falsification established that the quarantine half of the family needs an entity-identity rule and a normalization boundary it does not specify (S3 attacks 3B, 3C) and a drain SLA it does not test (S3 attack 3D).

---

## 2. Version disagreements inside the family

These are places where the members do not say the same thing. The merged statement above papers over them; each is live.

### D1. Preserve-both-forever (F9-M1, F3-S3) vs priority-policy-picks-winner (F9-M3)

M1 forbids the storage merge and keeps both observations forever, resolved or not. M3 authorizes a projection policy to pick a winner every time the page renders, with the loser's survival confined to graph queryability and the audit log. In the owner-absent steady state, which the family admits is the majority regime for harvested businesses, the M3 pick is the only thing that ever changes what anyone sees. The "preserved loser" is then inert archival: it is never retrieved, never cited, never shown. The family contains both "never collapse" and "pick a winner at every render" as load-bearing sentences, and the only thing separating M3 from FAIL-9's failure is the audience of the audit trail. FAIL-9 falsification (M3 attack 1) already showed the audience is engineers, not the parties harmed by a wrong pick. The merged statement's sentence "any presentation-time resolution is explicit, logged, versioned, and reversible" therefore rests entirely on how "explicit," "logged," and "reversible" are operationalized, and the members do not agree on the operationalization.

### D2. Who sees the conflict: visitor, owner, or log-only

M2 hedges toward the visitor in prose. M4 tasks the owner. M3 logs for engineers. F3-S3 quarantines for the onboarding operator. LANE-14 routes to a "resolver/human" between workers. No member specifies the audience of its own visibility guarantee, and FAIL-9 falsification cross-finding 4 showed the visibility chain terminates at engineers in every case. In particular there is no agreed visitor-visible policy for a contested fact: M2's hedge-or-disclose is one shape, FAIL-5's open question lists three (both values, one value with a marker, omit), and S1 only guarantees the classification survives into the render model, not into the rendered HTML (FAIL-5 falsification S1 attack A6: downstream transforms drop markers).

### D3. What "resolution" means

M4: a conflict moves to resolved only through an owner task, and "the conflict is not allowed to resolve itself by aging out or by refetch noise." M1: resolved conflicts keep both observations, but no member defines the RESOLVED state machine or what distinguishes RESOLVED from "policy currently picking A." M3: policy picks are "decisions," logged, but whether a picked conflict counts as resolved or merely decided is undefined; if picked equals resolved, M4's "only legitimate sink" is bypassed at scale by the policy author. F3-S3: UNRESOLVED_CONFLICT sits in quarantine with an untested drain SLA; nothing says what resolved means for a quarantined item. FAIL-9 open question 2 (conflict lifetime and decay) is the same question in the open, and no member answers it.

### D4. What counts as a conflict in the first place

F9-M1's cut list demands evidence-grounded detection via "distinct sources, non-identical values for the same field" while rejecting semantic comparison as a new authority. F3-S3's quarantine needs an entity-identity rule to know two blocks describe the same business, plus a normalization boundary to avoid false conflicts on serialization differences. FAIL-9 falsification (M1 attack 1, cross-finding 2) showed "non-identical" across representations is already a semantic judgment, so the detection criterion is undefined until the normalization owner from open question 1 is named. LANE-14's "two workers' claims incompatible" presumes worker claims are already comparable, which presumes the same solved identity and normalization. Every member's trigger condition is a promissory note signed by an unnamed authority that the family's own cut list forbids.

---

## 3. Attacks on the merged abstraction

### Attack (a): conflict explosion at the family level, and the significance filter as the new silent merger

**Setup.** The merged abstraction preserves every detected contradiction. Real harvesting input for one field of one business: a dozen sources, nine of them meaning "8 to 5" but rendered as "8-5", "8:00 AM - 5:00 PM", "8a-5p", "08:00-17:00", "Mon-Fri 8-5", "Monday to Friday: 8am-5pm", "8 - 5" with trailing whitespace, "8:00-17:00". Under the family's detection criterion (D4: "non-identical values," normalization owner unnamed), these are conflicts. Under exact-string comparison they produce dozens of CONFLICT records for semantically identical claims.

Without a significance filter, the family produces three downstream poisonings. First, the genuine "8-5 vs 9-5" conflict is buried in formatting noise, and the doctrine's purpose (Nolan's "FYD should know: CONFLICT" as high-value business maintenance) is not served; preservation without discernment destroys information by noise rather than by merge. Second, M2's hedge grammar fires on nearly every answer, spending the credibility budget the family never measures (FAIL-9 falsification M2 attack 5, the boy-who-cried-wolf finding); users learn the hedge is noise and stop reading it. Third, M4's task queue floods with one task per formatting variant, or the variants must be bundled, which breaks M4's "one-action resolution path" promise (FAIL-9 falsification M4 attack 2). F3-S3's UNRESOLVED_CONFLICT quarantine becomes a completeness DoS: two SEO plugins with the same hours in different serializations quarantine the field out of the graph entirely (FAIL-3 falsification S3 attack 3C).

With a significance filter (canonicalization rules, per-field semantic equivalence, a "worth preserving" threshold), the filter is the new silent merger. Anything the filter suppresses never becomes a CONFLICT record; to the visitor and the owner, it never happened. That is FAIL-9's failure, arriving through a rulebook instead of a code path. And the filter must be a semantic authority, which the family's own cut list rejected ("LLM semantic comparison for conflict detection" was cut as a new authority, and FAIL-9 falsification cross-finding 2 showed the cut list's rationale contradicts D4). So the family is caught in a fork at the level of the abstraction itself, not at any member: no filter means noise that trains everyone to ignore the CONFLICTING class; a filter means a silent merge engine with the family's own vocabulary printed on it. The remaining question is who sets the threshold and on what evidence, and that is the unaudited policy authorship problem (FAIL-9 falsification M3 attack 2) relocated from the priority ranking to the detection stage.

**Breakage per member:**
- F9-M1: broken at the trigger. M1's "no slot for a resolved value" guarantee is vacuous until the conflict-identity key, the normalization rule, and the significance bound are stated. Its test fixture is adversarially clean and never touches this.
- F9-M2: broken by depletion. M2's attenuation is only as credible as M1's precision; under explosion it becomes wallpaper. The family never budgets the credibility it spends.
- F9-M4: broken by flooding. The task queue is the family's only legitimate sink, and the explosion makes it a write-only log in the exact regime (harvested, unowned businesses) where the sink already goes undrained.
- F3-S3: broken by false conflicts. The discriminating case its test names (genuine contradiction) cannot be distinguished from serialization drift without the normalization boundary the member does not specify.
- F9-M3: technically untouched by the explosion itself, but the significance filter relocates its authorship problem to detection: whoever writes the canonicalization rules silently decides which disagreements count as disagreements.
- F5-S1 (partial): untouched; S1's render-model guarantee is downstream of whatever conflicts survive detection, so its strength is bounded by everyone else's weakness.
- LANE-14: untouched at the protocol level; "preserve both sources, route to resolver/human" works between workers, but the resolver now receives the exploded set.

**Does the merged abstraction survive?** Weakened. "No merge step may destroy the fact of disagreement" survives only if disagreement is well-defined, and it is not. The abstraction needs a significance policy that is itself versioned, auditable, and owner-visible, exactly like M3's priority policy, which means the family must admit that detection is also a policy, with the same authorship and legitimacy requirements. As stated, the abstraction assumes conflicts arrive pre-detected and pre-significant, which is the assumption the cut list's own detection criterion cannot sustain.

### Attack (b): the priority-policy paradox, is M3 distinct from the collapse it claims to prevent

**Setup.** M3's distinctive promise over silent last-write-wins: "the loser stays visible." FAIL-9 falsification M3 attack 1 asked the decisive question: visible to whom? The merged statement says presentation-time resolution is "explicit, logged, versioned, and reversible." Test each adjective against the parties to the conflict.

Explicit: to the visitor, the render shows one value; the disclosure of the contest depends on M2's prose gate, which is a different member, and M2's test accepts footnote burial ("We are open 8-5. (Our Google listing says 9-5.)" passes the checkable property while reproducing false certainty; FAIL-9 falsification M2 attack 1). To the owner, visibility depends on M4's task queue, a third member, which is undrained in the owner-absent regime. To the engineer, yes, explicit. So "explicit" holds for exactly the audience that needs it least.

Logged: yes, and the log is the strongest part of M3 (FAIL-9 falsification judged the rule-citation chain M3's strongest claim). But a policy-version flip (FAIL-9 falsification M3 attack 3) re-resolves thousands of conflicts with no new evidence, no owner task, no notification; the log faithfully records thousands of "rule fired" events. The system has silently re-picked at scale with a perfect audit trail. #9's essential harm (disagreements resolved without the affected parties knowing) is wearing an auditable costume. The merged statement has no rule against silent-at-scale re-picks; it has a log that documents them.

Versioned: yes, but versioning explains an old render; it does not prevent or notify the current one. Reversibility is the same shape: formally true (the graph still holds both sides; a policy rollback re-picks), practically false where no one with standing watches the log. "Reversible" without a watcher is a property of the storage engine, not of the social fact of the pick.

Now the paradox: if the loser is visible only in the log and graph, the visitor experiences exactly one value stated as fact. That is FAIL-9 with an audit trail. If the loser is made visitor-visible for every contested fact, every contested field becomes UI clutter, and the hedged-everything product from attack (c) is the direct result. There is no middle position stated by any member: M3 names no per-conflict-class visitor-visibility rule, and FAIL-5 section (d) leaves the rendering UX open. So M3's distinctiveness from the collapse reduces to "the pick is traceable by an engineer." Traceability is real and valuable, and it is not the same as preserving disagreement. The family should not claim it prevents silent resolution for the parties affected by the resolution; it prevents *untraceable* resolution, and it audits the *application* of a ranking whose *legitimacy* (who authored it, on what evidence, for what scope, and why website beats listing for this segment) is unaudited (FAIL-9 falsification M3 attack 2).

**Breakage per member:**
- F9-M3: broken at its #9 claim. The "silent half" is only half addressed: silent to engineers is fixed; silent to owners and visitors is not, and the actual site of silent power (policy authorship and policy-version flips) is unaudited. Its #5 rule-citation claim survives, pending log integrity.
- F9-M2: shares the prominence hole; the hedge-or-disclose shape is a nominal disclosure without a prominence requirement, so M2 does not rescue M3's visitor silence.
- F9-M4: the policy flip path bypasses the task queue entirely, because M4 fires on conflict *detection*, and no new conflict was detected. M4's "only legitimate sink" is circumvented by design at the policy layer.
- F5-S1 (partial): its CONFLICTING-in-the-render-model guarantee is the one member that could force visitor-visible conflict markers, but it stops at the render model; FAIL-5 falsification S1 attack A6 showed downstream transforms drop the marker. S1 proves seam behavior, not visitor experience.
- F9-M1, F3-S3, LANE-14: untouched; their guarantees are storage and protocol, and the paradox is a presentation-scope problem.

**Does the merged abstraction survive?** Weakened on its strongest sentence. "Presentation is a separate policy decision" survives as architecture. "Any presentation-time resolution is explicit, logged, versioned, and reversible" survives only with the audience pinned down: explicit to whom, logged where someone with standing reads it, reversible by whom. As stated, it is a storage-engine claim dressed as a social guarantee. The honest restatement: the family prevents untraceable picks, not silent ones.

### Attack (c): certainty attenuation vs usefulness, the hedge budget

**Setup.** M2's mechanism: CONFLICTING provenance gates Ask FYD into hedge-or-disclose grammar. The family presents this as a bounded tax on detected conflicts. The tax is actually a function of the conflict rate, and the conflict rate is a function of attack (a)'s explosion. Walk the product consequence.

At a low genuine-conflict rate and a high false-conflict rate, which is the real regime under D4's undefined detection, nearly every factual answer carries a hedge. The user-visible product becomes "I don't really know anything about anything." That is not a degraded version of the promised product; it is a different product, and it loses to a competitor that picked deterministically and was right 90 percent of the time, because users cannot distinguish "hedged because genuinely contested" from "hedged because formatting drift." The family's own doctrine makes this worse: M4's owner-absent paralysis renders permanent hedged uncertainty on the public site ("sources disagree about our hours"), which advertises dysfunction to every visitor and contradicts the stated moat ("FYD becomes progressively more accurate than the web it ingested"; a site permanently unsure of its own hours is not progressively more accurate; FAIL-9 falsification M4 attack 1).

The family has no stated bound: no maximum hedge rate, no per-field attenuation budget, no rule that says "if more than X percent of answers hedge, the detection policy is misconfigured, not the world is uncertain." M2's falsifiable test uses a single clean conflict and cannot see depletion. The result is that M2's prevention claim for #9 ("blocks the downstream symptom") holds per-answer but fails per-product: the symptom (false certainty) is blocked, and the replacement symptom (universal uncertainty) is unmeasured and unbounded.

There is a second-order cut: at some conflict rate, the honest product behavior is not to hedge every answer but to fix the detection policy. The family has no feedback arc from M2's hedge rate back to M1's detection criterion or to the significance filter from attack (a). The members are arranged as a pipeline (detect, preserve, attenuate, task, audit) with no loop, so the pipeline degrades open-loop.

**Breakage per member:**
- F9-M2: broken at scale. Its per-answer guarantee is real; its product-level claim ("blocks #9's customer-visible harm") is not, because the replacement harm is outside its test's field of view. The strengthened test from FAIL-9 falsification (false-conflict-rate bound) is the minimum repair.
- F9-M1: indirectly broken; M1's precision is the upstream variable that decides whether M2 is a scalpel or wallpaper, and M1's test sets no bound on false-conflict rate, so the family cannot hold M2 to one either.
- F9-M4: broken in the owner-absent steady state, where permanent hedge is the permanent behavior and the "interim" label from the cut-list defense is false advertising.
- F9-M3: untouched directly, but note the tension: M3's policy picks exist precisely to avoid hedged-everything rendering, which means M3 is the family's implicit hedge-budget mechanism, and it is unaudited (attack b).
- F5-S1, F3-S3, LANE-14: untouched.

**Does the merged abstraction survive?** Weakened. "Contradiction is a durable typed state" survives. "Attenuation at the answer seam" survives only below a conflict-rate bound the family does not state. The abstraction needs a stated hedge budget and a feedback arc from attenuation rate back to detection policy; without them it is an open-loop pipeline whose honest end state is universal uncertainty.

### Attack (d): conflict half-life, when one side's source disappears

**Setup.** The family preserves both sides and forbids silent self-resolution (M4: a conflict may not resolve by aging out or refetch noise). Now the website listing A lapses: domain expires, page 404s, the business never updates it. Only listing B remains, unchanged across refetches. The conflict was A vs B. What is it now?

Enumerate the options. (1) Keep UNRESOLVED forever. The graph accumulates a museum of dead conflicts; the owner task queue carries tasks against sources that no longer exist; M2 hedges answers against a ghost. (2) Auto-resolve to B on source disappearance. That is silent resolution by attrition, exactly what M4 forbids: no owner acted, the conflict evaporated because the web rotted. (3) Treat disappearance as retraction: A retracts its claim, B wins. This requires source-retraction semantics (is a 404 a retraction? a redesign that drops the hours page? a robots.txt change? a transient outage during one crawl?), an evidence-class for retraction the provenance vocabulary does not have, and a rule for distinguishing "source corrected itself" from "source died." None exists. (4) Treat disappearance as its own typed event (SOURCE_VANISHED) that converts the conflict into a new owner task ("your website's hours page is gone; Google says 9-5; confirm"). This is the only option consistent with M4, but it multiplies tasks at exactly the rate the web rots, and the owner-absent regime turns every rot event into permanent hedge.

The reverse case is worse: the business closes entirely; both sources go stale or vanish; "resolved by closure" requires knowing closure, which is a new detection problem. And the retention path (FAIL-9 falsification M1 attack 4) arrives at the same place from the operational side: a retention TTL deletes the losing observation, the CONFLICT record points at a dead reference, and the disagreement has no trace again. The family's "durable typed state" has no half-life story, no retraction semantics, and no distinction between "disagreement" and "one side stopped talking."

**Breakage per member:**
- F9-M4: broken directly. "The conflict is not allowed to resolve itself by aging out" collides with a web that ages out constantly. In the rot regime, M4's rule converts every dead source into either a permanent task or a forbidden silent resolution; the member has no third option and its test never crosses a disappearance boundary.
- F9-M1: broken at the retention boundary. "Never merged into a single record" forbids merging but not deletion; retention TTLs and dead references reintroduce #9 through the operational path the mechanism does not forbid.
- F9-M2: the hedge grammar has no tense for ghosts; "our website says 8-5" hedges against a page that 404s, which is false even as a hedge.
- F3-S3: the quarantine write path preserves the raw block, but a vanished source means the quarantine's raw content is now the only copy of a dead claim, with no stated rule for how long a dead claim stays quarantinable.
- F9-M3: untouched; the priority policy keeps picking B, which is the least-wrong behavior, and its audit trail is the only member that naturally records "A stopped being observable."
- F5-S1, LANE-14: untouched.

**Does the merged abstraction survive?** Weakened, with the deepest cut of the five attacks. "No merge step may destroy the fact of disagreement" survives only while both sides exist. The abstraction has no answer for asymmetric disappearance, and the two candidate answers (museum of ghosts, silent resolution by attrition) are both failures of the family's own doctrine. A durable conflict state needs a half-life: typed retraction semantics, a disappearance event, and a rule for when a one-sided conflict stops being a conflict and starts being history. None is specified anywhere in the family.

### Attack (e): the owner-resolution bottleneck meets F9-M4, permanent CONFLICTING states

**Setup.** M4: "the conflict is not allowed to resolve itself by aging out or by refetch noise"; "the conflict can move to resolved only through the owner task"; the task queue is "the only legitimate sink for a conflict record." FAIL-9 falsification (M4 attack 1) named the unstated precondition: an engaged, singular, responsive owner. For harvested businesses with no engaged owner, which the family admits is the majority regime, conflicts never resolve. The site then permanently renders hedged uncertainty or permanently carries CONFLICTING states in its render model.

Is permanent CONFLICTING better or worse than a deterministic wrong pick? Answer it twice. For honesty: permanent conflict is better; it does not lie. For the business: permanent public uncertainty ("sources disagree about our hours," carried forever) is brand damage that a wrong-but-clean pick does not inflict, and it is damage the business did not choose and cannot see, because the owner is absent and the task queue is write-only. The family's answer to "worse than a deterministic wrong pick" is that M3's policy pick with disclosure exists for exactly this regime. But then M4's "only legitimate sink" is false in the majority regime: the actual sink is the policy pick, the owner task is decorative, and the family has converged to its own cut sibling ("always ask the owner" was cut for blocking on human availability; M4 with M2/M3 as interim behavior reconverges to it, and in the owner-absent steady state the interim behavior is the permanent behavior; FAIL-9 falsification cross-finding 5).

The merged statement says "unresolved conflicts surface to the owner rather than resolving silently." In the owner-absent regime they surface to no one: the owner does not exist in the loop, the visitor gets hedged text, the engineer gets a queue that never drains. "Surface to the owner" is then a routing rule to a null address. The honest statement is that the family has two regimes with different legitimate sinks: engaged-owner (owner task is the sink; M4's rule holds) and owner-absent (a declared fallback adjudication policy is the sink, with disclosure; M4's rule cannot hold). The family currently specifies the first regime and silently lives in the second, which means its strongest sentence ("conflicts resolve only via owner action") is false where it matters most.

Note the interaction with attack (d): in the owner-absent regime, source rot (d) plus no-resolution (e) means the site's hedged text references dead sources forever. The two attacks compose into permanent public confusion about dead facts.

**Breakage per member:**
- F9-M4: broken in the majority regime. Its silent-self-resolution closure is genuine (the test's core assertion stands), but its "only legitimate sink" claim is false for owner-absent businesses, and it has no fallback adjudication rule, no staleness bound, no escalation. Its test blesses permanent UNRESOLVED as success.
- F9-M2: degraded; permanent hedge in the owner-absent regime is the availability-of-certainty failure from FAIL-9 falsification's M4 verdict.
- F9-M3: elevated by default; the policy pick becomes the de facto sink, which makes M3's unaudited authorship (attack b) the load-bearing decision for most businesses, not a backstop.
- F9-M1: untouched at storage; the CONFLICT records persist correctly, which is exactly the problem: correct persistence of unresolvable conflicts is the museum from attack (d).
- F3-S3: its quarantine drain SLA (open question 2) is the same bottleneck in miniature: a quarantine nobody drains is /dev/null with labels, and owner-absent businesses guarantee nobody drains it.
- F5-S1 (partial): untouched; CONFLICTING survives into the render model permanently, which is faithful and useless.
- LANE-14: "route to resolver/human" presumes a resolver exists; in the owner-absent regime the resolver is null, so the handoff contract's prescribed action is unexecutable where it is most needed.

**Does the merged abstraction survive?** Weakened, at the exact sentence the task named: "unresolved conflicts surface to the owner rather than resolving silently." It survives only with the regime qualifier the family never states. Without a declared fallback adjudication policy for the owner-absent regime, with disclosure and its own audit trail, the abstraction's resolution story is a single-regime mechanism presented as universal.

---

## 4. Per-member breakage summary

| Member | (a) explosion | (b) policy paradox | (c) hedge budget | (d) half-life | (e) owner bottleneck | Net |
|---|---|---|---|---|---|---|
| F9-M1 first-class CONFLICTING state | Broken at the trigger: detection criterion undefined, no significance bound | Untouched | Indirectly: its precision decides M2's credibility | Broken at retention: TTL and dead refs reintroduce #9 | Untouched at storage; correct persistence is the museum | WEAKENED; storage guarantee real, trigger and lifetime undefined |
| F9-M2 certainty attenuation | Broken by depletion: hedge becomes wallpaper | Shares the prominence hole | Broken at scale: per-answer real, per-product unbounded | Hedge has no tense for ghosts | Degraded: permanent hedge in owner-absent regime | WEAKENED; prose seams only, needs rate bound and prominence rule |
| F9-M3 auditable priority policy | Relocated authorship problem to detection | Broken at #9: prevents untraceable picks, not silent ones | Implicit hedge-budget mechanism, unaudited | Untouched; best-behaved under rot | Elevated to de facto sink in majority regime | WEAKENED; rule-citation chain stands, #9 prevention claim does not |
| F5-S1 binding verifier (partial) | Untouched (downstream of detection) | Stops at render model; markers dropped downstream | Untouched | Untouched | Untouched; faithful and useless | WEAKENED; seam proof only, per FAIL-5 falsification |
| F3-S3 quarantine (partial) | Broken: false-conflict DoS without normalization boundary | Untouched | Untouched | No rule for dead claims in quarantine | Drain SLA is the same bottleneck in miniature | WEAKENED; write path holds conditionally, read path untested |
| LANE-14 handoff contract | Inherits the exploded set | Untouched | Untouched | Untouched | "Route to resolver/human" unexecutable with null resolver | Holds as a protocol; inherits D4 and the null-resolver regime |

No member WITHSTANDS all five attacks. No member FALLS outright on its core: M1's storage preservation, M2's per-answer grammar gate, M3's rule-citation chain, S1's seam verification, S3's loud-default write path, and LANE-14's both-provenances handoff each contain a genuine mechanism. The pattern of the breakage is that every member's guarantee is scoped narrower than its claim, and the unscoped parts (detection, audience, lifetime, regime) are exactly where the five attacks land.

---

## 5. Pruned honest class claims

Stripped of the overreach the attacks exposed, the family can honestly claim:

- **#9 conflict-collapse: storage-scope prevention WITHSTANDS; end-to-end prevention does not.** M1 genuinely removes the storage merge: the graph cannot silently collapse a disagreement it recorded. What the family cannot claim: that disagreements are never silently resolved for the parties affected. Policy picks (M3) resolve silently to visitors and owners; policy-version flips resolve silently at scale; retention TTLs and dead references reintroduce collapse through the operational path; source rot resolves by attrition. Honest claim: the family prevents *untraceable* picks and *storage-level* collapse. It does not prevent silent resolution as experienced by visitors or owners.
- **#5 claim-binding: WEAKENED to prose seams with detected conflicts.** S1's verifier plus M2's grammar gate genuinely stop an unqualified declarative render of a detected conflict at build-time prose seams. Not claimed anymore: machine-readable seams (no hedge grammar; FAIL-5 falsification S1 attack A6, FAIL-9 falsification M2 attack 3), footnote-buried disclosures (prominence unregulated), agreed-but-wrong evidence (renders declaratively by design), and anything downstream of the render model (markers dropped by transforms).
- **#8 correction-loss: WITHSTANDS in the append-only lane, with two repairs owed.** Owner corrections as OWNER_ASSERTED evidence surviving regeneration is the family's strongest claim and no attack touches the storage property. Owed repairs: the reopen rule needs adjudicated-suppression (FAIL-9 falsification M4 attack 3: a never-corrected losing source must not nag the owner forever), and the minting authority must be named (FAIL-5 falsification S3 attack C2; the strongest tier rests on an unnamed trust root).
- **#6 visibility-error: M3's prevention claim is CUT.** Per FAIL-9 falsification, its own description is detection-after-render; even the detection half is untested. The family keeps the visibility-tier encoding in the policy as a stated rule, not as a prevention claim.
- **New claims the family must add before it can be called complete:** a significance/detection policy that is itself versioned, auditable, and owner-visible (attack a); a per-conflict-class visitor-visibility rule with a prominence requirement (attack b); a hedge-rate bound with a feedback arc to detection policy (attack c); typed retraction and disappearance semantics with a conflict half-life (attack d); a declared fallback adjudication policy for the owner-absent regime, with disclosure and audit (attack e). Until these exist, each is a named hole, not a silent assumption.

---

## 6. Verdict on the merged mechanism: WEAKENED

The merged abstraction survives as a storage discipline and as an honesty constraint on prose seams. It does not survive as the end-to-end guarantee its sentences imply. The five attacks each land on a part of the abstraction the members left unscoped: what counts as a conflict (a), to whom a resolution is explicit (b), how much uncertainty the product can carry (c), how long a conflict lives (d), and in which regime the owner sink exists (e). None of the attacks reintroduces the original failure in its original form at the storage layer; M1's core property (the graph cannot silently un-record a disagreement it recorded) is not falsified. But the original failure's *harm* (a party acting on a false certainty with no trace of the contest) reappears in four new costumes: the audited pick no one affected sees, the universal hedge no one reads, the ghost conflict against a dead source, and the permanent task queue with no owner. The family converted silent collapse into documented irresolution, which is progress, but documented irresolution is not resolution, and at the product surface it can be worse than a deterministic wrong pick.

The single load-bearing admission the family must make: it is a two-regime mechanism (engaged-owner vs owner-absent) with a one-regime specification. Every sentence containing "the owner" needs the regime qualifier, and the owner-absent regime needs its own stated sink, its own disclosure shape, and its own audit audience. Until then the merged abstraction is WEAKENED: true where it is scoped, unscoped where it matters.

---

## 7. The single strongest falsifiable test for the merged mechanism

**Name:** the hostile-corpus end-to-end test (detection, pick, hedge, rot, flip, absence).

**Rationale for "strongest":** each member's own test is scoped to its layer and uses a clean fixture, which is why all five attacks walk through them. The merged abstraction's claims are end-to-end ("no merge step may destroy the fact of disagreement," "presentation-time resolution is explicit, logged, versioned, and reversible," "unresolved conflicts surface to the owner rather than resolving silently"), so the falsifying test must be end-to-end and hostile: it must exercise detection precision, the policy pick, the hedge rate, source disappearance, a policy-version flip, and the owner-absent regime in one run, because the attacks compose (rot plus absence equals permanent public confusion about dead facts).

**Input fixture.** One business, one field family (hours), across two refetch cycles plus a retention sweep plus a policy-version bump:
- Twelve sources for hours: two genuinely disagreeing (website "8-5", listing "9-5"), eight formatting-drift variants of "8-5" (list them explicitly: "8:00 AM - 5:00 PM", "8a-5p", trailing whitespace, "08:00-17:00", "Mon-Fri 8-5", "Monday to Friday: 8am-5pm", "8 - 5", "08:00 - 17:00"), one duplicate aggregator copy of the listing's "9-5", one source that 404s between cycle 1 and cycle 2 (the website's hours page).
- No owner correction at any point (owner-absent regime). A second business as control with one engaged owner who resolves the single genuine conflict in cycle 1.
- Priority policy v7 at cycle 1 (website outranks listing); policy v8 at cycle 2 reorders to listing outranks website, with no new evidence.
- A stated significance policy under test (the test names the normalization rule and the conflict-identity key before running; "default exact-string" is an allowed statement, and then it must live with the consequences).

**Procedure.** Run acquisition (cycle 1), SiteSpec generation, and Ask FYD queries for hours on both businesses. Run refetch (cycle 2) with the 404 in effect. Run the retention sweep between cycles. Bump the policy to v8 and regenerate. At each stage, capture: the evidence graph contents, the CONFLICT record set, the owner task queue, the audit log, the rendered page text and page-head structured data, and the Ask FYD answer text.

**Expected observable outcomes (all must hold; each maps to an attack):**
1. (a) Significance: exactly one CONFLICT record for the genuine "8-5 vs 9-5" disagreement; zero CONFLICT records for the eight formatting variants and zero for the aggregator duplicate. The false-conflict count has a stated bound in the test, and exceeding it fails the test.
2. (a) Identity stability: cycle 2 produces no new CONFLICT records for the same disagreement (dedup key excludes observed-at); the task queue holds exactly one open task per business.
3. (b) No silent picks: every rendered value that differs from a previously rendered value without an owner action has a corresponding audit event that is visible to the owner (owner dashboard or task feed), not only graph-queryable by engineers. Engineer-only visibility fails the test.
4. (b) No silent-at-scale re-picks: the v7 to v8 flip re-opens owner-visible notifications or tasks for affected conflicts; a flip that only writes log events fails the test.
5. (c) Hedge budget: hedged or disclosed answers as a fraction of all Ask FYD factual answers stays under a stated bound (the test states it, e.g. under 15 percent on this corpus); exceeding it fails the test and names detection misconfiguration, not world uncertainty. Prominence: no passing answer may state a declarative value before disclosing the disagreement.
6. (d) Half-life: the 404'd website source produces a typed SOURCE_VANISHED event; the conflict does not silently auto-resolve to the listing, and the hedge text does not cite the dead page as a live source. Retention sweep deletes no observation attached to an open CONFLICT record.
7. (e) Regime honesty: on the owner-absent business, after two cycles with no owner action, the system exhibits its declared fallback behavior (stated before the run: e.g. policy pick with visitor-visible disclosure, or escalated STALE task), not indefinite silent UNRESOLVED. Indefinite UNRESOLVED with no declared fallback fails the test. On the control business, the owner resolution closes the task, appends OWNER_ASSERTED evidence without in-place edits, and cycle 2 with the same losing source and value opens no new task (adjudicated-suppression).

**What proves the merged mechanism does not work (any one suffices):** a formatting variant produces a CONFLICT record; a refetch duplicates a conflict or a task; any projected value flips between cycles or across the policy bump without an owner-visible audit event; the rendered page or the structured-data head states a single unqualified value while the graph holds an open CONFLICT for that field; the hedge rate exceeds the stated bound; the vanished source silently resolves the conflict or is cited as live; the owner-absent business sits in indefinite UNRESOLVED with no declared fallback; the control business's owner gets re-nagged about the already-adjudicated losing source.

**Why this is the strongest single test:** it is the only test in the family's corpus that can fail for the reasons the five attacks give. M1's test cannot see the explosion; M2's test cannot see depletion; M3's test never flips the policy version; M4's test never performs an owner action and never crosses a disappearance; S1's test stops at the render model; S3's test uses three hand blocks. This test asserts the merged abstraction's own sentences end to end, and its falsification conditions are the attacks restated as executable assertions.
