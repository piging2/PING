# Self-audit 2026-09-24: collision-script variant blind spots (meta-ai-intel-pass)

## Production evidence
- 2026-09-24 evening distill (20260924-210423): SRS Construction LLC comma-variant miss (distill.jsonl note).
- 2026-09-24 night distill (this pass, briefs 20260925-030420 + 20260925-030622): 3 false CLEARs out of 23 names, all caught only by a manual variant sweep:
  1. "Goodwin Septic Tank Services" vs pipeline L883 "Goodwin Septic Tank Service, Inc." (plural s).
  2. "B and R Septic and Drain Service" vs pipeline L1549 "B & R Septic Services, Inc." (and/&, "Drain Service" vs "Services, Inc.").
  3. "Eagle Plumbing & Septic LLC" = pipeline L1082 "Professional Grade Septic Pumping & Services LLC" (same entity, same phone 970-249-1816; round-77 dedup log).
- Root cause: check-prospect-collision.py normalizes only case/whitespace and does a plain substring scan against pipeline.md. Any name whose spelling differs by a suffix, conjunction, or alias sails through as CLEAR.

## Invariant (promoted)
Before staging any Meta AI-named business as NEW, the collision guard must ALSO run a token-variant check: punctuation-stripped, entity-suffix-dropped, singularized token sets, flagging high-overlap near-misses as SUSPECT (non-blocking; the agent resolves). Exact/alias-different same-entity cases (same phone/address, different name) remain a manual phone-cross-check step: when a candidate's phone or address matches a pipeline row's, it is the same entity regardless of name.

## Automation
Patched check-prospect-collision.py: added norm_tokens() (lowercase, & -> and, punctuation stripped, entity suffixes {inc, llc, co, corp, ltd, pllc} dropped, crude singularization) and a SUSPECT tier. A candidate is SUSPECT when its token set is a subset of a stored name's token set or Jaccard >= 0.8, and it is not already an exact collision. SUSPECT lines print with the matched pipeline line numbers; they do not change the exit code (blocking semantics unchanged), but a SUSPECT must be manually resolved before any merge - treat unresolved SUSPECT as a collision for merge decisions.

## Unit cases (verified after patch, fixed row parser)
- "Goodwin Septic Tank Services" -> SUSPECT vs pipeline L883 "Goodwin Septic Tank Service, Inc.". PASS (the exact miss from this pass).
- "B and R Septic and Drain Service" -> SUSPECT vs pipeline L1549 "B & R Septic Services, Inc.". PASS (the exact miss from this pass).
- "Douglas County Septic Pumping" -> SUSPECT vs pipeline L345 "Douglas County Septic". PASS (legit near-miss).
- "Top Notch Roofing" / "Apex Plumbing Denver" -> CLEAR, no SUSPECT. PASS (no false-positive blocking on similar-but-different names).
- "Acme Brand New Business XYZ" -> CLEAR. PASS (true negative).
- Parser fix during testing: first version captured the trade field as the name on status-less rows ("- Douglas County Septic | septic | ..."), producing garbage SUSPECT matches ("L345 ~ septic"). Fixed with status-aware parse + >=2-token name guard.

## Residual manual step
Same-entity/different-name aliases (Eagle = Professional Grade) are NOT caught by token comparison. When the verifier reports a phone or street address for a candidate, grep that phone/address against pipeline.md before staging. Recorded here so the reasoning is not re-derived.
