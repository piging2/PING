# Voice-Clone Reference Audio Inventory: Nolan Geske — PIG DEEP AUDIT
**Date:** 2026-09-19 · **Scope:** Pig (Windows, read-only) · **Method:** direct file survey + audio extraction + faster-whisper transcription

## Key discovery
Nolan already has a purpose-built voice corpus on the Pig: `C:\Users\nolan\qwen3-tts-docker\voice-corpus\`
(built 2026-09-08/10 during his Qwen3-TTS voice-factory experiments; a `Dockerfile.cosyvoice` is also present).
A prior inventory (`VOICE_CORPUS_INVENTORY.json`, 14 source recordings, 10.8 GB) exists, but **all the large
original videos have since been deleted** from Videos/OneDrive. What survives: extracted 24 kHz mono WAVs +
one 43-min reconstructed MP4.

## All files found (name / path / size / date / status)
| # | File | Size | Date | Now |
|---|---|---|---|---|
| 1 | Videos/2026-06-10 19-43-30.mp4 | 327 KB | 2026-06-10 | exists, test clip, unsuitable |
| 2 | Videos/2026-06-24 10-56-26.mp4 | 2.4 MB | 2026-06-24 | exists, tiny clip, unsuitable |
| 3 | voice-corpus/SRC-VOICE-000006.wav (was: 2026-07-08 20-39-33.mp4, 5.2 GB) | 350 MB | 2026-07-08 | source mp4 GONE, wav survives |
| 4 | voice-corpus/SRC-VOICE-000004.wav (was: 2026-06-24 10-56-35.mp4, 2.9 GB) | 195 MB | 2026-06-24 | source GONE, wav survives |
| 5 | voice-corpus/SRC-VOICE-000002.wav (was: 2026-06-16 15-12-53.mp4, 521 MB) | 103 MB | 2026-06-16 | source GONE, wav survives |
| 6 | voice-corpus/SRC-VOICE-000011.wav (was: WIN_20260601_13_12_51_Pro.mp4, 1.7 GB phone) | 38.7 MB | 2026-06-01 | source GONE, wav survives |
| 7 | voice-corpus/SRC-VOICE-000005.wav (was: 2026-06-24 12-04-28.mp4, 587 MB) | 38.3 MB | 2026-06-24 | source GONE, wav = silent/dead |
| 8 | voice-corpus/SRC-VOICE-000008.wav (was: pr.mp4, 380 MB) | 28.5 MB | 2026-07-10 | source GONE, wav survives |
| 9 | voice-corpus/SRC-VOICE-000009.wav (was: 2026-08-23 15-54-23.mkv, 145 MB) | 9.6 MB | 2026-08-23 | source GONE, wav = 2-speaker podcast |
| 10 | voice-corpus/SRC-VOICE-000010.wav (phone) | 2.8 MB | 2026-06-01 | 58 s, verified Nolan |
| 11 | voice-corpus/SRC-VOICE-000012.wav (phone) | 1.9 MB | 2026-06-01 | 39 s, verified Nolan |
| 12 | Media_Processing_Work/.../conservative_final_reconstructed.mp4 | 564 MB | 2026-06-24 | exists, 43.1 min, verified Nolan |
| 13 | voice-corpus/best_reference.wav + EXP-0003/0004-reference.wav | 1.4 MB ea | 2026-09-08 | 30 s curated reference clips |
| 14 | VoiceCaptures/phase1-test-2026-09-08.wav | 8.9 MB | 2026-09-08 | TTS test tone, not Nolan |
| 15 | qwen3-tts-docker/output/clone_*.wav, FAILED_my_voice_*.wav | 31 MB ea | 2026-09-09..14 | prior TTS clone attempts (some labeled FAILED) |

All corpus WAVs: mono, 24 kHz, 16-bit (ideal TTS training format).

## Verification (transcribed samples, faster-whisper)
- **000011** (full 13.4 min transcribed): dense Nolan monologue, "Which AI coding tool is the best? … intelligence isn't the bottleneck." Clean phone audio.
- **000006** (head 90 s): "Here's a question everyone … Can you prove it?" Clean, energetic.
- **000008** (head 90 s): "Hey, it's Piggy. Every AI app has the same…" Clean intro-style.
- **000010** (58 s): "Hey, it's Nolan, and this is Piggy…" Verified.
- **000012** (39 s): constitutional-architecture monologue. Verified.
- **reconstructed.mp4** (64 s @ 42 min, 60 s @ 13 min, 60 s @ 29 min): Nolan throughout, PING-architecture deep dives. Dense.
- **000009** (full 3.3 min): TWO speakers, podcast dialogue ("Which one? I've had multiple." / "Yeah, twice. Twitter did it once…"). Usable only with diarization.
- **000002/000004**: sparse speech (fragments in heads); energy scan finds scattered active regions.
- **000005**: effectively silent.

## Estimated Nolan speech per file
| File | Total dur | Est. speech | Basis |
|---|---|---|---|
| 000006.wav | 121.6 min | ~63 min | 2 s-RMS scan every 10 s (381/730 active) |
| reconstructed.mp4 | 43.1 min | ~40 min | autocut (silence-removed); 3/3 samples dense |
| 000004.wav | 67.8 min | ~26 min | RMS scan (157/407) |
| 000002.wav | 35.7 min | ~16 min | RMS scan (95/215) |
| 000011.wav | 13.4 min | ~13 min | full transcription, 26/27 windows active |
| 000008.wav | 9.9 min | ~5 min | RMS scan + head transcript |
| 000009.wav | 3.3 min | ~2 min (shared w/ 2nd speaker) | full transcription |
| 000010 + 000012 | 1.6 min | ~1.6 min | full transcription |
| **Total** | | **~167 min (~2.8 h)** | conservative; sparse-file estimates halved still >100 min |

## Ranked reference candidates (best first)
1. **SRC-VOICE-000011.wav** — 13 min dense, clean, single-speaker, podcast-register monologue. Best single file.
2. **conservative_final_reconstructed.mp4** — 43 min dense autocut speech. Best bulk volume (extract audio first).
3. **SRC-VOICE-000006.wav** — ~63 min speech, longest source; sparse, needs VAD segmentation.
4. **SRC-VOICE-000008.wav** — ~5 min, clean, branded intro register ("Hey, it's Piggy").
5. **SRC-VOICE-000004.wav** — ~26 min, sparse, needs segmentation.
6. **SRC-VOICE-000002.wav** — ~16 min, sparse.
7. **SRC-VOICE-000009.wav** — 2-speaker; diarize or skip.
8. **000010/000012** — short supplementary clips.

## Nolan's speaking profile (from ~15 min transcribed)
- **Pace:** ~95–100 wpm including pauses; 130–150 wpm in full flow. Deliberate, punchy.
- **Fillers:** "like", "just", "actually", "so". Notably **no "um/uh"** — he pauses instead of filling.
- **Openers:** "Hey, it's Nolan", "Hey, it's Nolan, and this is Piggy", "So,", "Here's a question…", "Here's the test."
- **Closers:** summary punchlines, rhetorical landings ("That's not a feature. That's a different kind of infrastructure.").
- **Style:** rhetorical questions, rule-of-three lists, contrarian reframes ("It isn't."), short declarative sentences alternating with long explanatory runs.
- **Signature phrases:** "Hey, it's Nolan", "and this is Piggy", "Can you prove it?", "most of the industry is building very expensive demos", "genius intern" (context-window metaphor), "That's not a feature."
- **Laugh:** one brief laugh noted in the 2-speaker podcast transcript; no laugh captured in single-speaker samples (limited evidence).
- **Energy/pitch:** high-confidence, fast, declarative; General American, no strong regional markers. (Pitch/formants not measured.)
- **Content register:** AI agents, PING architecture, proof/replay, AI coding tools — matches his intended podcast voice.
- **Quality notes:** no background music detected in sampled segments; quiet room tone; phone clips have slight room reverb; OBS files are screen recordings (possible faint keyboard clicks, not verified). Full-file music/noise sweep not performed.

## Verdict
**Existing material SUFFICES for a CozyVoice-style clone — no dedicated recording session required.**
~2.8 hours of verified Nolan speech (conservative >100 min) far exceeds the 3–10 min needed for zero-shot
reference and is ample for fine-tuning. Recommended reference set: 000011 (primary, 13 min dense) +
best VAD-cut segments from reconstructed.mp4 and 000006. Skip 000009 unless diarized; 000005 is dead.
Optional improvement: a fresh 10-min session in his podcast register would tighten prosody match, but it is
not a blocker. Note: his qwen3-tts-docker/output already contains prior clone attempts, several labeled
FAILED — the clone-evaluation step should compare against those, not start from zero.

## Artifacts (this VM, ~/workspace/voice/inventory/)
- transcripts: recon_sample_transcript.txt, recon_sample_t780/t1740_transcript.txt, SRC-VOICE-000002/4/8/9/10/12 + _mid transcripts, SRC-VOICE-000011_transcript.txt (full)
- audio samples: recon_sample.wav (64 s), recon_sample_t780/t1740.wav, SRC-VOICE-*_head/_mid/_16k/_full.wav
- scripts: extract_aac.py, extract_window.py, parse_moov.py
- prior docs: VOICE_CORPUS_INVENTORY.json, VOICE_FACTORY_INVENTORY_REPORT.md
- STT venv: ~/workspace/voice/stt_venv (faster-whisper tiny model cached in ~/.cache/huggingface)
