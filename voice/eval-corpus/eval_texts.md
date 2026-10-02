# Nolan Voice-Clone Evaluation Corpus
Fixed texts used to generate samples from each candidate clone. Neutral copy, not taken from Nolan's phrasing. Scores 1-5 on: similarity, pacing, prosody, intelligibility, artifacts, emotional range, long-form stability.

## A. Voice-note style (short conversational lines)

**A1**
Hey, quick update on the Johnson job. Got the panel swapped out this morning and everything tested clean. They were happy with the work, and we are scheduled back Thursday for the follow-up.

**A2**
Just a heads up, the supply house is backordered on those breakers until next week, so we may need to shuffle the Wednesday schedule.

**A3**
Can you call me back when you get a chance? I want to run something by you before I send the invoice.

**A4**
Running about fifteen minutes behind. Traffic on North Avenue is brutal. Start without me and I will catch up on the panel.

**A5**
Thanks for sending that over. I will review the quote tonight and get you an answer by tomorrow morning.

## B. Names, numbers, trade terminology

**B1**
Appointment confirmed for the Henderson residence at 4217 Redlands Parkway, Tuesday at nine forty-five in the morning.

**B2**
The estimate came to four thousand two hundred and seventy-five dollars, including materials and labor.

**B3**
We installed a two-hundred-amp service panel, twelve-gauge wiring throughout the garage, and a GFCI outlet by the sink.

**B4**
Mike and Sarah Delacroix called about a furnace that keeps short-cycling. Their number is nine seven zero, five five five, zero one four eight.

**B5**
The subfloor has moisture damage near the sill plate, so we will need to sister those joists before the tile goes down.

## C. Emotional delivery

**C1 (warm, grateful)**
Honestly, I cannot thank you enough. You showed up on time, did exactly what you said you would do, and the place looks incredible.

**C2 (frustrated)**
Look, this is the third time I have called about this leak and nobody has given me a straight answer. I need someone out here today.

**C3 (excited)**
This is huge. We just landed the biggest contract of the year, and it is all because the crew kept delivering.

**C4 (empathetic)**
I completely understand the frustration. Let us figure out what went wrong and make it right. That is what we are here for.

## D. Long podcast-style section (2-3 minutes)

**D1**
A question I keep getting from business owners is whether AI is actually useful for a small shop, or whether it is just hype. And the honest answer is that it depends entirely on where you point it. Most of the tools out there are built for big companies with IT departments. A five-person plumbing shop does not need a dashboard with forty widgets. They need the phone answered when the crew is under a house, and they need the job booked without playing phone tag for two days.

Here is the test I run with every new tool. First, does it save someone at least an hour a week, every week, without them thinking about it? Second, does it work when things go sideways, not just in the demo? And third, can the owner explain what it does in one sentence? If it fails any of those three, it is a demo, not a tool.

Let me give you an example. A contractor I know was missing about one call in five because the whole crew was on site. Those missed calls were not just annoying. They were jobs going to competitors. So we set up an automated answering system. It picks up, takes the details, books the estimate, and sends a confirmation text. Nothing fancy. Within two months, his booked estimates were up noticeably, and he did not hire anyone new.

The interesting part is what changed for his crew. His lead tech told me he stopped dreading Mondays, because the schedule was already full and organized when he woke up. That is the thing people miss about automation. It is not about replacing anyone. It is about removing the administrative drag that makes good people quit.

So if you are a business owner wondering where to start, start with the phone. Start with scheduling. Start with the boring stuff that eats your evenings. Get that right, and everything else gets easier.

## E. Difficult pronunciations

**E1**
The Worcestershire sauce is next to the quinoa in the pantry, and the chipotle peppers are on the top shelf.

**E2**
The sixth sick sheik's sixth sheep is sick. Say that three times fast.

**E3**
She sells seashells by the seashore, specifically the shiny ones she sorted this Sunday.

**E4**
A rural juror drew a blurry mural of the Missouri River in February.

**E5**
The epitome of the phenomenon is statistically significant, according to the preliminary analysis.

---

## Generation plan
- For each model under test (CosyVoice 3 zero-shot, Qwen3-TTS zero-shot if budget allows), generate: A1-A5, B1-B5, C1-C4, D1, E1-E5 = 20 samples.
- Reference prompt: 15-30 s dense clip from SRC-VOICE-000011.wav (clean-references/ set).
- Filename convention: `cosyvoice3_A1.wav`, `qwen3tts_A1.wav`, etc.
- Real-reference control: one genuine clip from 000011 included in the eval set for Nolan to compare against (labeled REAL).
- All outputs AI-generated. Never sent, published, or uploaded anywhere. For Nolan's review only.
