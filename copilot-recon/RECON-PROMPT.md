# COPILOT HEADLESS ENVIRONMENT RECON — consolidated prompt (2026-09-17)

## Objective

READ-ONLY environment reconnaissance to build the foundation for a headless
GitHub/Copilot multi-identity execution surface. Intended architecture:

Muse -> PING/task authority -> Copilot Task Router -> Identity Broker
  -> Git Credential Manager / authorized GitHub identities
  -> Copilot CLI or SDK -> isolated worktree
  -> result / diff / tests / evidence -> Muse + PING evaluation

The human authorizes legitimate GitHub/Copilot accounts once in a browser.
Afterwards Muse selects an already-authorized identity headlessly and fails
over to another independently authorized identity when the current one hits a
legitimate quota/rate-limit condition.

## Hard policy boundary (violating any item is a critical failure)

RECONNAISSANCE ONLY. Do NOT:
- create accounts, evade GitHub restrictions, manufacture identities,
  bypass quotas, or circumvent authentication
- modify files, Git config, Windows config, or Credential Manager contents
- add, remove, or switch GitHub accounts
- authenticate anything or open any authorization flow
- consume Copilot quota or run any model-invoking Copilot task
- create repositories, push, or modify PING or Muse
- install or uninstall packages, or change environment variables
- print secrets, tokens, cookies, or credential contents

Allowed: inspection of versions, paths, configuration metadata, executable
availability, environment variable NAMES (never values), and non-secret state.
If anything unexpected is discovered, stop and report rather than improvising.

## Report sections (return exactly this header, then 16 numbered sections)

COPILOT HEADLESS ENVIRONMENT RECON STATUS: PASS / BLOCKED / PARTIAL

1. Machine map (OS, build, PowerShell, Git, WSL, Node, Docker versions/paths)
2. Git Credential Manager (version, credential.helper, credential store backend,
   multi-user/multi-account primitives it exposes)
3. GitHub Desktop (version, bundled Git, account state metadata only)
4. GitHub CLI (presence, version; account-status metadata only, no auth changes)
5. Copilot CLI (presence, version, `copilot --help` surface: does it list
   multiple stored accounts, explicit account selection, --max-ai-credits,
   non-interactive flags, machine-readable output flags)
6. Copilot SDK (presence, version, package location; does its API surface
   expose account.getQuota, model listing, model/token pricing or billing
   multipliers, per-session identity selection — signatures only, no calls
   that consume quota)
7. Environment variable NAMES only (any COPILOT/GITHUB/GH_/COPILOT_ names;
   never values)
8. Windows credential store (which backends exist; which one GCM is using;
   no secret reads)
9. WSL/Windows boundary (what crosses: \\wsl$\ reachability, interop paths)
10. Headless execution feasibility (can a non-interactive process invoke the
    CLI/SDK; what breaks without a TTY)
11. Multi-identity feasibility (how many distinct authorized identities are
    visible; how the CLI/SDK selects among them)
12. Quota/failure signal taxonomy: for each of EXHAUSTED, RATE_LIMITED,
    AUTH_FAILED, TEMPORARY_FAILURE, POLICY_BLOCKED, TOOL_FAILURE — what does
    the CLI/SDK emit (exit codes, stderr strings, JSON fields), observed from
    documentation/help text only, never by triggering the condition
13. Existing Muse execution surface (what Muse can already invoke headless
    in WSL today)
14. Security review (where credentials would have to live; process-boundary
    options; what must never enter logs or persisted results)
15. Entitlement model determination (see ADDENDUM below — this is the new core)
16. Recommendation: smallest safe implementation that is feasible with the
    exact installed versions, plus what is BLOCKED and why

## ADDENDUM — Team Copilot Entitlement Recon (2026-09-17, Nolan's directive)

This is a TEAM execution environment. Multiple legitimate collaborators/agents
may each have their own GitHub/Copilot identity and entitlement. Muse acts on
behalf of the team and should eventually select among identities already
legitimately authorized on the machine.

The objective is NOT to create accounts or circumvent GitHub restrictions.
The objective IS: authorized team identity A/B/C -> Identity Broker ->
Copilot Task Router -> best currently eligible identity -> Copilot execution.
When an identity reaches its actual usage/credit limit it becomes temporarily
ineligible and the router selects another legitimately authorized identity.

### Billing correction (do NOT assume a 31-day cooldown)

Current GitHub documentation: current individual plans use AI credits; included
allowances reset at 00:00 UTC on the first day of the calendar month. Legacy
premium-request billing still exists for certain annual plans. Investigate the
ACTUAL entitlement/reset behavior per discovered identity; never hard-code a
31-day timer.

### Recon must determine (read-only, no quota consumed)

For each already-authorized Copilot identity, if safely discoverable:
- account identity, Copilot plan type, org/team association if applicable
- current entitlement mechanism (AI credits vs legacy premium requests)
- whether quota/AI-credit info is queryable programmatically
- whether account.getQuota is available in the installed SDK/version
- quota reset info if exposed
- available models; model billing/multiplier info if exposed

SDK capabilities (signatures/help/docs only):
- current account quota, remaining entitlement, model/token pricing,
  billing multiplier, per-session token/identity selection

CLI capabilities (`--help` surface only):
- multiple stored accounts, explicit account selection, task-scoped
  environment authentication, non-interactive execution, per-task AI-credit
  limits (--max-ai-credits), machine-readable results

Representation question — determine from evidence, do NOT assume:
A. several legitimate individual Copilot identities
B. an organization with assigned Copilot seats
C. a combination of both

### Architectural targets the recon informs (do NOT implement)

- Task classifier tiers: T0 deterministic (grep/AST/LSP/format/mechanical),
  T1 local model or deterministic worker, T2 efficient Copilot (docs, tests,
  straightforward implementation, small fixes), T3 standard Copilot
  (multi-file, debugging, refactors), T4 premium reasoning (hard debugging,
  large-context synthesis, complex implementation)
- Model selection dynamic: broker asks Copilot what models/pricing are
  available at runtime; never hard-code model names
- Predictive eligibility: eligible iff
  quota_remaining >= estimated_task_cost + safety_reserve; refresh entitlement
  when now >= quota_reset_at (reset timestamp from GitHub, not assumption)
- Credential at process boundary only: broker passes identity_id; the
  credential provider injects a short-lived credential into the child process
  environment; the credential never enters the broker's data model, logs, or
  persisted ExecutionResult
- Identity state (future): quota_state, quota_remaining, quota_reset_at,
  last_quota_observed_at, last_success_at, last_failure_at

NO MUTATIONS. NO ACCOUNT SWITCHING. NO LOGIN. NO COPILOT INVOCATION.
NO QUOTA CONSUMPTION. NO INSTALLATION.

## Already-known partial findings (do not redo; build on these)

- Windows 10 Pro 25H2 build 26200.9457; PowerShell 5.1.26100.9444
- Git 2.54.0.windows.1 at C:\Program Files\Git\cmd\git.exe; Git Bash present
- WSL 2.7.3.0, Ubuntu + docker-desktop running; git/node/npm/python3 callable
  in Ubuntu; gh and copilot absent there; \\wsl$\Ubuntu reachable
- Docker 29.5.3; Node v22.22.3 (via Hermes); npm invocation failed in one
  PowerShell pass (global npm-package check for Copilot SDK inconclusive)
- GitHub Desktop 3.6.3 installed, was not running; bundled Git present
- GitHub CLI (gh) absent on Windows -> no account-status metadata obtained
- Git Credential Manager 2.7.3; system git config credential.helper=manager;
  active credential-store backend NOT yet proven; multi-user capability
  analysis NOT yet complete
- No `copilot` CLI found on Windows or WSL; consumer Microsoft Copilot app
  present (not evidence of CLI); no Copilot SDK found in inspected Python or
  editor-extension locations
- No COPILOT/GITHUB/GH_ environment variable names in current process env
  (observation of that process only, not a credential test)
- Global git username observed: trishnikitha-art (identity metadata, not auth)
