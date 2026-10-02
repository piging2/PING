# brief-lifecycle scope fix — 2026-09-22

## QUESTION
Did `quarantined_briefs()` in `~/workspace/tandem/brief-lifecycle.py` wrongly exclude
the healthy d-segment-deep-dive brief from rotation, and does the proposed scope-aware
patch restore it without touching the c quarantine?

## EVIDENCE

### The defect
`quarantined_briefs()` added a brief_id to the quarantined set for ANY record with
`state == "QUARANTINED"`, ignoring the record's scope.

The d record (`~/workspace/tandem/quarantine/d-segment-deep-dive-20260918-030609.json`):
- `state: "QUARANTINED"`, `scope: "run"`
- notes: "Run-level quarantine only. The d-segment-deep-dive brief itself is healthy
  (last success round 76) and stays in rotation. ... No Nolan approval needed for
  the retry; this record exists so a second consecutive SIGTERM on the same brief
  becomes a pattern the engine can escalate."
- The record's own prediction held: the brief succeeded again at 2026-09-18 09:04 UTC
  after the SIGTERM (ledger: ok / answer_captured).

Before the patch (`brief-lifecycle.py --effective-cycle`, 2026-09-22 ~13:45 UTC):
- d-segment-deep-dive: QUARANTINED (wrong; silently excluded since 2026-09-18 05:20 UTC)
- c-review-complaint-signals: QUARANTINED (correct, Nolan's 2026-09-17 approval,
  next_retry_eligible_at 2026-09-24T12:45:00Z, lift requires his explicit approval)

The c record has `scope` absent (brief-level by design), so a `scope == "run"` guard
cannot touch it.

## WHAT CHANGED
One function in `~/workspace/tandem/brief-lifecycle.py` (`quarantined_briefs()`):
records with `rec.get("scope") == "run"` are skipped before the quarantine-set
insertion. Only brief-scope records (scope absent or any other value) exclude a
brief from rotation.

```diff
@@ -62,6 +62,14 @@
              if name.endswith(".json"):
                  try:
                      rec = json.load(open(os.path.join(qdir, name)))
+                    # scope == "run" is a run-level quarantine: one failed run
+                    # of the brief, recorded so a repeated failure on the same
+                    # brief becomes an escalatable pattern. It is NOT a
+                    # brief-level quarantine and must not remove the brief
+                    # from rotation. Only brief-scope records (scope absent
+                    # or any value other than "run") exclude the brief.
+                    if rec.get("scope") == "run":
+                        continue
                      if rec.get("state") == "QUARANTINED" and rec.get("brief_id"):
                          found.add(rec["brief_id"])
```

Boundaries honored: no edits to `reconcile.py` or the reconciler freeze, no capture
re-runs, no state changes to quarantine records, no PING claim promotion, no pushes.
The d record itself explicitly waived Nolan approval for this retry path.

## VERIFICATION (real execution, not code reading)

1. d returns to rotation:
   `python3 brief-lifecycle.py --effective-cycle` after patch:
   effective_cycle = [a-weak-website-hunt, b-new-business-radar,
   d-segment-deep-dive, h-marketing-intelligence];
   d state derived from the ledger as COMPLETE (post-SIGTERM success).
2. c stays QUARANTINED: `--state c-review-complaint-signals` -> QUARANTINED;
   skipped map = {c-review-complaint-signals: QUARANTINED} only.
3. a/h unchanged: a COMPLETE, h COMPLETE in lifecycle states (h's rotation skip is
   handled inside next-brief.py itself as objective/contract incompatible, untouched).
4. Rotation consumer confirmed: next-brief.py imports this module as brief_lifecycle
   and calls quarantined_briefs() + brief_state() directly; live `python3 next-brief.py`
   no longer logs a d skip line. (Selected next brief: b-new-business-radar, which is
   normal rotation advance.)
5. `brief-lifecycle.py --check` exits 0 (no terminal-without-quarantine flags).

## ASSUMPTIONS FALSIFIED
- The triage report's record path (under hidden_files/meta-ai-intel/quarantine/) was
  wrong; the actual records live in ~/workspace/tandem/quarantine/. Verified by
  direct listing before proceeding.
- The idea that "any QUARANTINED record means brief-level quarantine" was false;
  the schema supports run-scoped records and the d record used it exactly as
  designed.
