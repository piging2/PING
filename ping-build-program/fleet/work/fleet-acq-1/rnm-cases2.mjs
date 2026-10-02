#!/usr/bin/env node
// renames-redirects fixture lab, batch 2: case-rnm-50..99 (missions ACQ-2001..ACQ-2050).
// Second wave: check-ordering, chain consistency, URL literalism, rename edges.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });
const HOP = (url, status) => ({ url, status });

add("case-rnm-50", "no chain redirect",
  "URLs differ, no chain: redirect, hop count unclaimed.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/b", status: 200 },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "redirect", rnm_final_url: "https://x.com/b" },
    absent_claims: ["rnm_redirect_count"] });

add("case-rnm-51", "status beats marker",
  "Check order: status (3) precedes marker scan (7).",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 99,
    title: "x<script>" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-status" });

add("case-rnm-52", "title cap beats marker",
  "Check order: title caps (5) precede marker scan (7).",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "t".repeat(501) + "<script>" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-title" });

add("case-rnm-53", "canonical beats marker",
  "Check order: canonical (6) precedes marker scan (7).",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "x<script>", canonical: "not a url" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-canonical" });

add("case-rnm-54", "url beats marker",
  "Check order: URL validation (2) precedes marker scan (7).",
  { requested_url: "notaurl<script>", final_url: "https://x.com/a", status: 200 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-requested-url" });

add("case-rnm-55", "chain beats marker",
  "Check order: chain shape (4) precedes marker scan (7).",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    redirect_chain: [], title: "x<script>" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-redirect-chain" });

add("case-rnm-56", "nul beats marker",
  "Check order: NUL check (2) precedes marker scan (7).",
  { requested_url: "https://x.com/a", final_url: "https://x.com/\0<script>", status: 200 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-rnm-57", "chain-final mismatch",
  "First hop equals requested but last must equal final.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/z", status: 200,
    redirect_chain: [HOP("https://x.com/a", 301)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "chain-final-mismatch" });

add("case-rnm-58", "chain entry extra fields",
  "Extra entry fields are ignored.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/b", status: 200,
    redirect_chain: [{ url: "https://x.com/b", status: 301, at: "t" }] },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "redirect", rnm_redirect_count: 1 } });

add("case-rnm-59", "status 599",
  "Boundary: 599 is accepted.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 599 },
  { outcome: "bounded_success", claims: { rnm_verdict: "direct", rnm_status: 599 } });

add("case-rnm-60", "idn host",
  "Unicode hosts are valid observations.",
  { requested_url: "https://münchen.de/a", final_url: "https://münchen.de/a", status: 200 },
  { outcome: "bounded_success", claims: { rnm_verdict: "direct" } });

add("case-rnm-61", "trailing dot host",
  "Trailing-dot hosts are valid observations.",
  { requested_url: "https://x.com./a", final_url: "https://x.com./a", status: 200 },
  { outcome: "bounded_success", claims: { rnm_verdict: "direct" } });

add("case-rnm-62", "uppercase scheme",
  "No scheme normalization: raw strings compared literally.",
  { requested_url: "HTTPS://x.com/a", final_url: "https://x.com/a", status: 200 },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "redirect" },
    absent_claims: ["rnm_redirect_count"] });

add("case-rnm-63", "previous only",
  "Rename needs both titles: direct.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    previous_title: "Old" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "direct" },
    absent_claims: ["rnm_title"] });

add("case-rnm-64", "title only",
  "Title without previous: direct, title claimed.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "Only" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "direct", rnm_title: "Only" } });

add("case-rnm-65", "empty title",
  "Empty titles are rejected.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-title" });

add("case-rnm-66", "numeric title",
  "Titles must be strings.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: 42 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-title" });

add("case-rnm-67", "marker in previous",
  "previous_title is scanned.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "New", previous_title: "Old <iframe>" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "quarantine" },
    required_quarantined: [{ property: "rename-redirect-input", reason: "active-content" }] });

add("case-rnm-68", "canonical case differs",
  "Literal compare: canonical case difference stays unadopted.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    canonical: "https://x.com/A" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "direct" },
    absent_claims: ["rnm_canonical"] });

add("case-rnm-69", "fragment differs",
  "Fragments matter: literal compare.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a#top", status: 200,
    redirect_chain: [HOP("https://x.com/a#top", 301)] },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "redirect", rnm_final_url: "https://x.com/a#top" } });

add("case-rnm-70", "user info url",
  "Userinfo URLs are valid observations.",
  { requested_url: "https://u:p@x.com/a", final_url: "https://u:p@x.com/a", status: 200 },
  { outcome: "bounded_success", claims: { rnm_verdict: "direct" } });

add("case-rnm-71", "redirect cross scheme chain",
  "Multi-hop mixed statuses.",
  { requested_url: "http://x.com/a", final_url: "https://x.com/b", status: 200,
    redirect_chain: [HOP("https://x.com/a", 308), HOP("https://x.com/b", 302)] },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "redirect", rnm_redirect_count: 2 } });

add("case-rnm-72", "chain duplicate urls",
  "Repeated hop URLs are recorded literally.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/b", status: 200,
    redirect_chain: [HOP("https://x.com/b", 301), HOP("https://x.com/b", 302)] },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "redirect", rnm_redirect_count: 2 } });

add("case-rnm-73", "chain entry numeric status",
  "Chain statuses must be integers.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/b", status: 200,
    redirect_chain: [HOP("https://x.com/b", "301")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-chain-entry" });

add("case-rnm-74", "chain entry missing url",
  "Chain entries need URLs.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/b", status: 200,
    redirect_chain: [{ status: 301 }] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-chain-entry" });

add("case-rnm-75", "long chain urls",
  "Cap-boundary URLs inside a chain.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/" + "z".repeat(1986), status: 200,
    redirect_chain: [HOP("https://x.com/" + "z".repeat(1986), 301)] },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "redirect", rnm_redirect_count: 1 } });

add("case-rnm-76", "chain url over cap",
  "Chain URLs respect the 2000 cap.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/" + "z".repeat(1990), status: 200,
    redirect_chain: [HOP("https://x.com/" + "z".repeat(1990), 301)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-final-url" });

add("case-rnm-77", "onerror in chain",
  "Chain URL markers quarantine.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/b?x=onerror", status: 200,
    redirect_chain: [HOP("https://x.com/b?x=onerror", 301)] },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "quarantine" },
    required_quarantined: [{ property: "rename-redirect-input", reason: "active-content" }] });

add("case-rnm-78", "php in title",
  "PHP markers fire.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "Shop <?php" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "quarantine" },
    required_quarantined: [{ property: "rename-redirect-input", reason: "active-content" }] });

add("case-rnm-79", "split marker",
  "Split markers are not markers.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "<scr ipt>" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "direct", rnm_title: "<scr ipt>" } });

add("case-rnm-80", "whitespace title rename",
  "Whitespace differences rename: no trimming.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "Shop", previous_title: "Shop " },
  { outcome: "bounded_success", claims: { rnm_verdict: "renamed" } });

add("case-rnm-81", "case rename",
  "Case differences rename: no case folding.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "Shop", previous_title: "shop" },
  { outcome: "bounded_success", claims: { rnm_verdict: "renamed" } });

add("case-rnm-82", "unicode rename",
  "Unicode title change is a rename.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "Ünï", previous_title: "Uni" },
  { outcome: "bounded_success", claims: { rnm_verdict: "renamed", rnm_title: "Ünï" } });

add("case-rnm-83", "long titles rename",
  "Cap-boundary titles can rename.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "t".repeat(500), previous_title: "u".repeat(500) },
  { outcome: "bounded_success", claims: { rnm_verdict: "renamed" } });

add("case-rnm-84", "emoji titles",
  "Emoji titles are literal.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "Shop \u{1F600}", previous_title: "Shop \u{1F600}" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "direct", rnm_title: "Shop \u{1F600}" } });

add("case-rnm-85", "kitchen sink rename",
  "Full rename observation.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "New Name", previous_title: "Old Name",
    canonical: "https://x.com/a" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "renamed", rnm_title: "New Name" },
    absent_claims: ["rnm_canonical"] });

add("case-rnm-86", "kitchen sink quarantine",
  "Markers beat rename classification.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "New <script>", previous_title: "Old" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "quarantine" },
    required_quarantined: [{ property: "rename-redirect-input", reason: "active-content" }] });

add("case-rnm-87", "kitchen sink redirect",
  "Full redirect with canonical unadopted.",
  { requested_url: "https://x.com/a", final_url: "https://y.com/b", status: 301,
    redirect_chain: [HOP("https://y.com/b", 301)],
    title: "B", canonical: "https://z.com/c" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "redirect", rnm_final_url: "https://y.com/b",
              rnm_redirect_count: 1, rnm_status: 301, rnm_title: "B" },
    absent_claims: ["rnm_canonical"] });

add("case-rnm-88", "status 200 direct",
  "Plain 200 direct fetch.",
  { requested_url: "https://x.com/", final_url: "https://x.com/", status: 200 },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "direct", rnm_requested_url: "https://x.com/" } });

add("case-rnm-89", "status 500 direct",
  "Server errors are observed, not interpreted.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 500 },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "direct", rnm_status: 500 } });

add("case-rnm-90", "float status",
  "Status must be an integer.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200.5 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-status" });

add("case-rnm-91", "null status",
  "Status is required.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: null },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-status" });

add("case-rnm-92", "canonical over cap",
  "Canonical respects the URL cap.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    canonical: "https://x.com/" + "c".repeat(1990) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-canonical" });

add("case-rnm-93", "canonical at cap",
  "Boundary: 2000-char canonical accepted, unadopted.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    canonical: "https://x.com/" + "c".repeat(1986) },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "direct" },
    absent_claims: ["rnm_canonical"] });

add("case-rnm-94", "nul in canonical",
  "NUL in canonical is rejected.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    canonical: "https://x.com/a\0" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-rnm-95", "chain nul",
  "NUL in chain URLs is rejected.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/b", status: 200,
    redirect_chain: [HOP("https://x.com/\0b", 301)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-rnm-96", "final agree",
  "Closing accept: single-hop redirect.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/b", status: 200,
    redirect_chain: [HOP("https://x.com/b", 301)] },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "redirect", rnm_final_url: "https://x.com/b" } });

add("case-rnm-97", "final rename",
  "Closing rename.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    title: "After", previous_title: "Before" },
  { outcome: "bounded_success", claims: { rnm_verdict: "renamed" } });

add("case-rnm-98", "final typed failure",
  "Closing typed failure: bad final URL.",
  { requested_url: "https://x.com/a", final_url: "notaurl", status: 200 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-final-url" });

add("case-rnm-99", "final quarantine",
  "Closing quarantine: marker in canonical.",
  { requested_url: "https://x.com/a", final_url: "https://x.com/a", status: 200,
    canonical: "https://x.com/<?php" },
  { outcome: "bounded_success",
    claims: { rnm_verdict: "quarantine" },
    required_quarantined: [{ property: "rename-redirect-input", reason: "active-content" }] });

// ---- manifest: missions ACQ-2001..ACQ-2050 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(2001 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestRnm2 = manifest;

export { C, manifest, manifestRnm2 };
export function getCase(id) { return C.find((c) => c.id === id); }
