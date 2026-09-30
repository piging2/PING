# BLOCK 40–60 REPORT — EVIDENCE-NATIVE SCRIPTS (2026-09-30)

Inputs: BLOCK-20-40-REPORT.md (surviving thesis, killed/demoted list, N1–N7, 11-entry evidence map), SPRINT.md. Method: script drafted from the surviving thesis only; ledger built as a plain data file; accuracy/overclaim/L6 as separate passes. Nothing below reshapes the plan.

## 1. The script

`hidden_files/marketingos-100h/BLOCK-40-60-SCRIPT.md` — spoken draft, technical-credibility register, 5-part structure per the 20–40 report:

1. The default is overridable (C2: T2/T3 + docs).
2. The superuser bypass, against our own doc's over-claim (C6: T9b; K2 honesty anchor).
3. REVOKE is the real boundary — for non-superuser roles (C7: T10), superuser scope limit stated (C-F2), production non-claim explicit (A-F2, N7).
4. Supporting beats: temp-table DDL/DML precision (C3, K1) and read-only-is-narrower-than-it-sounds (C5: T6/T7 vs T5).
5. The honest close: the five non-verifications (U1–U5) and the queued next mission (test the triggers on disposable PG; Oracle write attempts out of scope).

Headline is PARAMETERIZED (H1/H2/H3 in the ledger; Nolan's pick pending). The script is headline-agnostic; no stronger headline than the evidence map supports.

## 2. The claim ledger

`hidden_files/marketingos-100h/claim-ledger-40-60.json` — machine-readable, 23 atomic claims (CL-01 … CL-23), each with CLAIM / TYPE / SUPPORT SET / PRIMARY SOURCE / INDEPENDENT SUPPORT / EVIDENCE GRADE / VERDICT / SCOPE / TIME BOUND / COUNTEREVIDENCE / PUBLIC WORDING / MAXIMUM DEFENSIBLE WORDING. Plain data file; not a store, not an authority. Validated: 23 claims, all 13 fields present, IDs sequential.

Types used: trial_result (12), docs_sourced (2), document_record (1), document_record_plus_nonclaim (1), inspection_result (1), synthesis (1), trial_result_plus_docs (1), recorded_contradiction (1), caveat (1), non_verification (2), plan_pointer (1), thesis_synthesis (1), scope_statement (1), explanatory_synthesis (1). Every verdict CONFIRMED — including the non-verifications, whose confirmed content is "we did not verify X."

## 3. Accuracy pass (separate; every script sentence checked)

INCLUSION (must resolve to the 11-entry evidence map) and EXCLUSION (must not assert anything in N1–N7 as verified fact). Every script sentence carries its ledger id in brackets; the mapping:

- Part 1: scene-setting (C8) → CL-01 → CL-02/CL-03 → CL-04 → docs quote (recorded in driver B's observation) → CL-20.
- Part 2: CL-06 → CL-05 → K2 anchor → CL-07 (narrowed form: the doc's author's understanding, attributed, not asserted) → N1 stated as unverified.
- Part 3: CL-08 → CL-23 (flagged as explanatory synthesis, never a separate trial) → C-F3 compliance ("not a recommendation from the manual") → CL-09 (N6: docs-cited, not trial-sourced) → CL-10 → CL-11 → CL-21 (N7).
- Part 4: CL-12 → CL-13 → CL-22 → CL-14 → CL-15.
- Part 5: N1, N2, CL-16 (N3), CL-17 (N4), CL-18 (N5) → CL-19.

CUTS / NARROWS (1):
- NARROWED: "We sealed our journal the way a lot of teams do" → "We sealed our journal with ALTER ROLE ... SET default_transaction_read_only = on." The "a lot of teams" clause was an unevidenced generalization about others; it is not in the evidence map. Cut.
- No other sentence failed either check. Notably, the near-miss "the app never issues SET" was caught during drafting and entered the script only in the attributed, narrowed CL-07 form ("the doc's author's understanding was that..."), with U1 stated as unverified in the same paragraph.

## 4. Overclaim pass

Flagged vocabulary scanned across the script: solves, guarantees, proves, always, never, production-ready, deterministic, secure, autonomous, self-healing, exactly-once, zero-downtime, fault-tolerant, verified, canonical.

- solves/guarantees/proves/always/production-ready/deterministic/secure/autonomous/self-healing/exactly-once/zero-downtime/fault-tolerant/canonical: zero hits.
- never: 3 hits — "the app never issues SET" appears only as attributed understanding (CL-07), never as asserted fact; "never tested" / "we have not tested" are true negatives. No change.
- verified: 4 hits — "verified it on a disposable database" (T1–T11, true), "verified present in the role settings and active in a fresh session" (C8: pg_db_role_setting + fresh-session SHOW, true), "We have not verified that in the gateway code" / "we have not read the gateway code" (true negatives). No change.
- "real" (2 hits: "That part is real" → T1; "What actually stopped writes" → T10): supported. No change.
- "the boundary that actually holds, for roles that are not superusers: REVOKE": scoped, supported by T10. No change.

Maximum-strength wording check: the strongest sentence in the piece ("the most important sentence") is a scope limit, not a claim. The thesis sentence carries its A-F2 scope constraint in the ledger. PASS.

## 5. Hostile L6 review

STRONGEST OBJECTION: "This piece warns about a footgun no real application fires. No sane app server issues SET default_transaction_read_only=off mid-session — the default IS the boundary in every real deployment, and your own U1 admits you haven't checked whether your app does it. Meanwhile 'REVOKE beats read-only' is a recommendation any DBA already knows. What did anyone learn that the manual didn't say?"

WHERE THE OBJECTION IS RIGHT: the recommendation is not novel (C-F3 partially landed in 20–40); the piece's contribution is the demonstrated contrast plus the self-correction, never a novel prescription. The operational reading is partly right too: the piece must not imply production systems are routinely unsealed — it carries the explicit production non-claim (A-F2 binds while U1 is unresolved).

WHERE OUR EVIDENCE DIFFERS: "nobody fires this footgun" is itself unevidenced — and our own retirement doc fired the conceptual version, asserting at the database level a boundary that does not exist at the privilege layer. That is a real over-claim found in the wild, in our own docs. The temp-table DML/DDL precision and the advisory-lock/NOTIFY asymmetry were corrected by trial, not by reading, and K1 shows even a secondary source got the temp-table point wrong. The audience standard is "a skeptical senior engineer can disagree while concluding the work was done" — the reproducible matrix is the product.

REMAINING UNCERTAINTY: U1 is the one link that would tell us whether the alarm matters for our own system (deployment-convergence lane owns it). PG17 parity is docs-indicated, not trialed. Whether the external audience cares (D-F3 landed) — mitigated by the method framing: "we thought X, the evidence said Y, here is exactly how we found out."

NARROWING APPLIED FROM L6: (a) contribution framed as demonstrated contrast + self-correction, never novel prescription; (b) production non-claim prominent in Part 3; (c) K2 anchor kept fair — the doc was scoped to the app pattern, not simply wrong (D-F1); (d) no sentence generalizes from our rig to "your database" without the non-superuser scope. All four were already in the draft; L6 confirmed rather than changed them.

## 6. Mission + journal record

- Mission `f73a98dcc6bae44c` (EXPERIMENT_RUN, existing vocabulary — CONTENT_PRODUCTION is not in mission_labels.js on the Pig (grep -c = 0) and the directive forbids new vocabulary; design = script brief + pass methodology in payload; outcome = script + ledger + this report in result; verdict SUPPORTED). Completed 2026-09-30 ~14:52 MDT.
- Residue: ping_missions (design + outcome); ping_events (3 OBSERVATION_CREATED + 5 CLAIM_CREATED, correlated by metadata->>'correlation_id'); knowledge_nodes 6 + knowledge_edges 5, namespace marketingos::block40-60 (script, ledger, accuracy-pass, overclaim, L6, learning; edges: ledger->script supports, accuracy->script bounds, overclaim->script clears, l6->script attacks, script->learning supports).
- Driver: `drivers/mkos-driver-d.cjs` (workspace commit follows). Transfer note: scp to the Pig lands on the Windows side (C:\tmp); copy to WSL /tmp before running. No single-shot base64 transfer (cmd.exe 8191-char limit).
- Incidents: none. The I1–I3 lessons from 20–40 held (CLAIM_VERDICTS only; assign→start→complete with row readback; correlation in metadata).
- NOT created: no new authorities, stores, writers, subsystems. No Oracle state touched. Qdrant untouched (not genuinely needed; the ledger file + journal residue suffice). U2 trigger-testing NOT run in this block (task constraint); recorded as the next research mission.

## 7. Readiness for 60–80 (video compiler path)

READY. The 60–80 block inherits: the script draft (headline-parameterized), the 23-claim ledger (every claim fielded for the transcript recheck), the accuracy report (what was cut/narrowed and why), the overclaim scan (clean), and the L6 review (objections pre-answered). The compiler's transcript recheck can verify each spoken line against the ledger's PUBLIC WORDING → MAXIMUM DEFENSIBLE WORDING chain. One open input: Nolan's headline pick (H1/H2/H3) — the script slots it on his word only. Distribution remains stopped at his boundary; this block produced a script and a ledger, not a publication.
