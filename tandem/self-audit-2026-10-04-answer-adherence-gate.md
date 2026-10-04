# Self-audit 2026-10-04: answer-adherence gate (pre-verification re-serve filter)

## What the agent had to reason about
The 20261004-030636 a-weak-website-hunt answer named 12 businesses; the
20261004-030413 d-segment-deep-dive answer named 12. Independent web
verification of all 24 found every one already tracked or excluded:
0 new stagings. The verification spend (~14 independent searches) added
nothing to the pipeline. Two distinct defects produced the re-serves:

1. **Pack negatives missed 7 d-file names.** The d-brief's negative-signal
   set (206 names) genuinely lacked Artesian Services Inc, Valley Pump Co,
   San Juan Pump Co, McCracken Well Drilling, Valley Drilling Co,
   San Juan Drilling, and Aqua Tec Systems Inc, even though all seven are
   pipeline.md staged rows. Root cause: they carry no per-line d-brief
   marker; their provenance lives in section headers / sweep audit notes.
   This is the 2026-10-01 Mesa Door Systems boundary, now proven systemic
   rather than theoretical.
2. **Meta AI ignored 10 a-file negatives it DID receive.** Rocky Mountain
   Plumbing and Heating, Qualtire Plumbing and Heating, Four Seasons
   Plumbing Heating, Independence Plumbing & Mechanical, Covens Plumbing,
   All Temp Heating & Air, Bercillio Plumbing, Automatic Energy Solutions,
   Pine Mountain Electric, Hot Water Heat Services were all in the pack's
   200-name negative list (verified in the delivered answer file's context).
   Meta AI re-served them anyway. Machinery cannot force the worker to
   obey; it can only refuse to spend verification on re-serves.

Re-serve rate this pass: 24/24 = 100% (standing observation was ~58-75%
per rounds 146-147 / 2026-09-30 audit notes). A spike, not a trend; the
spike is explained by defect 2.

## Invariant (now machinery-owned)
No independent-search verification is spent on a name the full tracked
universe already contains. Every distill-sweep candidate file's findings
are classified RE-SERVED / NOVEL against the union of:
  - merged_covered_names(brief) (brief-aware pack negatives),
  - ALL pipeline.md staged rows of any status and any brief marker
    (both "- STATUS | name" and older "- name | trade" shapes),
  - canonical JSONL business names,
  - prospect-archive.jsonl business names,
  - plus a pipeline-text substring tier for prose/audit-note mentions.
Re-served names are never re-verified; only NOVEL names enter the
verification queue. The collision guard (pre-merge) stays the backstop;
this gate is pre-verification. Neither replaces the other.

## Fix
- NEW tandem/check_answer_negatives.py: parse findings ("Name - Town -
  Trade - Website: ... - Verified: ..." single lines; Meta AI did not
  number them despite the contract), variant-tolerant matching (mirrors
  the collision guard's norm_tokens; stopwords + possessive-fragment
  guards added after a false "Catamount Drilling and Construction" ~
  "J&R Construction" match via bare "and"+"construction").
- distill-sweep.py --select now attaches "adherence" per selected file
  (fail-open: a checker error annotates, never breaks selection).
- Self-test: 12 production-evidence cases incl. this pass's two answers
  (a: 12 reserves/0 novel; d: 10 reserves/2 novel -- Catamount Drilling
  and Construction genuinely new but commercial-geotechnical target
  misfit; EmTech Inc already industrially excluded 2026-09-30, NOVEL
  under the gate only because its exclusion lives in prose, not a row).

## Test
`python3 check_answer_negatives.py --self-test` -> all checks passed.
`python3 covered_names.py --self-test` -> all checks passed (unchanged).
`python3 distill-sweep.py --select --cap 5` -> both files carry adherence.

## Boundary / not claimed
- The gate does not fix Meta AI ignoring negatives; it only stops the
  spend. Pack-side negative-signal quality still matters for the
  discovery job's ingest path.
- Per-line brief-marker gap in covered_names_pipeline is unchanged (the
  gate's pipeline-any-marker union covers it at answer time).
- EmTech Inc / Pumps West-style prose-only exclusions: the substring tier
  catches mentions, but a cleaner fix is archiving them (2026-09-30 pass
  left them as pipeline notes). Follow-up for the discovery lane, not
  this pass.
