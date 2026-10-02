# CORRECTION IDENTITY: identity authority specification for FYD corrections

**Date:** 2026-09-23. **Mode:** research only. No implementation code.
**Position in the challenge:** identity is the load-bearing unsolved problem under the whole correction-persistence family (F8-S1, F8-S2, F8-S3, F8-S4, F5-S3, F9-M4). F8's falsification and the MERGED correction falsification both land on it: the anchor (object id + field path) is assumed stable, and every mechanism built on it is exactly as strong as that assumption.

**Constitutional note:** SOUL.md section 6 declares one identity authority as a constitutional rule (IdentityAuthority owns identity generation). The D1 duplicate adjudication in ARCHAEOLOGY-SUPPLEMENT.md orders the split killed and one owner kept among the three declared identity authorities, with the emit hot path calling the chosen owner. Nothing in this document invents a second identity scheme; it specifies what the single authority must be able to do when the identities it mints are consumed by FYD corrections.

---

## 1. Failure-mode enumeration, with test coverage per mode

Each mode names what happens to the anchor, then names which survivor tests cover it and which do not. "Covers" means the test as written would fail on the attack; "partially" means it detects something but does not resolve or names the wrong outcome.

### 1a. Merge: two objects become one under a new id

**Shape:** the source re-dump re-emits hidden service s1 (old id `website-service-51de038c1defe8bd`) merged into a renamed object s3 ("Pergola & Patio Design Services") with a new id, absorbing the old id. The hide patch on the old id has no live target; the successor renders with no owner decision attached.

- F8-S1 test: DOES NOT COVER. Its vanish-case disjunction ("stays honored or raises a named state") is satisfied by honoring the orphan on the dead id while the successor escapes visible. The test passes while the owner's intent is defeated. This is the falsification's S1 Attack A.
- F8-S3 test: partially covers. The golden anchor for the hide dangles, so the suite fails loudly and blocks the regen. Detection without resolution: the gate names the loss but has no re-anchor protocol, and its rot vector (FAIL-8-falsification Attack A) means a legitimate owner retraction of the hide produces the same red gate.
- F8-S2 test: DOES NOT COVER. The three A/B/C modes assume the field and object identities are continuous; a re-identified object is absent from the base under its new id, so the overlay has no anchor and the merge silently drops the correction.
- F8-S4 test: DOES NOT COVER. The diff sees s3 as "added" and s1 as "vanished," two unrelated events; nothing joins them into one reorganization.
- MERGED gauntlet test: covers. Its re-identification branch expects a named re-anchor event with candidate successors, and falsifies on "merged object renders with no owner decision while the old patch sits honored on the dead id."

### 1b. Split: one object or field becomes two

**Shape:** the extractor splits the single phone field into "office phone" and "mobile phone," or one service object splits into two offerings. The correction anchors to the old field path or the old object id. The successors are both plausible targets; the mechanism has no answer.

- F8-S1 test: DOES NOT COVER. Split is never run; whatever the composition happens to do (attach to one successor silently, to both, to neither) is unspecified and untested.
- F8-S2 test: DOES NOT COVER. The overlay model is one decided value per field; two successors is outside the merge's input model.
- F8-S3 test: partially covers. The golden anchor dangles and the suite fails, but the failure names "anchor lost," not "anchor split into candidates A and B," so the owner cannot resolve it from the diagnosis.
- F8-S4 test: DOES NOT COVER. The diff sees two "added" objects and one "vanished" object, never the split relation.
- MERGED gauntlet test: partially covers. It runs a merge and an id change but not a field split; the falsifier for silent single-successor attachment is written for the merge case and would need the same branch for splits.

### 1c. Rename: same content, new label, possibly new id

**Shape:** the object keeps its content but the source renames it ("Pergola Design Consultations" becomes "Pergola & Patio Design Services"), with or without an id change. This is the Pergola case from F8-S1 Attack A. When the id changes, rename collapses into merge-by-one; when the id stays, byte-level diff sees a field change but the correction's anchor is intact.

- If the id is stable: all four F8 tests cover it, because anchoring is by id string and the id never moved. F8-S4 names the field change; F8-S2's conflict event can fire on the renamed value.
- If the id changes with the rename: coverage collapses to the merge case (1a). No F8 test covers it; only the MERGED gauntlet's re-anchor branch does.
- The strengthened F8-S1 test 1 (merge/split re-anchor test) covers it when the rename is treated as a re-identification: it expects the named re-anchor event listing candidate successors.

### 1d. Re-identify-by-source: same real-world entity, new source id, no continuity signal

**Shape:** the source re-emits the business or the service with a different id and no indication it is the same entity. The anchor dies with no lineage.

- F8-S1 test: DOES NOT COVER; the honored-orphan branch of the disjunction explicitly blesses this outcome.
- F8-S3 test: partially covers (dangling golden anchor fails loudly, no re-anchor path).
- F8-S2 test: DOES NOT COVER (overlay has no anchor; correction silently drops from effective output).
- F8-S4 test: DOES NOT COVER ("added" with no old values; the resurrection blind spot from FAIL-8-falsification Attack C).
- MERGED gauntlet test: covers. Falsifier 2 is written for exactly this: merged object rendering with no owner decision while the old patch sits "honored" on the dead id is explicit falsification.

### 1e. Anchor rot: ids churn slowly across re-dumps

**Shape:** no single dramatic merge. The extractor recomputes ids per dump, or small content edits change content-derived ids, so anchors match on dump N and miss on dump N+3. The correction degrades gradually: first it applies, then it dangles, then it is a honored orphan nobody notices because nothing failed loudly on any single regen.

- F8-S1 test: DOES NOT COVER. Each individual re-dump looks like the tested vanish/value-change path; the rot is only visible across the sequence, and no test runs a sequence.
- F8-S3 test: partially covers, weakly. The golden suite fails at the dump where the anchor first dangles, but only for golden-covered corrections; a real owner correction on a non-golden field rots silently (FAIL-8-falsification Attack B: coverage rot).
- F8-S2 test: DOES NOT COVER; merge-time only.
- F8-S4 test: DOES NOT COVER; the diff is computed per regen pair and has no memory of identity drift across pairs.
- MERGED gauntlet test: partially covers. The N-silent-regens branch (N=10) would catch rot if the fixture churned ids across the sequence, but as written the fixture holds the re-identification constant across N regens; the id sequence is static, not drifting.

### 1f. Id churn across re-dumps: anchors never match by construction

**Shape:** the extractor mints fresh ids on every dump (timestamps in identity material, per-run counters, hash of the whole dump). No anchor from dump N can ever resolve on dump N+1. This is the limiting case of 1e: not gradual rot but total anchor failure from the first re-dump.

- F8-S1 test: DOES NOT COVER. It falsifies on "effective phone becomes the new source value," so churn would produce a loud failure, but the test treats it as a mechanism bug, not as an identity-authority precondition violation. The test assumes ids are stable across dumps; churn violates the assumption the test never states.
- F8-S2, F8-S3, F8-S4 tests: DO NOT COVER, for the same reason. F8-S3 would fail on every dangling golden anchor, which is the suite correctly reporting that the identity regime it assumed does not exist.
- This mode attacks the load-bearing assumption of the whole family, not any one mechanism: every member anchors by id string, so total churn falsifies "identity-anchored" as a family property. Only an authority that can re-anchor by content (section 2, content-derived fallback) or that mints the ids itself (section 4, open decision 1) survives this mode.

### 1g. Multi-tenant id collision: same id, different businesses

**Shape:** two tenants' sources emit the same local id for different real-world objects (source ids are not tenant-scoped: "service-123" in two businesses). A correction recorded against tenant A's object is addressed by id only, so it applies to tenant B's object at read or regen time. The correction bleeds across businesses.

- F8-S1 test: DOES NOT COVER. The test fixture is single-tenant; the decision store file is tenant-local by path (`data/fyd-owner/<business>.json`), which scopes storage but not addressing: if the overlay lookup keys on id alone within a shared graph, the file boundary does not save it.
- F8-S2, F8-S3, F8-S4 tests: DO NOT COVER. All fixtures are single-tenant; collision is never constructed.
- MERGED gauntlet test: DOES NOT COVER. It uses two actors on one business, never two businesses with colliding ids.
- Note from the archaeology: PING's LIVE identity is mission-scoped and tenant questions sit on the unknown list (ARCHAEOLOGY-SUPPLEMENT.md: TenantRegistry enforcement unverified, area 18 capability model dormant). The FYD correction store has no tenant-scoping contract written down anywhere. This is the only mode in this section with zero coverage in any test.

### Coverage summary table

| Mode | F8-S1 test | F8-S2 test | F8-S3 test | F8-S4 test | MERGED gauntlet |
|---|---|---|---|---|---|
| 1a merge | no (disjunction hole) | no | partial (loud fail, no re-anchor) | no | yes |
| 1b split | no | no | partial (dangle, no diagnosis) | no | partial |
| 1c rename, id stable | yes | yes | yes | yes | yes |
| 1c rename, id changed | no | no | partial | no | yes |
| 1d re-identify-by-source | no (orphan blessed) | no | partial | no | yes |
| 1e anchor rot | no (single-instant) | no | partial, golden only | no | partial (static id sequence) |
| 1f total id churn | no (assumption unstated) | no | no (fails as bug, not regime) | no | no |
| 1g multi-tenant collision | no | no | no | no | no |

The pattern: the family tests cover value change and object vanish under stable ids. Every mode that moves the identity itself (merge, split, rename-with-id-change, re-identification, rot, churn, collision) is uncovered or only partially covered. The uncovered region is exactly the identity authority's jurisdiction.

---

## 2. The identity authority contract

What a correction anchor must be for the family's guarantees to hold outside the stable-identity regime. An anchor is not an id string. It is a resolution claim the authority stands behind.

### 2.1 Anchor structure

A correction anchor carries four components, and the authority guarantees resolution semantics for each:

1. **Tenant scope.** The tenant (business) the anchor belongs to, as a first-class component of the address, not as a file-path convention. Two anchors with equal local ids and different tenant scopes are different anchors by construction. This closes 1g: cross-tenant id equality is meaningless, so a correction can never bleed across businesses through id collision.
2. **Entity lineage handle.** A stable handle for the real-world entity (the business, the service) that survives merge, split, rename, and re-identification. The handle resolves to a lineage chain: a sequence of (source id, observed range, re-identification event) records. Merge and split are recorded as lineage events (MERGED_FROM [ids], SPLIT_FROM [id]), not as id replacements. This closes 1a, 1b, 1c, 1d: the correction addresses the lineage handle, and the authority resolves the handle to the current source id(s) at read or regen time.
3. **Field path.** The field within the entity, unchanged from the current design (object id + field path becomes lineage handle + field path).
4. **Content-derived fallback key.** A content hash or content signature of the anchored entity at correction time (name, category, contact points, normalized). When the lineage handle cannot resolve (total id churn, 1f; re-identification with no recorded lineage, 1d), the authority attempts re-anchoring by content match with a stated confidence threshold. Above threshold: re-anchor, emitting a named REANCHORED_BY_CONTENT event with the match evidence. Below threshold: the anchor enters a named UNRESOLVED_ANCHOR state (section 2.3), never silently dropped and never silently attached to the best guess.

### 2.2 Required authority behaviors

- **Re-anchoring protocol.** On every re-dump, before the overlay is applied, the authority resolves each anchor: live lineage handle to current id(s); merge yields a named REANCHOR_REQUIRED event listing candidate successor ids; split yields a named SPLIT_SUCCESSORS event and does not attach the correction to any successor until the adjudication rule (section 4, open decision 2) resolves it. "Honoring" a patch on a dead handle while a successor renders uncorrected is defined as falsification, closing F8-S1's disjunction hole.
- **Lineage as events.** Re-identification is recorded in the append-only journal as a typed event, not as a rewritten record. The journal already has the shape (ARCHAEOLOGY-SUPPLEMENT.md: content-addressed event IDs, ON CONFLICT DO NOTHING, no-FORGET by design). A merge is then auditable: which ids merged, when, observed by which re-dump.
- **Single composition point.** The overlay applies at exactly one seam against authority-resolved anchors, resolving the F8-S1 vs F8-S2 disagreement (re-apply-on-read vs re-apply-on-regen) by making resolution idempotent: resolving a lineage handle twice yields the same current id(s), and applying an already-applied patch is a no-op by patch id. Idempotency is stated and tested, not assumed (this was the MERGED D2 finding).
- **Orphan-state taxonomy.** The authority owns the answer F5-S3 and F8-S1 disagree on (MERGED D4): an anchor that cannot resolve is exactly one of TARGET_VANISHED (fail closed: the claim is omitted and flagged, per F5-S3; for a hide-fact the object stays hidden), REANCHOR_REQUIRED (merge/split candidates exist; correction held, never applied to a guess), or UNRESOLVED_ANCHOR (no lineage, content match below threshold; correction held, surfaced to the owner). "Honored on a dead handle" is not a state.

### 2.3 The named UNRESOLVED states

The falsifiable test in section 3 requires these states by name. The authority must be able to raise, persist, and surface each:

- `REANCHOR_REQUIRED`: lineage indicates the entity reorganized; candidate successors listed; correction held unapplied.
- `SPLIT_SUCCESSORS`: one anchor, multiple candidate successors; which successor inherits the correction is undecided.
- `UNRESOLVED_ANCHOR`: no lineage and content match below threshold; correction held; the owner is the only resolver.
- `TARGET_VANISHED`: the entity is gone from the source with no successor signal; fail closed per F5-S3 semantics.
- `ANCHOR_TENANT_MISMATCH`: a lookup presented an id valid in another tenant scope; refused, logged.

None of these may decay silently into "honored" or into dropped. Their lifetime is governed by the conflict-lifetime policy the family still owes (F8 open question 3, FAIL-9 Q2): each state needs a default and a clock, or the UNRESOLVED states become the cut "owner-wins-always" arriving through the back door, the same decay F8's falsification diagnosed in S2.

---

## 3. LIVE vs FYD-new: what PING already provides and what must be invented

### 3.1 LIVE in PING today (reuse, do not rebuild)

From ARCHAEOLOGY-SUPPLEMENT.md, lane-19-verified:

- **Content-addressed event IDs.** `event_id = SHA-256({eventType, source, ...})`, no `Date.now()` in identity material, re-emit resolves to the same ID, `ON CONFLICT DO NOTHING`, 2321 rows live. The structural pattern the correction family needs for lineage events and for patch ids: a re-emitted correction or re-identification resolves to the same record instead of duplicating. This is the proven dedup primitive; patch identity and lineage-event identity should be derived the same way.
- **Deterministic mission identity.** `mission_id = sha256(missionType + ':' + event_id)`; `INSERT ... ON CONFLICT (mission_id) DO NOTHING`; 144/144 completed live. The proof that deterministic, write-once identity works in production and kills shadow identity schemes (the D5 adjudication). Any entity-identity derivation should follow this shape: pure function of stable inputs, conflict-safe insert.
- **Append-only journal, no-FORGET by design.** The base shape the correction family already leans on: corrections as records, not edits. Lineage events (merge/split/re-identification) belong in this journal, not in a mutable id-mapping table.
- **Evidence binding.** `EvidenceAuthority.verify()` (hash recompute + `source_event_id` trace-back), memory write provenance (`source_event_id` + `canonical_hash` + namespace). The correction patch's digest-bound approval (baseStateDigest, baseViewDigest, patchDigest) is the FYD rendering of this pattern; the authority's lineage events should carry the same binding (which re-dump observed this reorganization, against which base digest).

### 3.2 FYD-new (no PING analog; must be designed)

The archaeology is explicit (ARCHAEOLOGY-SUPPLEMENT.md, #8 row): "the hard half (re-anchoring a correction when its node ID goes stale on source change) is flagged open in the FAIL reports and has no LIVE analog." Specifically new:

- **Business-entity identity across source re-dumps.** PING's deterministic identity is minted once from the triggering event and never has to survive re-observation. A FYD entity (a service, a phone field) is re-observed on every re-dump under ids the source controls. Continuity of a real-world entity through merge, split, rename, resurrection, and id churn is a new identity problem: it is re-identification over time, not mint-once identity.
- **The re-anchor protocol.** Resolving a lineage handle to current source ids, emitting REANCHOR_REQUIRED with candidate successors, content-derived fallback with a threshold, UNRESOLVED states with owner routing. No PING machinery does this.
- **Orphan-state taxonomy and its lifetime policy.** The named states in 2.3, plus the default-plus-clock the family owes. PING's UNKNOWN_EXECUTION semantics (area 7, D8) are the reference shape for first-class unknown states, but the states themselves and their clocks are FYD-new.
- **Tenant-scoped addressing.** The (tenant, local-id) pair as the atomic address unit. PING's TenantRegistry enforcement is unverified (unknown list #7) and the capability model is dormant (area 18); FYD cannot inherit a tenant contract that is itself unproven, so the correction authority must state its own.
- **Content-derived fallback.** Using content similarity to re-anchor when ids churn. This has no PING analog and carries its own threshold policy (section 4, open decision 3). The honest scope: it is a bounded recovery mechanism with a stated false-attachment rate, not an identity primitive.

### 3.3 The boundary, stated once

PING provides: how to mint an id so it never duplicates, how to record an event so it is never forgotten, how to verify a claim against its source. PING does not provide: which real-world entity an id refers to after the source reorganizes, or what to do when the referring breaks. The identity authority's jurisdiction starts exactly where PING's ends: at the first re-dump that changes an id.

---

## 4. Falsifiable test for the identity authority

**Name:** the hostile re-identification gauntlet.

**Input:**
- Fixture business with: phone field P (owner correct-fact recorded against base value A, value C), email field E (owner confirm-fact), service s1 (owner hide-fact), service s2 (no correction).
- Tenant B fixture with an object carrying the same local id as s1 (collision probe for 1g).
- Decision store with the three patches, digest-bound approvals, actor labels.

**Procedure:**
1. Run a hostile re-dump through the real pipeline: s1 and s2 merged into s3 with a new id (absorbing content of both); P split into "office phone" and "mobile phone"; the business object re-emitted under a new id with no continuity signal; s1's local id reused in tenant B for an unrelated object. Record the re-dump as lineage events where the authority claims to detect reorganization.
2. Run the authority's re-anchor protocol, then serve the site fresh with no code changes.
3. Inspect: effective values on the rendered page; the named event log; the UNRESOLVED-state surface; the decision-store bytes; tenant B's rendered page.

**Expected observable outcome:**
- s3 does NOT render with no owner decision attached. Either the hide re-anchors to s3 via a named REANCHOR_REQUIRED resolution with lineage evidence, or a REANCHOR_REQUIRED state is raised listing s3 as the candidate and the correction is held unapplied. The old patch sitting "honored" on the dead s1 id while s3 renders visible is explicit falsification.
- P's correction does not silently attach to "office phone." A SPLIT_SUCCESSORS state names both successors; the effective phone is either the held correction disclosed as contested or the resolved successor per the stated adjudication rule, never an unattributed single-successor attachment.
- The business object under the new id: corrections re-anchor by content fallback with a named REANCHORED_BY_CONTENT event carrying match evidence, or UNRESOLVED_ANCHOR is raised. The correction never silently dies and never silently attaches below threshold.
- Tenant B's object with the colliding id is unaffected by tenant A's hide: the hide does not suppress it, and an ANCHOR_TENANT_MISMATCH refusal is logged if the lookup was ever attempted cross-scope.
- Decision-store bytes are identical before and after; the lineage events exist in the append-only journal with content-addressed ids (re-running the re-dump resolves to the same lineage records, no duplicates).

**Falsifier (any one falsifies the authority):**
1. Any correction ends up "honored" on a dead handle while its successor renders uncorrected. Record durability with intent loss is the precise failure this authority exists to prevent.
2. A successor inherits a correction with no named event: silent re-anchoring is silent overwrite by another name.
3. The content fallback attaches below its stated threshold, or attaches with no REANCHORED_BY_CONTENT event: the fallback is a guess wearing an authority's uniform.
4. Tenant B's object is hidden or altered by tenant A's correction: the tenant scope is decorative.
5. Any UNRESOLVED state is findable only in a log and not on the owner-facing surface after the protocol runs: the state exists for the test harness, not for the owner.

**Why this test and not the survivors':** every survivor test assumes the anchor resolves and tests what happens next. This test assumes the anchor breaks and tests the authority itself. It is the only test in the family whose input violates the family's load-bearing assumption on purpose.

---

## 5. Open decisions

Each is framed as a question with the cost of each answer. None is resolved here; resolving by fiat would repeat the error the falsification game exists to catch (a mechanism is exactly as strong as its test's imagination, and an unpriced decision is an untested assumption).

### Q1. Who mints entity identity: the source, the pipeline, or the owner?

- **The source mints it** (current de facto: extractor-assigned ids like `website-service-51de038c1defe8bd`). Cost: the extractor becomes an unreviewed identity authority; every extractor change is a silent re-identification event; mode 1f (total churn) is always one refactor away and the correction family cannot distinguish it from a legitimate reorganization. Benefit: zero new machinery; ids arrive with the data.
- **The pipeline mints it** (deterministic derivation from stable entity keys, PING's `mission_id` shape: pure function of stable inputs, conflict-safe). Cost: someone must define the continuity function (which inputs are stable across re-dumps?); content-derived ids risk collision and need the threshold policy of Q3; a wrong derivation function bakes misidentification into the foundation. Benefit: the authority controls the identity regime instead of inheriting the source's; 1f becomes impossible by construction.
- **The owner mints it** (owner confirms "this re-observed object is the same entity"). Cost: the owner cannot mint before first observation, so every new entity starts identity-less; owner-minted ids rest on the unnamed trust root (MERGED Attack a: demo-grade actor identity), so a spoofed owner can mint false continuity; it does not scale to entities the owner never looks at. Benefit: only the owner knows the real world; owner-confirmed continuity is the highest-fidelity signal available.

### Q2. On a contested merge or split, who adjudicates and what is the default?

- **Auto-resolve by content similarity.** Cost: the threshold decides real disagreements silently; a wrong auto-merge attaches corrections to the wrong successor with full authority dressing (Q3's false-attachment cost, automated).
- **Freeze: hold all affected corrections as REANCHOR_REQUIRED until resolved.** Cost: paralysis scales with reorganization frequency; an entity that merges often keeps its corrections permanently held, which is correction loss by another name (the family would be failing #8 while honoring every record).
- **Owner adjudicates.** Cost: the owner is frequently absent (F8 open question 3: unresolved conflicts sit forever); without the default-plus-clock the held state decays into silent owner-wins or silent source-wins, the exact decay F8's falsification diagnosed in S2. Benefit: the only adjudicator with ground truth.

### Q3. What sets the content-fallback similarity threshold, and what happens in the gray zone?

- **Low threshold (re-anchor aggressively).** Cost: false attachments; a correction lands on the wrong entity and the rendered page states it as the owner's judgment, which is #5 (claim-binding) failing with provenance attached.
- **High threshold (go UNRESOLVED aggressively).** Cost: UNRESOLVED_ANCHOR states accumulate; the owner faces a queue of identity triage instead of a working site; per Q2's freeze cost, this is paralysis with better labeling.
- **Threshold per entity type or per field.** Cost: a policy surface that must be maintained, versioned, and explained; every new entity type needs its threshold argued. Benefit: phone numbers (near-exact match is meaningful) and service descriptions (fuzzy match is treacherous) genuinely need different bars.

### Q4. Does the authority guarantee tenant scoping, or trust sources to scope their ids?

- **Authority guarantees (tenant, local-id) pairs.** Cost: every import needs a tenant-binding step; re-imported sources must be re-bound; a mis-bound import silently partitions one business's corrections away from its data (correction loss through correct scoping, the mirror image of the bleed). Benefit: mode 1g is impossible by construction.
- **Trust the source's ids as scoped.** Cost: the first colliding source bleeds corrections across businesses, which is both an integrity failure and a privacy failure (tenant A's hide suppresses tenant B's offering). There is no test anywhere in the family that would catch it (section 1g: zero coverage).

### Q5. How long do lineage events live, and can they be deleted?

- **Forever (append-only, no-FORGET).** Cost: unbounded growth; echoes MERGED Attack e (overlay accumulation): at five years the lineage journal is large, re-anchor resolution walks long chains, and "durable" drifts toward "unaffordable to audit." Benefit: a correction from years ago can always be re-anchored; anchor rot by retention policy is impossible.
- **Pruned by retention TTL.** Cost: pruning a lineage chain severs the re-anchor path for old corrections; the correction then dies the next time its entity reorganizes, silently, which is #8 arriving through the retention door (F9-M1's falsification M1 Attack 4 named exactly this shape: production TTLs delete what the audit chain depends on). Benefit: bounded storage and bounded resolution cost.
- **Compaction (summarize chains, keep endpoints).** Cost: compaction is a lossy transformation of the audit trail; the summary's fidelity becomes a new thing to verify, and a wrong summary mis-anchors. Benefit: bounded growth without severing the path, if the summarization is proven.

### Q6. Which orphan semantic is the family rule: fail-closed (F5-S3), honored-orphan (F8-S1's test), or fail-loud-block (F8-S3)?

- **Fail-closed (claim omitted and flagged).** Cost: for correct-facts the field renders nothing, a visible degradation; an owner who does not read flags sees a hole where their correction was. Benefit: never renders an unanchored judgment as settled; the failure is visible.
- **Honored-orphan.** Cost: this is the disjunction hole; under merge it defeats intent while passing tests. Keeping it requires restricting it to the true-vanish case (TARGET_VANISHED with no successor signal), which is exactly the taxonomy of section 2.2. Benefit: hide-facts on genuinely deleted objects stay honored with no owner action.
- **Fail-loud-block (regen refused until resolved).** Cost: one reorganized entity blocks the whole business's regen; availability of the entire site depends on the least stable entity's identity. Benefit: nothing ships unanchored, ever.

### Q7. Who sees UNRESOLVED states, and on what clock do they resolve?

- This is F8 open question 3 and FAIL-9 Q2 restated for the identity authority: a REANCHOR_REQUIRED or UNRESOLVED_ANCHOR state with no surfacing obligation and no default-plus-clock is the cut "owner-wins-always" arriving through the identity door. The costs mirror Q2: auto-defaults decide silently, freezes paralyze, owner-only resolution waits forever. The decision is listed here because the identity authority is where the clock must live: the state is raised by the authority, so the authority owns its lifetime, not the merge policy and not the task queue.

---

## 6. What this document does not claim

- It does not resolve the disagreements catalogued in MERGED-correction-falsification (D1 owner-wins-ties vs keep-both-visible, D2 re-apply-on-read vs re-apply-on-regen, D3 unnamed minting authority, D4 orphan semantics). It gives the identity authority a defined jurisdiction and a test, and it prices the decisions that would resolve them.
- It does not claim the content-derived fallback is safe at any particular threshold. The fallback is specified as a bounded recovery mechanism with a stated false-attachment rate, and Q3 exists because the rate is the policy.
- It does not claim PING's LIVE identity machinery covers any of this. Section 3 draws the boundary explicitly: PING mints and remembers; the authority re-identifies. The reuse is structural (content-addressed ids, append-only journal, evidence binding), not functional.
- Every claim about survivor test coverage in section 1 is grounded in the four source documents read for this task (FAIL-8-correction-loss.md, FAIL-8-falsification.md, MERGED-correction-falsification.md, ARCHAEOLOGY-SUPPLEMENT.md). Coverage marked "partial" names the exact limitation; coverage marked "no" names the missing probe.
