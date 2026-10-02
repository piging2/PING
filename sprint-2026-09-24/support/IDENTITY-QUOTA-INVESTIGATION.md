# IDENTITY / QUOTA INVESTIGATION — read-only security findings

**Date:** 2026-09-25 ~20:43 MDT · **Mode:** READ-ONLY. No writes, no quota spent, no credentials printed, no patches.
**Investigator tracks:** A (identity_5/6 provenance) · B (Crush spend path) · C (broker dispatch() callers)
**Question answered:** is there a live unauthorized Copilot spend path, and who can spend what?

---

## Executive verdicts

| Subject | Verdict | Live unauthorized spend? |
|---|---|---|
| identity_5 (piging87) | **UNAUTHORIZED-SPENDABLE** (reachable, not yet spent) | No — `task_count: 0` |
| identity_6 (nolangesk-droid) | **UNAUTHORIZED-SPENDABLE** (reachable, not yet spent) | No — `task_count: 0` |
| identity_7 (trishnikitha-art), identity_9 (nmgeske), identity_10 (piging3) | **UNAUTHORIZED-SPENDABLE** (same mechanics) | No — `task_count: 0` |
| identity_8 (hamstrunginsouciance-design) | **INERT-ROW** (fail-closed by quota model) | No |
| Crush `copilot/gpt-4o-mini` path | **DORMANT-BYPASS-CAPABLE** (mechanism proven, credential expired) | No |
| Copilot broker `dispatch()` | **ONE CALLER: manual test harness** (`dispatch-task.js`); no autonomous production traffic ever | N/A |

**Bottom line:** There is **no live unauthorized spend** anywhere in the Copilot/identity/quota surface. What exists is a **reachable-but-unused authorization gap**: identities 5–10 are human-OAuth-authorized (Nolan completed the OAuth himself), carry fresh quota, are absent from the PING authorization registry, and the broker's `dispatch()` performs no registry allowlist check — so a direct dispatch as identity_5..10 would spend real quota outside PING authorization. Separately, Crush *could* spend Copilot quota invisibly to all broker accounting, but its credential has been expired since Sep 19 and it has not run since ~Sep 18. Neither is an active incident. Both are containment candidates, ranked below.

---

## 1. Per-identity findings

### 1a. Provenance: who created identity_5..10 (PROVEN)

- **Creation path:** `~/copilot-broker/scripts/authorize-identity{N}.sh` (N=2..10 all present on the Pig) → `scripts/authorize.sh identity_N` → **human OAuth in a fresh Chrome session completed by Nolan** → credential lands in isolated `~/.copilot-identities/identity_N` (0700) → `scripts/post-authorize.js:61-69`:
  ```js
  let identity = store.get(IDENTITY_ID) || createIdentity(IDENTITY_ID);  // :61
  markAuthorized(identity, { github_login });                            // :62 (fills login from live getAuthStatus(); sets status ACTIVE)
  ...
  store.put(identity);                                                   // :69
  ```
- This is **live issuance after human OAuth — not a registry, seed, or migration**. Grep for `identity_5|identity_6|piging87` across the broker hits only `state/identities.json`. No seed/migration path creates ACTIVE rows. (`broker.js:31-32` auto-creates only DISABLED rows for unknown ids at dispatch; `refresh-quota.mjs:16` creates rows only on successful quota observation.)
- **Timing note (honest ambiguity):** the `authorize-identity{5..10}.sh` scripts carry mtimes of Sep 18 17:07–17:16; the state rows carry quota-observation timestamps of today 2026-09-25 21:26–21:27Z. Whether the OAuth completions happened Sep 18 or today is not fully resolved from offline evidence. Established either way: human-OAuth provenance, ACTIVE status, fresh quota observed today, **zero dispatches ever** (`task_count: 0`, `last_success_at: null`).
- The prior inventory's "identity_5/identity_6" framing is now superseded: the live state file holds **identity_1 through identity_10**, all `status: ACTIVE`.

### 1b. Registry status (both copies checked)

Both `AGENT_PROFILES` copies authorize **exactly identity_1..identity_4** and fail closed on anything else:

| Copy | Entries | Fail-closed line |
|---|---|---|
| Local `~/workspace/orca-workstream-d/external_agent_adapter.js` | :125–152 → identity_1 (piging2), identity_2 (nolangese-sudo), identity_3 (piging1), identity_4 (piging86) | :173–175 `Unknown exterior agent` deny |
| Pig `/home/nolan/worktrees/orca-autonomy/ping-runtime/external-agent/external_agent_adapter.js` | :130–181 → same four, same logins | :255–257 same deny |

Header comment (both): *"four pre-authorized OAuth identities. Anything else fails closed."* The two copies are mutually consistent. **identity_5..10 are denied on the PING work-order path** — but see §1d: the broker itself never consults this registry.

### 1c. Quota state (verbatim, observed 2026-09-25)

```json
"identity_5": { "status": "ACTIVE", "quota_state": "OK", "quota_remaining": 200,
  "quota_reset_at": "2026-09-25T21:26:54.328Z", "last_quota_observed_at": "2026-09-25T21:26:56.056Z",
  "task_count": 0, "last_success_at": null, "last_failure_at": null,
  "consecutive_unknown_failures": 0, "github_login": "piging87" }
"identity_6": { "status": "ACTIVE", "quota_state": "OK", "quota_remaining": 200,
  "quota_reset_at": "2026-09-25T21:26:55.100Z", "last_quota_observed_at": "2026-09-25T21:26:56.831Z",
  "task_count": 0, "last_success_at": null, "last_failure_at": null,
  "consecutive_unknown_failures": 0, "github_login": "nolangesk-droid" }
```

Identities 7/9/10: identical shape (ACTIVE/OK/200, task_count 0; logins trishnikitha-art, nmgeske, piging3).
Identity_8 (hamstrunginsouciance-design): ACTIVE but `quota_state: "UNKNOWN"`, `quota_remaining: null` → **fail-closed by `quota-model.js:54-56`** (UNKNOWN → ineligible, "refresh required"). Not currently spendable.
For reference — identities 1–4: task_counts 13/10/1/2, last_success_at Sep 18 (see §3), quota refreshed today (remaining 174/177/187/177).

### 1d. Selectability: the dispatch() allowlist gap (PROVEN)

- `src/broker.js:40`: `const identity_id = task.identity_id || DEFAULT_IDENTITY_ID;` — **any string accepted**.
- `src/broker.js:52`: `getIdentity(identity_id)` — unknown ids auto-materialize as DISABLED rows (:31-33).
- `src/quota-model.js:49-70`: eligibility requires only `status` ∈ {ACTIVE, DEGRADED} + non-UNKNOWN/non-STALE quota with sufficient remaining. **No AGENT_PROFILES lookup exists anywhere in broker.js, cli-runner.js, or the dispatch path.** `createBroker` never imports the adapter.
- **Reached spend path (through the proven caller, §3):** `dispatch-task.js` → `dispatch({identity_id: "identity_5", ...})` → eligibility passes (ACTIVE + OK + 200) → `runCopilotTask` spawns `copilot -p …` with `COPILOT_HOME = resolveIdentityDir("identity_5")` (`src/identity-config.js`: identity_1→`~/.copilot`, others→`~/.copilot-identities/<id>`) → spends **piging87's real Copilot quota** → `recordOutcome` writes against identity_5's row. The PING work-order authorization layer is never consulted on this path.
- Nuance: the broker *library* treats `identity_id` as quota bookkeeping (it does not itself set COPILOT_HOME); the *harness* binds it to a credential dir. Through every existing invocation route, identity_5..10 are spendable today by anyone/anything that can run `dispatch-task.js` on the Pig.

### 1e. Per-identity verdicts

- **identity_5 (piging87): UNAUTHORIZED-SPENDABLE** — human-OAuth-authorized, ACTIVE/OK/200, absent from both registry copies, dispatch-selectable with no allowlist, `task_count: 0` (never spent).
- **identity_6 (nolangesk-droid): UNAUTHORIZED-SPENDABLE** — identical mechanics.
- **identity_7, 9, 10: UNAUTHORIZED-SPENDABLE** — identical mechanics.
- **identity_8: INERT-ROW** — ACTIVE but quota UNKNOWN → quota model fails closed; not spendable until a quota refresh succeeds.
- **identity_1..4: AUTHORIZED-ACTIVE** — in registry, in state, historical dispatches Sep 17–18 only.

---

## 2. Crush bypass verdict: DORMANT-BYPASS-CAPABLE (mechanism proven, no live spend)

### 2a. Exact invocation chain (file:line)

- `~/workspace/bin/prompt-crush.sh:13` → `pig_exec "wsl -u nolan -- bash /home/nolan/.local/bin/prompt-run crush $B64"`
- Pig `/home/nolan/.local/bin/prompt-run:17-20` (`crush)` branch):
  ```
  out=$(timeout 30 "$NB/crush" run -m copilot/gpt-4o-mini "$P" 2>&1); rc=$?
  ```
- Binary: `$NB/crush` → `@charmland/crush` bundle → bundled `bin/crush`. The bundle references `https://api.githubcopilot.com`; `~/.local/share/crush/providers.json` declares the `copilot` provider as `{id: "copilot", api_endpoint: "https://api.githubcopilot.com", type: "openai-compat"}`. **Crush is its own Copilot API client; it never shells out to the `copilot` CLI and never touches the broker.**

### 2b. Which account (structure only, no secrets)

`/home/nolan/.local/share/crush/crush.json` (0600, mtime 2026-09-18): `providers.copilot` has keys `["api_key", "oauth"]`; oauth has `["access_token", "expires_at", "expires_in", "refresh_token"]`. **No username/login field on disk.** Token field structure: `tid=<opaque>;exp=…;sku=free_limited_copilot;…`. **Timestamps (not secrets): `exp` = `expires_at` = 2026-09-19T12:06:14Z — EXPIRED.** Whether the refresh_token still works was not tested (credential use, prohibited). **GitHub login: UNDETERMINED from offline evidence** (cannot map to one of the broker's 10 logins without a metered API call).

### 2c. Is Crush spend visible to broker accounting? PROVEN NO

- Broker accounting lives only in `~/copilot-broker/state/identities.json`; the sole writer is `broker.js dispatch()` → `recordOutcome()` → `store.put()`. **Crush has no path to this file** (grep for `copilot-broker|quota-model|identities.json` across the crush package: zero true hits; reverse grep for `crush` in the broker: zero).
- Correlation attempt: **explicit non-correlation**. No Crush run matches any quota delta or `task_count` increment. Identities 5–10 have zero broker-mediated tasks and full quota.

### 2d. Live-spend evidence: NONE

No crush/copilot processes running at check time; copilot CLI logs last wrote Sep 23; no `prompt-crush` mentions in recent daily notes; Crush project data (`/tmp/.crush/crush.db`, mtime Sep 18 06:06) was deleted sometime before the check. **No evidence of any successful Crush run since ~Sep 18; stored credential expired Sep 19.**

### 2e. Verdict

**BYPASS-PLAUSIBLE, currently DORMANT.** The bypass mechanism is proven end to end (own client + own credential + zero broker contact + zero accounting visibility). A reached spend is NOT proven and currently looks impossible without credential refresh. If the credential is ever refreshed, Crush spend would be **entirely invisible** to the broker's quota model, per-identity state, and per-task ceilings.

---

## 3. Broker caller verdict: ONE CALLER — manual test harness, no production traffic

### 3a. The caller (PROVEN)

`/home/nolan/copilot-broker/dispatch-task.js` (Pig, created 2026-09-17 19:30) — a CLI harness: reads a task JSON, `createBroker({ store: loadStore() })` against the **live** `state/identities.json`, awaits `broker.dispatch(task)`, prints evidence JSON, optionally writes `task.report_path`. **This is the only production invocation of `dispatch()` in existence.**

### 3b. What the task_counts mean (PROVEN)

- `recordOutcome()` increments `task_count` **only on SUCCESS**. 13/10/1/2 = 26 successful dispatches + 3 recorded failures.
- Surviving artifact: `tasks/namespace-fix-2026-09-18.json` + `reports/namespace-fix-2026-09-18.json` (T2, identity_1, started 2026-09-18T11:42:09Z, TOOL_FAILURE "Blocked: worktree writes are denied in this session") — `completed_at` byte-identical to identity_1's `last_failure_at`. **This was identity_1's final recorded event.**
- Timeline (MDT): Sep 17 18:57 → identity_3 first; Sep 17 19:39 → identity_4 failure; Sep 17 19:42 → identity_2 last success; **Sep 18 05:44 → namespace-fix failure (identity_1). No dispatch since.** The 26 successes match the TEST-PLAN.md campaign window (single/two/concurrent-identity routing, quota independence) — **human-driven validation, not autonomous production traffic**.
- Today's Sep-25 21:26Z quota observations updated `quota_remaining`/`updated_at` for identities 2–10 while leaving `task_count`/`last_success_at` untouched — **proving zero dispatches since Sep 18** (quota refresh ≠ dispatch).

### 3c. Negative searches (all zero)

- No scheduler: Pig WSL `crontab -l` empty; `/etc/cron.d` system-only; user timers (`ping-mirror-sync`, `launchpadlib-cache-clean`, `ubuntu-insights-upload/collect`) none broker-related; Windows Task Scheduler: no Copilot-broker tasks.
- No code callers: `dispatch-task` across all of `~/workspace` code: zero. `copilot-broker` references outside the broker dir in `pig-fb/`, `orca-remediation/`, `orca-workstream-d/`, `bin/`: zero code (2 prose hits only). Absolute-path references to `/home/nolan/copilot-broker` from any other Pig script: zero (excluding broker dir, node_modules, .git, FYD worktrees, crx-swarm). `/home/nolan/projects/ping` and `/home/nolan/worktrees/orca-autonomy`: zero.
- Test files (`test/*.test.js` both copies) use temp-dir stores + mock runners — proven no live effect.
- `external_agent_adapter.js` identity_1..4 entries are **declarative labels only** (`transport: 'broker-dispatch'` prose) — verified: no spawn/exec of the broker anywhere in that file.

### 3d. Proven caller chain (single path)

`dispatch-task.js` (human/agent CLI) → `createBroker({store: loadStore()})` → `dispatch(task)`: `classify` → `assertTier` → `usesCopilot` gate → `getIdentity(identity_id)` [default identity_1] → `isEligible` (quota-model, fail-closed) → `creditCeiling` → `buildChildEnv` (credential-boundary: scrubs token material) → `runCopilotTask` (cli-runner.js): `spawn('copilot', ['-p', prompt, '--output-format','json','--max-ai-credits',N,'--allow-all-tools'], {cwd: workdir, env+COPILOT_HOME=resolveIdentityDir(identity_id)})` → `classifyStream` (jsonl-classifier) → `recordOutcome` (SUCCESS→task_count+=1; TOOL_FAILURE/UNKNOWN→failure counters, DEGRADED→QUARANTINED at 3) → atomic `store.put` → evidence record (`assertNoTokenMaterial`).

### 3e. Drift notes (hygiene, not security)

- **Live = Pig `/home/nolan/copilot-broker`.** 9 shared files byte-identical (md5) with `~/workspace/pig-fb/copilot-broker`. Pig-only, uncommitted: `dispatch-task.js`, `refresh-quota.mjs`, `src/identity-config.js`, `src/quota-observer.js`, `scripts/authorize-identity2..10.sh`, `TEST-PLAN.md`, `docs/`, `state/`, `tasks/`, `reports/`. Local-only: `src/sdk-probe.js`, `src/fresh-oauth-session.js`, `scripts/deploy-to-pig.sh`, extra tests. `deploy-to-pig.sh` says local is canonical; Pig-side additions bypassed it.
- The Sep-25 16:49 `--allow-all-tools` patch to `cli-runner.js` re-enables real dispatches (root-causes the Sep-18 permission-denial failure). **No dispatches have occurred since the patch.**

---

## 4. Minimal usage-accounting observation (UNKNOWN > invented)

| Provider | Task/run | Model | Measured usage | Reported cost/quota |
|---|---|---|---|---|
| Copilot broker | 26 successes + 3 failures, Sep 17–18, identities 1–4 | copilot CLI default (per run) | `actual_reported_usage` from stream events where present (null when stream reports none) | `quota_remaining` per identity via SDK `account.getQuota` (metadata RPC, not spend); cost model is ESTIMATE (T2=25/T3=100/T4=400 AI credits) vs observed unit `chat_requests` — unit drift unaddressed |
| Crush | none since ~Sep 18 | copilot/gpt-4o-mini | UNKNOWN (no counters, no logs) | UNKNOWN (own expired credential; login undetermined) |
| identities 5–10 | 0 tasks | — | none | quota_remaining=200 observed today (metadata, not spend) |
| All other providers (Hermes, Ollama, Goose, OpenCode, Codex, Gemini, Qwen, cloud subagents, Meta AI) | per prior inventory | — | UNKNOWN (no counters anywhere) | UNKNOWN |

---

## 5. Ranked containment list (narrowest seam first)

1. **Broker dispatch() has no identity allowlist (identity_5..10 + any future identity_N spendable without registry authorization).** Narrowest seam: fail-closed allowlist check inside `dispatch()` against the authorized identity set (single choke point; `broker.js:40` is the exact line). ALTERNATIVE (coordinator decision, not investigator's): promote 5–10 into AGENT_PROFILES — they are Nolan's own human-OAuth identities, so this is an authorization-story hole, not an attacker foothold. Either way the registry and the broker must agree. **Status: reachable path, zero spend — recommend containment, not incident response.**
2. **Crush bypass capability (dormant).** If its credential is ever refreshed, spend is invisible to all broker accounting. Narrowest seam: route `prompt-run crush` through `broker.dispatch()` as a registered identity (gains ceilings + accounting), or retire the crush provider slot. **Status: dormant — monitor; do not patch a non-running path.**
3. **Registry ↔ broker drift (AGENT_PROFILES 1–4 vs live state 1–10).** Resolved by whichever option in (1) the coordinator takes. Do not "fix" by editing only one side.
4. **Pig-only broker drift** (`dispatch-task.js`, `quota-observer.js`, authorize scripts uncommitted). Hygiene: sync or document; the next deploy must not clobber the live state/identity dirs.
5. **Quota unit drift** (`chat_requests` observed vs AI-credit cost model). Accounting correctness; eligibility compares mismatched units. Not a live hole.

**NOT recommended:** patching the registry merely because identity_5/6 names exist; inferring vulnerability from quota rows alone (now disproven as the method — callability was traced instead); building a provider-wide usage/cancellation framework (rank by user impact per the directive).

## 6. What would change these verdicts

- A `task_count > 0` or non-null `last_success_at` on identity_5..10 → reclassify to UNAUTHORIZED-SPENT, incident.
- A successful Crush run with a valid credential → reclassify to BYPASS-ACTIVE, contain per (2).
- Any new caller of `dispatch()` outside `dispatch-task.js` → re-run Track C.
- `identity_8` quota refresh succeeding → reclassify from INERT-ROW to UNAUTHORIZED-SPENDABLE.

---
*All evidence read-only. No quota spent, no credentials accessed or printed, no code changed, FYD worktrees and ports 3100–3105 untouched.*

---

## 7. Update 2026-09-26: fail-closed allowlist PATCHED (Nolan-directed)

**Patch:** `src/broker.js` — added `AUTHORIZED_IDENTITY_IDS` (identity_1..4, mirroring AGENT_PROFILES) and a gate in `dispatch()` that returns `{route:'blocked', reason:'identity_not_authorized'}` before any Copilot invocation for unregistered identities. Denial logged via console.error without secrets. T0/T1 local path unaffected (no spend, no gate needed).

**Tests:** 3 new tests in `test/broker.test.js` (8/8 pass):
- identity_5 denied: blocked, runner never called, no state row created
- unknown identity_99 denied (fail closed on unregistered ids)
- identity_1..4 still dispatch normally

**Live verification:** `dispatch({identity_id:'identity_5', tier:'T2'})` → blocked, `invoked_copilot:false`, denial logged. The reached spend path for identity_5..10 is now closed at the broker choke point.

**Remaining:** the pre-existing `test/quota-parser.test.js` failure (stale `parseQuotaSnapshot` import) is unrelated to this patch.

**Revised verdicts:**
- identity_5/6/7/9/10: was UNAUTHORIZED-SPENDABLE → now **DENIED-AT-BROKER** (dispatch fails closed; credential dirs still exist but are unreachable via the broker)
- identity_8: INERT-ROW (unchanged)
- Crush: DORMANT-BYPASS-CAPABLE (unchanged; credential still expired 2026-09-19)
