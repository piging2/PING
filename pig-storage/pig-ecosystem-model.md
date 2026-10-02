# The Pig Ecosystem: Mental Model + Entertainment Parallel

Surveyed read-only 2026-09-29 ~19:50 MDT. No writes, no restarts, no config changes.

---

## PART 1 — THE MENTAL MODEL

### The one-paragraph version

The Pig is Nolan's self-hosted Windows machine in Grand Junction (100.79.154.43), and it is really three machines in a trench coat: a Windows host, an Ubuntu Linux world living inside it (WSL2), and a fleet of Docker containers. The Linux world does the heavy thinking — it runs the PING brain (databases, memory, AI models), the FYD website-builder's live demo sites, and the voice factory — while Windows handles the street-level work: a real Chrome browser that likes and comments on social media like a human, plus a pack of watchdog scripts that restart anything that dies. Tying it all together is Tailscale, a private tunnel that lets Nolan's cloud agents reach into the Pig from anywhere, and a strict pecking order of agents: Muse (the operator), Hermes (the Pig-side messenger), and Devin (the apprentice). The whole thing is currently held together by 22.5 GB of free space on a 462 GB drive — the digital equivalent of running a restaurant out of a food truck with the parking brake on.

### The planes

- **Windows plane (the street):** the physical host. Runs the headed Chrome house browser (CDP :9223) that powers all social engagement, the Windows Task Scheduler watchdogs (PigiGatewayWatch, PING-TunnelWatch, FYD-Tailscale-3100, login keepers for FB/IG/LI/TT/X), and Docker Desktop itself. This is the only plane that can touch the real internet like a person.
- **WSL2 plane (the workshop):** Ubuntu 22-ish (kernel 6.6.114.1), 31 GB RAM, up 1d13h at survey time. Home of the agent harnesses, the FYD served sites (:3100), the journal gateways, the voice corpus, and all the git checkouts. Its entire disk is one 118 GB virtual-disk file sitting on C:.
- **Container plane (the engine room):** Docker Desktop running ~11 containers: the PING stack (gateway :8080, postgres :5433, redis :6379, qdrant :6333, vault :8200), a second "brain" stack (postgres :5432, qdrant :6333), Ollama local LLMs (:11434), Open WebUI chat (:3001), and two voice services (Qwen :5000 working, CosyVoice :5001 limping). Its data is a second 106 GB virtual-disk file on C:.
- **Cloud plane (mission control):** this sandbox/VM. Runs the cron schedules, the engagement/outreach pipelines' brains, the marketing OS, and Muse's long-term memory. It reaches the Pig through the Tailscale tunnel via an egress proxy.

### The actors

| Actor | What it is | Role |
|---|---|---|
| Nolan | The owner | Final authority; sleeps while the machines work |
| Muse (Pigi) | Cloud agent (this one) | Operator: reads everything, runs the playbook, reports verdicts |
| Hermes | Pig-side harness (~/.hermes, openrouter/gpt-4o-mini, own cron ticker, bot_relay) | The Pig's resident messenger/handyman |
| Devin | Agent app (9.4 GB of app data, contents unverified) | The apprentice; currently a question mark |
| Copilot identities 1–4 | Token-backed worker identities | Hired hands for bounded jobs |
| Watchdogs | 8 Windows scheduled tasks | Night watchmen; restart dead services, keep logins fresh |
| Engagement crew | Cloud crons + pig-fb scripts + Pig Chrome | The street team: likes/comments/DMs on 5 platforms on 2h cadence |
| Outreach engine | Gmail + contact-form pipeline | The mailroom: cold emails (10/day cap) and form submits |
| Voice factory | Qwen TTS :5000, CosyVoice :5001, voice-factory-data corpus | The voice box; Qwen works with a throat-clear mumble, CosyVoice lost its voice |

### The flows (how work moves)

1. **Engagement loop:** cloud cron fires every 2h → builds a job file → guard checks the never-re-engage list → Pig Chrome (via portable node drivers over CDP) performs likes/comments → results logged back. The Pig is the hands; the cloud is the brain.
2. **Outreach loop:** discovery → research → draft → disclosure-line message → Gmail send or form submit → reply watch. Runs quiet; only replies surface to Nolan.
3. **FYD loop:** code converges in git worktrees → :3100 serves the live demo sites (demo-owner mode always on) → journal gateways (:18199–18202) record evidence → Ask FYD answers from the graph.
4. **Voice loop:** reference clips in the corpus → Qwen service renders speech → the clip ships with a 25 ms throat-clear nobody asked for.
5. **Memory loop:** PING gateway :8080 fronts postgres (facts), redis (scratch), qdrant (vector memory), vault (secrets — currently "unhealthy").

### Dependencies (what breaks if X dies)

- **Tailscale wedges** → cloud can't reach Pig; the whole street team goes blind (happened twice 2026-09-27; prime suspect: Windows Modern Standby naps the WiFi).
- **House Chrome dies** → all social engagement stops; the login-keeper and CDP watchdog tasks exist solely to prevent this.
- **ping-gateway dies** → PING's front door closes; the gateway watchdog restarts it.
- **C: hits 0%** → everything on the Pig seizes; this is the live incident. The two virtual disks (WSL 118 GB + Docker 106 GB) are the immovable furniture.
- **Vault stays unhealthy** → secret storage limps; nothing has caught fire yet, but the treasurer is coughing.
- **CosyVoice stays broken** → no loss; Qwen carries the voice work alone.

---

## PART 2 — THE ENTERTAINING PARALLEL

### Core concept: "THE PIGPEN"

The Pig server is a living farm-city inside a giant metallic-gold pig in a purple suit. Every service is a resident with a job, a personality, and a shift whistle. It is a workplace sitcom set inside Nolan's computer: *The Office* meets a barn raising, where the stakes are always "will the barn run out of room before the new silo arrives." The audience never needs to know what a virtual disk is — they just need to love the characters and recognize the situations (a full barn, a sick treasurer, a town crier who mumbles).

### The cast (character → real component)

- **Boss Hog (the gold pig himself)** → the Pig machine. Founder, landlord, and the building. Vast, golden, purple-suited, naps at unfortunate times (Modern Standby). Everything happens inside him.
- **Pigi the Foreman** → Muse. Reads the whole work order before speaking, then gives the short version. Runs the night shift while the boss sleeps.
- **Hermes the Runner** → the Hermes harness. Literally the messenger god: sprints between the farm and the outside world with notes, never out of breath (gpt-4o-mini).
- **Devin the Apprentice** → the Devin agent. Eager, 9.4 GB of mysterious luggage nobody has unpacked yet. The running gag: nobody knows what's in the apprentice's trunk.
- **The Hired Hands** → Copilot identities 1–4. Four identical cousins, paid by the token, good for one bounded job at a time.
- **The Guard Dogs** → the 8 watchdog scheduled tasks. Patrol the fence line all night barking at anything that goes quiet. TunnelWatch guards the secret tunnel; the login-keepers make sure the town's fake mustaches (social sessions) stay glued on.
- **Gus the Gatekeeper** → ping-gateway :8080. Sits at the front gate with a ledger; every question about the farm goes through him.
- **The Filing Clerk, the Bartender, and the Librarian** → postgres, redis, qdrant. The clerk files every fact, the bartender remembers what you were just thinking about, the librarian finds things by vibes (vectors).
- **Treasurer Vault** → hashicorp vault. The town safe, currently running a fever ("unhealthy"). Coughs whenever anyone asks for a password. Comedy gold, real status.
- **Old Ollama the Oracle** → the Ollama container. Lives in the back room surrounded by glowing stones (qwen2.5-coder, llama3). Answers questions slowly, locally, telling no one outside the farm.
- **Qwen the Town Crier** → qwen3-tts-service :5000. Announces everything in Nolan's voice, but always clears his throat for the first 25 milliseconds. The whole town pretends not to notice.
- **Cosy the Understudy** → cosyvoice-tts :5001. Was supposed to be the backup crier; lost his voice (missing dependencies) and now just stands in the wings mouthing the words.
- **The Canvassers** → the engagement pipelines. A chirpy street team that knocks on doors across five neighborhoods (FB, IG, X, TikTok, Threads) every two hours sharp, led by **Bouncer Gus's cousin the Clipboard** (engagement-guard.py) who maintains the sacred Never-Knock-Twice list.
- **The Mailroom** → the outreach engine. Sends exactly ten letters a day (any more and the postmaster gets suspicious), each opening with "I am not a customer."
- **The Two Immovable Hay Bales** → the WSL (118 GB) and Docker (106 GB) virtual disks. Sit in the exact middle of the barn. Everyone's back aches looking at them. Cannot be lifted, only worked around.
- **The New Silo** → the 1 TB NUSYN SSD. Ordered, paid for, arriving in a week. The whole town has marked the days on a calendar.

### The setting

Inside Boss Hog: a barn-city with a front gate (the gateway), a records office (postgres), a back-room oracle (Ollama), a printing press that only prints demo websites (:3100), a voice studio with a mumbly crier, and a barn stuffed to the rafters. Outside: five social-media neighborhoods connected by roads the canvassers walk every two hours, and one secret tunnel (Tailscale) back to Mission Control, where the Foreman watches the whole farm on a wall of dials.

### Content seeds (each a post or video)

1. **"The Barn Is Full"** — the storage crisis as slapstick: the crew tries to fit one more hay bale into a barn at 95% capacity while the Two Immovable Bales sit center-frame, unmoved and unbothered. Ends on the calendar: "New silo arrives in 7 days." (Real: C: at 95.1%, WSL+Docker own the disk.)
2. **"The Treasurer Has a Fever"** — Treasurer Vault coughs through a status meeting; every secret request gets a wheezy "unhealthy." The Foreman's verdict: "He's still guarding the safe. We're watching him." (Real: ping-vault container unhealthy.)
3. **"The Crier Clears His Throat"** — Qwen announces the morning news in Nolan's voice but mumbles the first word every time; the town holds a good-natured contest to diagnose his throat (25 ms of throat-clear, speech starts at 470 ms). (Real: the lead-in defect.)
4. **"Never Knock Twice"** — ride along with the Canvassers on their 2-hour rounds; the Clipboard bouncer dramatically blocks a door that's already been knocked. "We don't do that here." (Real: the never-re-engage guard.)
5. **"The Night the Tunnel Went Quiet"** — a mini-mystery: the secret tunnel goes silent twice in one day; the Guard Dogs bark at nothing; the Foreman's verdict is the show's catchphrase material: "Unknown is a legitimate state. A made-up answer is not." (Real: the 2026-09-27 Tailscale wedges, Modern Standby suspect.)
6. **"What's in the Apprentice's Trunk?"** — the ongoing gag: Devin's 9.4 GB trunk sits in the corner; every episode someone proposes opening it, the Foreman says "not without the Boss's word." (Real: Devin app data, unverified.)
7. **"Two Kitchens"** — the ping kitchen and the brain kitchen both claim to be the farm's real memory; the Filing Clerks hold a polite but tense summit. (Real: duplicate postgres/qdrant stacks.)

### What to exaggerate vs. keep true

- **Exaggerate:** personalities, the farm setting, dialogue, the hay-bale slapstick, the guard dogs' inner lives. The fiction layer is allowed to be a cartoon.
- **Keep true:** the actual topology (who talks to whom), the real numbers when quoted (95% full, 118 GB, 25 ms), the real incident beats (the wedge, the mumble, the fever), and the power structure (the Boss's word is law; the Foreman reports verdicts, never vibes).
- **Never:** present the fiction as product documentation, or let a cartoon claim ("the treasurer is fine, just tired") contradict a real status the audience could check. The parallel is a lens, not a logbook.

### Content guardrails (from standing brand law)

- The gold pig is always the exact PING pig (metallic gold head, purple inner ears, purple suit) — never a generic farm pig, even in cartoon form.
- Every technical claim inside a storyline stays internally labeled VERIFIED / INFERRED / UNKNOWN; the show can joke about UNKNOWN, never fill it in.
- Humor is native to the brand (the show still works if you ignore the joke); one funny thing per piece minimum.
- Nothing publishes without Nolan approving the exact post.
