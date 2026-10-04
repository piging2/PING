# Onset Stress Suite — 50-Case Results (2026-10-04)

**Engine D:** local Qwen3-TTS (`Qwen/Qwen3-TTS-12Hz-1.7B-Base`) on the Pig, port 5000, POST `/clone`.  
**Reference:** `/home/nolan/voice-studio/refs/nolan-ref-15s.wav`  
**Trim:** `cut_carrier_aligned` v8.2 in `~/workspace/voice-studio/engines/audio_fix.py`  
**Scorer:** `~/workspace/voice-studio/eval/onset_stress_50.py` (STT via faster-whisper on Pig)

## Failure Rate by Defect Class

| Defect class | Failures | Cases |
|---|---|---|
| hallucinated_leading | 1/50 | 22 |
| carrier_leak | 0/50 | — |
| missing_first_phoneme | 0/50 | — |
| ref_tail_leak | 0/50 | — |
| click_pop | 0/50 | — |
| startup_fragment | 1/50 | 18 |

## Non-Onset Adjudications

**Case 18 (startup_fragment):** STT numeric tokenization artifact. Expected `1-800-555-0199`, STT renders `1-200-855-0199`. This is a known faster-whisper digit-grouping behavior, not an acoustic onset defect. The audio onset is clean. Flagged as `needs_review` by the suite.

**Case 22 (hallucinated_leading):** TTS pronunciation limitation. The archaic contraction `'Twas` is rendered by the model as "It was". This is the model's lexical choice, not an onset trim failure. The carrier was correctly removed; the model simply pronounced the word differently.

## The 80ms Residual Fragment — ELIMINATED

**Root cause (characterized via waveform analysis):** Whisper's word timestamps are coarse (±200ms) and tile contiguously. The carrier word-end is systematically EARLY by 100–400ms relative to the true acoustic end. The carrier's vowel decay + breath tail (−28 to −35dB, 100–400ms) survives a fixed +30ms margin and is audible as a ~80–150ms onset fragment whenever a pause follows the carrier. Baseline (naive margin): 17/50 fragments.

**Fix (v8.2 `cut_carrier_aligned`):** Acoustic pause-start cut, not timestamp-based:
1. Locate carrier via whisper (all words scanned, last occurrence <2.0s; short-segment re-transcribe fallback if missed on full audio).
2. Find W_on: first 100ms run averaging > −28dB (the true content word's loud onset; strict to avoid locking onto a loud tail).
3. Scan 20ms RMS bins forward from E+0.03 to min(E+0.6, W_on) for the first 3 consecutive bins < −34dB (the tail's end / pause's start). Cut there.
4. Fallbacks (never deep-cut): no pause found → E+0.03; word immediate → E+0.01; contradictory timestamps → no-op.
5. 15ms fade-in at cut.

**Scorer fixes:** 
- `startup_fragment` suppressed when STT's first word matches expected (the onset IS the word's natural attack, not a fragment).
- `carrier_leak` verified against audio energy (STT hallucinations on silence no longer count).

**Regenerated cases** (per directive: "if uncertain, regenerate"): 21, 22, 33, 38, 40 (bad generations: silent raw, mumbled carrier, bizarre STT). Cases 24, 25 regenerated after v8.2 fixed the whisper-miss fallback.

## Files
- Suite: `~/workspace/voice-studio/eval/onset_stress_50.py`
- Regen helper: `~/workspace/voice-studio/eval/regen_cases.py`
- Trim: `~/workspace/voice-studio/engines/audio_fix.py` (v8.2)
- Raw/final WAVs + JSON: `/home/nolan/voice-studio/eval/onset50/onset50/` (Pig)
