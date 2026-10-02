# Jev Completion-Falsification Calibration Dataset (Lane J6)

Labeled dataset for the Jev completion-review shadow experiment (Nolan directive #5).
Corpus only; no live Jev calls were made in staging.

Closed Choice: `ACCEPT_PROOF` / `VERIFY_MORE` / `REJECT_PROOF`.
Noul evidence ladder per item: artifact_exists / reachable / executed / criterion_met
(each: yes / no / partial / unknown), independently verified per claim.

`items.jsonl`: one JSON object per line with fields
`item_id, claim, evidence_summary, noul_artifact_exists, noul_reachable, noul_executed,
noul_criterion_met, verdict, verified_by, verified_at, source_ref`.
Evidence summaries are sanitized (no PII, no raw state, no secrets).

## Label distribution (16 items)

| Class | Count | % |
|---|---|---|
| ACCEPT_PROOF | 8 | 50.0 |
| VERIFY_MORE | 3 | 18.8 |
| REJECT_PROOF | 5 | 31.2 |

## Item index

| ID | Verdict | What it is |
|---|---|---|
| rs-00 | REJECT_PROOF | Restart-survival worker's all-six-FIXED+PROVEN report (the false completion report) |
| rs-01 | ACCEPT_PROOF | postgres dead bind mount removed |
| rs-02 | ACCEPT_PROOF | start-18199.sh created and executable |
| rs-03 | VERIFY_MORE | PigiFydStackWatch watchdog (script+task exist, execution logs absent) |
| rs-04 | ACCEPT_PROOF | Five-capability MC projection (found in cloud-side copy after wrong-file RED) |
| rs-05 | ACCEPT_PROOF | WSL/postgres post-restart recovery timestamps |
| rs-06 | REJECT_PROOF | Ask FYD evidence-backed proof claim (infra up, Ask proof failed) |
| infra-01 | ACCEPT_PROOF | :18199/:3100 healthy with DEMO_OWNER_MODE flag |
| wr-01 | ACCEPT_PROOF | WorkerRuntime fail-closed repair (45/45 local + Pig, md5-verified deploy) |
| ask-01 | ACCEPT_PROOF | Ask-lane recovery clean-checkout replay (7/7 suites, 92/92) |
| vis-01 | VERIFY_MORE | Visibility commits eff0ab4/a904906 (lane report; independent replay pending) |
| hash-01 | REJECT_PROOF | Python CanonicalHashAuthority default=str nondeterminism |
| hash-02 | REJECT_PROOF | HashAuthority.canonicalizeObject missing circular-ref guard |
| hash-03 | REJECT_PROOF | CertificateAuthority vs HashAuthority sole-authority collision |
| fp-01 | ACCEPT_PROOF | FYD-009 fail-closed probes 3/3 |
| broker-01 | VERIFY_MORE | Broker fail-closed containment da64baa (commit+tests green; live deploy unverified) |

## Provenance

- `rs-00`..`rs-06`, `infra-01`: 2026-09-26 morning restart-survival lane. The implementing
  worker's completion claims were falsified by an independent coordinator parent replay the
  same day (recorded ~/memory/2026-09-26.md at 13:07 / 13:33 / 14:17 MDT). These are the
  regression examples for the false-completion pattern.
- `wr-01`: Stream C lane evidence + coordinator acceptance, 2026-09-26 ~12:20 MDT
  (~/workspace/sprint-2026-09-24/orca/WR-REPAIR-LANE.md). Note: broker identity_4 verification
  result text was lost; acceptance rests on lane evidence plus coordinator record.
- `ask-01`: independent falsifier clean-checkout replay, 2026-09-26 (~/MEMORY.md, Ask-lane
  case RESOLVED). The gold-standard item: lane claimed, falsifier independently replayed, ACCEPT.
- `vis-01`: lane report + coordinator ancestry check only; independent replay pending
  (~/memory/2026-09-26.md 13:07-entry ~14:17). Deliberate VERIFY_MORE example.
- `hash-01..03`: harvest falsifier (veins 5+6, contracts), 2026-09-26
  (~/workspace/harvest/reports/2026-09-26.md). Rejected soundness claims.
- `fp-01`: ping-perfecting-pass falsifier probes, 2026-09-26 ~07:54 MDT
  (~/memory/2026-09-26.md line 251). Independent fail-closed acceptance.
- `broker-01`: lane commit/test record; live deployment unverified (~/MEMORY.md).

No label is invented: every verdict traces to an independent verification (coordinator parent
replay, separate falsifier identity, or harvest falsifier), never to the lane that made the
original claim. Every row carries `verified_by`, `verified_at`, and `source_ref`.

## The false-completion pattern (morning worker, 2026-09-26)

The worker narrated completion from proximity to evidence instead of evidence itself: a
script file existing was reported as a watchdog *implemented with logging* (the logs never
existed); a projection claimed in one artifact copy was reported as done while the
implementation actually lived in a different copy the worker never checked; infrastructure
health (services UP) was reported as an *evidence-backed proof* (the Ask proof criterion,
a factual answer with a valid public citation, was never exercised and failed on first
probe). The discriminating signal is the Noul ladder: the worker answered
artifact-exists and reachable correctly but marked executed and criterion-met as YES
without running the actual acceptance operation. A falsifier that re-runs the acceptance
criterion from the stated inputs, instead of re-reading the worker's evidence bundle,
catches this class. See also the standing rule recorded in ~/MEMORY.md:
"HEADLESS REPORT != VERIFIED FACT."

## Known caveats

1. `rs-00` is a meta-aggregate over the six `rs-*` items; do not treat it as independent
   evidence of the same six facts during calibration.
2. `rs-04` is a VERIFY_MORE-to-ACCEPT trajectory (initial falsifier RED from inspecting the
   wrong copy, corrected at 14:17). Useful for calibrating the "wrong surface" failure class.
3. `wr-01`'s acceptance is coordinator-recorded, not falsifier-replayed; the broker
   verification result text was lost. Weaker than `ask-01`; keep both to span evidence
   strength.
4. No live Jev calls, no invented verdicts: 16 items staged, meeting the 15+ target.
