#!/usr/bin/env node
// provider-outage fixture lab: case-pvo-0..49 (missions ACQ-2451..ACQ-2500).
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });
const sha = (s) => createHash("sha256").update(s).digest("hex");

add("case-pvo-0", "transport error",
  "Connection resets are outages, not observations.",
  { url: "https://x.com/a", outcome: "transport-error", error_detail: "ECONNRESET", body: "partial" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "outage", pvo_outage_class: "transport-error",
              pvo_error_detail: "ECONNRESET" },
    absent_claims: ["pvo_body_sha256"] });

add("case-pvo-1", "timeout",
  "Timeouts are outages.",
  { url: "https://x.com/a", outcome: "timeout", body: "half a page" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "outage", pvo_outage_class: "timeout" },
    absent_claims: ["pvo_body_sha256", "pvo_error_detail"] });

add("case-pvo-2", "dns failure",
  "DNS failures are outages.",
  { url: "https://x.com/a", outcome: "dns-failure", error_detail: "ENOTFOUND" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "outage", pvo_outage_class: "dns-failure",
              pvo_error_detail: "ENOTFOUND" } });

add("case-pvo-3", "tls failure",
  "TLS failures are outages.",
  { url: "https://x.com/a", outcome: "tls-failure", error_detail: "CERT_EXPIRED" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "outage", pvo_outage_class: "tls-failure" } });

add("case-pvo-4", "http error",
  "HTTP 500 is an outage of class http-error.",
  { url: "https://x.com/a", outcome: "http-error", http_status: 500, body: "boom" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "outage", pvo_outage_class: "http-error" },
    absent_claims: ["pvo_body_sha256"] });

add("case-pvo-5", "http 429",
  "HTTP 429 is an outage of class http-error.",
  { url: "https://x.com/a", outcome: "http-error", http_status: 429, body: "slow" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "outage", pvo_outage_class: "http-error" } });

add("case-pvo-6", "success 200",
  "Success with 200 hashes the body.",
  { url: "https://x.com/a", outcome: "success", http_status: 200, body: "<p>Hi</p>" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "ok", pvo_body_sha256: sha("<p>Hi</p>") },
    absent_claims: ["pvo_outage_class"] });

add("case-pvo-7", "success 200 no body",
  "Success without body: no hash.",
  { url: "https://x.com/a", outcome: "success", http_status: 200 },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "ok" }, absent_claims: ["pvo_body_sha256"] });

add("case-pvo-8", "success 404",
  "Success carrying 404 is error, not ok.",
  { url: "https://x.com/a", outcome: "success", http_status: 404, body: "nope" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "error" }, absent_claims: ["pvo_body_sha256"] });

add("case-pvo-9", "success 500",
  "Success carrying 500 is error.",
  { url: "https://x.com/a", outcome: "success", http_status: 500, body: "boom" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "error" }, absent_claims: ["pvo_body_sha256"] });

add("case-pvo-10", "unknown outcome",
  "Outcomes outside the enum are typed failures.",
  { url: "https://x.com/a", outcome: "alien-abduction", body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-outcome" });

add("case-pvo-11", "missing outcome",
  "Outcome is required.",
  { url: "https://x.com/a", body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-outcome" });

add("case-pvo-12", "success missing status",
  "Success requires http_status.",
  { url: "https://x.com/a", outcome: "success", body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-status" });

add("case-pvo-13", "http-error missing status",
  "http-error requires http_status.",
  { url: "https://x.com/a", outcome: "http-error", body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-status" });

add("case-pvo-14", "timeout with status",
  "Transport outcomes must not carry http_status.",
  { url: "https://x.com/a", outcome: "timeout", http_status: 504, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "status-not-applicable" });

add("case-pvo-15", "dns with status",
  "DNS failures must not carry http_status.",
  { url: "https://x.com/a", outcome: "dns-failure", http_status: 500 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "status-not-applicable" });

add("case-pvo-16", "status string",
  "Statuses must be integers.",
  { url: "https://x.com/a", outcome: "success", http_status: "200", body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-status" });

add("case-pvo-17", "status 99",
  "Below 100 is rejected.",
  { url: "https://x.com/a", outcome: "success", http_status: 99, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-status" });

add("case-pvo-18", "detail over cap",
  "501-char details are rejected.",
  { url: "https://x.com/a", outcome: "timeout", error_detail: "d".repeat(501) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-error-detail" });

add("case-pvo-19", "detail at cap",
  "Boundary: 500 chars is accepted.",
  { url: "https://x.com/a", outcome: "timeout", error_detail: "d".repeat(500) },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "outage", pvo_error_detail: "d".repeat(500) } });

add("case-pvo-20", "detail empty",
  "Empty details are rejected.",
  { url: "https://x.com/a", outcome: "timeout", error_detail: "" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-error-detail" });

add("case-pvo-21", "detail whitespace",
  "Whitespace-only details are rejected.",
  { url: "https://x.com/a", outcome: "timeout", error_detail: "   " },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-error-detail" });

add("case-pvo-22", "detail nul",
  "NUL in details is rejected.",
  { url: "https://x.com/a", outcome: "timeout", error_detail: "a\0b" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-error-detail" });

add("case-pvo-23", "detail numeric",
  "Details must be strings.",
  { url: "https://x.com/a", outcome: "timeout", error_detail: 42 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-error-detail" });

add("case-pvo-24", "detail never guessed",
  "Absent detail is not inferred.",
  { url: "https://x.com/a", outcome: "timeout" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "outage", pvo_outage_class: "timeout" },
    absent_claims: ["pvo_error_detail"] });

add("case-pvo-25", "body over cap",
  "10001-char bodies are rejected.",
  { url: "https://x.com/a", outcome: "success", http_status: 200, body: "a".repeat(10001) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-body" });

add("case-pvo-26", "body at cap",
  "Boundary: 10000 chars is accepted.",
  { url: "https://x.com/a", outcome: "success", http_status: 200, body: "a".repeat(10000) },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "ok", pvo_body_sha256: sha("a".repeat(10000)) } });

add("case-pvo-27", "body nul",
  "NUL in bodies is rejected.",
  { url: "https://x.com/a", outcome: "success", http_status: 200, body: "a\0" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-body" });

add("case-pvo-28", "marker success",
  "Active content quarantines on success.",
  { url: "https://x.com/a", outcome: "success", http_status: 200, body: "<p>x</p><script>y</script>" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "quarantine" },
    required_quarantined: [{ property: "attempt-outcome", reason: "active-content" }] });

add("case-pvo-29", "marker outage",
  "Active content quarantines on outage bodies.",
  { url: "https://x.com/a", outcome: "timeout", body: "half <iframe>" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "quarantine" },
    required_quarantined: [{ property: "attempt-outcome", reason: "active-content" }] });

add("case-pvo-30", "marker http-error",
  "Active content quarantines on http-error.",
  { url: "https://x.com/a", outcome: "http-error", http_status: 502, body: "x onerror=y" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "quarantine" },
    required_quarantined: [{ property: "attempt-outcome", reason: "active-content" }] });

add("case-pvo-31", "not an object",
  "Strings are not observations.",
  "x",
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-pvo-32", "bad url",
  "URLs must be absolute HTTP(S).",
  { url: "notaurl", outcome: "timeout", body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-pvo-33", "no content extraction",
  "Bodies are never content-extracted.",
  { url: "https://x.com/a", outcome: "success", http_status: 200, body: "<title>Shop</title>" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "ok" },
    absent_claims: ["pvo_title", "pvo_text"] });

add("case-pvo-34", "hash stable",
  "Same body, same hash.",
  { url: "https://x.com/a", outcome: "success", http_status: 200, body: "stable" },
  { outcome: "bounded_success",
    claims: { pvo_body_sha256: sha("stable") } });

add("case-pvo-35", "hash differs",
  "One byte changes the hash.",
  { url: "https://x.com/a", outcome: "success", http_status: 200, body: "stablf" },
  { outcome: "bounded_success",
    claims: { pvo_body_sha256: sha("stablf") } });

add("case-pvo-36", "outage body ignored",
  "Outage bodies are never hashed.",
  { url: "https://x.com/a", outcome: "dns-failure", body: "hash me not" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "outage", pvo_outage_class: "dns-failure" },
    absent_claims: ["pvo_body_sha256"] });

add("case-pvo-37", "url claim",
  "Page URL is claimed.",
  { url: "https://x.com/shop", outcome: "timeout" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "outage", pvo_page_url: "https://x.com/shop" } });

add("case-pvo-38", "provenance depth",
  "Every claim carries provenance.",
  { url: "https://x.com/a", outcome: "transport-error", error_detail: "RESET", body: "x" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "outage" },
    min_provenance: { pvo_verdict: 1, pvo_page_url: 1, pvo_outage_class: 1, pvo_error_detail: 1 } });

add("case-pvo-39", "extra ignored",
  "Unknown input fields are ignored.",
  { url: "https://x.com/a", outcome: "timeout", at: "t" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "outage", pvo_outage_class: "timeout" } });

add("case-pvo-40", "kitchen outage",
  "Full outage observation.",
  { url: "https://x.com/shop", outcome: "tls-failure", error_detail: "CERT_HAS_EXPIRED", body: "stale bytes" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "outage", pvo_outage_class: "tls-failure",
              pvo_error_detail: "CERT_HAS_EXPIRED" },
    absent_claims: ["pvo_body_sha256"] });

add("case-pvo-41", "kitchen ok",
  "Full success observation.",
  { url: "https://x.com/shop", outcome: "success", http_status: 200, body: "<p>Open</p>" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "ok", pvo_body_sha256: sha("<p>Open</p>") } });

add("case-pvo-42", "kitchen http-error",
  "Full http-error observation.",
  { url: "https://x.com/shop", outcome: "http-error", http_status: 503,
    error_detail: "overloaded", body: "busy" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "outage", pvo_outage_class: "http-error",
              pvo_error_detail: "overloaded" },
    absent_claims: ["pvo_body_sha256"] });

add("case-pvo-43", "success 301",
  "Success carrying 301 is error.",
  { url: "https://x.com/a", outcome: "success", http_status: 301, body: "moved" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "error" }, absent_claims: ["pvo_body_sha256"] });

add("case-pvo-44", "unicode detail",
  "Unicode details are literal.",
  { url: "https://x.com/a", outcome: "timeout", error_detail: "délai dépassé" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "outage", pvo_error_detail: "délai dépassé" } });

add("case-pvo-45", "final outage",
  "Closing outage.",
  { url: "https://x.com/a", outcome: "transport-error" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "outage", pvo_outage_class: "transport-error" } });

add("case-pvo-46", "final ok",
  "Closing accept.",
  { url: "https://x.com/a", outcome: "success", http_status: 200, body: "Fin" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "ok", pvo_body_sha256: sha("Fin") } });

add("case-pvo-47", "final quarantine",
  "Closing quarantine.",
  { url: "https://x.com/a", outcome: "success", http_status: 200, body: "x<?php" },
  { outcome: "bounded_success",
    claims: { pvo_verdict: "quarantine" },
    required_quarantined: [{ property: "attempt-outcome", reason: "active-content" }] });

add("case-pvo-48", "final status failure",
  "Closing typed failure: status on transport outcome.",
  { url: "https://x.com/a", outcome: "tls-failure", http_status: 500 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "status-not-applicable" });

add("case-pvo-49", "final outcome failure",
  "Closing typed failure: unknown outcome.",
  { url: "https://x.com/a", outcome: 42 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-outcome" });

// ---- manifest: missions ACQ-2451..ACQ-2500 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(2451 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestPvo = manifest;

export { C, manifest, manifestPvo };
export function getCase(id) { return C.find((c) => c.id === id); }
