# Meta / WhatsApp Webhook: Permanent Hosting Plan

Decision-ready spec, 2026-10-04. Nothing here deploys or provisions anything.
Sources: `~/workspace/connectors/meta-whatsapp/` artifacts
(`README.md`, `outputs/MUSE_SETUP.md`, `outputs/META_WEBHOOK_VERIFICATION.json`,
`outputs/meta_webhook.py`, `outputs/WEBHOOK_SECURITY_TEST.json`) plus public docs.

## 1. Current temporary setup

- **Receiver:** stdlib Python HTTP server (`outputs/meta_webhook.py`), bound to
  `127.0.0.1:8080` on Nolan's Windows machine ("the Pig"). Single process,
  no supervisor, no auto-restart.
- **Public face:** cloudflared **Quick Tunnel**:
  `https://moderate-sport-clark-above.trycloudflare.com/webhook`
  -> `127.0.0.1:8080`. No Cloudflare account, anonymous tunnel.
- **Meta wiring:** three app-level subscriptions on the GB app
  (`1641669927306725`) point at that callback URL:
  `page` (fields: messages, messaging_postbacks, message_deliveries,
  message_reads, messaging_handovers),
  `instagram` (messages, messaging_postbacks, messaging_seen,
  message_reactions, comments),
  `whatsapp_business_account` (messages).
  All verified 200/success on 2026-10-04.
- **Security behavior (must survive any move):** GET verification returns the
  `hub.challenge` only when `hub.mode=subscribe` and the verify token
  matches via `hmac.compare_digest`; POST bodies are rejected 403 unless
  `X-Hub-Signature-256` equals HMAC-SHA256(raw body, APP_SECRET) via
  `hmac.compare_digest`. Proven by synthetic tests (valid signature -> 200
  `EVENT_RECEIVED`, invalid -> 403). Receiver only appends events to a local
  `.jsonl` log; it invokes nothing and sends no replies.
- **Secrets today:** file refs only. `C:\tmp\META_APP_SECRET.txt`,
  `C:\tmp\META_VERIFY_TOKEN.txt`, `C:\tmp\muse_admin_token.txt`,
  `C:\tmp\PAGE_TOKEN*.txt`, `C:\tmp\META_WEBHOOK_URL.txt`,
  `C:\tmp\META_WEBHOOK_PROCESSES.json`. Master copies also expected in the
  Secure Vault.

## 2. Why the Quick Tunnel must be replaced

1. **URL is ephemeral.** A Quick Tunnel URL changes every time cloudflared
   restarts. Each restart silently breaks all three Meta subscriptions: Meta
   keeps POSTing to a dead URL and there is no alerting.
2. **No supervision.** The receiver and tunnel die with the machine or the
   process. The Pig has a documented sleep problem (Modern Standby has
   caused multi-hour silent outages before); a webhook host on it sleeps when
   the Pig sleeps.
3. **No TLS control / no observability.** Anonymous tunnel; logs live on one
   disk; if the disk fills or the process crashes, the failure is silent.
4. **Test-phase fit only.** It answered Meta's verification challenge and
   proved signature behavior, which was its job. It is not a hosting answer.

Note (does not change hosting choice): the GB app is still in Development
mode and the business is unverified, so Meta itself says an unpublished app
receives only dashboard test webhooks, not production data. Permanent
hosting is necessary but not sufficient for production delivery; App Review
/ publish are separate work.

## 3. Candidate hosts

Common requirements for all options: HTTPS with a valid cert (Meta requires
it), GET verification handler, HMAC-SHA256 POST signature check, secrets
from env/host secret store (never in code or logs), request logging
metadata only.

### A. Vercel serverless function (Hobby, existing account)

- **Cost:** $0 marginal. Hobby: 1M invocations/mo, 100 GB bandwidth/mo,
  functions up to 300 s with Fluid compute. Nolan already has a working
  Vercel account (`piging85-8833`, project `fyd-product`) and it is in active
  use tonight, so no new account.
- **Supervision/restarts:** None needed; Vercel owns it. Webhook traffic is
  a handful of small requests per day; far under free limits.
- **TLS:** Automatic, managed.
- **Re-verification after cutover:** Update the callback URL in App
  Dashboard > Webhooks (per object) or via Graph API
  `POST /{app-id}/subscriptions`. Meta immediately issues the verification
  GET to the new URL; the function must answer the challenge 200. Then
  re-run the signature test battery against the new URL.
- **Security:** `META_VERIFY_TOKEN` and `META_APP_SECRET` as Vercel project
  env secrets (encrypted at rest by Vercel). Signature logic is ~10 lines;
  port `meta_webhook.py` handler to Node/Python runtime. No new authority,
  no store: the function verifies, responds 200, and forwards event payloads
  to the existing Muse ingest path when that exists; until then, Vercel logs
  (metadata only).
- **One real downgrade vs the Pig:** serverless filesystem is ephemeral, so
  the current `.jsonl` append-log semantics do not survive. Events are
  acknowledged and logged via platform logs; Meta keeps its own activity
  log. Acceptable in test phase; the canonical event sink decision belongs
  to the Muse integration work, not to hosting.
- **License caveat:** Hobby is licensed for non-commercial personal use.
  Test-phase traffic is fine; production business messaging may need a plan
  review later.

### B. Cloudflare Workers (free tier)

- **Cost:** $0. Free tier: 100k requests/day, KV/D1 available. Zero machine.
- **Supervision/restarts:** None; edge runs it. Stable `*.workers.dev`
  hostname free.
- **TLS:** Automatic.
- **Re-verification:** Same Meta mechanism as A (update callback URL, Meta
  re-verifies immediately).
- **Security:** Secrets via `wrangler secret put` (encrypted). Signature
  verification via WebCrypto HMAC in JS; the Python handler must be
  re-implemented (small, deterministic, testable). No new authority/store.
- **Cons:** New vendor account for Nolan (signup free). Event persistence
  needs KV (extra surface). One more dashboard in the estate. Best as a
  fallback if the Vercel route is blocked.

### C. Pig with a named cloudflared tunnel + Windows supervision

- **Cost:** $0/mo, but requires a Cloudflare account (free) **and a domain
  Nolan controls with DNS on Cloudflare** (~$10-15/yr for a cheap domain if
  he has none). Named tunnels get a stable `webhook.<domain>` hostname that
  survives restarts; a Quick Tunnel URL does not.
- **Supervision/restarts:** Windows Task Scheduler or a service wrapper must
  start both the receiver and `cloudflared tunnel run` at boot and restart
  them on crash, plus a watchdog probe. The Pig remains a personal machine:
  sleep, reboots, and travel blackouts kill delivery with no remote recovery.
- **TLS:** Terminated at Cloudflare (Cloudflare holds plaintext in the
  middle by product design, same as today).
- **Re-verification:** One-time: point the hostname at the tunnel, update
  the callback URL in App Dashboard, Meta verifies, done. No URL churn ever
  again.
- **Security:** Secrets stay as env/file refs on the Pig (current pattern).
  Same handler code, no rewrite.
- **Cons:** Reliability is bounded by the Pig's uptime, which is the known
  weak link. Keeps a personal machine in the production path.

### D. Cheap VPS (e.g. Hetzner/DigitalOcean-class, ~$4-5/mo)

- **Cost:** ~$4-5/mo recurring, plus ~15 min/month of hygiene.
- **Supervision/restarts:** systemd unit with `Restart=always` for the
  receiver; Caddy or nginx+certbot for automatic TLS; static IP; full log
  retention on disk (keeps today's `.jsonl` semantics verbatim).
- **Re-verification:** Same Meta mechanism; point callback URL at the VPS
  hostname, Meta verifies, done.
- **Security:** Secrets in a systemd env file / host key store; signature
  logic unchanged (same Python server). No new authority/store.
- **Cons:** Costs money, needs provisioning and patching discipline, and is
  more machine than this workload needs today. Strongest as the
  production-phase answer if message volume ever outgrows serverless or the
  Hobby license caveat bites.

### Rejected for this decision

- **fly.io:** no permanent free tier for new accounts since Oct 2024; new
  signups get a 2-VM-hour/7-day trial, then pay (~$2-5/mo for one small
  always-on machine). Not free, and smaller margin than a plain VPS.
- **Oracle Cloud Always Free:** genuinely free compute exists, but requires
  signup + card on file, and idle instances face reclamation. More friction
  than the value for a three-requests-a-day webhook.
- **Render free web service:** spins down on inactivity; Meta webhooks need
  an always-awake endpoint. Missed deliveries during spin-up are not
  acceptable.

## 4. Security posture (applies to any choice)

- Signature verification (`X-Hub-Signature-256`, HMAC-SHA256 with the app
  secret, `compare_digest`) is re-implemented 1:1 on the new host and
  re-tested (valid -> 200, invalid -> 403, malformed -> 400/413) before the
  callback URL is cut over. No option may skip this.
- Secrets live only in the host's secret store (Vercel env / wrangler secret
  / systemd env) with master copies in the Secure Vault. The existing
  `C:\tmp` file refs stay on the Pig until cutover, then are archived, not
  deleted.
- The receiver remains a logging projection: verify, log, 200. No new
  authority, no new store, no scheduler, no event bus, no reply automation.
  Reply/sending behavior stays in Muse's governed path.
- Verify token may be reused or rotated at cutover; rotation is one extra
  dashboard edit and is recommended.

## 5. Recommendation and ordered cutover steps

**Recommended: A (Vercel serverless function on the existing Hobby account).**
It is $0, needs no new account, needs no machine supervision, keeps secrets
in a managed store, and lives in the same estate as the FYD product already
being wired tonight. Cloudflare Workers (B) is the fallback if the Hobby
non-commercial-license caveat ever matters; the VPS (D) is the
production-phase upgrade path.

**Cutover steps** (each marked reversible [R] or not [N]):

1. [R] Implement `/api/webhooks/meta` (verify-GET + signed-POST, port of
   `outputs/meta_webhook.py`) in a Vercel project; add `META_VERIFY_TOKEN`
   and `META_APP_SECRET` as project env secrets. No deploy yet.
2. [R] Deploy; probe the GET verification path manually (construct
   `?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...` and confirm
   the challenge echoes 200); probe POST with valid/invalid signatures
   (expect 200 `EVENT_RECEIVED` / 403).
3. [R] Rotate the verify token (optional, recommended) in the App Dashboard.
4. [N-light] In App Dashboard > Webhooks, update the callback URL for
   `page`, `instagram`, and `whatsapp_business_account` to the Vercel URL.
   Meta re-verifies each immediately against the new endpoint. (Marked
   light-nonreversible only because rollback needs the old URL, which for a
   Quick Tunnel no longer exists after restart. Rollback target: re-point to
   a fresh Quick Tunnel URL in an emergency.)
5. [R] Re-run the full signature test battery against the production URL;
   confirm all three subscriptions show the new callback URL and active=true
   via `GET /{app-id}/subscriptions`.
6. [R] Overlap: keep the Pig receiver + Quick Tunnel alive 24-48 h and
   compare Vercel logs against the Pig `.jsonl` for duplicate/missing
   deliveries.
7. [R] Decommission: stop cloudflared and the Pig receiver; archive (do not
   delete) `C:\tmp\META_WEBHOOK_*` refs; record the new callback URL in the
   connector registry.

**Cheapest safe next step:** Nolan approves option A; then one lane
implements the function and secrets, deploys, and proves verification +
signature tests against the Vercel URL before any Meta callback URL is
touched. Cost so far: $0 and zero production changes.

## 6. DECISION (for Nolan)

- **DEFAULT:** If you decide nothing, the Quick Tunnel keeps working until
  it dies, and it will die silently: next cloudflared restart changes the
  URL and all three Meta subscriptions go dark with no alert.
- **WHAT CHANGES:** The Meta webhook callback URL moves from the ephemeral
  trycloudflare URL to a permanent Vercel serverless endpoint
  (`https://<project>.vercel.app/api/webhooks/meta`). Same verify + HMAC
  behavior, secrets move to Vercel env. The Pig stops being in the webhook
  path.
- **EVIDENCE:** Current setup is documented above and in
  `outputs/MUSE_SETUP.md` (Quick Tunnel, ephemeral URL, manual processes).
  Vercel Hobby serverless limits (300 s max duration, 1M invocations/mo,
  100 GB bandwidth) exceed this workload by orders of magnitude; webhook
  traffic is a few tiny requests per day. Signature logic is already proven
  (`outputs/WEBHOOK_SECURITY_TEST.json`); the port is a transliteration,
  not a redesign.
- **RISK:** Low. The only functional downgrade is ephemeral serverless
  filesystem (no persistent `.jsonl` on the host; events go to platform
  logs). Hobby license is non-commercial personal use; fine for test phase,
  revisit before production messaging. Cutover itself is a 5-minute
  dashboard change that Meta re-verifies instantly.
- **REVERSIBILITY:** Fully reversible. Callback URL can be pointed back or
  elsewhere at any time; the Pig tunnel path can be re-established on
  demand. No schema, no data, no identity changes.
- **RECOMMENDATION:** Approve option A. Authorize: (1) store
  `META_VERIFY_TOKEN` and `META_APP_SECRET` as Vercel project env secrets,
  (2) deploy the receiver function, (3) cut over the three callback URLs
  after the test battery passes. Keep Cloudflare Workers in reserve and the
  VPS as the production-phase upgrade.
