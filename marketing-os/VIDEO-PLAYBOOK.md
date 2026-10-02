# Marketing OS: Short-Form Video Playbook

Built 2026-09-29. Direction correction same day (Nolan): "amateur" was facetious. PING video is PROFESSIONAL. Clean cuts, polished captions, sharp professional feel, strong hooks and pacing. Never amateur-authenticity, never shaky-cam affectation, never deliberately rough edits.

House position: professional craft, human voice. The polish is in the edit. The humanity is in the writing and the voice. We do not fake lo-fi to chase a trend.

Standing brand laws: no em dashes in any on-screen text or caption, humor native to PING (never bolted on), practical business outcomes over AI hype, the exact PING pig mascot only, Nolan approves every post before it publishes.

## 2026-09-30 technical audience strategy (Nolan, standing)

This playbook now serves two tracks: the commercial home-services track and the technical track. The technical track follows the three-depth ladder and the series below. See EXPERIMENT-PLAN.md for the full program; see SYSTEMS.md for the claim-status convention.

- **L1, engineering intuition (15-30s):** one sharp technical claim, one piece of evidence, one principle. The hook is the claim. Example: "What if an AI API had to return a type instead of vibes?"
- **L2, architecture (30-60s):** walk one mechanism end to end. Show the before and the after, or the assumed and the actual. Diagrams labeled CURRENT, TARGET, or EXPERIMENT; never mix current and aspirational architecture without clear labels.
- **L3, deep technical (60s+, carousel, article, GitHub-linked):** the full receipt. Code, tests, traces, commits, before-and-after behavior. For engineers who will check your work.

**Technical storytelling rule.** Weak: "Here is our event architecture." Strong: "We accidentally built three event authorities. Here is how we found the real one." Weak: "PING uses deterministic events." Strong only if verified: "UUIDs made replay lie to us. Here is what deterministic identity changed." Lead with the falsifiable claim, not the tour.

**"We Were Wrong" structure (the falsification format):** 0-3s the falsified assumption, 3-10s the assumed architecture, 10-20s the contradicting evidence, 20-30s the actual architecture, 30-35s the resulting engineering principle. Never manufacture mistakes or drama. The mistake must be real and the evidence must be shown.

**Technical visuals.** Clean terminal captures, syntax-highlighted code, animated architecture diagrams, precise callouts, minimal lower thirds, source labels. Motion explains transitions, never decorates. Scan every technical screenshot and recording for secrets before it ships: credentials, tokens, private keys, IP addresses, usernames, private paths, private Git remotes, internal hostnames, customer data, private infrastructure. The desired feel is an excellent systems conference talk compressed into 30 seconds. No fake lo-fi. No deliberately amateur editing. No talking-head assertions without regular supporting evidence on screen.

**Technical hook patterns:** the falsifiable claim ("An AI agent should never be allowed to approve its own side effect."), the typed contract ("state in, typed answer out"), the named unknown ("VERIFIED: events survive restart. NOT VERIFIED: worker recovery after a mid-effect crash."), the harvested mechanism ("We studied 16 agent frameworks and imported zero. Here is the one mechanism we kept.").

---

## 1. The physics of short-form in 2026

These are the non-negotiable mechanics, grounded in current creator research:

- **The hook is the video.** Roughly 50-60% of drop-off happens in the first 3 seconds. The swipe decision lands in about 1 to 1.5 seconds. A layered hook (striking visual plus on-screen text plus the spoken line together) holds roughly 3x better than any single layer. No logo, no "hey guys," no intro card. Start on the most striking frame.
- **Sound off is the default.** About 80-85% of viewers watch muted. Burned-in captions from the very first frame are required, not optional; they lift retention roughly 15-25%. Write the muted version first: on-screen text must carry the message alone, audio adds to it. Test every cut on mute.
- **Retention is the algorithm.** Watch-through is the single most important signal. TikTok weights saves plus shares highest; Instagram Reels rewards discovery reach; YouTube Shorts weights click-through plus view duration. Design every ending to earn a save or a share, not just a like.
- **Length discipline.** The sweet spot is 15-35 seconds (about 75 words of voiceover is roughly 30 seconds). Keep the video only as long as it takes to deliver the payoff. Padding kills completion rate.
- **Visual cadence.** Change the visual every 2-4 seconds: a cut, a punch-in, a graphic, a B-roll insert. Static talking heads die.
- **Loop engineering.** Endings that flow back into frame one earn replays, and replays are weighted heavily. Where it fits the script, make the last line complete the first.
- **Native and clean.** Shoot vertical 1080x1920 from the start, never crop landscape. Export a clean file from DaVinci and upload natively to each platform. No cross-platform watermarks, ever.
- **Searchable text.** Say the search phrase in three places: the first spoken line, the on-screen text, and the start of the written caption. Write the caption's first line as a second hook using words people would actually search.

(Sources: jetfuel.agency 2026 short-form checklist; social-media-skills short-form-video-script SKILL.md WATCH framework; ContentEngineAI promo-video best practices; tyroneross/spectra SOURCE-GUIDE.md.)

---

## 2. Hooks: the first 3 seconds

The hook is a large, legible statement, distinct from the running captions. 5-8 words, on screen for the full 1.5-3 seconds, visibly larger than narration captions, readable with sound off.

Rules:
- One idea per video. The hook names the payoff, not the topic. "Your website is lying to customers" beats "Let me talk about websites."
- Never render the hook as the same words as the bottom captions at the same time. The hook is an authored headline; suppress running captions while the hook card is up.
- Shot-list 5 hook variants per video package. The cron and the video package should propose alternates; testing beats planning.
- Hook patterns that fit PING: the contrarian claim ("Your AI has no memory. Ours does."), the specific number ("We found 71 forgotten versions of our own system."), the direct address ("If you run a home service business, your marketer can't answer six questions."), the curiosity gap ("Timeout does not mean failure.").

---

## 3. Pacing and retention structure

Use the WATCH arc, adapted to the professional house style:

1. **Win (0-3s):** layered hook. Visual, headline text, spoken line, all three.
2. **Arc (3-20s):** hook to body to payoff. Open a loop early ("here is the part nobody tells you"), number the points if there are points, change the visual every 2-4 seconds, cut any line that does not grab, teach, or set up the payoff.
3. **Two tracks:** the muted track (headlines, captions, graphics) tells the whole story; the sound track (voiceover, music bed) enriches it.
4. **Cash the promise (final 5s):** the payoff delivers exactly what the hook sold. No bait and switch; over-promising tanks average view duration.
5. **Hold and CTA:** one clear next step, staged distinctly from narration. A soft CTA can land early (3-5 seconds, neutral, e.g. on-screen "follow for the series"); the hard CTA gets full-frame treatment at the end, static, at least 1.5 seconds on screen. Never a rote "like and subscribe."

---

## 4. Caption and text design (professional standard)

- **Burned in, always.** Never rely on platform auto-caption overlays.
- **Design system:** one font family for all PING video text. Sans-serif, bold weight for headlines, regular for narration captions. High contrast against footage (white text with a soft dark backing bar or subtle stroke, never thin text over busy footage).
- **Word-by-word emphasis:** highlight keywords as they are spoken (color or weight change on the active word). This is the professional caption standard in 2026 and it measurably holds attention.
- **Hierarchy:** hook headline (large, 1.5-3s) > section labels > narration captions (smaller, bottom third, 2-4 words per card maximum, synced to speech).
- **Safe zones:** keep all text inside the central safe area. Platform UI covers the bottom ~15% (caption and buttons) and the right rail. Nothing critical lives there.
- **No em dashes** in any on-screen text. Rewrite with periods or commas.
- **Lower thirds** for names, titles, and sources. Source citations on evidence claims (small, bottom, brief) reinforce the brand position that claims carry receipts.

---

## 5. Editing grammar (DaVinci Resolve, professional)

The edit should feel sharp and deliberate. Every cut has a reason.

- **Clean cuts first.** Hard cuts on the beat of the voiceover. J-cuts and L-cuts (audio leads or lags the picture) for smoothness between sections.
- **Motivated punch-ins.** A slow push-in emphasizes a key line; a cut to a closer framing resets attention. Never random zoom effects; every move serves the sentence being spoken.
- **B-roll with intent.** Cut away to footage, screen recordings, or graphics that show what the voiceover claims. Real screen recordings of real systems beat stock. Cursor highlights and callouts guide the eye.
- **Graphics for abstractions.** When the script explains a system (object graph, pipeline, authority model), show a clean diagram build, not a wall of text. Simple shapes, brand colors, animated in step with the narration.
- **Color and light consistency.** Match shots. PING footage should look like one world: consistent grade, clean whites, the gold and purple of the mascot echoed in graphic accents.
- **Pacing math.** A 30-second video wants roughly 8-12 shots. If a section feels slow, the fix is a cut or a graphic, not a transition effect. Avoid decorative transitions; straight cuts read as confidence.
- **Sound design.** Voiceover is king: clean, consistent level, light compression, no room echo. A music bed sits low under the voice (ducked, roughly 12-18 dB under VO) and drops out entirely for the hook line and the payoff line. Silence before the payoff is a professional move.
- **What we never do:** shaky handheld affectation, fake film grain to look raw, jump cuts that stutter mid-word, meme sound effects under serious claims, over-polished to the point of sterile (the voice stays human, the script stays plain-spoken).

---

## 6. Voiceover with Nolan's voice clone

Status: the clone works on short paragraphs (confirmed 2026-09-29). Long-form continuity at very long inputs is unproven and is a separate engineering track.

Rules for voiceover scripts:
- **Write in short paragraphs.** One paragraph per generation call. Each paragraph is one beat of the script (roughly 20-40 words).
- **Write for the ear.** Short sentences. Plain words. Read every line aloud before generating; if you stumble, rewrite. No em dashes, no parentheticals, no jargon without an immediate plain translation.
- **75 words is about 30 seconds.** Budget the script against the target length before generating anything.
- **Consistent delivery.** Generate all paragraphs for one video in one session with the same settings. Normalize loudness across paragraphs in DaVinci (target consistent LUFS, light compression) so joins are invisible.
- **Direct the performance in the text.** A line that should land flat is written flat. A line that should lift ends on the lift. Punctuation is stage direction: periods are pauses, and a new paragraph is a breath.
- **Never claim beyond verified.** The voiceover must not assert clone capabilities, business results, or system behaviors the knowledge base marks INFERRED or UNKNOWN.

---

## 7. Platform specifics

**Facebook Reels (primary surface).** The PING Social Page audience is here first. 9:16, 1080x1920, 15-90 seconds. Captions burned in required. 3-5 relevant hashtags. First caption line is a second hook with searchable words. The Page baseline (Sept 2026): small reach, near-zero engagement; every video is a test with a hypothesis, not a broadcast.

**Instagram Reels.** Same spec. Discovery reach is the signal; saves matter. Slightly more visual polish is expected by the audience, which suits the professional house style. No links in captions; put the one link in bio.

**TikTok.** 9:16, 15-60 seconds optimal, saves plus shares drive reach, trend-driven and educational plays best. NOTE: TikTok is on hold per Nolan's standing order (held pending corrected safe resume configuration). Do not publish or schedule TikTok content until the hold is lifted. Video packages may still be prepared.

**YouTube Shorts.** 9:16, 15-60 seconds, CTR plus view duration. Strong for tutorial and explainer content. Hashtags are not a ranking factor; title and spoken keywords matter.

**Cross-platform rule.** One idea, native cuts per platform. Never cross-post the identical file with another platform's watermark. Adjust the hook and length per platform; the professional edit makes this cheap because the timeline is already clean.

---

## 8. Production pipeline (repeatable)

Each video package moves through these stages. The daily cron produces the package; the Pig produces the video.

1. **Idea.** Pick one content angle from SYSTEMS.md or one metric-driven hypothesis from the Page analytics. One idea per video. Write the hypothesis down: "If we teach X in 30 seconds with hook Y, we expect saves because Z."
2. **Script.** Three-track beats: VISUAL track (what is on screen, shot by shot), AUDIO track (voiceover paragraphs, short, numbered), TEXT track (hook headline, on-screen labels, caption emphasis words). Include 5 hook variants and the CTA staging.
3. **Voiceover.** Generate per paragraph with the clone. Review each paragraph for misreads before editing. Normalize loudness.
4. **DaVinci edit (Pig).** Assemble per the three-track script. Hook card, clean cuts, motivated punch-ins, B-roll, graphics for abstractions, professional caption pass, sound design with ducked music bed. Export 1080x1920, high bitrate, clean filename.
5. **Review checklist (every video, no exceptions):**
   - Hook lands inside 1.5 seconds, layered (visual plus text plus voice).
   - Captions burned from frame one; the cut works on mute.
   - Payoff delivers what the hook promised.
   - Exactly one CTA, staged distinctly.
   - No em dashes in any text. No AI hype claims. Humor native, not bolted on.
   - Mascot exact, if present. Brand colors consistent.
   - Text inside safe zones. No platform watermarks.
   - Audio: VO clean and level, music ducked, hook and payoff lines breathe.
   - Length 15-35 seconds unless the hypothesis justifies longer.
   - Export verified: 1080x1920, plays back cleanly, thumbnail frame chosen.
6. **Approval package.** Nolan gets: the video file, the written caption (first line as second hook), 3-5 hashtags, the hypothesis, and the metric to watch. He approves before anything publishes.
7. **Publish and measure.** Native upload per platform. Record the receipt (post ID, time). Then the feedback loop in CONTENT-ENGINE.md takes over.

---

## 9. Series formats (repeatable, professional)

Standing series reduce ideation cost and compound audience expectation:

- **"Show the receipts."** A claim about PING/FYD, then the evidence on screen. 25-30 seconds. The flagship trust format.
- **"One trade truth."** HPP-flavored practical wisdom for home service owners ("A fence should stay straight."). 15-20 seconds. Curation, not invention.
- **"Building in public."** Honest status from the engineering reality: what is green, what is red, what broke this week. The stranded-worktree story lives here.
- **"Six questions."** The anti-agency format: what did we do, why, what evidence, who authorized it, what happened, what did we learn. One question per video or all six in a 35-second sprint.

Each series gets a consistent open graphic and caption style so the audience learns to recognize it in the feed.

## 9b. Technical series (2026-09-30 strategy)

- **"Show the receipts."** A claim about PING/FYD, then the evidence on screen. 25-30 seconds. The flagship trust format.
- **"One authority."** One owner per truth, enforced not declared. Short mechanism explainers.
- **"We were wrong."** The falsification format with the 0-35s structure above.
- **"Failure is a state."** UNKNOWN effects, HOLD, reconcile never blind retry.
- **"Building PING."** Honest build-in-public status: what is green, what is red, what broke this week.
- **"Mechanisms, not frameworks."** What we harvested, what we rejected, and the boundary.
- **"One brain, many hands."** Runtime optionality with authority staying put.
- **"One trade truth."** (commercial pillar) HPP-flavored practical wisdom for home service owners. 15-20 seconds. Curation, not invention.

The technical series carry the 30-post discovery program. Every installment is tagged (TOPIC, DEPTH, FORMAT, HOOK TYPE, SYSTEM, AUDIENCE, CLAIM TYPE) and measured on distribution performance AND audience quality. See EXPERIMENT-PLAN.md.
