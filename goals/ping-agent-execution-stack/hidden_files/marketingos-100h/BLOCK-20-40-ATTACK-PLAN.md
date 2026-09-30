# BLOCK 20–40 ATTACK PLAN (pre-attack, committed before falsifier runs)
2026-09-30 ~15:35 MDT. Coordinator editorial input. Nothing here is a result.

## Ranking input (from editorial/rank_20_40.py)
score = 3*audience_value + 2*disagreeability + 3*defensibility + 1*freshness (max 45)
Fixture SHA256: 1b7f1e6831344d5724d17d378ebc4702c05e067e1ebdd50041466da98acf925b
Ranking: C2=44, C6=44, C7=42, C3=40, C5=34, C4=28, C1=24, C8=20.
Top editorial material: C2, C6, C7, C3. C8 is the honesty anchor, never the headline.

## Attack sources (the only admissible ammunition)
- K1: secondary source overstated the temp-table exemption; resolved to DML-only on existing temp tables.
- K2: retirement doc's "read-only enforced at the database boundary... binds even superusers" vs T9b; doc scoped to the app's connection pattern; unresolved link recorded as U1.
- U1: does the Oracle gateway app code ever issue SET / START TRANSACTION? (deployment-convergence lane; NOT this block's to resolve)
- U2: do the Oracle append-only triggers actually block UPDATE/DELETE? (testable on disposable PG; Oracle write attempts out of scope)
- U3: trials on PG 16; Oracle runs PG 17 (docs indicate parity; not directly trialed).
- U4: any pooler/proxy resetting session defaults between gateway and PG?
- U5: full extent of "high-level read-only does not prevent all writes to disk" beyond tested ops.
- STEELMAN: the strongest skeptical-senior-engineer objection to each thesis.

## Thesis A — "The default that isn't a boundary"
Headline candidate: "Your read-only seal is a default plus app discipline, not a privilege boundary."
Claims: ALTER ROLE ... SET default_transaction_read_only=on is overridable by the session owner (SET off) or per transaction (START TRANSACTION READ WRITE); the setting never was a privilege boundary.
Falsifiers:
  A-F1: find a PG version/behavior where a non-superuser cannot lift the default -> T2/T3 are the anomaly.
  A-F2: gateway code provably never issues SET/START TRANSACTION (U1 resolved favorably) -> the seal holds in practice; the thesis's alarm is miscalibrated and must be scoped to the privilege layer.
  A-F3: the thesis without a fix is fear without a resolution -> must merge with or defer to the REVOKE material (Thesis C) or admit incompleteness.
Kill condition: if A-F2 completes (U1 resolved in favor of the app), A survives only as a privilege-layer statement, never as "your system is unsealed."

## Thesis B — "The temp-table exemption that wasn't"
Headline candidate: "The temp-table exemption that wasn't."
Claims: the common belief that temp tables are fully usable in read-only transactions is wrong at the DDL boundary: CREATE TEMP TABLE fails; only DML on pre-existing temp tables works; secondary sources overstate it (K1).
Falsifiers:
  B-F1: find the doc passage that actually permits CREATE TEMP TABLE read-only -> T4 is the anomaly.
  B-F2: show common drivers/frameworks pre-create temp tables so the DDL boundary never bites in practice -> technically true, practically hollow.
  B-F3: PG 17 changed the behavior (U3).
Kill condition: if B-F2 lands (the steelman "this is a footnote; nobody's threat model depends on CREATE TEMP TABLE in a read-only transaction"), B dies as a standalone headline and survives only as a supporting beat.

## Thesis C — "REVOKE beats read-only"
Headline candidate: "How to actually seal a journal: REVOKE beats read-only."
Claims: for a non-superuser role, REVOKE INSERT/UPDATE/DELETE/TRUNCATE is a genuine boundary (holds under explicit READ WRITE); the read-only default is defense-in-depth at best; T10 is the minimal honest config.
Falsifiers:
  C-F1: find a write path that survives the REVOKE set for a non-superuser (e.g., via SECURITY DEFINER functions, ownership paths, or DDL the role still holds).
  C-F2: our own journal runs as a SUPERUSER (C8); REVOKE cannot bind a superuser (superusers bypass all permission checks) -> the prescription is inapplicable to the very system that motivated the research unless the role is de-superusered (real migration cost, unexamined).
  C-F3: "REVOKE-based least privilege is the docs' own recommendation; you are rediscovering the manual" -> the contribution is only the demonstrated contrast (T2 vs T10), not the recommendation.
Kill condition: if C-F2 lands unanswered, C cannot be published as a general prescription; it must carry the superuser scope limit explicitly (REVOKE binds non-superusers only).

## Thesis D — "The Oracle honesty report"
Headline candidate: "Superusers can't be sealed by settings: an honesty report on our own journal."
Claims: our journal runs as a superuser with default_transaction_read_only=on; that setting does not bind the superuser at the privilege layer (T9b); the retirement doc's "binds even superusers" over-claimed (K2); the honest seal statement is narrower.
Falsifiers:
  D-F1: U1 resolved favorably (app provably never issues SET) -> the doc's claim holds in the relevant threat model; the thesis becomes uncharitable self-flagellation and must present K2's scoping fairly.
  D-F2: the append-only triggers (U2, untested) are the real binding layer -> the thesis over-focuses on the setting and under-credits the triggers; cannot claim "unsealed" while a binding layer is untested.
  D-F3: "Nobody outside your team cares about your journal's config" -> not a publishable standalone thesis; at best a credibility device inside a larger piece.
Kill condition: if D-F3 lands (it will), D survives only as the honesty anchor inside the surviving piece, never as the headline.

## Thesis E — "The two-layer seal"
Headline candidate: "The real seal may be the triggers, not the setting."
Claims: the binding layer in our journal may be the append-only triggers (trg_ping_events_append_only + _truncate), not the read-only default; until U2 is tested, the honest claim is that the setting is the weaker of the two layers.
Falsifiers:
  E-F1: test the triggers on disposable PG (U2) and find they do NOT block UPDATE/DELETE -> the "real binding" claim dies.
  E-F2: "two-layer story is the obvious architecture; there is no news here."
Kill condition: if the central premise stays unresolved (U2 untested), E cannot be a publishable claim at all; it becomes the natural NEXT research mission, and the piece may point at it.

## Method note
Attacks run next, one thesis at a time, from the admissible sources only. An attack
LANDS only if it changes what the piece may honestly claim. Outcomes feed the
BLOCK-20-40-REPORT. The surviving proposal is whatever remains defensible after
the attacks, for Nolan's human judgment. Scores recommend, never authorize.
