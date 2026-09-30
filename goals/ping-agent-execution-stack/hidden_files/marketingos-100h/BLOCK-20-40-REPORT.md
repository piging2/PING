# BLOCK 20–40 REPORT — EDITORIAL JUDGMENT (2026-09-30 ~14:40 MDT)

Method committed pre-attack: commit f7c27eb (BLOCK-20-40-ATTACK-PLAN.md + editorial/rank_20_40.py).
Attack plan is the brief; this report is the outcome. Nothing below reshapes the plan.

## 1. Deterministic editorial ranking projection

Plain function, fixed rubric: score = 3*audience_value + 2*disagreeability + 3*defensibility + 1*freshness (max 45).
The 0-5 ratings are the coordinator's editorial input, committed verbatim in the script; the function over them is deterministic.
Fixture SHA256: 1b7f1e6831344d5724d17d378ebc4702c05e067e1ebdd50041466da98acf925b
Verified: two runs byte-identical; self-test asserts arithmetic against committed expected totals.

| rank | claim | total | aud | dis | def | fre | note |
| 1 | C2 | 44 | 5 | 5 | 5 | 4 | default is overridable (T2/T3) |
| 2 | C6 | 44 | 5 | 5 | 5 | 4 | superuser bypasses at will (T9b) |
| 3 | C7 | 42 | 5 | 4 | 5 | 4 | REVOKE is a real boundary, non-superusers (T10) |
| 4 | C3 | 40 | 4 | 4 | 5 | 5 | temp-table DDL/DML boundary (T4/T11) |
| 5 | C5 | 34 | 3 | 3 | 5 | 4 | advisory locks + NOTIFY work read-only (T6/T7) |
| 6 | C4 | 28 | 2 | 2 | 5 | 3 | nextval blocked (T5) |
| 7 | C1 | 24 | 2 | 1 | 5 | 1 | baseline INSERT-blocked (T1) |
| 8 | C8 | 20 | 2 | 1 | 4 | 0 | our own config; honesty anchor, never the headline |

Tie C2/C6 broken by claim id ascending. Scores recommend, never authorize.
Reading: the publishable material is C2, C6, C7, C3. C8's job is credibility, not headline.

## 2. Falsifier attacks (admissible sources only: K1, K2, U1–U5, steelman)

### Thesis A — "The default that isn't a boundary"
- A-F1 (is T2/T3 the anomaly?): no counter-evidence found; SET is a USERSET parameter, any role may lift it. DOES NOT LAND.
- A-F2 (U1 resolved favorably would scope the alarm): U1 is unresolved, so the attack is conditional — but it LANDS as a binding scope constraint NOW: the piece may claim "at the privilege layer the default is not a boundary"; it may NOT claim "your system is unsealed."
- A-F3 (fear without a fix): LANDS. A standalone is incomplete; it needs C's resolution.
- Verdict as standalone headline: FALSIFIED. Survives only merged with C and scoped by K2.

### Thesis B — "The temp-table exemption that wasn't"
- B-F1 (doc passage permitting CREATE TEMP TABLE read-only): none found; T4 stands. DOES NOT LAND.
- B-F2 (steelman: "this is a footnote; nobody's threat model depends on CREATE TEMP TABLE in a read-only transaction"): LANDS. Technically true, practically narrow. B cannot carry a piece alone.
- B-F3 (PG17 changed behavior, U3): does not land on the core; requires one caveat line.
- Verdict as standalone headline: FALSIFIED. Survives as a supporting beat (the DDL/DML precision, alongside C5's "read-only is narrower than it sounds in both directions").

### Thesis C — "REVOKE beats read-only"
- C-F1 (a write path surviving REVOKE for a non-superuser): T10 covered INSERT/UPDATE/DELETE/TRUNCATE incl. explicit READ WRITE. SECURITY DEFINER / ownership paths are a different role's privilege, not the revoked role writing. DOES NOT LAND on the claim as scoped; the scope must be stated in the piece.
- C-F2 (superuser wrinkle: our own journal runs as superuser (C8); superusers bypass permission checks, so REVOKE cannot bind them): LANDS HARD. The universal prescription is dead; the scoped prescription survives: REVOKE is the real boundary FOR NON-SUPERUSER ROLES ONLY. This attack reshaped the surviving thesis.
- C-F3 ("rediscovering the manual"): LANDS PARTIALLY. The contribution is the demonstrated contrast on one rig (T2 vs T10), not the recommendation itself. Framing must say so.
- Verdict as universal prescription: FALSIFIED. Verdict scoped (non-superuser roles, superuser limit stated): SUPPORTED.

### Thesis D — "The Oracle honesty report"
- D-F1 (U1 resolved favorably vindicates the doc): conditional, U1 unresolved → INCONCLUSIVE as an attack; becomes a fairness requirement: the piece must present K2's scoping fairly (the doc was scoped to the app's connection pattern, not simply wrong).
- D-F2 (triggers U2 untested; the thesis over-focuses on the setting): LANDS. The piece may not claim "Oracle is unsealed" while a binding layer is untested.
- D-F3 (steelman: "nobody outside your team cares about your journal's config"): LANDS. Not a publishable standalone.
- Verdict as standalone headline: FALSIFIED. Survives as the honesty anchor inside the surviving piece: we found our own doc over-claiming ("binds even superusers") and we are saying so.

### Thesis E — "The two-layer seal"
- E-F1 (U2 unresolved: the "real binding" premise is untested): LANDS HARD. Cannot be a publishable claim.
- E-F2 ("obvious architecture"): partially lands, but E-F1 is the killer.
- Verdict as publishable claim: INCONCLUSIVE. E becomes the natural NEXT research mission: test the append-only triggers on disposable PG (U2). The piece may point at it; it may not assert it.

## 3. Surviving proposal (for Nolan's human judgment — a proposal, NOT a publication, NOT a script)

RECOMMENDED THESIS (merged A+C, D as anchor, B as beat, E as next mission):

"default_transaction_read_only is a session default, not a privilege boundary.
REVOKE is the boundary — for non-superuser roles.
Superusers can't be privilege-bound at all, and our own journal runs as one."

Headline candidates (Nolan picks; scores recommend, never authorize):
  H1: "Your Postgres read-only seal is a default, not a boundary"
  H2: "We sealed our journal with default_transaction_read_only. Then we checked what it actually seals."
  H3: "REVOKE beats read-only: the exact boundary of Postgres's read-only seal"

Structure the surviving piece earns:
  1. The default is overridable (C2: T2/T3 + docs).
  2. The superuser bypass, demonstrated against our own doc's over-claim (C6: T9b; K2 honesty anchor).
  3. REVOKE is the real boundary — for non-superusers (C7: T10), with the superuser scope limit stated explicitly (C-F2).
  4. Supporting beats: the temp-table DDL/DML precision (C3, from B) and read-only-is-narrower-than-it-sounds (C5).
  5. The honest close: what we did not verify (U1, U2, U3, U4, U5) and the next mission (test the triggers).

KILLED / DEMOTED alternatives and why:
  - A standalone ("default isn't a boundary" as the whole piece): FALSIFIED as standalone — fear without the REVOKE fix (A-F3 landed) and unscoped alarm (A-F2 landed as scope constraint).
  - B standalone ("the temp-table exemption"): FALSIFIED as headline — the footnote steelman landed; survives as a supporting beat.
  - C universal ("how to actually seal a journal," unscoped): FALSIFIED — the superuser wrinkle (C-F2) killed the universal form; the scoped form is inside the survivor.
  - D standalone ("our journal is unsealed"): FALSIFIED as headline — external-audience steelman (D-F3) landed and the triggers are untested (D-F2); survives as the K2 honesty anchor.
  - E ("the triggers are the real seal"): INCONCLUSIVE — premise U2 untested; becomes the next research mission, not this piece.

## 4. Open questions / explicit NON-CLAIMS (the piece must not overclaim these)

  N1 (U1): whether the Oracle gateway app code ever issues SET / START TRANSACTION is UNVERIFIED. The piece may not claim the Oracle seal holds OR fails in production. Belongs to the deployment-convergence lane; referenced, not resolved.
  N2 (U2): the append-only triggers are UNTESTED. The piece may not claim they are (or are not) the real binding. Next research mission.
  N3 (U3): trials ran on PG 16; Oracle runs PG 17. Docs indicate parity; not directly trialed. One caveat line.
  N4 (U4): pooler/proxy resetting session defaults between gateway and PG — not inspected. Not claimed.
  N5 (U5): full extent of disk writes under read-only beyond tested ops — not mapped. Not claimed.
  N6: REVOKE-as-boundary is scoped to NON-SUPERUSER roles. "Superusers bypass permission checks" is PG-docs-sourced, NOT trial-sourced in this mission; the piece must cite it as docs, not as our trial.
  N7: the piece must not claim "Oracle is unsealed." The honest statement is C8's residual-risk statement verbatim.

## 5. Evidence map (claim -> source; for the 40–60 claim ledger)

  - "INSERT blocked in a fresh read-only session (non-superuser)" -> T1 (+ SHOW default_transaction_read_only=on).
  - "SET default_transaction_read_only=off or START TRANSACTION READ WRITE restores writes" -> T2, T3 + PG16 docs runtime-config-client ("controls the default read-only status of each new transaction").
  - "CREATE TEMP TABLE fails read-only" -> T4. "INSERT/COPY FROM on an existing temp table succeed read-only" -> T11 + docs COPY wording ("if the table they would write to is not a temporary table").
  - "nextval() blocked read-only" -> T5.
  - "advisory locks and LISTEN/NOTIFY work read-only" -> T6, T7.
  - "superuser bound by the default in a fresh session, bypasses at will via SET" -> T9a, T9b.
  - "REVOKE INSERT/UPDATE/DELETE/TRUNCATE blocks writes even under explicit READ WRITE (non-superuser)" -> T10.
  - "superusers bypass permission checks (REVOKE cannot bind a superuser)" -> PG docs (NOT trialed; cite as docs).
  - "Oracle matches claimed config; role ping is superuser; 2557 rows sealed; triggers present; zero write attempts" -> read-only inspection (C8).
  - "retirement doc said 'binds even superusers'; scoped to the app's connection pattern" -> K2 contradiction record.
  - "secondary source overstated the temp-table exemption; resolved to DML-only on existing temp tables" -> K1 contradiction record.

## 6. Mission + journal record
- Mission `0a04c41899fefb2a`, EXPERIMENT_RUN (existing vocabulary; design in payload, outcome in result; mission-level verdict SUPPORTED). Completed 2026-09-30 ~14:37 MDT.
- Residue: ping_missions (design + outcome); ping_events (2 OBSERVATION_CREATED + 6 CLAIM_CREATED correlated by metadata->>'correlation_id'; MISSION_CREATED/MISSION_COMPLETED are runtime-emitted outside the correlation group, per the runtime's own behavior); knowledge_nodes 10 + knowledge_edges 16, namespace marketingos::block20-40 (ranking, 5 thesis nodes, surviving proposal, non-claims N1-N7, evidence map, learning; edges: findings->theses draws_on, theses->survivor dispositions, ranking/non-claims/evidence->survivor, survivor->learning).
- NOT created: no new authorities, stores, writers. No Oracle state touched. Qdrant untouched.

### Incidents (recorded honestly; all resolved, no residue damage)
- I1: driver C failed on attachClaimVerdict with EXPERIMENT_OUTCOMES. Learned: that helper accepts CLAIM_VERDICTS only (CONFIRMED | REFUTED | UNCLEAR); SUPPORTED/FALSIFIED/INCONCLUSIVE belong to the mission RESULT's verdict field. Driver C2 reworded thesis outcomes as survival statements with claim verdicts (4x REFUTED-as-headline, 1x UNCLEAR, 1x CONFIRMED survivor).
- I2: driver C2's complete() was a SILENT NO-OP. complete() only transitions from status='running' (or held); the mission had been lease-reset to 'created' after driver C crashed (standard reaper behavior). Driver C3 did assign -> start -> complete; mission is now completed with verdict SUPPORTED. Lesson: never print "COMPLETED" unconditionally; read the row back.
- I3: ping_events has NO correlation_id column (it lives at metadata->>'correlation_id'; the index idx_ping_events_correlation says so). Fixed in drivers C/C2.
- Minor: driver C2's console.log said "edges=17"; the true count is 16 putEdge calls, all 16 persisted. The log string was wrong, the data is right.

## 7. Readiness for 40–60 (evidence-native scripts)
READY. The 40–60 block inherits: the surviving thesis, the killed list (what the script must not claim), the non-claims N1–N7 (the claim ledger's exclusion list), and the evidence map (the claim ledger's inclusion list). The script's accuracy pass checks every spoken claim against this map. One open input: Nolan's headline pick (H1/H2/H3) — the script must not invent a stronger headline than the evidence map supports.
