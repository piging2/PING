# TTS Benchmark for the Evidence Pipeline — 2026-09-30

Worker: benchmark subagent (parent coordinator session 818d3b8c). Date: 2026-09-30.
Method: fixed technical paragraph, local candidates actually run, API candidates desk-researched from public docs only (no sign-up, no procurement, no contact).

Selection rule (binding): winner = the provider that preserves the evidence contract
(verbatim narration + word/sentence timestamps + retry determinism) while sounding
credible. NOT the prettiest voice.

## 1. Fixed input

Exact paragraph (no trailing newline in the canonical form):

```
The Qdrant collection sync-ledger-v2 held 42,000 embeddings after the nightly compaction. Dr. Kwiatkowski confirmed that the replay witness hash diverged from the canonical digest. The on-call engineer re-ran the deterministic canonizer to reproduce the 81b3248 baseline.
```

- SHA256 (no trailing newline): `fa55f06c929e5d90547cf5383f7a5b78ed3037d9ef94dfb2fcf7d31e3df672d`
- SHA256 (with trailing newline, as stored in /tmp/tts_input.txt): `82932e1412c539a925e8de4a171322341ea8e4396abe095a8a02e3b543f29213`
- Length: 271 chars (272 with newline). 3 sentences.
- Required elements: number (`42,000`, `81b3248`), proper noun (`Dr. Kwiatkowski`, `Qdrant`),
  TTS-mispronunciation traps (`Qdrant`, `Kwiatkowski`, `sync-ledger-v2`, `canonizer`, hex string `81b3248`).

## 2. Candidates

### Local / on-Pig (priority per task)

| # | Candidate | Location | Model | Access |
|---|-----------|----------|-------|--------|
| A | qwen3-tts-service | Pig :5000 (docker, Up 9h at probe time) | Qwen/Qwen3-TTS-12Hz-1.7B-Base, cuda:0, bfloat16 | HTTP: /health, /clone, /instruct, /generate-with-selector, /generate-my-voice |
| B | cosyvoice-tts | Pig :5001 (docker, Up 9h at probe time) | iic/CosyVoice-300M (ModelScope), CPU/onnx | HTTP: /health, /podcast/generate (async job), /podcast/status/<id> |
| C | Bundled `tts` CLI | this sandbox (/opt/hatch/bin/tts) | Meta Shortwave API (avocado_v2:MAI_03 default) | CLI: speak / synthesize-script |

### API providers (public docs only, 2026-09-30)

D. ElevenLabs — E. Cartesia Sonic — F. Amazon Polly — G. Azure AI Speech —
H. OpenAI TTS — I. Google Cloud TTS — J. Deepgram Aura-2 — K. Hume Octave

## 3. What was actually run

### C. Bundled Meta Shortwave `tts` CLI — RAN (3 runs)

Command (per run): `/opt/hatch/bin/tts speak --voice avocado_v2:MAI_03 --format mp3 --output /tmp/tts-bench/meta_run<N>.mp3 --text-stdin < /tmp/tts_input.txt`

| Run | End-to-end latency | Output bytes | SHA256 of output |
|-----|--------------------|--------------|------------------|
| 1 | 14.25 s | 146,917 | b0d44b479693eb8eeb0ed120b81dbdc17f1ec45bc3e27ca8e61ce41fc273daf4 |
| 2 | 13.80 s | 145,381 | 3554e6178ffa6acc2634e4e9baf2f55d1a8ea199581949839048b20a838a935e |
| 3 | 13.86 s | 147,493 | b57c74874b4d20d38104f6a551e1ff12ac2160ec4d6cbfcca816ab4a4c79191c |

Findings:
- Retry determinism: NO. Three identical inputs produced three different byte streams
  (different hashes AND different byte counts), so no cache hit and sampling is non-deterministic.
- Word timestamps: none. Sentence timestamps: none. Transcript/alignment: none.
  The CLI output contract is fixed: {ok, path, bytes, artifact_id} (+duration_secs for scripts).
- Pronunciation control: none exposed. The skill instructs callers to pre-normalize text
  into spoken form ("forty-two" not "42") — pronunciation is the caller's burden.
- Verbatim accuracy: UNVERIFIED (audio produced but not ASR-checked or listened to).
- Cost: included in Muse subscription; no published per-unit price. Grade: UNKNOWN (internal).
- Licensing: proprietary Meta internal API. Data retention: UNKNOWN (assumed logged).

### A. qwen3-tts-service — NOT RUN (Pig unreachable, see section 6)

Code inspection (via docker exec while Pig was reachable, 2026-09-30 ~16:05 MDT):
- `/clone` (POST multipart or JSON): params text, ref_text, language, reference_audio file
  or ref_audio_url. Returns raw WAV (`audio/wav`) with diagnostics in headers
  (X-Generation-Time, X-Audio-Duration, X-Realtime-Factor, X-GPU-*-MB). No timestamps,
  no transcript, no alignment in the response. Filename includes timestamp+uuid (not content-addressed).
- `/instruct`: text + speaker + instruct (natural-language style direction) + language.
  Same WAV-only return shape.
- `/generate-with-selector`: auto-selects a reference voice from /app/voice-corpus via
  text-performance analysis; returns WAV.
- No `seed` parameter anywhere in the request path (grep of /app/app.py). No pronunciation
  lexicon mechanism; pronunciation control is limited to the `instruct` free-text prompt
  and caller-side text normalization.
- Critical model-level fact: Qwen3-TTS does NOT natively emit word timestamps.
  Timestamps for this model family come from a separate model, Qwen/Qwen3-ForcedAligner-0.6B,
  wired as a post-generation pooling stage (vllm-omni `--forced-aligner`; non-streaming
  `POST /v1/audio/speech` -> `X-Word-Timestamps` header). The Pig service does NOT wire this.
  Closing the gap = add forced-aligner stage (no new authority, it is a second model call,
  not a new store/engine).
- Model license: Apache-2.0 (multiple third-party model-catalog sources; STRONG INDICATION).
- Data: fully local on Pig GPU; nothing leaves the machine. Latency: UNMEASURED (gap).

### B. cosyvoice-tts — NOT RUN (Pig unreachable, see section 6)

Code inspection (/app/scripts/cosyvoice_app.py, ~16:05 MDT):
- `/podcast/generate` (POST JSON): requires text + reference_audio (path ON the container)
  + reference_text; async job, poll `/podcast/status/<job_id>`, WAV written to /app/output.
- No timestamps, no alignment, no transcript in manifest. No pronunciation lexicon;
  frontend text normalization via wetext.
- CosyVoice 1.0/2.0/3.0 have no native word-timestamp output (no alignment evidence found
  in FunAudioLLM docs or third-party integrations; same forced-aligner remedy applies).
- Model license: Apache-2.0 (FunAudioLLM/CosyVoice; STRONG INDICATION).
- Data: local. Latency: UNMEASURED (gap).

## 4. API providers — desk research (public docs, accessed 2026-09-30)

Evidence grades: CONFIRMED = verified by a tool call in this session against the
provider's own current docs or a first-party changelog; STRONG INDICATION = multiple
independent third-party sources agree; WEAK INDICATION = single source; UNKNOWN = not found.

| Provider | Word timestamps (native) | Sentence timestamps | Pronunciation control | Price (list) | Data retention | License |
|----------|--------------------------|---------------------|-----------------------|--------------|----------------|---------|
| D. ElevenLabs | YES — `/v1/text-to-speech/{voice_id}/with-timestamps` returns character + word alignment produced during synthesis (first-party MCP changelog, CONFIRMED) | Derivable from word alignment | Pronunciation dictionaries; `pronunciation_dictionary_locators` param; `seed` param (CONFIRMED) | Flash/Turbo ~$0.05/1K chars, Multilingual ~$0.10–0.30/1K chars. Pricing changed 3+ times in 2025–26 — VERIFY before committing (WEAK on exact current figure) | `enable_logging=false` = zero-retention mode (STRONG INDICATION) | Proprietary commercial; free tier ~10K credits |
| E. Cartesia Sonic-3 | YES — native via `/tts/sse` with `add_timestamps: true`, merges chunk + timestamp events into `WordTimestamp[]` (third-party SDK matrix, STRONG INDICATION) | Derivable | Custom pronunciation dictionaries with IPA overrides, e.g. `<<s|ə|ˈ|p|i|n|ə>>` (STRONG INDICATION) | ~$49/1M chars normalized (Artificial Analysis); FAQ cites ~$0.07/1K chars. WEAK INDICATION — vendor sells credits, no flat public rate | UNKNOWN | Proprietary |
| F. Amazon Polly | YES — speech marks (word + viseme) as JSON stream alongside audio, no extra charge (STRONG INDICATION) | Derivable from word marks | PLS lexicons (100/region, 40K chars each), SSML (STRONG INDICATION) | Standard $4/1M, Neural $16/1M, Generative $30/1M, Long-form $100/1M chars; 5M chars/mo free 12 months (STRONG INDICATION) | Audio not stored by default; processing-only (STRONG INDICATION) | AWS service terms |
| G. Azure AI Speech | YES — `SpeechSynthesisWordBoundaryEvent` via SDK with word + audio/text offsets (STRONG INDICATION, long-standing SDK surface) | Derivable | SSML `<phoneme>`, `<say-as>`, `<sub>` (STRONG INDICATION) | Neural $15/1M, Neural HD $22/1M chars; 500K chars/mo free (STRONG INDICATION) | No audio storage by default per Speech service docs (STRONG INDICATION) | Microsoft service terms |
| H. OpenAI TTS | NO — `/v1/audio/speech` returns audio only (STRONG INDICATION) | No | `instructions` free-text steering on `gpt-4o-mini-tts` only (affects delivery, not guaranteed pronunciation); no cloning (CONFIRMED via docs-derived sources) | gpt-4o-mini-tts ~$0.015/min audio; tts-1 $15/1M, tts-1-hd $30/1M chars (STRONG INDICATION) | 30-day default API data retention; zero-retention available for eligible customers (STRONG INDICATION) | Proprietary |
| I. Google Cloud TTS | NO — word timing not returned; only SSML `<mark>` custom timepoints (STRONG INDICATION) | No (marks only where placed) | `customPronunciations` inline; SSML (STRONG INDICATION) | Standard $4/1M, WaveNet/Neural2 $16/1M, Chirp 3 HD $30/1M chars; 4M chars/mo free on Standard/WaveNet (STRONG INDICATION) | Google Cloud data-processing terms; training-use exclusions (WEAK INDICATION) | Google Cloud terms |
| J. Deepgram Aura-2 | NO (STRONG INDICATION) | No | None documented | $15–30/1M chars; $200 new-user credit (STRONG INDICATION) | UNKNOWN | Proprietary |
| K. Hume Octave-2 | YES — word alignment from JSON `/v0/tts` endpoint (single third-party SDK matrix; WEAK INDICATION) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Proprietary |

Notes:
- Sentence timestamps: no provider emits sentence-level timestamps natively as a
  first-class field; all timestamp-capable providers return word-level (or character-level)
  alignment from which sentence spans are derived by grouping on sentence-boundary tokens.
  Scored as "derivable" rather than native.
- Determinism: no neural provider guarantees byte-identical audio on retry.
  ElevenLabs exposes a `seed` parameter (reproducibility aid, not a byte-identity guarantee).
  Polly Standard (concatenative) is historically the most repeatable; Neural/Generative sample.
  Evidence-pipeline implication: retry determinism should be satisfied by caching the audio
  artifact keyed by (input-text SHA256, voice id, params) rather than by provider sampling
  behavior. No provider scores FULL on this dimension as a model property.

## 5. Score table (0 = absent, 5 = full; T = measured this session, D = desk research, I = code inspection)

| Dimension | A. Qwen3-TTS (Pig) | B. CosyVoice (Pig) | C. Meta Shortwave | D. ElevenLabs | E. Cartesia | F. Polly | G. Azure | H. OpenAI | I. Google | J. Deepgram | K. Hume |
|-----------|--------------------|--------------------|--------------------|---------------|-------------|----------|----------|-----------|-----------|-------------|---------|
| VERBATIM ACCURACY | ? (I) untested | ? (I) untested | ? (T) untested | 4 (D) | 4 (D) | 4 (D) | 4 (D) | 4 (D) | 3 (D) | 3 (D) | ? (D) |
| WORD TIMESTAMPS | 0 (I: absent; model needs separate forced-aligner) | 0 (I: absent) | 0 (T: absent) | 5 (D: native char+word) | 4 (D: native via SSE) | 4 (D: speech marks) | 4 (D: SDK events) | 0 (D) | 0 (D: marks only) | 0 (D) | 3 (D: weak evidence) |
| SENTENCE TIMESTAMPS | 0 | 0 | 0 | 3 (D: derivable) | 3 (D: derivable) | 3 (D: derivable) | 3 (D: derivable) | 0 | 1 (D: manual marks) | 0 | 1 (D) |
| PRONUNCIATION CONTROL | 2 (I: instruct prompt only) | 1 (I: frontend norm only) | 1 (T: caller normalizes) | 5 (D: dicts + locators) | 5 (D: IPA dicts) | 4 (D: PLS lexicons) | 4 (D: SSML phoneme) | 2 (D: instructions only) | 3 (D: customPronunciations) | 0 (D) | 1 (D) |
| LATENCY (e2e, 271 chars) | ? (I) unmeasured | ? (I) unmeasured | ~14 s (T) | ~0.3–1 s est (D) | <0.1 s TTFB claimed (D) | <1 s (D) | <1 s (D) | <1 s (D) | <1 s (D) | fastest claimed (D) | ? (D) |
| COST | 0 $ (local infra) | 0 $ (local infra) | bundled (UNKNOWN unit) | $$$$ (highest) | $$$ | $ (cheapest w/ marks) | $$ | $$ | $ | $$ | ? |
| RETRY DETERMINISM | ? (I: no seed param) | ? (I: no seed param) | 0 (T: 3 runs, 3 hashes) | 2 (D: seed param) | 1 (D) | 2 (D: Standard most repeatable) | 1 (D) | 1 (D) | 1 (D) | 1 (D) | ? (D) |
| LICENSING | Apache-2.0 (D) | Apache-2.0 (D) | proprietary internal | proprietary commercial | proprietary | AWS terms | MS terms | proprietary | GCP terms | proprietary | proprietary |
| DATA RETENTION | local-only (I) | local-only (I) | UNKNOWN | zero-retention mode avail (D) | UNKNOWN | not stored by default (D) | not stored by default (D) | 30d default; ZDR eligible (D) | cloud DPA (D) | UNKNOWN | UNKNOWN |

## 6. Winner and rationale

**Contract winner: D. ElevenLabs.**
It is the only candidate with the complete evidence-contract surface in one REST call:
native character-level AND word-level alignment produced during synthesis
(`POST /v1/text-to-speech/{voice_id}/with-timestamps`), pronunciation dictionaries
that can pin domain terms like `Qdrant`/`Kwiatkowski`/`81b3248`, a `seed` parameter
for reproducibility, and a documented zero-retention mode (`enable_logging=false`).
That is exactly "verbatim + timestamps + determinism" as far as any provider goes.

**Cheapest credible alternative: F. Amazon Polly (Neural).**
Word/viseme speech marks + PLS lexicons at $16/1M chars (Standard $4/1M), no audio
storage by default. Weaker voice credibility than ElevenLabs, but the evidence
contract (timestamps + pronunciation control) is genuinely present.

**Value pick if spend is approved: E. Cartesia Sonic-3.**
Native word timestamps (SSE `add_timestamps`), IPA pronunciation dictionaries,
~$49/1M chars normalized — the best contract-per-dollar. Caveat: timestamp path is
SSE-only (more integration work than ElevenLabs' single REST response) and its data
retention policy is UNKNOWN.

**Zero-spend path: A. Qwen3-TTS on the Pig + Qwen3-ForcedAligner-0.6B.**
Both Apache-2.0, fully local (best data-retention posture: nothing leaves the machine),
but today the Pig service emits WAV only — word timestamps require wiring the separate
forced-aligner model as a post-generation stage (proven pattern: vllm-omni
`--forced-aligner` -> `X-Word-Timestamps`). Verbatim accuracy and latency are
UNMEASURED because the Pig was unreachable for the entire benchmark window (see below).

**Not recommended for the evidence pipeline:** C (no timestamps, non-deterministic,
14 s for 271 chars), H (no timestamps despite good steering), I (no word timestamps),
J (no timestamps, no pronunciation control), B (no timestamps; keep as voice-clone
research lane, not narration).

Standing MONEY rule (2026-09-28): no new paid AI/API spend without owner approval.
So the actionable order is: (1) prove the $0 path (Qwen3-TTS + forced-aligner wiring
on the Pig, then re-run this benchmark's latency/determinism/verbatim checks);
(2) if the owner approves spend, ElevenLabs for the strongest contract or Cartesia
for contract-per-dollar. Do NOT adopt any paid provider on this benchmark alone.

## 7. Could NOT test (gaps)

1. **Pig unreachable for the whole benchmark window.** `qwen3-tts-service` (:5000) and
   `cosyvoice-tts` (:5001) were confirmed Up 9h via `docker ps` at ~16:05 MDT, then the
   egress proxy path (hatch-egress-proxy:3130) broke with `nc: proxy read: Broken pipe`
   / `Connection closed by UNKNOWN port 65535` on every attempt from ~16:12 through
   ~16:35 MDT, via both `pigwsl-exec` (nolan@100.79.154.43, WSL) and `pig-ssh`
   (muse-ssh@100.79.154.43, Windows). Direct proxy CONNECT probe returned no HTTP
   response. 16:30–17:00 MDT is the known expected commute blackout; the failure began
   before it and may be the tailnet wedge pattern. Per standing probe posture, retries
   are warranted after the window. Consequence: no measured latency, no retry-determinism
   bytes, no verbatim-accuracy check for A or B. Their rows above are code-inspection
   only.
2. **Verbatim accuracy verified for no provider.** The paragraph was engineered with
   mispronunciation traps, but confirming what was actually spoken needs an ASR
   back-check or human listening pass. Recommend: synthesize -> run Qwen3-ASR or
   Whisper -> word error rate vs input text.
3. **Veo 3.1** deliberately excluded from narration scoring per the task note
   (video generation only where generated footage genuinely adds value; never for
   terminal output, code, evidence, logs, metrics, traces, quoted claims, or UI
   reproduction; known pricing $0.05–$0.40/sec). It is not a TTS candidate.
4. **Pricing figures for API providers** are list prices from third-party aggregations;
   ElevenLabs pricing changed 3+ times in 2025–26. Re-verify at the vendor page before
   any spend decision.
5. **Data-retention claims** are STRONG INDICATION at best (docs-derived), not
   contract-verified. ElevenLabs zero-retention and Cartesia's policy need confirmation
   against current vendor DPAs before evidence audio flows through them.

## 8. Reproducibility log

- Input text SHA256 (canonical, no trailing newline): fa55f06c929e5d90547cf5383f7a5b78ed3037d9ef94dfb2fcf7d31e3df672d
- Meta Shortwave runs: /tmp/tts-bench/meta_run{1,2,3}.mp3 + .json (ephemeral; hashes in section 3)
- Pig probes: `docker ps` (Up 9h, ports 5000/5001), `docker inspect` env/cmd, `docker logs --tail 30`,
  `docker exec` greps of /app/app.py and /app/scripts/cosyvoice_app.py — all 2026-09-30 ~16:00–16:12 MDT
- Web sources: browser.search sessions 8360790750331606128 (ElevenLabs), 9201930889124887131 (Cartesia),
  206149064274631177 (OpenAI), 6895830823503982832 (Google), 5559009184315666414 (Polly),
  2946223155605840950 (Azure), 4211716211066208875 (Qwen3-TTS timestamps),
  8924923204690379330 (Deepgram), 65570787414714931 (CosyVoice),
  7832366259599897893 (Qwen3-TTS license), 7840479312369736617 (CosyVoice license);
  access date 2026-09-30. Full URLs recorded in session notes.
- No procurement, no sign-up, no external contact performed.
