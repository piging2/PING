# WS4 convergence proof — ONE CHANGE -> SITE + ASK + SEARCH CONVERGE
**2026-09-29 ~08:15 MDT.** Verdict: **PASS.**

## Setup (preview only; :3214 and its journal untouched)
- Fresh Pig worktree `/home/nolan/projects/ping-ws4-converge` @ `3235804d` (W2's commit, detached). `node_modules` symlinked from the W2 worktree (same commit, read-only reuse). No commits, no pushes, no merges.
- Own journal: gateway `tools/fyd-journal-gateway/server.mjs` on **:18202**, store `/home/nolan/ping/var/fyd-ws4-journal/events.jsonl`, live marker `fyd-demo-journal@5840fc9e9179` (distinct from :3214's :18201 store). Zero reads/writes to `/home/nolan/ping/var/fyd-ownerloop-journal/`.
- Own projection dir `/home/nolan/ping/var/fyd-ws4-projections` (base dump: 0 overlays, base `7af2fab47d4e..`).
- Preview `next dev` on **:3215** with `FYD_OWNERLOOP_REGEN=1`, `FYD_CUSTOMIZE_GATEWAY_URL=http://127.0.0.1:18202/events`, `FYD_PROJECTION_DIR=/home/nolan/ping/var/fyd-ws4-projections`, `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1`.
- :3100 never touched (no restarts, no writes). :3214 never touched (still running its own process/journal).

## The ONE change (through the existing conversational surface only)
Owner text: `hide the locations section` — Decision 3 LOW tier (section visibility).
- `POST /api/fyd/customize` `{action:"parse"}` -> 200: `hide_section` parsed, resolved to `toggle_section` on `home:Locations:3` (`hidden:true`), proposal `site_patch` digest `a61fd86ca6b45987a1b32eafbcfbd016eb41cee871461f5992d03181513444e9`, review card "Hide section" (visible -> hidden), `consequenceTier:"LOW"`.
- `POST /api/fyd/customize` `{action:"approve", text, proposal, request_id:"ws4-converge-001"}` -> 200: digest re-derived and matched; journaled intent `pi-0eaa4fff820090c6` as journal event `fyd-ovl-mumqe75e-b455597453b4`; approve->regen seam ran `dump.py`: `ok:true, fresh:true, overlayEventCount:1`, `presentationIntentDigest a56605fc9df04701371f2f3eaf6c5c61c10f5d9db77641b8032e566d255a79d0`.
- No new machinery: parse/approve/clear/inspect are the W2 surface, unchanged.

## Surface 1 — FYD site HTML (:3215 /sites/happy-place)
- Before: h2 list included `Where we work` (the Locations section heading).
- After regen: served page (227,152 bytes) has **zero** occurrences of `Where we work`; all other sections present (`About Happy Place Carpentry LLC`, `Services`, `Gallery`, `Contact`, `Find us`, `Start the conversation`, Ask, Customize).

## Surface 2 — Ask FYD (:3215 /api/fyd/ask/happy-place)
- Services question -> 200, `KNOWN`, same answer text, 5 citations. Location question (`Where is Happy Place located?`) -> 200, `KNOWN`, answered `Adair Village, OR, US` with citation [8] to the location object — **even though the Locations section is hidden on the site**. This is correct truth separation: the overlay changed presentation, not facts, and Ask correctly still knows the location.
- **Honest caveat (carried, not hidden):** Ask answer text does NOT reflect presentation overlays — by architecture (the frozen layer law: the customize lane never writes facts; Ask answers from the object graph). What Ask's data source DOES reflect: the same served projection JSON Ask reads via `ping-object-source.ts` now carries `overlayEventIds: ["fyd-ovl-mumqe75e-b455597453b4"]` and `presentationIntentDigest: a56605fc...`. Ask did NOT fail-close (W2's `base_digest_mismatch` guard fires on source refresh, a different operation not performed here; the owner overlay leaves `baseDigest` untouched).
- Finding: for a LOW-tier presentation change, "Ask sees new state" is true at the substrate level (shared projection carries the intent) and correctly false at the answer-text level (facts unchanged). This is the designed behavior, evidenced.

## Surface 3 — already-existing read projection
`GET /api/fyd/customize?siteId=happy-place&view=inspect` (the surface's own owner-state read view; nothing new built):
- `home:Locations:3` -> `hidden: true`; `specDigest f5e905b1...` (base `ebbec469...` unchanged).
- `directives[0]`: `intentId pi-0eaa4fff820090c6`, `siteIntent {toggle_section, home, home:Locations:3, hidden:true}`, `proposalDigest a61fd86c...` (matches the parse-time proposal), `eventId fyd-ovl-mumqe75e-b455597453b4`, change before/after `visible -> hidden`, `appliedIntentIds: [pi-0eaa4fff820090c6]`, `unresolved: []`.

## Decision 1 layering assertion (evidenced)
- The single journal event (`fyd-ovl-mumqe75e-b455597453b4`, 1 line in my journal) carries ONLY `set_presentation_intent` (siteIntent + proposal + approval). Zero business facts, zero object mutations.
- `graphDigest == baseDigest` (`7af2fab47d4e29d2a2539b5102b2101f599d7c90707aea98d39c2072de1bcebc`) in the served projection: the object graph is byte-identical before/after the owner change.
- Rebuildability: deleted the served projection JSON and re-ran `dump.py` against the journal — all canonical digests reproduced exactly (`baseDigest`, `graphDigest`, `overlayEventIds`, `presentationIntentDigest a56605fc...`); only the volatile `dumpedAt` timestamp differs. The projection is a rebuildable derivative of (fixture + journal), not a second truth store. No FYD-local business truth was created at any point.

## Mission Control
Checked: `src/app/mission-control/page.tsx` is a client-side technology dashboard; its only FYD references are two narrative strings about Ask FYD pages. It does not read the FYD overlay journal or the projection. Wiring it would need new architecture — per Decision 4 it is recorded as the **next projection**, not included.

## Verdict
- **(b) CONVERGENCE: PASS.** One journal transition -> site HTML changed, Ask's serving substrate carries the intent (answer text correctly unchanged), the existing inspect read projection shows the directive. Decision 1 layering evidenced. Mission Control = next projection.

## Running infrastructure (left up for parent inspection)
- Journal gateway :18202 (PID via setsid; log `/home/nolan/ping/var/fyd-ws4-journal/gateway.log`)
- Preview :3215 (`next dev`, log `/home/nolan/ping/var/fyd-ws4-journal/preview-3215.log`)
- Stores: `/home/nolan/ping/var/fyd-ws4-journal/`, `/home/nolan/ping/var/fyd-ws4-projections/`
- Worktree: `/home/nolan/projects/ping-ws4-converge` @ 3235804d (clean, no commits)
- Evidence files (Pig /tmp): `ws4-*.json`, `ws4-base.html`, `ws4-after.html`
