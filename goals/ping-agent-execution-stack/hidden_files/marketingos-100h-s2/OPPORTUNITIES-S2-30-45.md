# MARKETINGOS SPRINT 2, BLOCK 30–45 — OPPORTUNITY CANDIDATES + SCORING (2026-09-30)

Lane law: popular topic != good opportunity. A good opportunity is a demanded
question where we possess unusually useful evidence or can cheaply obtain it.
Scoring uses the plan's 13 information-gain factors, 0–5 each (CLAIM RISK and
PRODUCTION COST scored 5 = low risk / cheap). Max 65.

Anchors: S-4 (continuity-A slot unoccupied across 34 surveyed systems) is the
differentiation anchor; S-2 (trigger seal is class-bound, production sits
outside it) is the technical constraint any replayable-evidence opportunity
must reckon with. Audience: Cluster A (Nolan, fully observed) is the
operative approver model; Cluster B (external senior technical audience) is
honestly UNKNOWN — nothing below is framed on invented audience knowledge.

Cross-lane note: the 99-hour convergence program is running ecosystem
archaeology in parallel (Attio/Clay/Apollo/HubSpot/Veo/OpusClip/live-commerce).
C1 below overlaps the convergence lane's CRM archaeology (same systems, a
different question: they ask "which primitive to harvest," we ask "does any
have continuity-A"). Overlap recorded; no duplicated archaeology commissioned.
If the convergence lane's deep-harvest of Attio/HubSpot finds event-sourced
internals, C1's counterevidence section must be updated — recorded as a
dependency, not resolved here.

## ADVANCED (5)

### C1 — "Your audit log is not evidence: 34 CRM/agentic systems, zero replayable histories"

Signal anchor: S-4. Thesis: the industry converged on agents over snapshot
state; every surveyed system that claims auditability keeps an audit log on
mutable current-state storage. None can replay a past decision
deterministically from an immutable event plane. The honest version must
reckon with S-2: our own journal's trigger seal is class-bound and our
production role sits outside it — so the piece argues for the standard, not
that we have fully met it.

| factor | score | note |
|---|---|---|
| AUDIENCE DEMAND | 4 | senior eng care about auditability claims; compliance-adjacent |
| INFORMATION GAP | 4 | the 34-system scoreboard is new to most readers |
| EVIDENCE UNIQUENESS | 4 | our survey + our journal as contrast artifact |
| DEMONSTRABILITY | 3 | our chains demoable; vendors' internals are vendor-described |
| TECHNICAL DEPTH | 4 | event sourcing vs audit logging, replay semantics |
| CONTRARIAN DELTA | 4 | "your audit log is marketing" |
| PRACTICAL UTILITY | 3 | helps buyers ask better questions; not directly actionable |
| TIMELINESS | 4 | 2026 agentic CRM wave |
| BRAND RELEVANCE | 5 | core differentiation |
| FOLLOW-UP DEPTH | 5 | replay demo, immudb/QLDB comparison, cost of immutability |
| EVIDENCE QUALITY | 4 | survey graded; vendor-described caveats noted |
| CLAIM RISK | 3 | "zero continuity A" is survey-bounded; immudb/QLDB/EventStoreDB are live counterevidence |
| PRODUCTION COST | 4 | writing + diagrams; no new trials needed |
| TOTAL | 51/65 | **PICKED FOR DEEP RESEARCH** |

Pick rationale: highest brand/differentiation score of the set; the task's
designated anchor; and its counterevidence genuinely needs research
(immudb, Amazon QLDB, EventStoreDB, re-verification of survey grade-Bs),
which is what deep research is for. The S-2 reckoning is a required section,
not optional.

### C2 — "The seal that doesn't bind its maker" (WE WERE WRONG family)

Signal anchor: S-2. Thesis: we claimed read-only binds superusers (wrong),
added trigger seals (bind the wrong class for our own production role).
Demonstrated contrast: PG trigger append-only seals bind exactly non-owner,
non-superuser roles; replica mode and owner-drop bypass them; our Oracle app
role is superuser, so production holds by app discipline. Novelty: most
practitioners do not know `session_replication_role=replica` silences row
triggers.

Scores: demand 3 / gap 4 / uniqueness 5 / demonstrability 5 / depth 5 /
contrarian 4 / utility 3 / timeliness 3 / brand 5 / follow-up 4 /
evidence 5 / risk 4 / cost 4 = **54/65**. ADVANCED, queued #2.

Why not deep-researched first: its evidence is already in hand (U2 trial
matrix, verbatim). The deep-research marginal value is lower than C1's. It
goes to 45–60 as the follow-up evidence package, and its material doubles
as C1's mandatory S-2 reckoning section.

### C3 — "Source-faithful, business-false: template cruft and the trust boundary in web extraction"

Signal anchor: S-6. Thesis: projecting og:description verbatim is
source-faithful and business-false ("A&D Auto Parts" template cruft became a
business's description). Extraction pipelines need a source-vs-business
faithfulness distinction, not just a parse step.

Scores: demand 3 / gap 4 / uniqueness 4 / demonstrability 5 / depth 3 /
contrarian 3 / utility 4 / timeliness 3 / brand 3 / follow-up 3 /
evidence 4 / risk 4 / cost 4 = **47/65**. ADVANCED, queued #3. Timing note:
the FYD lane owns the fix; the story is strongest after the fix lands (fix
in hand = before/after measurement).

### C4 — "What deterministic replay would actually require"

Signal anchors: S-2, S-7. Thesis: define the guarantee honestly (same causal
history → same replay ordering → same canonical bytes → same hash → same
witness), then list what breaks it in a real system: superuser bypasses,
nondeterministic ordering, unlogged external effects. Our journal is the
worked example, gaps included.

Scores: demand 3 / gap 4 / uniqueness 3 / demonstrability 2 / depth 5 /
contrarian 3 / utility 2 / timeliness 3 / brand 5 / follow-up 4 /
evidence 3 / risk 3 / cost 3 = **43/65**. ADVANCED, borderline. Overlaps C1
— if C1's evidence package lands, C4 becomes a section of it, not a
standalone. Recorded as merge candidate.

### C5 — "Pre-register your database questions"

Signal anchors: S-1, S-7 (method residue). Thesis: every research question
ships with a stated prediction committed before research (brief committed
pre-trial, `claims_to_verify` with predicted verdicts). Standard in science,
rare in engineering marketing. Our U2 and sprint-1 missions are the demos.

Scores: demand 2 / gap 3 / uniqueness 4 / demonstrability 4 / depth 3 /
contrarian 3 / utility 3 / timeliness 3 / brand 4 / follow-up 3 /
evidence 4 / risk 4 / cost 5 = **45/65**. ADVANCED, queued #4. Weakest
demand of the advanced set; methodology pieces travel only if the demos are
sharp.

## REJECTED (5) — first-class deliverables

### R-C6 — "The queue nobody drains" (S-5)
REJECTED. D-F3 steelman applies directly: nobody outside the team cares
about our journal's intake queue. It is an internal ops ticket (wire a
consumer or stop auto-creating missions), not an evidence package; the fix
belongs to PING core, not MarketingOS. Score 32/65. Not carried.

### R-C7 — "Claim verdicts should be queryable from claim events" (S-1)
REJECTED. Engineering note, already fixed in 15–30. Zero external
information gain. Score 28/65. Not carried.

### R-C8 — "Correlation IDs: the boring contract that holds the chain" (S-7)
REJECTED as standalone. Implementation detail with D-F3 risk. Usable only
as supporting detail inside future pieces. Score 30/65. Not carried.

### R-C9 — "Counterparty risk in the 2026 agentic CRM stack" (harvest acquisitions)
REJECTED. Not our primary evidence: assembled from reporting on Common
Room→Zoom, Warmly→HubSpot, Qualified→Salesforce. Acquisition effects are
speculative; claim risk high (1/5); evidence uniqueness 1/5. Score 27/65.
Not carried. If the convergence lane's archaeology produces primary
evidence, revisit.

### R-C10 — "Governance theater: zero approvals through a live authority" (S-8)
REJECTED for now. The story arrives after the first real approval is
exercised through the authority — premature today, and publishing "we built
governance nobody uses" without the follow-up is self-own without payoff.
Score 30/65. Carried as a watch item for post-first-approval, not as a
candidate.

## Block state

- 10 candidates generated, scored on all 13 factors, 5 advanced / 5 rejected
  with reasons. Rejections recorded above, not silently dropped.
- Deep research commissioned on C1 (worker brief: novelty detector with
  counterevidence required; S-2 reckoning mandatory; convergence-lane
  overlap recorded).
- Queue for 45–60: C2 (evidence largely in hand), C3 (after FYD fix),
  C5 (if demos stay sharp). C4 merges into C1 unless it earns standalone.
- Watch: R-C10 revives after the first real approval.
