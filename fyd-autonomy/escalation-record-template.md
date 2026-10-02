# Escalation record template (SI-03)

File one record per classifier run (decide or escalate) in `escalation-log.jsonl`
(one JSON object per line, no header). No question reaches Nolan without an
escalate-record. Escalate-records must name the classifier check(s) that failed;
decide-records carry failed_checks=[].

## Classifier (grill-20, locked 2026-09-24)

Answer each yes/no with one line of evidence:

1. locked_invariant? — Does a locked invariant already decide this?
2. previous_decision? — Did Nolan already decide this class of question?
3. code_evidence? — Does code or runtime evidence decide it?
4. reversible_experiment? — Can a safe, bounded experiment resolve it?
5. safe_default_80? — Is there a >=80% safe default?
6. reversible? — Is the resulting action reversible?
7. no_external_effects? — No consequential external effects?
8. no_destructive_mutation? — No uncertain destructive mutation?
9. no_new_credential_authority? — No new credential authority created or used?
10. boundaries_preserved? — Safety, privacy, and tenant boundaries preserved?

## Verdict

- DECIDE: every applicable check passes. State the chosen default, execute it,
  log the outcome. Do not ask Nolan.
- ESCALATE: name the failed check(s). State the recommended default and the
  cost of being wrong. Ask Nolan exactly the narrow question the failed check
  protects.

## JSONL schema

{"ts":"2026-09-27T00:31:00Z","question":"...","checks":{"locked_invariant":false,"previous_decision":true,"code_evidence":false,"reversible_experiment":false,"safe_default_80":true,"reversible":true,"no_external_effects":true,"no_destructive_mutation":true,"no_new_credential_authority":true,"boundaries_preserved":true},"check_evidence":{"locked_invariant":"no locked invariant covers this class","previous_decision":"AGENTS.md 2026-09-23: checkpoint/warning/restriction -> drop to minimum + 14-day hold, then resume ramp","code_evidence":"driver logs not inspected; decision rests on standing policy","reversible_experiment":"not applicable; standing policy decides it","safe_default_80":"the policy default (drop, hold, resume ramp) is the >=80% safe default","reversible":"cap and cadence changes are reversible","no_external_effects":"engagement volume only","no_destructive_mutation":"nothing deleted or mutated","no_new_credential_authority":"no credential use","boundaries_preserved":"no safety/privacy/tenant boundary crossed"},"verdict":"decide|escalate","failed_checks":[],"recommended_default":"...","cost_of_being_wrong":"...","outcome":"..."}

Rules:

- Every key in checks has a non-empty evidence string in check_evidence. A bare
  true with no evidence is a process violation.
- verdict=decide requires failed_checks=[]. verdict=escalate requires
  failed_checks non-empty and cost_of_being_wrong non-empty.
- File a record for every classifier run, decide or escalate. Decide-outcomes
  leave a trace too; the invariant's negative half ("questions the classifier
  resolves never reach Nolan") is audited from these.

## Batch-6 training corpus (additive reference, 2026-09-26; guidance only)

Before finalizing an organic batch, consult `escalation-training-batch6.md`: the 37 Batch-6
questions labeled TRUE_OWNER_AUTHORITY / CONSTITUTION_ALREADY_ANSWERED /
NEEDS_RESEARCH_EVIDENCE / PREMATURE_DEFAULT_SUFFICIENT, with per-entry reasons and worked
examples. Decision order: constitution first, then research/evidence, then premature-check,
then true-owner-authority last. A batch returns exactly the questions that survive; never pad
to a fixed size. This reference is guidance only; the grill-20 checklist above remains the
decision procedure.
