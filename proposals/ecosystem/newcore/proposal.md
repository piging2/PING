# Harvest Proposal: NewCore — Agent Identity as First-Class Identity

**Worker:** harvest worker (leaf), 2026-10-02
**Target kernels:** capability-kernel (primary) with boundary into trust-kernel
**Verdict:** ADAPT (take the mechanism, rewrite to PING semantics — clean-room re-derivation; no NewCore code exists in the open and none is copied)

---

## 1. What I read (primary sources only)

NewCore (the company: NewCore, founded by Zohar Alon / Amihai Neiderman / Erez Yarkoni, emerged from stealth 2026-06-15 with $66M from Cyberstarts, Index Ventures, Evolution Equity Partners) is a **closed-source commercial identity platform**. There is no public repository, no developer docs portal, no published policy grammar. Everything below is therefore **re-derived clean-room from the mechanism described in official materials**. No proprietary code was copied because none is available.

| # | Source | Type | Date read | What it contributed |
|---|--------|------|-----------|---------------------|
| 1 | https://newcore.com/resources/agentic-governance-solution-brief ("Agentic Governance Solution Brief", official) | Official docs (solution brief) | 2026-10-02, read in full via browser_open | The complete mechanism: one governed registry for agents+people; explicit bounded authority; Agent Guardian runtime enforcement; allow/ask/deny per tool with default-deny; short-lived task-scoped brokering; one Event Log (agent, owner, policy, tool, action, approval); centralized revocation at agent or session level; 6-stage pipeline Register→Connect→Broker→Authorize→Audit→Cut |
| 2 | https://techcrunch.com/2026/06/15/ai-agents-are-becoming-employees-newcore-emerges-with-66m-to-give-them-identities/ | Press (CEO quotes) | 2026-10-02, search result | First-class agent identities with own permissions, lifecycle controls, revocation mechanisms; split-key architecture (key material divided between customer and platform); Agentic Skill for Claude Code/Codex/Cursor; mobile app for human grant/review/revoke |
| 3 | https://www.vcaonline.com/news/2026061502/newcore-emerges-from-stealth-with-66m-to-rebuild-workforce-identity-for-the-agentic-era/ | Press (company statement) | 2026-10-02, search result | First-class agent identities with own lifecycle, trust scoring, revocation path; Secure Split Key closes Golden SAML / session-theft / token-replay classes; VisualMFA + hardware-bound credentials |
| 4 | https://pulse2.com/newcore-66-million-raised-to-build-identity-platform-for-the-agentic-era/ | Press | 2026-10-02, search result | Single architecture for human+agentic identities; agent lifecycle management; continuous discovery of shadow accounts/orphaned credentials/ungoverned agents |
| 5 | https://coderlegion.com/27203/newcore-wants-to-kill-the-service-account-and-make-every-ai-agent-answer-for-what-it-does | Interview (CEO) | 2026-10-02, search result | Sub-agent delegation chains make accountability harder ("if that chain breaks, it falls on the CEO"); proposed control: agent past a duration must check back in with a human; agents have "a lifespan that's closer to a human than to the service account" |

Also inspected for PING-side comparison: `~/workspace/constitutional-sprint/identity/` (PING's `IIdentityAuthority` / `CanonicalIdentityService` — deterministic UUIDv5 ID generation across context/witness/certificate/audit/lease/span/event/replay/envelope/mission/epic/task namespaces) and the standing law in `~/AGENTS.md` ("capabilities answer WHO may do WHAT to WHICH OBJECT under WHAT CONSTRAINTS for HOW LONG with WHAT APPROVAL"; `holds.json` machine-readable owner holds).

**SOURCE_SHA:** `sha256:dc6c8cef6af243afe264b8ef26e83576dcea869346b7e1836a942e46efc72fff` — SHA-256 over the concatenated verbatim excerpts from inputs 1–5 above (assembled 2026-10-02 into the worker's source-input record; inputs listed in full in this proposal).

---

## 2. The mechanism, clean-room re-derived

### 2.1 Core model

**An agent is a principal, not a credential.** One registry holds three principal kinds — human, agent, service/machine — under a single policy grammar. The agent principal is:

- **known**: registered with a stable identity record before it ever acts;
- **accountable**: bound at registration (Connect) to an accountable human or team (the owner) who can be reached for approval and escalation;
- **policy-scoped**: authority is explicit and bounded by one of two ceilings, never inherited wholesale:
  - (a) agent drawing authority from a live user session **cannot exceed that user's permissions** (delegation ceiling), or
  - (b) agent operating independently runs under a **scoped, time-bound policy ceiling**;
- **revocable**: access can be cut centrally at the **agent level** (kill the principal) or the **session level** (kill one session / delegation subtree), without touching the owner's other agents.

**One policy grammar for humans and agents** (from the official brief, control 1):

```
policy(principal, system, tool) -> allow | ask | deny
default: deny                                   # "Anything not listed is denied."
ask: route the exact request {agent, action, resource, scope, risk}
     to the accountable owner's channel; approve / deny / expire
     within a bounded window; approval applies ONLY to that request.
```

`ask` is a first-class effect, distinct from allow and deny: it suspends the call, binds a human decision to exactly one request, and lets lower-risk activity continue under policy. "No agent can approve its own elevation" — approval authority is structurally separate from execution authority.

### 2.2 Object model (re-derived, PING-flavored)

```ts
// Principal: the identity record. Kind distinguishes humans from agents.
Principal {
  principal_id:   string   // "prn:<kind>:<stable-name>" e.g. "prn:agent:harvest-worker-07"
  kind:           "human" | "agent" | "service"
  display_name:   string
  owner_id:       string   // principal_id of accountable human/team; for agents: REQUIRED
  state:          "provisioned" | "active" | "suspended" | "revoked"   // + tombstone (below)
  policy_ceiling: PolicyRef   // scoped, time-bound; or delegation ref to a live session
  created_at, updated_at: string  // canonical timestamps
}

// Delegation: the verifiable "acting for whom" chain. THIS is the smallest primitive.
Delegation {
  delegation_id:  string   // "dlg:<hash>"
  subject_id:     string   // on whose behalf (human principal, or parent agent)
  actor_id:       string   // which agent is acting
  parent_id:      string | null  // forming the chain: subject->actor->(sub-actor...)
  scope:          { systems: string[], tools: string[], constraints: Constraint[] }
  not_before, not_after: string   // short-lived; task-scoped
  digest:         string   // canonical-bytes digest of this record (trust-kernel)
}

// Credential: never standing. Minted on demand, bound to one delegation.
SessionCredential {
  credential_id:  string
  delegation_id:  string   // the delegation it instantiates
  expires_at:     string   // minutes, not days
  revoked:        boolean
  // The agent NEVER receives the downstream system's standing credential.
}

// Decision: one Event Log row per governed call (the audit spine).
AuthDecision {
  decision_id:    string
  agent_id, owner_id: string
  policy_ref:     string   // which policy version allowed it
  tool, action, resource, scope: ...
  effect:         "allow" | "ask" | "deny"
  approval:       { approver_id, decision, at } | null  // ask-effect only; binds to THIS request
  at:             string
}

// PolicyRule (the single grammar):
PolicyRule {
  rule_id: string
  principal: string | "group:<name>"   // people, groups, agents — same field
  system, tool: string
  effect: "allow" | "ask" | "deny"
  constraints: Constraint[]            // time windows, risk bands, rate caps
  version: number                       // policy changes are versioned; decisions cite the version
}
```

### 2.3 ID scheme

`prn:<kind>:<stable-name>` for principals (human-readable, stable across key rotation — identity is the record, not the key); `dlg:<hex16>` (first 16 hex chars of the canonical-bytes digest) for delegations so the ID is self-verifying against the record; `cred:<hex16>` likewise. Key rotation never changes `principal_id`. Tombstones keep `principal_id` reserved forever (no re-registration under a revoked name — closes the "shadow re-provision" hole).

### 2.4 State transitions

**Principal lifecycle:**
`provisioned → active ⇄ suspended → revoked → tombstoned`
- `provisioned → active`: registration completes (owner bound, initial policy ceiling set).
- `active ⇄ suspended`: temporary freeze (e.g. anomaly, pending owner review); suspended agents' delegations stop minting, in-flight sessions keep running unless also cut.
- `active|suspended → revoked`: owner or authority revokes. Terminal for authority; record retained.
- `revoked → tombstoned`: after retention window, key material destroyed, record reduced to `{principal_id, revoked_at, reason}` — still blocks re-registration.

**Delegation/session lifecycle:**
`minted → active → expired | revoked | consumed`
- Minting checks: actor principal `active`, subject's ceiling covers scope, parent delegation (if any) `active` and unexpired.
- `expired`: TTL passes; in-flight call completes, no new calls. (Short TTLs make revocation cheap — NewCore's whole revocation story leans on this.)
- `revoked`: cascade (see §7).

**Policy lifecycle:** rules are versioned, append-only; a decision cites `policy_version`. Policy "change" = new version; old decisions remain explainable.

### 2.5 Authority boundary

| Decides | Owner |
|---|---|
| Principal IDs exist, are unique, are never re-minted; key→principal binding; digest verification of delegation records | trust-kernel + identity mint (extends PING's IdentityAuthority, which today only generates deterministic IDs) |
| allow/ask/deny evaluation per call; constraint checking; approval routing; revocation cascade | capability-kernel (this harvest's AUTHORITY_OWNER) |
| Every AuthDecision appended, ordered, replayable | event-kernel |
| Human approval of an `ask` (approve/deny/expire, one request only) | proposal-kernel semantics (approval binding) — the `ask` effect IS a micro-proposal |

The critical NewCore boundary insight: **the signer of identity assertions must not be the runner of agents.** Split-key (customer half + platform half) means no single compromised party can mint agent authority. PING analogue: mission-effect/verifier signing authority must be separated from WorkerRuntime execution. (For piging2 now: threshold is aspirational; the enforceable part is that the identity-minting key is never reachable from worker code paths.)

### 2.6 Persistence semantics

- Principals, delegations, policy versions, auth decisions: **append-only event log** (event-kernel). Current state (principal state, delegation active/revoked) is a **projection** — rebuildable, never hand-edited.
- Tombstones are permanent; retention window before tombstoning is policy (e.g. 90d), key destruction at tombstone time.
- Policy decisions must be explainable after the fact: each decision row cites `{principal_id, delegation_id, policy_ref+version, owner_id}` — the full "who acted, under whose authority, what policy allowed it."

### 2.7 Evidence / receipts

One Event Log row per governed call: `{agent, accountable owner/team, policy (+version), tool, action, approval decision}`. For piging2, every AuthDecision carries a digest over canonical bytes (trust-kernel), making the log tamper-evident. This directly serves proofs 3 (deterministic evidence-backed graphs — decisions are evidence nodes), 11 (injected bad result rejected — the verifier re-checks delegation+scope), 13 (VERIFIED only after independent verification — verification includes "was this result produced under a live, in-scope delegation?"), and 14 (replay — the decision log is part of replayable state).

### 2.8 Retries / failures

- Broker (credential minting) is **idempotent on `(delegation_id)`**: re-mint after an uncertain result returns the same credential record, never a second live credential (prevents credential duplication on retry).
- `ask` approvals are **exactly-once per request**: approve/deny/expire transitions are terminal; a duplicate approval callback for an already-decided request is a no-op that returns the recorded decision (no double-execution).
- Evaluation itself is pure/deterministic: same `(principal state, delegation, policy version, call)` → same effect. Safe to retry evaluation; only effects (mint, approve, cut) go through the idempotency guards.
- Failure mode discipline: evaluation failure (policy store unreachable, digest mismatch) → **deny** (fail closed). Never fail open.

### 2.9 Revocation model (the strongest part of the mechanism)

- **Centralized cut at two granularities**: agent level (revoke principal → all its delegations, sessions, and descendant sub-agent delegations die) or session level (revoke one delegation subtree).
- **Cascade is downward and total**: revoking a delegation revokes all child delegations (parent_id chain). Revoking a principal revokes its delegations. A revoked principal's sessions cannot mint new credentials; in-flight governed calls are denied at the next evaluation (short TTLs bound the tail — this is WHY credentials are short-lived).
- **Revocation never restores**: re-activating a principal does not resurrect old sessions/delegations/approvals (matches the "removal/regrant does not restore old sessions" invariant seen in comparable designs). Fresh delegation required.
- **Kill-switch latency budget**: because credentials are minutes-TTL and every governed call re-evaluates, worst-case exposure after cut ≈ one TTL. No standing credentials to downstream systems means there is nothing to hunt down and rotate out-of-band.

### 2.10 Tests (behavioral, to be written on ADAPT)

1. Agent principal cannot act before registration (unknown `actor_id` → deny).
2. Agent with delegation ceiling cannot exceed subject's permissions (attempt above ceiling → deny, logged).
3. `ask`-effect: sensitive call suspends, exact request `{agent, action, resource, scope, risk}` reaches owner channel; approve → that request only executes; deny/expire → denied; subsequent identical call re-asks (approval does not generalize).
4. No self-elevation: an agent's approval of its own scope change is rejected (approver must differ from actor).
5. Unlisted tool → deny (default-deny).
6. Revocation cascade: revoke parent delegation → child sub-agent delegation denied at next call; revoke principal → all sessions dead within TTL.
7. Re-mint idempotency: same `delegation_id` minted twice → one credential record.
8. Duplicate approval callback → returns recorded decision, no second execution.
9. Tombstone: revoked name cannot be re-registered.
10. Replay: from the event log alone, reconstruct "which agent acted under whose authority under which policy version" for any historical decision (proof 14 support).
11. Evaluation failure (policy store down) → deny, logged as `effect: deny, reason: fail-closed`.
12. Adversarial: token with tampered scope digest → signature/digest check fails → deny; agent presenting another agent's delegation → actor mismatch → deny.

### 2.11 Comparison against PING's existing semantics

| Concern | PING today | NewCore mechanism adds |
|---|---|---|
| Identity | `IIdentityAuthority`: deterministic UUIDv5 **ID generation** across namespaces (mission, task, witness, event…). Identity = identifier provenance. | Identity = **principal record** with kind (human/agent/service), owner binding, lifecycle states. Agents are principals, not just execution IDs. |
| Actor in capability eval | Standing law: capabilities answer "WHO may do WHAT to WHICH OBJECT under WHAT CONSTRAINTS for HOW LONG with WHAT APPROVAL". Owner holds in `holds.json` (fail-closed). Engagement guard: ELIGIBLE/INELIGIBLE/UNKNOWN. | The **actor is a governed lifecycle object**: registered, owner-bound, scoped, time-bound, revocable at agent or session level. PING's WHO is a string; NewCore's WHO is a revocable identity with a delegation chain back to an accountable human. |
| Delegation | ORCA: scheduler dispatches workers; "worker claim != verified truth". No cross-hop "acting for whom" token. | **Verifiable delegation chain**: every agent action provably traces subject→actor→sub-actor with scope+expiry, offline-verifiable, cascade-revocable. |
| Policy grammar | Engagement guard: deterministic eligibility, allow/deny-ish outcomes, owner holds. | **One grammar, three effects** (`allow`/`ask`/`deny`), default-deny, assigned uniformly to people/groups/agents; `ask` = bounded human approval bound to exactly one request. |
| Credentials | n/a (PING-internal) | **No standing credentials**: short-lived, task-scoped, brokered per delegation; the agent never holds the downstream system's credential. |
| Audit | Intent ledger, event spine, AuthDecision-like records in places. | **One Event Log per governed call**: agent + owner + policy(+version) + tool + action + approval decision — the "no single record" problem stated as the core gap. |

---

## 3. SMALLEST MISSING PRIMITIVE

**The verifiable delegation assertion** — one record type binding `{subject (on whose behalf), actor (which agent), scope, expiry, parent}` into a chain rooted at an accountable owner, whose revocation cascades down the chain, and which every worker effect must carry.

PING already has: deterministic IDs, capability evaluation, owner holds, proposal/approval binding, an event spine, and the proven "worker claim != verified truth" epistemic gate. What it does **not** have is a first-class answer to *"which agent acted, under whose authority, and what policy allowed it"* that survives across hops: today a worker's authority is ambient (it was dispatched by the scheduler), unscoped beyond the mission payload, and unrevocable except by killing the mission. The delegation assertion is the smallest unit that fixes this — everything else (principal registry UI, mobile approvals, split-key threshold signing, trust scoring) is product surface or later hardening.

Concretely for proofs 9–14: mission creation (9) mints a delegation `Nolan → orchestrator → worker` with scope = the mission's capability set and TTL = the mission budget; the worker's result (10) carries its delegation digest; the verifier (11, 13) checks delegation liveness + scope before accepting; fallback attempts (12) mint sibling delegations so attempt identity is distinguishable; replay (14) re-derives the authority chain from the event log.

---

## 4. Verdict: ADAPT (with reason)

**ADAPT** — take the mechanism, rewrite to PING semantics, clean-room.

- **Not ADOPT**: there is nothing to adopt. NewCore is closed-source commercial SaaS; no repository, no published code, no license under which code could be taken. Adopting would mean buying the product, which is out of scope for the harvest.
- **Not REJECT**: the mechanism is genuinely valuable and maps to a real gap. The "agent as first-class principal with verifiable delegation chain and cascade revocation" is exactly the identity-side primitive proofs 9–14 need, and PING's current identity authority (ID generation) does not cover it. The policy grammar's `ask` effect also sharpens the proposal-kernel's approval binding (approval bound to exactly one request, bounded window).
- **ADAPT because**: PING's authority topology differs — identity minting belongs with the existing IdentityAuthority + trust-kernel (canonical bytes, digests), evaluation belongs in capability-kernel, decisions belong on the event spine. A clean-room TypeScript module (~300–400 lines, zero dependencies beyond node:crypto) implementing Principal + Delegation + PolicyRule + AuthDecision with the 12 tests above captures the full value without importing any NewCore surface (no mobile app, no VisualMFA, no split-key infrastructure — those are product, not primitive).

---

## 5. Dependency analysis

**Zero dependencies.** The adapted module needs only deterministic canonicalization + SHA-256 (node:crypto, already in the trust-kernel's remit) and the event-kernel's append primitive. Every line is clean-room written for piging2. Rejected as out-of-scope product surface: mobile approval app, VisualMFA/hardware-bound credentials, split-key threshold infrastructure, trust scoring, continuous shadow-identity discovery, agent-driven migration tooling.

`DEPENDENCY_COST: zero`

---

## 6. License finding

- **NewCore platform: closed-source commercial.** No public license, no source available, nothing to take. **No code was copied; the mechanism is re-derived from behavioral descriptions in official materials.** This must stay that way — the ADAPT implementation must be written fresh, never reconstructed from any NewCore artifact beyond the public descriptions cited.
- **No GPL/copyleft/SSPL/BSL material involved.** Inputs 1–5 are official docs and press/interview text used as behavioral references only (facts about the mechanism, not code).
- **FLAG for Nolan (informational, not a blocker):** if PING ever wants the actual product (managed agent identities, mobile human-oversight layer, split-key SaaS), that is a **procurement** decision with NewCore the vendor, not a harvest. The harvest delivers only the clean-room primitive.

---

## 7. Proof mapping

| proof_id | How the adapted primitive serves it |
|---|---|
| 9 (create one mission) | Mission creation mints the root delegation `owner → orchestrator` with scoped, time-bound ceiling — authority is explicit before any worker runs |
| 10 (worker returns result) | Result envelope carries the worker's delegation digest; authorship is attributable to a registered agent principal, not an ambient execution ID |
| 11 (injected bad result rejected) | Verifier checks delegation liveness + scope + digest; a result with tampered scope or dead delegation fails closed |
| 12 (fallback attempt succeeds) | Fallback attempt mints a sibling delegation (distinguishable attempt identity); parent mission delegation stays the accountability root |
| 13 (VERIFIED only after independent verification) | Verification includes the authority check (was this produced under a live, in-scope delegation by a registered agent?) alongside the epistemic check |
| 14 (replay reconstructs state) | The AuthDecision event log replays "who acted, under whose authority, under which policy version" — authority history is part of reconstructed state |

Proofs 1–8 (FYD website→evidence→objects→SiteSpec→render→Ask→owner-correct→regenerate) do not require this primitive; it is **mission-loop (9–14) infrastructure**, owned by capability-kernel.
