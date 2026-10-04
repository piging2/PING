# NOLAN_CONFIDENT_HUMAN_V1

Default Voice Studio performance profile. Version 1. A confident human speaking
naturally to one intelligent listener.

Status: PROFILE SPEC (v1). Evaluable, benchmarkable, not yet promoted. Promotion
follows the directive's promotion standard: better human preference, no
identity/onset/intelligibility/pronunciation/long-form-stability regression, no
increased fatigue, no increased artifact rate. Real test: 20-30 minutes continuous
listening, eventually a full episode trial.

## Character

Nolan sounds like himself on a good day: grounded, self-assured, conversational,
intelligent. Relaxed confidence, never performed confidence. Clear articulation in a
natural lower/mid register, with controlled energy and occasional warmth. He is
deliberate rather than rushed: declarative sentences resolve with certainty, questions
retain natural curiosity. Important claims get emphasis without shouting. Pace and
melody vary naturally across sentences; pauses fall at thought boundaries and sound
authentic, never inserted. Emotionally responsive without sounding theatrical.

The listener's experience: "a smart person I trust, talking to me directly, who
clearly knows what he is talking about and is not trying to impress me."

## What it is NOT

This profile must never sound like any of the following. If an evaluator hears any
of these, the clip fails that trait:

- an announcer (broadcast polish, projected voice, sign-off cadence)
- a movie trailer voice (gravel, portent, manufactured suspense)
- a salesman (smiling through every sentence, upsell energy)
- a motivational speaker (crescendo habit, slogans, fist-pump cadence)
- a robotic narrator (flat affect, identical sentence rhythm, no thought pauses)
- constant excitement (every sentence a peak)
- constant deep voice (pitch parked at the bottom of the range)
- constant dramatic pauses (suspense where the meaning does not call for it)

## Trait-by-trait evaluation criteria

Score each trait 1-5 against a blind clip. 1 = trait absent or actively violated,
3 = present but inconsistent or generic, 5 = unmistakably this trait, sounds like
Nolan. A profile candidate passes when no trait scores below 3 and the weighted mean
is at/above 4.0 (weights in parentheses). Evaluator listens once, no transcript,
then scores from memory of the impression.

1. **Grounded (x2).** Does the speaker sound settled and unhurried, like someone with
   nothing to prove? 5 = completely at ease, weight behind the words. 1 = tense,
   rushing, or performing confidence. This is the highest-weighted trait because it
   is the profile's foundation: everything else reads as acting without it.
2. **Self-assured (x2).** Do statements sound like beliefs the speaker holds, not
   claims he is testing? 5 = declarative sentences land and stop; no trailing
   uptalk, no hedging melody. 1 = everything sounds like a question or an apology.
3. **Conversational (x2).** Does it sound like talking to one person, not
   addressing a crowd? 5 = intimate, direct, natural contractions and rhythm of
   real speech. 1 = oration, broadcast distance, or reading-aloud stiffness.
4. **Intelligent (x1).** Does the delivery suggest the speaker understands what he
   is saying? 5 = complex sentences keep their structure; technical terms land
   cleanly; pacing respects the difficulty of the idea. 1 = words are pronounced
   but the thinking is not audible.
5. **Relaxed confidence (x2).** Distinct from self-assured: is the confidence
   EASY? 5 = confidence without effort, no edge, no strain. 1 = confidence that
   sounds maintained, like holding a pose.
6. **Clear articulation (x1).** 5 = every word intelligible at natural pace, no
   mumbling, no over-enunciation either. 1 = slurred consonants or fussy diction
   that draws attention to itself.
7. **Natural lower/mid register (x1).** 5 = voice sits where a real adult male
   voice sits in relaxed conversation; no strain at either end. 1 = parked
   artificially low (trailer) or pushed high (salesman).
8. **Controlled energy (x1).** 5 = energy is present but metered; the speaker could
   go bigger and chooses not to. 1 = either flatlined or constantly "on."
9. **Occasional warmth (x1).** 5 = warmth appears where the meaning earns it and
   recedes otherwise. 1 = either never warm (cold, clinical) or warm everywhere
   (the salesman smile).
10. **Deliberate, not rushed (x1).** 5 = the speaker takes the time each thought
    needs; no sentence feels hurried through. 1 = racing, or the opposite fault:
    ponderous and slow for effect.
11. **Declarative certainty (x1).** 5 = statements end with a settled falling
    contour; the thought is finished. 1 = uptalk, trailing off, or fading volume
    that leaves the sentence unresolved.
12. **Curious questions (x1).** 5 = questions sound genuinely asked; the contour
    rises because the speaker wants the answer. 1 = rhetorical-performance
    questions, or questions read flat as statements.
13. **Emphasis without shouting (x1).** 5 = important words get weight through
    stress and slight slowing, never volume spikes. 1 = emphasis by loudness, or
    no emphasis at all (everything equally flat).
14. **Natural pace/melody variation (x1).** 5 = no two consecutive sentences share
    an identical rhythm; variation follows meaning. 1 = metronomic delivery or
    random wobble that does not track the text.
15. **Authentic pauses (x1).** 5 = pauses at thought boundaries; they sound like
    thinking, and breathing rhythm is preserved. 1 = pauses after every sentence
    like punctuation marks, or no pauses at all.

Failure modes that fail the whole clip regardless of the mean: any NOT-list voice
detected (announcer/trailer/salesman/motivational/robotic), audible onset artifact,
carrier leakage, hallucinated or dropped words.

## Candidate dimensions to benchmark

These are the axes of the bounded instruction tournament. One dimension at a time,
track winners. The profile is the WINNER of the tournament, not any single guess.

1. **Depth setting (bounded).** The "deeper" voice setting is a candidate
   dimension with a hard floor: benchmark progressively deeper settings and STOP
   before synthetic. The pass criterion is explicit: deeper is kept only while
   (a) speaker similarity to the reference holds, (b) no evaluator flags
   "synthetic/artificial," (c) naturalness score does not drop. Pitch is never
   pushed down until it sounds like an effect.
2. **Pace.** Instruction variants around the baseline: relaxed (0.95), natural
   (1.0), and brisk (1.05). Judge against trait 10 (deliberate, not rushed) and
   trait 14. The winner is the pace where Nolan sounds most like himself.
3. **Instruction variants.** Test concise natural-language instructions one
   dimension at a time, per Alibaba guidance (SPECIFIC, MULTI-DIMENSIONAL,
   OBJECTIVE, CONCISE). Variant axes: register wording ("grounded lower register"
   vs "natural mid register"), energy wording ("relaxed" vs "controlled"),
   pause wording ("thoughtful pauses" vs "natural pauses at thought boundaries"),
   warmth wording (present vs absent), and length (one sentence vs three).
4. **Emotion tag strictness.** How literally the compiler applies the emotion map:
   strict (every chunk gets an explicit persistent tag) vs light (tags only on
   modulated chunks, baseline implied). The directive says every chunk gets an
   explicit state; this dimension tests HOW explicit (restated tag per chunk vs
   restated instruction sentence).
5. **Seed policy.** Regression fixed-seed vs performance-bank candidates on hero
   lines. Judge on long-form consistency (trait: does the voice stay the same
   person across 20+ chunks?) and listener fatigue.

## Defaults for Studio UX

- Default profile: NOLAN_CONFIDENT_HUMAN_V1 (this file).
- Advanced panel (only if useful): emotion, intensity, deeper/normal toggle,
  pace, seed, raw instruction text, provider selector.
- Nolan does not operate these controls manually. Primary UX stays: paste text,
  Generate, immediate playback, visible file location.
