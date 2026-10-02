MEMORY.md

<!-- Curated long-term memory. Keep durable business facts, preferences, and commitments here. Keep day-to-day execution details in daily notes. -->

Business

* User’s name: Nolan Geske, goes by Nolan.
* Runs PING Social, currently without an LLC.
* PING Social is an AI concierge and business automation consultancy for home service businesses.
* Primary market (2026-09-09, Nolan's call): Western Colorado first, expanding outward from there. Denver-area outreach is deprioritized.
* Uses Quo as the communications and phone platform.
* PING Social’s role is consultative: understand each business’s workflow and recommend AI services that solve its actual problems rather than selling a one-size-fits-all package.

Business Positioning

* PING Social helps home service businesses capture more opportunities, reduce administrative work, respond faster, and operate more consistently.
* The core value proposition is less busywork and fewer missed opportunities while keeping the business owner and skilled worker in control.
* Technology should strengthen the worker and owner, not replace their judgment.
* AI should handle repetitive communication, organization, follow-up, and administrative work so people can focus on customers, jobs, and decisions that require human judgment.
* Position PING Social around practical business outcomes, not AI hype.
* Keep pitches brief, conversational, direct, and credible.
* Never oversell or make AI sound like a replacement for the trade professional.
* PING Social is new and eager to help local companies adopt AI; frame early engagements as a limited-time trial while the service is being developed and refined.
* Market PING Social itself more aggressively (2026-09-11, Nolan's call): he is setting up Google Workspace and will build a PING Social website soon. Blue collar businesses are the explicit target market.
* Website revamp angle (2026-09-11, Nolan's call): propose a website revamp ONLY for very non-technical owners with weak websites. Nolan can build professional custom websites (TenantOS pipeline) and specializes in backend microservices infrastructure. Portfolio proof asset: https://happy-place-platform.vercel.app/ (may be cited in revamp pitches).

Customer Focus

* Prioritize businesses where missed calls, slow follow-up, scheduling friction, repetitive customer communication, lead management, or administrative workload create measurable business pain.
* Favor solutions that can realistically save time, capture revenue, improve customer experience, or make operations easier to manage.
* Recommend automation based on the customer’s existing workflow and needs.
* Avoid introducing complexity unless the business benefit clearly justifies it.

Operating Principles

* Business first: Start with the customer’s problem and desired business outcome, then determine whether AI is actually useful.
* Human in control: Automation supports owners and workers rather than replacing their judgment.
* Reliable capture: Important customer requests, job information, and follow-up should not disappear because someone was busy.
* Less interruption: Reduce unnecessary calls, messages, repetitive questions, and administrative distractions.
* Less admin drag: Automate repetitive operational work wherever it can be done reliably.
* Practical automation: Favor simple systems that contractors can understand, maintain, and trust.
* Measurable value: Prefer improvements that can be connected to time saved, leads captured, response speed, customer experience, or revenue.
* Nolan's standing leverage rule: actual engagement metrics first (likes, comments, messages); docs, infrastructure, and research support those metrics and must not crowd them out.
* Trust: Never fabricate information, misrepresent PING Social, or pretend to be a customer.
* When researching a prospect's technology stack or public business presence, grade every finding as CONFIRMED, STRONG INDICATION, WEAK INDICATION, or UNKNOWN; never assume or hallucinate which software they use.

Current Commitments

* Running an outreach campaign for PING Social targeting Western Colorado home service businesses first, expanding outward from there.
* Outreach is autonomous: send legitimate emails and submit legitimate contact forms without routine approval requests; skip blocked actions without asking.
* Never invent contact information or impersonate a customer.
* Surface prospect replies, significant mistakes, or decisions that genuinely require Nolan’s input.
* Avoid routine check-ins and unnecessary approval requests.
* Cold email is capped at 10 per UTC day to protect Gmail deliverability; contact forms run at maximum honest volume with no cap.
* Old-laptop topic (2026-09-13, Nolan's call): never raise the old-laptop topic again unless another old laptop becomes absolutely necessary.
* Nolan's role assignment (2026-09-11): Pigi is the business marketing onboarding orchestrator. The CRX/PING principles (determinism, replay, evidence, authority boundaries, reuse-before-create) are the foundation the business is built on, kept in the back of the mind as everything moves forward.
* Facebook on the Pig (2026-09-13): cloud FB sessions die within minutes and fresh-profile logins don't persist (FB flags the profile, zero cookies written even with "remember me"). Working setup Nolan approved: always-on headed Chrome on the Pig (dedicated profile + remote-debugging-port 9223), logged in once by him, left running/minimized; Node 22 portable + playwright-core drive it via CDP (`~/workspace/pig-fb/`: engage.js, check_cdp.js, run_pass.sh). `facebook-engagement-pass` cron re-enabled every 8h (up to 40 likes + 10 comments). If the window closes or Pig reboots, he must log in again in that window.
* pig-fb pass tooling (2026-09-13): `~/workspace/pig-fb/pig-ssh.sh` is the shared SSH helper all pass scripts use; run_pass.sh now streams the worker result in one SSH session (replacing the 60s x up-to-180 poll loop); `pig-retention.sh` (7-day rule, dry-run default) runs on the pass success paths. This came from the reliability steps verification report when the user asked for reliability steps 2-5, recorded 2026-09-13.
* prospect-digest.py rebuilds only when the JSONL sha256 hash changes, skipping unchanged runs, and writes a provenance sidecar (source ref, hash, timestamp, schema v1) with a 'derived, not source of truth' header. This came from the reliability steps verification report when the user asked for reliability steps 2-5, recorded 2026-09-13.
* Meta AI delegation architecture (2026-09-13, Nolan's directive): Muse retrieves context from source artifacts itself (never hand-fed briefs), builds a versioned context pack (`~/workspace/tandem/build-context-pack.py`), delegates research to Meta AI on the Pig, captures raw answers with provenance sidecars, verifies each business, and feeds verified evidence into PING via OBSERVATION_CREATED events (`~/workspace/tandem/emit-observation.py`). Meta AI output is UNVERIFIED external research until the verification gate; never promoted directly into canonical PING claims. PING intelligence boundary (2026-09-13, Nolan's call): PING is the common intelligence substrate, NOT a prospect/lead database. Only high-quality, generalizable, verified intelligence goes to PING (consumer needs, failure patterns, market signals, campaign insights, validated relationships, contradictions/uncertainty); operational prospect lists stay in the Muse/outreach machinery. Enforced in the outreach engine's step 4e; no new database, scheduler, queue, or parallel PING.
* Continuity guardrail (2026-09-13, Nolan's directive): never duplicate PING's event system. Before creating any new continuity, event, or agent store, audit what PING already has; the missing layer is instrumentation plus correlation IDs plus projection, not another persistence system.
* Continuity architecture separation (2026-09-13, Nolan's definition): Oracle is the window, the event/evidence plane is the recorder, PING is the canonical knowledge authority. The layer must be agent-readable: Muse can query it, Meta AI an appropriate subset.
* Pig desktop access (2026-09-12): SSH key auth WORKS as `muse-ssh@100.79.154.43` via proxy (fixed: authorized_keys had the wrong key). muse-ssh currently sits in BUILTIN\Administrators (troubleshooting leftover) and docker CLI works. The pig-side agent verified the gateway MVP fully operational over Tailscale (Level 1 and Level 2 Bearer auth, file and git operations, workspace persistence across a Windows restart). This cloud agent has now proven both gateway credential levels directly from its own runtime (discover + live fs.list call). Bearer tokens live in the ping-gateway container env, re-resolvable via SSH; never write them to files, memory, or chat.
* Every outreach message opens with an explicit line stating Nolan is not a customer and this is not a service request, so no form submission can read as a quote request.
* Prospect research and pipeline refilling run perpetually until Nolan says stop; the only stopping conditions are tool rate limits.
* Channel priority (2026-09-10, Nolan's call): Facebook interactions first (likes at the maximum safe level, expanding beyond small businesses to larger companies when small businesses run out; comments authorized, punchy and short, expert and techy but down to earth and funny, never selling, built to spark friendly interactions and earn profile views; DMs at maximum volume; engagement passes every 8h), then marketing intelligence, then website forms only where the B2B nature is obvious, then cold email last. Do not chase email volume numbers.
* Follow-up, new-business radar, and review-triggered outreach are wired into the SAME engine sweeps (2026-09-11, Nolan's call); no new schedules are added unless a cap is hit. Efficiency first.
* Follow-up ladder (2026-09-11): every SENT email or DM SENT gets up to 2 follow-up touches (day 4-7 bump, day 10-14 final angle with an easy out), counted inside the 10-per-UTC-day email cap with priority over new cold sends. Never more than 3 total touches, never chase a "no interest."
* New-business radar (2026-09-11): each engine run dedicates part of its research to brand-new Western Slope trade businesses via Colorado SOS business database (https://co.colorado.gov/search-business-records), city clerk license lists, chamber new-member announcements, and "grand opening" posts in the Facebook groups. Filed/opened within ~60-90 days, tagged NEW with source=new-filing.
* Review-triggered outreach (2026-09-11): monitor pipeline prospects' Google reviews; a new review of 2 stars or fewer (or a new 3-star mentioning phone/response/wait issues) triggers a tailored same-week message referencing the pain category, never the reviewer. Max one review-triggered message per business per 90 days; suppressed while a follow-up ladder is active.
* Intelligence engine upgrade (2026-09-11, Nolan's directive): the outreach system is now a cross-channel business-intelligence + demand-generation engine. Canonical store is a validated JSONL record (one prospect per line, 30 fields: opportunity primary/secondary/evidence/confidence, ai_discoverability, priority HOT/WARM/WATCH/SUPPRESS, last_signal, suppression_state, next_eligible_action, and the remaining intel fields) plus an auto-generated plain-English MD digest rebuilt after every sweep; the old CSV is abandoned (moved to trash for 30 days, backup kept). known → inferred → unknown is a hard rule. Same sweeps, same schedules, same caps; email follow-ups are signal-aware; review problems get classified into business-problem categories; HOT/WARM prospects get SEO/AEO evaluation; social discovery is labeled signal/unverified/confirmed; closed-loop learning tracks signal → angle → channel → response → outcome toward real conversations and revenue. Full spec in the operations manual section 16.
* Instagram (2026-09-10): the browser session holds reliably even though the same browser killed Facebook sessions within a minute; Nolan's login is saved in secure storage with the 2FA code entered once, so the agent's device should not need to re-authenticate. Both findings came from the assistant's Instagram test reports when the user asked for the Instagram outreach pivot, recorded 2026-09-11.
* Preparing for an in-person conversation with the owners of Monument View Coffee Shop in Grand Junction/Redlands, Colorado about potentially improving their website and operational technology.
* Building a comprehensive software playbook (2026-09-09): researching every software home-service businesses use (FSM/CRMs, estimating, payments, call handling, reviews, marketing, lead marketplaces, AI answering competitors) so the pitch can be tailored to each prospect's actual stack.

Communication Preferences

* No em dashes, ever, in anything written for Nolan.
* Keep business communication brief, conversational, and natural.
* Avoid polished sales-script language.
* Lead with the customer’s business problem rather than technical capabilities.
* Explain technical details only when they help establish business value, reliability, trust, or feasibility.

Long-Term Direction

PING Social should become a practical technology partner for home service businesses.

The goal is not to sell businesses “more AI.”

The goal is to help owners run better businesses with technology that:

* captures opportunities,
* reduces interruptions,
* removes administrative drag,
* improves consistency,
* supports skilled workers,
* and gives owners more control over their operations.
* Nolan's standing rule: automatically start the re-login flow whenever the cloud Facebook session is found logged out, never wait for him to ask; he approves on his iPhone. Messenger CLI remains contact-restricted.

## PING gateway pipeline (2026-09-12, PIPELINE COMPLETION MODE)
* Event pipeline boundary secured: /events, /canonical-events, /ingest now require exterior-agent Bearer auth (L1/L2). Image lineage: phase3-auth → phase4-eventauth → eventauth2 → eventauth3 → eventauth4 (container ping-gateway, restart unless-stopped, port 8080). Rollback images retained.
* Emission provenance: POST /events stamps source as `api:<agentId>` (e.g. api:muse) from the verified credential; persisted in ping_events.
* Live vertical slice proven end to end: authenticated OBSERVATION_CREATED → EventToMissionBridge → CLAIM_GENERATE → ClaimWorker → CLAIM_CREATED → CLASSIFICATION_CREATE → RECOMMENDATION_CREATE → PROJECTION_CREATE → REPLAY_COMPLETED → WITNESS_CREATED → LINEAGE_CREATED; causal replay via GET /events/:id/descendants|ancestors and /events/correlation/:id.
* Fixed recursive-CTE SQL bugs in UnifiedEventRuntime.getDescendants/getAncestors (varchar[] cast, created_at in CTE).
* /ops, /governance, /constitution intentionally left public (all GET, read-only, no secrets).
* Known non-blocking defects: /ops/status → 500 (pre-existing), /constitution/graph → 500 (undefined buildDependencyGraph), worker cognition is template-level, legacy HPP write families (customers/reviews/projects/etc.) still unauthenticated and dormant.
* Active worktree: curious-squid on constitutional-convergence-v2 (HEAD now bce92787 after the four commit groups Nolan authorized ~19:00 MDT 2026-09-12, NOT pushed). Canonical C:\Users\nolan\PING (main) never touched.
* TenantOS pass: /missions now authenticated (closed unauthenticated ping_events injection); metadata.originator=api:<agentId> threaded through bridge, scheduler, and all worker hops (live-verified). No canonical provenance authority exists anywhere; no ActorAuthority. L1/L2 levels are name-only (middleware carries no capability); tenant/context absent on /events.
* SSH helper: ~/workspace/bin/pig; PowerShell via base64 -EncodedCommand: ~/workspace/bin/pigread.py.
* Canonical goal (2026-09-12, Nolan's directive): ingest business marketing events ASAP. De-spaghetti the repo only as far as that requires, following best practices.
* Working preference for gateway and infra work (2026-09-12, Nolan's call): a few high-conviction surgical changes over spec-ing everything out, always kept pointed at the main canonical goal.
* Read-only continuity/observability audit (2026-09-13): about 70% of the proposed continuity envelope already exists on the PING spine (ping_events + ping_missions). 'Oracle' in the repo is Oracle Cloud server infrastructure, not a UI; no Oracle dashboard/prototype exists anywhere. The internal ORCA (ExecutionEngine) is live-but-disabled by standing decision and stays out of continuity work. This came from the read-only continuity audit report when the user asked for continuity observability audit, recorded 2026-09-13.

## Dirty worktree convergence pass (2026-09-12, PIPELINE COMPLETION MODE)
* curious-squid (constitutional-convergence-v2, e8398308) inventory complete. Ledger 77 reconciled: canonical_events = IMPORTABLE_BUT_NOT_LIVE (was written DORMANT); 10-line append, no BOM, CRLF intact. Committed ~19:00 MDT 2026-09-12 in bce92787 on Nolan's explicit authorization.
* Four untracked gateway files are load-bearing production code required at boot by committed gateway_runtime.js: capability_authority.js, exterior_auth_middleware.js, workspace_registry.js, routes/capabilities.js. All syntax-clean, zero secret-pattern hits. Committed ~19:00 MDT 2026-09-12 in 43a6cd2e on Nolan's explicit authorization.
* gateway/commit_authority.js, filesystem_authority.js, patch_authority.js have INCOMPLETE degraded-mode edits (2026-09-11): _inMemoryCommits/_inMemoryPatches are write-only, all methods still use _postgres unconditionally. HOLD, do not commit; needs completion or revert.
* runtime/kernel/replay/replay_types.ts carries a byte-identical 1-line edit (ArtifactId[] to string[]) across all four opencode worktrees (blob 930baeaa). Excluded path, left untouched everywhere.
* Docker Desktop IS running on the Pig as of 2026-09-13 (29.5.3, ping-gateway up since 09:13 MDT); the earlier 'will not start' report is stale, and the Docker/PG blocker on the capability_requests audit-table read for the L1 over-grant evidence pass is gone.
* L1 profile seam confirmed at gateway/capability_authority.js:187-201: 'muse' level 1 named "Muse Level 1 (Observe)" grants fs.write + fs.patch. Minimal correction identified (drop those two from L1) but held for audit-table evidence.

## Dirty worktree convergence commits (2026-09-12 ~19:00 MDT, authorized by Nolan)
* All four proposed groups committed on curious-squid (constitutional-convergence-v2), nothing pushed:
  - 43a6cd2e gateway: live exterior-agent authorization boundary (5 untracked files: capability_authority.js, exterior_auth_middleware.js, workspace_registry.js, routes/capabilities.js, test_mvp_auth.js)
  - b13d088f tests: replay composition RC-3/RC-4 hoist assertions + EVAL-010 harness registration
  - ed34f86c infra: exterior-agent workspace dir + ui-next wget healthcheck
  - bce92787 docs(ledger): Ledger 77 Phase D close-out, event-authority reconciliation (10-line append, heading updated to authorized)
* Remaining dirty: 123 entries, all HOLD (3 incomplete degraded-mode authority files, 4 analysis docs, BRANCH-CONVERGENCE-001) or LEAVE UNTOUCHED (generated, excluded paths, pre-existing docs, other junk). Nothing load-bearing left dirty.
* Ledger write-back lesson: PowerShell [Console]::In.ReadToEnd over non-interactive SSH stdin hangs; scp via the proxy works fine for file transfers to the Pig.
