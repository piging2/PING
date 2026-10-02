# Tenant-Prep Corrections — generic generator vs real public data (2026-09-27, Track C)

Business: Rescue 1 Plumbing, 554 25 Rd, Grand Junction, CO (independent,
family-owned, in-corridor). Source: their public website, fetched 2026-09-27.
Profile: tenant-prep/demo-sites/businesses/rescue-1-plumbing.json.
Built with the GENERIC path only: `python3 generate.py rescue-1-plumbing`
(trades template, no bespoke template). Build is deterministic
(byte-identical on rebuild, sha256-verified).

Nothing invented: testimonials intentionally empty (review quotes not
captured with attribution), email intentionally omitted (not published).
These two honest omissions are what broke the generator. Findings:

## C1 — Empty testimonials render a misleading reviews section
Evidence: sites/rescue-1-plumbing/index.html, reviews section: header
"What Customers Say" + lead "Real feedback from people in the community we
serve." + EMPTY .reviews-grid.
Correction needed: trades template must omit the reviews section when the
testimonials list is empty. Audit knowledge/technology templates for the same
list-driven-section class.

## C2 — Missing email renders three dead mailto: links
Evidence: index.html:168 `<a ... href="mailto:">Send via Email</a>`;
index.html:175 `<li><strong>Email:</strong> <a href="mailto:"></a></li>`;
index.html:197 footer `<a href="mailto:"></a>`.
Correction needed: conditional email rendering; drop the Email row and the
"Send via Email" button when email is absent.

## C3 — Quote form silently drops requests when email is absent
Evidence: app.js builds the confirmation mailto from baseHref "mailto:",
producing "mailto:?subject=..." — visitor submits, compose window opens with
NO recipient, request goes nowhere. The visitor believes it was sent.
Correction needed: fail the build loudly when email is missing (profile
validation), OR switch the no-email form to an honest phone-first CTA.

## C4 — "Service Needed" dropdown ignores the business's real services
Evidence: index.html:149-155 hardcodes Repair / Installation / Maintenance /
Inspection / Estimate / Other. The business's 8 real services (Grease Traps,
Evaporative Coolers, Sewer Services, Boiler and Radiator Plumbing, ...) do
not appear in the quote form at all.
Correction needed: populate the select from the profile's services[] at build
time.

## C5 — Demo-to-live transition is a manual README step
Evidence: README says "When a prospect adopts a site, remove that element
before publishing"; form confirmation says "This is a demo site, so nothing
was sent."
Correction needed: a build flag (e.g. --live) that strips #demo-badge and
demo copy. Publishing must not depend on a human remembering a README line.

## C6 — No required-field validation
Evidence: build_tokens() uses .get(..., "") everywhere; empty business_name /
phone / services renders an empty hero silently, while leftover {{TOKENS}}
fail loudly. Inconsistent failure philosophy.
Correction needed: fail loudly on empty required fields (business_name,
phone_display, phone_href, services non-empty, address).

## C7 — No first-class verified-vs-derived field marking
Evidence: provenance had to be smuggled in as an ad-hoc "_provenance" key the
generator ignores; nothing connects "email unverified" to "omit email UI".
Correction needed: per-field verification flags the template can branch on
(consistent with the FYD FACTUAL/DERIVED labeling doctrine).

## Verified OK (non-findings)
- Deterministic rebuild: byte-identical index.html (sha256 OK).
- 8 service cards, 9 service areas, 6 trust points, hours all render.
- Demo badge present (line ~182). No invented reviews, no fabricated email.
- No leftover {{TOKENS}}; generator's fail-loud behavior intact.
- XSS battery: `<script>alert(1)</script>`, quotes, `&`, `<img onerror>` in
  business_name and service names are all HTML-escaped (0 unescaped
  occurrences). esc() is solid.
- 25-service battery: renders 25 cards, no crash, no truncation.

## C8 — Edge battery: missing phone / missing services (extends C1, C2)
Profiles: businesses/edge-sparse.json (no services key, no phone),
businesses/edge-xss.json, businesses/edge-many.json. All built without error.
- Missing phone renders dead hero CTAs: `<a class="btn btn-call" href="">Call
  </a>` (lines 24, 36) and an empty "Phone:" row (line 160). The PRIMARY
  conversion element becomes a dead button. Generalizes C2: every contact
  field needs conditional rendering, not just email.
- Missing services still renders an empty `#services` section. Generalizes C1:
  section omission must apply to services (and every list-driven section), not
  just testimonials.
- Correction needed: required-field validation (C6) plus conditional sections
  for all list-driven blocks.
