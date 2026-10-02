#!/usr/bin/env node
// malformed-markup fixture lab, batch 2: case-mkm-50..99 (missions ACQ-2301..ACQ-2350).
// Second wave: hash identity, verdict edges, cap boundaries, marker combos.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });
const sha = (s) => createHash("sha256").update(s).digest("hex");

add("case-mkm-50", "hash stable",
  "Same bytes, same hash.",
  { url: "https://x.com/a", markup: "<p>stable</p>" },
  { outcome: "bounded_success",
    claims: { mkp_markup_sha256: sha("<p>stable</p>") } });

add("case-mkm-51", "hash differs",
  "One byte changes the hash.",
  { url: "https://x.com/a", markup: "<p>stablf</p>" },
  { outcome: "bounded_success",
    claims: { mkp_markup_sha256: sha("<p>stablf</p>") } });

add("case-mkm-52", "hash whitespace",
  "Whitespace is identity.",
  { url: "https://x.com/a", markup: "<p>a</p> " },
  { outcome: "bounded_success",
    claims: { mkp_markup_sha256: sha("<p>a</p> ") } });

add("case-mkm-53", "wellformed list",
  "Nested lists are wellformed.",
  { url: "https://x.com/a", markup: "<ul><li>a</li><li>b</li></ul>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" }, absent_claims: ["mkp_malformed_reason"] });

add("case-mkm-54", "three dangling",
  "Multiple dangling comments.",
  { url: "https://x.com/a", markup: "<!-- a <!-- b <!-- c" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unterminated-comment" } });

add("case-mkm-55", "comment closed late",
  "A comment closed at the very end.",
  { url: "https://x.com/a", markup: "<!-- a -->x<!-- -->" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-56", "quote pairs",
  "Two quote pairs are even.",
  { url: "https://x.com/a", markup: '<a href="x" title="y">z</a>' },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-57", "three quotes",
  "Three quotes are odd.",
  { url: "https://x.com/a", markup: '<a href="x" title=y">z</a>' },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unterminated-attribute-quote" } });

add("case-mkm-58", "quote in text",
  "Quoted prose is scanned the same way.",
  { url: "https://x.com/a", markup: '<p>He said "hi" to "me</p>' },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unterminated-attribute-quote" } });

add("case-mkm-59", "balanced prose quotes",
  "Balanced prose quotes are wellformed.",
  { url: "https://x.com/a", markup: '<p>He said "hi" to "me"</p>' },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-60", "tag at end",
  "Markup ending in '>' is not unclosed.",
  { url: "https://x.com/a", markup: "<p>Hi</p>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-61", "lt at end",
  "Markup ending in '<' is unclosed.",
  { url: "https://x.com/a", markup: "<p>Hi</p><" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unclosed-tag" } });

add("case-mkm-62", "single char",
  "Single character markup.",
  { url: "https://x.com/a", markup: "x" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-63", "single lt",
  "Single '<' is unclosed.",
  { url: "https://x.com/a", markup: "<" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unclosed-tag" } });

add("case-mkm-64", "single gt",
  "Single '>' is wellformed.",
  { url: "https://x.com/a", markup: ">" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-65", "nul early",
  "NUL anywhere is a typed failure.",
  { url: "https://x.com/a", markup: "\0<p>Hi</p>" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "nul-byte" });

add("case-mkm-66", "nul late",
  "Trailing NUL is a typed failure.",
  { url: "https://x.com/a", markup: "<p>Hi</p>\0" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "nul-byte" });

add("case-mkm-67", "marker scriptcase",
  "Marker scan is case-insensitive.",
  { url: "https://x.com/a", markup: "<p>Hi</p><ScRiPt>x</ScRiPt>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "quarantine" },
    required_quarantined: [{ property: "markup-input", reason: "active-content" }] });

add("case-mkm-68", "marker inside comment",
  "Markers inside comments still quarantine.",
  { url: "https://x.com/a", markup: "<!-- <script> -->" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "quarantine" },
    required_quarantined: [{ property: "markup-input", reason: "active-content" }] });

add("case-mkm-69", "onload alone",
  "Bare onload marker quarantines.",
  { url: "https://x.com/a", markup: "onload" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "quarantine" },
    required_quarantined: [{ property: "markup-input", reason: "active-content" }] });

add("case-mkm-70", "cap boundary hash",
  "10000-char markup hashes correctly.",
  { url: "https://x.com/a", markup: "b".repeat(10000) },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed", mkp_markup_sha256: sha("b".repeat(10000)) } });

add("case-mkm-71", "url missing",
  "url is required.",
  { markup: "<p>Hi</p>" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-mkm-72", "url null",
  "Null URL is rejected.",
  { url: null, markup: "<p>Hi</p>" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-mkm-73", "url over cap",
  "2001-char URL is rejected.",
  { url: "https://x.com/" + "a".repeat(1990), markup: "<p>Hi</p>" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-mkm-74", "url at cap",
  "Boundary: 2000-char URL accepted.",
  { url: "https://x.com/" + "a".repeat(1986), markup: "<p>Hi</p>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed", mkp_page_url: "https://x.com/" + "a".repeat(1986) } });

add("case-mkm-75", "url newline",
  "Newlines in URLs are rejected.",
  { url: "https://x.com/a\nb", markup: "<p>Hi</p>" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-mkm-76", "boolean input",
  "Booleans are not observations.",
  true,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-mkm-77", "markup array",
  "Arrays are not markup.",
  { url: "https://x.com/a", markup: ["<p>"] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-markup" });

add("case-mkm-78", "empty input",
  "Empty object fails on URL.",
  {},
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-mkm-79", "kitchen wellformed",
  "Long wellformed document.",
  { url: "https://x.com/a", markup: "<html>" + "<div><p>row</p></div>".repeat(100) + "</html>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" }, absent_claims: ["mkp_malformed_reason"] });

add("case-mkm-80", "kitchen malformed",
  "Long document with dangling tail.",
  { url: "https://x.com/a", markup: "<html>" + "<div><p>row</p></div>".repeat(100) + "<!-- tail" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unterminated-comment" } });

add("case-mkm-81", "kitchen quote",
  "Long document with odd quote.",
  { url: "https://x.com/a", markup: "<html>" + "<div><p>row</p></div>".repeat(100) + '<a href="x' },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unterminated-attribute-quote" } });

add("case-mkm-82", "kitchen quarantine",
  "Long document with script.",
  { url: "https://x.com/a", markup: "<html>" + "<div><p>row</p></div>".repeat(100) + "<script>x</script>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "quarantine" },
    required_quarantined: [{ property: "markup-input", reason: "active-content" }] });

add("case-mkm-83", "utf8 bom",
  "BOM bytes are literal content.",
  { url: "https://x.com/a", markup: "﻿<p>Hi</p>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed", mkp_markup_sha256: sha("﻿<p>Hi</p>") } });

add("case-mkm-84", "cdata wellformed",
  "CDATA sections are literal content.",
  { url: "https://x.com/a", markup: "<![CDATA[x < y]]>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-85", "comment only",
  "A lone dangling comment.",
  { url: "https://x.com/a", markup: "<!--" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unterminated-comment" } });

add("case-mkm-86", "empty comment",
  "An empty comment is wellformed.",
  { url: "https://x.com/a", markup: "<!---->" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-87", "doctype comment",
  "Doctype plus dangling comment.",
  { url: "https://x.com/a", markup: "<!DOCTYPE html><!--" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unterminated-comment" } });

add("case-mkm-88", "reason only malformed",
  "Reason claim exists only for malformed.",
  { url: "https://x.com/a", markup: "<p>Hi</p>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" }, absent_claims: ["mkp_malformed_reason"] });

add("case-mkm-89", "final malformed",
  "Closing malformed.",
  { url: "https://x.com/a", markup: "<div" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unclosed-tag" } });

add("case-mkm-90", "final wellformed",
  "Closing wellformed.",
  { url: "https://x.com/a", markup: "<div></div>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

add("case-mkm-91", "final quarantine",
  "Closing quarantine.",
  { url: "https://x.com/a", markup: "<div onload=x></div>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "quarantine" },
    required_quarantined: [{ property: "markup-input", reason: "active-content" }] });

add("case-mkm-92", "final typed failure",
  "Closing typed failure: empty markup.",
  { url: "https://x.com/a", markup: "" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-markup" });

add("case-mkm-93", "final url failure",
  "Closing typed failure: bad URL.",
  { url: "notaurl", markup: "<p>Hi</p>" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-mkm-94", "final nul",
  "Closing typed failure: NUL.",
  { url: "https://x.com/a", markup: "a\0" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "nul-byte" });

add("case-mkm-95", "final shape",
  "Closing typed failure: non-object.",
  [],
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-mkm-96", "provenance depth",
  "Every claim carries provenance.",
  { url: "https://x.com/a", markup: "<p>Hi</p><!-- dangling" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed" },
    min_provenance: { mkp_verdict: 1, mkp_markup_sha256: 1, mkp_page_url: 1, mkp_malformed_reason: 1 } });

add("case-mkm-97", "no guess reason",
  "The reason is observed, never inferred.",
  { url: "https://x.com/a", markup: "<p" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "malformed", mkp_malformed_reason: "unclosed-tag" } });

add("case-mkm-98", "marker onerror2",
  "onerror in attribute quarantines.",
  { url: "https://x.com/a", markup: '<img src=x onerror="alert(1)">' },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "quarantine" },
    required_quarantined: [{ property: "markup-input", reason: "active-content" }] });

add("case-mkm-99", "final accept",
  "Closing accept.",
  { url: "https://x.com/a", markup: "<p>Done</p>" },
  { outcome: "bounded_success",
    claims: { mkp_verdict: "wellformed" } });

// ---- manifest: missions ACQ-2301..ACQ-2350 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(2301 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestMkm2 = manifest;

export { C, manifest, manifestMkm2 };
export function getCase(id) { return C.find((c) => c.id === id); }
