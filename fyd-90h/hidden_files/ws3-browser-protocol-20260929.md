# WS3 browser-proof protocol — W2 owner-loop chain (steps 4-9)
**Date:** 2026-09-29 ~07:45 MDT | **Worker:** WS3 (browser-proof preparation; no browser run)

## Target under proof
- **Preview URL:** `http://<WSL-IP>:3214/sites/happy-place`
  (NOT `/` — `/` serves the PING marketing homepage. The demo site is the `/sites/happy-place` route.)
- **Served commit:** `3235804d` (W2's commit), worktree `/home/nolan/projects/ping-wave2-ownerloop` on the Pig (detached HEAD).
- **Serve command (already running, verified 07:36 MDT):** `node ./node_modules/.bin/next dev -p 3214 -H 127.0.0.1` (PID 78879, started 05:56:37). Do not restart it; if it dies, re-run from the worktree dir on the same commit.
- **Journal gateway:** `:18201` (`fyd-journal-gateway`), store `/home/nolan/ping/var/fyd-ownerloop-journal/events.jsonl`. HTTP surface is root-only (`/` returns `{"ok":true,...}`); there is no `/events` or `/health`. Journal cross-checks are read-only reads of the events.jsonl file.
- **Viewports (same widths L3 used):** 375, 390, 1280, 1440, 1920.
- **Access note (CORRECTED 2026-09-29 ~08:01 MDT by the WS3 browser run):** run the browser on the Pig (Windows house :9223 browser + portable node, L3 pattern). Use `http://127.0.0.1:3214/sites/happy-place`: WSL2 localhost forwarding serves the Pig's WSL-bound :3214 to the Windows browser (verified HTTP 200 from Windows curl). The WSL VM IP from `hostname -I` (e.g. 172.21.65.209) is NOT reachable from the Windows browser (ERR_CONNECTION_REFUSED). Do not use the WSL IP for browser runs.

## Read-only rule
This proof performs NO new owner-loop mutations: no corrections, no approvals, no journal writes, no customize API calls except where step 9 explicitly requires (see step 9 — infra manipulation, authorize at run time).

---

## Step 4 — owner correction: "hide the locations section"
**What to check (DOM + rendered):**
1. `document.querySelectorAll('h2')` text list contains NO heading matching /location/i.
2. `document.body.innerText` contains NO "Where we work" (the Locations section's heading text).
3. Scroll the full page at each viewport; confirm no locations/service-area section renders between Gallery and Contact.
**Pass:** Locations section absent from DOM and from view at all 5 widths. (curl baseline 07:44 MDT: `where-we-work: false`, `locations-h2: false`.)

## Step 5 — conversational change: "move the CTA first, services second"
**What to check:**
1. Collect `[...document.querySelectorAll('h2')].map(h => h.innerText.trim())` in DOM order. Expected sequence (curl baseline 07:44 MDT):
   1. `""` (one empty decorative h2 — cosmetic, note its presence)
   2. `Start the conversation` (the CTA section — moved to index 0)
   3. `Services`
   4. `About Happy Place Carpentry LLC`
   5. `Gallery`
   6. `Contact`
   7. `Find us`
   8. `Ask FYD about Happy Place Carpentry LLC`
   9. `Customize this site`
2. Visually confirm at each viewport: the first content section after the hero is the "Start the conversation" CTA block, immediately followed by the Services section.
**Pass:** h2 order matches exactly (modulo the leading empty decorative h2); CTA-first + Services-second holds at all 5 widths.

## Step 6 — approval + regeneration + adversarial matrix
**Browser-visible proof:** the page reflects the approved changes — steps 4 and 5 passing IS the visible proof of approval->regen.
**API-level evidence (do NOT re-run; cross-check read-only):** the adversarial matrix was exercised at the API layer and its evidence is journaled. Verify these event IDs exist in `/home/nolan/ping/var/fyd-ownerloop-journal/events.jsonl` (read the file, do not write):
- `APPROVAL_SUPERSEDED` — `ef62c86d29f7b541bb4f6ad42c81f2ad1205c21c91181e6831fcbeaf5cfce369` (STALE -> 409 stale_digest)
- `APPROVAL_DENIED` — `3f5052bc00d34da9f9c369abc43cea1d702d732c6bde3e6b4038f1c1e2c33baf` (DENY path; target untouched)
- `APPROVAL_EXPIRED` — `07915825e23a0dfeec77ce5b58f6eed931d0c31be05bfbd46d52f177e9e2b286` (TIMEOUT path; no state change)
- Overlays: `fyd-ovl-mummdrwn-2aae5eb60e2d` (step1 hide-locations, intent `pi-0eaa4fff820090c6`), `fyd-ovl-mummfg1q-ef5b62c2ad9e` (step2 services-first), `fyd-ovl-mummg29d-6ab48fa66fb1` (3a move-cta, intent `pi-d9bba96c8a57e391`)
**Pass:** rendered state matches steps 4-5 AND all six journal events are present with the owner-named types above.

## Step 7/8 — source refresh + customization survives
**What to check:**
1. The refresh marker is visible in the page: search rendered text for `[owner-loop source refresh 2026-09-29]`. It appears in the service-area line: "Benton, Linn, Marion & Polk Counties. [owner-loop source refresh 2026-09-29]" (curl baseline: 17 "refresh" occurrences in served bytes).
   - Clarification: the literal token `x17` does NOT appear in served bytes or the journal. W2's "marker x17" is read as "the refresh marker, x17 occurrences" — assert the marker TEXT, not an `x17` string.
2. Owner directives still in effect after the refresh: Locations absent (step 4 assertions) AND CTA-first/Services-second order intact (step 5 assertions).
**Pass:** marker text found in rendered page AND both directives hold.

## Step 9 — last-good: kill gateway -> regen fails -> keeps serving
**PROCEDURE — parent runs at execution time; requires infra authorization. Do NOT run unattended.**
1. Snapshot: `curl` the full `/sites/happy-place` HTML from the Pig; record sha256. Screenshot the page at 1440.
2. Identify the journal gateway process on `:18201` and record its exact start command BEFORE touching it (WS3 did not capture the gateway's launch line — the parent must).
3. Stop the gateway. (Expect: customize regen calls fail.)
4. Attempt a regen via the customize API; assert it returns `ok:false` with `WRONG_JOURNAL` and `lastGood:true` (do not retry on failure — a different failure mode is a finding, not a retry).
5. Re-curl `/sites/happy-place`; assert sha256 is byte-identical to the snapshot (last-good keeps serving). Re-screenshot at 1440; assert no visual change.
6. Restart the gateway with the recorded command; assert `:18201/` returns ok:true again.
7. Regen again; assert `ok:true fresh:true` and the page is unchanged (sha256 still identical).
**Pass:** gateway-down regen fails closed (WRONG_JOURNAL + lastGood:true), served page byte-identical throughout, gateway-up regen succeeds with page unchanged.
**Caveat:** the ask lane's base-pinning guard 503s on source refresh by design (base_digest_mismatch); re-observation belongs to the ask lane — do not touch it during this procedure.

---

## Out of scope (documented, not provable here)
- W2's broken sub-boundary: the strict "Ask-drafted proposal -> F1 approval surface" path is broken (live Ask hard-codes `grants:[]`; AskProposal/SitePatchOperation vs SitePatchBody vocabulary mismatch). The conversational F1 path carries the product requirement. No browser proof can or should attempt the strict path.
- Console-error expectations for :3214 were not baselined by L3 (L3 certified :3100). Record console errors per viewport during the proof; treat them as observations, not failures, unless the page visibly breaks.

## "Pass" summary per step
| Step | Pass = |
|---|---|
| 4 | No Locations section in DOM or view, all widths |
| 5 | h2 order CTA("Start the conversation") -> Services -> About -> Gallery -> Contact -> Find us, all widths |
| 6 | Steps 4-5 hold + 6 journal events present with owner-named types |
| 7/8 | Refresh marker text visible + both directives hold |
| 9 | Gateway-down regen fails closed, page byte-identical, gateway-up regen succeeds |
