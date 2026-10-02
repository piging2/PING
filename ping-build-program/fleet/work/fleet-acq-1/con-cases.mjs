#!/usr/bin/env node
// software-connectors fixture lab, batch 1: case-con-0..49 (missions ACQ-1651..ACQ-1700).
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });

add("case-con-0", "google-calendar happy",
  "Baseline accept.",
  { connector: "google-calendar", config: { client_id: "cid-123", calendar_id: "primary" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "google-calendar" } });

add("case-con-1", "quickbooks happy",
  "Baseline accept.",
  { connector: "quickbooks", config: { realm_id: "12345", access_token_ref: "ref-qb-1" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "quickbooks" } });

add("case-con-2", "stripe happy",
  "Baseline accept.",
  { connector: "stripe", config: { publishable_key_ref: "ref-stripe-1" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "stripe" } });

add("case-con-3", "mailchimp happy",
  "Baseline accept.",
  { connector: "mailchimp", config: { api_key_ref: "ref-mc-1", server_prefix: "us21" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "mailchimp" } });

add("case-con-4", "hubspot happy",
  "Baseline accept.",
  { connector: "hubspot", config: { access_token_ref: "ref-hs-1" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "hubspot" } });

add("case-con-5", "slack happy",
  "Baseline accept with an https webhook.",
  { connector: "slack", config: { webhook_url: "https://hooks.slack.com/services/AAA/BBB/CCC" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "slack" } });

add("case-con-6", "slack http webhook",
  "Plain http webhooks are acceptable.",
  { connector: "slack", config: { webhook_url: "http://hooks.slack.com/x" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "slack" } });

add("case-con-7", "unknown connector",
  "Unsupported connectors are a typed failure, not a guess.",
  { connector: "salesforce", config: { token: "x" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-connector" });

add("case-con-8", "numeric connector",
  "Connector must be a string.",
  { connector: 42, config: {} },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-connector" });

add("case-con-9", "null config",
  "Config must be an object.",
  { connector: "slack", config: null },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-config" });

add("case-con-10", "array config",
  "Arrays are not configs.",
  { connector: "slack", config: [] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-config" });

add("case-con-11", "null input",
  "Null is not a connector setup.",
  null,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-con-12", "string input",
  "Strings are not connector setups.",
  "slack",
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-con-13", "missing calendar_id",
  "Required keys are enforced.",
  { connector: "google-calendar", config: { client_id: "cid-123" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "missing-config-key" });

add("case-con-14", "missing realm_id",
  "Required keys are enforced.",
  { connector: "quickbooks", config: { access_token_ref: "ref-qb-1" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "missing-config-key" });

add("case-con-15", "missing publishable_key_ref",
  "Required keys are enforced.",
  { connector: "stripe", config: {} },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "missing-config-key" });

add("case-con-16", "missing server_prefix",
  "Required keys are enforced.",
  { connector: "mailchimp", config: { api_key_ref: "ref-mc-1" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "missing-config-key" });

add("case-con-17", "missing access_token_ref",
  "Required keys are enforced.",
  { connector: "hubspot", config: {} },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "missing-config-key" });

add("case-con-18", "missing webhook_url",
  "Required keys are enforced.",
  { connector: "slack", config: {} },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "missing-config-key" });

add("case-con-19", "extra keys ignored",
  "Unknown keys are not claims and not failures.",
  { connector: "stripe", config: { publishable_key_ref: "ref-1", nickname: "main" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "stripe" } });

add("case-con-20", "marker in client_id",
  "Active content is held.",
  { connector: "google-calendar", config: { client_id: "cid<script>", calendar_id: "primary" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

add("case-con-21", "marker in token ref",
  "Active content is held.",
  { connector: "hubspot", config: { access_token_ref: "ref <?php" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

add("case-con-22", "nul in realm_id",
  "NUL bytes are rejected.",
  { connector: "quickbooks", config: { realm_id: "12\0" + "3", access_token_ref: "ref-1" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-con-23", "value over cap",
  "1001 chars exceeds the 1000-char value cap.",
  { connector: "stripe", config: { publishable_key_ref: "k".repeat(1001) } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "over-value-cap" });

add("case-con-24", "value at cap",
  "Boundary: exactly 1000 chars is accepted.",
  { connector: "stripe", config: { publishable_key_ref: "k".repeat(1000) } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "stripe" } });

add("case-con-25", "ftp webhook",
  "Non-http(s) webhook schemes are rejected.",
  { connector: "slack", config: { webhook_url: "ftp://hooks.slack.com/x" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "invalid-url" });

add("case-con-26", "schemaless webhook",
  "Webhook schemes are not guessed.",
  { connector: "slack", config: { webhook_url: "hooks.slack.com/x" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "invalid-url" });

add("case-con-27", "marker in webhook",
  "Marker scan fires before URL parsing.",
  { connector: "slack", config: { webhook_url: "https://hooks.slack.com/<script>" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

add("case-con-28", "tab in webhook",
  "Control characters in URLs are rejected.",
  { connector: "slack", config: { webhook_url: "https://hooks.slack.com/a\tb" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char-in-url" });

add("case-con-29", "empty client_id",
  "Empty values are rejected.",
  { connector: "google-calendar", config: { client_id: "", calendar_id: "primary" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-config-value" });

add("case-con-30", "numeric realm_id",
  "Values must be strings.",
  { connector: "quickbooks", config: { realm_id: 12345, access_token_ref: "ref-1" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-config-value" });

add("case-con-31", "capitalized connector",
  "Matching is strict: 'Stripe' is unknown.",
  { connector: "Stripe", config: { publishable_key_ref: "ref-1" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-connector" });

add("case-con-32", "padded connector",
  "No trimming: ' stripe ' is unknown.",
  { connector: " stripe ", config: { webhook_url: "https://x.com/" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-connector" });

add("case-con-33", "quarantine claims",
  "Held setups still identify the connector.",
  { connector: "slack", config: { webhook_url: "https://x.com/<iframe>" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine", con_connector: "slack" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

add("case-con-34", "boolean value",
  "Booleans are not strings.",
  { connector: "stripe", config: { publishable_key_ref: true } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-config-value" });

add("case-con-35", "missing config",
  "Config is required.",
  { connector: "slack" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-config" });

add("case-con-36", "uppercase marker",
  "Marker scan is case-insensitive.",
  { connector: "mailchimp", config: { api_key_ref: "ref-1", server_prefix: "US21<SCRIPT>" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

add("case-con-37", "onerror in calendar",
  "Event-handler markers fire.",
  { connector: "google-calendar", config: { client_id: "cid-1", calendar_id: "cal onerror=x" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

add("case-con-38", "javascript webhook",
  "javascript: webhooks are rejected.",
  { connector: "slack", config: { webhook_url: "javascript:alert(1)" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "invalid-url" });

add("case-con-39", "userinfo webhook",
  "Userinfo is legal in a URL: accepted.",
  { connector: "slack", config: { webhook_url: "https://user:pass@hooks.slack.com/x" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "slack" } });

add("case-con-40", "schemeless https host",
  "WHATWG normalizes 'https:hooks.slack.com/x' to a valid URL: accepted.",
  { connector: "slack", config: { webhook_url: "https:hooks.slack.com/x" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "slack" } });

add("case-con-41", "dashed realm_id",
  "No format guessing on provider ids.",
  { connector: "quickbooks", config: { realm_id: "123-456", access_token_ref: "ref-1" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "quickbooks" } });

add("case-con-42", "unicode client_id",
  "Unicode values are accepted.",
  { connector: "google-calendar", config: { client_id: "clïent-1", calendar_id: "primary" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "google-calendar" } });

add("case-con-43", "newline in value",
  "Newlines are allowed in plain values.",
  { connector: "stripe", config: { publishable_key_ref: "ref\n1" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "stripe" } });

add("case-con-44", "marker in extra key",
  "Extras are ignored for claims but still scanned.",
  { connector: "stripe", config: { publishable_key_ref: "ref-1", note: "see <script>" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

add("case-con-45", "marker in api key",
  "Active content is held on every connector.",
  { connector: "mailchimp", config: { api_key_ref: "key <iframe>", server_prefix: "us21" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

add("case-con-46", "empty connector",
  "Empty connector names are unknown.",
  { connector: "", config: {} },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-connector" });

add("case-con-47", "empty input",
  "Missing connector fails the string rule.",
  {},
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-connector" });

add("case-con-48", "kitchen sink accept",
  "Extras plus unicode: all agree.",
  { connector: "hubspot", config: { access_token_ref: "rëf-1", nickname: "main portal" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "hubspot" } });

add("case-con-49", "kitchen sink quarantine",
  "Marker scan fires before any other value judgment.",
  { connector: "stripe", config: { publishable_key_ref: "ref <script>" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine", con_connector: "stripe" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

// ---- manifest: missions ACQ-1651..ACQ-1700 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1651 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestCon = manifest;

export { C, manifest, manifestCon };
export function getCase(id) { return C.find((c) => c.id === id); }
