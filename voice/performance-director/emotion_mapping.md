# Emotion Mapping: semantic function -> performance state

Canonical companion to `performance_spec.schema.json`. The Performance Director reads a
script semantically, assigns each chunk a `scene_type`, and this table gives the default
emotion, intensity band, and delivery notes. Emotion follows meaning. It is never
decoration.

## The mapping table

| Scene type | Canonical emotion(s) | Intensity band | Notes |
|---|---|---|---|
| EXPLANATION | confident / conversational | 0.2 - 0.45 | The backbone of Nolan's delivery. Declarative sentences resolve with certainty. Steady, clear, unhurried. |
| NEW_IDEA | curious / slightly energized | 0.35 - 0.55 | A lean-in moment. Questions keep natural curiosity. Do not oversell: it is an idea being opened, not a product launch. |
| IMPORTANT_CLAIM | serious / deliberate | 0.4 - 0.6 | Slow down slightly, pause around the claim, emphasize without shouting. Highest weight-3 emphasis density lives here. |
| PERSONAL_REFLECTION | warm / reflective | 0.3 - 0.55 | Softer energy, more breathing room between phrases. Never sentimental. Keep the grounded register. |
| SURPRISING_RESULT | amazed / controlled excitement | 0.5 - 0.7 | Excitement is CONTROLLED. A genuine "huh, look at that" lift, not a game-show reaction. Short energy spike, then settle. |
| WARNING | serious / concerned | 0.4 - 0.6 | Deliberate, measured, no theatrics. Concern reads as gravity, not alarm. Warning is never adjacent to HUMOR without a TRANSITION beat. |
| HUMOR | amused / mischievous | 0.35 - 0.6 | Only when genuinely appropriate. If the joke is not landing in the script, do not perform amusement the text did not earn. Deadpan beats forced laughter every time. |
| EMPATHY | empathetic / softer | 0.3 - 0.5 | Warmth without syrup. Speak to one intelligent listener. Slower, softer, fewer words per phrase. |
| THESIS | confident / deliberate | 0.5 - 0.65 | The argument, stated plainly. Like IMPORTANT_CLAIM but with more forward momentum: it is a position being taken. |
| PAYOFF | confident / energetic | 0.55 - 0.8 | The episode's earned high-energy moments. Genuine, never hype. This is the rarest sustained intensity. |
| QUESTION | curious / conversational | 0.2 - 0.45 | Rhetorical questions get a real question contour and a real pause after them. The listener needs time to think. |
| STORY | conversational / warm | 0.25 - 0.5 | Narrative ease. Pace follows the story: slightly quicker on action, settled on meaning. |
| TECHNICAL_EXPLANATION | confident / conversational | 0.2 - 0.4 | Clarity over color. Pronunciation_overrides matter most here (acronyms, proper nouns). Slightly steadier pace. |
| FACTS_NUMBERS | deliberate / conversational | 0.2 - 0.4 | Numbers get separation and weight, not excitement. A statistic is not a SURPRISING_RESULT unless the script treats it as one. |
| QUOTE | deliberate / reflective | 0.3 - 0.55 | A small step back: the speaker is citing someone else. Slight register shift signals the boundary. |
| TRANSITION | conversational | 0.15 - 0.35 | The emotional airlock between scenes. Light touch, short, honest. See anti-whiplash rules. |
| SETUP | conversational / curious | 0.2 - 0.4 | Opening context. Interest without commitment yet. |
| OTHER | conversational | 0.15 - 0.3 | Escape hatch. Use sparingly; if a script has many OTHER chunks, the scene taxonomy is wrong, not the script. |

Scene types combine freely in one episode. A THESIS can contain EXPLANATION chunks; a
STORY can carry a WARNING. The table is a default, not a cage: the director's job is to
hear the script, not to fill a spreadsheet.

## Long-form distribution heuristics (starting values, learn from evaluation)

Across a full episode, weighted by chunk duration:

- **65 - 75%**: natural conversational confidence (emotion `conversational` or `confident`, intensity at/below 0.3). This is Nolan talking. The vast majority of the episode sounds like a smart person explaining things clearly.
- **20 - 30%**: modest expressive modulation (intensity 0.3 - 0.6). The director colors scenes where the meaning calls for it: curiosity, seriousness, warmth, concern.
- **5 - 10%**: genuinely strong moments (intensity above 0.6). Peaks, payoffs, the one real surprise. If every chunk is a peak, none of them are.

These are STARTING HEURISTICS, not targets to hit exactly. Nolan's actual preference is
learned from evaluations: run the NOLAN-HUMANNESS-GOLDEN-EVAL, collect his judgments on
over- vs under-expressiveness, and adjust the bands. When in doubt, under-express. A
listener never complains that a confident explanation was too calm; they always notice
when it was too much.

Measurement: sum chunk durations per band, divide by total episode duration. The
director should self-check the distribution before dispatching a full episode, and flag
episodes that land outside the bands as "needs director review," not auto-correct them.

## Anti-emotional-whiplash transition rules

The listener must never feel the emotion changed because a new chunk started. Rules the
director enforces at every boundary:

1. **One shift per boundary.** A chunk may differ in emotion OR in large intensity, not
   both, unless the scene genuinely changes (topic transition, time skip, new segment).
2. **Intensity delta cap.** Adjacent chunks in the same scene may not differ in
   `emotion_intensity` by more than 0.4. Larger arcs must step through an intermediate
   chunk (usually a TRANSITION or SETUP scene_type).
3. **No opposite-valence jumps without an airlock.** Amused -> serious, amazed ->
   concerned, playful -> warning: these need a TRANSITION chunk between them, or a
   deliberate `reset` strategy with a full thought boundary (topic change, pause).
4. **HUMOR never touches WARNING.** At least one full neutral chunk (EXPLANATION or
   TRANSITION) between them. No exceptions.
5. **Peaks need ramps and landings.** Any chunk above 0.6 intensity must have a `build`
   or `shift` strategy from the previous chunk and a `soften`/`release` strategy to the
   next. The energy goes up deliberately and comes down deliberately.
6. **Conversational is the gravity well.** When no scene signal is present, the
   director returns to `conversational`, intensity 0.2 - 0.3. Silence about emotion is
   not a reason to invent it.
7. **Transitions are written, not implied.** `transition_from_previous` and
   `transition_to_next` must be filled for every chunk with order_index > 0 / < last.
   A missing transition field is a director error, not a compiler default.
8. **Question -> answer arcs keep tension.** A QUESTION chunk holds its unresolved
   contour; the following chunk's `transition_from_previous.strategy` should be
   `release` or `continue`, never `reset`.

## Episode arc template

The director plans the episode before assigning chunk emotions. A standard long-form
episode runs six phases, shares approximate:

1. **Opening energy (5 - 10%).** SETUP, maybe one NEW_IDEA. Confident, welcoming,
   slightly energized. Promise the listener what this episode is about. No throat
   clearing, no long intros.
2. **Settling (10 - 15%).** Ease into the conversational baseline. EXPLANATION and
   STORY chunks at 0.2 - 0.35. The listener relaxes into Nolan's voice. This phase
   establishes the trust the peaks will spend.
3. **Rising and falling intensity (50 - 60%).** The body. Two or three planned peaks
   (IMPORTANT_CLAIM, THESIS, SURPRISING_RESULT) separated by valleys of EXPLANATION
   and STORY. No two peaks adjacent. Each peak follows rule 5 above.
4. **Reflection (10%).** PERSONAL_REFLECTION, EMPATHY, or a quiet STORY. Warm,
   slower, more space. The meaning of the episode lands here.
5. **Strong close (5%).** PAYOFF or THESIS. Confident, declarative, forward-looking.
   Ends with certainty. The last sentence must feel like an ending, not a fade.
6. **(Optional) Post-credit beat.** One light chunk: HUMOR or a curious QUESTION.
   Never after a WARNING.

Not every episode needs every phase. Short episodes compress phases 2-4. The template
is a planning scaffold; the script is the truth.
