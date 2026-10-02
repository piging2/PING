# WS4 progress — 2026-09-29 (final)

## Part (a) L4 courtroom — PASS
Deliverable: ~/workspace/fyd-90h/hidden_files/ws4-courtroom-20260929.md
- W1 harness dir missing (worktree removed); gap-driven re-verification on served :3100 (read-only Ask POSTs).
- Supported chain traced end to end (question -> answer -> claim -> evidence -> object -> observation -> source), all links resolvable (served /o/{id} -> 200, source URL -> 200, 2 runs byte-identical).
- UNKNOWN inverse: refusal=true, zero citations, byte-identical x2.
- Privacy: owner-mode street-address probe coarsened to city/state; structural (no street fields in projection).

## Part (b) convergence — PASS
Deliverable: ~/workspace/fyd-90h/hidden_files/ws4-converge-20260929.md
- Fresh Pig worktree /home/nolan/projects/ping-ws4-converge @ 3235804d; own journal gateway :18202 (store /home/nolan/ping/var/fyd-ws4-journal/, marker fyd-demo-journal@5840fc9e9179); own projection dir; preview :3215. :3214, its journal, and :3100 untouched.
- ONE LOW change via existing /api/fyd/customize: "hide the locations section" -> parse -> approve (request_id ws4-converge-001) -> intent pi-0eaa4fff820090c6 -> journal fyd-ovl-mumqe75e-b455597453b4 -> regen ok:true fresh:true.
- (1) Site HTML: "Where we work" gone. (2) Ask: 200/KNOWN, no fail-close; projection carries overlayEventIds + presentationIntentDigest; location question still answered from objects (truth separation). (3) Inspect read view: home:Locations:3 hidden:true, directive with matching eventId/digests.
- Decision 1: journal event presentation-only; graphDigest == baseDigest; delete + re-dump reproduces all canonical digests (only dumpedAt volatile). Mission Control = next projection (narrative-only FYD refs, no live read).

## Part (c) UX policy note — DONE (doc only)
Deliverable: ~/workspace/fyd-90h/hidden_files/ws4-ux-policy-20260929.md
- LOW: light path (review card = confirmation), undo via clear. MEDIUM: no path today, 422 unresolved is the enforcement. HIGH: refused before proposal; denials belong in the denial journal. Theme-token directives refused per the lane's layer law.

## First broken product boundary
None broken in WS4's scope. Noted finding (not a break): Ask answer text cannot reflect presentation overlays by architecture (layer law); the honest convergence signal is the shared projection carrying the intent, which held.
