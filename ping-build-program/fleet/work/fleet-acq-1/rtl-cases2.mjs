#!/usr/bin/env node
// rate-limits fixture lab, batch 2: case-rtl-50..99 (missions ACQ-2401..ACQ-2450).
// Second wave: classification edges, signal combos, cap boundaries.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });
const sha = (s) => createHash("sha256").update(s).digest("hex");

add("case-rtl-50", "429 no signals",
  "Bare 429 is rate-limited.",
  { url: "https://x.com/a", http_status: 429 },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited" },
    absent_claims: ["rtl_retry_after_seconds", "rtl_rate_limit_remaining", "rtl_body_sha256"] });

add("case-rtl-51", "429 both signals",
  "Both signals are claimed.",
  { url: "https://x.com/a", http_status: 429, retry_after_seconds: 10, rate_limit_remaining: 2, body: "x" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_retry_after_seconds: 10, rtl_rate_limit_remaining: 2 },
    absent_claims: ["rtl_body_sha256"] });

add("case-rtl-52", "503 retry zero",
  "503 with retry_after_seconds=0 is rate-limited.",
  { url: "https://x.com/a", http_status: 503, retry_after_seconds: 0, body: "x" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_retry_after_seconds: 0 },
    absent_claims: ["rtl_body_sha256"] });

add("case-rtl-53", "503 remaining zero",
  "503 with rate_limit_remaining=0 is rate-limited.",
  { url: "https://x.com/a", http_status: 503, rate_limit_remaining: 0, body: "x" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_rate_limit_remaining: 0 } });

add("case-rtl-54", "503 neither",
  "503 with no signals is error.",
  { url: "https://x.com/a", http_status: 503 },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "error" }, absent_claims: ["rtl_body_sha256"] });

add("case-rtl-55", "status 100",
  "Boundary: 100 is a valid status.",
  { url: "https://x.com/a", http_status: 100 },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "error" } });

add("case-rtl-56", "status 599",
  "Boundary: 599 is a valid status.",
  { url: "https://x.com/a", http_status: 599 },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "error" } });

add("case-rtl-57", "status 201",
  "201 is not ok content.",
  { url: "https://x.com/a", http_status: 201, body: "created" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "error" }, absent_claims: ["rtl_body_sha256"] });

add("case-rtl-58", "status 204",
  "204 is not ok content.",
  { url: "https://x.com/a", http_status: 204, body: "" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "error" }, absent_claims: ["rtl_body_sha256"] });

add("case-rtl-59", "200 with signals",
  "Signals on 200 are claimed, body hashed.",
  { url: "https://x.com/a", http_status: 200, retry_after_seconds: 5,
    rate_limit_remaining: 100, body: "b" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "ok", rtl_retry_after_seconds: 5,
              rtl_rate_limit_remaining: 100, rtl_body_sha256: sha("b") } });

add("case-rtl-60", "retry beats remaining",
  "Check order: retry_after (4) before remaining (5).",
  { url: "https://x.com/a", http_status: 429, retry_after_seconds: -1, rate_limit_remaining: -1, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-retry-after" });

add("case-rtl-61", "remaining beats body",
  "Check order: remaining (5) before body (6).",
  { url: "https://x.com/a", http_status: 429, rate_limit_remaining: 1.5, body: "a".repeat(10001) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-rate-limit-remaining" });

add("case-rtl-62", "body beats marker",
  "Check order: body validity (6) before marker scan (7).",
  { url: "https://x.com/a", http_status: 200, body: "a".repeat(10001) + "<script>" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-body" });

add("case-rtl-63", "nul beats marker",
  "Check order: NUL (6) before marker scan (7).",
  { url: "https://x.com/a", http_status: 200, body: "a\0<script>" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-body" });

add("case-rtl-64", "marker beats classification",
  "Check order: markers (7) before classification (8).",
  { url: "https://x.com/a", http_status: 503, retry_after_seconds: 3, body: "x<script>" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "quarantine" },
    required_quarantined: [{ property: "fetch-outcome", reason: "active-content" }] });

add("case-rtl-65", "hash stable",
  "Same body, same hash.",
  { url: "https://x.com/a", http_status: 200, body: "stable" },
  { outcome: "bounded_success",
    claims: { rtl_body_sha256: sha("stable") } });

add("case-rtl-66", "hash differs",
  "One byte changes the hash.",
  { url: "https://x.com/a", http_status: 200, body: "stablf" },
  { outcome: "bounded_success",
    claims: { rtl_body_sha256: sha("stablf") } });

add("case-rtl-67", "unicode body",
  "Unicode bodies hash.",
  { url: "https://x.com/a", http_status: 200, body: "Café" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "ok", rtl_body_sha256: sha("Café") } });

add("case-rtl-68", "null body",
  "Explicit null body is treated as absent.",
  { url: "https://x.com/a", http_status: 200, body: null },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "ok" }, absent_claims: ["rtl_body_sha256"] });

add("case-rtl-69", "object body",
  "Objects are not bodies.",
  { url: "https://x.com/a", http_status: 200, body: { t: "x" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-body" });

add("case-rtl-70", "array input",
  "Arrays are not observations.",
  [],
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-rtl-71", "null input",
  "Null is not an observation.",
  null,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-rtl-72", "url ftp",
  "Only HTTP(S) is accepted.",
  { url: "ftp://x.com/a", http_status: 429, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-rtl-73", "url ctl",
  "Control chars in URLs are rejected.",
  { url: "https://x.com/a\tb", http_status: 429, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-rtl-74", "remaining large",
  "Large remaining counts are valid.",
  { url: "https://x.com/a", http_status: 429, rate_limit_remaining: 1000000, body: "x" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_rate_limit_remaining: 1000000 } });

add("case-rtl-75", "retry small float",
  "Tiny fractional retry-after is valid.",
  { url: "https://x.com/a", http_status: 429, retry_after_seconds: 0.001, body: "x" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_retry_after_seconds: 0.001 } });

add("case-rtl-76", "429 retry null",
  "Null retry-after is rejected.",
  { url: "https://x.com/a", http_status: 429, retry_after_seconds: null, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-retry-after" });

add("case-rtl-77", "429 remaining null",
  "Null remaining is rejected.",
  { url: "https://x.com/a", http_status: 429, rate_limit_remaining: null, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-rate-limit-remaining" });

add("case-rtl-78", "onload 200",
  "onload quarantines on 200.",
  { url: "https://x.com/a", http_status: 200, body: "<img onload=x>" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "quarantine" },
    required_quarantined: [{ property: "fetch-outcome", reason: "active-content" }] });

add("case-rtl-79", "php 429",
  "PHP markers quarantine on 429.",
  { url: "https://x.com/a", http_status: 429, body: "<?php" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "quarantine" },
    required_quarantined: [{ property: "fetch-outcome", reason: "active-content" }] });

add("case-rtl-80", "benign 200",
  "Benign HTML hashes without quarantine.",
  { url: "https://x.com/a", http_status: 200, body: "<p>Hi</p>" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "ok", rtl_body_sha256: sha("<p>Hi</p>") } });

add("case-rtl-81", "split marker",
  "Split markers are not markers.",
  { url: "https://x.com/a", http_status: 200, body: "<scr ipt>" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "ok", rtl_body_sha256: sha("<scr ipt>") } });

add("case-rtl-82", "kitchen 429",
  "Full 429 observation with both signals.",
  { url: "https://x.com/shop", http_status: 429, retry_after_seconds: 45,
    rate_limit_remaining: 0, body: "Slow down, pal." },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_retry_after_seconds: 45,
              rtl_rate_limit_remaining: 0 },
    absent_claims: ["rtl_body_sha256"] });

add("case-rtl-83", "kitchen 503",
  "Full 503 rate-limited observation.",
  { url: "https://x.com/shop", http_status: 503, retry_after_seconds: 90, body: "Overloaded" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_retry_after_seconds: 90 },
    absent_claims: ["rtl_body_sha256"] });

add("case-rtl-84", "kitchen 200",
  "Full 200 observation.",
  { url: "https://x.com/shop", http_status: 200, body: "<p>Welcome</p>",
    rate_limit_remaining: 999 },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "ok", rtl_body_sha256: sha("<p>Welcome</p>"),
              rtl_rate_limit_remaining: 999 } });

add("case-rtl-85", "kitchen error",
  "Full 500 observation.",
  { url: "https://x.com/shop", http_status: 500, body: "Server blew up" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "error" }, absent_claims: ["rtl_body_sha256"] });

add("case-rtl-86", "provenance depth",
  "Every claim carries provenance.",
  { url: "https://x.com/a", http_status: 429, retry_after_seconds: 7,
    rate_limit_remaining: 1, body: "x" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited" },
    min_provenance: { rtl_verdict: 1, rtl_page_url: 1,
                      rtl_retry_after_seconds: 1, rtl_rate_limit_remaining: 1 } });

add("case-rtl-87", "no guess hash",
  "429 never yields a body hash.",
  { url: "https://x.com/a", http_status: 429, body: "hash me not" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited" }, absent_claims: ["rtl_body_sha256"] });

add("case-rtl-88", "url claim",
  "Page URL is claimed.",
  { url: "https://x.com/shop", http_status: 429, body: "x" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_page_url: "https://x.com/shop" } });

add("case-rtl-89", "extra fields ignored",
  "Unknown input fields are ignored.",
  { url: "https://x.com/a", http_status: 200, body: "b", at: "t" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "ok" } });

add("case-rtl-90", "final accept",
  "Closing accept: 200.",
  { url: "https://x.com/a", http_status: 200, body: "Fin" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "ok", rtl_body_sha256: sha("Fin") } });

add("case-rtl-91", "final rate-limited",
  "Closing rate-limited.",
  { url: "https://x.com/a", http_status: 429, retry_after_seconds: 5, body: "x" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "rate-limited", rtl_retry_after_seconds: 5 } });

add("case-rtl-92", "final error",
  "Closing error: 502.",
  { url: "https://x.com/a", http_status: 502, body: "x" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "error" }, absent_claims: ["rtl_body_sha256"] });

add("case-rtl-93", "final quarantine",
  "Closing quarantine.",
  { url: "https://x.com/a", http_status: 200, body: "x<script>" },
  { outcome: "bounded_success",
    claims: { rtl_verdict: "quarantine" },
    required_quarantined: [{ property: "fetch-outcome", reason: "active-content" }] });

add("case-rtl-94", "final status failure",
  "Closing typed failure: bad status.",
  { url: "https://x.com/a", http_status: 0, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-status" });

add("case-rtl-95", "final retry failure",
  "Closing typed failure: bad retry-after.",
  { url: "https://x.com/a", http_status: 429, retry_after_seconds: "soon", body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-retry-after" });

add("case-rtl-96", "final remaining failure",
  "Closing typed failure: bad remaining.",
  { url: "https://x.com/a", http_status: 429, rate_limit_remaining: -2, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-rate-limit-remaining" });

add("case-rtl-97", "final body failure",
  "Closing typed failure: bad body.",
  { url: "https://x.com/a", http_status: 200, body: "a\0" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-body" });

add("case-rtl-98", "final url failure",
  "Closing typed failure: bad URL.",
  { url: "", http_status: 429, body: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-rtl-99", "final shape failure",
  "Closing typed failure: non-object.",
  42,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

// ---- manifest: missions ACQ-2401..ACQ-2450 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(2401 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestRtl2 = manifest;

export { C, manifest, manifestRtl2 };
export function getCase(id) { return C.find((c) => c.id === id); }
