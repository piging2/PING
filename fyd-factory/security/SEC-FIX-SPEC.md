# SEC-FIX-SPEC: /o Object-Page XSS-Class Seam Holes

**Source verdict:** [HOSTILE-VERDICT.md](../qa/hostile/HOSTILE-VERDICT.md) (QA-HOSTILE, 2026-09-23)
**Scope:** minimal fix specification only. Nothing applied to the Pig repo (read-only).
**Branch:** fyd-factory, /home/nolan/projects/ping
**Design authority:** `resolveSafeLink` in `src/fyd/sitespec/safe-link.ts` is the single
link authority. No new SecurityAuthority, no second allowlist. All patches verified
with `git apply --check` against the Pig working tree on 2026-09-23.

## Patch index

| # | Patch file | Finding | Status |
|---|-----------|---------|--------|
| 1 | [o-capability-safe-link.patch](../patches/o-capability-safe-link.patch) | BYPASS-1/2 (A35, A36), also W2 (A37) | REQUIRED, checks OK |
| 2 | [o-contact-block-safe-link.patch](../patches/o-contact-block-safe-link.patch) | BYPASS-1/2 second render site | REQUIRED, checks OK |
| 3 | [display-media-src-allowlist.patch](../patches/display-media-src-allowlist.patch) | BYPASS-3 (A44) | REQUIRED (adopted LANE-SEC patch as-is), checks OK |
| 4 | [export-customer-data-script-escape.patch](../patches/export-customer-data-script-escape.patch) | W3 (A49) | REQUIRED, checks OK |
| 5 | [safe-link-email-shape-tighten.patch](../patches/safe-link-email-shape-tighten.patch) | W1 (A32/A33) | RECOMMENDED, checks OK |

## Finding 1 and 2: /o capability lane bypasses safe-link (A35, A36)

**Exact location:** `src/fyd/object/view.ts`, `buildCapabilities`, lines 205-213
(committed source had it at lines 190-192; current working tree shifted it).

**Hole:** the `contactActions` closure interpolated raw contact values into hrefs:
`tel: + phone`, `mailto: + email`, raw `website`. `website: "javascript:alert('A35')"`
rendered as a live `<a href="javascript:alert('A35')">Website</a>`, directly and
end-to-end through `composeObjectView`. Call and email were ungated too (only
website was probed live).

**Second render site found during this spec:** `src/app/o/[objectId]/page.tsx`,
the Contact section, interpolated the same three raw values into hrefs
(`tel: + phone`, `mailto: + email`, raw website). Patch 1 alone would have left
a live `javascript:` anchor on the same page. Both sites are gated.

**Patch 1** (`o-capability-safe-link.patch`, `src/fyd/object/view.ts`):
routes call/email/website through `resolveSafeLink` with capabilities
`"call"` / `"email"` / `"navigate"`. An unsafe value emits NO capability
(consistent with the "no fake buttons" doctrine and with `contactMethodFor`'s
null-on-unsafe behavior). This also closes W2 (A37): the `"call"` capability's
`TEL_ALLOWED` rule rejects quote/attribute-breakout phones before any href exists.
Behavior note: a website that is a bare hostname or relative path is now
non-navigable (no Website button), matching the choke point's documented rule.
Fail closed.

**Patch 2** (`o-contact-block-safe-link.patch`, `src/app/o/[objectId]/page.tsx`):
computes `phoneLink` / `emailLink` / `websiteLink` once per render via
`resolveSafeLink`. A safe value renders the anchor as before; an unsafe value
renders as inert text with NO anchor (no executable capability, no fake button).
Display text is unchanged (raw value, React-escaped).

**Test assertions (hole closed):**
- A35: `buildCapabilities(schema, id, { phone: null, email: null, website: "javascript:alert('A35')", locality: null, addressVisibility: "public" }, evidence)` returns caps with zero entries of kind `"website"`.
- A36: end-to-end `composeObjectView` with the raw website graph field set to `"javascript:alert('A36')"` renders markup containing zero occurrences of `href="javascript:` and no Website anchor; the Contact section shows the value as inert escaped text inside a `<span>`, not an `<a>`.
- Positive regression: website `"https://example.com"` yields `{ kind: "website", href: "https://example.com/", label: "Website" }`; phone `"+1 (970) 555-0100"` yields `{ kind: "call", href: "tel:+1(970)555-0100", label: "Call" }`; email `"a@b.com"` yields `{ kind: "email", href: "mailto:a@b.com", label: "Email" }`.
- W2: phone `+1" onmouseover="alert('A37')` yields no `"call"` capability.

## Finding 3: media src accepts javascript: scheme (A44)

**Exact location:** `src/fyd/media/select.ts`, `toDisplayMedia` (line 74); consumed by
`select()` which backs `listObjectMedia` (the /o lane), `heroMediaFor`, and
`galleryMediaFor`. One producer, all consumers.

**Hole:** `DisplayMedia.src` was interpolated raw; `<img src="javascript:alert('A44')">`
rendered on the hero. Latent in modern browsers (no execution from img src),
but an executable-scheme URL crossed the seam.

**Patch 3:** adopt the existing LANE-SEC proposal
`display-media-src-allowlist.patch` as-is (assessed, not duplicated). It adds
`safeDisplayUrl` at the single producer: same-origin relative paths pass;
anything else must clear `resolveSafeLink` with `"navigate"` (http/https only,
parser-based). Unsafe input makes `toDisplayMedia` return null, and every
caller already renders its no-media fallback. `javascript:alert('A44')` is not
a same-origin path and fails the navigate gate, so it becomes null. No new
authority, no second allowlist; `safe-link.ts` imports nothing, so no cycle.

**Test assertions (hole closed):**
- A44: a media variant with url `"javascript:alert('A44')"` produces `toDisplayMedia(...) === null`; the /o render contains zero occurrences of `src="javascript:` and the hero falls back to the next safe asset or the typographic no-media fallback.
- Positive regression: variant url `/fyd-media/<hash>/hero.jpg` still yields a `DisplayMedia` with that exact src; variant url `https://cdn.example.com/x.jpg` still yields src `https://cdn.example.com/x.jpg`.

## Gate weakness W3: exportCustomerData emits literal <script> strings (A49)

**Exact location:** `src/fyd/boundary/data-boundary.ts`, `exportCustomerData`, line 114.

**Hole:** the JSON blob contained literal `<script>` substrings. Safe as pure JSON;
hazardous if ever naively inlined into an HTML `<script>` block.

**Patch 4** (`export-customer-data-script-escape.patch`): one line,
`JSON.stringify(pkg, null, 2).replace(/</g, "\\u003c")`, at the single export
choke point. Lossless under `JSON.parse` (round-trip byte-identical), kills every
`</script>` sequence. `importCustomerData` needs no change.

**Test assertions (hole closed):**
- A49: `exportCustomerData` on a package containing `"</script><script>alert('A49')</script>"` in a field produces output containing zero occurrences of the literal substring `<script`.
- Round-trip: `importCustomerData(output)` restores the field value byte-identical to the input.

## Gate weakness W1: email gate accepts attribute-breakout addresses (A32/A33)

**Exact location:** `src/fyd/sitespec/safe-link.ts`, `EMAIL_SHAPE`, line 51.

**Hole:** `contactMethodFor("email")` accepted `"><script>alert('A32')</script>@x.com`
and emitted a raw `mailto:` actionUri containing a live `"><script>` string.
Neutralized today only by React SSR escaping; the `ContactMethod` contract
promises a "Safe tel:/mailto: URI" usable inside the FYD contact flow, and any
non-React consumer would inherit the breakout.

**Patch 5** (`safe-link-email-shape-tighten.patch`, RECOMMENDED): reject `"` `<` `>`
in `EMAIL_SHAPE`, at the single choke point. Such values become non_navigable and
`contactMethodFor` returns null (its documented unsafe-value behavior). Tradeoff:
rejects RFC-legal quoted local parts (`"john doe"@x.com`), which never occur in
observed business contact data; the gate is explicitly not a validator.
Plus-addressing, dots, hyphens, and subdomains are unaffected.

**Test assertions (hole closed):**
- A32: `contactMethodFor("email", '"><script>alert(\'A32\')</script>@x.com', evidence)` returns null.
- A33: `contactMethodFor("email", "a33b@bar.com\"><svg/onload=alert('A33')>", evidence)` returns null.
- Positive regression: `contactMethodFor("email", "name+tag@example.com", evidence)` still returns a ContactMethod with `actionUri === "mailto:name+tag@example.com"`.

## Explicitly out of scope (residual risks, still open)

Per the verdict's residual-risk list, these are NOT fixed by this spec:
theme tokens flowing unvalidated into style props; `description` with no length
cap; duplicate object ids with no conflict gate. They are inert under React SSR
today and belong to the convergence wave's follow-up, not this hole-closing set.

## Verification record

- All five patches pass `git apply --check` against the Pig working tree
(branch fyd-factory) as of 2026-09-23 ~19:50 MDT.
- Patch 3 is the pre-existing LANE-SEC proposal, re-verified, adopted as-is.
- Nothing was written to the Pig repo. Patch files and this spec live in
`~/workspace/fyd-factory/` only.
