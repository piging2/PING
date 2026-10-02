# WAVE-1 SURVIVOR: LANE-14 Handoff Contract (with M20 typed handoff states)

**Mechanism library entry. Date: 2026-09-23. Research only. No implementation.**
**Status: SURVIVES the >=2-of-9 gate. The only wave-1 mechanism family to do so.**
**Source: LANE-14 (context engineering), section 3 centerpiece plus M20.**

---

## Name

**Handoff Contract** (LANE-14 section 3), including **M20 typed handoff failure states** (`M20-TYPED-HANDOFF-STATES`).

## How it works

Every worker boundary is crossed by a typed, schema-fixed packet, never by free prose. A handoff packet is valid iff it carries all 17 fields below. "Minimal" is defined by the lane as: remove any one field and a named failure case (F1-F12) becomes possible again.

```
HANDOFF_PACKET v1
  packet_id:            stable ID (uuid)
  mission_id:           correlation ID for the whole mission
  from_worker / to_role: who wrote it, who should read it
  generation:           integer; increments per rewrite
  source_span:          [first_event_id, last_event_id] covered; MUST reference the log, never a prior packet
  observed_at:          wall-clock time of writing (for staleness math)
  status:               typed state (see below)
  goal_verbatim:        the original task text, copied exactly (F1)
  state:                { done: [...], in_flight: [...], next_action: "..." } with artifact pointers (F6)
  decisions:            [{ choice, rationale, rejected_alternatives_with_why }] (F3)
  open_failures:        [{ exact_error_or_observation, location, attempted }] (F2)
  evidence:             [{ claim, source_pointer, digest, observed_at }] (F4)
  artifacts:            [{ path_or_id, digest, kind }] (F9)
  authorizations:       [{ scope, granted_by, expires_at }] (F5)
  constraints:          [verbatim non-paraphrasable rules] (F8)
  recovery_rule:        prescribed next action for `status`; default: fail closed (F7)
  open_questions:       questions the successor must answer before proceeding
  notes_for_successor:  free-text pressure valve, budgeted (one escape hatch)
```

### The typed states (M20)

M20 argues six typed failure states, each with a prescribed safe next action:

1. **INVALID** - artifact violates the contract. Action: reject, record field-level error.
2. **INCOMPLETE** - required work or evidence missing. Action: request it or escalate.
3. **STALE** - evidence or authorization expired. Action: re-read source or get fresh approval.
4. **CONFLICTING** - two workers' claims incompatible. Action: preserve both sources, route to resolver/human.
5. **BLOCKED** - policy or dependency prevents progress. Action: stop, explain, notify owner.
6. **RETRYABLE** - transient dependency failed. Action: retry within an external budget, then fail visibly.

The packet schema lists a seventh value, **OK** (nominal success). Caveat: DELETE-OUR-NEED records the six-vs-seven discrepancy as unresolved in the sources. The benign reading is that OK is the success value and the six are the failure vocabulary; the sources never state this explicitly, so it is recorded here as an open discrepancy, not resolved.

### The nine operating rules (section 3.3)

1. **Build from the log, never from a packet.** A generation-N packet is built by reading `source_span` from the event log, not by summarizing the generation-(N-1) packet. Recursive summarization compounds error (F10).
2. **Pointers, not copies.** Artifact and evidence bodies stay in the store; the packet carries pointers plus digests. A digest mismatch on re-fetch means treat as STALE.
3. **Verbatim where it matters.** GOAL_VERBATIM and CONSTRAINTS are copied character-for-character. Everything else may be distilled.
4. **Typed status or it did not happen.** A packet without a valid `status` is INVALID. The receiver validates first, acts second.
5. **Stale is mechanical.** Any field with `expires_at` < now, or whose source digest changed, flips the packet (or that field) to STALE. Safe action is re-read or fresh approval, never proceed-and-hope.
6. **Conflicts are carried, not resolved silently.** Two incompatible claims ride along as a conflict with both provenances. Resolution is a recorded decision with a stated rule.
7. **Budgeted.** Target: the packet is 1-5% of the source_span it covers. If it exceeds budget, the span is too wide; narrow it (more frequent checkpoints), do not bloat the packet.
8. **Placed at the edges.** Goal first, packet last in the successor's prompt.
9. **Written before dispatch, read before acting.** Outbound packets are generated before spawning the successor; the successor's first act is validation against this contract, not work.

### The 12 failure cases it was argued from (section 3.1)

Each field exists because an observed failure demanded it; nothing is here from intuition.

| # | Failure case (observed) | What died | Field that prevents recurrence |
|---|---|---|---|
| F1 | Context saturation drops early messages; successor drifts from the goal while sounding confident | The goal | GOAL_VERBATIM: original task text, copied, never re-derived |
| F2 | Compaction eats exact error messages, variable names, line numbers | Debuggability | OPEN_FAILURES: each unresolved failure with the exact artifact, not a summary |
| F3 | Compaction eats rejected alternatives and their rationale; successor re-tries the dead end | Weeks of compute | DECISIONS: accepted AND rejected, each with one-line rationale; user corrections are Irreplaceable |
| F4 | Two workers return incompatible claims; the synthesizer picks one silently | Truth | EVIDENCE: pointers (source + digest + observed-at), never conclusions alone; conflicts carried as conflicts |
| F5 | An approval or credential expires mid-mission; the successor acts on a dead authorization | Authorization | AUTHORIZATIONS: scope + expiry, machine-readable; expired means do not proceed |
| F6 | Worker dies mid-write; the successor cannot tell what completed | Idempotency | STATE: done / in-flight / next-action, with artifact pointers + digests so the successor verifies rather than trusts |
| F7 | Receiver improvises a new path after a failure | Mission integrity | STATUS + RECOVERY_RULE: prescribed next action for the state; unknown means fail closed |
| F8 | Load-bearing standing rules get paraphrased away by summarizers | Compliance | CONSTRAINTS: verbatim rules that must survive, marked non-paraphrasable |
| F9 | Successor cannot re-fetch what the summary mentions | Recoverability | ARTIFACTS: every referenced file/record/event by path-or-ID + content digest; the digest is the integrity check, the pointer is the re-fetch |
| F10 | Summaries of summaries compound staleness and error | Fidelity over time | GENERATION counter + SOURCE_SPAN; a packet may only be built from the log, never from a previous packet |
| F11 | The next reader needs one field, re-reads everything | Reader tokens | Schema-fixed sections so a successor can read selectively |
| F12 | The handoff's key content sits mid-prompt and is under-attended (position burial) | Attention | Placement rule: GOAL first, packet last; never bury the packet mid-context |

The lane notes convergence as corroboration: five independent sources (OpenHands, the Claude Code teardown, the ramparte playbook, the agent-handoff skill, the manola posts) describe the same handoff shape.

---

## Prevented failure classes (gate re-verification below)

**#9 conflict-collapse.** Rule 3.3.6 requires conflicts to be carried with both provenances, and CONFLICTING is a first-class status whose prescribed action is "preserve both sources, route to resolver/human." Combined with rule 3.3.4 (a packet without a valid status is INVALID) and rule 3.3.9 (the successor's first act is validation, not work), two workers' incompatible claims cannot be silently merged at the handoff: the merge would be a schema violation, not a judgment call. FAIL-9 cites this exact contract as wave-1 corroboration for #9. Scope note: the contract governs the worker boundary; if a downstream projection layer collapses the conflict later, that is a separate seam (FAIL-9's falsification makes this point about projection as the merge's output slot). The contract causally blocks the merge at the boundary it governs.

**#5 claim-binding.** The EVIDENCE field requires pointers (source plus digest plus observed-at), never conclusions alone. Rule 3.3.2 treats a digest mismatch as STALE; rule 3.3.4 marks any packet without a valid status INVALID; rule 3.3.9 makes the receiver validate before acting. A conclusion-only claim cannot cross the worker boundary into the knowledge layer, which is where FYD's rendered claims originate. Scope note: the contract enforces pointer-attachment and receiver-side rejection at the claim-entry seam. It does not verify that a pointer resolves to true evidence; a fabricated but well-formed pointer passes the contract. Evidence truth belongs to a different layer (EvidenceAuthority, LIVE per LANE-19 row 16; the render-seam BindingVerifier from FAIL-5). The contract prevents #5's entry shape (unsupported claims entering the pipeline); it is not itself an evidence-truth check.

## Falsifiable test

LANE-14 provides no standalone test for the contract itself (each mechanism M1-M20 carries a FALSIFICATION field, but section 3 has none). The test below is constructed in the FAIL lanes' style, grounded in the FYD pipeline: an owner correction handoff between acquisition and projection, plus a conflict carried across a regeneration boundary.

- **Input:** a fixture with two evidence items for one business's hours: {claim: "open 8-5", provenance: OWNER_ASSERTED, source_pointer: owner-correction-record, digest: d1, observed_at: 2026-09-23T12:00Z} and {claim: "open 9-5", provenance: web-harvest, source_pointer: harvest-record, digest: d2, observed_at: 2026-09-23T09:00Z}. Acquisition emits a HANDOFF_PACKET to the projection role across the regeneration boundary. A second acquisition attempt tries to hand off the claim "24/7 emergency service" with no evidence pointer and no digest.
- **Procedure:** (1) run acquisition, capture the packet; validate it against the schema (all required fields present, status in the typed vocabulary, every evidence entry carrying source_pointer + digest + observed_at). (2) feed the packet to projection/SiteSpec generation. (3) run a second regeneration in which the successor sees only the packet and must emit a generation-2 packet; check that its source_span references event/log IDs, not the generation-1 packet_id. (4) attempt to pass the unsupported "24/7" claim through the handoff.
- **Expected observable:** (1) the conflict packet carries status=CONFLICTING, the evidence array holds both claims with both provenances, and any resolution appears as a recorded decision with a stated rule (or remains unresolved with routing to a resolver); the SiteSpec does not render one hours value as settled fact without disclosure. (2) the unsupported "24/7" claim fails receiver validation: the packet is marked INVALID per rule 3.3.4 and no binding for "24/7" reaches the render model. (3) the generation-2 packet's source_span points at the log, per rule 3.3.1.
- **What proves the mechanism does not work:** (a) the receiver renders "9-5" (or "8-5") as settled fact while the packet carries status OK on conflicted evidence, i.e. the merge happened at the handoff with no trace; (b) a packet whose evidence entry is a bare claim with no pointer or digest passes validation and its claim appears in a SiteSpec binding; (c) a generation-2 packet built by copying generation-1's field values passes as compliant, i.e. nothing detects or prevents recursive-packet construction; (d) a packet with status CONFLICTING but with only one provenance carried, or with no recovery_rule, passes validation.

## Sources (pinned SHAs, from LANE-14's source ledger, research date 2026-09-23)

The lane file itself: `lanes/LANE-14-context-engineering.md`, blob SHA `4c2f46fb...` (full: `4c2f46fbc08ca7cbd775684525c3d4588d25a631`), repo HEAD `dc0f17493b7b`.

| Source | Content used | Pinned SHA |
|---|---|---|
| S16 marius-manola/personal-brand | M20 typed states (the six-state table); F4 conflict preservation ("preserve both sources, route to resolver"); F6 Incomplete vs Invalid distinction; F7 "receiver does not improvise" | `9502703bee75` (files `content/blog/design-multi-agent-handoffs.mdx`, `test-multi-agent-handoffs.mdx`, `replay-failed-multi-agent-workflow.mdx`) |
| S3 ccomkhj/ccomkhj.github.io | F1 goal drift under context saturation; F9 "a path or pointer" for Reconstructible; F10 no recursive summarization | `fcc336e00e94` (`_posts/2026-07-18-CompactionIsStateTransfer.md`) |
| S4 jmagly/aiwg | F2 loss of exact error messages and numeric values; F3 loss of rejected alternatives; F8 load-bearing rules paraphrased away | `a3f8bcc2dccd` |
| S5 arturseo-geo/claude-code-skills | F1/F2 corroboration (early framing lost; exact values lost) | `3ee68efb4f96` (`skills/context-engineering/references/autocompaction.md`) |
| S10 ramparte/agent-building-playbook | F3 "why abandoned" field as highest-value field | `ca2ab73f4837` |
| S15 harshsinghmp/skills | F6 ambient continuity after abrupt endings; F7 outbound-before-dispatch; open_questions-first inbound | `cd9623ce5135` (`skills/agent-handoff/SKILL.md`) |
| S1 openhands/software-agent-sdk | F10 summaries-of-summaries compounding; F11/M14 schema-fixed sections | `5b36cacccc2b` (condenser README) |
| P3 arXiv 2307.03172 ("Lost in the Middle") | F12 position burial | paper ID, no repo SHA |
| FAIL-9-conflict-collapse.md | Direct citation of the contract as wave-1 corroboration for #9 | `failures/FAIL-9-conflict-collapse.md` in the same repo |
| DELETE-OUR-NEED.md | The >=2-of-9 gate pass that selected this survivor; the six-vs-seven discrepancy caveat | same repo |

## Falsification note

**The question:** does the Handoff Contract survive the "recursive summarization is banned, build from the log" rule under adversarial pressure?

**Answer:** the contract is that rule's own enforcement point (rule 3.3.1, argued from F10), but its enforcement is the weakest point in the whole mechanism. Under adversarial pressure, a lazy or hostile successor can satisfy the schema's letter while violating it: copy generation-1's field values into generation-2, increment the generation counter, and write a plausible source_span without ever re-reading the log. Nothing in the packet schema mechanically distinguishes a packet built from the log from a packet built from a prior packet. LANE-14's own open question 4 asks exactly this: is recursion prevented by convention, by checking source_span against prior packet IDs, or structurally (packets excluded from the summarizable range)? Until one of those is mechanized, rule 3.3.1 is convention, and convention is not a mechanism.

Two secondary weak points. First, M20's own falsification applies: a typed state with no enforced handler is decoration. If the receiver records CONFLICTING but proceeds as if OK, the six states are labels, not prevention. The test's clause (a) and (d) target exactly this. Second, the `notes_for_successor` free-text pressure valve (adopted from M14) re-admits unstructured summarization inside the schema: whatever the schema forbids can be smuggled through the valve, and nothing bounds what a receiver may treat as authoritative there. Budgeting the valve (as the lane prescribes) limits the damage but does not type it.

**What would break the mechanism outright:** a receiver that validates the packet's shape but not its provenance (accepting pointers without re-fetching digests), combined with rule 3.3.1 enforced by convention only. That combination reproduces both banned behaviors (recursive summarization and conclusion-only claims) inside a schema-compliant packet.

## PING archaeology status

Neither LANE-14 nor LANE-19 assigned a PING archaeology classification to the Handoff Contract. LANE-14 gave it HARVEST_CLASS ADOPT (rank 3 in the harvest ranking; M20 rank 8). LANE-19's archaeology table covers existing PING machinery (evidence binding LIVE at row 16, owner-assertion evidence records, the locked provenance vocabulary DIRECT / DERIVED / INFERRED / OWNER_ASSERTED / CONFLICTING / UNKNOWN) but contains no row for the Handoff Contract. DELETE-OUR-NEED section (d) confirms no lane other than LANE-1 assigned PING-archaeology classifications. Honest status: **not classified**. It is new discipline to adopt, adjacent to LIVE machinery (evidence binding, owner-assertion evidence records, the subagent final-report convention that the contract would schema-constrain; M19 is named its direct ancestor). No classification is invented here.

---

## Gate re-verification (honest)

Re-verified independently against the >=2-of-9 bar, mechanism as specified, "prevents" meaning causally blocks the failure class.

- **#9 conflict-collapse: STRONG.** The prevention is structural, not advisory: CONFLICTING is a vocabulary value, rule 3.3.6 prescribes "carry both provenances, resolution is a recorded decision with a stated rule," rule 3.3.4 makes an untyped packet INVALID, and rule 3.3.9 forces validation before work. A silent merge at the worker boundary cannot happen without violating the schema. FAIL-9 cites it directly. Weak edge (recorded, not fatal): prevention is boundary-scoped; a downstream projection could still collapse a carried conflict, so end-to-end #9 prevention needs the receiver-side disciplines too. The gate asks only that the mechanism block the class; at the boundary it governs, it does.
- **#5 claim-binding: SOLID WITH A SCOPE NOTE.** The EVIDENCE field is pointers-not-conclusions by schema, digest mismatch is STALE by rule 3.3.2, missing status is INVALID by rule 3.3.4, and the receiver validates before acting by rule 3.3.9. An unsupported claim cannot cross the worker boundary into the knowledge layer, where FYD's rendered claims originate. The scope note: the contract enforces pointer-attachment at the claim-entry seam; it does not check that a pointer resolves to true evidence. A fabricated but well-formed pointer passes. That check belongs to the EvidenceAuthority and the render-seam BindingVerifier, which are separate surviving machinery. Under the entry-seam reading DELETE-OUR-NEED adopted, the reason holds.

**Verdict:** both reasons hold as written. Neither is weak enough to fail the gate. The #5 reason is the narrower of the two and must always be stated with its scope note; without the note it overclaims.
