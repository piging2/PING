# Swarm frontier — 2026-09-24 ~15:40 MDT (orchestrator re-observed)

## Re-observed state (do not trust older claims)
- FYD main tree /home/nolan/projects/ping: branch fyd-factory, HEAD e474c89b (pure), DIRTY working tree (killed generic direction). No writes, no commits, no cleanup without owner word.
- Production :3100: LIVE. /api/healthz 200, /api/readyz 200, BUILD_ID present. Serves pure HEAD.
- Template lane /home/nolan/build-template1: branch fyd/template-001-hpp-clone, tip a28e3e8b (has commits). OWNER: coordinator ae77b28b. READ-ONLY for all other lanes.
- Write-boundary lane /home/nolan/build-idem: branch fyd/write-boundary-idempotency, tip d6c1b05d, committed. 13/13 hostile gates verified 2026-09-24.
- Gateway: ping-gateway container Up 4h (healthy). HTTP surface on :8787 returned nothing — classify UNKNOWN until re-observed. Do not trust old CUTOVER HOLD or LIVE claims.
- Infra: ping-qdrant healthy, postgres/redis healthy, ping-vault UNHEALTHY (2d) — recreation HOLD, inventory only.
- Car-listing groups retry cron: REMOVED 2026-09-24 ~15:37 MDT per Nolan ("good enough"). Listing stays as-is.

## Active frontier (priority order)
1. B/C TRADESMAN(COPPERSMITH) generalization test — owned by coordinator ae77b28b. Do not duplicate.
2. D Owner write -> regen -> readback (projection loop P0) — lane D.
3. E Ask FYD real path on Coppersmith — lane E.
4. F ORCA UNKNOWN/HOLD chaos — lane F.
5. G Effect idempotency identity audit — lane G.
6. H TenantOS hostile isolation — lane H.
7. I Event authority audit — lane I.
8. A Continuous re-observe / provenance / regression watch — lane A.

## Claim classifications (initial)
- STILL_TRUE: write-boundary idempotency (13/13 gates); dirty main tree must not be built on; :3100 sanctioned restart path.
- LIVE: :3100 production; template lane writer; gateway container (HTTP surface UNKNOWN).
- DORMANT/HOLD: vault recreation; stable non-laptop host; Monument View Coffee outreach (auth-gated).
- UNKNOWN: gateway HTTP surface; X auth state; current ORCA kill-point behavior; Ask FYD current implementation state.
- STALE: all pre-2026-09-24 "wait for report" language; old checkpoint claims; car-listing retry machinery.

## Steering update — Nolan 2026-09-24 ~15:39 MDT
- QUALITY BAR IS LAW: no website reaches Nolan unless >= live HPP (https://happy-place-platform.vercel.app/) and better than PING's current website. Killed generic direction is the anti-pattern. Machine critics (visual, mobile, a11y, coverage, binding, no-hardcode) gate everything; human eyes only after machine exhausted.
- PING Social website added as third proof target (HPP, Coppersmith, PING) — first-class TRADESMAN customer. Owned by lane B/C coordinator.
- Fresh design research (best-in-class trades sites) feeds TRADESMAN ceiling as generic rules, not clones. New lane R-DESIGN.
- ONE-CLICK BEAUTIFUL WEBSITE is the product target: sources -> observations -> evidence -> objects -> relationships -> owner intent -> capabilities -> SiteSpec -> TRADESMAN -> browser, zero manual glue. Every lane asks: does this step survive one-click?
- Reprioritize: (a) engagement/outreach sprint cadence holds through Fri 2026-09-25 09:00 MDT revert — swarm covers reliability/observability/failure-watch/tripwires only, NO volume/cadence changes (new lane SRE-ENGAGE); (b) deep backend (ORCA, idempotency, TenantOS) stays top; (c) frontend work must serve quality bar + one-click.

## Decisions locked — Nolan 2026-09-24 ~15:45 MDT (steered to lanes, no restarts)
- GATE-SECRET-001 = (a): existing sanctioned secret-injection for non-leakage proofs. No new credential minted. Never interpolate secret into argv/stdout/stderr/chat/reports. Ephemeral proof material, restrictive perms only where unavoidable. Post-proof leakage audit without printing the credential. Exposure = gate failure + containment/rotation. PG-001 HOLD/separate. Steered to F/G/H.
- FYD-Q1: fail-closed conflict handling. Both observations preserved; conflict belongs to evidence; projection policy decides presentation. Public copy: "Contact information is being verified." Suppress contested phone/address. Ask FYD: unresolved/unknown, never picks a disputed value. Steered to E (test battery), I (evidence retains both); renderer copy needs B/C lane via parent relay.
- FYD-Q2: privacy propagates by semantic fact at projection/read time. HIDE != delete. No traversal resurrection (Business -> located_at -> Location.address). Zero disclosure across renderer/search/Ask FYD/Circle/public agent context; owner-authorized context keeps access. Mandatory hostile test in H. Steered to D (read-time enforcement), E, H, I; renderer needs B/C lane via parent relay.
- FYD-Q3: full seven-item phase-17 gate adopted; all seven close before unauthenticated visitor publishing; owner auth is additional. Steered to A (ledger).
- FYD-Q4: tiered golden bars. Safety seams 1.000 on defined golden set; presentation >=0.95/mission. Safety miss blocks release/wave; inform Nolan, don't ask unless changing the criterion. Steered to A.
- PRODUCT FORKS: one-click = internal/operator first, one canonical factory (steered to D); PING website = first-party pipeline customer, no bespoke rebuild, live site stays with surgical fixes only (B/C via parent relay); social = three separate lanes A/B/C, FYD Social does not generalize until two-tenant loop proven, OBSERVE != ACT (noted); visual order Coppersmith -> objective gates -> Nolan visual gate -> one-click operator demo -> PING through factory -> external owner test, no waiting between steps (B/C via parent relay).
- COPPERSMITH failure definitions: beautiful unsupported fact; unusable correct graph; HIDE bypassable by Ask FYD (P0 privacy); UNKNOWN auto-retried (P0 execution); second customer-specific renderer (arch failure); credential-leaking proof (security failure). Steered to F.

## Corrections + verified security regression — 2026-09-24 ~16:10 MDT (orchestrator-verified)
- CORRECTION (:3100): production does NOT serve pure HEAD. BUILD_ID matches build-idem; served surface = HEAD e474c89b + idem lane's 7 committed write-boundary commits (copy 14:46-14:47 MDT, restart 14:47:27). Fits the 14:13 "harvest only individually proven, committed changes" directive. Earlier "pure HEAD" wording was wrong.
- VERIFIED REGRESSION (security seam): gateway /events is unauthenticated. GET http://100.79.154.43:8080/events (also 127.0.0.1) returns 200 + 100 events / 76,800 bytes with zero credentials. Port bound 0.0.0.0:8080, tailnet-reachable. Prior verified state: 401.
- ROOT CAUSE (build provenance): running image ping-gateway:candidate-fffe99f7a (cutover ~11:38 MDT) was built from a source tree that DIVERGES from /home/nolan/ping-gateway-src on disk. Live container: no exterior_auth_middleware (file absent; no import in gateway_runtime.js); /events mounted without auth; no namespace tenant filter on reads. On-disk source HAS all three. So the candidate shipped an older/weaker auth posture than the source tree claims.
- SEVERITY: metadata-only exposure (mission IDs, worker names, event types, namespaces, timings). Secrets scan of the dump: no password/token/secret/api_key key names. Reachability: tailnet only (Pig behind NAT; not verified internet-exposed). No credential material observed. Class: security-seam regression, Q4 safety-miss -> inform Nolan, blocks the release wave.
- ROLLBACK OPTIONS: ping-gateway:rc-4d522a6b (4d old, still RUNNING as ping-rc-gateway); ping-gateway-precutover (devin-boundary2, exited). Repair lane spawned to determine candidate build revision, produce minimal auth fix, prove in scratch. NO production touch until Nolan decides rollback vs patched redeploy.
- CONTRADICTED (standing): UNKNOWN/HOLD law vs deployed reaper (lease expiry resets _processing to created, ~60s auto-redispatch). Fix proven 22/22 in ~/workspace/f01-fix/, undeployed/uncommitted, Nolan's design word pending. Lane F owns the port.

## Open failures from Lane G — 2026-09-24 ~16:15 MDT
- OPEN/HIGH (W-1): witness identity remint on retry, full cascade to lineage. Repair mission routed to GW-REP (same live tree). Needs writer ownership decision on jev-surgical gateway source.
- OPEN/HIGH (F-1): browser request_id gap. Routed to D-IMPL (build-idem lane).
- OPEN/MEDIUM (W-2): timestamp-in-payload across worker pipeline. Same repair as W-1.
- LOW/INFO (A-1..A-4): recorded; A-1 must be fixed before any EffectAuthority wiring.

## From Lane H — 2026-09-24 ~16:15 MDT
- PROVEN: Q2 traversal-safe privacy holds on all 6 surfaces (renderer/search/Ask/Circle/agent-context/owner). Nuances routed to D-IMPL.
- OPEN: gateway trust root (authenticated principal -> tenant resolution) = product/auth decision, queued for Nolan alongside gateway release decision.
- OPEN: bridge tenant-namespace laundering fix (scratch-proven) routed to GW-REP repair proposal; writer ownership on jev-surgical tree still open.
- OPEN: per-tenant TokenStore isolation + auth on /connectors/:name/apikey; retry tenant binding (M4); artifact surface mapping (M7).

## From Lane E — 2026-09-24 ~16:20 MDT
- HOLD: Lane E's 8 modified files in /home/nolan/worktrees/lane-e-ask are UNCOMMITTED. Merge-or-hold queued for Nolan (shared composer affects /api/ping/ask live path; lane-collision rule). D-IMPL steered to absorb compatible parts (applyHideTraversal, owner-decision plumbing) rather than rebuild.
- OPEN: real conflict detector wiring into SiteBundle; conflict on location-object's own fields copy; HIDE prose boundary confirm (Nolan); neutral business summary (Q5); unknowns in widget UI; live-browser verification of Ask FYD on generated Coppersmith (parent delegates browser task).

## From GW-REP — 2026-09-24 ~16:25 MDT
- Provenance wording corrected: image = truthful build of fffe99f7a; the runbook dropped the auth posture (never a regression gate). Add permanent gates: HTTP auth posture on 7 routes, namespace isolation on reads, worker retry identity, bridge tenant mapping.
- Converge ONE authoritative gateway source/build pipeline (successor mission; GW-BUILD spawned).
- Policy review needed (not urgent): intent of the ungated sibling-route set.
- Production release authorization (redeploy patched candidate) remains Nolan's call, after GW-BUILD re-certifies.

## From Lane F — 2026-09-24 ~16:30 MDT
- Close the probe overstatement: probe=false means "not recorded", not "never executed". Consider provider-queryable probes or consequence-gated confirmation before retry_authorized.
- Carry effect outcome into the lease record so the reaper distinguishes abandoned-not-started from may-have-effect.
- Verify sweepUnknown act()->_applyReconciliation end to end in the live scheduler poll.
- Reaper-vs-HOLD design decision for Nolan now carries C0 evidence: even WITH the idempotency gate, the accept->commit window admits a second physical effect; the deployed reaper (older tree) lacks even the branch's guards.

## BRUTAL CEO CORRECTION — Nolan 2026-09-24 ~16:03 MDT (TOP PRODUCT PRIORITY)
### Four locked product decisions
1. TWO-TENANT PROOF = PING + first genuinely independent external owner/customer. Gate: Tenant A = PING; Tenant B = real independently owned external business whose owner actually exercises the FYD owner loop. Demo fixtures, cloned datasets, two businesses under one owner do NOT count. Before FYD Social expands: cross-tenant isolation matrix BOTH directions (private sentinel A unreachable by B via direct reads, semantic search, Ask FYD, graph traversal, artifacts, events, caches, credentials, retries; then reverse). After first owner succeeds, immediately test another unrelated external business. Incremental permission, not proof tenancy can never fail.
2. ROOT CLAIM = OPERATOR-VERIFIED for first external owner test, EXPLICIT TEMPORARY method. Record verified_by, verification_method, verified_at, evidence/reference; never bare "verified=true". Do NOT build automated domain/DNS/OAuth claiming first. Before public self-serve: one real automated claim method + recovery path. Architecture allows multiple methods (DNS challenge, well-known file, website meta, email at verified domain, OAuth provider account, crypto identity). Never collapse business identity / principal identity / claim evidence / tenant context into business.owner_id.
3. URL TRUST = OPERATOR IS TRUSTED TO REQUEST FETCH; URL AND RETURNED CONTENT ARE HOSTILE FROM DAY ONE. Build the MINIMUM REAL SSRF-hardened acquisition seam NOW: reject/guard localhost, loopback, link-local, private/internal ranges, cloud metadata endpoints, non-http(s) schemes, credential-bearing URLs; resolve and re-check redirects into forbidden destinations; timeouts, response-size limits, content-type expectations, bounded redirects. ONE seam for operator and future customer intake, never two fetch paths. Do not freeze the operator factory waiting for a giant security platform; do not hold Coppersmith hostage to a generalized connector project.
4. OWNER UX = CHAT-FIRST + PREVIEW + MINIMAL STRUCTURED REVIEW/APPROVE FOR CONSEQUENTIAL CHANGES. Authority UX scales with consequence: low (fast + reversible + undo) / medium (quick apply + visible undo/history) / high (preview + explicit approval) / critical (strong confirmation). Consequential changes resolve into a compact visual diff preview (old -> new, affected surfaces) with Cancel/Apply. Never make the owner understand capabilities/events/SiteSpec.
### Address decision
Pipeline does NOT own whether a business publishes its address. OBSERVED VALUE != PUBLICATION DECISION. Fact, visibility policy, owner override stay separate. Pipeline may choose conservative initial visibility; owner overrides where allowed.
### No ClaimAuthority
Do NOT create ClaimAuthority. Binding verifier lives at the projection/render boundary using existing evidence semantics. Render projection emits only factual bindings whose provenance resolves to graph/evidence or explicit owner-authored content. Generated marketing copy classified: DIRECT FACT / DERIVED FACT / OWNER AUTHORED / GENERATED COPY. Generated copy must never masquerade as direct fact.
### Why this?
Not the primary workflow. Purposes: trust, correction, debugging, high-consequence claims. Default: FYD GOT MY BUSINESS RIGHT. When wrong: WHY THIS? -> CORRECT -> HIDE.
### THE EDGE CORRECTION (top build priority)
VISIBLE != INTERACTIVE. CARD != OBJECT EXPERIENCE. Product failure: objects are pictures; they do not expand, traverse, explain relationships, open neighborhoods, reveal capabilities. Fix before more website-builder polish.
CORE: OBJECT -> TAP -> EXPAND -> EDGES APPEAR -> TRAVERSE EDGE -> NEXT OBJECT -> EXPAND/ACT/ASK/RETURN.
MOBILE defines the semantic contract (desktop hover = enhancement only). First tap: expand in place or compact object sheet (identity/title, type, evidence-backed summary, PRIMARY EDGES, actions [Ask FYD] [Why this?] [Open full node]). Second tap on edge target: navigate/expand. BACK: return to previous graph position. Preserve scroll position; no dead-end pages.
EDGE RENDERER: predicate, source object, target object, target schema, visibility, viewer capability, evidence/provenance -> presentation. Predicate-driven (offers -> ServiceChip/ServiceEdge; located_at -> LocationEdge; works_for -> Person/BusinessEdge; references -> ObjectReferenceEdge; links_to -> ExternalIdentityEdge; UNKNOWN -> generic renderer). Do NOT hardcode only Coppersmith predicates. Do NOT render counts and call it done.
ASK FYD FOLLOWS THE SAME EDGES: question context = current object + authorized neighborhood + bound evidence. HUMANS AND AGENTS TRAVERSE THE SAME GRAPH.
EDGE -> OBJECT -> CAPABILITY: expanding an edge target resolves capabilities via the EXISTING capability resolution path. Only render actions that exist (Request quote IF capability exists). Do not invent buttons.
EDGE PROVENANCE: relationships are claims too ("why does FYD think this person works here?").
NO GRAPH VISUALIZER. No force-directed canvas. Graph is the interaction model UNDERNEATH a normal beautiful website. CENTER = presentation. EDGES/MARGINS = exploration. Reveal progressively.
OBJECT DENSITY: edge shows the most relevant objects for the current site/viewport/section. Graph may hold 100 objects; edge never shows 100 at once.
PRIVACY SURVIVES EXPANSION (Q2 hostile): HIDE address X -> recovery attempts via business edge -> location, Ask FYD -> location, search -> location, related object -> location. ZERO public disclosure. The edge graph must never become a privacy bypass.
EVERY EDGE ITEM -> REAL OBJECT ID -> TYPE -> RELATIONSHIPS -> EVIDENCE -> VISIBILITY -> CAPABILITIES -> EXPANDED PROJECTION. No decorative images, no presentation-only pseudo-objects, no hardcoded HPP cards, no Coppersmith special-casing. Prove on BOTH HPP and Coppersmith: same edge system, different objects/relationships/capabilities, zero business-name conditionals.
INVARIANT: AN EDGE OBJECT IS NOT SUCCESSFULLY RENDERED UNTIL IT PROVIDES A FUNCTIONAL DOORWAY INTO THE AUTHORIZED BUSINESS GRAPH.
HOSTILE MOBILE TEST (375x812, start midway down Coppersmith) REQUIRED 15/15: 1 visible, 2 tap expands, 3 readable, 4 related tappable, 5 Ask FYD knows current object, 6 action works, 7 hidden data absent, 8 back/close returns same scroll, 9 open another object, 10 no horizontal overflow, 11 no unreachable edge object, 12 real touch targets, 13 screen reader expand/collapse state, 14 rotate/resize preserves state, 15 all hold together.
DO NOT BUILD: graph visualization framework, new graph database, RelationshipAuthority, another canonical store, customer-specific edge components, protocol work, federation work, campaign work. USE THE GRAPH WE HAVE. WIRE objects + relationships + capability resolution + render models + routes INTO the edge experience.
### Execution order
A. FIX EDGE OBJECT INTERACTION NOW. B. FINISH COPPERSMITH COVERAGE. C. FINISH ASK FYD. D. CLOSE APPROVAL -> REGEN -> READBACK. E. RUN PRIVACY EDGE-TRAVERSAL ATTACK. F. RUN MACHINE CRITICS. G. HPP / TRADESMAN(HPP) / TRADESMAN(COPPERSMITH) SIDE BY SIDE. H. ONE-CLICK OPERATOR FLOW. I. PING THROUGH SAME PIPELINE. J. FIRST EXTERNAL OWNER. K. TWO-TENANT HOSTILE PROOF. L. FYD SOCIAL EARNS NEXT EXPANSION.
(Coppersmith coverage continues via the existing TRADESMAN coordinator; edge fix IN PARALLEL.)
### Checkpoint chain (nothing outranks a broken arrow)
REAL URL -> EVIDENCE -> OBJECTS -> GOOD SITE -> ASK FYD -> OWNER CHANGE -> DURABLE TRANSITION -> REGENERATION -> INTENT SURVIVES.
### Harvester backlog (investigate only; do NOT drag into writer lanes)
Entity-compiler optionality (chat intake -> typed intent -> plan -> diff -> capability check -> preview -> approval -> transition -> projection; CHAT NEVER MUTATES CANONICAL STATE DIRECTLY); schema-driven UI proven on Business/Service/Post before generalizing; media as object/evidence with digests + provenance; MCP as future external projection of capabilities, not canonical truth; Crawl4AI security lessons for the acquisition boundary; Automerge watched not adopted; Lightpanda as benchmarked escalation tier.

## Pig SSH outage — 2026-09-24 ~16:20 MDT onward (45+ min at last check)
- Egress proxy: nc: proxy read: Broken pipe. Blocks: D-SHIP (build-idem), EDGE-1 port to /home/nolan/projects/ping, GW-BUILD (Pig-side? verify), ACQ-1 (if Pig-side), blind hostile-gate verdict read (/tmp/laneD-gate.log), 375x812 browser proof path.
- RECOVERY UNCONFIRMED: GW-BUILD lane reported SSH back ~16:32 MDT, but 3/3 orchestrator probes after that failed (broken pipe). pig-ssh-watch re-armed. D-SHIP + EDGE-1 port spawn on confirmed PIG_OK.

## Swarm state — 2026-09-24 ~17:45 MDT: ALL 15 LANES COMPLETE
- Proven and staged: D-IMPL (SHIP-PLAN), EDGE-1 (edge-1-port.patch), ACQ-1 (~/workspace/acquisition-seam/), GW-BUILD (certified image ping-gateway:repair-cert-20260924 sha256:4472c543...).
- Blocked on Pig SSH (flaky since ~16:20 MDT; watch armed): D-SHIP spawn, EDGE-1 port, ACQ-1 integration.
- Delegated to parent: 375x812 hostile mobile 15/15 browser proof (EDGE-1), Ask FYD live-browser verification on generated Coppersmith (Lane E).
- Relay to TRADESMAN coordinator: Coppersmith coverage continues; edge fix is a separate lane/worktree; locked CEO decisions (Q1 copy, Q2 traversal privacy, Q3 publishing gate, one-click operator-first, visual order, failure definitions) + design research artifact already queued.
