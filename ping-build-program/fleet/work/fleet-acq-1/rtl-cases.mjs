#!/usr/bin/env node
// rate-limits fixture lab, batch 1: case-rtl-0..49 (missions ACQ-2351..ACQ-2400).
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });
const sha = (s) => createHash("sha256").update(s).digest("hex");

add("case-rtl-0", "429 basic",
  "429 is rate-limited; body never hashed.",
  { url: "https://x.com/a", http_status: 429, body: "Too many requests" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited" },
    absent_claims: ["rtl_body_sha256"] });

add("case-rtl-1", "429 with retry",
  "Retry-after is claimed.",
  { url: "https://x.com/a", http_status: 429, retry_after_seconds: 60, body: "x" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_retry_after_seconds: 60 },
    absent_claims: ["rtl_body_sha256"] });

add("case-rtl-2", "429 no retry claim",
  "Absent retry-after is not guessed.",
  { url: "https://x.com/a", http_status: 429 },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited" },
    absent_claims: ["rtl_retry_after_seconds", "rtl_body_sha256"] });

add("case-rtl-3", "200 ok",
  "200 claims body identity.",
  { url: "https://x.com/a", http_status: 200, body: "<p>Hi</p>" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "ok", rtl_body_sha256: sha("<p>Hi</p>") } });

add("case-rtl-4", "200 no body",
  "200 without body: no hash claim.",
  { url: "https://x.com/a", http_status: 200 },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "ok" }, absent_claims: ["rtl_body_sha256"] });

add("case-rtl-5", "503 with retry",
  "503 with retry-after is rate-limited.",
  { url: "https://x.com/a", http_status: 503, retry_after_seconds: 120, body: "busy" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_retry_after_seconds: 120 },
    absent_claims: ["rtl_body_sha256"] });

add("case-rtl-6", "503 bare",
  "503 without signals is error.",
  { url: "https://x.com/a", http_status: 503, body: "busy" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "error" }, absent_claims: ["rtl_body_sha256"] });

add("case-rtl-7", "503 remaining",
  "503 with remaining header is rate-limited.",
  { url: "https://x.com/a", http_status: 503, rate_limit_remaining: 0, body: "x" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_rate_limit_remaining: 0 },
    absent_claims: ["rtl_body_sha256"] });

add("case-rtl-8", "404 error",
  "4xx other than 429 is error.",
  { url: "https://x.com/a", http_status: 404, body: "nope" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "error" }, absent_claims: ["rtl_body_sha256"] });

add("case-rtl-9", "500 error",
  "5xx other than 503 is error.",
  { url: "https://x.com/a", http_status: 500, body: "boom" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "error" }, absent_claims: ["rtl_body_sha256"] });

add("case-rtl-10", "301 error",
  "Redirects are not observations.",
  { url: "https://x.com/a", http_status: 301 },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "error" }, absent_claims: ["rtl_body_sha256"] });

add("case-rtl-11", "429 remaining",
  "Remaining header is claimed.",
  { url: "https://x.com/a", http_status: 429, rate_limit_remaining: 3, body: "x" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_rate_limit_remaining: 3 },
    absent_claims: ["rtl_body_sha256"] });

add("case-rtl-12", "retry zero",
  "Zero retry-after is valid.",
  { url: "https://x.com/a", http_status: 429, retry_after_seconds: 0, body: "x" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_retry_after_seconds: 0 } });

add("case-rtl-13", "retry float",
  "Fractional retry-after is valid.",
  { url: "https://x.com/a", http_status: 429, retry_after_seconds: 1.5, body: "x" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_retry_after_seconds: 1.5 } });

add("case-rtl-14", "retry cap",
  "Boundary: 604800 is accepted.",
  { url: "https://x.com/a", http_status: 429, retry_after_seconds: 604800, body: "x" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_retry_after_seconds: 604800 } });

add("case-rtl-15", "retry over cap",
  "604801 is rejected.",
  { url: "https://x.com/a", http_status: 429, retry_after_seconds: 604801, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-retry-after" });

add("case-rtl-16", "retry negative",
  "Negative retry-after is rejected.",
  { url: "https://x.com/a", http_status: 429, retry_after_seconds: -1, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-retry-after" });

add("case-rtl-17", "retry string",
  "String retry-after is rejected.",
  { url: "https://x.com/a", http_status: 429, retry_after_seconds: "60", body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-retry-after" });

add("case-rtl-18", "retry nan",
  "NaN retry-after is rejected.",
  { url: "https://x.com/a", http_status: 429, retry_after_seconds: NaN, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-retry-after" });

add("case-rtl-19", "retry infinity",
  "Infinite retry-after is rejected.",
  { url: "https://x.com/a", http_status: 429, retry_after_seconds: Infinity, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-retry-after" });

add("case-rtl-20", "remaining zero",
  "Zero remaining is valid.",
  { url: "https://x.com/a", http_status: 429, rate_limit_remaining: 0, body: "x" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_rate_limit_remaining: 0 } });

add("case-rtl-21", "remaining negative",
  "Negative remaining is rejected.",
  { url: "https://x.com/a", http_status: 429, rate_limit_remaining: -1, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-rate-limit-remaining" });

add("case-rtl-22", "remaining float",
  "Fractional remaining is rejected.",
  { url: "https://x.com/a", http_status: 429, rate_limit_remaining: 2.5, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-rate-limit-remaining" });

add("case-rtl-23", "remaining string",
  "String remaining is rejected.",
  { url: "https://x.com/a", http_status: 429, rate_limit_remaining: "5", body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-rate-limit-remaining" });

add("case-rtl-24", "status string",
  "Statuses must be integers.",
  { url: "https://x.com/a", http_status: "429", body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-status" });

add("case-rtl-25", "status float",
  "Float statuses are rejected.",
  { url: "https://x.com/a", http_status: 429.5, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-status" });

add("case-rtl-26", "status 99",
  "Below 100 is rejected.",
  { url: "https://x.com/a", http_status: 99, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-status" });

add("case-rtl-27", "status 600",
  "Above 599 is rejected.",
  { url: "https://x.com/a", http_status: 600, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-status" });

add("case-rtl-28", "status missing",
  "Status is required.",
  { url: "https://x.com/a", body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-status" });

add("case-rtl-29", "body over cap",
  "10001-char bodies are rejected.",
  { url: "https://x.com/a", http_status: 200, body: "a".repeat(10001) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-body" });

add("case-rtl-30", "body at cap",
  "Boundary: 10000 chars is accepted.",
  { url: "https://x.com/a", http_status: 200, body: "a".repeat(10000) },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "ok", rtl_body_sha256: sha("a".repeat(10000)) } });

add("case-rtl-31", "body nul",
  "NUL in bodies is rejected.",
  { url: "https://x.com/a", http_status: 200, body: "a\0b" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-body" });

add("case-rtl-32", "body numeric",
  "Bodies must be strings.",
  { url: "https://x.com/a", http_status: 200, body: 42 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-body" });

add("case-rtl-33", "marker 200",
  "Active content quarantines on 200.",
  { url: "https://x.com/a", http_status: 200, body: "<p>Hi</p><script>x</script>" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "quarantine" },
    required_quarantined: [{ property: "fetch-outcome", reason: "active-content" }] });

add("case-rtl-34", "marker 429",
  "Active content quarantines on 429 too.",
  { url: "https://x.com/a", http_status: 429, body: "busy <iframe>" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "quarantine" },
    required_quarantined: [{ property: "fetch-outcome", reason: "active-content" }] });

add("case-rtl-35", "marker 503",
  "Active content quarantines on 503.",
  { url: "https://x.com/a", http_status: 503, retry_after_seconds: 5, body: "busy onerror=x" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "quarantine" },
    required_quarantined: [{ property: "fetch-outcome", reason: "active-content" }] });

add("case-rtl-36", "quarantine keeps url",
  "Quarantine still claims the URL.",
  { url: "https://x.com/a", http_status: 200, body: "<script>x</script>" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "quarantine", rtl_page_url: "https://x.com/a" },
    min_provenance: { rtl_verdict: 1 } });

add("case-rtl-37", "no content extraction",
  "Bodies are never content-extracted.",
  { url: "https://x.com/a", http_status: 200, body: "<title>Shop</title>" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "ok" },
    absent_claims: ["rtl_title", "rtl_text", "rtl_content"] });

add("case-rtl-38", "not an object",
  "Strings are not observations.",
  "x",
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-rtl-39", "bad url",
  "URLs must be absolute HTTP(S).",
  { url: "/rel", http_status: 429, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-rtl-40", "429 body ignored",
  "429 body content is never observed.",
  { url: "https://x.com/a", http_status: 429, body: "<title>Secret</title>" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited" },
    absent_claims: ["rtl_body_sha256", "rtl_title"] });

add("case-rtl-41", "503 body ignored",
  "503 rate-limited bodies are never observed.",
  { url: "https://x.com/a", http_status: 503, retry_after_seconds: 9, body: "secret" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_retry_after_seconds: 9 },
    absent_claims: ["rtl_body_sha256"] });

add("case-rtl-42", "empty body 200",
  "Empty bodies hash as empty.",
  { url: "https://x.com/a", http_status: 200, body: "" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "ok", rtl_body_sha256: sha("") } });

add("case-rtl-43", "empty body 429",
  "Empty 429 bodies stay unhashed.",
  { url: "https://x.com/a", http_status: 429, body: "" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited" }, absent_claims: ["rtl_body_sha256"] });

add("case-rtl-44", "retry beats body",
  "Check order: retry_after (4) before body (6).",
  { url: "https://x.com/a", http_status: 429, retry_after_seconds: -5, body: "a".repeat(10001) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-retry-after" });

add("case-rtl-45", "url beats status",
  "Check order: URL (2) before status (3).",
  { url: "notaurl", http_status: "bad", body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-rtl-46", "kitchen 429",
  "Full 429 observation.",
  { url: "https://x.com/shop", http_status: 429, retry_after_seconds: 30,
    rate_limit_remaining: 0, body: "Slow down" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_retry_after_seconds: 30,
              rtl_rate_limit_remaining: 0 },
    absent_claims: ["rtl_body_sha256"] });

add("case-rtl-47", "kitchen 200",
  "Full 200 observation.",
  { url: "https://x.com/shop", http_status: 200, body: "<p>Open</p>",
    retry_after_seconds: undefined },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "ok", rtl_body_sha256: sha("<p>Open</p>") } });

add("case-rtl-48", "final error",
  "Closing error: 418.",
  { url: "https://x.com/a", http_status: 418, body: "teapot" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "error" }, absent_claims: ["rtl_body_sha256"] });

add("case-rtl-49", "final ok",
  "Closing accept: 200.",
  { url: "https://x.com/a", http_status: 200, body: "Done" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "ok", rtl_body_sha256: sha("Done") } });

// ---- manifest: missions ACQ-2351..ACQ-2400 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(2351 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestRtl = manifest;

export { C, manifest, manifestRtl };
export function getCase(id) { return C.find((c) => c.id === id); }
