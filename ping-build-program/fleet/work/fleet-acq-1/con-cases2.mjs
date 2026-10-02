#!/usr/bin/env node
// software-connectors fixture lab, batch 2: case-con-50..99 (missions ACQ-1701..ACQ-1750).
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });

add("case-con-50", "missing client_id",
  "Required keys are enforced.",
  { connector: "google-calendar", config: { calendar_id: "primary" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "missing-config-key" });

add("case-con-51", "missing qb token",
  "Required keys are enforced.",
  { connector: "quickbooks", config: { realm_id: "123" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "missing-config-key" });

add("case-con-52", "missing mc key",
  "Required keys are enforced.",
  { connector: "mailchimp", config: { server_prefix: "us1" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "missing-config-key" });

add("case-con-53", "webhook with port",
  "Ports are fine.",
  { connector: "slack", config: { webhook_url: "https://hooks.slack.com:443/x" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "slack" } });

add("case-con-54", "webhook with query",
  "Query strings are fine.",
  { connector: "slack", config: { webhook_url: "https://hooks.slack.com/x?y=1" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "slack" } });

add("case-con-55", "webhook ipv6",
  "IPv6 hosts are valid hosts.",
  { connector: "slack", config: { webhook_url: "http://[::1]/x" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "slack" } });

add("case-con-56", "webhook trailing dot",
  "Trailing-dot hosts are valid hosts.",
  { connector: "slack", config: { webhook_url: "http://hooks.slack.com./x" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "slack" } });

add("case-con-57", "webhook uppercase scheme",
  "URL parsing normalizes the scheme.",
  { connector: "slack", config: { webhook_url: "HTTPS://hooks.slack.com/x" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "slack" } });

add("case-con-58", "webhook mailto",
  "mailto: is not http(s): rejected.",
  { connector: "slack", config: { webhook_url: "mailto:a@b.com" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "invalid-url" });

add("case-con-59", "webhook data",
  "data: URLs are rejected.",
  { connector: "slack", config: { webhook_url: "data:text/plain,x" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "invalid-url" });

add("case-con-60", "whitespace-only value",
  "Trimmed-empty is empty.",
  { connector: "stripe", config: { publishable_key_ref: "   " } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-config-value" });

add("case-con-61", "nested object value",
  "Objects are not string values.",
  { connector: "stripe", config: { publishable_key_ref: { k: "v" } } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-config-value" });

add("case-con-62", "emoji value",
  "Unicode values are accepted.",
  { connector: "hubspot", config: { access_token_ref: "ref-\u{1F600}" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "hubspot" } });

add("case-con-63", "uppercase script",
  "Marker scan is case-insensitive.",
  { connector: "quickbooks", config: { realm_id: "1<SCRIPT>", access_token_ref: "ref-1" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

add("case-con-64", "mixed onload",
  "Marker scan is case-insensitive.",
  { connector: "stripe", config: { publishable_key_ref: "ref OnLoad=x" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

add("case-con-65", "uppercase iframe",
  "Marker scan is case-insensitive.",
  { connector: "mailchimp", config: { api_key_ref: "ref-1", server_prefix: "<IFRAME>" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

add("case-con-66", "uppercase onerror",
  "Marker scan is case-insensitive.",
  { connector: "google-calendar", config: { client_id: "c", calendar_id: "ONERROR=x" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

add("case-con-67", "client_id at cap",
  "Boundary: exactly 1000 chars is accepted.",
  { connector: "google-calendar", config: { client_id: "c".repeat(1000), calendar_id: "primary" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "google-calendar" } });

add("case-con-68", "null value",
  "Null is not a string value.",
  { connector: "hubspot", config: { access_token_ref: null } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-config-value" });

add("case-con-69", "boolean value",
  "Booleans are not string values.",
  { connector: "hubspot", config: { access_token_ref: false } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-config-value" });

add("case-con-70", "proto key",
  "Dunder keys are inert own-properties: ignored.",
  { connector: "stripe", config: Object.assign({ publishable_key_ref: "ref-1" }, { ["__proto__"]: "x" }) },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "stripe" } });

add("case-con-71", "extra url validated",
  "Extras ending in _url are URL-validated too.",
  { connector: "google-calendar", config: { client_id: "c", calendar_id: "p", avatar_url: "ftp://x.com/a" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "invalid-url" });

add("case-con-72", "marker in extra",
  "Extras are scanned for markers.",
  { connector: "hubspot", config: { access_token_ref: "ref-1", notes: "see <?php" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

add("case-con-73", "dashed realm",
  "No format guessing on provider ids.",
  { connector: "quickbooks", config: { realm_id: "12-34-56", access_token_ref: "ref-1" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "quickbooks" } });

add("case-con-74", "newline in key",
  "Newlines are allowed in plain values.",
  { connector: "stripe", config: { publishable_key_ref: "a\nb" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "stripe" } });

add("case-con-75", "unicode prefix",
  "Unicode values are accepted.",
  { connector: "mailchimp", config: { api_key_ref: "rëf-1", server_prefix: "us1" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "mailchimp" } });

add("case-con-76", "unicode token",
  "Unicode values are accepted.",
  { connector: "hubspot", config: { access_token_ref: "tökén" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "hubspot" } });

add("case-con-77", "encoded marker url",
  "Matching is literal: percent-encoding is not decoded.",
  { connector: "slack", config: { webhook_url: "http://example.com/%3Cscript%3E" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "slack" } });

add("case-con-78", "benign bold tag",
  "Benign HTML is not on the marker list.",
  { connector: "google-calendar", config: { client_id: "c", calendar_id: "<b>primary</b>" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "google-calendar" } });

add("case-con-79", "split marker",
  "Matching is literal: '<scr ipt>' does not match.",
  { connector: "stripe", config: { publishable_key_ref: "<scr ipt>" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "stripe" } });

add("case-con-80", "url at cap",
  "Boundary: a 1000-char webhook is accepted.",
  { connector: "slack", config: { webhook_url: "https://example.com/" + "a".repeat(980) } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "slack" } });

add("case-con-81", "url over cap",
  "Cap check runs before URL parsing.",
  { connector: "slack", config: { webhook_url: "https://example.com/" + "a".repeat(981) } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "over-value-cap" });

add("case-con-82", "empty config",
  "Empty config misses required keys.",
  { connector: "mailchimp", config: {} },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "missing-config-key" });

add("case-con-83", "extras only",
  "Extras do not satisfy required keys.",
  { connector: "mailchimp", config: { nickname: "x" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "missing-config-key" });

add("case-con-84", "marker in connector",
  "Allowlist runs before value scanning.",
  { connector: "slack<script>", config: { webhook_url: "https://x.com/" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-connector" });

add("case-con-85", "nul in webhook",
  "NUL check runs before URL parsing.",
  { connector: "slack", config: { webhook_url: "https://x.com/a\0b" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-con-86", "tab in client_id",
  "Tabs are fine in non-URL values.",
  { connector: "google-calendar", config: { client_id: "a\tb", calendar_id: "p" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "google-calendar" } });

add("case-con-87", "cr in value",
  "Carriage returns are allowed in plain values.",
  { connector: "stripe", config: { publishable_key_ref: "a\rb" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "stripe" } });

add("case-con-88", "zero string",
  "'0' is a non-empty value.",
  { connector: "quickbooks", config: { realm_id: "0", access_token_ref: "ref-1" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "quickbooks" } });

add("case-con-89", "slack with note",
  "Extras plus a valid webhook: accepted.",
  { connector: "slack", config: { webhook_url: "https://hooks.slack.com/x", note: "alerts" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "slack" } });

add("case-con-90", "marker in realm",
  "Active content is held on every connector.",
  { connector: "quickbooks", config: { realm_id: "<script>", access_token_ref: "ref-1" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine", con_connector: "quickbooks" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

add("case-con-91", "webhook with fragment",
  "Fragments are fine.",
  { connector: "slack", config: { webhook_url: "https://hooks.slack.com/x#frag" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "slack" } });

add("case-con-92", "soh in value",
  "Non-NUL controls are the downstream's problem: accepted.",
  { connector: "stripe", config: { publishable_key_ref: "ab" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "stripe" } });

add("case-con-93", "webhook with auth port",
  "Ports plus userinfo: accepted.",
  { connector: "slack", config: { webhook_url: "https://user@hooks.slack.com:8443/x" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "slack" } });

add("case-con-94", "uppercase https",
  "URL parsing normalizes the scheme.",
  { connector: "slack", config: { webhook_url: "HTTPS://hooks.slack.com/x" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "slack" } });

add("case-con-95", "stripe extra ref",
  "Extras are ignored for claims.",
  { connector: "stripe", config: { publishable_key_ref: "ref-1", secret_key_ref: "ref-2" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "stripe" } });

add("case-con-96", "null connector",
  "Null fails the string rule.",
  { connector: null, config: {} },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-connector" });

add("case-con-97", "array input",
  "Arrays are not connector setups.",
  [],
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-con-98", "string config",
  "Strings are not configs.",
  { connector: "slack", config: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-config" });

add("case-con-99", "marker beats url",
  "Marker scan fires before URL validation.",
  { connector: "slack", config: { webhook_url: "<script>not-a-url" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine", con_connector: "slack" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

// ---- manifest: missions ACQ-1701..ACQ-1750 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1701 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestCon2 = manifest;

export { C, manifest, manifestCon2 };
export function getCase(id) { return C.find((c) => c.id === id); }
