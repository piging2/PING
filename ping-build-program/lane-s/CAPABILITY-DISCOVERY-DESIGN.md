# CAPABILITY DISCOVERY DESIGN (Lane S)

**Status:** design complete, spike next.
**Date:** 2026-09-23. **Author:** lane S+O worker.

## 1. Problem

The graph describes what EXISTS (objects, fields, relationships). Nothing describes what can be DONE. A phone number sits on the business object as a field; no record anywhere says "this business can be reached by phone, and here is the evidence, and here is the policy decision that authorizes presenting it." Today capabilities appear ad hoc: the portal Circle hardcodes follow/like/ask/website, object views carry an ObjectCapability union, the contact flow renders phone/email. Each is hand-wired. None is DISCOVERED from observations, none passes a policy gate, none has a lifecycle.

The rule: **observation "contact form exists" becomes resolved capability contact.request ONLY after policy/validation.** Without the gate, FYD would present fabricated contact paths, spoofed numbers, and phishing forms as business capabilities. The gate is the product.

## 2. What PING already has (and what is missing)

| Asset | Location | Role in this design |
|---|---|---|
| ObjectCapability union (view/ask/follow/like/call/email/website/directions/reference) | src/fyd/object/types.ts | The PRESENTATION vocabulary for object views. Lane S feeds it; does not replace it. Resolved capabilities project onto these kinds. |
| ContactMethod + contact flow (evidence-backed, no tel:/mailto: outside the flow) | src/fyd/components/contact-link.tsx, src/fyd/object/object-projection.ts | The phone/email policy precedent: binding-verified values, safe-link gate, provenance receipt shown to the visitor. The POLICY GATE generalizes this pattern to all capability kinds. |
| CapabilityRuntime (portal Circle) | src/fyd/capabilities/runtime.ts | Execution runtime for portal actions. Discovery is upstream of it. |
| Ask FYD agent capability boundary (fail-closed grants) | src/fyd/ask/capabilities.ts | The fail-closed precedent: unknown = denied. The discovery gate is fail-closed the same way. |
| Claim grades SUPPORTED/DERIVED/INFERRED/UNKNOWN | src/fyd/ask/concierge.ts, factory BUILD-BUSINESS-SPEC stage 3 | The evidence language detectors emit and the gate requires. |
| Owner HIDE/CORRECT replay | src/fyd/owner-mode/corrections.ts | Owner suppression of a capability reuses the assertion journal, not a parallel mechanism. |

**Missing:** detectors over observations, the policy gate, the capability record, the candidate/resolved/withdrawn lifecycle, and the rule that Ask FYD and MCP (lane I) may only consume RESOLVED capabilities.

## 3. The pipeline

```
OBSERVATIONS (stage 2, graded stage 3)
  -> DETECTORS (deterministic, no LLM): emit CANDIDATE capabilities with evidence refs
  -> POLICY GATE (fail-closed): authorization, legitimacy, safety, evidence, owner state
  -> RESOLVED capabilities (records in the graph-adjacent capability registry)
  -> CONSUMERS: object views (ObjectCapability projection), Ask FYD contexts (lane G),
     SiteSpec sections (contact/booking CTAs), MCP tools (lane I, resolved only)
```

Detectors and the gate are PURE functions of (observations, claims, owner journal heads, policy version). Same inputs -> same candidates -> same resolutions. No clock, no network, no model.

## 4. Detector set (v1)

Each detector matches graded observations and emits candidates. Minimum evidence: the observation must be graded SUPPORTED or DERIVED with >= 1 citation. INFERRED and UNKNOWN observations never produce candidates (they may produce nothing, honestly).

| Detector | Observation pattern | Candidate kind |
|---|---|---|
| phone-detector | tel: anchor, schema.org telephone, JSON-LD contactPoint, or phone-shaped text in a contact context | contact.request via phone |
| email-detector | mailto: anchor, schema.org email | contact.request via email |
| form-detector | <form> with contact/quote fields, or schema.org ContactPage / "request a quote" flow | contact.request via form |
| booking-detector | schema.org ScheduleAction / reservation endpoints, embedded booking widgets (calendly/acuity/square-appointments iframes), "book online" flows | booking.schedule |
| quote-detector | "get a quote"/"request estimate" flows distinct from generic contact (multi-field: service type, project details) | quote.request |
| storefront-detector | product/offer schema, cart/checkout flows, price lists with purchasable items | order.purchase |
| newsletter-detector | newsletter signup forms, subscribe endpoints | subscribe.newsletter |
| calendar-detector | event/calendar feeds, class schedules with enrollment | calendar.subscribe / event.enroll |
| api-detector | documented public API endpoints, MCP server announcements (mcp.json, /.well-known) | api.invoke |
| provider-action-detector | directory/GBP messaging buttons, Facebook Page Message button, WhatsApp click-to-chat links | contact.request via provider channel |
| social-dm-detector | linked social profiles with messaging affordances | contact.request via social DM |
| location-detector | address + geo + hours + "visit us" patterns | visit.in_person |

Kill criterion per detector: if a detector cannot be written deterministically (regex/schema/DOM-shape matching over observations), it does not ship. No detector may call a model. A detector that needs judgment becomes a human-review queue entry, never a silent resolver.

## 5. The POLICY GATE

A candidate becomes RESOLVED only if ALL of the following pass. Fail-closed: any check that cannot be evaluated = FAIL. The gate decision is recorded on the capability record (section 6): which policy version ran, which checks passed, when.

1. **Evidence sufficiency.** The candidate's observations are graded SUPPORTED or DERIVED with >= 1 citation each, and at least one citation is first-party (the business's own site) or owner-attested. A phone number observed ONLY on an unaffiliated third-party page does not resolve.
2. **Authorization.** The observation source must be authorized to speak for the business: first-party site, owner assertion, or a directory the business demonstrably controls (GBP with matching domain, Facebook Page with matching website link). Scraped aggregator content alone never authorizes.
3. **Legitimacy (no invention).** The gate never invents contact info. A detector that "helpfully" normalizes a partial number into a callable one FAILS. Display values are binding-verified exactly as observed (the ContactMethod precedent).
4. **Safety.** Every URI the capability would present passes the safe-link gate (https/mailto/tel allowlist, control characters rejected, parser-based). A form endpoint on a lookalike domain (homograph, typosquat) FAILS. Booking widgets load only from an allowlisted provider set; anything else resolves to "booking offered, link withheld pending review" rather than a live link.
5. **No customer-posing.** Capabilities are presented for the VISITOR to initiate contact with the business. The gate rejects any capability whose fulfillment would require FYD (or PING) to pose as a customer, submit fake inquiries, or trigger provider actions on the visitor's behalf without explicit visitor action. This is the constitutional echo of the outreach rule: we never pose as a customer.
6. **Owner state.** An owner HIDE assertion on the underlying fact or on the capability itself suppresses resolution (status stays candidate with suppression noted, or an existing resolved capability moves to withdrawn with cause owner_hidden). An owner CORRECT on the fact re-runs detection against the corrected value. Owner attestation (CONFIRM) satisfies check 1's first-party requirement by itself.
7. **Conflict honesty.** If the underlying fact is under an unresolved conflict (stage 5 ConflictRecord), the capability resolves only when the conflict does not touch the capability's parameters (e.g. conflicting Saturday hours do not block a phone capability; conflicting phone numbers block it).

## 6. Capability record format

```jsonc
{ "capability_id": "cap_<sha256(tenant_id|kind|endpoint_identity)>[:16]",  // deterministic, stable
  "tenant_id": "clearwater-plumbing-demo",
  "kind": "contact.request | booking.schedule | quote.request | order.purchase | subscribe.newsletter | calendar.subscribe | event.enroll | api.invoke | visit.in_person",
  "channel": "phone | email | form | provider | social_dm | in_person | api",
  "status": "candidate | resolved | withdrawn",
  "parameters": { "display_value": "(970) 555-0142", "action_uri": "tel:+19705550142",
                  "form_url": "https://…", "provider": "facebook_page", "notes": "…" },
  "evidence": [ { "claim_id": "…", "grade": "SUPPORTED", "source_id": "site",
                  "observed_at": "2026-09-23T19:00:00.000Z" } ],
  "policy": { "policy_version": "cap-policy@1", "decided_at": "2026-09-23T19:05:00.000Z",
              "checks": { "evidence": "pass", "authorization": "pass", "legitimacy": "pass",
                          "safety": "pass", "no_customer_posing": "pass",
                          "owner_state": "pass", "conflict": "pass" },
              "decided_by": "policy-gate" },
  "lineage": { "observation_ids": ["obs_…"], "detector": "phone-detector@1",
               "supersedes": null },
  "surfaces": ["object_view", "ask_context", "sitespec_contact_section"],
  "version": 3, "updated_at": "2026-09-23T19:05:00.000Z" }
```

Records live in a per-tenant capability registry (JSONL, alongside the graph, never inside canonical objects: capabilities are DERIVED truth, section 9 of SOUL). Consumers read the registry; the registry never edits the graph.

## 7. Lifecycle

- **candidate:** emitted by a detector. Visible to NOBODY except the pipeline and the owner console (as "detected, under review"). Ask FYD, MCP, and the rendered site never see candidates.
- **resolved:** gate passed. Consumable by object views, Ask FYD (lane G includes resolved capabilities in the context packet), SiteSpec sections, MCP tools (lane I).
- **withdrawn:** the source observation disappeared on refresh (detector emits ABSENT), the value failed re-validation, the owner hid it, or a conflict now touches its parameters. Withdrawal is an append, never a delete: the record keeps status history with causes and lineage. A withdrawn capability MUST NOT be presented by Ask FYD (lane G's compiler filters status != resolved), MUST NOT be offered as an MCP tool, and its affordances are removed from regenerated sections (the dependency index's cap nodes invalidate on status change).
- **re-resolution:** if the observation reappears, the detector emits a fresh candidate that supersedes the withdrawn record (lineage.supersedes links them). The gate runs again from scratch: past resolution is not inherited.

## 8. Worked examples (5 capability types, end to end)

### 8.1 Phone: contact.request via phone
Observations: tel:+19705550142 anchor in the site header (grade SUPPORTED, source site, first-party) + schema.org telephone "+1-970-555-0142" in JSON-LD (SUPPORTED, same source). Detector phone-detector emits candidate {kind: contact.request, channel: phone}. Gate: evidence pass (two first-party SUPPORTED citations); authorization pass (first-party site); legitimacy pass (value used verbatim, E.164 normalized only for the action URI, display value binding-verified as observed); safety pass (tel: allowlisted, digits verified); no-customer-posing pass (visitor-initiated call); owner state pass (no assertions); conflict pass (no conflict on phone). RESOLVED. Projects to ObjectCapability {kind: call, href inside the contact flow only}, Ask FYD answers "call them at (970) 555-0142" with the provenance receipt, and the contact section CTA.

### 8.2 Email: contact.request via email
Observation: mailto:hello@clearwater.example.com in the footer (SUPPORTED, first-party). Same gate path as phone; action URI mailto:. RESOLVED. The contact flow shows "Send email" with the evidence receipt "from the business website."

### 8.3 Contact form: contact.request via form
Observations: a <form action="https://clearwater.example.com/contact" method="post"> with name/email/message fields on /contact (SUPPORTED, first-party) + schema.org ContactPage (DERIVED). Detector form-detector emits candidate. Gate: safety check scrutinizes the form action URL (same-origin as the observed site: pass; a third-party form handler like formspree with the business's account id: pass with provider noted; an action URL on an unrelated domain: FAIL). RESOLVED with parameters {form_url}. The rendered site links OUT to the business's own form (FYD never proxies submissions: no customer-posing, no data custody).

### 8.4 Booking: booking.schedule
Observations: an embedded Calendly iframe (SUPPORTED, first-party page) + "Book online" anchor to https://calendly.com/clearwater-plumbing (SUPPORTED). Detector booking-detector emits candidate. Gate: safety pass requires the booking provider to be on the allowlist (calendly, acuity, square, booksy, v1 set); the URL's account slug is recorded but never validated by probing (no fake bookings to test it: no customer-posing). RESOLVED with parameters {provider: calendly, booking_url}. Ask FYD may say "booking is offered through their online scheduler" with the link inside the capability affordance; it may NOT book on the visitor's behalf.

### 8.5 Quote request: quote.request
Observations: a multi-field "Request an estimate" flow (service type dropdown, project description, ZIP) posting to the business's own endpoint (SUPPORTED, first-party). Detector quote-detector emits candidate (distinct from the generic contact form by field shape: project-scoped fields). Gate passes as in 8.3. RESOLVED. This is the capability the estimate-form section binds to; if the flow disappears on refresh, the capability withdraws and the dependency index invalidates the estimate-form section (cap node -> section edge), so the site stops advertising a dead quote flow instead of serving a 404.

## 9. Red team: capability spoofing via malicious site content

**Threat 1: premium-rate / attacker number injection.** A compromised business site (or a malicious lookalike the pipeline ingested by mistake) publishes tel:+1-900-… or a competitor's number. The detector fires; the gate's authorization check (first-party or owner-attested) is the defense. If the compromise IS on the first-party site, the gate cannot distinguish it from a legitimate change: defense in depth is (a) the contact flow's provenance receipt shows the visitor exactly where the number came from and when it was observed; (b) a value change on an already-resolved capability triggers re-resolution, and a change to a DISSIMILAR value (different area code/exchange than the previously resolved one) is flagged for owner review instead of auto-resolving (velocity check); (c) the owner correction loop (CORRECT/HIDE) outranks any observation.

**Threat 2: phishing form.** A form posts to an attacker domain. The gate's safety check fails closed on non-allowlisted, non-same-origin form actions. The form never becomes a resolved capability; the candidate is recorded with the failure cause for the owner console.

**Threat 3: detector spoofing via SEO spam.** Keyword-stuffed "call now!!!" text with a phone-shaped string in a blog comment section. The detector requires a contact CONTEXT (tel: anchor, schema.org, or contact-section DOM shape), not bare phone-shaped text. Bare text never produces a candidate.

**Threat 4: LLM-detector hallucination.** Eliminated by construction: no model in the detection path (section 4 kill criterion). If a future detector needs judgment, it emits a review-queue entry, never a resolution.

**Threat 5: capability laundering into Ask FYD.** A candidate that never passed the gate being presented as fact by the concierge. Eliminated by the consumer contract: lane G's context compiler and lane I's tool registry read ONLY status=resolved records. The spike tests this boundary.

**Threat 6: stale resolved capability.** The business removes its booking widget; FYD keeps advertising booking. The lifecycle (section 7) + dependency index cap nodes handle it: detector emits ABSENT on refresh -> withdrawn -> ask contexts and sections invalidate -> regeneration removes the affordance. Staleness budget for capabilities follows the contact-adjacent class (one batch tick).

## 10. Kill criteria and optionality

- Kill any detector that needs a model to function. Kill the provider-action detector's auto-resolution for providers without a verifiable business-control signal; those stay candidates for owner confirmation.
- Reject capability kinds that require FYD to hold visitor data or act on the visitor's behalf (no form proxying, no booking execution, no message sending). The capability authorizes PRESENTATION of the affordance, never execution of the action.
- Optionality: the registry is per-tenant JSONL; the gate is a pure function versioned as cap-policy@N. A new policy version re-runs over existing candidates without re-ingestion. Consumers (Ask FYD, MCP, SiteSpec) depend on the record shape, not the detector internals: detectors are replaceable.
