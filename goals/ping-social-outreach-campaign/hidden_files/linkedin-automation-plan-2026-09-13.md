# LinkedIn Automation Plan for PING Social Outreach

Date: 2026-09-13. Status: STAGED, awaiting Nolan's one-time login and approvals.
No like, comment, connection request, or message has been sent. No login attempted.

## 1. Verdict

Feasible with the same Pig headed-Chrome pattern as the Facebook worker, but at
materially higher account risk than Facebook. LinkedIn's bot detection is more
aggressive, its Terms explicitly prohibit automation (User Agreement 8.2), and
Nolan's personal LinkedIn is his professional identity, so the stakes of a
restriction are higher than a Facebook engagement pass. The plan below keeps
Phase 1 to likes and comments only, at conservative caps, with halt-on-any-signal
stop rules. Connection requests and DMs are excluded from automation until Nolan
explicitly approves a later phase.

## 2. Environment checks (observed facts)

* Skill catalog: no LinkedIn skill exists (searched "LinkedIn automation
  interactions", "LinkedIn browser engagement likes comments"). Closest matches
  are Threads/Instagram/Facebook messaging skills. Nothing to reuse.
* Existing sessions: none. The Pig has only fb-profile and fb-engage under
  C:/Users/nolan/.local/share/pigi/. No LinkedIn cookies, profiles, or cloud
  browser sessions were found. A prior conversation (memory 2026-09-13) already
  recommended "logged-in Pig browser automation" as the route for LinkedIn as
  the first B2B expansion. This plan implements that recommendation.
* Network: the Pig sits on Nolan's residential connection. Community research
  puts automation restriction risk at ~31% for cloud/datacenter tooling versus
  ~8% with residential IP plus gradual ramp over 90 days. Residential IP is the
  single biggest structural advantage of the Pig approach.

## 3. Chosen architecture

Mirror of the proven Facebook worker, isolated on its own browser instance:

* A second always-on headed Chrome on the Pig:
  `--user-data-dir=C:/Users/nolan/.local/share/pigi/li-profile`
  `--remote-debugging-port=9224` (FB uses :9223; separate port, separate
  profile, so a LinkedIn problem can never take down Facebook and vice versa).
  Launched minimized, kept alive by a watchdog plus scheduled task.
* Worker scripts in C:/Users/nolan/.local/share/pigi/li-engage/, driven over
  SSH via CDP exactly like the FB worker (job JSON in, result JSON out).
* Session persistence hypothesis: LinkedIn login cookies persist in a normal
  Chrome profile across restarts (unlike Facebook, which flags fresh profiles).
  To be verified after Nolan's first login: check_login.js reports LOGIN ok.
  If LinkedIn challenges the session (IP/behavior change), Nolan re-logs in
  the same window.

Why CDP-attach to headed Chrome instead of alternatives:

* Attaching to a real headed Chrome that Nolan himself logged into leaves
  `navigator.webdriver` false. LinkedIn's own client JS checks for
  `navigator.webdriver`, `window.callPhantom`, `_Selenium_IDE_Recorder`, and
  `__webdriver_script_fn` (Castle.io research, Jan 2026). Playwright-launched
  browsers set the webdriver flag; CDP-attach does not.
* Research consensus: velocity and behavior patterns are the dominant
  detection signals, far outweighing transport. The plan therefore spends its
  risk budget on cadence (wide pacing, ramp-up, low caps), not on exotic
  stealth tooling.

## 4. Interaction risk ranking (lowest to highest)

1. Post likes. Lowest risk write. Still counted in velocity signals.
2. Thoughtful comments. Low-medium risk. LinkedIn is actively demoting
   AI-sounding comments (LinkedIn editorial VP, 2026), so every comment must
   be specific, substantive, and human-drafted. Generic praise is both
   ineffective and a detection signal.
3. Connection requests. HIGH risk. LinkedIn's most guarded action; weekly
   invite limits and ignored-request rates feed the account trust score.
   EXCLUDED from worker automation in Phase 1. Manual only.
4. DMs. HIGH risk. Template detection (~15-20 similar messages within 48h
   per community research). EXCLUDED from worker automation in Phase 1,
   consistent with Instagram DMs staying parked.

## 5. Phase 1 caps, pacing, stop rules

Conservative relative to community-observed throttles (connection guidance
~15-20/day, Easy Apply cooldowns ~30/day). Likes/comments sit far below these.

* Likes: max 20 per pass, max 2 passes per day, 90-240s randomized between
  actions (wider than the FB worker's 60-120s; LinkedIn watches velocity
  harder). No fixed cadence; uniform random jitter, never metronomic.
* Comments: max 4 per pass, max 1 pass per day, 5-10 minutes between
  comments. Every comment unique, drafted for the specific post, professional
  voice (see section 8). No links, no selling, no PING mention.
* Warmup schedule for the account (account trust score is dynamic; sudden
  spikes are the best-attested restriction trigger):
  * Week 1: likes only, max 10/day, 1 pass/day.
  * Week 2: add comments, max 2/day.
  * Week 3+: full Phase 1 caps, only if zero warning signals in weeks 1-2.
* STOP RULES (hard, no exceptions):
  * Any checkpoint, "verify your identity", CAPTCHA, "unusual activity",
    "temporarily restricted", "action blocked", or "account restricted"
    language anywhere in the pass: halt immediately, attempt nothing further,
    write the abort into the result JSON, report to Nolan. No automatic
    retry. Resume only on his explicit clear.
  * Login lost: report; Nolan re-logs in the li-profile window.
  * Two aborted passes in any 7-day window: pause the entire LinkedIn
    channel and reassess before any further runs.
  * The worker checks for restriction language before login, before every
    action, and after every submit. Exit code 7 = blocked.

## 6. The one-time setup Nolan must do (nothing else unblocks this)

1. On the Pig, a Chrome window will be opened with the li-profile
   (or Nolan opens it himself with the flags in section 3). He logs into
   LinkedIn there himself, completing 2FA if enabled. Nobody else can do
   this step; no credentials are shared or stored.
2. Approve the always-on second Chrome window plus the PigiLILogin
   scheduled task (logon + every 5 min, mirrors PigiFBLogin).
3. Approve Phase 1 scope: likes and comments only, at the caps above.
4. Answer the open questions in section 10.

Setup sequence after his login (all staged, ready to run):

1. Verify CDP :9224 responds and check_login.js reports LOGIN ok.
2. Create the PigiLILogin scheduled task pointing at the staged
   chrome-cdp-watchdog-li.ps1 (backup of any existing task XML first,
   same discipline as the FB task).
3. Kill-test the watchdog once (stop the li-profile Chrome, confirm
   auto-relaunch within 5 minutes) before any engagement pass.
4. Run one dry-run pass with zero actions (login check only), then week 1
   warmup.

## 7. Discovery model (how targets are chosen)

Cloud brain discovers, Pig hands execute. The worker never scrapes LinkedIn
(it only visits the exact post URLs in its job file), which avoids
read-burst velocity signals:

* Target sources: prospect company LinkedIn pages already found in research
  (research-round40 and earlier mention LinkedIn company URLs), Western
  Colorado trade business pages, and Nolan's own feed suggestions.
* Job JSON format mirrors the FB worker:
  `{ "actions": [ {"type":"like"|"comment", "url": "...", "text": "..."} ],
  "minDelaySec": 90, "maxDelaySec": 240 }`.
* Every comment text is drafted in the cloud against the specific post and
  passed verbatim to the worker. The worker posts exactly what it is given.
* Logging: every like/comment logged to a linkedin-engagement.md file
  (same convention as facebook-engagement.md) with URL, timestamp, and
  result, so a reply or profile view can be answered with full context.

## 8. Comment voice for LinkedIn

LinkedIn is not Facebook. The FB voice (punchy, under 20 words, funny)
underperforms here and reads as low-effort. LinkedIn rules:

* React to something specific in the post; add a perspective, experience,
  or concrete observation. 1-3 sentences.
* Professional and down to earth. No selling, no PING mention, no links,
  no contact info, no customer-posing.
* Never generic praise ("Great insights!", "So true!"). That is exactly
  what LinkedIn's AI-comment filters demote, and at volume it looks
  automated.
* Business pages and real operator profiles first; skip obvious
  engagement-bait and recruiter spam.

## 9. What is built and staged

Local (~/workspace/pig-linkedin/):

* engage.js: LinkedIn worker. CDP :9224, login check with restriction
  detection, doLike (aria-label Like trigger, aria-pressed verification,
  DOM click), doComment (comment button, light-DOM contenteditable editor
  with aria-label "Text editor for creating content", human-paced typing
  60-140ms/char, submit-button click, post text verification). Phase 1
  action types only; unknown types rejected. Restriction regex checked
  pre-login, pre-action, post-submit. Result JSON with per-action outcomes
  and abort records. Syntax checked.
* check_login.js: standalone login/restriction probe. Syntax checked.
* run_pass.sh: cloud-side wrapper. Copies job to the Pig, launches the
  worker in one SSH session with NODE_PATH pointed at the existing
  fb-engage node_modules (playwright-core already installed there), waits
  for the result file, prints result JSON. Exit 2 on infra problems,
  including the blocked signal. Syntax checked.
* ensure-cdp-li.sh: CDP :9224 probe. Deliberately does NOT fire the FB
  recovery task; reports down until PigiLILogin exists. Syntax checked.
* chrome-cdp-watchdog-li.ps1: DRAFT watchdog mirroring the FB watchdog
  (probe :9224, kill only li-profile chromes, relaunch with li-profile
  flags). Staged, not installed.

Pig-side (staging only, no behavior change):

* C:/Users/nolan/.local/share/pigi/li-engage/ with engage.js,
  check_login.js, inbox/ (scripts copied and verified present).
* C:/Users/nolan/.local/share/pigi/li-profile/ created empty, ready for
  first Chrome launch + Nolan's login.

Full report saved at:
~/workspace/goals/ping-social-outreach-campaign/hidden_files/linkedin-automation-plan-2026-09-13.md

## 10. Open questions for Nolan

1. Which account does engagement run as: your personal profile (warmer,
   higher trust, higher stakes if restricted) or the PING Social company
   page? Recommendation: personal profile for likes/comments; company page
   for original posts later.
2. Approve the always-on second Chrome window and the PigiLILogin
   scheduled task (logon + every 5 minutes)?
3. Approve Phase 1 scope: likes + comments only at the caps in section 5,
   with connection requests and DMs manual-only until a later phase?
4. Comment voice sign-off: professional/substantive per section 8?
5. Channel priority: standing rules put Facebook interactions first, then
   marketing intelligence, forms, email last. Where does LinkedIn sit?
   Proposal: after Facebook/Instagram engagement, before forms, given
   B2B relevance to business owners. Or keep it as a low-volume
   experiment until warmup completes.
6. Is 2FA enabled on your LinkedIn (affects the login step)?

## 11. Deliberately NOT done

* No scheduled task created (production change; needs Nolan's approval).
* No Chrome launched with li-profile (needs his login anyway).
* No login attempted, no credentials handled.
* No cron created for linkedin-engagement-pass (propose every 12h at low
  volume after warmup; owned by the outreach campaign goal; create only
  after his approvals).
* No connection-request or DM capability in the worker (excluded by design).
* Nolan's personal Chrome profile untouched; the watchdog draft kills only
  li-profile processes by command-line match.

## 12. Honest residual risk

Even with all mitigations, the risk is not zero. Community data suggests
~8% of properly set up automation accounts face restrictions within 90
days. LinkedIn's Terms explicitly prohibit this class of automation, so a
restriction would be enforcement of written policy, not a misunderstanding.
The mitigations (residential IP, real headed Chrome, CDP-attach with no
webdriver flag, human cadence, conservative caps, ramp-up, halt-on-signal)
are the best available posture short of manual-only operation. If Nolan
prefers zero risk, the fallback is manual engagement with cloud-drafted
comment copy, which this plan also supports (the discovery and drafting
pipeline works without the worker).
