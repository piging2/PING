# FYD — EXECUTE THE FIRST BROKEN STEP NOW (2026-09-24, Nolan)

YES. REGENERATE BOTH. PROVE DIFFERENCE. OPEN BOTH IN REAL BROWSERS.
DO NOTHING ELSE UNTIL THIS BOUNDARY IS CLOSED OR PRODUCES A MORE PRECISE BROKEN STEP.

CURRENT VERIFIED FRONTIER:
- Canonical test: 127/127 GREEN
- @graph: VERIFIED (jsonld@9.0.0 generic fix)
- Website A: 15 facts, 2 objects, 1 relationship
- Website B: 38 facts, 4 objects, 3 relationships
- Same proceduralizer: YES
- Determinism: verified across separate processes + reordered fixtures

Stop working upstream. Do not touch acquisition. The current failure boundary is:
OBJECT GRAPH → SITE SPEC → RENDERER → BROWSER.

STEP 1 — REGENERATE BOTH FROM CURRENT GRAPH. Existing generated experiences are stale (predate repaired extraction). Regenerate BOTH from scratch using the repaired pipeline. No hand edits, no customer-specific conditionals, no special templates. Record per site: SOURCE DIGEST, OBJECT IDS, RELATIONSHIPS, SITE SPEC DIGEST, SECTIONS SELECTED, OBJECT → SECTION DEPENDENCIES. Proof that the rendered experience corresponds to the CURRENT object graph.

STEP 2 — PROVE STRUCTURAL DIFFERENCE. Do not accept different company name / description / service strings as "materially different." Compare the two generated SiteSpecs. DID THE GRAPH ACTUALLY CHANGE THE EXPERIENCE? Look at: sections selected, section ordering, component types, object cardinality, relationship-driven sections, navigation, featured objects, available capabilities, content density. Produce a tiny structural diff. If the two SiteSpecs are structurally identical despite materially different graphs: STOP. NEW FIRST BROKEN STEP: SITE PLANNER IS TOO GENERIC. Fix the planner generically. DO NOT patch either customer.

IMPORTANT: DON'T OVERCORRECT. Two different businesses do NOT automatically require wildly different designs. Prove GRAPH SEMANTICS AFFECT COMPOSITION, not AI randomness. Deterministic similarity is GOOD when evidence is similar. Difference must be explainable. Example: "Website B has multiple Service objects, therefore Services section was generated." GOOD. "AI felt Website B should look different." BAD.

STEP 3 — RENDER REAL UI. Render both through the actual FYD renderer (SiteSpec + ObjectGraph + ViewerContext → experience). No unit-test screenshots as substitute, no JSON-only proof, no component-class existence proof.

STEP 4 — REAL BROWSER PROOF. Open both in a real browser. Desktop 1440-ish first, then mobile 375-ish. Verify: page loads, no console-breaking errors, no horizontal overflow, navigation works, sections correspond to SiteSpec, real extracted facts render, missing facts are omitted, no invented claims, links work where expected, generic components handle both sites. Capture browser evidence.

STEP 5 — HOSTILE CONTENT CHECK. Content came from external websites: prove rendered source content cannot become executable UI code. Check HTML escaping, script-like source strings, malformed URLs, unexpected markup. External observations are DATA, never trusted presentation code. Do not turn this into a security project; just prove the renderer boundary is sane.

STEP 6 — MOBILE. No polish. Prove usability: no hover dependency, readable, touchable, navigation usable, primary content visible, no overflow, no desktop-only interaction. If mobile fails: that becomes the first broken step. Fix it before Ask FYD.

STEP 7 — REPORT THE NEW FRONTIER with: CANONICAL TEST / WEBSITE A CURRENT GRAPH / WEBSITE B CURRENT GRAPH / SITE SPEC A (sections/digest) / SITE SPEC B (sections/digest) / STRUCTURAL DIFF / MATERIALLY DIFFERENT (YES/NO + WHY) / CUSTOMER-SPECIFIC CODE (ZERO / EXACTLY WHAT + WHY) / DESKTOP A-B PASS/FAIL / MOBILE A-B PASS/FAIL / SOURCE CONTENT SAFETY PASS/FAIL / FIRST BROKEN STEP / NEXT.

IF THIS GOES GREEN — do not ask what to build next. The next boundary is already known: RENDERED EXPERIENCE → ASK FYD → EVIDENCE. Immediately implement the smallest Ask FYD proof. ONE hard question: "What services does this business offer, and how do you know?" Answer must come from the CURRENT object/evidence graph. Return ANSWER, EVIDENCE REFERENCES, SOURCE URL(S), DIRECT/DERIVED/INFERRED classification. No generic chatbot answer.
THEN WHY THIS: make ONE visible fact inspectable (e.g. Emergency Plumbing → [Why this?] → Source → observed evidence → extraction method → status). Not a provenance dashboard. One interaction.
THEN CORRECTION: prove one CONFIRM/CORRECT/HIDE, then regenerate; the correction must survive.
THEN NATURAL-LANGUAGE SITE CHANGE: "Move emergency plumbing to the top." REQUEST → SITE PATCH PROPOSAL → BEFORE/AFTER → APPROVAL → APPLY → RENDER. No direct filesystem/UI mutation.
THEN SECOND OBSERVATION: observe changed source. Prove SOURCE CHANGE → DIFF → AFFECTED OBJECT → REGENERATION without destroying OWNER CORRECTION or OWNER SITE CUSTOMIZATION. That closes the core loop.

NO DISTRACTIONS UNTIL OBJECT GRAPH → BROWSER IS GREEN: no protocol work, public-social implementation, campaigns, new adapters, MCP, graph DB, crawler benchmarking, new reconciliation work, new authorities, visual design rabbit hole, architecture documents. If existing code can be harvested to close THIS boundary: harvest it. Otherwise build the smallest FYD-specific delta.

THE RULE: WE HAVE PROVEN THE MACHINE CAN UNDERSTAND TWO REAL WEBSITES. NOW PROVE THAT UNDERSTANDING CHANGES WHAT A HUMAN ACTUALLY SEES. OBJECTS → SITE SPEC → RENDERER → BROWSER. CLOSE IT. THEN MOVE EXACTLY ONE BOUNDARY DOWNSTREAM. GO.
