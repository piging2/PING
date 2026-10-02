# Lane B11 — Codex Block Investigation
Read-only investigation. No writes to the adapter file or any tree. No gateway, scheduler mission, :3100, or push contact.

## Verdict: HOLD
**The original condition's resolution state is UNKNOWN.** The missing observation is exact: no recorded headless `codex exec` invocation through the configured binary and CODEX_HOME has succeeded or failed since the 2026-09-16 20:18 MDT observation. Do not re-enable on the lapsed timestamp alone.

## (a) Why codex was blocked
The codex profile in `orca-adapter/vendor/external_agent_adapter.js` (pre-parent-edit local copy, lines 88-100) recorded:

```
// BLOCKED_EXTERNAL as of 2026-09-16 20:18 MDT: ChatGPT plan usage limit hit;
// API error says retry at 2026-09-17 12:01 AM. Do not retry before then.
...
blockedExternal: { reason: 'ChatGPT plan usage exhausted (observed 2026-09-16).', blockedUntil: '2026-09-17T06:01:00Z' },
notes: 'Hard OS-level read-only sandbox. Preferred when quota available.',
```

Corroborating record: `memory/2026-09-16.md:271-272` — at 06:22 MDT on 2026-09-16, Nolan reported Codex ran out of usage after creating the OCI/mirror environment, four user-systemd unit files, editing `oci_publisher.py`, and preserving Windows projects. The 20:18 MDT config entry then captured the API error's retry guidance.

Git authorship: **not recoverable.** `git blame` on both the local and Pig copies attributes every line of the codex profile to commit `a4e1e93` ("lane-c base: Hermes repair lane DEFECT-1/DEFECT-2 changes (8/8 PASS)", Pigi, 2026-09-27). That commit is a squash/base-staging commit that carried pre-existing working-copy state; it does not identify who wrote the block. No earlier commit touches the file in either repo. The `2026-09-17.md:1376` harvest-sprint record lists "clock-checked blockedExternal" among coordinator highlights, which suggests the blockedUntil clock-check mechanism (authorizeWorkOrder lines 190-197) was built during the 2026-09-17 sprint, but the codex entry's 2026-09-16 20:18 MDT observation predates that.

## (b) Who set the 2026-09-17 deadline and what it encoded
- The deadline `2026-09-17T06:01:00Z` is exactly 2026-09-17 00:01 MDT, i.e. the API error's own "retry at 2026-09-17 12:01 AM" guidance quoted verbatim in the config comment. **The deadline encodes the ChatGPT API's stated retry time, not an independently chosen re-evaluation point.**
- Set by: a Pigi agent acting on the observed API error on 2026-09-16 evening (comment voice: "Do not retry before then") — this is a hypothesis; git history cannot confirm it due to the squash.
- Semantics (authorizeWorkOrder:190-197): an object-form blockedExternal with blockedUntil denies while `Date.now() < until` and falls through to grantable once the timestamp passes. A missing blockedUntil parses to NaN, which denies unconditionally. The parent's re-block (removing blockedUntil) therefore blocks codex indefinitely and fails closed, which I verified live on the Pig: `blockedUntil` now appears only at line 193 (the parse line), not in the codex profile. Parent's claim (codex granted:false, hermes unaffected) is consistent with the mechanism.

## (c) Is the original condition resolved? — UNKNOWN
Facts:
- The API-stated retry time (2026-09-17 00:01 MDT) lapsed 11+ days ago. Under the standing rule, expiry makes codex eligible for re-evaluation, not authorized for work.
- Post-expiry Codex activity is all Nolan-driven Desktop usage, not PING work-order dispatch through the headless CLI path:
  - 2026-09-17: Nolan himself said he was out of Codex usage and was routing Codex's outputs to Pigi as ideas (memory/2026-09-17.md:523, with Nolan's warning that Codex was "trying to work around" Pigi). Note: this cuts against assuming the quota had reset by 00:01 that day.
  - 2026-09-18 18:20: a Pig Codex task (node_repl.exe from Codex runtimes) was active in two worktrees and pushed a commit at 18:23:54 to the public ngesk2/crx-runtime repo (memory/2026-09-18.md:1441; Nolan's authorship of the launch was an unconfirmed inference, and the push's authorization was still pending).
  - 2026-09-25: Nolan supplied a Codex read-only codebase review, "with a grain of salt" (memory/2026-09-25.md:3397).
  - 2026-09-26: Codex-produced `dist/fyd-design-baseline` reviewed per Nolan (memory/2026-09-26.md:2678).
  - 2026-09-28 05:49 MDT: Codex web-development worktree found at /home/nolan/projects/fyd-design-baseline on the Pig and harvested (memory/2026-09-28.md:989-990).
- **Zero recorded observations** of the configured headless invocation (`codex exec --ignore-user-config -s read-only --ephemeral --skip-git-repo-check`, CODEX_HOME=/mnt/c/Users/nolan/.codex, binary v0.154.0-alpha.6.2) succeeding or failing after 2026-09-16 20:18 MDT. Desktop and headless CLI may draw on different quota buckets; Desktop usage does not prove the headless path is quota-alive.
- No quota re-check mechanism exists for codex anywhere in the tree or config. Contrast the Copilot broker identities (external_agent_adapter.js:134-137): the dispatcher checks remaining >= cost + reserve before issuing and fails closed on unknown/stale quota. The codex profile has no such mechanism; this is the standing lane-11 residual.

Therefore: the retry time passed and circumstantial evidence shows Codex usable on/after 2026-09-18, but the condition state for the headless work-order path is UNKNOWN. The exact missing observation is named below.

## (d) Recommendation: HOLD (do not re-enable)
Per the standing rule, the lapsed deadline does not authorize work. Preconditions for a deliberate re-enable, all of which must hold first:
1. **Live headless smoke probe on the Pig** through the exact configured path (binary, CODEX_HOME, flags, --ephemeral) with a trivial read-only prompt, success or failure recorded in the program ledger with timestamp. Success resolves the condition; a usage-limit error re-blocks with the NEW API-stated retry time as blockedUntil.
2. **A quota re-check mechanism for codex**, mirroring the Copilot broker pattern (dispatcher-side remaining >= cost + reserve, fail closed on unknown/stale), before any grant without a time-boxed blockedExternal. Until then, any re-enable must be time-boxed with a fresh blockedUntil tied to a new observed signal, never open-ended.
3. **Nolan's authorization**, since execution spends his ChatGPT plan quota (external-effect cost). Also relevant: the 2026-09-17 "trying to work around Pigi" note and the 2026-09-18 unconfirmed-authorization public push by a Codex task; those were Desktop usage, but they color the trust posture.

**Exact missing evidence:** (i) a post-2026-09-16 observation of a headless `codex exec` invocation through the configured binary/CODEX_HOME succeeding (or failing with the current quota error); (ii) a quota snapshot or a re-check mechanism wired to the codex profile.

## Falsification
This report is a hypothesis until replayed from a clean checkout. It would be falsified by: a pre-squash commit or lane record naming the true author of the codex blockedExternal entry (falsifies the authorship hypothesis); a journal, lane log, or memory entry recording a successful headless `codex exec` run through the configured path after 2026-09-16 20:18 MDT (falsifies UNKNOWN); or a recorded quota snapshot showing codex remaining > 0 on the headless path (also falsifies UNKNOWN).

## Constraints honored
Read-only throughout: no writes to the adapter file or any tree, no gateway or scheduler-mission contact, no :3100 contact, no pushes. Pig SSH answered within ~1.4s on the first try (BatchMode=yes); no hang retry was needed. The parent's re-block was observed but not modified.
