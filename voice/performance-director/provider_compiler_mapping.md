# Provider Compiler Mapping: PerformanceSpec -> Qwen-Audio controls

SKETCH ONLY. No implementation. This document defines the mapping contract the
future Provider Compiler implements: how each provider-neutral PerformanceSpec
field becomes Qwen-Audio (Alibaba QWEN-AUDIO-3.0-TTS-PLUS, expressive WebSocket)
controls. Canonical meaning lives in the PerformanceSpec; Alibaba tags are
compiled output, never stored as truth.

## Mapping table

| PerformanceSpec field | Qwen-Audio control | Mapping rule |
|---|---|---|
| `text` | Synthesis text | Sent verbatim, plain prose. No markup injected into the text itself. |
| `scene_type` + `emotion` + `emotion_intensity` | Persistent emotion tag | PERSISTENCE RULE (see below). The compiler selects the nearest supported tag ([curious] [serious] [excited] [empathetic] [amazed] [sarcastic] [mischievously] [whispers] [asmr] [very slowly] [very fast]) and pairs it with instruction wording that carries the exact semantic shade. Tag is the coarse control; the natural-language instruction is the fine control. |
| `emotion_intensity` | Instruction wording | Intensity bands map to instruction adjectives, not tag stacking: 0.0-0.2 "with a hint of X" or no tag at all (baseline instruction only); 0.2-0.5 "X, naturally"; 0.5-0.75 "clearly X"; 0.75-1.0 "strongly X, the emotional peak of this section." Never invent a tag that does not exist to express more intensity. |
| `confidence` | Instruction wording | High confidence: "declarative sentences resolve with certainty." Low: "allow genuine tentativeness on the hedged phrases." Confidence is carried in wording, not in rate/pitch. |
| `energy` | Instruction wording | "Relaxed conversational energy" (0.35-0.6) vs "noticeably energized" (0.7+). Energy above 0.8 must coincide with a PAYOFF/SURPRISING_RESULT scene or the compiler flags the spec for director review. |
| `pace` | `rate` parameter | Secondary adjustment near baseline ONLY. Map pace 0.92-1.08 to rate 0.92-1.08 directly. Values outside that band require the compiler to confirm the scene_type justifies it; otherwise clamp to the band and log. Rate is never the primary expressive tool (microprosody law). |
| `pitch_bias` | `pitch` parameter | Same discipline as rate: near-baseline adjustments only. pitch_bias within [-1, 1] maps directly. Beyond +/-1: compiler refuses and returns the spec to the director. The deeper-voice dimension is benchmarked separately, not smuggled in per chunk. |
| `pause_density` | Instruction wording + punctuation | "Thoughtful pauses at thought boundaries" (high) vs "steady flow, minimal pausing" (low). The compiler does NOT insert mechanical silences; it may add a comma or em-dash-free rephrasing cue only where punctuation already implies a pause. Punctuation and semantic structure first. |
| `emphasis` (weight 1-2) | Instruction wording | "Give natural stress to: word, word." Listed plainly in the instruction. |
| `emphasis` (weight 3) | Instruction wording, singled out | "The single most important word is X: give it weight through stress and slight slowing, not volume." At most one per chunk per the schema. |
| `vocal_event` | One-shot vocal-event tag | RARE and explicit only: [sighing], [giggles], [laughing], [gasp], [clears throat]. The compiler emits the tag exactly once at the director-specified position and never adds one the spec did not request. A spec with vocal_event=null produces no vocal-event tag, ever. |
| `transition_from_previous` | Instruction bridge sentence | `continue`: no bridge needed. `soften`: "easing back from the previous intensity." `shift`: "shifting tone from X to Y." `reset`: "clean break; fresh thought." `build`/`release`: carried as arc wording. One short clause, not a paragraph. |
| `transition_to_next` | Instruction trailing cue | Shapes the ending cadence: `build` -> "leave the energy rising toward what comes next"; `release` -> "let this land completely"; `continue` -> no cue. |
| `pronunciation_overrides` | `hot_fix` pronunciation layer | Each override becomes a hot_fix entry (term -> guidance). Terms also cross-checked against pronunciation_lexicon.md; lexicon wins on conflict and the conflict is logged. |
| `seed_policy` | `seed` parameter | `regression_fixed`: exact seed. `performance_bank`: bank's stable seed for ordinary chunks. `hero_candidates`: generate candidate_count (2-3) variants, score, cache winner. Independent per-chunk randomization is forbidden. |
| (profile default) | `language_hints` | Always `["en"]` for English. Set once per session, not per chunk. |
| (all chunks) | Word timestamps | Requested on every synthesis. Used by the QC gate (checks 1-3, 8, 9, 13) and by boundary assembly. Timestamps are evidence, not audio. |

## The PERSISTENCE rule (binding)

Qwen-Audio emotion tags persist until another control tag or automatic
segmentation replaces them. Therefore:

1. **Every chunk gets an explicit performance state.** The compiler opens every
   chunk's instruction with the current state restated (tag + one-line
   instruction), even when it matches the previous chunk. There is no
   "inherited" emotion; inheritance is how whiplash and drift happen.
2. **State changes are explicit transitions**, using the spec's
   `transition_from_previous.strategy`. The compiler never relies on tag
   persistence across a chunk boundary to "carry" an emotion.
3. **Vocal-event tags are one-shot and RARE.** They do not persist and must not
   be treated as state. After a vocal event, the compiler restates the chunk's
   persistent state.
4. **Automatic segmentation is the enemy.** Long chunks risk the provider
   re-segmenting mid-chunk and dropping the tag. Mitigation: prefer semantic
   chunks under ~2000 characters, and the QC gate's prosody checks (17, 18)
   catch mid-chunk state loss after the fact.

## Natural-language instruction template

```
{profile_instruction}

Current state: {emotion_wording} ({intensity_wording}).
{transition_bridge_sentence}
{emphasis_sentence}
{pause_wording}
{pronunciation_note: only if overrides exist, as "Pronounce X as 'Y'."}
Deliver in one continuous natural take. No announcement voice, no theatricality.
```

Where `{profile_instruction}` is the tournament-winning NOLAN_CONFIDENT_HUMAN_V1
instruction (candidate: "Confident, natural conversational delivery. Grounded lower
register, clear articulation, relaxed pace, subtle dynamic emphasis, thoughtful
pauses, emotionally responsive without sounding theatrical."), and the remaining
slots are filled per chunk from the table above.

Instruction discipline (Alibaba guidance): SPECIFIC, MULTI-DIMENSIONAL, OBJECTIVE,
CONCISE. The template is deliberately short: profile (stable) + state (per chunk)
+ bridge (per boundary) + emphasis (per chunk). If an instruction grows past ~80
words, something is being over-directed; simplify the spec instead.

## Volume

Independent `volume` control exists but the compiler leaves it at baseline. Volume
anomalies are a QC concern (check 11), not a per-chunk expressive tool. Emphasis
without shouting is a profile trait; the compiler must never use volume for
emphasis.

## Master format

WAV/PCM, highest sensible rate up to 48kHz. No repeated MP3 encodes in
intermediates. The compiler outputs per-chunk WAV + word timestamps + gate
evidence; mastering assembles, it does not re-encode.
