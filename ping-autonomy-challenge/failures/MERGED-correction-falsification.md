# MERGED FALSIFICATION: correction persistence family (F5-S3, F8-S1, F8-S2, F9-M4)

**Mode:** research only. No implementation code.
**Date:** 2026-09-23.
**Target:** the merged abstraction shared by the four lane-survivors:
- F5-S3: claim-level provenance pointers, fail-closed dangling resolution, OWNER_ASSERTED evidence records, SOURCE_CHANGED_AGAINST_OWNER_ASSERTION event
- F8-S1: typed correction patches anchored to stable identity, dedicated decision store, re-applied on every read
- F8-S2: three-way merge on regeneration (base source / new source / owner overlay; owner wins ties; typed conflict)
- F9-M4: conflict surfacing as owner correction tasks (conflicts resolve only via owner action)

**Method:** state the merged abstraction precisely, record where the four members disagree with each other, then attack the merge itself. Each attack names which family members it breaks and whether the merged abstraction survives. Verdict scale: WITHSTANDS / WEAKENED / FALLS, with the family's claimed classes pruned to honest form.

---

## 1. The merged mechanism, stated precisely

**The abstraction:** An owner judgment is a typed, identity-anchored, durable record, separate from the source layer. The record types are correct-fact, confirm-fact, and hide-fact, each carrying: stable target identity (object id + field path), the owner value, a snapshot of the source value it was made against, actor, timestamp, and a digest-bound approval (baseStateDigest, baseViewDigest, patchDigest). Records live in a dedicated decision store the regeneration pipeline may read but never writes to (re-dumps address the source layer only). Every regeneration recomposes the effective value by re-applying the owner overlay over the new source. When a new source observation contradicts a correction, the system raises a typed event (SOURCE_CHANGED_AGAINST_OWNER_ASSERTION), keeps the owner's value effective, preserves both values as a first-class conflict state, and routes resolution to an owner action (keep mine / accept source / inspect) via an owner correction task. Nothing overwrites a correction silently: the overlay is re-applied, the disagreement is named, the losing value stays visible. Unresolved pointers (deleted evidence, revoked assertion) fail closed: the claim is omitted and flagged, never rendered as orphaned text.

**The enemy this family was built to defeat:** the pipeline that treats a human judgment as stale source data and clobbers it on refresh (F8's real instances 1-5; F5's provenance pointers; F9's conflict-collapse). Against that enemy, at the moment of regeneration, with one owner and stable identities, the family is coherent.

**What the family is not (already admitted in the sources):** it has no answer for who the owner is (F8 open question 2, demo-grade actor identity in Step 6), no re-anchoring protocol for reorganized entities (F8 open question 1), no conflict lifetime policy or default-plus-clock (F8 open question 3), no actor precedence for owner-versus-owner (F8 open question 5, F9 open question 6), and no object-lifecycle states for corrections on vanished objects (F8 open question 4).

---

## 2. Version disagreements inside the family

These are places where the four members do not say the same thing. The merged abstraction above papers over them; each disagreement is a live contradiction, not a wording difference.

### D1. Owner-wins-ties (F8-S2) vs keep-both-visible (F9-M1, F8-S1)

F8-S2: "fields with an owner decision keep the owner value by policy, and if the new source disagrees with the recorded source snapshot, the merge emits SOURCE_CHANGED_AGAINST_OWNER_ASSERTION." The owner's value wins the tie, automatically, at merge time.

F9-M1: conflict is a property of evidence; both observations are preserved side by side with a CONFLICT record; projection policy decides presentation; "suppression is not deletion."

F9-M4: an unresolved conflict generates an owner task, and "the conflict is not allowed to resolve itself by aging out or by refetch noise."

Tension: S2 auto-resolves source-vs-owner disagreement at merge time (owner wins, event emitted), while M4 demands that conflicts route to owner action and never resolve themselves. If owner-wins-ties fires automatically, the M4 task for the source-vs-owner class is stillborn: the conflict is "resolved" by policy before any owner acts. And M1's CONFLICT record with resolution state has no defined relationship to the S2 event: is the conflict record RESOLVED (owner won) or UNRESOLVED (owner never acted)? The family contains both "owner wins ties by policy" and "conflicts resolve only via owner action" as load-bearing sentences. They cannot both be true for the same disagreement. F8's own falsification (S2 Attack A) showed the missing third condition: the tie needs a lifetime policy with a default and a clock, which neither member supplies.

### D2. Re-apply-on-read (F8-S1) vs re-apply-on-regen (F8-S2, F5-S3)

F8-S1: "the read seam composes the effective value on every serve: source layer plus decision-store overlay." The overlay is applied at read time, on every serve, against the live source layer.

F8-S2: regeneration is a three-way merge whose output is the merged effective state. F5-S3: "Regeneration re-resolves every pointer against the live evidence graph."

If S1's read-seam composition is universal, S2's regen merge is redundant: any merge output is recomputed at the next read. If S2's merged output is the system of record, S1's per-read composition is redundant. Worse, with both live, the overlay is applied twice in sequence (at regen, then at read), which requires idempotency of overlay application: applying the same patch twice must equal applying it once. Idempotency is assumed, never stated, never tested. The two members never name which layer is authoritative for the effective value, and each one's falsifiable test assumes its own seam is the one that matters.

### D3. Who may mint OWNER_ASSERTED records

F5-S3: "Owner corrections persist as first-class OWNER_ASSERTED evidence records with priority over source observations."

F8-S1: patches carry "actor and timestamp" and a digest-bound approval.

F9-M4: owner resolutions "enter as OWNER_ASSERTED evidence."

All four treat OWNER_ASSERTED as the strongest provenance tier and grant it priority over source observations plus protective conflict events. None names the minting authority, the authenticated channel, or the exclusion of the generation pipeline from the assertion store. F8 is candid: Step 6 ran "on demo owner mode with no verified identity" (open question 2); F5's falsification (C2) and F9's falsification (M4 Attack 4) both flag this as the shared hole. The family builds the strongest evidence tier on an unnamed trust root. This is not a disagreement between members; it is an agreement by omission, which is worse: every member inherits the hole, so no member constrains it.

### D4. Orphan semantics: fail-closed omission (F5-S3) vs honored orphan (F8-S1's test)

F5-S3: "A pointer that no longer resolves (deleted evidence, revoked assertion) FAILS CLOSED: the claim is omitted and flagged."

F8-S1's falsifiable test: when the hidden service is deleted from the source fixture, "the dangling hide patch either stays honored or raises a named 'correction target missing' state, never silently dropped and never resurrecting the object."

F8's own falsification (S1 Attack A) showed the disjunction is satisfiable by failure: the patch stays "honored" on a dead identity while the successor object (the merged "Pergola & Patio Design Services") renders fully visible with no owner decision attached. The test passes while the owner's intent is defeated. So F5-S3 says dangling means fail closed on the claim, while F8-S1's tested behavior lets a dangling patch count as "honored" while its real-world successor escapes entirely. The family has no single rule for "the anchor died." D1-D4 are catalogued because each becomes a weapon below.

---

## 3. Attacks on the merged abstraction

### Attack (a): the minting-authority problem

**Setup.** The family grants OWNER_ASSERTED records the strongest tier: priority over source observations, protective conflict events when sources disagree, re-application on every read or regen. The minting authority is unnamed (D3). Concrete hostile cases:

1. **The confused deputy:** a support agent, using an internal tool with write access to the decision store, records a "correction" at a customer's request over chat, mishearing the phone number. The typed patch is well-formed: actor, timestamp, digest-bound approval against the base the agent saw. The family now protects the wrong number against every true source crawl, firing SOURCE_CHANGED_AGAINST_OWNER_ASSERTION to defend the error.
2. **The bulk importer:** a migration or onboarding script backfills "owner corrections" from a spreadsheet of scraped data. Thousands of records enter the strongest tier with actor = "import-job" and no human judgment behind them. Nothing in the patch schema distinguishes a considered judgment from a bulk row.
3. **The owner pasting hostile content:** the owner, socially engineered or simply mistaken, asserts a competitor's phone number as their own, or asserts a license number they do not hold. F8-S1's falsification (Attack C, jurisdiction) already showed typed-ness is structural, not authoritative: the schema accepts "invent an object" dressed as correct-fact.
4. **The generation pipeline as minter:** F5's falsification (C2) names the inversion: if the copy-generation pipeline can write to the assertion store, generated text becomes an assertion, the assertion becomes rendered OWNER_ASSERTED fact, and the binding verifier blesses the loop. Priority inverts completely.

**Breakage per member:**
- F5-S3: broken at the root. Its #5 claim ("a rendered sentence carries VALUE plus CLASSIFICATION plus EVIDENCE_REF") becomes provenance dressing on laundered content; exact-value-match against an attacker-authored record is no defense. Its #8 claim holds mechanically (the record persists) but is now protecting a falsehood, which is the guarantee inverted.
- F8-S1: the #5 claim falls (digest binding is real, but the "who" is a demo label and jurisdiction is unscoped; F8's own falsification judged #5 WEAKENED on exactly these grounds). The #8 machinery survives: the record is durable. But durability of a laundered record is the failure, not the mechanism.
- F8-S2: "owner wins ties" becomes "whoever minted wins ties." The three-way merge cannot distinguish correction from injection because the distinction lives in the unnamed authority.
- F9-M4: "conflicts resolve only via owner action" becomes "injections resolve only via owner action," which protects the injection: the true source's disagreement is routed to a task queue the confused principal will rubber-stamp.
- F9-M1: partially survives. The losing (true) observation is still preserved in the graph, so the laundering is auditable in principle. But M9-M1's own falsification (M3 Attack 1: loser visible to whom?) shows engineer-only auditability does not reach the harmed parties.

**Does the merged abstraction survive?** The mechanics survive; the guarantee does not. The abstraction's core promise is that owner *judgments* survive. Without a named principal, "judgment" is undefined, and the family cannot tell a judgment from a row. The abstraction degrades from "owner intent is durable" to "whatever entered the strongest tier is durable." That is a precise weakening, and it is structural: it cannot be fixed inside the family (no member owns identity). **Merged verdict on (a): WEAKENED, with the hole at the foundation.** Every class claim that touches authenticity (#5 claim-binding, and the legitimacy half of #9) rests on the unnamed trust root.

### Attack (b): identity instability at the family level

**Setup.** Entity merge/split, object deletion plus resurrection, tenant migration. The anchor (object id + field path) dies; the correction is orphaned. The family has no re-anchoring protocol (F8 open question 1) and two contradictory orphan semantics (D4). Three concrete cases:

1. **Merge:** the source re-emits the hidden Pergola service merged into "Pergola & Patio Design Services" with a new id. The hide patch on the dead id stays "honored" (satisfying F8-S1's test disjunction) while the successor renders visible with no owner decision. Fail open in effect: the owner's intent (hide this offering) is defeated, the test passes.
2. **Split:** the phone field splits into office/mobile. The correction anchors to the old field path. No member names which successor inherits it, whether both do, or whether this is a named conflict. Whatever the composition happens to do is unspecified and untested.
3. **Deletion plus resurrection:** the object vanishes in regen N (named event), reappears in regen N+1 with a new id and changed values. F8-S4's falsification (Attack C) showed the diff marks it "added" with no old values; the resurrection is invisible to field-level comparison. The owner's correction now has two candidate targets: the honored orphan on the old id and the uncorrected new object. The family has no rule choosing between them.

**The fail-open vs fail-closed question, answered per member:**
- F5-S3's pointer semantics: fail closed. The dangling pointer omits the claim and flags it. For a hide patch, omission of the claim about a hidden thing is invisible (the thing stays hidden, which is the intent). For a correct-fact, omission means the field renders nothing, which is a visible degradation but safe.
- F8-S1's tested semantics: fail open in the merge case. The orphan is "honored" while the successor escapes, so the family fails open exactly where it matters: the correction is lost *in effect* while preserved *in record*.
- F8-S2's merge semantics: undefined. The merge diffs base vs new source; a re-identified object is not in the base under its new id, so the owner overlay has no anchor to attach to. The merge silently drops the correction from the effective output, which is #8 through the re-identification path.
- F9-M4: no task fires, because no CONFLICT record is created. Conflict detection is value-based (distinct sources, non-identical values for the same field); an identity discontinuity is not a value disagreement, so the task queue never sees it. The family's only routing mechanism is blind to the whole class.

**Does the merged abstraction survive?** No, not as a family-wide invariant. The abstraction claims corrections are "identity-anchored" and "durable," but durability is defined as *record* durability while the guarantee the owner needs is *intent* durability. Under re-identification the two come apart: the record persists, the intent dies, and the family's own tests cannot tell the difference (F8-S1's disjunction counts the orphan as honored). The merged abstraction survives only in the stable-identity regime, which is exactly the regime its tests already cover. **Merged verdict on (b): WEAKENED, with a family-internal contradiction.** F5-S3's fail-closed and F8-S1's honored-orphan cannot both be the family rule; until one is chosen and the re-anchor protocol written, the abstraction's "identity-anchored" clause is a single-point-of-failure disguised as a foundation.

### Attack (c): correction-vs-correction

**Setup.** Two actors correct the same field differently. The family models exactly two disagreement axes: source-vs-source (F9-M1's CONFLICT records) and source-vs-owner (all four members' events and overlays). The third axis, owner-vs-owner, has no vocabulary anywhere in the family:

- F8 open question 5: "the decision store currently models owner-versus-source; it has no actor precedence for owner-versus-owner."
- F9 open question 6: "two corrections from two people claiming to be the owner are a conflict of OWNER_ASSERTED records. Identity of the owner is then load-bearing; that is a separate hard problem the current doctrine does not solve."
- F8-S1's falsification (Attack B): two owners record conflicting corrections; the read seam re-applies "the" correction, but there are two. Silent last-write-wins (the cut candidate returning through the back door), shadowing inside the decision store (#8-shaped loss within the store itself), or serve-to-serve nondeterminism. No typed conflict, no named event, no test.
- F9-M4's "conflicts resolve only via owner action" is the sharpest form of the hole: WHICH owner? When the two claimants disagree, the task queue is the sink, but the sink is contested, and the mechanism has no adjudication rule for OWNER_ASSERTED vs OWNER_ASSERTED. The options are all bad: pick one silently (violates "do not silently pick"), freeze (paralysis), or escalate to a human process the family does not define.
- F5-S3's pointer contract assumes one assertion ref per claim ("VALUE plus CLASSIFICATION plus EVIDENCE_REF or OWNER_ASSERTION_REF"). With two competing assertions, the exact-value-match requirement is meaningless: which record does the value match? The contract has no slot for the second record.
- F8-S2's merge has no owner-vs-owner branch at all. The overlay is treated as a single decided value per field; two values for one field is outside the merge's input model.

**Does the merged abstraction survive?** The abstraction's conflict sentence reads: "source-vs-correction disagreement raises a typed event and preserves both." Correction-vs-correction disagreement raises nothing and preserves, at best, the last writer. The abstraction is not falsified on its stated scope; it is *scoped* to exclude the case. The honest reading: the family is a source-vs-owner mechanism plus a source-vs-source storage discipline, and it has no correction-conflict story at all. **Merged verdict on (c): the abstraction holds its stated scope but the scope is the finding.** "Nothing silently overwrites" is false for the owner-vs-owner axis: the family silently overwrites (last-write-wins) or silently shadows there, with no event, no task, no test. Any class claim that implies general conflict handling (#9 as a general claim) must be pruned to the two covered axes.

### Attack (d): staleness, the mirror image of #8

**Setup.** A correction that was right in 2024 and is wrong now. The business genuinely changes its phone number; the owner never updates the assertion. The new source crawl observes the true new number. The family:

1. F8-S1: re-applies the overlay on every read. The stale value is effective forever. No member defines correction expiry, re-confirmation, or a freshness bound on OWNER_ASSERTED records.
2. F8-S2: emits SOURCE_CHANGED_AGAINST_OWNER_ASSERTION and keeps the owner's value "by policy." The owner never resolves it (F8 open question 3: "an unresolved conflict that sits forever is a silent owner-wins"). Over time the contradiction decays from a first-class state into an archived log line, which F8's own falsification identified as the exact shape of the cut "owner-wins-always" the survivor was supposed to differ from.
3. F5-S3: the event fires every regen with no named consumer (F5 falsification C4: "detection without resolution"; "correction preservation without a decay or re-confirmation policy becomes staleness preservation, the mirror image of #8").
4. F9-M4: the task sits in the queue. If the owner engaged once, the resolved-then-refetch path needs adjudicated-suppression (F9 falsification M4 Attack 3), or the owner is nagged forever about a settled question and learns to ignore the queue. If the owner never engages, the conflict is UNRESOLVED forever with no staleness bound (F9 falsification M4 Attack 1: the test certifies permanent paralysis as success).
5. F9-M1: the CONFLICT record persists with resolution state UNRESOLVED indefinitely. Storage-level preservation is real, but "preserved" and "live" diverge over time, and no member defines the divergence point.

**Breakage per member:** all four break on the time axis. None has an expiry, appeal, or re-confirmation path. F5-S3's event has no consumer; F8-S1's overlay has no clock; F8-S2's tie-break has no lifetime policy (its own falsification names this as the missing third condition separating it from the cut version); F9-M4's tasks have no staleness bound.

**Does the merged abstraction survive?** The abstraction is timeless: "every regeneration re-applies the overlay; disagreement raises a typed event." Against a time-crossing attack it does exactly what it promises, and what it promises is the failure: faithful preservation of an outdated judgment against the true current source, forever. This is #8's mirror image (staleness preservation instead of correction loss), and the family has no counter for it because the family treats "owner said" as monotonically authoritative. The abstraction's #8-prevention claim, projected over time, becomes a staleness-generation claim. **Merged verdict on (d): FALLS on the temporal dimension.** Not weakened: falsified. A mechanism that cannot distinguish "correction from last week" from "correction from 2024" and applies the same always-win policy to both is, over time, a mechanism for suppressing true current information. The abstraction survives only as an instant-property ("at this regen, disagreement is typed"); as a durable guarantee it inverts. The repair is named in the sources and absent from the family: a default-plus-clock, re-confirmation policy, or correction freshness bound.

### Attack (e): overlay accumulation

**Setup.** Five years of corrections layered on a business. Dozens of patches per field over time: corrections, retractions, re-corrections, supersessions from accept-source resolutions. Two sub-attacks:

1. **Performance and the read seam.** F8-S1 applies the decision-store overlay on every serve. The store grows without bound; no member defines compaction, garbage collection, or a bound on overlay size. "Re-applied on every read" has no cost story. At five years the read seam composes hundreds of patches per object, including long-superseded ones it must evaluate to determine they are superseded. The family's durability story ("records are never deleted") is also its cost story, and the cost story is unwritten.
2. **Auditability of the stack.** F5-S3's pointer contract gives VALUE plus CLASSIFICATION plus EVIDENCE_REF. When forty patches touch the same field, which ref is "the" assertion? The pointer names one record, but the effective value is the product of a stack: the live correction, the retraction it replaced, the accept-source supersession and its actor. The audit question "why is this value effective?" has no defined answer. F8-S2's falsification (Attack C) showed post-resolution accounting is unspecified: accept-source deletes the patch (losing the history that would let a later keep-mine restore it) or leaves it, keep-mine leaves digests bound to a dead base. The family has no patch lifecycle states (active / superseded / retracted); F8 open question 4 asks for object-lifecycle states and gets no answer for patch-lifecycle states either.
3. **Retention vs durability tension.** F9-M1's storage layer is append-only in spirit ("even a resolved conflict keeps both observations"), but F9's falsification (M1 Attack 4) showed production retention TTLs delete conflicted observations, breaking the audit chain the family depends on. At five years, either the graph is unbounded (cost) or retention prunes it (auditability loss). The family forbids silent merging but permits silent deletion by TTL, which is the same information destruction through an operational door.

**Breakage per member:**
- F8-S1: weakened. Per-read composition is the cost center; no bounds, no compaction, no lifecycle states. Its "losing a correction would require deleting the decision store" sentence assumes the store is a small precious thing; at five years it is a large append-only log and "no code path can erase" has become "no code path can afford to read."
- F8-S2: weakened. Post-resolution store accounting is unspecified; supersession is either deletion (audit loss) or accumulation (cost). The merge's three inputs assume one overlay value per field; a stack is outside the model.
- F9-M1: weakened. Append-only preservation collides with retention reality; conflict-identity over time is undefined (M1 Attack 2: time-axis duplication), so five years of refetches may mean five years of duplicate CONFLICT records for one disagreement.
- F5-S3: weakened. The pointer contract is single-record; it cannot represent a stack. "Re-resolves every pointer" at five years means re-resolving against a graph whose relevant history may have been TTL-pruned.

**Does the merged abstraction survive?** As a logical invariant ("the overlay is re-applied; both values preserved"), yes. As an operable system, it degrades: the abstraction has no lifecycle, no compaction, and no cost bound, so "durable" drifts toward "unbounded" and "re-applied on every read" drifts toward "unaffordable to audit." **Merged verdict on (e): WEAKENED.** The abstraction needs patch lifecycle states and a defined read of "current correction" before its durability claim is honest at scale.

---

## 4. Pruned honest class claims for the merged family

After the five attacks, what the family can still honestly claim, per failure class, with scope attached:

- **#8 correction-loss: HOLDS in the instant, single-owner, stable-identity, in-band regime.** A re-dump or regen cannot silently overwrite an owner correction; the overlay is separate from the source layer, re-applied at read or regen, and source contradiction raises a named event. Degrades under: identity reorganization (b: intent lost while record persists), second actor (c: shadowing inside the store), time (d: the guarantee inverts into staleness preservation), out-of-band writers (F8-S4's attack, inherited: the family never bound the diff to its base).
- **#9 conflict-collapse: HOLDS for the source-vs-owner axis at regen time.** The disagreement becomes a typed event with both values visible and a named resolution path. Source-vs-source: storage-level only (F9-M1), with projection and answer seams belonging to other mechanisms. Owner-vs-owner: NOT COVERED; the family has no event, no adjudicator, no test. Unresolved-over-time: degrades into the cut version (silent owner-wins with a fading paper trail) until a lifetime policy exists.
- **#5 claim-binding: HOLDS only where the minting authority is authentic.** The pointer contract and digest binding are real instruments, but every authenticity-dependent claim inherits the unnamed trust root (a). Jurisdiction is unscoped: the family accepts structurally valid patches for things no owner should be able to assert. Pruned form: "corrections carry verifiable provenance (actor label, timestamp, digest-bound approval against a stated base); the actor label is currently demo-grade and the authority is unnamed."
- **#6 visibility-error: HOLDS in tested form for hide-facts across re-dump.** (F8 Step 7.) Not extended by this family beyond that; the record-vs-field visibility joint (F5 falsification A5) remains open.
- **#4 fixture-drift: NOT this family's claim.** (F8-S3's #4 claim was already struck in its own falsification; the family inherits the strike.)
- **Temporal scope, stated once:** every claim above is an instant-property claim unless a lifetime policy is added. The family currently has no clock, no expiry, no re-confirmation, no default. Any deployment reading these claims as durable-over-time is reading more than was proven.

---

## 5. Verdict on the merged mechanism: WEAKENED

The merged abstraction's mechanical core survives: typed identity-anchored records, a decision store the source pipeline cannot write to, overlay re-application, typed conflict events, no silent overwrite. Against its designed enemy (the refresh that clobbers judgment) it holds, in the instant, with one owner and stable identities.

It does not fall outright: none of the five attacks breaks the core invariant, and three of them (a, b, c) are scope findings rather than refutations. Attack (d) is the exception: on the time axis the abstraction is falsified, not merely weakened, because its timeless always-preserve policy is itself the staleness failure. Attack (e) shows the durability claim has no cost or lifecycle story.

The honest verdict is WEAKENED, with two structural repairs required before the class claims can be stated without scope qualifiers:

1. **Name the minting authority and its authentication, and scope correction jurisdiction.** Until then the strongest tier is mintable by anyone the pipeline trusts, and the family protects injections as faithfully as judgments. (Attack a; D3.)
2. **Add time to the abstraction: a conflict lifetime policy with a default and a clock, correction freshness or re-confirmation, and patch lifecycle states (active / superseded / retracted).** Until then the #8 claim inverts over time and the overlay accumulates without bound. (Attacks d, e; D1's missing third condition.)

And two contradictions to resolve inside the family: orphan semantics (F5-S3 fail-closed vs F8-S1 honored-orphan, D4) and the authority of the effective value (re-apply-on-read vs re-apply-on-regen idempotency, D2). Plus the missing third axis: owner-vs-owner needs a typed event and an adjudication rule, or the "nothing silently overwrites" sentence must be scoped to source-vs-owner only. (Attack c.)

---

## 6. The single strongest falsifiable test for the merged mechanism

**Name:** the hostile-lifetime gauntlet: two actors, one re-identification, one stale correction, N silent regens.

**Input:**
- A business object with phone field F. Base source: F = A.
- Actor Alpha (verified owner identity in the test harness) records correct-fact: F = C_alpha against base A, through the real override endpoint, with digest-bound approval.
- Actor Beta (a second claimant identity, distinct from Alpha) records correct-fact: F = C_beta against base A, through the same endpoint.
- New source fixture: the business object is re-emitted merged into a renamed object with a new id (absorbing the old id), and the source now says F = B, where B is the business's genuine new number (ground truth known to the harness but not to the system).
- A second field G carries a correction recorded 5 simulated years ago (harness-aged) that the new source contradicts with a currently-true value.

**Procedure:**
1. Run regeneration (three-way merge over base / new / overlay), then serve the site fresh with no code changes.
2. Run N further regen cycles (N = 10) with the source continuing to say B, with no owner resolution of anything.
3. Inspect after step 1 and after step 2: the effective value of F on the rendered page; the decision-store bytes (must be unmutated by regen); the event log; the owner task queue; the owner-facing surface (not just the log); the effective value of G.

**Expected observable outcome (what the merged abstraction promises):**
- F: a named OWNER_VS_OWNER_CONFLICT event exists (no silent last-write-wins between C_alpha and C_beta); the effective value is deterministic across serves with the conflict disclosed, not one claimant's value presented as settled.
- Re-identification: a named re-anchor event lists the new id as a candidate successor of the dead anchor; the merged object does NOT render with no owner decision attached; the orphaned patch on the dead id does NOT count as "honored" while its successor escapes.
- Source-vs-correction: SOURCE_CHANGED_AGAINST_OWNER_ASSERTION names A and B; both values remain visible; the losing value B is not deleted.
- After N silent regens: every conflict is still surfaced on the owner-facing surface (not aged into a log); the family's lifetime policy names its default and clock; the task queue has exactly one open task per conflict (dedup key excludes timestamps; no nag-spam, no duplicates).
- G: the harness knows the correction is stale and the source is true. The family must either surface the staleness (re-confirmation prompt, freshness flag) or its lifetime policy must have fired a named default. "Owner value still effective with no flag after 5 simulated years and 10 unanswered conflicts" is an observed outcome the test records.
- Decision store: byte-identical across all regens.

**What proves the merged mechanism DOESN'T work (any one falsifies):**
1. The effective F equals C_alpha or C_beta with no OWNER_VS_OWNER_CONFLICT event anywhere: silent overwrite on the third axis. The "nothing silently overwrites" sentence is false.
2. The merged object renders F with no owner decision while the old patch sits "honored" on the dead id: fail-open re-identification; intent lost, record kept, test green on the letter and red on the meaning.
3. After N regens, any conflict is findable only in an archived log and not on the owner-facing surface: the typed event decayed into the cut version (owner-wins-always with a fading paper trail).
4. The decision store was mutated by any regen step: the separation of layers is decorative.
5. Field G renders the 5-year-stale correction as settled fact with no freshness signal and no fired policy: staleness preservation, the mirror image of #8, with the family's full protection apparatus defending it.

**Why this is the strongest single test:** it exercises all five attacks in one run (minting is controlled by using two distinct harness identities, which also exposes that the family cannot tell them apart; re-identification breaks the anchor; the second actor breaks the overlay's single-value model; the aged correction breaks timelessness; N silent regens break event decay), and each falsification mode maps to one load-bearing sentence of the merged abstraction. A family that passes it has earned "nothing silently overwrites" without scope qualifiers. The current family, per sections 3 and 5, would fail modes 1, 2, 3, and 5 as specified.
