# Wave 2 status — 2026-09-29 ~05:49 MDT

## L3 verdict: GREEN (served render boundary certified)
- Source: sibling L3 browser-proof worker; full report ~/workspace/fyd-90h/hidden_files/l3-render-proofs-20260929/
- #418 hydration PASS: 15/15 regular widths, 3/3 incognito single-width, CLS 0.0, zero errors on site pages.
- Edge-object Q-J-01/02/03 PASS end to end on served bytes (discover → tap → typed info + evidence → relationship traversal → Back).
- Strict-criterion reds (NOT boundary breaks; Decision 4 cutover stays RED until gated):
  1. `/` control: 1 console error (404 missing responsive image derivative /fyd-media/…/w480-480w.webp) — site pages clean.
  2. Incognito proven at 1 width (1440), not 5.
  3. Smallest touch target 43px vs 44px invariant on #ask doorway (subpixel rounding).
  4. Desktop 1440 dialog peek extends below viewport (scrolls internally; strict containment check fails).

## Certification sequence position
- Steps 1 (served render) and 2 (edge object path): GREEN.
- Step 3 (Ask FYD with resolvable evidence): IN PROGRESS — W1 (L4) sent certification go-ahead at ~05:49 MDT after L3 green.
- Steps 4-9 (owner loop chain): W2 prepping on preview port in parallel.
- Supporting streams: W3 TOCTOU-A, W4 DependencyIndex seeding, W5 projection-reader seam — all running.

## First broken product boundary (Wave 2, current)
- None yet in steps 1-2. Step 3 pending W1 certification result.

## W4 DEPENDENCYINDEX SEEDING: PASS (completed ~05:53 MDT)
- Evidence: 10/10 proofs green + clean-checkout replay 10/10; rebuildability proven (canonical strings identical after discard+rebuild); clean-rebuild equivalence proven for service rename and owner rename; fail-closed on membership-changing edits (throws, no partial site); 76/76 existing proceduralize tests pass (one pre-existing unrelated failure in presentation-wiring.test.ts, identical with changes stashed).
- Scope discipline held: static snapshot per generation, no reactive engine, no new authority.
- Worktree: /home/nolan/projects/ping-wave2-depidx, branch wave2/w4-dependency-index-seeding @ 5e2c12c. Main checkout untouched.

## WORKING-LINE CORRECTION (verified by coordinator ~05:55 MDT, supersedes plan)
- The plan's stated working line fyd/builder-harvest-trackc-2026-09-28 @ f877c391 DOES NOT EXIST in /home/hatch/workspace (no such commit, no such branch; `git cat-file -t` fails). The Wave 1 "direct SSH verification" claim is falsified for this repo.
- /home/nolan/projects/ping currently symlinks to /home/hatch/workspace/.worktrees/l2-spec/tree (stale Wave 1 L2 worktree pointer) — NOT the main checkout. Anyone following the plan's path lands in the wrong tree.
- VERIFIED working line: a0f3724 (branch security/secret-redaction-2026-09-28, main checkout HEAD). Contains the FYD generator (fyd-product-lane/src/fyd/proceduralize/generator.ts EXISTS at a0f3724); fyd/builder-rebuild-v1 tip 85faad1 is an ancestor of a0f3724. Main checkout has 1834 dirty entries (worse than plan's ~70).
- Worker dispositions: W1 and W3 on a0f3724 (correct). W4 on ancestor line fyd/builder-rebuild-v1 (content-compatible; final diff must be portable to a0f3724). W5 was building in a non-git directory — corrected, re-dispatched to a fresh worktree off a0f3724.
- W4's final integration must target a0f3724, not its ancestor branch.

## W1 ASK FYD CERTIFICATION: PASS (completed ~05:55 MDT)
- Served Ask on the L3-certified :3100 path (Pig WSL :3100 via tailnet, build 2BFLbt5EHFUJeXfd0E6zT): 11/11 both passes, byte-identical.
- Supported (5): all KNOWN; every citation id resolves via served /o/{id} -> 200; every citation source URL and answer URL fetches 200. S1 carried 5 citations, S4 carried 4, all resolved.
- Unsupported (4): all UNKNOWN, refusal=true, zero citations/URLs/markers, honest phrasing.
- Privacy (2, owner mode): street address coarsened (city/state/ZIP only), no leak in text/labels/objectRefs.
- Ask suites 229/229 x2 from clean checkout (count differs from Wave 1's 245/245 by line, not a failure).
- Harness: /home/nolan/projects/ping-wave2-l4/ask-cert/ (certify.sh re-runnable). Dead compileAskContext() untouched; live buildAskFydContext() verified at visitor-answer.ts:649, tracer.ts:935.
- Disclosed: minimal read-only GETs to citation URLs including happy-place-platform.vercel.app (200 checks only, required by the "resolvable URLs" criterion; no modification, no other contact).
- Decision 4 cutover stays RED on L3's strict-criterion reds (unchanged).

## Certification sequence position (updated)
- Steps 1-3 GREEN: served render, edge object path, Ask FYD with resolvable evidence.
- Steps 4-9 (owner correction -> conversational change -> approval -> regeneration -> source refresh -> customization survives): W2 running on preview port.
- Supporting: W3 TOCTOU-A running, W5 projection-reader re-dispatched to clean worktree.
- First broken product boundary: NONE in steps 1-3. Sequence advances to step 4 when W2 delivers.

## W5 PROJECTION READER SEAM: PASS (completed ~06:01 MDT; worker final message garbled, verified via worktree + session transcript)
- Deliverables in /home/nolan/projects/ping-wave2-projreader2 (fresh worktree, detached a0f3724; staged, uncommitted):
  - projection-reader.ts (new): ProjectionReader interface with the naming law in its header — journal is the authority; a projection is one disposable representation; the word "authority" never attaches to a projection.
  - file-dump-projection-reader.ts (new): FileDumpProjectionReader, today's physical implementation.
  - projection-verify.ts (new): fail-closed snapshot verification (parse, siteId match, provenance refs, graphDigest recompute, presentationIntent/fieldVisibility digests); canonicalBytes with volatile fields excluded; snapshotDigest + sourceDigest.
  - default-reader.ts (new); ping-object-source.ts (modified): consumer converted to the seam.
- Naming audit (independently verified): ZERO occurrences of "projection authority"/"projectionauthority" in fyd-product-lane/src and docs.
- Proofs (from worker session transcript): determinism — same history, two dump runs, snapshotDigest identical (cbd5208bb90e120b731b601b…), sourceDigest identical, byte-identical canonicalBytes; int-proof.js — 11 checks against the REAL dump.py.
- Honest caveat (worker's own): proofs ran against a fixed stub-journal history, not the live journal; live-journal replay needs the real gateway. Acceptable for the 90-hour proof stage; seam mechanics proven.
- W5 was re-dispatched mid-stream after building in a non-git directory; final work is in the clean worktree.

## W3 TOCTOU OPTION A: PASS (completed ~06:03 MDT)
- Implementation: src/fyd/net/safe-fetch.ts — per-hop pinned lookup via harvested undici 6.28.0 Agent({connect:{lookup}}) + fetch dispatcher. No custom HTTP stack. Per hop: parse URL -> scheme allowlist -> credential rejection -> resolve -> classify every address -> single-hop pinned dispatcher over validated set -> fetch; redirects re-validated + re-pinned independently; bounded by maxRedirects; fail closed everywhere. Invariant: buildPinnedLookup() never consults DNS, so validated destination = connected destination.
- Battery (clean-checkout replay @ d312f49): 131/131 green, 6/6 suites — ssrf-adversarial 72/72, safe-fetch 38/38, toctou-pinning 20/20 (new), toctou-no-undici 1/1 (new); hostile 17/17 green. New cases: rebinding DNS cannot steer socket, redirect hops re-pin, redirect-to-private rejected pre-fetch, scheme smuggling battery, dispatcher closed once per hop, undici-missing fail-closed.
- Q-J-04 contract: 12 pass / 4 fail-by-design, unchanged (C6/C7 are observation-shape gaps Option A does not close; left as-is).
- Pre-existing failures (proven not W3's): 4 claim/onboarding suites fail at ts-jest @/ resolution, byte-identical with pristine safe-fetch.ts.
- Environment deviation (honest): working line f877c391 absent; seam files existed only as untracked lane work. Worked in fresh worktree /home/nolan/projects/ping-wave2-toctou off a0f3724, branch w3/toctou-pinned-lookup, committed d312f49 (self-contained 4-file seam diff; needs cherry-pick onto the real line at integration). package.json note: base had none; only the "undici": "6.28.0" line needs adding on the real line.
- No pushes, no :3100, no HPP, no customer contact, no spend.

## Wave 2 scoreboard (updated ~06:03 MDT)
- W1 Ask certification: PASS | W3 TOCTOU-A: PASS | W4 DependencyIndex: PASS | W5 projection seam: PASS (stub-history proofs)
- W2 owner-loop chain (steps 4-9): RUNNING
- Certification sequence: steps 1-3 GREEN. First broken product boundary: none in steps 1-3.

## CORRECTION: working line f877c391 EXISTS — on the Pig (recorded ~07:30 MDT)
- The coordinator's earlier "falsification" was sandbox-scoped and WRONG as a global claim. W2's session transcript proves: at 11:48 UTC it ran `git worktree add /home/nolan/projects/ping-wave2-ownerloop f877c391` **on the Pig via SSH** (exit 0: "Preparing worktree (detached HEAD f877c391)"), and at 12:08 UTC committed **3235804d** there (exit 0). The plan's working line fyd/builder-harvest-trackc-2026-09-28 @ f877c391 is the Pig repo's line.
- Two-repo reality: sandbox /home/hatch/workspace (a0f3724, lacks f877c391) vs Pig /home/nolan/projects/ping (has f877c391). W2 worked on the Pig (correct line). W1/W3/W4/W5 worked in the sandbox on a0f3724 — their proofs are valid for the code tested, but their diffs need cherry-pick/rebase onto f877c391 at integration (W3 already flagged this for its 4-file diff).
- Re-verification of the Pig repo state is BLOCKED by transport: hatch-egress-proxy:3130 refused CONNECT twice ("nc: proxy read: Broken pipe") ~07:30 MDT. Proxy-layer event; Pig state UNKNOWN, not failed. No alarm per standing rules.
- W2's "errored" status was purely the runtime restart drain killing final delivery; the work completed and committed (3235804d) before that. Final report recovered from the worker's session transcript (below).

## W2 OWNER-LOOP CHAIN: PASS with one broken sub-boundary (completed ~06:08 MDT on Pig, preview :3214, journal gateway :18201)
- Step 1 owner correction ("hide the locations section"): PASS. F1 toggle_section, approval -> intent pi-0eaa4fff820090c6 -> journal fyd-ovl-mummdrwn-2aae5eb60e2d -> regen ok:true fresh:true. Served bytes: 226,155-byte page, Locations hidden, no "Where we work" in headings.
- Step 2 conversational change ("move the services section first"): PASS via conversational F1 path (/api/fyd/customize parse -> reorder_section -> approval -> intent -> regen). Served bytes: first h2 is "Services".
- Step 3 adversarial matrix: PASS, all fail-closed. STALE -> 409 stale_digest (APPROVAL_SUPERSEDED journaled); TAMPERED -> 409 proposal_altered (no denial event: validation failure != policy denial); TIMEOUT -> APPROVAL_EXPIRED journaled, no state change; DENY -> APPROVAL_DENIED journaled, target untouched. Terminal-first: re-submitted approval -> idempotentReplay, same intent/event, overlay count 3.
- Steps 4/5 source refresh -> customization survives: PASS. Source marker added; re-dump new base 7af2fab47d4e; all 3 owner directives preserved; served page shows marker x17, h2 order CTA -> Services -> About -> Gallery -> Contact -> Find us, Locations still hidden.
- Step 6 last-good: PASS. Killed journal gateway -> regen ok:false (WRONG_JOURNAL) with lastGood:true, sha256 identical (46c0a87f…); restarted -> regen ok:true fresh:true, page unchanged.
- Tests: 5/5 new, customize 112/112, ask 245/245, tsc 0 errors.
- Denial journal: APPROVAL_SUPERSEDED / APPROVAL_DENIED / APPROVAL_EXPIRED journaled with owner-named types per Phase-1 owner schema (no invented authority).
- FIRST BROKEN SUB-BOUNDARY (W2, honest): the strict "Ask-drafted proposal -> F1 approval surface" path is BROKEN: (1) live Ask hard-codes grants:[] (visitor-answer.ts), so the drafter is unreachable via the live route; (2) vocabulary mismatch — Ask drafter emits AskProposal/SitePatchOperation (object-level: reorder_section_objects, set_presentation), F1 approve surface consumes SitePatchBody (toggle_section/reorder_section/update_props, digest-bound); (3) unification is an ask-lane design change, not a minimal adapter. The conversational F1 path carries the product requirement (owner says -> FYD proposes -> approves -> changes).
- Caveats: W2 is a generic subagent — served-byte evidence via curl, no live browser; real browser proof on :3214 needs delegation. Ask 503 discovery: ask lane's base-pinning guard correctly failed closed on source refresh (base_digest_mismatch); re-observation ceremony belongs to the ask lane.
- No pushes, no :3100 touched, main checkout untouched, no external contact/spend.

## WAVE 2 FINAL SCOREBOARD
- W1 Ask FYD certification: PASS (steps 1-3 of certification sequence GREEN)
- W2 owner-loop chain: PASS with broken sub-boundary (steps 4,6,7,8,9 GREEN; step 5 GREEN via conversational F1 path; strict Ask-drafted->F1 criterion BROKEN)
- W3 TOCTOU Option A: PASS (131/131)
- W4 DependencyIndex seeding: PASS (10/10 + replay)
- W5 projection reader seam: PASS (stub-history proofs; live-journal replay outstanding)
- Decision 4 served cutover: stays RED (L3 strict-criterion reds).
- Integration debt: W1/W3/W4/W5 diffs live in sandbox worktrees off a0f3724; cherry-pick/rebase onto the Pig's f877c391 line needed before they are on the working line. W2 is already on f877c391 (Pig).

## WAVE 3 DISPATCHED (coordinator, ~07:35 MDT)
Three workstreams fanned out, one semantic owner each:
- WS1: close the 4 strict L3 reds (fix 1/3/4 minimally in ping-fyd-converged, rebuild, re-serve :3100 via start-3100.sh only, verify Decision 4 green list, prepare browser protocol; parent runs browser tasks).
- WS2: integrate W3/W4/W5 diffs (+W1 inventory) onto Pig working line f877c391 in fresh per-stream worktrees; per-stream test suites from clean checkouts.
- WS3: check/re-serve Pig :3214 from 3235804d, curl-verify W2 end state, prepare exact browser-proof protocol for steps 4-9; no browser tasks, no new mutations.
Hard boundaries restated in every brief. Browser protocols come back to the parent for browser-task delegation.

## WS3 COMPLETE (~07:45 MDT)
- :3214 UP, no re-serve needed: `node ./node_modules/.bin/next dev -p 3214 -H 127.0.0.1` (PID 78879, since 05:56:37) from /home/nolan/projects/ping-wave2-ownerloop @ 3235804d. Journal gateway :18201 up (6 events; HTTP root-only, cross-check via events.jsonl file).
- Correction: demo page is /sites/happy-place, NOT / (which serves the PING marketing homepage).
- Curl-verified vs W2 end state: Locations hidden MATCH; h2 order MATCH (CTA -> Services -> About -> Gallery -> Contact -> Find us); refresh marker MATCH (17 occurrences of "refresh"; literal `x17` appears nowhere — W2's "marker x17" read as x17 occurrences).
- No broken boundary in steps 4-9 served state; no mutations made. W2's known broken sub-boundary (strict Ask-drafted -> F1) stands, out of browser-proof scope.
- BROWSER PROTOCOL READY: ~/workspace/fyd-90h/hidden_files/ws3-browser-protocol-20260929.md — preview URL http://<WSL-IP>:3214/sites/happy-place (resolve WSL IP fresh), viewports 375/390/1280/1440/1920, step 9 needs runtime infra authorization (gateway launch command not captured).
- WS1, WS2 still running.

## REDIRECT PER NOLAN 07:38 MDT (five binding decisions; plan section appended)
- WS1 STOOD DOWN cleanly ~07:39 MDT: worker closed before any change. Verified: /home/nolan/projects/ping-fyd-converged worktree CLEAN (git status empty, HEAD still 5732485b); :3100 process untouched (PID 90125, started 2026-09-29... actually Mon Sep 28 18:44:48, pre-WS1). Served build 2BFLbt5EHFUJeXfd0E6zT preserved as the L4 courtroom. The 4 strict reds are now cutover debt; Decision 4 cutover RED, NOT on the 90-hour critical path.
- WS2 CONTINUE (integration onto f877c391) — still running.
- WS3 COMPLETE (protocol ready; parent runs the browser task on signal).
- WS4 SPAWNED (~07:47 MDT): thin convergence + L4 courtroom. (a) Package W1 Ask certification as QUESTION->ANSWER->CLAIM->EVIDENCE->OBJECT->OBSERVATION->SOURCE + inverse NO EVIDENCE->NO INVENTED ANSWER (read-only, :3100 untouched). (b) ONE CHANGE->SITE+ASK+SEARCH converge on a SEPARATE preview port (:3214 frozen as WS3 baseline; fresh worktree @ 3235804d, own journal store), one LOW-tier owner change via existing conversational surface, Decision 1 layering asserted, Mission Control only if already clean. Plus UX policy note mapping LOW/MEDIUM/HIGH onto the existing surface (doc only). Constraints: no TenantOS, no new authorities/stores/approval systems.

## WS4 COMPLETE (~07:50 MDT) — PASS/PASS
- (a) L4 COURTROOM PASS: W1's harness dir was gone (worktree removed), so worker re-verified minimally against served :3100 read-only (build untouched). Supported chain traced concretely: "What services does Happy Place offer?" -> KNOWN -> citation website-business-6fa5ebd99d72c4cb-service-3263502c8175 -> /o/{id} 200 -> object (ping.social.service@1, claimKind website_statement, provenance website-ingestion) -> source URL 200. Inverse: wedding-catering probe -> refusal, zero citations. Privacy: coarsened structurally. Doc: hidden_files/ws4-courtroom-20260929.md.
- (b) ONE CHANGE -> SITE + ASK + SEARCH PASS: fresh Pig worktree ping-ws4-converge @ 3235804d, own journal gateway :18202, preview :3215 (:3214/:3100 untouched). One LOW change ("hide the locations section") via existing /api/fyd/customize -> intent -> journal fyd-ovl-mumqe75e-b455597453b4 -> regen ok:true. Site HTML: Locations gone. Ask: 200 KNOWN, projection carries overlayEventIds + new presentationIntentDigest. Read projection view=inspect: home:Locations:3 hidden:true with matching eventId/digest. Decision 1: graphDigest == baseDigest (facts untouched); projection deleted + re-dumped -> canonical digests reproduced. Mission Control recorded as NEXT PROJECTION (needs new architecture). Doc: hidden_files/ws4-converge-20260929.md.
- Caveat (designed, not broken): Ask answer TEXT cannot reflect presentation overlays by the frozen layer law; convergence holds at the shared projection. W2's base_digest_mismatch fail-close is a source-refresh phenomenon, not triggered here.
- UX policy note (doc only): hidden_files/ws4-ux-policy-20260929.md — LOW light path; MEDIUM no path today (422 unresolved); HIGH refused pre-proposal. Lane layer law refuses theme-token directives (LOW-but-refused).
- First broken product boundary in WS4 scope: NONE.
- :18202 gateway + :3215 preview left running for inspection; logs /home/nolan/ping/var/fyd-ws4-journal/.
- WS2 still running.

## WS2 COMPLETE (~07:55 MDT) — all streams PASS
- Topology resolved from SSH-proven facts; f877c391 confirmed on Pig /home/nolan/projects/ping.
- W1: PASS (no-op) — zero staged changes vs a0f3724; only artifact was the untracked ask-cert harness lost with the deleted worktree. Nothing to port.
- W3: PASS — /home/nolan/projects/ping-int-w3 [ws2/int-w3] @ b2a9f7b6 (4 files). Reconciled onto target's safe-fetch.ts; undici 6.28.0 added. Tests 131/131 (6 suites).
- W4: PASS — /home/nolan/projects/ping-int-w4 [ws2/int-w4] @ 5c604dc1 (4 files). Paths remapped fyd-product-lane/... -> src/fyd/proceduralize/; generator.ts ported preserving siteId/Gallery/archetypes/version 1.1.0 (test expectation 1.0.0->1.1.0 adapted). Proofs 10/10; proceduralize 133/134 — the 1 failure ("emits no Gallery section when manifest has no gallery assets") fails on pristine f877c391 too (committed happy-place.json carries gallery assets; in repo TESTING.md known-failing list). Not WS2's.
- W5: PASS — /home/nolan/projects/ping-int-w5 [ws2/int-w5] @ 68e49b64 (7 files). 4 seam modules verbatim; ping-object-source.ts ported with 2 documented deviations (dropped phantom applyOwnerPresentationOverrides import — doesn't exist on trackc line; restored getVerifiedPublicProjection(Sync) Q-C-01 funnel W5's rewrite dropped). New projection-reader-seam.test.ts 5/5; one adjacent regex updated (fail-closed identical). src/fyd failure set byte-identical to pristine f877c391 (stash A/B); src/app/api/fyd 115/115.
- Patches: ~/workspace/fyd-90h/patches/ws2-w3/w4/w5-f877c391.patch (each git apply --check clean vs pristine f877c391).
- No pushes; main checkout untouched; per-stream worktrees; serialized status-first commits. No integration boundary broke.
- Wider note: strict Ask-drafted->F1 remains an Ask-lane design gap (grants:[]; AskProposal/SitePatchOperation vs digest-bound SitePatchBody) — product sub-boundary, not integration's.

## WAVE 3 FINAL (coordinator ~07:55 MDT)
- WS1: STOOD DOWN per Nolan 07:38 (verified clean; courtroom preserved).
- WS2: PASS (W1 no-op, W3/W4/W5 integrated + tested).
- WS3: COMPLETE (protocol ready; parent runs browser task).
- WS4: PASS/PASS (courtroom packaged; one-change convergence proven; UX policy note).
- First broken product boundary this wave: NONE new. Standing: strict Ask-drafted->F1 (ask lane); Decision 4 cutover RED (cutover debt, off critical path); Mission Control = next projection.
