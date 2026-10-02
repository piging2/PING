# ARROW 3: real browser journey acceptance spec (2026-09-25)

Prepared for parent browser-task delegation. Generic subagents cannot operate
a live browser; the actual run goes through the parent's browser-task route.

Driver mechanics: see ~/workspace/sprint-2026-09-24/browser-proof-spec.md
(house Chrome via CDP 127.0.0.1:9223, portable Windows node + playwright-core,
headless:false + "--headless=new", screenshots to Pig evidence dir).

## When to run
AFTER the single coordinated rebuild + sanctioned :3100 restart that follows
the Arrow 1 (privacy) and quarantine lane commits. Do not run against the
current :3100 (serves the 61b7499f margin build; privacy boundary not yet
deployed). Target: the integrated branch build on :3100 via the Tailscale
surface (http://100.79.154.43:3100) as seen by the Windows-side browser.

## Sites (no fixtures, no demo synthetic)
- /sites/happy-place (Happy Place Carpentry LLC)
- /sites/coppersmith-plumbing (Coppersmith Plumbing - HVAC - Mechanical)

## Journey matrix (each site x desktop 1440 x mobile 390)
1. CONTACT: phone/tap-to-call present, real number, tap works on mobile.
2. SERVICES: service list matches Ask-verified evidence (HP: Repairs, Fencing,
   Painting, Drywall, Restoration; Coppersmith: emergency plumbing visible).
3. PERFORMANCE: page interactive in reasonable time; no console errors that
   break the journey; screenshots saved per width.
4. TRUSTED UNDERSTANDING: Ask FYD answer for "What services does this business
   offer?" returns KNOWN with citations to real object IDs and source URLs
   (live POST /api/fyd/ask check already green 13:05 MDT; re-prove in browser).
5. ASK FYD: ask a supported question and an unsupported question (e.g. HP
   "septic tank pumping", Coppersmith "roof replacement"); unsupported must
   refuse honestly, never invent.
6. WHY THIS: open Why This on an Ask answer or an object; claim -> source ->
   observed chain visible with source URL.
7. CUSTOMIZE: owner correction path reachable (demo-owner mode on :3100);
   propose a change, approve, verify the projection reflects it.

## Margin overlay (Q-P0-04 re-proof in the journey)
- Desktop: 56px edge peeks (1280/1366) / 64px circles (1440+) at extreme
  left/right edges, not center; no inline strip.
- Mobile: floating edge overlay scrolls away with the page (not fixed);
  tap opens the sheet in-viewport with real content (name, location,
  description, category chips, Ask FYD / Following / Website actions,
  evidence with source URL).

## Privacy (Arrow 1, Q-C-01/02/03/13)
- View-source / network: no raw `graph` key in /api/fyd/projection;
  no owner-private fields in any public JSON payload.

## Evidence
Screenshots + DOM assertions saved under
~/workspace/sprint-2026-09-24/evidence/arrow3-journey-2026-09-25/.

PASS bar: all 7 journey items green on both sites, both widths; any red =
new defect added to backlog, not silent.
