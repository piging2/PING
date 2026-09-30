# FYD Understanding-Fix — Coordinator State (2026-09-30 ~14:50 MDT)

## Trigger
Five-URL varied falsification (14:41 MDT, live loop Pig :3100, commit 278468d8): **0/5 owner-ready → STOP**.
Full record: `falsification-varied-2026-09-30.md`.

## Exploration verdicts (three read-only explorers, all against ping-fyd-converged @ 278468d8)
1. **Findings pipeline: BY-DESIGN, not broken.** `findings` = GENERATE-stage site-spec validator output
   (src/fyd/sitespec/validator.ts:29-118); empty = clean spec. Facts live as
   graph.objects[].fields by design. The falsification's "FACTS: 0" was a harness
   labeling error (harness read `findings` as the facts channel).
2. **Extraction gap located.** UNDERSTAND = `parseRich` (src/fyd/proceduralize/proceduralizer.ts:222-304):
   JSON-LD/microdata (LITERAL_FACTS) + head meta/OG + service-card detectors only.
   NO body-text extraction exists anywhere in the live path. (Correction to the
   falsification: there is no "hours-like pattern" matcher; hours came from
   structured openingHours.) Tested PHONE_RE exists at src/fyd/onboarding/extractor.ts:65
   but is used only by the onboarding preview lane, never the live loop.
   Hook point: new `mineBodyContactFacts()` inside parseRich, parallel to
   extractServiceCards, emitting ParsedFacts named "phone"/"address" (names the
   existing resolve/project/policy machinery already handles).
3. **Person-loop root cause confirmed** (proceduralizer.ts:935-956, inside project()):
   any Person-typed entity with non-empty "title" gets a person card; "title" is
   collapsed from schema.org name/alternateName/headline, so blog authors
   ("Admin") and headline-only nodes ("Welcome to our blog") are carded with
   team-member framing and no business edge. Reproduced empirically on 278468d8.
   Fix: gate on role evidence (job_title field OR participation in a
   ROLE_PREDICATES.person relationship: employs/has_member/has_employee/works_for/member_of).

## Battery re-run #1 (post-fix, 2026-09-30 ~15:16 MDT, :3100 restarted 15:15 via blessed script)
All 5 jobs ok, renderable=True. facts now live in graph.objects[].fields:
- Kim's: phone (970)-858-0938, address "220 E. Aspen Ave. Fruita CO. 81521", name ok,
  "A&D Auto Parts" description VOIDED (phase 2 works).
- Wicked Wrench: phone 970-858-5015, address "825 East US Hwy 6&50 Fruita, CO 81521".
- Elevation: phone, address "1190 Bookcliff Ave, Unit 101 Grand Junction, CO 81501",
  hours ok — BUT 2 duplicate location objects (phase-4 defect: ADDRESS_RE unit
  group greedy `[\\w-]+` swallowed "101Grand" from a tag-collapsed occurrence;
  normalizeAddress could not collapse "unit 101 grand junction" vs "unit 101grand junction").
- bin707: phones ['970-314-7455','970-314-9736'] (BOTH verbatim on page; 9736 pairs
  with "126 S. 5th St." — real, not a false positive), hours ok, NO address
  (page carries 3 conflicting addresses: 400 Main St note, 225 North 5th St footer,
  126 S. 5th St.; conservative conflict policy dropped all — honest).
- Carboy: ZERO contact facts. Root-caused: street addresses + phones are ABSENT from
  the static HTML (verified with curl, default and browser UA: "santa fe" count 0,
  ZIPs absent). Page links to /locations/<city>/ sub-pages; details are JS-rendered
  or sub-page-only. This is an ACQUISITION-DEPTH gap (sub-page following for
  location indexes), NOT an understand gap. Phase-4 location detector correctly
  found nothing (nothing to detect in the bytes).
- No junk person objects in any result (phase 3 holds).

## Follow-up fix landed + battery re-run #2 (2026-09-30 ~15:44 MDT)
Commit eac8ffd7 "FYD understand fix: unit-designator boundary in ADDRESS_RE"
(anti-glue guard `(?!\d+[A-Za-z]{2})` + lookahead; plain lookahead alone was
empirically insufficient — verified by probe). :3100 restarted via blessed
/home/nolan/start-3100.sh, serving eac8ffd7, NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1
verified in process env, /api/readyz ok. `101Grand` appears 0 times in all 5 results.
Tests: 173 passed, 1 pre-existing Gallery failure, tsc 4 pre-existing redteam errors,
zero new. (Background jest runs flaky on discovery; direct runs 6/6 consistent.)
NO PUSH. Tree otherwise clean except the 99h program's mc-approval-gate files
(different lane, left untouched).

## FINAL VERDICT — battery re-run #2, scored per the binding bar
(correct name; no false/misleading claims; phone+address, or phone+hours where type-appropriate)

1. Kim's (WP): phone (970)-858-0938 + "220 E. Aspen Ave. Fruita CO. 81521" extracted;
   "A&D Auto Parts" description voided. OWNER-READY: YES.
2. Carboy (multi-loc): 1 business + 3 external_identity, 3 links_to; ZERO contact facts.
   Root-caused: addresses/phones ABSENT from static HTML (curl + browser UA agree;
   JS-rendered or sub-page-only). OWNER-READY: NO — acquisition-depth gap, not understand.
3. Wicked Wrench (weak meta): phone + "825 East US Hwy 6&50 Fruita, CO 81521". YES.
4. Elevation: phone + "1190 Bookcliff Ave, Unit 101 Grand Junction, CO 81501" + hours;
   duplicate location objects eliminated (0 location objects, 1 business). YES.
5. bin707 (messy): phones ['970-314-7455','970-314-9736'] (both verbatim on page) + hours;
   no address (3 conflicting addresses on page; conservative drop = honest). YES.

**4/5 owner-ready → STOP LIFTS.** Dominant understand failure fixed. Next bounded lane:
acquisition depth for location-index pages (sub-page following / JS rendering).
True-SPA and true-legacy extras: not confirmed attempted — open.
Owner shortlist/draft still await Nolan's approval; no contact made. Findings=spec-validator
output (by design); facts live in graph fields. Harness FACTS counting fixed to object fields.
Scope: Phase 1 body-contact mining (phone+address) → Phase 2 name-vs-description
void rule → Phase 3 person role gate → Phase 4 per-location blocks (attempt; stop if
it needs architecture expansion). Tests per phase. Commit law, no push, no owner
contact, Oracle untouched. :3100 restart ONLY via /home/nolan/start-3100.sh with
env-flag verification. Acceptance: re-run exact five-URL battery (FACTS counted
from graph.objects[].fields), plus attempted true-SPA and true-legacy extras.
Gate: >=3/5 owner-ready lifts STOP.

## Repo notes
- Served repo: /home/nolan/projects/ping-fyd-converged, branch fyd/convergence-2026-09-28,
  HEAD 278468d8, clean tree. :3100 serves THIS repo (start-3100.sh cds here).
- /home/nolan/projects/ping is a DIFFERENT dev tree (branch fyd/builder-harvest-trackc-2026-09-28,
  HEAD ed3ff708) — not the served code. Do not confuse them.
