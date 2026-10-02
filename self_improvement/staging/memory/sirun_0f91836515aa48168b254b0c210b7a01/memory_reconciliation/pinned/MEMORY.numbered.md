    1│MEMORY.md
    2│
    3│<!-- Curated long-term memory. Keep durable business facts, preferences, and commitments here. Keep day-to-day execution details in daily notes. -->
    4│
    5│Business
    6│
    7│* User’s name: Nolan Geske, goes by Nolan.
    8│* Runs PING Social, currently without an LLC.
    9│* PING Social is an AI concierge and business automation consultancy for home service businesses.
   10│* Primary market (2026-09-09, Nolan's call): Western Colorado first, expanding outward from there. Denver-area outreach is deprioritized.
   11│* Uses Quo as the communications and phone platform.
   12│* PING Social’s role is consultative: understand each business’s workflow and recommend AI services that solve its actual problems rather than selling a one-size-fits-all package.
   13│
   14│Business Positioning
   15│
   16│* PING Social helps home service businesses capture more opportunities, reduce administrative work, respond faster, and operate more consistently.
   17│* The core value proposition is less busywork and fewer missed opportunities while keeping the business owner and skilled worker in control.
   18│* Technology should strengthen the worker and owner, not replace their judgment.
   19│* AI should handle repetitive communication, organization, follow-up, and administrative work so people can focus on customers, jobs, and decisions that require human judgment.
   20│* Position PING Social around practical business outcomes, not AI hype.
   21│* Keep pitches brief, conversational, direct, and credible.
   22│* Never oversell or make AI sound like a replacement for the trade professional.
   23│* PING Social is new and eager to help local companies adopt AI; frame early engagements as a limited-time trial while the service is being developed and refined.
   24│* Market PING Social itself more aggressively (2026-09-11, Nolan's call): he is setting up Google Workspace and will build a PING Social website soon. Blue collar businesses are the explicit target market.
   25│* Website revamp angle (2026-09-11, Nolan's call): propose a website revamp ONLY for very non-technical owners with weak websites. Nolan can build professional custom websites (TenantOS pipeline) and specializes in backend microservices infrastructure. Portfolio proof asset: https://happy-place-platform.vercel.app/ (may be cited in revamp pitches).
   26│
   27│Customer Focus
   28│
   29│* Prioritize businesses where missed calls, slow follow-up, scheduling friction, repetitive customer communication, lead management, or administrative workload create measurable business pain.
   30│* Favor solutions that can realistically save time, capture revenue, improve customer experience, or make operations easier to manage.
   31│* Recommend automation based on the customer’s existing workflow and needs.
   32│* Avoid introducing complexity unless the business benefit clearly justifies it.
   33│
   34│Operating Principles
   35│
   36│* Business first: Start with the customer’s problem and desired business outcome, then determine whether AI is actually useful.
   37│* Human in control: Automation supports owners and workers rather than replacing their judgment.
   38│* Reliable capture: Important customer requests, job information, and follow-up should not disappear because someone was busy.
   39│* Less interruption: Reduce unnecessary calls, messages, repetitive questions, and administrative distractions.
   40│* Less admin drag: Automate repetitive operational work wherever it can be done reliably.
   41│* Practical automation: Favor simple systems that contractors can understand, maintain, and trust.
   42│* Measurable value: Prefer improvements that can be connected to time saved, leads captured, response speed, customer experience, or revenue.
   43│* Nolan's standing leverage rule: actual engagement metrics first (likes, comments, messages); docs, infrastructure, and research support those metrics and must not crowd them out.
   44│* Trust: Never fabricate information, misrepresent PING Social, or pretend to be a customer.
   45│* When researching a prospect's technology stack or public business presence, grade every finding as CONFIRMED, STRONG INDICATION, WEAK INDICATION, or UNKNOWN; never assume or hallucinate which software they use.
   46│
   47│Current Commitments
   48│
   49│* Running an outreach campaign for PING Social targeting Western Colorado home service businesses first, expanding outward from there.
   50│* Outreach is autonomous: send legitimate emails and submit legitimate contact forms without routine approval requests; skip blocked actions without asking.
   51│* Never invent contact information or impersonate a customer.
   52│* Surface prospect replies, significant mistakes, or decisions that genuinely require Nolan’s input.
   53│* Avoid routine check-ins and unnecessary approval requests.
   54│* Cold email is capped at 10 per UTC day to protect Gmail deliverability; contact forms run at maximum honest volume with no cap.
   55│* Channel priority (2026-09-10, Nolan's call): Facebook interactions first (likes, comments, DMs at maximum volume; engagement passes every 8h), then marketing intelligence, then website forms only where the B2B nature is obvious, then cold email last. Do not chase email volume numbers.
   56│* "Option one" fallback (2026-09-10): an old laptop stays powered on at Nolan's place, joins a private secure network, and the agent drives its browser remotely so Facebook sees a home connection; starter files are saved and waiting for him. This came from the assistant's option-one plan writeup when the user asked for Instagram outreach pivot, recorded 2026-09-11. He said on 2026-09-11 he will try the setup this weekend.
   57│* Nolan's role assignment (2026-09-11): Pigi is the business marketing onboarding orchestrator. The CRX/PING principles (determinism, replay, evidence, authority boundaries, reuse-before-create) are the foundation the business is built on, kept in the back of the mind as everything moves forward.
   58│* Pig desktop access (2026-09-12): SSH key auth WORKS as `muse-ssh@100.79.154.43` via proxy (fixed: authorized_keys had the wrong key). muse-ssh currently sits in BUILTIN\Administrators (troubleshooting leftover) and docker CLI works. The pig-side agent verified the gateway MVP fully operational over Tailscale (Level 1 and Level 2 Bearer auth, file and git operations, workspace persistence across a Windows restart). This cloud agent has now proven both gateway credential levels directly from its own runtime (discover + live fs.list call). Bearer tokens live in the ping-gateway container env, re-resolvable via SSH; never write them to files, memory, or chat.
   59│* Every outreach message opens with an explicit line stating Nolan is not a customer and this is not a service request, so no form submission can read as a quote request.
   60│* Prospect research and pipeline refilling run perpetually until Nolan says stop; the only stopping conditions are tool rate limits.
   61│* Facebook likes run at the maximum safe level, expanding beyond small businesses to larger companies when small businesses run out.
   62│* Facebook comments are authorized: punchy and short, expert and techy but down to earth and funny, never selling, built to spark friendly interactions and earn profile views.
   63│* Follow-up, new-business radar, and review-triggered outreach are wired into the SAME engine sweeps (2026-09-11, Nolan's call); no new schedules are added unless a cap is hit. Efficiency first.
   64│* Follow-up ladder (2026-09-11): every SENT email or DM SENT gets up to 2 follow-up touches (day 4-7 bump, day 10-14 final angle with an easy out), counted inside the 10-per-UTC-day email cap with priority over new cold sends. Never more than 3 total touches, never chase a "no interest."
   65│* New-business radar (2026-09-11): each engine run dedicates part of its research to brand-new Western Slope trade businesses via Colorado SOS business database (https://co.colorado.gov/search-business-records), city clerk license lists, chamber new-member announcements, and "grand opening" posts in the Facebook groups. Filed/opened within ~60-90 days, tagged NEW with source=new-filing.
   66│* Review-triggered outreach (2026-09-11): monitor pipeline prospects' Google reviews; a new review of 2 stars or fewer (or a new 3-star mentioning phone/response/wait issues) triggers a tailored same-week message referencing the pain category, never the reviewer. Max one review-triggered message per business per 90 days; suppressed while a follow-up ladder is active.
   67│* Intelligence engine upgrade (2026-09-11, Nolan's directive): the outreach system is now a cross-channel business-intelligence + demand-generation engine. Canonical store is a validated JSONL record (one prospect per line, 30 fields: opportunity primary/secondary/evidence/confidence, ai_discoverability, priority HOT/WARM/WATCH/SUPPRESS, last_signal, suppression_state, next_eligible_action, and the remaining intel fields) plus an auto-generated plain-English MD digest rebuilt after every sweep; the old CSV is abandoned (moved to trash for 30 days, backup kept). known → inferred → unknown is a hard rule. Same sweeps, same schedules, same caps; email follow-ups are signal-aware; review problems get classified into business-problem categories; HOT/WARM prospects get SEO/AEO evaluation; social discovery is labeled signal/unverified/confirmed; closed-loop learning tracks signal → angle → channel → response → outcome toward real conversations and revenue. Full spec in the operations manual section 16.
   68│* Instagram (2026-09-10): the browser session holds reliably even though the same browser killed Facebook sessions within a minute; Nolan's login is saved in secure storage with the 2FA code entered once, so the agent's device should not need to re-authenticate. First engagement pass runs at a conservative pace of up to 25 likes plus a handful of comments on Western Colorado trade accounts. Both findings came from the assistant's Instagram test reports when the user asked for the Instagram outreach pivot, recorded 2026-09-11.
   69│* Preparing for an in-person conversation with the owners of Monument View Coffee Shop in Grand Junction/Redlands, Colorado about potentially improving their website and operational technology.
   70│* Building a comprehensive software playbook (2026-09-09): researching every software home-service businesses use (FSM/CRMs, estimating, payments, call handling, reviews, marketing, lead marketplaces, AI answering competitors) so the pitch can be tailored to each prospect's actual stack.
   71│
   72│Communication Preferences
   73│
   74│* No em dashes, ever, in anything written for Nolan.
   75│* Keep business communication brief, conversational, and natural.
   76│* Avoid polished sales-script language.
   77│* Lead with the customer’s business problem rather than technical capabilities.
   78│* Explain technical details only when they help establish business value, reliability, trust, or feasibility.
   79│
   80│Long-Term Direction
   81│
   82│PING Social should become a practical technology partner for home service businesses.
   83│
   84│The goal is not to sell businesses “more AI.”
   85│
   86│The goal is to help owners run better businesses with technology that:
   87│
   88│* captures opportunities,
   89│* reduces interruptions,
   90│* removes administrative drag,
   91│* improves consistency,
   92│* supports skilled workers,
   93│* and gives owners more control over their operations.
   94│* 2026-09-10: Facebook browser sessions have been dying within minutes on 2026-09-10 despite repeated re-logins; likes, comments, and DMs work only while a session survives. Nolan's standing rule: automatically start the re-login flow whenever the session is found logged out, never wait for him to ask; he approves on his iPhone. Messenger CLI remains contact-restricted.
   95│
   96│## PING gateway pipeline (2026-09-12, PIPELINE COMPLETION MODE)
   97│* Event pipeline boundary secured: /events, /canonical-events, /ingest now require exterior-agent Bearer auth (L1/L2). Image lineage: phase3-auth → phase4-eventauth → eventauth2 → eventauth3 → eventauth4 (container ping-gateway, restart unless-stopped, port 8080). Rollback images retained.
   98│* Emission provenance: POST /events stamps source as `api:<agentId>` (e.g. api:muse) from the verified credential; persisted in ping_events.
   99│* Live vertical slice proven end to end: authenticated OBSERVATION_CREATED → EventToMissionBridge → CLAIM_GENERATE → ClaimWorker → CLAIM_CREATED → CLASSIFICATION_CREATE → RECOMMENDATION_CREATE → PROJECTION_CREATE → REPLAY_COMPLETED → WITNESS_CREATED → LINEAGE_CREATED; causal replay via GET /events/:id/descendants|ancestors and /events/correlation/:id.
  100│* Fixed recursive-CTE SQL bugs in UnifiedEventRuntime.getDescendants/getAncestors (varchar[] cast, created_at in CTE).
  101│* /ops, /governance, /constitution intentionally left public (all GET, read-only, no secrets).
  102│* Known non-blocking defects: /ops/status → 500 (pre-existing), /constitution/graph → 500 (undefined buildDependencyGraph), worker cognition is template-level, legacy HPP write families (customers/reviews/projects/etc.) still unauthenticated and dormant.
  103│* Active worktree: curious-squid on constitutional-convergence-v2 (local commit e8398308, NOT pushed). Canonical C:\Users\nolan\PING (main) never touched.
  104│* TenantOS pass: /missions now authenticated (closed unauthenticated ping_events injection); metadata.originator=api:<agentId> threaded through bridge, scheduler, and all worker hops (live-verified). No canonical provenance authority exists anywhere; no ActorAuthority. L1/L2 levels are name-only (middleware carries no capability); tenant/context absent on /events.
  105│* SSH helper: ~/workspace/bin/pig; PowerShell via base64 -EncodedCommand: ~/workspace/bin/pigread.py.
  106│* Canonical goal (2026-09-12, Nolan's directive): ingest business marketing events ASAP. De-spaghetti the repo only as far as that requires, following best practices.
  107│* Working preference for gateway and infra work (2026-09-12, Nolan's call): a few high-conviction surgical changes over spec-ing everything out, always kept pointed at the main canonical goal.
  108│
  109│## Dirty worktree convergence pass (2026-09-12, PIPELINE COMPLETION MODE)
  110│* curious-squid (constitutional-convergence-v2, e8398308) inventory complete. Ledger 77 reconciled: canonical_events = IMPORTABLE_BUT_NOT_LIVE (was written DORMANT); 10-line append, no BOM, CRLF intact. Still uncommitted pending Nolan's explicit authorization.
  111│* Four untracked gateway files are load-bearing production code required at boot by committed gateway_runtime.js: capability_authority.js, exterior_auth_middleware.js, workspace_registry.js, routes/capabilities.js. All syntax-clean, zero secret-pattern hits. Proposed as commit candidates.
  112│* gateway/commit_authority.js, filesystem_authority.js, patch_authority.js have INCOMPLETE degraded-mode edits (2026-09-11): _inMemoryCommits/_inMemoryPatches are write-only, all methods still use _postgres unconditionally. HOLD, do not commit; needs completion or revert.
  113│* runtime/kernel/replay/replay_types.ts carries a byte-identical 1-line edit (ArtifactId[] to string[]) across all four opencode worktrees (blob 930baeaa). Excluded path, left untouched everywhere.
  114│* Docker Desktop will not start on the Pig (com.docker.service start attempted, daemon unable to start). capability_requests audit-table read for the L1 over-grant evidence pass is blocked until Docker/PG is restored.
  115│* L1 profile seam confirmed at gateway/capability_authority.js:187-201: 'muse' level 1 named "Muse Level 1 (Observe)" grants fs.write + fs.patch. Minimal correction identified (drop those two from L1) but held for audit-table evidence.
  116│