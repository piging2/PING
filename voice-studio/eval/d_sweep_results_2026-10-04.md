# Engine D Parameter Sweep Results — 2026-10-04 (worker B)

Baseline: `voice-studio/eval/d_baseline.json` (commit e0452aad). Probe set: `voice-studio/eval/sweep_probe_10.json` (frozen, 10 texts).

## Method

- 8 variants, one conceptual dimension at a time around the official Qwen defaults
  (do_sample=true, top_k=50, top_p=1.0, temperature=0.9, repetition_penalty=1.05).
- Subtalker sampling params tracked their talker counterparts (they ship paired in the
  official defaults); repetition_penalty has no subtalker counterpart.
- Request shape kept IDENTICAL to production `gen_local()`: `"Okay. "` carrier prefix,
  same 15s reference audio + transcript, ICL mode (`x_vector_only_mode=False`),
  `language="English"`. The ONLY deliberate differences from production: device
  (CPU, to avoid GPU contention with the live service) and the single swept parameter.
- The production `/clone` endpoint accepts no sampling parameters, so sweep generations
  ran inside the `qwen3-tts-service` container via `Qwen3TTSModel.generate_voice_clone`
  with explicit kwargs. Production code, config, and parameters were NOT touched.
- 80/80 generations succeeded, 0 failures, ~47 min total on Pig CPU (~35s per generation).
- Onset scored by STT (faster-whisper base.en, word timestamps) on the RAW carrier-prefixed
  audio, so the measurement isolates generation behavior from the (frozen) trim path.
  Scorer re-run reproduced 0/80 onset-label flips: the table below is stable.

## Results

| variant | changed params | onset flags /10 | breakdown | repetition | word agree~ | timbre cos vs base~ |
|---|---|---|---|---|---|---|
| base | (official defaults) | 2 | p02 carrier skipped, clean direct start (benign); p04 "palisin" proper-noun mangle (probe artifact, all variants) | 0 | 0.973 | — |
| t07 | temperature 0.7 (+subtalker 0.7) | 0 | — | 0 | 0.982 | 0.9997 |
| t11 | temperature 1.1 (+subtalker 1.1) | 0 | — | 0 | 0.964 | 0.9997 |
| k20 | top_k 20 (+subtalker 20) | 0 | — | 0 | 0.974 | 0.9997 |
| k100 | top_k 100 (+subtalker 100) | 3 | p03, p07 carrier skipped, clean direct starts (benign); **p04 REAL hallucinated lead-in: "yeah it's okay palisid pictures always sell out…"** | 0 | 0.950 | 0.9997 |
| r100 | repetition_penalty 1.0 | 1 | p07 carrier rendered "ok" not "okay" (benign; text itself clean) | 0 | 0.955 | 0.9997 |
| r115 | repetition_penalty 1.15 | 0 | — | 0 | 0.978 | 0.9997 |
| p09 | top_p 0.9 (+subtalker 0.9) | 0 | — | 0 | 0.945 | 0.9997 |

Notes:
- "Carrier skipped, clean direct start": the model began the real text directly without the
  sacrificial "Okay." and without any artifact. Benign (arguably ideal); counted as a flag
  for completeness, not as a defect.
- p04 ("Palisade peaches…") is mangled by the model in EVERY variant (palisin/palisid/
  palisite): a parameter-independent proper-noun pronunciation weakness, not a sweep signal.
- No variant showed repetition loops, abnormal durations (mean 5.5–5.9s per probe, uniform),
  volume anomalies (RMS −30.9 to −31.9 dB, uniform), or leading-silence anomalies.
- Timbre (long-term-average-spectrum cosine vs the base variant, same probe): 0.9996–0.9997
  for every variant. Sampling parameters do not move voice identity.
- Qualitative naturalness by ear was NOT measured in this pass (no listening harness in the
  sandbox); acoustic proxies above are uniform and unremarkable across variants.

## Recommendation

**No promotion.** The official defaults hold. Directional signals for future work:
1. Do NOT raise top_k toward 100: the single genuine hallucinated lead-in in the whole
   sweep ("yeah it's okay…") came from k100. top_k=20 is safe but shows no onset benefit
   over 50 on these 10 probes.
2. Temperature 0.7/1.1, top_p 0.9, repetition_penalty 1.0/1.15: no onset effect either way.
   Any future case for changing them must come from expressiveness/naturalness evaluation,
   not onset.
3. Per the program rule, nothing promotes on a small probe set anyway; a promotion case
   would need the 50-case onset stress suite plus the humanness benchmark.

## Incidental findings (not sweep conclusions)

1. **Trim cut-point jitter (production-path robustness note).** While building the scorer,
   `cut_carrier_aligned`'s whisper word-boundary placement jittered ~200ms run-to-run under
   int8 CPU inference, occasionally leaving a carrier remnant or clipping into the first
   word. The final scoring above bypasses the trim (scores raw audio), so sweep conclusions
   are unaffected. Relevant to the residual-startup-fragment hunt: the trim path deserves a
   determinism/robustness pass of its own (e.g. margin + boundary sanity checks).
2. **Sandbox whisper bootstrap quirk.** faster-whisper's model-download path crashes in this
   sandbox (httpx chokes on the `no_proxy` IPv6 entries); pointing `WhisperModel` at the
   cached snapshot path works. Production trim runs on the Pig, unaffected.
