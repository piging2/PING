# Lane 4 evidence: browser-proof of owner reorder + doorway chain (2026-09-25)

Lane 4 assignment: browser-prove the owner reorder on Pig-local :3101, verify byte-identical restoration, run responsive/accessibility checks. Coordinator additions during the run: (a) :3100 re-verification after Lane 2's stale-.next rebuild (styled render check), (b) doorway chain on :3100 after its rebuild from integration HEAD 28e4ba00.

All browser work used fresh Chromium instances with fresh user-data-dirs on the Pig (never the headed :9223 Chrome, never profile nolanpigi). No objectDebug=1 anywhere. :3100 was touched only via the coordinator-sanctioned restart; :3101/:3102 never restarted; :18199 never restarted; no broad pkill; no reboot.

## 1. :3100 styled-render verdict: GREEN

After the coordinator's sanctioned rebuild+restart (new :3100 next-server PID 75178, BUILD_ID FIzjnSQB7emINF7TZDpgi, OWNER_MODE=1 in env):

- Fresh context, hard reload, desktop 1440: 2 stylesheets loaded, h1 font Georgia serif, body background rgb(247,247,249). Screenshot `h1-3100-desktop-1440.png`: PING marketing site ("Continuity infrastructure for AI agents"), fully styled dark theme, evidence cards.
- Mobile 390: 2 stylesheets, no horizontal overflow. Screenshot `h2-3100-mobile-390.png`.
- Verdict: STYLED, not the blue-links unstyled state. The Lane 2 stale-.next defect is resolved on the live surface.

## 2. Doorway chain on :3101 (drivers A2/A3/A4, fresh profile each)

Site: http://localhost:3101/sites/coppersmith-plumbing. Baseline service order: [Ventilation, Plumbing, Heating & Cooling, HVAC]. The true doorway chain is drawer-based (service card title links have href /o/<id> but clicks open an object drawer, not a navigation):

- site loads, no objectDebug in URL: PASS
- extreme-margin rail found (P/H/H/V circles, aria-labels like "Plumbing. Expand to show details."): PASS
- rail click opens the Ask FYD panel contextualized to the object ("What do you want to know?", "Ask about this place..."): PASS
- Ask panel focus moves into a control: PASS; Escape closes it: PASS
- Ask answers the question "What services does this business offer?" from site content: PASS (margin panel)
- card click opens the individual-object drawer (role=dialog): PASS
- typed information in drawer ("Plumbing", type "Service", "Website statement" badge, source line website-ingestion:https://www.coppersmithplumbing.com/): PASS
- drawer buttons present (Back, Close, Ask FYD, Why this?, Open full node, Copy reference): PASS
- focus moves inside drawer on open: PASS
- Escape closes drawer: PASS; focus restored to the triggering card link (A:Plumbing): PASS
- trusted backdrop mouse click closes drawer: PASS
- drawer Ask answers from evidence: PASS
- drawer Why this? expands Details (Name + Website statement) and Evidence (website-ingestion URLs + observed timestamp): PASS
- drawer survives 1440 -> 390 resize with no overflow: PASS
- capability controls present in "Customize this site" (Up/Down/Hide/Propose/Approve): PASS
- no horizontal overflow at 320/360/375/390/430/1440, including drawer open at 320/390/430: PASS
- touch targets >= 44px at 320/360/375/390/430: PASS (5-7 targets checked, 0 under)
- touch targets at 1440: 4 under (Home/About/Services/Explore nav buttons 70x36) - consistent across both ports, recorded below
- focus order at 390 starts with "Skip to main content": PASS (sane order)
- relationship links exist on the site page ("Business: Coppersmith Plumbing - HVAC - Mechanical" -> /o/website-business-2f1327c09d622175): PASS

Genuine defects found (evidence, not driver artifacts):

1. NO FOCUS TRAP in the object drawer: after 10 Tabs from inside the drawer, focus escaped to BUTTON:Explore on the page behind. (a11y drawer-focus-trap FAIL)
2. Background not programmatically inert: no [inert] attribute, no aria-hidden on main, no backdrop marker element found, though the background is visually dimmed. (drawer-background-inert FAIL)
3. Scroll not restored: page scrollY was 1722 before drawer open, 987 after Escape-close. Opening the drawer moves page scroll and closing does not restore it exactly. (scroll-restored FAIL)
4. Browser Back with drawer open exits the site (about:blank) instead of closing the drawer: the drawer pushes no history entry. (back-with-drawer: url=about:blank, drawerVisible=false)
5. "Open full node" is a DEAD BUTTON: click changes nothing (URL unchanged, drawer stays open, no console error from the click). The /o/<id> route exists (card hrefs point there) but the button does not navigate. Micro-test confirmed with element-handle scoping.
6. React hydration error #418 ("HTML") logged on page load (pageerror). Separate from the above; recorded for the owning lane.

## 3. Owner reorder end-to-end on :3101 (drivers B/B2/B3)

The NL "customize with FYD (demo)" panel does NOT render on :3101's served client bundle: DemoOwnerMode returns null because NEXT_PUBLIC_FYD_DEMO_OWNER_MODE is inlined at build time and :3101's build lacks it (verified: body text contains no "customize with FYD (demo)"; only the ungated structured "Customize this site" panel renders). The server-side route /api/fyd/customize works (server env has the flag, localhost passes the private-host gate), so the owner loop was driven through the exact backend the NL panel calls via fetch, with the exact owner NL text "Move emergency plumbing first":

- parse: intent promote_first, target "emergency plumbing", intentDigest 7b38bf994e6df151549fbcaf2e9a081520cbac0256bcee3390e061657e6bb1fa; resolution "emergency plumbing" is "Plumbing"; siteIntent reorder_object on home:Services:2; proposal site_patch with proposalDigest dd2efbf4c5435ffc7fa78835917bdc7c369c5c3ab32512399864848ca7976765; reviewCard before "Objects in Services: Ventilation, Plumbing, Heating & Cooling, HVAC", after "Objects in Services: Plumbing, Ventilation, Heating & Cooling, HVAC". (parse-3101 artifacts: lane4/parse.json)
- approve: ok=true, intentId pi-9f644e1053c3ec9b, eventId fyd-ovl-mugymf21-9155315690c3, proposalDigest dd2efbf4c5435ffc..., idempotentReplay=false. (lane4/approve.json)
- projection re-dump (regen): 24 overlays, 2 intents, presentationIntentDigest 8a8834a5fec7d656.
- BROWSER served order after approve: [Plumbing, Ventilation, Heating & Cooling, HVAC] (driverB2, fresh profile). Screenshot f1-after-reorder.png. No objectDebug.
- Object drawer opens on the reordered Plumbing card: PASS.
- Order survives page refresh: PASS.
- Order survives full browser restart (fresh profile): PASS. Screenshot f3-after-restart.png.
- clear (action=clear, intentId pi-9f644e1053c3ec9b): ok=true, eventId fyd-ovl-mugyn4o2-f61a56827992.
- projection re-dump: 25 overlays, 1 intent, presentationIntentDigest 4da566a4aaf278bd912c47f157c1090d5b4e7a7c401d7c96e9a4cce299c0171d, byte-identical to the pre-approve digest.
- BROWSER restoration: served order [Ventilation, Plumbing, Heating & Cooling, HVAC]; services-section HTML hash 1d1d2c6d0f3b88afdf651e0763676ad5, byte-identical to the pre-change hash. Screenshot f4-restored.png.

Journal notes: :3101 and :3100 share the demo journal gateway (127.0.0.1:18199, marker fyd-demo-journal) and the projection dir (/home/nolan/ping/var/fyd-projections). My lane added exactly 2 net-zero events (set + clear). Another worker ran set/clear pairs on the same intent pi-9f644e1053c3ec9b at 06:42-06:45 MDT (4 events, net zero); my pre/post comparisons bracket my own changes and the net-zero interleaving did not affect the digests. Server restart was NOT performed (hard lane constraint); "restart" persistence = browser restart with a fresh profile.

## 4. Doorway chain + owner reorder on :3100 (drivers D/E/F/G)

- :3100 root and /sites/coppersmith-plumbing return 200 on the rebuilt build.
- The NL panel still does NOT render on :3100's client bundle either (body text has no "customize with FYD (demo)"). The server env has OWNER_MODE=1 but the client gate is build-time-inlined; the rebuild did not pick up the flag in the client bundle. This is a build/packaging gap for the owning lane, not a lane-4 blocker: the route works.
- The exact phrase "Move emergency plumbing first" IS supported on the new :3100 build: parse returns promote_first with intentDigest 7b38bf994e6df151549fbcaf2e9a081520cbac0256bcee3390e061657e6bb1fa and proposalDigest dd2efbf4c5435ffc7fa78835917bdc7c369c5c3ab32512399864848ca7976765 (Lane 6's "unsupported" finding applied to the old Sep-24 build only).
- approve on :3100: ok=true, intentId pi-9f644e1053c3ec9b, eventId fyd-ovl-mugyq6x1-df4c9c7eda6d.
- projection re-dump: 26 overlays, presentationIntentDigest 7b7bb89afca601b9.
- BROWSER on :3100 served order: [Plumbing, Ventilation, Heating & Cooling, HVAC]. Screenshot j1-3100-reordered.png.
- Survives refresh and browser restart (fresh profile): PASS.
- Doorway on :3100: margin rail -> Ask panel PASS; drawer opens PASS; typed info PASS; focus into drawer PASS; Escape closes PASS; Why/evidence PASS; capability controls PASS; no overflow at 320/360/375/390/430/1440 PASS; touch targets >= 44px at all mobile widths PASS, 1440 FAIL on the same 4 nav buttons (70x36).
- Ask FYD on :3100 answered "I do not have evidence for that in the current context, so I will not guess. I consulted: service: Plumbing; ..." (evidence-bounded refusal with raw graph context dump). Screenshot j4-3100-ask.png. Note: :3101's newer build answered the same question affirmatively from site content; the two builds differ in Ask behavior.
- clear on :3100: ok=true, eventId fyd-ovl-mugyrmiu-087b48869787. Re-dump: 27 overlays, intentDigest 4da566a4aaf278bd, byte-identical to pre.
- BROWSER restoration on :3100: [Ventilation, Plumbing, Heating & Cooling, HVAC]. Screenshot j7-3100-restored.png.

## 5. Responsive/accessibility matrix (widths 320, 360, 375, 390, 430, desktop 1440)

| width | overflow | touch >=44px | notes |
| 320 | PASS (305<=320) | PASS (5 checked, 0 under) | drawer open: no overflow |
| 360 | PASS (345<=360) | PASS (5, 0) | |
| 375 | PASS (360<=375) | PASS (5, 0) | |
| 390 | PASS (375<=390) | PASS (5, 0); drawer 5, 0 | focus order sane (Skip to main content first); screenshots g1/g2 |
| 430 | PASS (415<=430) | PASS (7, 0) | drawer open: no overflow |
| 1440 | PASS (1425<=1440) | FAIL: 4 under | Home/About/Services/Explore nav buttons 70x36 (both ports) |

Repo a11y tooling: none (package.json has no axe/pa11y/lighthouse scripts; only jest/tsx test scripts). The a11y evidence above is the manual browser pass.

## 6. Status for Q-J-07: green (browser proof solid)

The owner reorder is browser-proven on both :3101 and :3100: exact NL -> parse -> semantic preview (reviewCard before/after + digests) -> approve -> journal event -> projection regen -> served reorder in the browser -> persistence across refresh and browser restart -> clear -> byte-identical restoration (projection intentDigest and served services-section HTML hash both match pre-change). Queue record appended separately.

## 7. Caveats and open items

- The browser NL input ("customize with FYD (demo)") renders on NEITHER port's client bundle (build-time flag gap); the type/submit/approve steps for the NL path went through the route that backs that panel, with the exact NL text. The structured "Customize this site" panel renders and works.
- Server restart persistence was not tested (hard lane constraint: do not disturb :3101/:3102; :3100 restart was coordinator-sanctioned but not re-run by this lane).
- :3100 and :3101 share the demo journal and projection dir; test events are net-zero (set+clear) and both ports are restored to baseline.
- Defects for owning lanes: drawer has no focus trap; background not inert; scroll not exactly restored; Back with drawer open exits the site; "Open full node" is a dead button; React hydration error #418 on load; 1440px nav buttons under 44px height; :3100 client bundle missing OWNER_MODE flag; Ask behavior differs between the :3100 and :3101 builds.
