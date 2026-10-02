# Jev Privacy Envelope — Minimum Safe State per Decision Family

**Status:** spec / analysis only. No code, no live calls, no repo changes.
**Date:** 2026-09-26
**Authority basis:** Nolan directive #13 (privacy boundary first). Jev is a typed shadow
signal, never an authority. Probability is evidence, never permission.
**Provider boundaries (J1 findings):**
- TypeSafe MCA 4.3 gives TypeSafe unrestricted Telemetry rights (technical logs,
  hashes, classifications, metrics, learnings). Treat everything sent to Jev as
  visible to TypeSafe for service-usage purposes.
- DPA makes TypeSafe a processor; no training on Input without consent.
- MCA 2.3 forbids using Jev outputs to distill/train imitating models. Shadow
  records are evaluation evidence, not training data.
- OpenRouter path adds a second boundary: TypeSafe sees Jev input/output through
  OpenRouter's channel; OpenRouter logs request metadata; opt-in content logging
  must stay OFF. Until OpenRouter's content-retention terms are pinned, prefer
  direct TypeSafe API for any family that sends bounded content excerpts.

**DecisionRequest shape (existing, reused as-is):**
`~/workspace/jev-stage/typed_decision.js` defines
`DecisionRequest { domain, subjectRef, evidenceRefs[], context{}, correlationId, causationId }`.
This spec constrains what may populate those fields per decision family. It does
not change the shape.

---

## 1. Data-class taxonomy

Permitted classes (only these may enter a state package):

| Class | Definition | Examples |
|---|---|---|
| STRUCT | Enums, booleans, numeric bands, counts, schema versions | `task_class=code_change`, `external_effect=false`, `retry_count=2` |
| IDENT | Opaque references, never raw PII | event_id, correlation_id, causation_id, sha256 content hashes, commit SHAs |
| EREF | Evidence references, never evidence content | event IDs, repo-relative paths, artifact hashes, test suite name + pass/fail counts |
| FEAT | Deterministic-code derived features | falsifier verdict labels, diff stats, classifier labels, rule-provider outputs |
| BTEXT | Bounded sanitized free text, per-field char budget | claim statement (<=500), error excerpt (<=300) |

Excluded classes (never enter, for any family):

| Class | Definition |
|---|---|
| PII | Names, emails, phones, addresses, personal identifiers of any person or customer |
| SECRET | API keys, tokens, passwords, private keys, session cookies, signing keys, webhook secrets, connection strings with embedded credentials |
| RAWID | Raw internal row IDs, user IDs, plaintext tenant names; internal DB keys beyond event/correlation/causation IDs |
| HIST | Full conversation histories, full transcripts |
| RAWDUMP | Full file contents, full logs, full tool outputs, full result payloads, binary artifacts (hashes only) |
| BIZCONTENT | Customer business content (invoice lines, customer lists, estimate details) |
| CONV | Anything whose meaning requires surrounding private context |

Tie-break rule: **when in doubt, exclude.** A narrower package that still answers the
narrow question is always preferred.

---

## 2. Universal state-packaging rules

These apply to every family before any request is sent.

1. **Build from canonical events, not raw runtime objects.** Every field in
   `context{}` must trace to a canonical event, an evidence record, or a
   deterministic-code derivation. Never serialize a live object graph into Jev input.
2. **Deny-by-default allowlist.** Each family has a fixed `context{}` schema below.
   Any key not on the list is rejected. Unknown keys cause the request to be
   BLOCKED, not stripped-and-sent.
3. **Content budgets are hard.** Each BTEXT field carries a max char count. Over-budget
   input is truncated only if truncation cannot create a misleading fragment;
   otherwise the request is BLOCKED (completion review, triage).
4. **No private raw context in canonical events.** This matches standing PING rule:
   the `JEV_DECISION_EVALUATED` record carries the sanitized request summary and the
   scrubbed typed result only.
5. **Pre-send scanners, in order:** (a) secret scan, (b) PII scan, (c) budget check,
   (d) schema check. Failure at any step BLOCKS the request (see section 5).
6. **Metadata declaration.** Every request's `context{}` includes
   `data_classes_used: [...]` and `provider_path: direct_typesafe | openrouter`
   so calibration can verify envelope compliance per family.
7. **Correlation only.** `correlationId` / `causationId` carry PING event IDs only.
   `subjectRef` is an opaque reference (event ID or `urn:ping:sha256:<hash>`).
   Never a tenant name, email, customer name, or internal row ID.
8. **Tenant dimension.** Tenant identity does not enter Jev input as plaintext.
   If a family needs a tenant dimension for calibration, use `tenant_ref =
   sha256(tenant_id)` and only where listed below. Open question #1 below asks
   whether to permit even this.
9. **Rationale discipline.** The typed result's rationale field may echo structural
   reasons only; it must never quote blocked content.

---

## 3. Per-family minimum state packages

### F1. Executor routing (shadow ORCA router)

Question: given a sanitized task state, which executor class fits?
Choices: DETERMINISTIC_WORKER / HEADLESS_AGENT / DEEP_REASONER / VERIFY_MORE / HUMAN_REVIEW.
**Mode: purely structural. No content required.**

`domain`: `jev-shadow/executor-routing/v1`

| Field | Class | Purpose |
|---|---|---|
| task_class | STRUCT | enum: code_change, test_run, research, verification, outreach_action, infra, doc |
| deterministic_rule_exists | STRUCT | boolean: does a deterministic path exist for this task class |
| external_effect_possible | STRUCT | boolean |
| reversibility | STRUCT | enum: reversible / compensable / irreversible |
| criticality | STRUCT | enum C0..C5 (PING policy value, not Jev's) |
| retry_count | STRUCT | int band: 0 / 1-2 / 3+ |
| prior_executor_histogram | STRUCT/FEAT | counts per executor class for this task class, no content |
| verification_status | STRUCT | enum: none / pending / passed / failed |
| deadline_band | STRUCT | enum: none / hours / day / week |
| objective_digest | IDENT | sha256 of the sanitized objective text (equality checks without content) |
| evidence_ref_count | STRUCT | int band |
| correlationId, causationId | IDENT | PING event IDs |

No BTEXT fields. No content of the task enters.
**Structural-metadata-only family.**

### F2. Backlog classification

Question: what is the verified disposition of this backlog item?
Choices: PROVEN_DEFECT / MISSING_TEST / ALREADY_IMPLEMENTED / DUPLICATE / SUPERSEDED / FUTURE / UNKNOWN.
**Mode: bounded content excerpts required.** Classification cannot be done on metadata
alone; the item's claim must be readable.

`domain`: `jev-shadow/backlog-classification/v1`

| Field | Class | Budget / note |
|---|---|---|
| item_title | BTEXT | <= 160 chars, sanitized |
| item_summary | BTEXT | <= 800 chars, sanitized; the backlog item's claim in its own words |
| evidence_refs | EREF | event IDs, commit SHAs, repo-relative paths, falsifier report IDs |
| verification_verdicts | FEAT | coordinator/falsifier disposition labels + timestamps (labels only) |
| test_signal | STRUCT | enum: no_tests / passing / failing / partial + counts |
| reproduction_status | STRUCT | enum: reproduced / not_reproduced / unknown + method label |
| duplicate_of | IDENT | backlog item ID or null |
| age_band | STRUCT | enum: days / weeks / months |
| data_classes_used | STRUCT | metadata |
| provider_path | STRUCT | metadata; content-bearing: prefer direct_typesafe |

Excluded beyond the universal list: full backlog thread history, full diff contents,
full log output, reporter identity beyond role label.

### F3. Completion review

Questions: does supplied evidence prove (a) artifact exists, (b) implementation
reachable, (c) runtime execution, (d) acceptance criterion met?
Choice: ACCEPT_PROOF / VERIFY_MORE / REJECT_PROOF.
**Mode: bounded content excerpts required.** The claim and the acceptance criteria
must be readable; verification evidence stays as refs + derived verdicts.

`domain`: `jev-shadow/completion-review/v1`

| Field | Class | Budget / note |
|---|---|---|
| claim_statement | BTEXT | <= 500 chars, sanitized; what the worker claimed |
| acceptance_criteria | BTEXT | <= 500 chars total, structured list, sanitized |
| artifact_refs | EREF | repo-relative paths, artifact hashes |
| falsifier_verdicts | FEAT | per-claim-check labels: proven / unproven / contradicted + method |
| replay_status | STRUCT | enum: not_attempted / passed / failed |
| prior_false_claim | STRUCT | boolean: is this claim in the false-claim regression corpus |
| data_classes_used | STRUCT | metadata |
| provider_path | STRUCT | metadata; content-bearing: prefer direct_typesafe |

Excluded: screenshot bytes (hashes only), full worker result payloads, full test logs,
anything about the worker's identity beyond lane/worker class.

### F4. Headless result triage

Question: what queue transition does this headless result warrant?
Choices: CLEAN_PASS / NEEDS_FALSIFIER / NEEDS_DEEP_REVIEW / CONFLICTING_EVIDENCE /
MALFORMED_RESULT / POSSIBLE_SECURITY_OR_AUTHORITY_ISSUE.
**Mode: bounded content excerpts required.** Error text and result summaries carry the
signal; raw payloads do not enter.

`domain`: `jev-shadow/result-triage/v1`

| Field | Class | Budget / note |
|---|---|---|
| result_status | STRUCT | enum: claimed_ok / claimed_failed / error / timeout / malformed |
| error_excerpt | BTEXT | <= 300 chars, sanitized + secret-scanned; empty if none |
| result_summary | BTEXT | <= 300 chars, deterministic-code produced (never raw payload passthrough) |
| evidence_refs | EREF | event IDs, artifact hashes produced by the worker |
| claim_vs_evidence | FEAT | enum: consistent / missing_evidence / contradictory |
| security_flag | STRUCT | boolean set by deterministic pre-scan (Jev sees the flag, not the payload) |
| authority_touch | STRUCT | boolean: did the task touch authority/capability surfaces |
| agent_class | STRUCT | enum: worker lane class, no identity |
| data_classes_used | STRUCT | metadata |
| provider_path | STRUCT | metadata; content-bearing: prefer direct_typesafe |

Excluded: full result payloads, stack traces beyond the excerpt, tool output dumps,
prompts, anything that could carry secrets (error_excerpt is secret-scanned twice:
once at extraction, once pre-send).

### F5. Decomposition sufficiency

Noul questions: acceptance_criteria_are_falsifiable, required_evidence_is_identified,
single_semantic_owner, scope_is_bounded, external_effect_possible,
authority_is_ambiguous, requires_further_decomposition.
**Mode: bounded content required for the objective and criteria; structural for the rest.**

`domain`: `jev-shadow/decomposition-sufficiency/v1`

| Field | Class | Budget / note |
|---|---|---|
| objective | BTEXT | <= 400 chars, sanitized task objective |
| acceptance_criteria | BTEXT | <= 400 chars total, structured list |
| owner_class | STRUCT | enum: single_lane / coordinator / human / ambiguous (never a person name) |
| scope_bounds | STRUCT | enum + bounded descriptors: files touched (paths), no content |
| external_effect_possible | STRUCT | boolean |
| authority_ambiguity | STRUCT | enum: clear / ambiguous + authority surface label |
| parent_correlation | IDENT | correlation ID of the parent task |
| data_classes_used | STRUCT | metadata |
| provider_path | STRUCT | metadata; content-bearing: prefer direct_typesafe |

Excluded: full parent task content, worker identities, conversation history that
produced the decomposition, customer context.

### F6. Criticality estimation

Question: what criticality class does this action belong to?
Classes: C0 INFORMATIONAL / C1 ROUTINE / C2 MATERIAL / C3 SIGNIFICANT / C4 CRITICAL /
C5 CONSTITUTIONAL. Jev's output is a descriptive estimate only; PING policy decides
consequences. C5 stays governed at any confidence.
**Mode: purely structural. No content required.**

`domain`: `jev-shadow/criticality-estimation/v1`

| Field | Class | Purpose |
|---|---|---|
| action_type | STRUCT | enum: read, compute, write_internal, write_external, publish, grant, delete, auth_change |
| target_class | STRUCT | enum: own_workspace, shared_repo, tenant_data, public_surface, credential_store, canonical_store |
| external_effect | STRUCT | boolean |
| reversibility | STRUCT | enum: reversible / compensable / irreversible |
| blast_radius | STRUCT | enum: single_record / tenant_scope / platform_scope |
| data_sensitivity | STRUCT | enum: none / internal / customer_adjacent; never actual data |
| authority_surface | STRUCT | enum label of the capability/authority involved, no values |
| human_oversight_present | STRUCT | boolean |
| correlationId, causationId | IDENT | PING event IDs |

No BTEXT fields. No action payload content enters.

---

## 4. Per-family data-class table

| FAMILY | PERMITTED DATA CLASSES | EXCLUDED | JUSTIFICATION |
|---|---|---|---|
| F1 executor routing | STRUCT, IDENT, EREF(counts only), FEAT | All BTEXT content, PII, SECRET, RAWID, task objective text | Routing depends on task properties (determinism, reversibility, criticality), not content |
| F2 backlog classification | STRUCT, IDENT, EREF, FEAT, BTEXT (title <=160, summary <=800) | HIST, RAWDUMP, BIZCONTENT, reporter identity, full logs/diffs | Disposition requires reading the claim; evidence stays as refs + derived verdicts |
| F3 completion review | STRUCT, IDENT, EREF, FEAT, BTEXT (claim <=500, criteria <=500) | Screenshot bytes, full payloads, full logs, worker identity | Review needs the claim and criteria; proof status comes from falsifier verdicts and replay status |
| F4 result triage | STRUCT, IDENT, EREF, FEAT, BTEXT (error <=300, summary <=300, double-scanned) | Full payloads, stack traces, prompts, secrets in error text | Triage signal lives in status + short excerpts; raw output is a secret/PII carrier |
| F5 decomposition sufficiency | STRUCT, IDENT, BTEXT (objective <=400, criteria <=400) | Parent content, worker identities, HIST, customer context | Sufficiency is about the task statement's structure; the statement itself must be readable |
| F6 criticality estimation | STRUCT, IDENT only | All BTEXT content, action payloads, actual data values | Criticality is a function of action type, target class, reversibility, blast radius: pure structure |

---

## 5. The secret rule, operationally

If a secret (or secret-shaped value) would enter a state package:

1. **Do not send.** The request is aborted before any network call. This is not a
   retryable packaging error; it is a hard block for that decision slot.
2. **Record without the secret.** The shadow slot is marked
   `SKIPPED_SECRET_RISK` in the evaluation record, carrying only: domain, family,
   timestamp, correlationId, and which scanner fired. No secret material, no
   surrounding text, no redacted-with-asterisks echo of the value.
3. **Signal governance.** Emit a canonical security observation through existing
   PING governance machinery (typed security signal, fail-closed), so the
   packaging path that produced secret-adjacent input is investigated. Do not
   invent a new store for this.
4. **Human attention.** The item routes to coordinator attention / HUMAN_REVIEW
   queue. No automatic retry of the same package; retry requires a coordinator
   action that re-derives the package from sanitized sources.
5. **Never log the candidate value.** Scanner diagnostics report the pattern class
   (e.g., `aws_key_like`, `bearer_like`) and field name, never the matched text.

Secret classes covered: API keys, tokens, passwords, private keys, session cookies,
signing keys, webhook secrets, connection strings with embedded credentials, and any
`SECRET`-class value defined by existing PING secret policy.

---

## 6. Structural-only vs content-needing families

**Purely structural metadata (no content excerpts):**
- F1 executor routing: all inputs are enums/booleans/counts/hashes.
- F6 criticality estimation: all inputs are action/target/reversibility/blast-radius classes.

These two families have the smallest external-processing exposure. They are the
safest candidates for the OpenRouter path (metadata only, content logging OFF)
once terms are confirmed, and they set the floor for what Jev can do with zero
content.

**Bounded content excerpts required:**
- F2 backlog classification (title + summary + derived verdicts)
- F3 completion review (claim + criteria + falsifier verdicts)
- F4 result triage (status + scrubbed error excerpt + deterministic summary)
- F5 decomposition sufficiency (objective + criteria)

For these four, content is the signal. Exposure is bounded by: per-field char
budgets, deny-by-default schemas, pre-send secret/PII scanning, refs-not-content
for evidence, and a preference for direct TypeSafe API over OpenRouter until the
OpenRouter content-retention boundary is pinned.

No family requires: full histories, full logs, full payloads, binary artifacts,
customer business content, or raw identifiers. If a future family appears to need
one, the family definition is wrong, not the envelope.

---

## 7. Compliance notes for calibration

- Every evaluation record carries `data_classes_used` and `provider_path` so the
  replay evaluator can verify envelope compliance per family during calibration.
- MCA 2.3: shadow records are evaluation evidence. Do not feed PING's Jev
  interaction logs back into any model-training or distillation loop.
- TypeSafe MCA 4.3 telemetry: assume TypeSafe retains service-usage telemetry
  derived from inputs. The envelope's job is to make sure that telemetry can only
  ever contain the permitted classes above.
- OpenRouter: content logging stays OFF (opt-in). Until retention terms are
  confirmed, route F2/F3/F4/F5 via direct TypeSafe only.

---

*End of spec. Analysis only; no implementation authorized by this document.*
