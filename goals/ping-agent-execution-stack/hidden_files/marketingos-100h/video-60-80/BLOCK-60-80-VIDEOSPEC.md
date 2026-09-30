# BLOCK 60–80 — VIDEOSPEC (video compiler path)

Artifact: `marketingos-readonly-seal-2026-09-30.mp4` — compiled review artifact, NOT a publication.
Status: FOR NOLAN'S REVIEW ONLY. Distribution stops at his boundary.

## Provenance (honest, stated on every frame footer)
- Narration: synthetic voice (TTS, Meta AI "Smooth"), spoken-form conversion of the accuracy-passed 40–60 script. No content change from the script; pronunciation mappings only (e.g. `default_transaction_read_only` → "default transaction read only").
- Visuals: deterministic frames rendered from RECORDED evidence. The disposable PG 16 was destroyed after the 0–20 trials; trial SQL is the real trial SQL (`drivers/mkos-t*.sql`); outputs are the recorded outputs from BLOCK-0-20-REPORT.md. Frames are rendered reconstructions, not live captures — the footer says so.
- Headline: PARAMETERIZED. Frame S01 carries "[ HEADLINE — NOLAN'S PICK PENDING ]". No headline stronger than the evidence map is asserted anywhere.
- AI video generation was deliberately NOT used: prompt-led synthetic footage would fabricate terminal sessions and undermine the technical-credibility register. Every pixel of evidence on screen traces to a recorded trial, doc quote, or inspection.

## Shots (12)

| shot | narration part | visual | evidence source | ledger mapping |
|---|---|---|---|---|
| S01 | topic + headline slot | Title frame: topic, date, trial count, headline placeholder box | — (framing) | headline: PARAMETERIZED |
| S02 | Part 1a | Terminal frame: T1 SQL + recorded ERROR | drivers/mkos-t12.sql; 0–20 report C1 | CL-01 |
| S03 | Part 1b | Terminal frame: T2/T3 SQL + recorded success | drivers/mkos-t12.sql, mkos-t38.sql; C2 | CL-02, CL-03 |
| S04 | Part 1c | Docs frame: runtime-config-client quote + USERSET context | PG16 docs (recorded in 0–20) | CL-04, CL-20 |
| S05 | Part 2a | Split frame: retirement-doc quote vs T9a/T9b recorded outcomes | drivers/mkos-t9.sql; K2; C6 | CL-06, CL-05 |
| S06 | Part 2b | Chain frame: doc claim —assumes→ app behavior —UNVERIFIED→ gateway code | K2 resolution; U1/N1 | CL-07 |
| S07 | Part 3a | Terminal frame: T10 SQL + recorded outcome (all writes blocked incl. READ WRITE) | drivers/mkos-t10.sql; C7 | CL-08, CL-23 |
| S08 | Part 3b | Docs frame: superuser bypass (docs-cited, NOT trialed) + C8 inspection (role ping = superuser) | PG docs; C8 inspection | CL-09 (N6), CL-10 |
| S09 | Part 3c | Evidence board: verified present / unverified / verified-present-untested | C8; U1/N1; U2/N2 | CL-11, CL-21 |
| S10 | Part 4a | Split terminal: T4 fail vs T11 success + K1 correction note | drivers/mkos-t38.sql, mkos-t11.sql; K1 | CL-12, CL-13, CL-22 |
| S11 | Part 4b | Matrix frame: operation × read-only result (T4/T5 blocked; T6/T7/T11 work) | T4, T5, T6, T7, T11 | CL-14, CL-15 |
| S12 | Part 5 | Checklist: 5 non-verifications + next mission + closing line | U1–U5; CL-16..CL-19 | CL-16, CL-17, CL-18, CL-19 |

## Transcript recheck (every spoken line → ledger claim)
The narration is the 40–60 script in spoken form. The 40–60 accuracy pass already verified every script sentence against the 11-entry evidence map (inclusion) and N1–N7 (exclusion), with 1 narrow applied. This pass re-verifies the SPOKEN conversion introduced no new claims:

- Spoken-form edits are pronunciation mappings only: `default_transaction_read_only`→"default transaction read only", `ALTER ROLE ... SET`→"a role setting", `PostgreSQL`→"Postgres", `DML`→"D M L", `DDL`→"D D L", numbers spelled out. No semantic change.
- S01: framing only, no claim; headline slot explicit.
- S02: CL-01 public wording, verbatim content.
- S03: CL-02 + CL-03. "The setting bends the moment the session asks it to" = CL-20's public wording in plain speech ("What we had was a session default"), kept within scope.
- S04: CL-04 (docs quote paraphrased from the recorded docs text) + CL-20.
- S05: CL-06 (doc quote) + CL-05 (both trials). "as a claim about Postgres itself, was wrong" = K2 contradiction resolution, already in the script.
- S06: CL-07 (attributed, narrowed form) + U1/N1 stated as unverified. "check what you actually have" = advisory within CL-20's scope.
- S07: CL-08 + CL-23 (explanatory synthesis; the non-superuser scope arrives in S08, same constraint the script satisfied).
- S08: CL-09 (docs-cited, trial disclaimer spoken: "We did not trial it; we are citing the docs" = N6) + CL-10.
- S09: CL-11 (three-part honest seal) + CL-21 (N7 epistemic boundary).
- S10: CL-12, CL-13, CL-22 (K1 correction).
- S11: CL-14, CL-15. "Do not generalize from the name read-only. Test each operation class." = synthesis of the matrix, within the tested classes.
- S12: N1, N2, CL-16 (N3), CL-17 (N4), CL-18 (N5), CL-19 (next mission, Oracle writes out of scope). Closing synthesis within CL-20/CL-21 scope; "the boundary that actually holds" carries the non-superuser scope in the same sentence.

CUTS / NARROWS from this pass: none. The 40–60 narrow ("a lot of teams" → cut) remains cut. No script sentence asserts anything in N1–N7 as verified fact.

## Build recipe
1. `tts speak` per shot narration → `audio/sNN.mp3` (voice: avocado_v2:MAI_03 Smooth, default).
2. PIL renders `frames/sNN.png` (1920×1080) from the content spec in `render-frames.py`.
3. ffmpeg per-shot: `-loop 1 -i frames/sNN.png -i audio/sNN.mp3 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest seg/sNN.mp4`.
4. Concat segments → `marketingos-readonly-seal-2026-09-30.mp4`.
5. Verify: duration, streams, and a spot-check that each segment's audio matches its shot.

## Open inputs
- Nolan's headline pick (H1/H2/H3). S01's placeholder slots it with zero other changes; the narration's S01 line is headline-agnostic.
- Human approval boundary: this artifact is review-ready, not approved, not distributed.
