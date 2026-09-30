# C1 Shot Plan: "Your audit log is not evidence"

MarketingOS Sprint 2, Block 45-60, opportunity C1. Planning only. No render in this block.
Sources: `C1-EVIDENCE-PACKAGE.md`, `CLAIM-LEDGER-S2-45-60-HUMAN.md` / `claim-ledger-s2-45-60.json` (19 rows).
Provider guidance (binding): `~/workspace/research_notes/video-generator-integrations-20260930/RANKED-OPTIONS.md`.
Nolan rejected the sprint-1 PIL-frame reconstruction video. This plan is input to a future compiler pass
(Remotion deterministic composition for all factual overlays; Veo 3.1 as the generation candidate only for
non-factual ambient footage; never a generative model rendering factual text).

## Standing rules for this plan

- Every shot carries a burned provenance footer: `PING MarketingOS S2 | C1 ledger 2026-09-30 | evidence graded | synthetic narration`.
- Factual overlays are DETERMINISTIC only: claim text, evidence citations, code or trial captures, diagrams,
  scoreboard tables. Rendered verbatim from ledger `public_wording` / `maximum_defensible_wording`.
- Generated footage never carries claims. GENERATIVE-CANDIDATE shots carry no factual content at all; they are
  ambient only, and the compiler may cut them without affecting the argument.
- Provider is replaceable. Each shot names a recommended shot class, not a vendor lock-in.
- No em dashes anywhere in the artifact. Narration voice: synthetic TTS, disclosed.

## Shot count summary

- 13 DETERMINISTIC shots (Remotion-class composition)
- 2 GENERATIVE-CANDIDATE shots (Veo 3.1-class, ambient, claim-free, optional)
- Total: 15 shots. Estimated runtime: deterministic content about 3 min 10 s; ambient interstitials add up to 8 s.

## Shot table

| Shot | Section | Asset class | Provider rec | Dur | Claim rows |
|------|---------|-------------|--------------|-----|------------|
| G01 | Cold open (ambient) | GENERATIVE-CANDIDATE | Veo 3.1-class | 4 s | none (claim-free) |
| S01 | Hook: the scoreboard | DETERMINISTIC: scoreboard table | Remotion-class | 12 s | CLS2-01 |
| S02 | The two questions | DETERMINISTIC: kinetic type | Remotion-class | 10 s | CLS2-16 |
| S03 | Mechanism diagram | DETERMINISTIC: diagram | Remotion-class | 18 s | CLS2-01, CLS2-03, CLS2-16 |
| S04 | Temporal precedent | DETERMINISTIC: docs capture + citation | Remotion-class | 14 s | CLS2-02 |
| S05 | Fin back-test | DETERMINISTIC: evidence citations | Remotion-class | 14 s | CLS2-04 |
| S06 | Lossy consolidation example (Asana) | DETERMINISTIC: evidence citations | Remotion-class | 12 s | CLS2-05 |
| S07 | Best in field ceiling (Linear HMAC) | DETERMINISTIC: code-ish trace | Remotion-class | 10 s | CLS2-06 |
| S08 | Reckoning 1: our trigger seal is class-bound | DETERMINISTIC: trial row captures | Remotion-class | 16 s | CLS2-13 |
| S09 | Reckoning 2: production role outside the seal | DETERMINISTIC: kinetic type | Remotion-class | 14 s | CLS2-14, CLS2-15 |
| S10 | The narrowed standard | DETERMINISTIC: kinetic type | Remotion-class | 12 s | CLS2-03 |
| S11 | GDPR tension and the cost caveat | DETERMINISTIC: kinetic type + citations | Remotion-class | 14 s | CLS2-12, CLS2-11 |
| S12 | Falsifiers: five kill criteria | DETERMINISTIC: table | Remotion-class | 16 s | ledger falsifier map |
| S13 | Follow-up experiments E-1 to E-4 | DETERMINISTIC: list + citations | Remotion-class | 14 s | evidence doc section 9 |
| G02 | Cold close (ambient) | GENERATIVE-CANDIDATE | Veo 3.1-class | 4 s | none (claim-free) |

## Shot details

### G01: Cold open, ambient (GENERATIVE-CANDIDATE)

- Section: hook pre-roll.
- Narration refs: none. This shot is silent under the first narration line of S01 or carries no audio.
- Visual treatment: abstract slow-motion data-stream texture, dark, no text, no logos, no recognizable people.
- Asset class: GENERATIVE-CANDIDATE. Carries zero factual content. Cut without argument loss if generation is unavailable.
- Duration: 4 s.
- Provider recommendation: Veo 3.1-class generation. Never Remotion (no facts to compose) and never used for any claim.
- Claim trace: none. Deliberately claim-free.
- Guardrail: any text the generator invents is a defect; output must be re-generated or cut until text-free.

### S01: Hook, the scoreboard (DETERMINISTIC)

- Section: hook.
- Narration refs: SCRIPT N01, basis CLS2-01 `public_wording` (verbatim, or trimmed to fit with ledger approval).
- Visual treatment: scoreboard table. Rows: 34 systems surveyed; grade A: 0; grade B: ceiling (Linear webhooks, Fin debugger); grade B lossy (Asana); grade C (D365 Copilot Cowork). Column: system / continuity grade / one-line reason. The zero cell is the visual anchor.
- Asset class: DETERMINISTIC, scoreboard table.
- Duration: 12 s.
- Provider recommendation: Remotion-class composition. Footer burned in code on every frame.
- Claim trace: CLS2-01 (CONFIRMED, independent). Scope bound: survey-bounded, not universal.
- Factual text budget: scoreboard cells + one headline slot, parameterized until Nolan picks (H1, H2, or H3).

### S02: The two questions (DETERMINISTIC)

- Section: thesis statement.
- Narration refs: SCRIPT N02, basis CLS2-16 `public_wording` (verbatim or trimmed).
- Visual treatment: kinetic type. Two sentences alternate on screen: "Audit logs answer: what changed." / "Replay answers: prove it."
- Asset class: DETERMINISTIC, claim text, kinetic type synced to word timestamps from TTS.
- Duration: 10 s.
- Provider recommendation: Remotion-class composition.
- Claim trace: CLS2-16 (CONFIRMED, independent).

### S03: The mechanism diagram (DETERMINISTIC)

- Section: mechanism.
- Narration refs: SCRIPT N03-N04, basis CLS2-01 and CLS2-03 `public_wording`.
- Visual treatment: split diagram. Left: audit trail sitting on mutable current-state storage (labeled "a feature of the record system"). Right: pinned immutable event plane feeding deterministic derivations (labeled "replayable derivations"). Arrow labeled "inputs pinned at decision time" only on the right. No vendor names on the diagram; this is the architectural claim, not the survey result.
- Asset class: DETERMINISTIC, diagram.
- Duration: 18 s.
- Provider recommendation: Remotion-class composition.
- Claim trace: CLS2-01, CLS2-03 (CONFIRMED, independent), CLS2-16.

### S04: Temporal precedent (DETERMINISTIC)

- Section: counterevidence answered.
- Narration refs: SCRIPT N05, basis CLS2-02 `public_wording` (verbatim or trimmed).
- Visual treatment: recorded capture of the cited docs page (docs.temporal.io event history) with citation card:
  source line, "Temporal docs, event history", and the WorkflowReplayer note. Banned primitives list rendered as
  code text: `Date.now()`, `Math.random()`, direct network calls.
- Asset class: DETERMINISTIC, recorded docs capture + evidence citation.
- Duration: 14 s.
- Provider recommendation: Remotion-class composition (recorded capture is our own screenshot of a cited page;
  citation text rendered verbatim).
- Claim trace: CLS2-02 (CONFIRMED, independent). Scope on screen: "workflow infrastructure only; proves the
  primitive is engineerable, not CRM adoption."

### S05: Fin back-test (DETERMINISTIC)

- Section: the achievable layer.
- Narration refs: SCRIPT N06, basis CLS2-04 `public_wording` (verbatim or trimmed).
- Visual treatment: five-step strip: trace reasoning / find root cause / propose rewrite / back-test against the
  original conversation / suggest production monitor. Each step cited: VentureBeat interview, DevRev piece,
  myaskai detail. Scope card: "artifact-level regression, not bit-identical generation replay."
- Asset class: DETERMINISTIC, evidence citations.
- Duration: 14 s.
- Provider recommendation: Remotion-class composition.
- Claim trace: CLS2-04 (CONFIRMED, independent). "Only production example" wording carries the counterevidence
  condition (update if another vendor ships it).

### S06: Lossy consolidation example, Asana (DETERMINISTIC)

- Section: what grade B lossy looks like.
- Narration refs: SCRIPT N07, basis CLS2-05 `public_wording` (verbatim or trimmed).
- Visual treatment: timeline mock: three changes to one field within 24 hours collapse to one visible change,
  with the forum citation (Phil Seeman, forum thread 55127) as the evidence card. Second card: API returns only
  the web-app stream.
- Asset class: DETERMINISTIC, evidence citations.
- Duration: 12 s.
- Provider recommendation: Remotion-class composition.
- Claim trace: CLS2-05 (CONFIRMED, independent).

### S07: Best in field ceiling, Linear HMAC webhooks (DETERMINISTIC)

- Section: the honest ceiling.
- Narration refs: SCRIPT N08, basis CLS2-06 `public_wording` (verbatim or trimmed).
- Visual treatment: header block rendered as code text: `Linear-Signature` header, HMAC-SHA256 over raw body,
  hex-encoded. Scope card on screen: "signed derived stream, not an immutable source."
- Asset class: DETERMINISTIC, code/trace capture.
- Duration: 10 s.
- Provider recommendation: Remotion-class composition.
- Claim trace: CLS2-06 (CONFIRMED, independent).

### S08: Reckoning 1, our trigger seal is class-bound (DETERMINISTIC)

- Section: mandatory S-2 reckoning, part 1.
- Narration refs: SCRIPT N09, basis CLS2-13 `public_wording` (verbatim or trimmed).
- Visual treatment: trial row captures from mission 8924ebeeb4094c37: U2-C1 through C7 CONFIRMED; the verbatim
  post-trial row "bypassed" for `session_replication_role=replica`; table owner DROP TRIGGER note. Scope card:
  disposable PG 15 instance; open items U3/U4/U5/U6 listed as open, not hidden.
- Asset class: DETERMINISTIC, code/trace captures (verbatim trial output).
- Duration: 16 s.
- Provider recommendation: Remotion-class composition.
- Claim trace: CLS2-13 (CONFIRMED, independent, EXPERIMENTAL).

### S09: Reckoning 2, production role outside the seal (DETERMINISTIC)

- Section: mandatory S-2 reckoning, part 2.
- Narration refs: SCRIPT N10, basis CLS2-14 and CLS2-15 `public_wording` (verbatim or trimmed).
- Visual treatment: two-panel. Panel 1: role class the seal binds (non-owner, non-superuser) vs the production
  app role `ping` (superuser, outside the seal). Panel 2: "holds via app discipline, never via the database"
  plus the honesty card: "we argue for the standard; we do not claim grade A." Open-question note on screen:
  app behavior unverified, must not be asserted.
- Asset class: DETERMINISTIC, claim text.
- Duration: 14 s.
- Provider recommendation: Remotion-class composition.
- Claim trace: CLS2-14 (CONFIRMED, independent), CLS2-15 (CONFIRMED, independent, METHODOLOGICAL).

### S10: The narrowed standard (DETERMINISTIC)

- Section: definition.
- Narration refs: SCRIPT N11, basis CLS2-03 `public_wording` (verbatim or trimmed).
- Visual treatment: kinetic type. Definition card: deterministic derivations (scores, projections, transitions)
  replayable from a pinned immutable event plane. Explicit exclusion card: "not bit-identical replay of
  LLM-agent generation; that reading is disclaimed."
- Asset class: DETERMINISTIC, claim text.
- Duration: 12 s.
- Provider recommendation: Remotion-class composition.
- Claim trace: CLS2-03 (CONFIRMED, independent, DEFINITIONAL).

### S11: GDPR tension and the cost caveat (DETERMINISTIC)

- Section: costs of the standard.
- Narration refs: SCRIPT N12, basis CLS2-12 and CLS2-11 `public_wording` (verbatim or trimmed).
- Visual treatment: two cards. Card 1: GDPR Article 17 erasure vs append-only history, reconciliation
  crypto-shredding, EDPB Guidelines 02/2025 (adopted 2026-04-08). Card 2: Fowler costs: eventual consistency,
  permanent schema evolution burden, more moving parts. Framing line on screen: "the cost caveat is part of the
  standard, not a refutation."
- Asset class: DETERMINISTIC, evidence citations.
- Duration: 14 s.
- Provider recommendation: Remotion-class composition.
- Claim trace: CLS2-12 (CONFIRMED, independent), CLS2-11 (CONFIRMED, independent).

### S12: Falsifiers, five kill criteria (DETERMINISTIC)

- Section: what would kill the thesis.
- Narration refs: SCRIPT N13, basis evidence doc section 8 and the ledger falsifier map (verbatim or trimmed).
- Visual treatment: numbered table of the five kill criteria: (1) a surveyed vendor demonstrates deterministic
  replay from an immutable event plane; (2) convergence-lane archaeology surfaces event-sourced internals
  (internals narrow, shipped behavior kills); (3) a production CRM ships continuity-A; (4) a CRM rebuilds on
  an event-sourced core like Temporal; (5, weaker) immudb/KurrentDB-class infrastructure gains decision-replay
  semantics plus vendor adoption. Framing line: "the first one that fires ends the thesis."
- Asset class: DETERMINISTIC, table.
- Duration: 16 s.
- Provider recommendation: Remotion-class composition.
- Claim trace: ledger falsifier map; attaches to CLS2-01, CLS2-15, CLS2-02, CLS2-18, CLS2-07, CLS2-09.

### S13: Follow-up experiments E-1 to E-4 (DETERMINISTIC)

- Section: next experiments.
- Narration refs: SCRIPT N14, basis evidence doc section 9 (verbatim or trimmed).
- Visual treatment: four experiment cards: E-1 pinned replay proof from our journal (the honesty gap, either
  result reportable); E-2 Fin-pattern replication on a public conversation artifact; E-3 cost of immutability
  quantification; E-4 scoreboard refresh after convergence-lane archaeology lands. No new store for E-1, stated
  on the card.
- Asset class: DETERMINISTIC, list + citations.
- Duration: 14 s.
- Provider recommendation: Remotion-class composition.
- Claim trace: C1 evidence doc section 9 (named, bounded experiments).

### G02: Cold close, ambient (GENERATIVE-CANDIDATE)

- Section: outro.
- Narration refs: none.
- Visual treatment: abstract slow-motion data-stream texture, dark, no text, no logos, no recognizable people.
- Asset class: GENERATIVE-CANDIDATE. Carries zero factual content. Cut without argument loss if generation is
  unavailable.
- Duration: 4 s.
- Provider recommendation: Veo 3.1-class generation. Same text-free guardrail as G01.

## Asset-class inventory

- DETERMINISTIC: 13 shots. All claim text, citations, trial captures, diagrams, and tables composed in code;
  every frame carries the provenance footer; narration audio from dedicated TTS with word timestamps driving
  kinetic type.
- GENERATIVE-CANDIDATE: 2 shots. Ambient only, claim-free, optional, Veo 3.1-class. Generative pixels never
  touch factual content.
- Excluded by plan: Sora (discontinued), avatar talking heads (wrong genre for evidence-heavy pieces per the
  survey), stock montage B-roll (slop risk with this audience).

## Compiler contract notes

- The compiler receives: this shot plan, the claim ledger JSON (19 rows, verbatim `public_wording` /
  `maximum_defensible_wording`), the script draft with narration lines N01-N14, evidence captures, and TTS
  audio with word timestamps.
- Render is rejected if any spoken line or on-screen factual line cannot resolve to a ledger claim's PUBLIC
  WORDING within its MAXIMUM DEFENSIBLE WORDING.
- Headline slot stays parameterized until Nolan picks (H1/H2/H3 from the ledger `headline` block).
- Remotion licensing review (commercial embedding) is an open verification item before the compiler is wired;
  Shotstack is the no-infra fallback with the same inputs.
