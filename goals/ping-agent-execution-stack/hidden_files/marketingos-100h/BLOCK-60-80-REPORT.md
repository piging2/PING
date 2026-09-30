# BLOCK 60–80 REPORT — VIDEO COMPILER PATH (2026-09-30)

Inputs: BLOCK-40-60-SCRIPT.md (5 parts, spoken draft), claim-ledger-40-60.json (CL-01…CL-23), BLOCK-40-60-REPORT.md (accuracy/overclaim/L6). Method: VideoSpec → narration (spoken form) → evidence-rendered frames → ffmpeg assembly → transcript recheck. Nothing below reshapes the plan.

## 1. The artifact

`video-60-80/marketingos-readonly-seal-2026-09-30.mp4` — ONE compiled video artifact, review-ready.
- 12 shots (S01…S12), each a 1920×1080 evidence frame + its narration segment, ffmpeg-assembled (libx264/yuv420p + aac).
- Narration: single synthetic voice (Meta AI "Smooth", `avocado_v2:MAI_03`), spoken-form conversion of the 40–60 script. Spoken-form edits are pronunciation mappings only; no semantic change.
- Visuals: deterministic PIL frames rendered from RECORDED evidence — real trial SQL (`drivers/mkos-t9/t10/t11/t12/t38.sql`) + recorded outputs (BLOCK-0-20-REPORT.md: findings C1–C8, contradictions K1/K2, unresolved U1–U5). No AI-generated footage.
- Provenance footer on EVERY frame: "Rendered from recorded evidence (trials 2026-09-30, disposable PG 16 — destroyed after run). Not a live capture. Narration: synthetic voice. Headline: pending Nolan's pick."
- Headline: PARAMETERIZED on S01 ([ HEADLINE — NOLAN'S PICK PENDING: H1 / H2 / H3 ]); narration S01 is headline-agnostic. Slots in with zero other changes on Nolan's word.
- Status: FOR NOLAN'S REVIEW ONLY. NOT a publication. Zero distribution.

## 2. Transcript recheck (separate; every spoken line → ledger claim)

The narration is the 40–60 script in spoken form. The 40–60 accuracy pass already verified every script sentence against the 11-entry evidence map (inclusion) and N1–N7 (exclusion), with 1 narrow applied. This pass re-verified the spoken conversion introduced no new claims:

- S01: framing only, no claim; headline slot explicit.
- S02: CL-01 (public wording, verbatim content).
- S03: CL-02 + CL-03. "The setting bends the moment the session asks it to" = CL-20's public wording in plain speech, kept within scope.
- S04: CL-04 (docs quote paraphrased from recorded docs text) + CL-20.
- S05: CL-06 (doc quote) + CL-05 (= K2 contradiction resolution).
- S06: CL-07 (attributed, narrowed form) + U1/N1 stated as unverified in the same passage.
- S07: CL-08 + CL-23 (explanatory synthesis; the non-superuser scope arrives in S08 — the same constraint the script satisfied).
- S08: CL-09 (N6 trial disclaimer spoken: "We did not trial it; we are citing the docs") + CL-10.
- S09: CL-11 (three-part honest seal) + CL-21 (N7 epistemic boundary).
- S10: CL-12, CL-13, CL-22 (K1 correction).
- S11: CL-14, CL-15 ("Do not generalize from the name read-only" = synthesis of the tested matrix).
- S12: N1, N2, CL-16 (N3), CL-17 (N4), CL-18 (N5), CL-19 (next mission; Oracle writes out of scope). Closing synthesis within CL-20/CL-21 scope; "the boundary that actually holds" carries the non-superuser scope in the same sentence.

CUTS / NARROWS from this pass: 0. The 40–60 narrow ("a lot of teams" cut) remains cut. No spoken line asserts anything in N1–N7 as verified fact.

## 3. Self-caught fabrication (fixed BEFORE assembly)

Draft frames S03 and S05 carried invented `RETURNING id` values (7, 8, 12). The 0–20 mission record never recorded the returned ids — only the outcomes (writes succeeded / blocked). All three were replaced with recorded outcomes (`INSERT 0 1`; "write succeeded" / "blocked") before the frames were re-rendered and before any assembly. The frame was the detection surface; the fix is in `render-frames.py` and the re-rendered PNGs.

## 4. Deviations (all honest, all disclosed)

1. Frames are rendered reconstructions of recorded evidence, not screenshots of the trial sessions — the disposable PG 16 was destroyed after the 0–20 trials. The VideoSpec and every frame footer say so.
2. The T10 frame shows recorded outcomes ("every write blocked — permission denied", "blocked again under explicit READ WRITE") rather than a captured transcript; the 0–20 record confirms the verdict, not the exact error string.
3. Narration voice is synthetic; disclosed in the spec and on every frame footer.
4. AI video generation deliberately NOT used: prompt-led synthetic footage would fabricate terminal sessions and sever the claim chain. For evidence-native technical pieces, rendered evidence frames + narration + ffmpeg assembly is the compiler default going forward.

## 5. Mission + journal record

- Mission `e492bfb9ea7981cd` (EXPERIMENT_RUN, existing vocabulary — CONTENT_PRODUCTION is not in mission_labels.js on the Pig and the directive forbids new vocabulary; design = VideoSpec + recheck protocol in payload; outcome = artifact + this report in result; verdict SUPPORTED). Completed 2026-09-30.
- Residue: ping_missions (design + outcome); ping_events (3 OBSERVATION_CREATED + 4 CLAIM_CREATED, correlated); knowledge_nodes 5 + knowledge_edges 4, namespace `marketingos::block60-80` (videospec, artifact, recheck, provenance, learning; edges: spec→artifact drives, recheck→artifact bounds, provenance→artifact marks, artifact→learning supports).
- Driver: `drivers/mkos-driver-e.cjs`. Transfer note: scp to the Pig lands on the Windows side (C:\tmp); copy to WSL /tmp before running.
- Incidents: none. The I1–I3 lessons from 20–40 held (CLAIM_VERDICTS only; assign→start→complete with row readback; correlation in metadata).
- NOT created: no new authorities, stores, writers, subsystems. No Oracle state touched. Qdrant untouched. No push.

## 6. Readiness for 80–100 (close the learning loop)

READY. The 80–100 block inherits: the review-ready artifact (headline-parameterized), the VideoSpec (shot-level claim mapping for any post-distribution audit), the transcript recheck (the audit trail), and the provenance record. Once Nolan approves AND picks a headline, and distribution is authorized, the loop observes through the canonical /ingest seam, preserving the observation window and separating the five outcome classes — ATTENTION / INTELLECTUAL ENGAGEMENT / INTENT / AUTHORITY / BUSINESS — with causally modest experiments (SUPPORTED / FALSIFIED / INCONCLUSIVE / UNOBSERVABLE / PENDING_WINDOW). Candidate playbook rules from this block: (a) rendered-evidence-frames as the compiler default for technical pieces; (b) the ledger-before-accuracy-pass order (carried from 40–60); (c) headline-parameterization until human pick. None become policy silently.

One open input: Nolan's headline pick (H1/H2/H3) — slots into S01 with zero other changes. Distribution remains stopped at his boundary.
