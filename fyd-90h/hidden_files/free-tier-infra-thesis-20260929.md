# Free-Tier Infrastructure Thesis for FYD Tenants

Research date: 2026-09-29. All limits verified against primary docs or
doc-derived sources crawled within the last ~4 days. Read-only research;
no accounts created, no signups, no code.

Scope note (2026-09-29 scope cut): PING is the exploratory tenant; the
two-tenant proof is deferred. The ceiling math below therefore describes
headroom, not an immediate requirement. One tenant fits trivially.

Intelligence (model calls) is out of scope. This thesis covers
storage + compute only.

---

## Verdict

Zero marginal cost per tenant is real and achievable, but only under one
specific shape: **FYD-owned multi-tenant provider accounts, with logical
tenant isolation (tenant_id on every record), not per-tenant provider
accounts.** Every major provider's ToS blocks the "mint one free account
per client" play: Oracle and Upstash allow one free account per person,
AWS bulk account creation trips fraud systems, and only Cloudflare offers
a sanctioned per-client path (and even there the client must accept the
ToS themselves).

The recommended free footprint:

- **Oracle Cloud Always Free** (FYD tenancy): control plane. Scheduler,
  API, worker dispatch, canonical evidence store. 2 OCPU / 12 GB ARM
  (cut June 2026, enforced Aug 18 2026), 200 GB block, 2x20 GB
  Autonomous DB, 10 TB/month egress.
- **Cloudflare free** (FYD account): tenant presence and state. Pages
  (unlimited static requests), Workers (100K req/day), KV + D1 for
  tenant state, Queues for durable work, R2 for media.
- **Upstash free** (FYD account): Redis for atomic claim/leases, rate
  limits, idempotency keys. 500K commands/month. (Kafka is discontinued;
  do not plan around it.)
- **AWS**: excluded from the free-forever foundation. New accounts are
  credit-based (up to $200, 6 months), not 12-month free tier. Always
  Free serverless pieces (Lambda, DynamoDB) are real but modest and
  shared org-wide under Organizations.

Ceiling: roughly **30-50 small-business tenants per free Cloudflare
account** before Pages builds (500/mo) or KV writes (1K/day) bind. The
Oracle control plane can serve hundreds. The first paid step is
Cloudflare Workers Paid at $5/month, which lifts quotas roughly 100x.
The honest unit economics: free to ~50 tenants, then ~$5/month per
~5,000 tenants of headroom.

---

## 1. Oracle Cloud Always Free

Primary source: Oracle free-tier docs
(https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm),
via doc-derived guides crawled 2026-09-25.

What is free forever, per tenancy:

- Ampere A1 ARM: **2 OCPUs / 12 GB total** (1,500 OCPU-hours +
  9,000 GB-hours/month). CUT from 4 OCPUs / 24 GB in June 2026;
  enforcement began **August 18, 2026**. Old 4/24 figures still
  circulate; do not plan on them.
- 2x AMD VM.Standard.E2.1.Micro (1 GB RAM each). Unchanged.
- 200 GB block storage total (boot + data volumes).
- 20 GB object storage.
- 10 TB/month outbound data transfer.
- 2x Autonomous Database, 20 GB each.
- 1 flexible load balancer.

Can one tenancy host a multi-tenant FYD control plane? Yes. The
control plane (scheduler tick, API, worker dispatch, evidence store)
is light: 2 OCPU / 12 GB comfortably runs the deterministic core for
hundreds of tenants provided heavy lifting (presence hosting, KV,
queues) sits on Cloudflare. 10 TB egress covers acquisition crawling
at small-business scale. 200 GB block + 40 GB Autonomous DB covers
the canonical evidence/object store for the first few hundred
tenants.

Hard limits and gotchas:

- Always Free is scoped to the tenancy's **home region** (chosen at
  signup, permanent). Resources elsewhere bill at full price.
- **Idle reclamation**: an Always Free instance idle for 7 days
  (CPU below 20% at the 95th percentile, network and memory
  likewise) may be reclaimed. Mitigation: a heartbeat cron that keeps
  utilization above the threshold; upgrading to pay-as-you-go ends
  reclamation but opens billing risk.
- Card required at signup (authorization hold, not a charge).
- "Out of host capacity" on A1 provisioning is common; retries over
  days clear it.

---

## 2. Cloudflare free plan

Sources: Cloudflare developer docs pricing pages, via compiled
references crawled 2026-09-25 (yuanbop/frugal, bodecloud/cloudbooter,
janusklok/cloudflare-killswitch).

Per-account free allowances (the binding surface for multi-tenant):

- **Workers**: 100,000 requests/day; 10 ms CPU per invocation;
  128 MB memory; 100 workers per account; **5 cron triggers per
  account**.
- **KV**: 100,000 reads/day; 1,000 writes/day; 1,000 deletes/day;
  1 GB storage.
- **D1**: 5,000,000 rows read/day; 100,000 rows written/day;
  5 GB total storage.
- **R2**: 10 GB-month storage; 1,000,000 Class A ops/month;
  10,000,000 Class B ops/month; egress free (Standard class only).
- **Pages**: 500 builds/month; 100 projects; 20,000 files per site;
  100 custom domains; **unlimited static requests**.
- **Queues**: 10,000 operations/day; 24-hour retention.
- **Durable Objects** (SQLite backend): 100,000 requests/day.
- **Workers AI**: 10,000 neurons/day (not in this thesis's scope).

Fit for the per-tenant story: Pages is the presence layer
(unlimited static requests means tenant websites cost nothing to
serve). Workers + D1 + KV carry tenant state and the Ask/marketer
API. Queues carry the durable-work lifecycle. The 5-cron-trigger cap
forces the right pattern anyway: one tick worker fanning out to
eligible tenants, not one cron per tenant.

Binding constraints per free account (estimated small-business
tenant: ~200 Worker req/day, ~20 KV writes/day, ~15 Pages
builds/month, ~100 MB R2 media, ~20 MB D1):

- Pages builds: 500/mo / 15 = ~30 tenants (binds first).
- KV writes: 1,000/day / 20 = ~50 tenants.
- R2 storage: 10 GB / 100 MB = ~100 tenants.
- Workers requests: 100K/day / 200 = ~500 tenants.
- D1 storage: 5 GB / 20 MB = ~250 tenants.

Practical ceiling: **~30-50 tenants per free account.** Workers Paid
($5/month) lifts to 10M requests/month, 1M KV writes, and removes
the 10 ms CPU cap: the first paid step, and a trivial one.

---

## 3. Upstash free tier

Sources: Upstash docs and pricing (upstash.com/docs/redis/overall/pricing,
upstash.com/pricing), via compiled references crawled 2026-09-25;
Upstash's own 2026-06-11 comparison post.

- **Redis**: 500,000 commands/month; 256 MB data; 10 GB
  bandwidth/month; up to 10 free databases per docs (the pricing page
  shows max 1 free DB in one table: discrepancy noted, verify in
  console before depending on it). No card required.
- **QStash**: 500 messages/day free (one 2026 source says 1,000/day;
  use 500 as the conservative figure).
- **Vector**: 10,000 queries/day free (older figure; not load-bearing
  for this thesis).
- **Kafka: DISCONTINUED.** Deprecated 2024-09-11, shut down
  2025-03-11. Any plan involving Upstash Kafka is dead on arrival.
  Use QStash/Workflow or Cloudflare Queues instead.

Fit: Redis over HTTP is the natural home for the durable-work
invariants the directive requires: atomic claim, leases, idempotency
keys, rate limits, owner-message cooldowns. At ~2-3K commands per
tenant per month, one free account covers **~150-250 tenants**.
It is a complement to Cloudflare KV (which is read-heavy-friendly),
not a replacement: KV for state, Redis for coordination primitives.

---

## 4. AWS free tier: honest assessment

Sources: AWS free-tier docs via 2026 guides crawled 2026-09-25
(dev.to/aiunplugged, efwoods/anubis, ibtisam-iq/nectar).

The model changed **July 15, 2025**, and the old advice is stale:

- Accounts created **before** July 15, 2025: legacy 12-month free
  tier (EC2 750 hrs/mo t2/t3.micro, S3 5 GB, RDS 750 hrs). A
  depreciating asset with an expiry clock.
- Accounts created **on or after** July 15, 2025: credit-based
  Free Plan vs Paid Plan. Up to $200 in credits ($100 at signup,
  up to $100 more via guided activities), lasting **6 months or
  until credits exhaust**, select services only. Beyond credits on
  the Free Plan the account closes rather than billing. This is a
  runway, not a foundation.
- **Always Free** (never expires, all account types): Lambda 1M
  requests + 400,000 GB-seconds/month; DynamoDB 25 GB + 25 RCU/WCU;
  SQS 1M requests/month; SNS 1M publishes/month; Step Functions
  4,000 transitions/month; CloudWatch 10 metrics / 5 GB logs /
  10 alarms; CloudFront 1 TB + 10M requests/month.

AWS Organizations note: free-tier allowances are **shared across the
whole organization**, not per member account. There is no
multiply-the-free-tier-via-member-accounts play.

Assessment: AWS does not fit a "free forever" story for FYD's
foundation. The credit model expires, the legacy tier is closed to
new accounts, and the Always Free pieces are real but modest.
Keep AWS as a future overflow option (Lambda/DynamoDB), not the
base.

---

## 5. The hard question: what "on behalf of clients" can mean

The distinction that decides everything:

**FYD running its multi-tenant SaaS on FYD-owned provider accounts
is normal SaaS operation, not reselling.** Every provider permits
this. The tenants are FYD's customers, not the provider's. Quotas
are per FYD account, which is exactly what the ceiling math above
prices.

**Minting one free provider account per client to multiply free
quotas is blocked at every provider.** Bluntly:

- **Oracle**: one free account per person, enforced. "Creating or
  attempting to create multiple free accounts is prohibited" (Oracle
  FAQ, crawled 2026-09-28); violations risk suspension/termination
  of all accounts. Card + identity verification per account makes
  client-account farming a fraud signal. DEAD END.
- **Upstash**: "One person or legal entity may maintain no more
  than one free account," and accounts must be human-created
  ("Accounts registered by bots or other automated methods are not
  permitted"). DEAD END for per-client multiplication.
- **AWS**: new accounts require unique email + payment-method
  verification; bulk creation trips fraud systems. Organizations is
  the sanctioned multi-account path, but free tier is shared
  org-wide and new accounts are credit-based anyway. DEAD END for
  free multiplication.
- **Cloudflare**: the standard terms bar reselling or making the
  service available to third parties on properties not owned by the
  customer. BUT Cloudflare is the one provider with sanctioned
  on-behalf paths: the **Free plan distributor** partner program
  (partner API to integrate the free plan for customers) and, since
  April 2026, an **agent account-provisioning protocol**
  (co-designed with Stripe) where agents create Cloudflare accounts
  on behalf of users and the human accepts the ToS. This is the
  only legitimate per-client-account route, and the client must
  accept the ToS themselves. FYD cannot mint accounts silently.

Practical consequences:

1. Build on FYD-owned accounts. Logical tenant isolation, not
   account isolation.
2. If a future enterprise client demands their own provider
   account, the only clean route is Cloudflare's distributor/agent
   path with the client's own ToS acceptance. Oracle/AWS/Upstash
   per-client accounts are not viable.
3. Never automate account creation against ToS. One ban wave on
   the FYD-owned accounts would be an existential event for the
   tenant fleet. The free tiers are generous enough that cheating
   them is all risk, no reward.

---

## 6. Cost-ceiling math (one free footprint)

Assumptions per small-business tenant per day: ~200 Worker
requests, ~500 KV reads, ~20 KV writes, ~50 queue ops, ~2-3K Redis
commands/month, ~100 MB R2 media, ~20 MB D1, ~15 Pages builds/month.

| Layer | Free quota | Per-tenant burn | Tenants |
|---|---|---|---|
| Cloudflare Pages builds | 500/mo | ~15/mo | ~30 (binds first) |
| Cloudflare KV writes | 1,000/day | ~20/day | ~50 |
| Cloudflare R2 storage | 10 GB | ~100 MB | ~100 |
| Cloudflare Queues | 10K ops/day | ~50/day | ~200 |
| Cloudflare D1 storage | 5 GB | ~20 MB | ~250 |
| Cloudflare Workers req | 100K/day | ~200/day | ~500 |
| Upstash Redis commands | 500K/mo | ~2.5K/mo | ~200 |
| Oracle control plane | 2 OCPU/12 GB | light | hundreds |

**Ceiling: ~30-50 tenants per free footprint.** The Oracle control
plane is not the constraint; Cloudflare Pages builds and KV writes
are. Mitigations before paying: batch builds, reduce KV write
churn (write-through to D1, KV as read cache).

First paid step: Cloudflare Workers Paid, **$5/month**, lifts to
10M requests, 1M KV writes, 30s CPU: headroom for thousands of
tenants. Upstash pay-as-you-go ($0.20/100K commands) is pennies at
this scale. Oracle stays free with a heartbeat against the 7-day
idle rule.

---

## 7. Recommended bootstrapping architecture

**Central (FYD-owned, free):**

- Oracle Always Free tenancy, home region fixed at signup:
  scheduler tick, API, worker dispatch, canonical evidence/object
  store (Autonomous DB and/or block volume), acquisition crawling
  (10 TB egress). Heartbeat cron against 7-day idle reclamation.
  Stay on Always Free; do NOT upgrade to pay-as-you-go (ends
  reclamation but opens billing risk).
- Cloudflare account: Pages (presence hosting, unlimited static),
  Workers (edge API), D1 (relational tenant state), KV (hot state),
  Queues (durable work), R2 (media/evidence blobs).
- Upstash account: Redis (atomic claim/lease, idempotency,
  rate limits, cooldowns).

**Per tenant (logical, not accounts):**

- tenant_id on every durable record and every effect.
- D1/KV namespaces partitioned by tenant_id.
- One Pages project per tenant presence (100-project cap noted).
- Audience/relationship graph as graph queries over tenant-scoped
  data, never untyped blobs.

**What FYD runs centrally vs per-tenant:** everything central is
shared deterministic software (scheduler, compiler, policy gates);
per-tenant state is data, never processes (per the directive:
TENANT MARKETER != MODEL SESSION). Intelligence stays a separate
paid line item outside this thesis.

## Open owner decisions

1. **Central multi-tenant model**: accept that per-client provider
   accounts are off the table (ToS wall, section 5). The "give them
   everything" promise is funded by FYD's quota headroom and, past
   ~50 tenants, by FYD's $5/month Cloudflare step, not by
   multiplying free accounts.
2. **Oracle tenancy home region**: permanent at signup; choose with
   the tenant base's geography in mind.
3. **Idle-reclamation posture**: heartbeat on Always Free vs
   pay-as-you-go upgrade. Recommendation: heartbeat; keep the free
   tier truly free.
4. **When to flip Cloudflare Paid ($5/mo)**: suggested trigger is
   Pages builds or KV writes at 70% of free quota, not tenant count.
5. **Cloudflare distributor partnership**: defer until an enterprise
   client requires their own account. Not needed for the
   small-business fleet.
6. **Data residency**: Oracle home region + Cloudflare's global
   edge means tenant data lives in multiple jurisdictions by
   default. Decide whether that needs constraining before the
   second tenant.
7. **Egress discipline on Oracle**: 10 TB/month is generous but not
   infinite; acquisition crawling budgets belong in the marketer's
   budget/quota from day one.
