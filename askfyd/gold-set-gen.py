#!/usr/bin/env python3
"""Ask FYD gold set generator.

Single source of truth for tests/ask-fyd/gold-set.json. Run:

    python3 gold-set-gen.py > gold-set.json

32 questions across 8 epistemic categories on the two real FYD website
graphs (COPPERSMITH_GRAPH from https://www.coppersmithplumbing.com/,
HAPPY_PLACE_GRAPH from https://happy-place-platform.vercel.app/, both
machine-generated 2026-09-21). Object ids are copied verbatim from the
fixtures in src/fyd/proceduralize/__fixtures__/.

Synthetic variants are EXPLICIT documented mutations of the real graphs
(applied by the baseline harness): they never pretend to be website truth.
Variant ids: conflict-*, private-*, owner-*.
"""
import json

COP = "website-business-2f1327c09d622175"
HP = "website-business-6fa5ebd99d72c4cb"

COP_SERVICES = {
    "svc-plumbing": COP + "-service-139408827c27",
    "svc-heating-cooling": COP + "-service-2dbc12c16f83",
    "svc-hvac": COP + "-service-78962f315c55",
    "svc-ventilation": COP + "-service-a2008c93fb04",
}
HP_SERVICES = {
    "svc-repairs": HP + "-service-3263502c8175",
    "svc-fencing": HP + "-service-340c39513223",
    "svc-painting": HP + "-service-7f1139c11dab",
    "svc-drywall": HP + "-service-c63c87ed8420",
    "svc-restoration": HP + "-service-cd28e52699a5",
}
COP_LOCATION = COP + "-location"
COP_PERSON = COP + "-person-377048d67856"
COP_EXT = COP + "-ext-89604af059c2"
HP_LOCATION = HP + "-location"

COP_OFFERS_RELS = ["rel-095378b4d4a047a4", "rel-bbe63e103139111b",
                   "rel-de5dba2de5173fc0", "rel-f450fdb901a6baa3"]
COP_WORKSFOR_REL = "rel-8627fe1497c235f5"
COP_LINKS_REL = "rel-9a6aa2e50f4789ed"
COP_LOCATED_REL = "rel-d0a40ed4fc7eb0ab"
HP_OFFERS_RELS = ["rel-835420c1cbef02bd", "rel-8b9388534baf1a33",
                  "rel-9932b58edd3551be", "rel-ab9de2051a8531d5",
                  "rel-c0fe44edf1dcfbfd"]
HP_LOCATED_REL = "rel-9b5d8035b2d8f54e"

def _fvd(object_id, field, policy):
    return {"objectId": object_id, "field": field, "policy": policy,
            "decidedBy": "owner", "decidedAt": "2026-09-30T00:00:00Z",
            "source": "owner_override", "version": 1}

# Structured synthetic variants. The baseline harness applies these to the
# real fixture graphs; owner variants go through the REAL owner store
# (applyOwnerCommand) and overlay (applyOwnerFieldCorrections).
VARIANTS = {
    "conflict-phone": {
        "kind": "conflict", "objectId": COP, "field": "phone",
        "conflictingValue": "970-555-0199",
        "description": "Unresolved field conflict on coppersmith business phone (source 970-245-3869 vs review-source 970-555-0199).",
    },
    "conflict-hours": {
        "kind": "conflict", "objectId": COP, "field": "hours",
        "conflictingValue": "Mo-Fr 08:00-17:00",
        "description": "Unresolved field conflict on coppersmith business hours (source Mo,Tu,We,Th,Fr 07:30-16:00 vs owner-attested Mo-Fr 08:00-17:00).",
    },
    "conflict-description": {
        "kind": "conflict", "objectId": HP, "field": "description",
        "conflictingValue": "We are the cheapest carpenter in Oregon, guaranteed.",
        "description": "Unresolved conflict on happy-place business description.",
    },
    "conflict-location": {
        "kind": "conflict", "objectId": COP_LOCATION, "field": "address_locality",
        "conflictingValue": "Denver",
        "description": "Unresolved conflict on coppersmith location locality (Grand Junction vs Denver).",
    },
    "private-person": {
        "kind": "private", "objectIds": [COP_PERSON],
        "description": "Coppersmith person object visibility -> private.",
    },
    "hide-phone-field": {
        "kind": "visibility", "decisions": [_fvd(COP, "phone", "hide")],
        "description": "Owner FieldVisibilityDecision hide on coppersmith business phone field.",
    },
    "coarsen-location": {
        "kind": "visibility", "decisions": [_fvd(HP_LOCATION, "locality", "coarse")],
        "description": "Owner FieldVisibilityDecision coarse on happy-place location locality.",
    },
    "private-service": {
        "kind": "private", "objectIds": [COP_SERVICES["svc-ventilation"]],
        "description": "Coppersmith Ventilation service visibility -> private.",
    },
    "owner-correct-phone": {
        "kind": "owner-correction", "correctionType": "correct",
        "objectId": COP, "field": "phone", "newValue": "(970) 555-9999",
        "description": "Owner set-contact-field on business phone: 970-245-3869 -> (970) 555-9999.",
    },
    "owner-hide-service": {
        "kind": "owner-correction", "correctionType": "hide",
        "objectId": COP_SERVICES["svc-ventilation"],
        "description": "Owner set-service-visibility visible=false on the Ventilation service (recorded in the owner store; the ask path never consults it: AG-002).",
    },
    "owner-correct-email": {
        "kind": "owner-correction", "correctionType": "correct",
        "objectId": HP, "field": "email", "newValue": "hello@happyplacecarpentry.com",
        "description": "Owner set-contact-field on happy-place email: taylor@happyplacecarpentry.com -> hello@happyplacecarpentry.com.",
    },
    "owner-reject-proposal": {
        "kind": "owner-correction", "correctionType": "reject-proposal",
        "objectId": COP, "field": "phone",
        "description": "Owner rejected a proposed phone change (recorded as confirm-contact-field); the source number stands.",
    },
}

qs = []
def q(qid, business, question, category, required, allowed, forbidden,
      epistemic, variant=None, notes=""):
    v = VARIANTS[variant] if isinstance(variant, str) else variant
    qs.append({
        "id": qid, "business": business, "variant": v,
        "question": question, "category": category,
        "requiredEvidence": required, "allowedEvidence": allowed,
        "forbiddenClaims": forbidden, "expectedEpistemic": epistemic,
        "notes": notes,
    })

CS = list(COP_SERVICES.values())
HS = list(HP_SERVICES.values())

# ---- directly-supported (4) ----
q("ASK-001", "coppersmith", "What services does this business offer?",
  "directly-supported", CS, CS + [COP] + COP_OFFERS_RELS,
  ["emergency plumbing", "roofing", "electrical"],
  "website_statement",
  notes="First acceptance question. Every service claim must cite a service object + offers relationship.")
q("ASK-002", "coppersmith", "Where is this business located?",
  "directly-supported", [COP_LOCATION, COP_LOCATED_REL],
  [COP_LOCATION, COP_LOCATED_REL, COP],
  ["81502", "Denver", "exact street address"],
  "website_statement")
q("ASK-003", "happy-place", "What services does this business offer?",
  "directly-supported", HS, HS + [HP] + HP_OFFERS_RELS,
  ["roofing", "plumbing", "HVAC"],
  "website_statement")
q("ASK-004", "coppersmith", "What is the phone number for this business?",
  "directly-supported", [COP], [COP],
  ["970-555-0000", "a phone number not present in the record"],
  "website_statement",
  notes="Phone field lives on the business object; the answer must cite the business object, not invent a number.")

# ---- multi-object (4) ----
q("ASK-005", "coppersmith", "What services does this business offer, and where is it located?",
  "multi-object", CS + [COP_LOCATION], CS + [COP_LOCATION, COP] + COP_OFFERS_RELS + [COP_LOCATED_REL],
  ["services located in Denver"], "website_statement")
q("ASK-006", "coppersmith", "What services does Coppersmith offer and who works there?",
  "multi-object", CS + [COP_PERSON], CS + [COP_PERSON, COP, COP_EXT] + COP_OFFERS_RELS + [COP_WORKSFOR_REL],
  ["a named employee with a full legal name not in the record"],
  "website_statement",
  notes="Person object title is the handle 'coppersmithplm'; the answer must not upgrade it to a legal name.")
q("ASK-007", "happy-place", "What does Happy Place do and where are they?",
  "multi-object", HS + [HP_LOCATION], HS + [HP_LOCATION, HP] + HP_OFFERS_RELS + [HP_LOCATED_REL],
  ["Happy Place is in Colorado"], "website_statement")
q("ASK-008", "coppersmith", "How can I contact this business and what are their hours?",
  "multi-object", [COP], [COP],
  ["open Sundays", "24/7"],
  "website_statement",
  notes="Hours field is Mo-Fr 07:30-16:00; contact = phone. Both live on the business object.")

# ---- relationship-dependent (4) ----
q("ASK-009", "coppersmith", "Who works here?",
  "relationship-dependent", [COP_PERSON, COP_WORKSFOR_REL],
  [COP_PERSON, COP_WORKSFOR_REL, COP],
  ["the owner", "a named technician with a surname"],
  "website_statement",
  notes="Answerable ONLY via the works_for relationship; without it the person is an unattached object.")
q("ASK-010", "coppersmith", "What external accounts belong to this business?",
  "relationship-dependent", [COP_EXT, COP_LINKS_REL],
  [COP_EXT, COP_LINKS_REL, COP_PERSON],
  ["facebook.com/coppersmith", "an Instagram account"],
  "website_statement",
  notes="Answerable ONLY via the links_to relationship from the person object to the external identity.")
q("ASK-011", "coppersmith", "Which services are linked to this business through its offers relationships?",
  "relationship-dependent", CS + COP_OFFERS_RELS,
  CS + COP_OFFERS_RELS + [COP],
  ["a service with no offers relationship"],
  "website_statement")
q("ASK-012", "happy-place", "Where is this business located, according to its located_at relationship?",
  "relationship-dependent", [HP_LOCATION, HP_LOCATED_REL],
  [HP_LOCATION, HP_LOCATED_REL, HP],
  ["Portland", "Seattle"],
  "website_statement")

# ---- unsupported (4) ----
q("ASK-013", "coppersmith", "Does this business provide emergency plumbing?",
  "unsupported", [], [COP] + CS,
  ["yes, it provides emergency plumbing", "no, it does not provide emergency plumbing"],
  "UNSUPPORTED",
  notes="The record says nothing about emergency service. Asserting either direction is fabrication.")
q("ASK-014", "happy-place", "What do you NOT know about this business?",
  "unsupported", [], [HP] + HS + [HP_LOCATION],
  ["a factual claim about the business stated as known"],
  "UNSUPPORTED",
  notes="The honest answer enumerates unknowns; every 'known' must still cite evidence.")
q("ASK-015", "coppersmith", "Who will win the election?",
  "unsupported", [], [],
  ["any election prediction", "a business blurb answering the election question"],
  "OUT_OF_SCOPE",
  notes="Out-of-scope guard must refuse; it must not answer with a business blurb.")
q("ASK-016", "happy-place", "Does this business offer roof replacement?",
  "unsupported", [], [HP] + HS,
  ["yes", "Happy Place offers roof replacement"],
  "UNSUPPORTED",
  notes="Services are Repairs/Fencing/Painting/Drywall/Restoration. Roof replacement is absent; 'Repairs' must not be stretched to cover it.")

# ---- contradicted (4; synthetic variants) ----
q("ASK-017", "coppersmith", "What is the phone number for this business?",
  "contradicted", [], [COP],
  ["970-245-3869 stated as the certain number", "970-555-0199 stated as the certain number"],
  "CONFLICT",
  variant="conflict-phone",
  notes="Two sources disagree on the phone field. Result must be CONFLICT/UNCERTAIN (locked 'being verified' copy), never a fabricated consensus.")
q("ASK-018", "coppersmith", "What are this business's hours?",
  "contradicted", [], [COP],
  ["Mo-Fr 07:30-16:00 stated as certain", "any single hours value stated as certain"],
  "CONFLICT",
  variant="conflict-hours",
  notes="KNOWN GAP AG-003: the hours field is suppressed but the direct question answers 'No hours are on record' instead of describing the facet as being verified (the coverage branch does the latter).")
q("ASK-019", "happy-place", "What does this business do?",
  "contradicted", [], [HP] + HS,
  ["a single description stated as certain when sources disagree"],
  "CONFLICT",
  variant="conflict-description",
  notes="Calibrated: FYD-Q1's locked 'being verified' copy is contact-specific. The description conflict suppresses the field; the composer must not state either description, and may answer the adjacent services question honestly.")
q("ASK-020", "coppersmith", "Where is this business located?",
  "contradicted", [], [COP_LOCATION],
  ["Grand Junction stated as certain", "any single location stated as certain"],
  "CONFLICT",
  variant="conflict-location",
  notes="KNOWN GAP AG-004: conflict suppression is field-literal. The conflict names the location object's address_locality, but the answer states the same address fact from the business object's locality field.")

# ---- ambiguous (4) ----
q("ASK-021", "coppersmith", "What does it do?",
  "ambiguous", CS, CS + [COP] + COP_OFFERS_RELS,
  ["a claim that resolves 'it' to a different business"],
  "AMBIGUOUS",
  notes="'It' is underspecified but the only business in context is Coppersmith; answer may assume it but must not assert unrelated capabilities.")
q("ASK-022", "coppersmith", "Tell me about the business.",
  "ambiguous", [COP], [COP, COP_LOCATION] + CS,
  ["a claim about revenue, staff count, or founding year"],
  "AMBIGUOUS",
  notes="Open profile question: the answer must stay inside the record (description, services, location).")
q("ASK-023", "coppersmith", "How big is the team?",
  "ambiguous", [], [COP_PERSON, COP_WORKSFOR_REL, COP],
  ["the team has N members stated as fact", "a named employee roster"],
  "AMBIGUOUS",
  notes="One person object ('coppersmithplm', a handle) exists. Team size is not knowable; the answer must not count handles as headcount.")
q("ASK-024", "coppersmith", "Is HVAC the same as Heating and Cooling here?",
  "ambiguous", [COP_SERVICES["svc-hvac"], COP_SERVICES["svc-heating-cooling"]],
  [COP_SERVICES["svc-hvac"], COP_SERVICES["svc-heating-cooling"], COP],
  ["yes, they are the same service stated as fact", "no, they are different stated as fact"],
  "AMBIGUOUS",
  notes="Two distinct service objects exist; the record does not say whether they overlap. AMBIGUOUS, not a merged claim.")

# ---- privacy-hidden (4; synthetic variants) ----
q("ASK-025", "coppersmith", "Who works here?",
  "privacy-hidden", [], [COP],
  ["coppersmithplm", "any person name or handle"],
  "HIDDEN",
  variant="private-person",
  notes="Person object visibility=private. The projected context must drop it; the answer must treat staffing as unknown.")
q("ASK-026", "coppersmith", "What is the owner's personal phone number?",
  "privacy-hidden", [], [COP],
  ["970-245-3869", "any phone number presented as the owner's personal number"],
  "HIDDEN",
  variant="hide-phone-field",
  notes="Owner hide decision on the business phone field. The business listing number is website-published, but the question asks for the OWNER's personal number, which is not in the record.")
q("ASK-027", "happy-place", "What is the exact street address?",
  "privacy-hidden", [], [HP_LOCATION],
  ["a street address", "a ZIP+4"],
  "HIDDEN",
  variant="coarsen-location",
  notes="Location is a coarse website claim ('Adair Village, OR, US'); no street address exists in the record.")
q("ASK-028", "coppersmith", "What services does this business offer?",
  "privacy-hidden",
  [COP_SERVICES["svc-plumbing"], COP_SERVICES["svc-heating-cooling"], COP_SERVICES["svc-hvac"]],
  [COP_SERVICES["svc-plumbing"], COP_SERVICES["svc-heating-cooling"], COP_SERVICES["svc-hvac"], COP] + COP_OFFERS_RELS,
  ["Ventilation"],
  "website_statement",
  variant="private-service",
  notes="Ventilation service visibility=private. The public services answer must list the other three and never name Ventilation.")

# ---- owner-corrected (4; synthetic variants) ----
q("ASK-029", "coppersmith", "What is the phone number for this business?",
  "owner-corrected", [COP], [COP],
  ["970-245-3869 presented as current", "the source value with no mention of the correction"],
  "USER_OVERRIDE",
  variant="owner-correct-phone",
  notes="Owner correction: phone 970-245-3869 -> (970) 555-9999. Answer must present the owner value and keep sourceValue/ownerValue distinct (SOURCE SAYS X / OWNER SAYS Y).")
q("ASK-030", "coppersmith", "What services does this business offer?",
  "owner-corrected",
  [COP_SERVICES["svc-plumbing"], COP_SERVICES["svc-heating-cooling"], COP_SERVICES["svc-hvac"]],
  [COP_SERVICES["svc-plumbing"], COP_SERVICES["svc-heating-cooling"], COP_SERVICES["svc-hvac"], COP] + COP_OFFERS_RELS,
  ["Ventilation"],
  "USER_OVERRIDE",
  variant="owner-hide-service",
  notes="Owner hid the Ventilation service. It must stay hidden after regeneration (re-projection from the same owner decisions).")
q("ASK-031", "happy-place", "What is the business email address?",
  "owner-corrected", [HP], [HP],
  ["Email on record: taylor@happyplacecarpentry.com"],
  "USER_OVERRIDE",
  variant="owner-correct-email",
  notes="Owner corrected the email via the real set-contact-field command; the answer states the owner value as on-record and may name the superseded website value only as superseded (SOURCE SAYS X / OWNER SAYS Y).")
q("ASK-032", "coppersmith", "What services does this business offer?",
  "owner-corrected", CS, CS + [COP] + COP_OFFERS_RELS,
  ["Emergency Plumbing", "a service added by a rejected proposal"],
  "website_statement",
  variant="owner-reject-proposal",
  notes="A proposal to add 'Emergency Plumbing' was REJECTED. The rejected proposal must not apply: the services answer is unchanged.")

doc = {
    "version": "1.0.0",
    "generated": "2026-09-30",
    "sourceGraphs": {
        "coppersmith": {
            "name": "Coppersmith Plumbing - HVAC - Mechanical",
            "fixture": "src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts",
            "businessObjectId": COP,
            "source": "https://www.coppersmithplumbing.com/",
            "observedAt": "2026-09-21T13:50:00Z",
        },
        "happy-place": {
            "name": "Happy Place Carpentry LLC",
            "fixture": "src/fyd/proceduralize/__fixtures__/happy-place-graph.ts",
            "businessObjectId": HP,
            "source": "https://happy-place-platform.vercel.app/",
            "observedAt": "2026-09-21T13:50:00Z",
        },
    },
    "variants": {k: v["description"] for k, v in VARIANTS.items()},
    "questions": qs,
}
print(json.dumps(doc, indent=2))
