# Self-audit 2026-09-24 — worker-deliverable validator (BACKLOG_NOLAN item 3)

## What was built
`~/workspace/outreach/scripts/validate-worker-deliverable.py`: the smallest
scripted gate around the actual worker failure classes seen in production
rounds. Six checks, one manifest in, exit 0/1 out, read-only:

1. count — claimed_rows == delivered non-blank JSONL lines
   (2026-09-13 false-success boundary: 32-business capture claimed for a
   SIGTERMed run that captured no file)
2. required_files — every claimed artifact path exists and is non-empty
3. duplicates — no duplicate normalized business_name inside the delivered rows
   (round-112: 8 rows merged claiming "zero pipeline collisions"; 3 were
   already archived)
4. exclusions — no delivered row matches the worker's own stated
   excluded_patterns (franchise / out-of-scope)
5. action_evidence — every claimed action (deduped, collision_checked,
   exclusion_checked, ...) names an evidence file that exists and is non-empty
6. schema — rows carry the standing merge contract fields
   (jsonl-merge-round53.py FIELDS) with in-enum values; business_name non-empty

## Real caller (same unit)
`~/workspace/tandem/distill-sweep.py --mark` grew an optional
`--require-validation MANIFEST` flag. When present and the requested status
is "distilled", the mark step runs the validator first and REFUSES the
distilled mark on failure (records distill_failed with the failing checks in
the note instead). Flag absent = byte-identical old behavior, so the current
documented procedure keeps working.

## Verification (2026-09-24, ping-perfecting-pass)
- Validator: 7 fixture cases in /tmp/vwd (pass + count/required/dup/excl/
  evidence/schema failures) — each failure class caught by exactly its check,
  rc=1; pass case rc=0.
- Wiring: in-process tests against a scratch distill ledger — failing
  manifest refuses distilled (distill_failed recorded with check lines);
  passing manifest records distilled; no-flag path unchanged; distill_failed
  passthrough unaffected. CLI argv parsing tested for both note-present and
  note-omitted forms.
- `distill-sweep.py --select --cap 0` still returns the same JSON shape.

## Residual for the engine (not this pass's to change)
The gate is live but opt-in. Making it mandatory needs a procedure change the
engine owns: workers must write a claim manifest next to their rows file, and
the distill procedure must pass --require-validation on every --mark. The
cron definition files under goals/.../crons/ are read-only copies and this
pass may not cron.update another schedule, so the mandate line stays with
the outreach engine / Nolan. Note: making validation unconditional in code
today would break the documented procedure (no manifests exist yet) — the
flag stays opt-in until the procedure adopts it.
