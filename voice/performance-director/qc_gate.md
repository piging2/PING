# Automated Quality Gate

Every synthesized chunk passes this gate before it can enter the master. The gate
is evaluable: each check names what is measured, how, the pass criterion, and the
severity. A chunk is either PASS or FAIL; there is no "close enough."

POLICY: FAILED CHUNK -> REGENERATE ONLY THAT CHUNK. Never regenerate the whole
episode for one bad chunk. Never silently publish questionable audio. If a chunk
fails the same check twice in a row, escalate: change the seed (performance-bank
candidate), simplify the chunk's performance state, and if it still fails, flag for
human review with the failing evidence attached.

## Core checks (every chunk)

| # | Check | How it is measured | Pass criterion | Severity |
|---|---|---|---|---|
| 1 | First-word correctness | Forced alignment + ASR on the first 500ms; compare against text's first word | First word fully present, no missing first phoneme | FATAL |
| 2 | Last-word correctness | Alignment + ASR on the final 500ms; compare against text's last word | Last word complete, clean ending, no cutoff | FATAL |
| 3 | Transcript/ASR agreement | Full-chunk ASR transcript vs chunk text (word error rate) | WER at/below 5%; proper nouns and lexicon terms at 0% error | FATAL |
| 4 | Onset artifact | Inspect first 300ms: energy envelope, click/pop detection, non-speech fragment detection | Clean start at zero: no clicks, pops, or startup fragments. Target from the directive: 0 hallucinated words, 0 carrier leakage, 0 missing first phonemes, 0 reference-tail leakage across the 50-case onset stress suite | FATAL |
| 5 | Carrier leakage | Spectral match of chunk audio against the voice reference's carrier/preroll signature | No detectable reference audio bleeding into the chunk | FATAL |
| 6 | Unexpected extra speech | ASR word count vs text word count; alignment coverage | No hallucinated words, no repeated phrases, no trailing mumbling | FATAL |
| 7 | Clipping | Peak sample analysis across the chunk | No samples at full scale for more than 2 consecutive samples; true peak below -1 dBFS | FATAL |
| 8 | Excess silence | Leading/trailing silence measurement; intra-chunk gap analysis | Leading silence under 150ms, trailing under 300ms; no intra-chunk gap over 1.2s unless pause_density >= 0.8 and the gap aligns with punctuation | WARN -> FATAL if leading silence exceeds 500ms |
| 9 | Abnormal duration | Actual duration vs expected (word count * voice baseline rate, +/- scene pace) | Within +/- 25% of expected. Outside that, the voice likely rushed, stalled, or inserted/deleted content | WARN |
| 10 | Speaker similarity | Embedding cosine similarity vs the locked voice reference | At/above the profile's similarity floor (to be set from the golden-eval baseline; a chunk that does not sound like Nolan is not Nolan's podcast) | FATAL |
| 11 | Volume anomaly | RMS/LUFS vs episode running mean | Within +/- 6 LUFS of the episode mean. Sudden loud/quiet chunks break the listening experience | WARN |
| 12 | Boundary discontinuity | Crossfade-region analysis at chunk joints: pitch track, energy, spectral continuity vs neighbor chunks | No audible seam: pitch and energy continuous within natural variation. (Chunking rule from the directive: never synthesize every sentence independently.) | FATAL |
| 13 | Repetition | ASR n-gram repetition detection | No unintended repeated words or phrases. Intentional rhetorical repetition (in the text) passes | FATAL |
| 14 | Gibberish | ASR confidence + language-model perplexity on the transcript | No low-confidence garbage spans; transcript reads as the intended language | FATAL |

## Expressive-segment checks (chunks with emotion_intensity >= 0.3, or any vocal_event)

| # | Check | How it is measured | Pass criterion | Severity |
|---|---|---|---|---|
| 15 | Emotion appropriateness | Human or classifier judgment: does the performed emotion match the chunk's scene_type and the surrounding arc? | Matches the director's intent. Wrong-emotion delivery (e.g. amusement on a WARNING) fails even if the audio is clean | FATAL |
| 16 | Overacting | Intensity judgment vs the chunk's emotion_intensity target | Performed intensity within +/- 0.2 of target. The directive's core risk is theatricality; when in doubt the gate should flag UP (too much) rather than let it pass | WARN (first) -> FATAL (repeat) |
| 17 | Prosody discontinuity | Pitch/rate contour smoothness within the chunk | No sudden unmotivated jumps in pitch or rate mid-chunk. Deliberate emphasis (weight-3 words) is exempt | WARN |
| 18 | Excessive rate/pitch movement | Total pitch excursion and rate variance vs the voice baseline | Stays within the profile's natural variation band. Numerical pitch/rate are secondary adjustments near baseline per the microprosody law; a chunk that wanders far from baseline fails | WARN |

## Gate procedure

1. Synthesize chunk with its PerformanceSpec and seed policy.
2. Run checks 1-14 automatically. Any FATAL fail -> regenerate this chunk only
   (same spec, next seed per seed policy). Any WARN fail -> log, keep the chunk,
   attach the warning to the chunk's evidence record.
3. If emotion_intensity >= 0.3 or vocal_event is set, run checks 15-18.
4. A chunk that fails the same FATAL check twice: try the next seed-bank
   candidate (hero policy). Third failure: hold the chunk, attach all evidence,
   flag for Nolan/human review. Do not loop forever.
5. Boundary check (12) runs after neighboring chunks exist; a chunk may need
   re-gating once its neighbors are final. Keep the gate cheap enough to rerun.
6. Gate results are evidence: store per chunk (check, result, measurement, seed,
   spec hash). This is what lets a later evaluation say WHY a chunk was kept.

## What the gate does NOT do

- It does not judge whether the script is good. Script quality is the director's
  and Nolan's job.
- It does not auto-"fix" audio with processing (no de-clicking a bad onset into
  acceptability). The directive's onset rule stands: alignment/silence/onset
  inspection -> surgical trim -> tiny zero-cross/fade correction -> revalidate,
  and if uncertain, REGENERATE.
- It does not lower the bar for speed. 10-20s extra processing per chunk is
  acceptable to prevent audible artifacts. The listener must never hear the
  machinery.
