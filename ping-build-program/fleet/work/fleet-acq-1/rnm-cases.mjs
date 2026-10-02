#!/usr/bin/env node
// renames-redirects fixture lab, batch 1: case-rnm-0..49 (missions ACQ-1951..ACQ-2000).
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });
const HOP = (url, status) => ({ url, status });

add("case-rnm-0", "direct fetch",
  "No hops, same URL: direct.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200 },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "direct", rnm_final_url: "https://x.com/a", rnm_status: 200 },
    absent_claims: ["rnm_redirect_count"] });

add("case-rnm-1", "single hop",
  "Observed hop: redirect with count 1.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/b", status: 200,
    redirect_chain: [HOP("https://x.com/b", 301)] },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "redirect", rnm_final_url: "https://x.com/b", rnm_redirect_count: 1 },
    min_provenance: { rnm_final_url: 1 } });

add("case-rnm-2", "three hops",
  "Three-hop chain: count 3.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/d", status: 200,
    redirect_chain: [HOP("https://x.com/b", 301), HOP("https://x.com/c", 302), HOP("https://x.com/d", 200)] },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "redirect", rnm_redirect_count: 3 } });

add("case-rnm-3", "cross-origin redirect",
  "Cross-origin hops are observed, not adopted silently.",
  { requested_url: "https://x.com/a", final_url: "https://evil.example/b", status: 200,
    redirect_chain: [HOP("https://evil.example/b", 302)] },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "redirect", rnm_final_url: "https://evil.example/b" } });

add("case-rnm-4", "canonical differs",
  "Canonical link target is recorded, never adopted.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    canonical: "https://x.com/canonical-a" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "direct" },
    absent_claims: ["rnm_canonical"] });

add("case-rnm-5", "canonical equals final",
  "Matching canonical changes nothing.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    canonical: "https://x.com/a" },
  { outcome: "bounded_success", claims: { rnm_verdict: "direct" } });

add("case-rnm-6", "renamed title",
  "previous_title differs: renamed.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "New Name", previous_title: "Old Name" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "renamed", rnm_title: "New Name" } });

add("case-rnm-7", "title unchanged",
  "Same title: direct.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "Same", previous_title: "Same" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "direct", rnm_title: "Same" } });

add("case-rnm-8", "redirect plus rename",
  "Redirect classification wins over rename.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/b", status: 200,
    redirect_chain: [HOP("https://x.com/b", 301)],
    title: "New", previous_title: "Old" },
  { outcome: "bounded_success", claims: { rnm_verdict: "redirect" } });

add("case-rnm-9", "marker in title",
  "Active content quarantines.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "Shop <script>" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "quarantine" },
    required_quarantined: [{ property: "rename-redirect-input", reason: "active-content" }] });

add("case-rnm-10", "marker in chain url",
  "Chain URLs are scanned too.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/b<script>", status: 200,
    redirect_chain: [HOP("https://x.com/b<script>", 301)] },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "quarantine" },
    required_quarantined: [{ property: "rename-redirect-input", reason: "active-content" }] });

add("case-rnm-11", "marker in canonical",
  "Canonical values are scanned.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    canonical: "https://x.com/<iframe>" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "quarantine" },
    required_quarantined: [{ property: "rename-redirect-input", reason: "active-content" }] });

add("case-rnm-12", "not an object",
  "Arrays are not observations.",
  [],
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-rnm-13", "null input",
  "Null is not an observation.",
  null,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-rnm-14", "missing requested_url",
  "requested_url is required.",
  { final_url: "https://x.com/a", status: 200 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-requested-url" });

add("case-rnm-15", "relative url",
  "Relative URLs are rejected.",
  { requested_url: "/a", final_url: "https://x.com/a", status: 200 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-requested-url" });

add("case-rnm-16", "ftp scheme",
  "Only HTTP(S) is accepted.",
  { requested_url: "ftp://x.com/a", final_url: "ftp://x.com/a", status: 200 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-requested-url" });

add("case-rnm-17", "no host",
  "URLs need a host.",
  { requested_url: "https://?x=1", final_url: "https://x.com/a", status: 200 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-requested-url" });

add("case-rnm-18", "bad status type",
  "Status must be an integer.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: "200" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-status" });

add("case-rnm-19", "status too low",
  "Status must be 200..599.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 199 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-status" });

add("case-rnm-20", "status too high",
  "Status must be 200..599.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 600 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-status" });

add("case-rnm-21", "chain not array",
  "redirect_chain must be an array.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/b", status: 200,
    redirect_chain: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-redirect-chain" });

add("case-rnm-22", "chain empty",
  "Empty chains are rejected.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    redirect_chain: [] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-redirect-chain" });

add("case-rnm-23", "chain too long",
  "At most 10 hops.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/z", status: 200,
    redirect_chain: Array.from({ length: 11 }, (_, i) => HOP(`https://x.com/h${i}`, 301)).concat([HOP("https://x.com/z", 200)]) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-redirect-chain" });

add("case-rnm-24", "ten hops",
  "Boundary: exactly 10 hops is accepted.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/z", status: 200,
    redirect_chain: Array.from({ length: 9 }, (_, i) => HOP(`https://x.com/h${i}`, 301)).concat([HOP("https://x.com/z", 200)]) },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "redirect", rnm_redirect_count: 10 } });

add("case-rnm-25", "chain final mismatch",
  "Last chain URL must equal final_url.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/z", status: 200,
    redirect_chain: [HOP("https://x.com/b", 301)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "chain-final-mismatch" });

add("case-rnm-26", "bad chain entry",
  "Entries must be objects.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/b", status: 200,
    redirect_chain: [null] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-chain-entry" });

add("case-rnm-27", "chain entry bad url",
  "Chain URLs are validated.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/b", status: 200,
    redirect_chain: [HOP("/rel", 301)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-chain-entry" });

add("case-rnm-28", "chain entry bad status",
  "Chain statuses are validated.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/b", status: 200,
    redirect_chain: [HOP("https://x.com/b", 99)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-chain-entry" });

add("case-rnm-29", "url over cap",
  "2001-char URLs are rejected.",
  { requested_url: "https://x.com/" + "a".repeat(1990), final_url: "https://x.com/a", status: 200 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-requested-url" });

add("case-rnm-30", "url at cap",
  "Boundary: exactly 2000 chars is accepted.",
  { requested_url: "https://x.com/" + "a".repeat(1986), final_url: "https://x.com/" + "a".repeat(1986), status: 200 },
  { outcome: "bounded_success", claims: { rnm_verdict: "direct" } });

add("case-rnm-31", "nul in url",
  "NUL bytes are rejected.",
  { requested_url: "https://x.com/a\0b", final_url: "https://x.com/a", status: 200 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-rnm-32", "title over cap",
  "501-char titles are rejected.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "t".repeat(501) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-title" });

add("case-rnm-33", "title at cap",
  "Boundary: exactly 500 chars is accepted.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "t".repeat(500) },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "direct", rnm_title: "t".repeat(500) } });

add("case-rnm-34", "nul in title",
  "NUL in titles is rejected.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "a\0b" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-rnm-35", "bad canonical",
  "Canonical must be a valid URL.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    canonical: "not a url" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-canonical" });

add("case-rnm-36", "uppercase marker",
  "Marker scan is case-insensitive.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "Shop <SCRIPT>" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "quarantine" },
    required_quarantined: [{ property: "rename-redirect-input", reason: "active-content" }] });

add("case-rnm-37", "onload marker",
  "Event-handler markers fire.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    previous_title: "Old onload=x", title: "New" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "quarantine" },
    required_quarantined: [{ property: "rename-redirect-input", reason: "active-content" }] });

add("case-rnm-38", "benign html",
  "Benign HTML is not a marker.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "<b>Shop</b>" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "direct", rnm_title: "<b>Shop</b>" } });

add("case-rnm-39", "unicode title rename",
  "Unicode titles compare literally.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "Café", previous_title: "Cafe" },
  { outcome: "bounded_success", claims: { rnm_verdict: "renamed" } });

add("case-rnm-40", "404 final",
  "Status is claimed, not interpreted.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 404,
    title: "Not Found" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "direct", rnm_status: 404 } });

add("case-rnm-41", "redirect to 404",
  "Redirect classification holds at any status.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/b", status: 404,
    redirect_chain: [HOP("https://x.com/b", 301)] },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "redirect", rnm_status: 404 } });

add("case-rnm-42", "query differs",
  "Query strings matter: literal compare.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a?x=1", status: 200,
    redirect_chain: [HOP("https://x.com/a?x=1", 301)] },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "redirect", rnm_final_url: "https://x.com/a?x=1" } });

add("case-rnm-43", "http to https",
  "Scheme changes are redirects.",
  { requested_url: "http://x.com/a", final_url: "https://x.com/a", status: 200,
    redirect_chain: [HOP("https://x.com/a", 301)] },
  { outcome: "bounded_success", claims: { rnm_verdict: "redirect" } });

add("case-rnm-44", "port differs",
  "Port changes are redirects.",
  { requested_url: "https://x.com:8443/a", final_url: "https://x.com/a", status: 200,
    redirect_chain: [HOP("https://x.com/a", 301)] },
  { outcome: "bounded_success", claims: { rnm_verdict: "redirect" } });

add("case-rnm-45", "trailing slash",
  "Trailing slashes matter: literal compare.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a/", status: 200,
    redirect_chain: [HOP("https://x.com/a/", 301)] },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "redirect", rnm_final_url: "https://x.com/a/" } });

add("case-rnm-46", "self-loop chain",
  "Hops back to the same URL still count.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    redirect_chain: [HOP("https://x.com/a", 302)] },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "redirect", rnm_redirect_count: 1 } });

add("case-rnm-47", "kitchen sink redirect",
  "Full observation with title and canonical.",
  { requested_url: "https://x.com/old", final_url: "https://x.com/new", status: 200,
    redirect_chain: [HOP("https://x.com/new", 308)],
    title: "New Page", previous_title: "Old Page",
    canonical: "https://x.com/other" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "redirect", rnm_final_url: "https://x.com/new", rnm_title: "New Page" },
    absent_claims: ["rnm_canonical"] });

add("case-rnm-48", "kitchen sink direct",
  "Full direct observation.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "Page", canonical: "https://x.com/a" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "direct", rnm_title: "Page" },
    absent_claims: ["rnm_redirect_count", "rnm_canonical"] });

add("case-rnm-49", "final typed failure",
  "Closing shape failure: missing final_url.",
  { requested_url: "https://x.com/a", status: 200 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-final-url" });

// ---- manifest: missions ACQ-1951..ACQ-2000 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1951 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestRnm = manifest;

export { C, manifest, manifestRnm };
export function getCase(id) { return C.find((c) => c.id === id); }
