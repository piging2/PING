# FYD MISSION GO — FIRST EXECUTION RESULT (2026-09-27 ~20:04-20:15 MDT)

## Authorization
Nolan's continuous autonomy directive (GRILL-LOCKED-2026-09-27.md, ~20:06 MDT):
proposal `p0prop-ac04480a6d1809fd`, digest
`5c1d873706c14c7c3c7b5ded02bb73924419e4cdf3e17f6dc6bc98795731e7aa`,
APPROVED with exact-transition binding PROPOSAL A -> DIGEST A -> APPROVAL A -> EXECUTE A.

## Chain (all with evidence)

1. **Reobservation (no write before):** GET /api/mc/approvals?proposal_id=p0prop-ac04480a6d1809fd
   -> status WAITING_APPROVAL, recorded digest 5c1d8737... Recomputed sha256
   over the stored canonical proposal bytes -> 5c1d8737... MATCH.
   Approved bytes (A): {mission_id: mc-m-c5b2c89b4ff7, page_slug: home,
   section_id: home:Services:2, presentation: {heading "Emergency Services",
   copy "Get in touch with us for urgent repairs at Happy Place Carpentry LLC.
   We're always ready to help, but we can't promise response speed or ranking.",
   featuredIds ["website-business-6fa5ebd99d72c4cb-service-cd28e52699a5"]}}.

2. **APPROVAL A (canonical transition):** POST /api/mc/approvals
   {proposal_id, digest (exact), decision approve, approver "nolan:owner"}
   -> {ok true, idempotent false, status APPROVED, decided_at 2026-09-28T02:04:52Z,
   decided_by nolan:owner}. Event MC_APPROVAL_APPROVED mc-apr-f72e6567b76b6855
   appended to /home/nolan/workspace/fyd-journal-gateway/events.jsonl.

3. **EXECUTE A:** Journaled FYD_SITE_OVERLAY fyd-ovl-muklxc7l-333f04fa678b to the
   Pig FYD demo journal (:18199 -> /home/nolan/projects/ping/data/fyd-journal/events.jsonl)
   with 2 directives expressing EXACTLY A's content (format-translated to
   SitePatchBody; no content change):
   - pi-82b6c64f99149682: edit_copy, heading+copy on home:Services:2
   - pi-b9d3ea837d2e222e: set_featured, [website-business-6fa5ebd99d72c4cb-service-cd28e52699a5]
   Each directive's proposal self-digest verified; approval block cites the MC
   approval (p0prop-..., 5c1d8737..., GRILL-LOCKED-2026-09-27).

4. **Regeneration:** Projection dump re-ran:
   /home/nolan/ping/var/fyd-projections/happy-place.json
   (base eacaa6113180.., 28 overlays, 4 intents, intentDigest 9698ed1b04d6..).
   Required a one-line fix to dump.py (see below). Inspect confirms both
   directives APPLIED (appliedIntentIds [pi-82b6c..., pi-b9d3...]); the 2
   pre-existing stub directives remain unresolved (not mine, untouched).

5. **Served result:** GET :3100/sites/happy-place -> H2 "Emergency Services"
   (was "Services"), approved copy present, featured Restoration object
   (website-business-6fa5ebd99d72c4cb-service-cd28e52699a5) rendered first
   in the Services grid. Before-state captured: 0 mentions of "Emergency Services".

6. **Refresh persistence:** Re-fetched approval (status APPROVED, stable) and
   served page ("Emergency Services" present, stable).

7. **Replay:** All six steps re-verified above from live reads.

## Fixes made during execution (flagged, not hidden)

a) **dump.py tenant-param defect** (real, reproduced): the demo-journal overlay
   query did not pass the gateway's required ?tenant= param -> 400 -> dump
   fail-closed (exit 2). One-line patch to
   /home/nolan/projects/ping/tools/fyd-site-projection/dump.py:316
   (added &tenant=<site>). Uncommitted; owning lane should commit.
   Pre-existing defect, not caused by this execution.

b) **My malformed overlay event:** first journaled version carried
   approval.proposalDigest = MC digest, violating the dump invariant
   (approval.digest == proposal.digest) and lacking the DEMO OWNER MODE
   transport marker -> dump fail-closed. Corrected in place (same event_id,
   same intentIds, same content; approval blocks fixed):
   journal sha256 before 15e15cf5..., after 6f6c75f1....
   Demo journal only; no canonical PING events touched.

## Notes
- No :3100 restart, no served-tree commit, no runtime config change. All
  operations were normal API/journal/dump operations.
- The Pig SSH transport wedged once (~39 min hang, killed); recovered on retry.
- UER/IdentityAuthority direct Pig-side rebind still pending (was in flight
  when transport wedged); REALITY-MAP.md caveat stands.
