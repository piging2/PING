# Pronunciation Lexicon (starter)

Canonical pronunciation memory for Nolan's voice work. One entry per term: how it
should SOUND, in plain English. The Performance Director copies relevant entries
into a chunk's `pronunciation_overrides`; the Provider Compiler turns them into
provider fixes (Alibaba `hot_fix` layer, when expressive WebSocket access is
unlocked).

STANDING RULE: use the provider pronunciation layer. Do NOT rewrite script text to
trick the TTS into saying something correctly. Script text stays clean and human;
pronunciation lives here and in hot_fix.

Format per entry: **TERM** -> plain-English guidance. [hot_fix] marks entries
already known to need the provider layer (to be confirmed once expressive access
is live).

## Core product terms (say these exactly right, every time)

- **PING** -> "ping," one syllable, like the network ping. Short i, hard g. Never "pee eye en gee."
- **FYD** -> say each letter: "eff why dee." Never pronounced as a word.
- **ORCA** -> "OR-kuh." Stress on the first syllable, soft ending.
- **Qwen** -> "chwen." Rhymes with "when," starts with a "ch" sound. Not "kwin," not "kwen."
- **Alibaba** -> "ah-lee-BAH-bah." Stress on the third syllable.

## Common tech terms Nolan uses

- **API** -> "ay pee eye," letters.
- **GPU** -> "jee pee yoo," letters.
- **LLM** -> "ell ell emm," letters.
- **SaaS** -> "sass," one syllable. Not "ess ay ay ess."
- **CRM** -> "see are emm," letters.
- **SEO** -> "ess ee oh," letters.
- **URL** -> "yoo are ell," letters. (Some say "earl"; Nolan says the letters.)
- **SQL** -> "sequel" is acceptable; "ess cue ell" also acceptable. Pick one per episode and stay consistent.
- **AI** -> "ay eye," letters.
- **TTS** -> "tee tee ess," letters.
- **SSO** -> "ess ess oh," letters.
- **OAuth** -> "oh auth."
- **JSON** -> "jay-sawn."
- **Wi-Fi** -> "why fy."
- **macOS** -> "mack oh ess."
- **iOS** -> "eye oh ess," letters.
- **Postgres** -> "post-gress."
- **Docker** -> "dock-er," standard.
- **Kubernetes** -> "koo-ber-NET-eez." [hot_fix] (commonly mangled)
- **Tailscale** -> "tail scale," two plain words.
- **WebSocket** -> "web socket," two plain words.

## Companies, products, people

- **Bitcoin** -> "bit-koyn." Standard, but never "bit-kwin."
- **Nvidia** -> "en-VID-ee-uh." [hot_fix]
- **GitHub** -> "git hub," two plain words.
- **ChatGPT** -> "chat gee pee tee."
- **Anthropic** -> "an-THROP-ick."
- **OpenAI** -> "open ay eye."
- **Meta** -> standard "meh-tuh."
- **xAI** -> "ex ay eye."
- **Tesla** -> standard.
- **SpaceX** -> "space ex."
- **Mission Control** -> plain words, slight pause between. It is a product name; give it weight, not speed.

## Names that appear in Nolan's scripts

- **Geske** -> "GHESS-kee." Hard g, rhymes with "desk" + "kee." [hot_fix] (verify against Nolan's own pronunciation before locking)
- **Nolan** -> "NOH-lan." Standard.

## Maintenance notes

- This lexicon grows as mispronunciations are caught in the QC gate (transcript/ASR
  agreement failures) and in listening evaluations. Every new entry needs: the term
  as written, the plain-English guidance, and (once expressive access is live) a
  confirmed hot_fix entry.
- Never fabricate low-confidence guidance. If unsure how Nolan says a name, mark it
  [verify with Nolan] and use the most standard pronunciation until confirmed.
- Review cadence: after every golden-eval round, sweep for new terms the scripts
  used that are not in the lexicon yet.
