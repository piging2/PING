# Facebook engagement guard: root-cause diagnosis (2026-09-23)

Task: determine exactly why the guard fails closed on apparently-eligible candidates.
Do NOT weaken the guard. No production guard code was changed; recommendations only.

## Method

Audited every non-ELIGIBLE decision in
`~/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes/engagement-guard-decisions.jsonl`
(4,423 decisions total; 1,010 non-eligible), cross-checked against the raw log
`~/workspace/outreach/facebook-engagement.md` (3,261 lines) and the derived index
`~/workspace/outreach/.engagement-history-index.json`, plus a code read of
`~/workspace/outreach/engagement-guard.py`.

## Classification counts (all-time, 1,010 non-eligible decisions)

| Class | Count | Share |
|---|---|---|
| TRUE POLICY/ELIGIBILITY BLOCK | 839 | 83% |
| AUTOMATION DEFECT | 171 | 17% |
| STALE STATE | 0 | 0% |
| MISSING EVIDENCE | 0 | 0% |
| CAPABILITY BLOCK | 0 | 0% |
| UNKNOWN | 0 | 0% |

### TRUE POLICY/ELIGIBILITY BLOCK (839)

- 574: exact post/video id already engaged (correct re-like prevention; discovery
  re-surfaces the same group posts each pass and the guard correctly strips them)
- 103: exact numeric page slug already engaged
- 77: exact handle already engaged
- 51: already acted on in an open pass manifest today (restart safety, correct)
- 11: exact page name already engaged
- 9: Instagram trailing-period fuzzy (engaged `@axtellmtnconstruction.` vs
  candidate `@axtellmtnconstruction`; same handle, correct outcome, cosmetic
  record typo only)
- 13: fuzzy-vs-real-name where the match is genuinely the same business and
  fail-closed is the right call (`ag property` 4, `teresa s` 3,
  `edward mcclung s horseshoeing`, `raven s`, `lujan landscaping co biznet`,
  `headlight restoration`, `abbotts cleanup restoration`, `grub 30`)

### AUTOMATION DEFECT (171) — the fail-closed false positives

1. **Garbage names in the engaged set: 57** (`i m` 52, `denver s` 4, `u s` 1).
   Root cause chain, verified end to end:
   - Job builders name actions `"Group | snippet"` per the 2026-09-18 page-name rule.
   - `engagement-guard.py record` writes
     `GUARD-RECORD platform=facebook action=like account=I'm From Denver url=...`
     (facebook-engagement.md:560, 2026-09-17).
   - `GUARD_RECORD_RE` uses `account=([^\s]+)`: it truncates the account at the
     first space. `"I'm From Denver"` parses as `"I'm"` -> normalized `i m`;
     `"U.S. Department of the Interior"` -> `"U.S."` -> `u s`;
     `"Denver's ..."` -> `denver s`.
   - `check_facebook` then applies `_token_subset(cand, known)`: known=`i m`
     has tokens {i, m}, so ANY candidate whose normalized descriptor contains
     the tokens `i` and `m` (i.e. any group-post snippet containing "I'm")
     is BLOCKED as ambiguous identity.
   - Observed in guard audit lines continuously since 2026-09-18, e.g.
     `Fruita (Hi, I'm reaching out...)`, `CO BizNet (Hop on the Networking Bus!
     I'm the MC...)`, `GJ trees (I'm wondering if any of you know...)`,
     `Montrose (Hi! I'm new to this group...)` — all blocked against engaged `i m`.
   - This is the largest single false-positive class and matches the ~59
     apparently-eligible fail-closed candidates in the brief (57 all-time;
     8 on the 2026-09-23 MDT day).

2. **Generic path segments indexed as page slugs: 25** (`reel` 19, `events` 6).
   `FB_SLUG_RE` captures `facebook.com/([A-Za-z0-9_.-]+)/`; `parse_facebook`
   excludes `groups` and `profile.php` but not `reel`/`events`. One like on any
   reel URL poisons the engaged set with slug `reel`, after which every reel
   URL candidate is ALREADY_ENGAGED ("Sierra White ... page slug reel engaged
   before"). Same for `events` URLs ("Cassi RossGeske is interested ...
   page slug events engaged before").

3. **Job builder emits duplicate (identity, action) pairs within one job: 83.**
   The guard's within-pass dedup strips them correctly (e.g. `GJ Events |
   Halloween-emoji` twice in one job, `PEST CONTROL` foreign-spam x2); the
   defect is upstream in build-fb*-job.py, not in the guard.

4. **Group-descriptor vs group-descriptor fuzzy: 6.**
   Long `"Group | snippet"` descriptors are compared as page identities:
   `fruita 9` vs engaged `fruita` (0.857 >= 0.85 fuzzy); `co biznet` vs engaged
   `falling star hvac co biznet` / `a keeper of the cave llc co biznet`
   (token-subset); `roofing a`/`roofing b` vs `the handy dads co roofing a` /
   `snow boy coffee roofing b`. These are different posts in the same group;
   the post-ID check already handles true duplicates. The never-re-engage rule
   is page-scoped; groups are not pages.

### STALE STATE (0)

Index freshness is enforced by sha256 comparison of the source logs on every
load (`load_index` rebuilds when any log hash differs). No stale-index blocks
found.

### MISSING EVIDENCE (0)

No `UNKNOWN-UNCHECKABLE` decisions exist in the log; the `(comment)`-suffix
handling for the 2026-09-18 page-name rule works.

### CAPABILITY BLOCK (0)

No guard decision cites a platform restriction. The 2026-09-23 volume drop to
Stage 0 is Nolan's directive, enforced by caps in the cron body, not by the guard.

## Concrete evidence for the largest defect class (garbage names)

- `engagement-guard.py` line: `GUARD_RECORD_RE = re.compile(r"GUARD-RECORD\s+platform=(\w+)\s+action=(\w+)\s+account=([^\s]+)(?:\s+url=([^\s]+))?")`
- Raw line: `facebook-engagement.md:560`:
  `- 2026-09-17T17:28:31.290260+00:00 GUARD-RECORD platform=facebook action=like account=I'm From Denver url=https://facebook.com/100064965902640/posts/...`
- Parsed identity: `i m` (confirmed in `.engagement-history-index.json` facebook names).
- 52 BLOCKED decisions cite `resembles engaged 'i m'`; sample audit lines at
  facebook-engagement.md:1231 (2026-09-18), :1383 (2026-09-19), :1821/:1822
  (2026-09-20), :2858 (2026-09-22), :3126/:3155/:3246 (2026-09-23).
- The raw GUARD-RECORD lines contain the FULL account strings, so the garbage
  exists only at parse time: fixing the regex and rebuilding the index removes
  the entire class.

## Recommended fixes (none weaken the guard; none implemented pending review)

1. `GUARD_RECORD_RE`: capture the full account string —
   `account=(.+?)(?:\s+url=(\S+))?$` anchored per line — then `rebuild`.
   Eliminates all 57 garbage-name false positives. Strengthens the guard:
   exact-name matching works on real full names instead of fragments.
2. `parse_facebook`: exclude generic segments `reel`, `events`, `watch`, `home`
   from `page_slugs` (same as `groups`/`profile.php` today). Eliminates 25
   false ALREADY_ENGAGED blocks.
3. `build-fb*-job.py`: dedupe `(page, action)` pairs at build time.
   Eliminates 83 upstream duplicates the guard currently has to strip.
4. Descriptor-vs-descriptor fuzzy (6): recommend NO change. Fail-closed stands;
   mitigation is better job page strings (business name when the post is from a
   business Page), not a looser guard.
