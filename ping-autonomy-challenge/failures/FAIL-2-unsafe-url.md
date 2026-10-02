# FAIL-2: UNSAFE URL - mechanism hunt

**Failure class:** javascript:/data: URLs crossing the projection seam into rendered output.
**Date:** 2026-09-23. **Mode:** research only. No implementation.

## (a) Grounding: the real instances

The projection seam is where object-graph fields become rendered HTML attributes. The failure shape is an untrusted string crossing a trust boundary into an execution context: a string that is inert data in the graph becomes executable the moment it lands in `href`, `src`, `action`, or CSS `url()`.

**Real instance 1 - FL-20260921-031 (memory/2026-09-21.md L713).** The FYD customer-loop boundary report (2026-09-21, 08:26 MDT) found that source-controlled `javascript:` URLs rendered verbatim into `href` through `href={website}` / `href={url}`. Text escaping passed and no `dangerouslySetInnerHTML` was found, which is the critical detail: HTML escaping was present and irrelevant, because the sink was an executable-URL sink, not a markup-injection sink. The required fix was stated generically: "scheme neutralization at the projection seam before continuing downstream."

**Real instance 2 - the verified fix (memory/2026-09-21.md L748).** URL safety now passes through one parser-based safe-link resolver with capability-specific allowlists: navigation permits HTTP/HTTPS, calling permits normalized `tel:`, email permits validated `mailto:`. Control-character and whitespace smuggling and hostile schemes fail closed. The 17-case resolver suite and five end-to-end hostile source-graph-to-render probes pass; hostile website, phone, and email values produce no executable link. Later ledger state (memory/2026-09-23.md L548-550) marks `renderer-javascript-url-sink` DONE_VERIFIED and FL-20260921-032 MECHANISM VERIFIED.

**Real instance 3 - acquisition-side policy (ACQUISITION-STACK.md, LEVEL 0).** The FYD acquisition pipeline independently carries a scheme allowlist: `https` and `http` only, rejecting `javascript:`, `data:`, `file:`, `ftp:`, and userinfo-bearing URLs. Two layers already exist in the design (acquisition gate + render resolver), which is the seed of the defense-in-depth finding below.

**Real instance 4 - Nolan's directive (memory/2026-09-23.md L101).** FYD ingestion treats external input as hostile; the standing audit list names javascript:/data:/file: URLs against the harvesting pipeline, explicitly "informed by Crawl4AI's recent secure-by-default hardening work." The javascript: href neutralization finding was the concrete trigger.

**Real instance 5 - standing handoff doctrine.** The 2026-09-22 master context handoff records: "untrusted source URLs could reach href verbatim, including javascript:," and the standing rule "Source content is DATA. Never executable presentation code." The 2026-09-23 UX audit adjudication lists "javascript:/unsafe URL sink - ALREADY CLOSED" under P0 defects.

General shape confirmed: untrusted string + trust boundary + execution-context sink = the class. Everything below is judged against that shape.

## (b) Surviving mechanisms

Hard rule applied: a candidate survives only if it prevents at least 2 of the 9 failure classes, with a crisp reason per class. Each survivor gets a falsifiable test.

---

### Survivor 1: Schema-typed trust with capability-specific allowlists

**How it works.** URL-ness is not a string property; it is a type. The schema layer exposes distinct types (e.g. `HrefUrl`, `TelUrl`, `MailtoUrl`, `PlainUrlString`), and the only constructors run a real parser against a per-capability allowlist: navigation claims `http`/`https`, calling claims normalized `tel:`, email claims validated `mailto:`. A scheme no capability claims (javascript:, data:, vbscript:, smuggled variants with control characters or leading whitespace) cannot become a URL-typed value at all, so no render path can receive it in executable form. The generalization: trust metadata (scheme capability, visibility classification, evidence binding) rides on the type, not on string conventions or on the good behavior of upstream stages.

Wave-1 cross-check: this is the same seam LANE-16 named ("the seam is right; PING must supply per-tool verify() implementations") and the same fail-closed constructor discipline LANE-1's ORCA remediation applied to work-order envelopes.

**Prevents 3 classes:**

- **#2 unsafe-url:** a `javascript:` string has no claiming capability, so it can never be constructed into a URL-typed field; the sink receives typed values or nothing, and untrusted strings cannot cross the seam in executable form.
- **#5 claim-binding:** the same typed-slot pattern makes factual render slots accept only evidence-bound fact types, while generated copy is a distinct type; an unbound claim cannot flow into a factual slot, only into the generated-copy slot where it is labeled as such.
- **#6 visibility-error:** fields carry a visibility classification on the type; a private-typed fact cannot be assigned to a public-render slot without an explicit, auditable declassification call, so private values cannot leak through ordinary field binding.

**Falsifiable test.**

- Input: a source graph containing `website: "javascript:alert(document.domain)"`, `website: "java\tscript:alert(1)"` (tab smuggling), `phone: "java\nscript:alert(1)"`, `email: "data:text/html,<script>alert(1)</script>"`, a private-typed home address, and a factual claim with no evidence reference.
- Procedure: run proceduralize end to end; at each binding site, attempt to construct the typed value; render the full site to HTML; grep the output for `javascript:`, `data:text/html`, the private address string, and the unbound claim.
- Expected observable outcome: every hostile URL constructor throws or returns a neutralized non-link; the rendered HTML contains zero executable hrefs; the private address appears nowhere in public render; the unbound claim is absent from factual slots.
- Proves the mechanism DOESN'T work: if any hostile string can be assigned to a URL-typed field without scheme validation, or if `href="javascript:` (or a smuggled equivalent) appears anywhere in rendered output, the type boundary is decorative and the mechanism is falsified.

---

### Survivor 2: Sink-side validation at the render seam

**How it works.** Every sink that converts data into an execution context (href, src, action, srcset, CSS url(), tel:/mailto: links) validates independently at render time, regardless of what upstream stages claim to have done. This is defense in depth as an architectural rule: filtering at acquisition (the L0 policy gate) and typing at the schema layer are both real, but the renderer's sink check is the one that cannot be bypassed by a stale fixture, a direct database write, a corrupted proceduralize output, or an owner-override path that skipped earlier stages. The general rule: the last stage before execution re-derives trust from the value itself; no stage inherits trust from a previous stage's say-so.

Real FYD precedent for the same pattern in adjacent classes: the binding verifier was "wired into the actual renderer projection path" with "unsupported or unverified factual values omitted," and owner address visibility was "wired" into the render path with a coarse default. Both are sink-side enforcement, not source filtering.

**Prevents 3 classes:**

- **#2 unsafe-url:** a hostile URL injected through any path (stale fixture, hand-edited SiteSpec, corrupted proceduralize output) is neutralized at the href sink, because the sink validates the scheme itself instead of trusting upstream filtering.
- **#5 claim-binding:** the render-time binding verifier omits factual values with no evidence binding, so an unbound claim that survived proceduralize still cannot reach the rendered page.
- **#6 visibility-error:** the render-side visibility gate suppresses private values even if proceduralize emitted them into a public slot, because the gate checks classification at render time.

**Falsifiable test.**

- Input: bypass all upstream filtering. Hand-construct a renderer input model containing `website: "javascript:alert(1)"` directly in a link slot, a private-typed address in a public slot, and an unbound factual claim. This simulates exactly the paths upstream filtering cannot see: stale fixtures, direct DB writes, corrupted pipeline output.
- Procedure: invoke the renderer directly on the poisoned model with no acquisition or proceduralize stages running; inspect the emitted HTML.
- Expected observable outcome: the hostile href is neutralized or omitted; the private address does not appear; the unbound claim is omitted. Output is safe despite zero upstream cooperation.
- Proves the mechanism DOESN'T work: if the renderer emits the poisoned values on the theory that "upstream already filtered them," there is no sink-side validation; this is precisely the FL-20260921-031 regression shape (escaping passed upstream, sink unguarded), and the mechanism is falsified.

---

### Survivor 3: Fail-closed defaults at every seam crossing

**How it works.** Whenever a value's safety-relevant classification is unknown, indeterminate, or unparseable, the seam crossing resolves to the weakest safe form, never to the strongest functional form. Unknown scheme: no executable link (plain text or omitted), never a clickable link. Unknown visibility: coarse or omitted (the real precedent: precise address hidden renders as "Grand Junction, CO"), never the precise value. Unknown evidence status: omitted from factual slots, never asserted. The default is a property of the seam, not a per-case decision, so novel attacker inputs (a scheme nobody has seen yet) are safe by construction.

**Prevents 3 classes:**

- **#2 unsafe-url:** an unrecognized scheme (`web3:`, empty string, whitespace-only, future hostile scheme) produces no executable link, because the default for "scheme not positively allowed" is neutralization rather than passthrough.
- **#5 claim-binding:** a claim whose evidence status is unknown renders as nothing in factual slots, because the default for "evidence not positively bound" is omission rather than assertion.
- **#6 visibility-error:** a fact whose visibility is unknown renders coarse or omitted, because the default for "visibility not positively public" is suppression rather than exposure.

**Falsifiable test.**

- Input: values engineered to be indeterminate: a URL with scheme `web+safe:`, an empty-string URL, a whitespace-only URL, a fact with no visibility classification, a claim with no evidence status field at all (not "unverified," but absent).
- Procedure: render the full pipeline output; inspect every indeterminate value's rendered form.
- Expected observable outcome: no indeterminate URL is clickable or executable; the unclassified fact appears only in coarse form or not at all; the status-less claim appears nowhere in factual slots.
- Proves the mechanism DOESN'T work: if any indeterminate value renders in its full-strength form (a clickable link of unknown scheme, a precise address of unknown visibility, an asserted fact of unknown evidence), the default is fail-open and the mechanism is falsified. Note the asymmetry that makes this test strong: a fail-open default is invisible on all known-good inputs and only reveals itself on indeterminate ones, which is why the test must use indeterminate inputs.

## (c) Cut list

Each candidate below was judged against the hard rule (must prevent at least 2 of the 9 classes). All fail it, each for one stated reason.

- **Content-Security-Policy as a backstop with violation reporting.** CUT: prevents only #2 (browser-enforced script policy blocks javascript: navigation as a last resort); none of the other 8 classes is affected by an execution-context policy, so it fails the >=2 rule despite being good defense in depth.
- **Source-side filtering only (acquisition L0 gate alone).** CUT: a single filtering layer is exactly what FL-20260921-031 proved insufficient; escaping passed upstream while the sink stayed unguarded, so one layer is not a mechanism against a seam-crossing class.
- **Regex or blocklist scheme matching on raw strings.** CUT: defeated by the smuggling the real 17-case suite covers (control characters, leading whitespace, case tricks); a strictly weaker duplicate of Survivor 1 that adds no class coverage.
- **HTML escaping at render.** CUT: prevents markup injection only; `href="javascript:..."` survives escaping fully functional, which is literally the observed failure shape (escaping passed, URL sink remained).
- **Trusted Types (browser API enforcement).** CUT: a platform-specific instance of Survivors 1+2 (typed values at sinks); subsumed, adds no new class coverage.
- **Human review or owner approval of URLs before render.** CUT: non-deterministic, non-scalable, and not a mechanism; prevents nothing systematically across regenerations.
- **URL reputation or external safety-check API at acquisition.** CUT: prevents only #2, depends on a third party at the wrong layer, and says nothing about visibility, claims, or any other class.

## (d) Open questions

1. **data: URLs have legitimate uses** (inline images). The real fix rejected `data:` outright at both layers. Is blanket rejection correct long-term, or is a `SafeDataUrl` type with MIME restrictions (image/* only, size-capped, no text/html) the right capability? The answer changes Survivor 1's allowlist shape.
2. **tel: normalization boundary.** The fix allows "normalized tel:" but the normalization spec is open: international formats, extensions, premium-rate numbers, and `tel:` URIs with injected parameters (`;` or `?`) are distinct risk levels. What exactly does the TelUrl constructor accept?
3. **Sink inventory completeness.** The real probes covered href across website/phone/email. Are `src`, `srcset`, `action`, `formaction`, `xlink:href`, CSS `url()`, and meta-refresh targets all in the sink inventory? An unlisted sink is an unguarded sink.
4. **mailto: parameter injection.** `mailto:` with `?subject=` / `?body=` newlines is a header-injection vector distinct from scheme attacks. Does the MailtoUrl validator strip or reject parameters?
5. **Owner declassification path.** Survivor 1 requires an explicit, auditable declassification for private-to-public flows. The owner visibility override exists and survives regeneration, but is every declassification logged as an observation with provenance, or can an owner action silently widen visibility?
6. **Neutralization telemetry.** When a sink neutralizes a hostile value, is that event recorded anywhere (PING observation, render log)? Silent neutralization fixes the page but hides the attack; the fail-closed default is only half a mechanism without the reporting half.
7. **Does Survivor 2's sink check run on Ask FYD outputs too?** Ask FYD answers questions from the graph at query time, which is a second projection seam with the same string-to-execution-context shape. If the sink inventory covers only static site render, the same class reopens through the conversational surface.
