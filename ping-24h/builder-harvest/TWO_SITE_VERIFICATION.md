# Two-Site FYD Test Surface: Independent Verification Record

Date: 2026-09-28 ~18:50 MDT (2026-09-29T00:50Z)
Verifier: independent subagent (not the builder-harvest lane)
Status: VERIFIED LIVE with stated caveats. Nothing here is taken from lane self-reports; every claim below was re-proven against served bytes.

## Source / build / serve binding

- Source tree: /home/nolan/projects/ping (Pig WSL)
- Branch: fyd/builder-harvest-trackc-2026-09-28
- HEAD: f877c3919941978f07d5014909595df4751ec258 (committed 2026-09-28 16:59 MDT)
- Build: .next/BUILD_ID DqZQX-gQgkpciv6rpLgG3, built 2026-09-27 21:00 MDT
- Served process: pid 23046, next-server v15.5.24, started 06:38 MDT 2026-09-28, listening *:3100
- BUILD SKEW NOTE: the served build predates the branch HEAD. The live mutation contract verified here is the Lane D customize path (parse/approve/clear), which is in the build. Track C's src/fyd/sitepatch/ (10-op vocabulary, approval-seam) is source-only: no served route imports it. Do not claim the sitepatch module is live.
- Journal: FYD demo journal gateway, 127.0.0.1:18199 (pid 64173), append-only JSONL at <repo>/data/fyd-journal/events.jsonl
- Projections: /home/nolan/ping/var/fyd-projections/<site>.json (rebuilt by tools/fyd-site-projection/dump.py)

## Private reachability

- Windows portproxy present: 100.79.154.43:3100 -> 172.21.65.209:3100 (WSL)
- Tailnet-only path confirmed via egress proxy; no public exposure introduced by this verification
- The :3211/:3213 lane dev servers are bound to 127.0.0.1 only and are NOT part of the test surface

## The two private URLs

- http://100.79.154.43:3100/sites/happy-place
- http://100.79.154.43:3100/sites/coppersmith-plumbing
  (/sites/coppersmith returns 307 to the canonical -plumbing slug)

## Demo owner mode (unmistakable test harness)

- Process env of the :3100 server contains NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 (read from /proc/23046/environ, not trusted from the launch command)
- Both site pages render a "Generated site demo" header
- Every approve response carries: "DEMO OWNER MODE - not real authentication. No identity was verified; this mode is for localhost/private-network demonstration only."
- Journaled approvals are stamped approvedBy "demo-owner (seeded, unverified)"

## Served-byte digests (fetched through the proxy, hashed locally)

- happy-place: e3ea19622981f388e67a93a74a6b9359e47bf466ea8257d4b59e8ab71cbe891d (130690 bytes page shell; final post-undo state)
- coppersmith-plumbing: 6517e03318f2a55cf0e717e23700afd81c3ed09f025e00e0c8423892537ac2b7 (159636 bytes)

## Proof results

### (a) Refresh returns the same result: PASS
Two consecutive fetches of each site, sha256 compared: identical for both sites.

### (b) Visual reorder == plain-English reorder: PASS
Plain-English path (live HTTP): POST /api/fyd/customize {action:"parse", siteId:"happy-place", text:"Move Contact to the top"} resolved to siteIntent {"kind":"reorder_section","pageSlug":"home","sectionId":"home:Contact:4","toIndex":0}, proposalDigest b78821def6cc66907d131a30420deeb64a651ff8f802216a814f90b49c51f9e9.
Visual path (live execution on the Pig): the exact typed intent the editor's drag/Up handler emits was run through proposeSitePatch against the real happy-place spec via jest with the repo's CSS stub config. Resulting proposalDigest: b78821def6cc66907d131a30420deeb64a651ff8f802216a814f90b49c51f9e9. Byte-identical. Same typed input, same pure function, same canonical patch, same digest, same mutation contract. (Code inspection confirms the parse path calls proposeSitePatch internally: src/fyd/customize/propose.ts proposeFromSiteIntent.)

### (c) Owner correction survives regeneration: PASS
The pre-existing owner directives (edit_copy "Emergency Services" heading pi-82b6c64f99149682; set_featured pi-b9d3ea837d2e222e) survived two full projection re-dumps and remain in served bytes ("Emergency Services" present in the served HTML). Base graphDigest stable across dumps (40ad3c430350...); base digest eacaa6113180... stable. Regeneration is deterministic.

### (d) Undo as an authorized append-only transition: PASS
After approving the Contact-first move (intentId pi-dd15109312187b42, journal event fyd-ovl-mulxaxri-c3dbf3e08b33, specDigest 19b32914ca9d0fc5dc1cd6b1e0c85ed777c3860b31f92dac1975ff617c8b49bc, served digest 24211990dc4adbbf4b99783807cbef0d00c6d248a7789b59cc33b4acae8f3fdf with Contact first in bytes), the inverse was issued as a NEW journaled transition: POST {action:"clear", intentId:"pi-dd15109312187b42"} -> event fyd-ovl-mulxdrme-8013374d3d29 (op clear_presentation_intent). The journal was never rewritten; history is intact (30 overlay events). After re-dump: specDigest returned to bacad15427d3e64d15d3d24d9f4d792a4fc49346b5dbe0586e6f34f1994074a6 (byte-identical to the pre-move baseline) and the served page returned to e3ea19622981f388e67a93a74a6b9359e47bf466ea8257d4b59e8ab71cbe891d (byte-identical). Undo is a transition, not a UI stack.

## Prior lane claim corroboration

The builder-harvest lane's "Move contact to the top" on coppersmith-plumbing is independently corroborated: the live journal-backed projection shows Contact first with directive pi-06d2931650907ebd and event fyd-ovl-mulutp2p-c082dc1d86c7, exactly the intentId and eventId the lane reported. Untouched by this verification (specDigest 594ae3adf3dd527c... unchanged).

## Surface inventory (all probed live on :3100)

- Object navigation: /o/<objectId> 200; /api/fyd/objects/<id>?siteId=happy-place 200 (object view with schema, evidence-labeled fields); /dev/objects 200
- Ask FYD: POST /api/fyd/ask/happy-place {"question":"What services does Happy Place offer?"} -> ok:true, evidence-backed answer with 5 evidence refs
- Why this/evidence: GET /api/fyd/why-this?siteId=happy-place&objectId=website-business-6fa5ebd99d72c4cb -> found:true, claim "Happy Place Carpentry LLC", support DIRECT, source the business site
- Customize: POST /api/fyd/customize parse/approve/clear, demo-gated (403 without the flag+private host)
- Approve path: probed live, works, demo-stamped. Reject: no explicit deny action exists; an unapproved proposal is simply never applied (parse without approve is the implicit reject)
- Version/history: journal events carry event_id, timestamp, tenant_id, aggregate_id; projection meta carries overlayEventIds, presentationIntentDigest, dumpedAt; the inspect view lists every directive with intentId, proposalDigest, approvedBy, approvedAt, eventId

## Mobile fix: NOT committed (stated plainly)

The candidate one-liner (src/app/layout.tsx: add suppressHydrationWarning to the <html> element) is identifiable in the dirty tree and IS live in the served :3100 bytes (React Flight data contains "suppressHydrationWarning":true), but no test pins it, no record attributes it as the requested mobile fix, and the tree is frozen. Per instructions, nothing was committed. Follow-up for the owning lane: attribute the fix with a failing-then-passing test before committing it anywhere.

## :3100 restart house rule

:3100 was NOT restarted during this verification (healthy, demo flag verified live in process env). The rule stands for any future restart: only via /home/nolan/start-3100.sh from non-PTY ssh, then verify NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 in the running process env and probe the approve path.

## Known operational wrinkle (flagged, not fixed)

Approve -> serve is NOT automatic. The projection dump must be re-run after every approve/clear (FYD_OVERLAY_JOURNAL=demo python3 dump.py <site>), because the dump defaults to the :8080 main gateway, which is currently 503, so the default mode fails closed with WRONG_JOURNAL. Until an approve-triggered re-dump exists, owner changes sit journaled-but-unserved. This is the highest-leverage follow-up for the test surface.
