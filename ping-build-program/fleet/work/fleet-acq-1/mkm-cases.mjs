#!/usr/bin/env node
// malformed-markup fixture lab, batch 1: case-mkm-0..49 (missions ACQ-2251..ACQ-2300).
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });

add("case-mkm-0", "clean markup",
  "Simple wellformed markup.",
  { url: "https://x.com/a", markup: "<html><body><p>Hi</p></body></html>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" }, absent_claims: ["mkp_malformed_reason"] });

add("case-mkm-1", "unterminated comment",
  "Comment never closes.",
  { url: "https://x.com/a", markup: "<p>Hi</p><!-- dangling" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unterminated-comment" } });

add("case-mkm-2", "terminated comment",
  "Closed comment is wellformed.",
  { url: "https://x.com/a", markup: "<p>Hi</p><!-- ok -->" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" }, absent_claims: ["mkp_malformed_reason"] });

add("case-mkm-3", "odd quotes",
  "Unterminated attribute quote.",
  { url: "https://x.com/a", markup: '<a href="x>y</a>' },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unterminated-attribute-quote" } });

add("case-mkm-4", "even quotes",
  "Balanced quotes are wellformed.",
  { url: "https://x.com/a", markup: '<a href="x">y</a>' },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-5", "unclosed tag",
  "Trailing open bracket.",
  { url: "https://x.com/a", markup: "<p>Hi</p><div" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unclosed-tag" } });

add("case-mkm-6", "balanced tags",
  "Complete tags are wellformed.",
  { url: "https://x.com/a", markup: "<div class=\"c\"><span>t</span></div>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-7", "script quarantine",
  "Script tags quarantine.",
  { url: "https://x.com/a", markup: "<p>Hi</p><script>alert(1)</script>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "quarantine" },
    required_quarantined: [{ property: "markup-input", reason: "active-content" }] });

add("case-mkm-8", "iframe quarantine",
  "Iframes quarantine.",
  { url: "https://x.com/a", markup: "<p>Hi</p><IFRAME src=\"x\"></IFRAME>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "quarantine" },
    required_quarantined: [{ property: "markup-input", reason: "active-content" }] });

add("case-mkm-9", "onerror quarantine",
  "Event handlers quarantine.",
  { url: "https://x.com/a", markup: "<img src=\"x\" onerror=\"y\">" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "quarantine" },
    required_quarantined: [{ property: "markup-input", reason: "active-content" }] });

add("case-mkm-10", "php quarantine",
  "PHP markers quarantine.",
  { url: "https://x.com/a", markup: "<p>Hi</p><?php echo 1; ?>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "quarantine" },
    required_quarantined: [{ property: "markup-input", reason: "active-content" }] });

add("case-mkm-11", "marker beats malformed",
  "Marker scan precedes structural scan.",
  { url: "https://x.com/a", markup: "<p>Hi</p><!-- dangling <script>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "quarantine" },
    required_quarantined: [{ property: "markup-input", reason: "active-content" }] });

add("case-mkm-12", "nul byte",
  "NUL is a typed failure.",
  { url: "https://x.com/a", markup: "<p>Hi\0</p>" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "nul-byte" });

add("case-mkm-13", "not an object",
  "Strings are not observations.",
  "<p>Hi</p>",
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-mkm-14", "missing markup",
  "Markup is required.",
  { url: "https://x.com/a" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-markup" });

add("case-mkm-15", "empty markup",
  "Empty markup is rejected.",
  { url: "https://x.com/a", markup: "" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-markup" });

add("case-mkm-16", "markup over cap",
  "10001-char markup is rejected.",
  { url: "https://x.com/a", markup: "a".repeat(10001) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-markup" });

add("case-mkm-17", "markup at cap",
  "Boundary: 10000 chars is accepted.",
  { url: "https://x.com/a", markup: "a".repeat(10000) },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-18", "bad url",
  "URLs must be absolute HTTP(S).",
  { url: "notaurl", markup: "<p>Hi</p>" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-mkm-19", "nul beats malformed",
  "NUL check precedes structural scan.",
  { url: "https://x.com/a", markup: "<p>Hi</p><!-- dang\0ling" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "nul-byte" });

add("case-mkm-20", "comment beats quote",
  "Check order: comment signal first.",
  { url: "https://x.com/a", markup: '<!-- dangling "odd' },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unterminated-comment" } });

add("case-mkm-21", "quote beats tag",
  "Check order: quote signal before tag signal.",
  { url: "https://x.com/a", markup: '<a href="x><div' },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unterminated-attribute-quote" } });

add("case-mkm-22", "doctype wellformed",
  "Doctype is wellformed.",
  { url: "https://x.com/a", markup: "<!DOCTYPE html><html><body><p>Hi</p></body></html>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-23", "entities wellformed",
  "Entities are literal content.",
  { url: "https://x.com/a", markup: "<p>&amp;&lt;&gt;</p>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-24", "newlines allowed",
  "Markup may contain newlines.",
  { url: "https://x.com/a", markup: "<p>\nHi\n</p>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-25", "tabs allowed",
  "Markup may contain tabs.",
  { url: "https://x.com/a", markup: "<p>\tHi\t</p>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-26", "c1 control allowed",
  "Only NUL is the hard reject.",
  { url: "https://x.com/a", markup: "<p>Hi </p>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-27", "hash identity",
  "The hash identifies the markup byte-for-byte.",
  { url: "https://x.com/a", markup: "<p>Hi</p>" },
  { outcome: "bounded_success",
    claims: { mkp_markup_sha256: "9c655e84ab91015eed7670dfbb369ffdc31f6efe04ef8bad2615cab6b9e63ca6" },
    absent_claims: [] });

add("case-mkm-28", "url claim",
  "Page URL is claimed.",
  { url: "https://x.com/shop", markup: "<p>Hi</p>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed", mkp_page_url: "https://x.com/shop" } });

add("case-mkm-29", "no extraction",
  "Content is never extracted from markup.",
  { url: "https://x.com/a", markup: "<title>Shop</title>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" },
    absent_claims: ["mkp_title", "mkp_text", "mkp_content"] });

add("case-mkm-30", "no extraction malformed",
  "Content is never extracted from malformed markup either.",
  { url: "https://x.com/a", markup: "<title>Shop<!-- dangling" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed" },
    absent_claims: ["mkp_title", "mkp_text", "mkp_content"] });

add("case-mkm-31", "null markup",
  "Null markup is rejected.",
  { url: "https://x.com/a", markup: null },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-markup" });

add("case-mkm-32", "numeric markup",
  "Numbers are not markup.",
  { url: "https://x.com/a", markup: 42 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-markup" });

add("case-mkm-33", "array input",
  "Arrays are not observations.",
  [],
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-mkm-34", "unicode markup",
  "Unicode markup is literal content.",
  { url: "https://x.com/a", markup: "<p>Café Ünï</p>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-35", "emoji markup",
  "Emoji is literal content.",
  { url: "https://x.com/a", markup: "<p>\u{1F600}</p>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-36", "nested comments",
  "Nested comments terminate at first close.",
  { url: "https://x.com/a", markup: "<!-- a <!-- b --> <p>Hi</p>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-37", "two comments one dangling",
  "A later dangling comment still fails.",
  { url: "https://x.com/a", markup: "<!-- ok --><!-- dangling" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unterminated-comment" } });

add("case-mkm-38", "single quote odd",
  "Single quotes do not count: odd double quote fails.",
  { url: "https://x.com/a", markup: "<p>it's a \"test</p>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unterminated-attribute-quote" } });

add("case-mkm-39", "single quotes balanced",
  "Single quotes are ignored by the scan.",
  { url: "https://x.com/a", markup: "<p>it's</p>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-40", "gt before lt",
  "Text before a bracket is wellformed.",
  { url: "https://x.com/a", markup: "5 > 3 <p>Hi</p>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-41", "split marker",
  "Split markers are not markers.",
  { url: "https://x.com/a", markup: "<p>Hi</p><scr ipt>x</scr ipt>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-42", "onload quarantine",
  "onload markers fire.",
  { url: "https://x.com/a", markup: "<body onload=\"x\"><p>Hi</p></body>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "quarantine" },
    required_quarantined: [{ property: "markup-input", reason: "active-content" }] });

add("case-mkm-43", "quarantine keeps url",
  "Quarantine still claims identity and URL.",
  { url: "https://x.com/a", markup: "<p>Hi</p><script>x</script>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "quarantine", mkp_page_url: "https://x.com/a" },
    min_provenance: { mkp_verdict: 1, mkp_markup_sha256: 1 } });

add("case-mkm-44", "malformed keeps url",
  "Malformed verdict still claims identity and URL.",
  { url: "https://x.com/a", markup: "<p>Hi</p><!-- dangling" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_page_url: "https://x.com/a" },
    min_provenance: { mkp_verdict: 1, mkp_markup_sha256: 1 } });

add("case-mkm-45", "extra fields ignored",
  "Unknown input fields are ignored.",
  { url: "https://x.com/a", markup: "<p>Hi</p>", at: "t" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-46", "kitchen sink wellformed",
  "Full wellformed document.",
  { url: "https://x.com/shop", markup: "<!DOCTYPE html><html><head><title>T</title></head><body><p>Hi</p><!-- c --></body></html>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed", mkp_page_url: "https://x.com/shop" },
    absent_claims: ["mkp_malformed_reason"] });

add("case-mkm-47", "kitchen sink malformed",
  "Document with dangling comment.",
  { url: "https://x.com/shop", markup: "<!DOCTYPE html><html><body><p>Hi</p><!-- dangling" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unterminated-comment" } });

add("case-mkm-48", "kitchen sink quarantine",
  "Document with iframe.",
  { url: "https://x.com/shop", markup: "<html><body><p>Hi</p><iframe src=\"x\"></iframe></body></html>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "quarantine" },
    required_quarantined: [{ property: "markup-input", reason: "active-content" }] });

add("case-mkm-49", "final url failure",
  "Closing typed failure: relative URL.",
  { url: "/rel", markup: "<p>Hi</p>" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

// ---- manifest: missions ACQ-2251..ACQ-2300 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(2251 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestMkm = manifest;

export { C, manifest, manifestMkm };
export function getCase(id) { return C.find((c) => c.id === id); }
