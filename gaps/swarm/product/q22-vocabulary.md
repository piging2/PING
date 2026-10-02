# Q22 — OBSERVE → UNDERSTAND → PROJECT (vocabulary audit)
Audited: 2026-10-01 ~18:24 MDT
Worktree SHA: 2b5c95eef02f3c271c3c1966ec80df2f7e629876
Plane: homepage hero + first viewport (src/app/page.tsx:172-235, hero-evidence-card.tsx)

## Vocabulary half (completed)

First-viewport tokens, classified for a stranger (no PING context):

PLAIN LANGUAGE (no insider knowledge needed):
- H1: "Systems that remember, agents you can trust"
- Sub: "PING turns information into reliable understanding, understanding into useful action, and action into evidence that can be trusted and replayed."
- CTAs: "Explore the architecture" / "PING Social"
- Steps on the card: "New lead submitted", "Canonical event stored", "Mission created: LEAD_FOLLOWUP", "Workers ran"
- Badge words: "Evidence card", "Captured 2026-07-28", "A captured record from PING's own commissioning run. Not live activity."

REQUIRES PING VOCABULARY (insider terms, unexplained in viewport):
- "/live" (eyebrow taxonomy; the comment in page.tsx:29 calls it a "taxonomy, picked once and used relentlessly" — a visitor sees a path fragment, not a meaning)
- Tagline: "Continuity infrastructure for AI agents and the businesses they serve." ("Continuity infrastructure" is PING vocabulary)
- "This site is a live TenantOS tenant." (TenantOS undefined; "tenant" unexplained)
- "Maturity labels on this page say what is real." (maturity labels are PING-internal; a stranger does not know Live/Built/Experimental/Direction)
- "replaying captured record", "canonical-event-envelope v1.0.0", "store: append-only", "event_id", "mission_id", "priority 3"
- "ping-gateway: healthy · constitution 1.0.0 · auth enforced on reads" (gateway, constitution are PING-internal; presented as a status line a stranger cannot evaluate)
- "OBSERVED / RECORDED / TASKED / EXECUTED" verbs (imply an event pipeline model the visitor has not been taught)

FYD's LOOP IS NOT ON THE HOMEPAGE. The PRODUCT LANE order defines FYD's loop as:
URL → UNDERSTAND → GENERATED PRESENCE → ASK FYD → EVIDENCE → OWNER CHANGE → REGENERATION → OUTCOME.
The homepage hero teaches the PING commissioning loop (observe → record → task → execute), not FYD's loop. "OBSERVE → UNDERSTAND → PROJECT" as phrased in the question does not appear on the homepage at all — the visible loop beats are OBSERVE / REMEMBER / CONNECT / ACT / PROVE. So the vocabulary audit's subject (FYD's loop) cannot be performed against the hero: there is nothing to audit it against. FYD's loop would need to be found on a FYD surface (generated site / fyd pages), not the PING marketing homepage.

Honest reading: the hero teaches "PING remembers things and shows its work" (comprehensible at the H1 level) but the mechanism panel beside it is written in PING's own vocabulary (canonical event, mission, gateway, constitution, TenantOS, maturity labels). A stranger gets the promise, not the loop.

## External-human comprehension test — UNKNOWN

The human test cannot be run by this agent. Exact protocol for Nolan:

1. Recruit 3–5 adults who have never seen PING: no AI-infra background, no prior briefing. Business owners preferred (target audience), one technical skeptic.
2. Setup: open the homepage, first viewport only (no scroll). Give them 10 seconds, silent. No prompting, no hints.
3. Questions (verbatim, in order):
   a. "In your own words, what does this company do?"
   b. "Who is it for?"
   c. "What do you think would happen if you clicked the big button?"
   d. "Read the small box on the right. What is it showing you?"
   e. "What does the word 'tenant' mean here, do you think?"
4. Scoring (pre-registered): PASS if ≥3/5 answer (a) with something like "software that remembers business activity / keeps records agents can use" WITHOUT using the words tenant, canonical, gateway, constitution, or maturity; and ≥3/5 cannot define (e) — proving the vocabulary is opaque. FAIL otherwise.
5. FYD addendum (separate session, since the homepage does not show FYD's loop): show a generated FYD site with the Ask FYD widget to 3 business owners, 10 seconds; ask "What would this do for YOUR business?" and "What happens when you type a question here?" PASS if ≥2/3 describe "ask the website questions, it answers from the business's own records."

## Verdict

PROPOSITION: "A stranger understands FYD's loop without PING vocabulary."
STATUS: UNKNOWN (human half); vocabulary half = the homepage hero is PING-vocabulary-heavy and does not contain FYD's loop at all, so the proposition's premise does not hold on the audited surface.
SMALLEST FIX IF FAIL: decide which surface teaches FYD's loop (a FYD page, not the PING homepage), then run the protocol above; if the hero must teach anything, teach the promise in the H1 and move the gateway/envelope/mission vocabulary below the fold.
