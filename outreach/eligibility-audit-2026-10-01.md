# Eligibility machinery audit, 2026-10-01

Read-only audit of the existing Facebook/outreach engagement safety machinery,
under CEO-ORDER-ENGAGEMENT-ELIGIBILITY-P0-2026-10-01.md (Nolan, 2026-10-01 ~05:19 MDT).
Read-only: static analysis and local file reads only. No code was executed, nothing
was dispatched, no cron, hold, ledger, or Pig state was touched.

## Context

FB pass 173 (2026-09-30 23:26 MDT) dispatched a 34-like curated job containing
known-ineligible candidates (out-of-corridor items, previously blocked businesses,
already-engaged pages). Human review killed the worker. 2 ineligible likes escaped
(CO BizNet water-extraction permalink 4090528661082571, CO BizNet 3-phase
fence-post permalink 4090481474420623, both recorded EXECUTED in the intent ledger),
31 were never attempted. Note: Nolan unfroze engagement at ~05:21 MDT
("SORRY UNFREEZE BUT INVESTIGATE EVERYTHING ELSE STANDS"); the eligibility P0
investigation continues. holds.json was observed at 11:19:58 UTC (05:19 MDT)
with owner holds on facebook, instagram, threads, x; its state after the 05:21
unfreeze was not re-read (out of audit scope).

---

## 1. Per-mechanism coverage and gaps

### 1a. engagement-guard.py (engagement lane guard)

* What: `filter --platform facebook --fb-job` (and `--platform instagram`) classifies
  candidates as ELIGIBLE / ALREADY_ENGAGED / BLOCKED / UNKNOWN-UNCHECKABLE. It also
  has `--audit`, `record`, `verify`, and the FB URL-to-post-ID regexes that both
  build-fb-job.py and action-intent-ledger.py import from it (it is already the
  de facto shared identity library).
* What it checks (facebook path, `check_facebook`): post-ID exact match against
  terminal-aware ledger IDs plus parsed md history; page-slug match; exact name
  match; `blocked_names` (from prose annotations in facebook-engagement.md matching
  `(never-re-engage|already liked|already handled)`); fuzzy/token-subset ambiguous
  identity; UNKNOWN-UNCHECKABLE when history is unreadable (exit 3, fail closed).
  Within-run dedup by (identity, action type).
* Enforcement point: dispatch time, inside run_pass.sh (mechanical, not
  agent-bypassable). For IG/Threads, the cron worker runs it from a prose step
  (agent-executed, not script-embedded).
* Gaps: no corridor concept at all (no geography), no structured blocked-business
  list (except via prose annotations), no recency concept, no thin-no-name
  concept, no SUPPRESSED, no per-action capability check, no PROVIDER_UNSUPPORTED,
  no RATE_LIMITED. Dedup is within-run only, not durable.

### 1b. action-intent-ledger.py (intent/state machinery)

* What: `write-intents` (ACTION_INTENT_DURABLE before any browser action),
  `mark-execution`, `record-outcomes` (OBSERVATION records close intents to
  EXECUTED/FAILED/NOT_ATTEMPTED), `refuse` (UNKNOWN_EXECUTION refusal filter),
  `reconcile`, `list-unknown`, `sweep-stale-dispatches`, `verify`.
* Enforcement point: dispatch time in run_pass.sh (refuse) and the collector
  (facebook-engagement-collect, every 15m).
* What it decides: whether a candidate has an unresolved intent from an older
  pass; whether history/ledger is readable. It refuses UNKNOWN_EXECUTION entries
  and fails closed (exit 3) on unreadable state.
* Gaps: it is about restart/retry safety, not eligibility. It does not evaluate
  any of the CEO order's reason codes.

### 1c. authority-check.py + AUTHORITY.json + holds.json + set-hold.py (surface authority)

* What: `authority-check.py <surface>` reads holds.json FIRST (step 0, fail-closed
  on missing/invalid; active hold = DENY), then AUTHORITY.json statuses
  (ACTIVE/HELD/SUPPRESSED), capability.authorized flags, tripwire restrictions,
  and log-tail markers. set-hold.py is the only sanctioned writer of holds.json
  (mandatory --by owner|tripwire provenance, atomic tmp+rename, audit trail in
  hold-changes.jsonl).
* Enforcement points: plan time (FB cron body calls it before the build) and
  dispatch time (all run_*_pass.sh and x-*.sh scripts call it first). Both call
  sites exist today.
* What it decides: surface-level HOLD/DENY, surface status, surface capability.
  SUPPRESSED exists as a status definition ("zero external action; stronger than
  HELD, typically platform-driven") but no surface is currently SUPPRESSED.
  instagram capability authorized:false is enforced here (plan-time gate in
  run_pass.sh).
* Gaps: it evaluates the surface, not the action. No per-action eligibility, no
  reason codes, no corridor, no candidate state.

### 1d. run_pass.sh (FB dispatch chain, mechanical)

The full mechanical chain, in order: (1) authority-check.py facebook;
(2) browser lock; (3) in-flight worker probe (kills stale browser workers);
(4) engagement-guard.py filter --fb-job; (5) action-intent-ledger.py refuse;
(6) write-intents; (7) stamp pass_id; (8) CDP preflight; (9) scp job+engage.js to
the Pig; (10) mark-execution; (11) WMI launch of engage.js (detached);
(12) result/progress files returned to the Pig inbox; (13) collector
(facebook-engagement-collect every 15m) record-outcomes -> OBSERVATION records.

### 1e. run_ig_pass.sh / run_th_pass.sh / x-*.sh (other surfaces)

* run_ig_pass.sh and run_th_pass.sh run authority-check.py mechanically, then
  execute a CLOSED action set. The guard filter, refuse filter, write-intents,
  and mark-execution steps live in the cron-body prose and are executed by the
  agent worker, NOT by the script. IG cron body documents them as mandatory
  steps (exit-3 fail-closed semantics); Threads equivalent was not re-verified.
* x-engage.sh, x-comment.sh, x-follow-batch.sh run authority-check.py only;
  guard/refuse/intent bookkeeping, if any, is in the X cron worker's prose.
* Enforcement asymmetry finding: only the FB path has the mechanical
  guard+refuse+intent chain embedded in an executable script. Everywhere else
  it is agent-executed prose.

### 1f. build-fb-job.py (canonical FB job builder, plan-time pre-filter)

* What: `candidate_blocked()` merges blocked-business WCO chimney IDs
  (WCO_CHIMNEY_IDS = 3 hard-coded post IDs: 1531824742295756 plus two more), engaged
  post IDs, today-manifest entries, ledger-engaged, engaged names, blocked names.
  Regex tiers: DROP_RE (giveaway/event/giveaway class), GEO_DROP_RE (text cities;
  Front Range list only, no Durango, no Glenwood), CURATED_DROP_RE, PROMO_RE.
  CORRIDOR group-ID set (from the 2026-09-19 GROUP_NAMES mapping) gates only
  tier 2 ("corridor-group promo posts"); tier 3 ("other-group promo posts") admits
  any group with only text-heuristic locality filtering.
* Enforcement point: plan time, before the provisional job is written.
* Gaps: (a) the manually curated job path BYPASSES candidate_blocked entirely
  (pass 173's curated JSON went straight to run_pass.sh); (b) GEO_DROP_RE is a
  text heuristic, not a corridor membership test, and lacks the out-of-corridor
  cities; (c) CORRIDOR only biases tier 2, it never excludes; (d) the Redlands
  dryer-vent post (Western Colorado Chimney, blocked business) passed because the
  post carried no owner ID and its text does not name the business; the code
  comments admit this gap.

### 1g. fb-url-fallback.py (alternative plan-time path)

* What: like_eligible with DROP_RE/GEO_DROP_RE text heuristics (same incomplete
  city list), ledger-blocked at build time, trust gate, dedup on
  (`platform`,`permalink_id`) and permalink+type, then hands off to run_pass.sh.
* Gaps: same as 1f (no corridor enforcement, no blocked-business registry,
  no recency). Its regex tier is a duplicate of build-fb-job.py's (two sources
  of truth for the same text heuristics).

### 1h. fb-degraded-probe.py (path health)

* What: verifies the browser path is healthy before any like/comment work.
* Decides: a PATH outcome (healthy/unhealthy/stefi-outage), not per-action
  eligibility. Prevents engagement on a dead path. Not an eligibility authority.

### 1i. Manual curation (the plan-time step that failed in pass 173)

* What: the cron worker (agent) reads the provisional job plus the pass log's
  prose precedents and hand-writes the curated job JSON.
* This is the step that failed in pass 173. The pass-174/175 lesson added
  ("re-read the last 2-3 pass-log curation sections BEFORE dispatching") is
  still prose. There is no code that reads the curated job and enforces the
  fail-closed precedents before run_pass.sh.

### 1j. engage.js (the browser worker)

* What: dumb executor on the Pig. Reads the stamped job, performs like/comment
  clicks with 60-120s pacing, halt-on-platform-block body regex (lines 154-155).
* It performs NO eligibility evaluation. The last code that sees an action before
  a browser click is engage.js itself.

### 1k. send-eligibility.py (outreach-engine lane, NOT engagement)

* What: deterministic send-eligibility gate for cold email / followups / DMs /
  forms. Verdicts ELIGIBLE / INELIGIBLE / DISCREPANCY; precedence: canonical
  structured state > explicit suppression > verified history > derived projection;
  notes advisory only, never authoritative. Fail-closed on discrepancy; exit 3
  when the mandatory Gmail verification is missing. Produces discrepancy records
  (eligibility-audit.jsonl) and reconciliations (eligibility-reconciliations.md).
* Why it matters here: it is the closest existing instance of "one deterministic
  eligibility authority" in the codebase, with the exact notes-never-authorize
  semantics the CEO order demands. It belongs to a different lane; do not merge
  lanes, harvest the pattern.

### 1l. Stale/missing pieces

* `never_reengage.py` does NOT exist. The FB cron body step 34 still names a
  `--filter-job` path through it (doc drift). The live chain is build-fb-job.py
  pre-filter + guard filter + refuse filter.
* `.engagement-history-index.json` is a derived cache of the md logs (line
  spans, per-post records), not an authority.
* Engagement-passes manifests (hidden_files/engagement-passes/) dedup within
  the day; durable truth is the intent ledger.

---

## 2. Reason codes: data vs prose

| Code | Data today | Prose today |
|---|---|---|
| BLOCKED | guard BLOCKED decision; blocked_names from md annotations; WCO_CHIMNEY_IDS (3 IDs) | per-business fail-closed precedents in pass logs (Paint Wizards, AG Property Services) |
| SUPPRESSED | surface-level only (AUTHORITY.json status definition; per-action SUPPRESSED exists in send-eligibility.py for email prospects, not engagement) | nothing |
| ALREADY_ENGAGED | guard (post ID, slug, name); ledger terminals; index | nothing |
| OUTSIDE_CORRIDOR | GEO_DROP_RE text heuristic (incomplete city list); CORRIDOR group set (tiering only) | corridor policy in MEMORY.md/AGENTS.md ("no Durango, Glenwood Springs..." etc.) |
| CAPABILITY_MISSING | surface-level (AUTHORITY.json capability.authorized, e.g. instagram false) | nothing |
| PROVIDER_UNSUPPORTED | nothing | nothing |
| DUPLICATE | within-run (identity, action type) dedup in guard filter | nothing |
| RATE_LIMITED | nothing structured | log-tail marker parsing in authority-check (produced false positives) |
| UNKNOWN | UNKNOWN-UNCHECKABLE (exit 3 fail closed); UNKNOWN_EXECUTION refuse filter | nothing |

---

## 3. Exact FB dispatch chain and TOCTOU surface

1. Cron worker: authority-check.py facebook (plan-time gate).
2. Worker: fbNNN-discover.py -> build-fb-job.py -> provisional job (candidate_blocked + tiers).
3. Worker: manual curation over the provisional job -> curated job JSON (bare list of {type,url,page}; carries NO eligibility evidence).
4. run_pass.sh: authority-check -> browser lock -> worker probe -> guard filter
   -> refuse -> write-intents -> stamp pass_id -> CDP preflight -> scp to Pig
   -> mark-execution -> WMI launch engage.js -> pacing 60-120s per action ->
   results to Pig inbox -> collector record-outcomes every 15m.

Last code to see an action before the browser worker: the stamp step in
run_pass.sh (step 4 of 6). engage.js reads the stamped file once at start and
never re-consults eligibility; each action is clicked on a fixed schedule with
no per-action re-evaluation. TOCTOU window: from guard-filter time to the
worker clicking that action, minutes to well over an hour of pacing. A block,
suppression, or recency change made mid-run is invisible to the worker. The
only mid-run safety is engage.js's halt-on-checkpoint regex, which is about
platform flags, not eligibility.

Slip-through points (all verified in code):
* The curated path bypasses build-fb-job.py's candidate_blocked (pass-173 hole).
* The guard filter has no corridor, blocked-business registry, or recency
  concept; the precedents it would need live only in pass-log prose, which it
  does not read.
* Same-business cross-posts with new permalink IDs are invisible to the
  post-ID index, and group-post "page" descriptors are free-text snippets, not
  canonical business identity, so same-business fuzzy matching fails.
* IG/Threads/X do not have the guard/refuse/intent chain in a script; the
  agent runs those steps from cron-body prose.

---

## 4. Why each pass-173 known-ineligible category passed

* Out-of-corridor (7 Durango-group items, incl. Detail Doctor Inc; 1 Denver-metro
  CO BizNet fence-post item): GEO_DROP_RE has no Durango entry (Front Range
  cities only). The Durango group ID 786995948656362 is not in the builder's
  CORRIDOR set, but tier 3 ("other-group promo posts") admits any group with
  only text heuristics. Missing check: group/page locality -> corridor
  membership tested as data, not as a text regex.
* Previously blocked businesses (Western Colorado Chimney dryer-vent post
  1531824742295756; Paint Wizards 4615389658783888): builder knows only the 3
  hard-coded WCO Chimney IDs and name matching on truncated text. The dryer-vent
  post carried no owner ID and its text does not name the business; the code
  comments admit the gap. Paint Wizards lived only as a pass-log prose
  precedent. Missing check: structured blocked-business registry (IDs, name
  variants, reason, evidence).
* Already-engaged pages (Coyote Rolloff 1815541073204264, pass-169; Cowboys and
  Aliens 1815375936554111; Fresh Bread Friday 2884304645272003, Wing Wednesday
  4483945908545852, highlight opening 1531998802278350, all pass-167; Blessed
  Harvest 2300511987379647 and Orchard Mesa preorders 4613765708946283, EXECUTED
  09-27): these were new permalink cross-posts; the post-ID index cannot see
  same-business-different-post. Group-post "page" descriptors are free-text
  snippets, so fuzzy name matching could not connect them. Missing check:
  canonical business identity + recency window, as data.
* Thin no-name promos (4 CO BizNet posts: water extraction, fence-post,
  plans/contractor, Ladies Night): no data concept exists at all; the
  fail-closed precedent is pass-log prose only. The builder admits them
  (PROMO_RE matches trade text, non-empty). 2 of these escaped.
* What did catch: the guard blocked exactly 1 of 34 at dispatch (Orchard Mesa
  AG Property Services 4613081269014727, fuzzy token-subset match). The other
  33 got intents; 2 executed before the human kill, 31 never attempted.

---

## 5. Consolidation proposal

* One eligibility function. The consolidation target is engagement-guard.py.
  Reasons: it is already imported as a library by build-fb-job.py and
  fb-url-fallback.py; the ledger imports its FB regexes; it already runs
  mechanically inside run_pass.sh at dispatch where no agent can bypass it; it
  already has fail-closed exit-3 semantics and terminal-aware ledger merging.
  Extend it to check(candidate, action, campaign, engagement history,
  suppression/block state, corridor policy, provider capability) ->
  ELIGIBLE / INELIGIBLE / UNKNOWN + reason codes. UNKNOWN = do not dispatch.
* What it needs as new DATA (no prose): (a) corridor membership table
  (group-ID/city -> in/out, replacing GEO_DROP_RE + CORRIDOR tiering);
  (b) blocked-business registry (canonical name, post/page ID set, name variants,
  reason, evidence ref; absorbs WCO_CHIMNEY_IDS); (c) precedent registry
  converting the pass-log fail-closed classes into rules (thin-no-name,
  recency window, event/fundraiser classes, fundraiser/spotlight drops);
  (d) per-action capability matrix for the engagement lane (fb like/comment
  supported; surface-level capability stays in AUTHORITY.json).
* Enforce twice. Plan-time: the builder AND the curation path must call the
  same function; the curated job must carry per-action eligibility evidence
  (decision + reason codes + timestamp + evidence hash), and run_pass.sh must
  refuse actions whose evidence is missing or stale (covers the pass-173 hole
  where curation bypassed candidate_blocked). Dispatch-time: the existing
  guard+refuse steps stay, now evaluating the full reason-code set; engage.js
  verifies the per-action envelope before each click (TOCTOU close); missing or
  stale envelope = skip, not retry.
* Harvest, do not merge. send-eligibility.py's pattern (explicit SUPPRESS
  precedence, discrepancy records, notes-never-authorize, mandatory verification
  input, exit-3 fail-closed) is the template, but lanes stay separate.
* Convert after convergence (PING rule: discover, classify, consolidate,
  verify, archive, delete): build-fb-job.py candidate_blocked and the
  fb-url-fallback.py like_eligible tiers become thin callers of the single
  function; the duplicated regex tiers collapse to one source; the stale
  never_reengage.py references in the FB cron body are removed; per-pass
  build-fbNNN shims point at the canonical builder.
* Acceptance per the CEO order: offline replay of pass 173 with zero external
  actions; adversarial fail-safe suite (unreadable history, missing envelope,
  stale envelope, unknown group ID, ambiguous identity, mid-run block);
  then one tiny bounded real validation batch.

---

## 6. The 34 original pass-173 candidates

Source: ~/workspace/outreach/fb173-curated-job.json (read in full 2026-10-01).
All actions are type "like". The records carry NO eligibility evidence (only
type/url/page). Statuses below are from the pass-173 pass-log review
(facebook-engagement.md lines 4737-4786): ESCAPED = executed before the human
kill (2), STOPPED = never attempted (31, intent remains open in EXECUTION),
GUARD-BLOCKED = blocked by the guard at dispatch (1, no intent written).
Violation categories use the CEO order's reason-code names.

| # | Page (as recorded) | Permalink ID | Group | Status | Audit classification |
|---|---|---|---|---|---|
| 1 | CO BizNet: FREE Water Extraction Quo... | 4090528661082571 | CO BizNet | ESCAPED | thin no-name promo, INELIGIBLE (prose precedent only; no data check) |
| 2 | CO BizNet: Need a Fence Built? Try L... | 4090481474420623 | CO BizNet | ESCAPED | thin no-name promo + OUTSIDE_CORRIDOR (Denver metro) |
| 3 | Montrose: After-school art classes in ... | 3505410766299233 | Montrose Msg | STOPPED | retained in corrected 7 (in-corridor) |
| 4 | Montrose: Need a free quote? Our team... | 3505388339634809 | Montrose Msg | STOPPED | retained in corrected 7 (in-corridor) |
| 5 | Durango: Local electrician here! Ne... | 2015955525760392 | Durango | STOPPED | OUTSIDE_CORRIDOR |
| 6 | Durango: ❄️ Furnace Check! ❄️ | 2015912259098052 | Durango | STOPPED | OUTSIDE_CORRIDOR |
| 7 | Durango: Did you know that you can ... | 2016037242418887 | Durango | STOPPED | OUTSIDE_CORRIDOR |
| 8 | Durango: Let me redo your tile! Foll... | 2015847529104525 | Durango | STOPPED | OUTSIDE_CORRIDOR |
| 9 | Durango: Calling all GOLFERS! ... Par Theory | 2014856202536991 | Durango | STOPPED | OUTSIDE_CORRIDOR |
| 10 | Delta: At @Coyote Rolloff Se... | 1815541073204264 | Delta | STOPPED | ALREADY_ENGAGED (pass-169, cross-post new permalink) |
| 11 | Palisade Msg: Fresh Bread Friday! F... | 2884304645272003 | Palisade Msg | STOPPED | ALREADY_ENGAGED (pass-167, cross-post) |
| 12 | Orchard Mesa: Paint Wizards | 4615389658783888 | Orchard Mesa | STOPPED | BLOCKED (fail-closed business precedent, prose only) |
| 13 | Orchard Mesa: AG PROPERTY SERVICES | 4613081269014727 | Orchard Mesa | GUARD-BLOCKED | BLOCKED (guard fuzzy match at dispatch; no intent) |
| 14 | Redlands: YOUR DRYER SHOULDN'T TAKE TWO ... | 1531824742295756 | Redlands | STOPPED | BLOCKED business (Western Colorado Chimney; no owner ID on post, text names nothing) |
| 15 | GJ Message Board: Blessed Harvest | 2300511987379647 | GJ Message Board | STOPPED | ALREADY_ENGAGED / recency (EXECUTED 09-27) |
| 16 | Fruita: Grand Opening at The Fruita ... | 4484472325159877 | Fruita | STOPPED | retained in corrected 7 (in-corridor) |
| 17 | Fruita: 5 hours, 5 lbs of coffee beans... | 4484452475161862 | Fruita | STOPPED | not retained in corrected set; log names no specific precedent |
| 18 | Fruita: Looking to add some spice t... aerial silks | 4484242598516183 | Fruita | STOPPED | author-unverifiable (prose drop rule) |
| 19 | Fruita: 🔥 Wing Wednesday 🔥 | 4483945908545852 | Fruita | STOPPED | ALREADY_ENGAGED (pass-167, cross-post) |
| 20 | Montrose: Boolesque: A Halloween Var... | 3503936963113280 | Montrose Msg | STOPPED | event drop (prose precedent) |
| 21 | Ridgway: Ridgway Color Factory is look... vet tech | 28663092796663962 | Ridgway | STOPPED | retained in corrected 7 (in-corridor) |
| 22 | Ridgway: October Specials! | 28661351080171467 | Ridgway | STOPPED | retained in corrected 7 (in-corridor) |
| 23 | Ridgway: The peaks are snowing alread... | 28659308433709065 | Ridgway | STOPPED | retained in corrected 7 (in-corridor) |
| 24 | Ridgway: Free estimate... | 28655563680750207 | Ridgway | STOPPED | not retained in corrected set; log names no specific precedent |
| 25 | Delta: Cowboys and Aliens | 1815375936554111 | Delta | STOPPED | ALREADY_ENGAGED (fuzzy &/and match against history) |
| 26 | Orchard Mesa: preorders for October... | 4613765708946283 | Orchard Mesa | STOPPED | ALREADY_ENGAGED / recency (EXECUTED 09-27) |
| 27 | GJ community: Looking for something ... October books | 1665607098688820 | GJ community | STOPPED | not retained in corrected set; log names no specific precedent |
| 28 | GJ Events: Junktown Flea Market Oct ... Mesa County | 4409660186015745 | GJ Events | STOPPED | retained in corrected 7 (in-corridor) |
| 29 | GJ Events: Stop by and meet our 'No ... Guy I... | 4409155212732909 | GJ Events | STOPPED | not retained in corrected set (log names a KAFM fundraiser drop; snippet truncated at 42 chars, exact mapping uncertain) |
| 30 | Redlands: highlight your home with a s... opening | 1531998802278350 | Redlands | STOPPED | ALREADY_ENGAGED (pass-167, cross-post) |
| 31 | CO BizNet: Are you looking for plans ... contractor | 4090638651071572 | CO BizNet | STOPPED | thin no-name promo, INELIGIBLE (prose precedent only; no data check) |
| 32 | CO BizNet: 💫 Ladies Night 💫 | 4090556334413137 | CO BizNet | STOPPED | thin no-name promo, INELIGIBLE (prose precedent only; no data check) |
| 33 | Durango: If you are free this week, y... workshop | 2016065955749349 | Durango | STOPPED | OUTSIDE_CORRIDOR |
| 34 | Durango: Detail Doctor Inc | 2014979352524676 | Durango | STOPPED | OUTSIDE_CORRIDOR |

The corrected set (fb173-curated-job-corrected.json, 7 likes, 0 comments, NOT
dispatched): 3505410766299233, 3505388339634809, 4484472325159877,
28663092796663962, 28661351080171467, 28659308433709065, 4409660186015745
(Montrose x2, Fruita x1, Ridgway x3, GJ Events x1). All 7 are a subset of the 34.

Note on uncertainty: items 17, 24, 27, 29 were dropped in the correction but the
pass log names no specific fail-closed precedent for them; item 29 may be the
"KAFM fundraiser" the log names (the recorded page text is truncated at 42
characters, so the exact mapping is uncertain, recorded as UNKNOWN rather than
guessed).

## Ledger state (observed in session)

68 records under pass_id fb-20261001-052817: 33 intents + 33 execution-stage
records + 2 OBSERVATION records. The 2 OBSERVATION records (CO BizNet water
extraction 4090528661082571, CO BizNet 3-phase fence-post 4090481474420623) are
terminal EXECUTED, the escaped ineligible likes preserved as actual outcomes.
The other 31 intents remain open in EXECUTION; the next pass's refuse filter
treats them as UNKNOWN_EXECUTION and refuses them pending explicit
reconciliation.
