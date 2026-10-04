# NOLAN-HUMANNESS-GOLDEN-EVAL

The humanness benchmark for the Voice Optimization Program: a fixed set of 25 texts
across 18 voice categories, recorded by each TTS engine, and scored by Nolan on 12
dimensions. Same texts every engine, so comparisons are fair.

## Layout

```
voice/golden-eval/humanness/
  texts.json          # the 25 canonical texts (2-4 sentences each)
  clips/<category>/<nn>.wav   # engine recordings; index.json below
  clips/index.json    # per-clip metadata (text, category, engine, params, sha256)
  scoring_sheet.md    # one-page 1-5 rubric Nolan fills in while listening
  blind_present.py    # blind A/B presentation scaffolding (future D-vs-A)
  README.md           # this file
```

## The 18 categories

confident_explanation (2), casual_conversation (2), curiosity, skepticism,
quiet_reflection, humor, strong_thesis, technical_explanation (2), storytelling (2),
surprise, warning, empathy, question_answer, numbers (2), proper_nouns (2),
acronyms, long_paragraph, rapid_short_sentences (2). 25 clips total.

## What's recorded: engine D (done)

- All 25 texts through the production local-D path on the Pig:
  `engines/local_qwen.py` `gen_local` -> POST 127.0.0.1:5000/clone with
  "Okay. " carrier + nolan-ref-15s.wav reference, then `cut_carrier_aligned`
  (faster-whisper base.en forced alignment, pause-trim fallback).
- Baseline params: pitch_shift=0, rate=1.0, depth=0 (the deeper-voice shift is a
  separate benchmark dimension, not mixed in here).
- Per-clip index entry: text_id, category, clip path, engine ("D"), params,
  sha256, bytes, duration, carrier_removed, attempt, generated_at.
- The index schema is ready for engine=A entries: same fields, engine "A".

## How to run a listening session (Nolan)

1. Open `clips/index.json` for the clip list, or just play files in order:
   `clips/<category>/01.wav`, `02.wav`, ...
2. Print or open `scoring_sheet.md`. For each clip, score the 12 dimensions 1-5
   (1 poor, 5 indistinguishable from a real recording).
3. Recommended order: play all of one category back to back, then move on.
4. Write the overall verdict at the bottom. Be honest; a 3 is more useful than a 5.

## Blind D-vs-A comparison (pending)

`blind_present.py` pairs two clip sets by relative path, plays each pair in
randomized order, and logs preference + dimension scores to JSONL without ever
revealing which clip is which engine during the session:

```
python3 blind_present.py --a clips_D --b clips_A --label-a D --label-b A \
    --out scores_20261004.jsonl
```

## Recording notes (2026-10-04)

- 5 of 25 initial generations failed carrier removal: the model emitted a filler
  word ("is", "Guys,") before or around the "Okay." carrier, so the alignment
  could not find "okay" as the first word. All 5 fixed by regeneration per the
  program directive (never silently publish questionable onset audio). Final:
  25/25 carrier_removed=True.
- long_paragraph_01 (104 words) exceeded the production 300s HTTP timeout twice
  with the service healthy and idle; it succeeded in 52s on a later attempt with
  client timeout 900s (recorded per-clip as timeout_sec). Timeout is a client
  parameter only; audio params are identical.
- Residual onset finding for the onset workstream: the model sometimes
  hallucinates a filler word around the carrier ("is" before it, "Guys," in its
  place, "And"/"A" glued after it). The sacrificial carrier absorbed the
  instability in 20/25 cases on first generation; the rest needed a regen.

## What's pending

- **Engine A (Alibaba) recordings**: quota exhausted. When unblocked, record the
  same 25 texts through the Alibaba path and add them to `clips/index.json`
  (engine "A") under a parallel tree, then run the blind comparison.
- Depth-shift benchmark (pitch/depth != 0) is a separate dimension per the
  program directive, not part of this baseline.
- The onset stress suite (50 representative starts) is separate from this eval.
