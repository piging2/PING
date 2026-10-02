#!/usr/bin/env node
// software-connectors fixture lab, batch 3: case-con-100..149 (missions ACQ-1751..ACQ-1800).
// Final wave: check-ordering guarantees, connector-name strictness, and the
// remaining literal-marker boundaries.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });

add("case-con-100", "underscore connector",
  "'google_calendar' is not 'google-calendar'.",
  { connector: "google_calendar", config: { client_id: "c", calendar_id: "p" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-connector" });

add("case-con-101", "capitalized connector",
  "Matching is strict.",
  { connector: "Google-Calendar", config: { client_id: "c", calendar_id: "p" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-connector" });

add("case-con-102", "huge connector name",
  "Unknown is unknown, at any length.",
  { connector: "s".repeat(1000), config: {} },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-connector" });

add("case-con-103", "numeric realm string",
  "Numeric-looking strings are fine: no format guessing.",
  { connector: "quickbooks", config: { realm_id: "12345", access_token_ref: "ref-1" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "quickbooks" } });

add("case-con-104", "extra url valid",
  "Extras ending in _url are validated when well-formed.",
  { connector: "stripe", config: { publishable_key_ref: "ref-1", docs_url: "https://stripe.com/docs" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "stripe" } });

add("case-con-105", "extra url invalid",
  "Extras ending in _url fail URL validation.",
  { connector: "mailchimp", config: { api_key_ref: "k", server_prefix: "us1", avatar_url: "not-a-url" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "invalid-url" });

add("case-con-106", "marker in extra",
  "Extras are scanned for markers.",
  { connector: "hubspot", config: { access_token_ref: "ref-1", notes: "<iframe src=x>" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

add("case-con-107", "empty webhook",
  "Empty-value check runs before URL validation.",
  { connector: "slack", config: { webhook_url: "" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-config-value" });

add("case-con-108", "spaces webhook",
  "Trimmed-empty is empty.",
  { connector: "slack", config: { webhook_url: "   " } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-config-value" });

add("case-con-109", "tab in extra url",
  "Control characters in URLs are rejected, extras included.",
  { connector: "stripe", config: { publishable_key_ref: "ref-1", docs_url: "https://x.com/a\tb" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char-in-url" });

add("case-con-110", "marker beats url",
  "Marker scan fires before URL validation.",
  { connector: "slack", config: { webhook_url: "<script>https://x.com/" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine", con_connector: "slack" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

add("case-con-111", "missing beats marker",
  "Check order: required keys (4) precede marker scan (6).",
  { connector: "mailchimp", config: { api_key_ref: "key <script>" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "missing-config-key" });

add("case-con-112", "bad value beats marker",
  "Check order: value shapes (5) precede marker scan (6).",
  { connector: "stripe", config: { publishable_key_ref: { nested: true } } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-config-value" });

add("case-con-113", "unknown beats all",
  "Check order: allowlist (2) precedes everything value-shaped.",
  { connector: "nope", config: null },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-connector" });

add("case-con-114", "shape beats all",
  "Check order: envelope (1) precedes everything.",
  null,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-con-115", "primary calendar",
  "The 'primary' calendar alias is accepted.",
  { connector: "google-calendar", config: { client_id: "cid-1", calendar_id: "primary" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "google-calendar" } });

add("case-con-116", "calendar with slash",
  "No format guessing on calendar ids.",
  { connector: "google-calendar", config: { client_id: "cid-1", calendar_id: "a/b@c" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "google-calendar" } });

add("case-con-117", "empty realm",
  "Empty required values are rejected.",
  { connector: "quickbooks", config: { realm_id: "", access_token_ref: "ref-1" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-config-value" });

add("case-con-118", "key prefix",
  "Provider key prefixes are not validated: accepted.",
  { connector: "mailchimp", config: { api_key_ref: "key-us21", server_prefix: "us21" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "mailchimp" } });

add("case-con-119", "prefix trailing space",
  "No trimming: values are taken literally.",
  { connector: "mailchimp", config: { api_key_ref: "k", server_prefix: "us1 " } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "mailchimp" } });

add("case-con-120", "token at cap",
  "Boundary: exactly 1000 chars is accepted.",
  { connector: "hubspot", config: { access_token_ref: "t".repeat(1000) } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "hubspot" } });

add("case-con-121", "webhook fragment",
  "Fragments are fine.",
  { connector: "slack", config: { webhook_url: "https://hooks.slack.com/x#frag" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "slack" } });

add("case-con-122", "webhook with port",
  "Ports are fine.",
  { connector: "slack", config: { webhook_url: "https://hooks.slack.com:443/x" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "slack" } });

add("case-con-123", "data in client_id",
  "'data:...' has no marker: accepted. The list is literal.",
  { connector: "google-calendar", config: { client_id: "data:text/plain,x", calendar_id: "p" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "google-calendar" } });

add("case-con-124", "javascript in client_id",
  "'javascript:...' has no marker: accepted. The list is literal.",
  { connector: "google-calendar", config: { client_id: "javascript:x", calendar_id: "p" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "google-calendar" } });

add("case-con-125", "style tag",
  "'<style>' is not a marker: accepted.",
  { connector: "stripe", config: { publishable_key_ref: "<style>" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "stripe" } });

add("case-con-126", "xml decl",
  "'<?xml' is not '<?php': accepted.",
  { connector: "stripe", config: { publishable_key_ref: "<?xml?>" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "stripe" } });

add("case-con-127", "doctype",
  "Doctypes are not markers: accepted.",
  { connector: "stripe", config: { publishable_key_ref: "<!doctype html>" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "stripe" } });

add("case-con-128", "nul in extra",
  "NUL check covers extras.",
  { connector: "stripe", config: { publishable_key_ref: "ref-1", note: "a\0b" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-con-129", "over cap in extra",
  "Cap check covers extras.",
  { connector: "stripe", config: { publishable_key_ref: "ref-1", note: "n".repeat(1001) } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "over-value-cap" });

add("case-con-130", "wrong-case key",
  "Key matching is strict: 'Client_ID' does not satisfy 'client_id'.",
  { connector: "google-calendar", config: { Client_ID: "c", calendar_id: "p" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "missing-config-key" });

add("case-con-131", "wrong-case calendar key",
  "Key matching is strict.",
  { connector: "google-calendar", config: { client_id: "c", Calendar_ID: "p" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "missing-config-key" });

add("case-con-132", "zero-width connector",
  "Invisible characters do not match the allowlist.",
  { connector: "slack​", config: { webhook_url: "https://x.com/" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-connector" });

add("case-con-133", "newline connector",
  "Control characters do not match the allowlist.",
  { connector: "slack\n", config: { webhook_url: "https://x.com/" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-connector" });

add("case-con-134", "unicode calendar",
  "Unicode values are accepted.",
  { connector: "google-calendar", config: { client_id: "clïent", calendar_id: "prïmary" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "google-calendar" } });

add("case-con-135", "array value",
  "Arrays are not string values.",
  { connector: "quickbooks", config: { realm_id: ["1"], access_token_ref: "ref-1" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-config-value" });

add("case-con-136", "mailchimp full",
  "Extras plus unicode: all agree.",
  { connector: "mailchimp", config: { api_key_ref: "rëf-1", server_prefix: "us1", nickname: "newsletter" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "mailchimp" } });

add("case-con-137", "hubspot marker",
  "Active content is held.",
  { connector: "hubspot", config: { access_token_ref: "tok <script>" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine", con_connector: "hubspot" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

add("case-con-138", "empty input",
  "Missing connector fails the string rule.",
  {},
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-connector" });

add("case-con-139", "no config",
  "Config is required.",
  { connector: "slack" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-config" });

add("case-con-140", "empty config slack",
  "Empty config misses required keys.",
  { connector: "slack", config: {} },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "missing-config-key" });

add("case-con-141", "null webhook",
  "Null is not a string value.",
  { connector: "slack", config: { webhook_url: null } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-config-value" });

add("case-con-142", "numeric webhook",
  "Numbers are not string values.",
  { connector: "slack", config: { webhook_url: 42 } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-config-value" });

add("case-con-143", "false client_id",
  "Booleans are not string values.",
  { connector: "google-calendar", config: { client_id: false, calendar_id: "p" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-config-value" });

add("case-con-144", "array realm",
  "Arrays are not string values.",
  { connector: "quickbooks", config: { realm_id: [], access_token_ref: "ref-1" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-config-value" });

add("case-con-145", "value 2000 chars",
  "Far over the cap: typed failure.",
  { connector: "stripe", config: { publishable_key_ref: "k".repeat(2000) } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "over-value-cap" });

add("case-con-146", "stripe with note",
  "Extras are ignored for claims.",
  { connector: "stripe", config: { publishable_key_ref: "ref-1", note: "live key" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "stripe" } });

add("case-con-147", "quickbooks marker",
  "Active content is held on every connector.",
  { connector: "quickbooks", config: { realm_id: "1", access_token_ref: "tok onerror=x" } },
  { outcome: "bounded_success", claims: { con_verdict: "quarantine", con_connector: "quickbooks" },
    required_quarantined: [{ property: "connector-config-value", reason: "active-content" }] });

add("case-con-148", "encoded onload in url",
  "Percent-encoding is not decoded by the gate: accepted.",
  { connector: "slack", config: { webhook_url: "https://x.com/?a=onload%3Dx" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "slack" } });

add("case-con-149", "final stripe accept",
  "Clean key with an extra reference: accepted.",
  { connector: "stripe", config: { publishable_key_ref: "ref-live-1", env: "production" } },
  { outcome: "bounded_success", claims: { con_verdict: "accept", con_connector: "stripe" } });

// ---- manifest: missions ACQ-1751..ACQ-1800 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1751 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestCon3 = manifest;

export { C, manifest, manifestCon3 };
export function getCase(id) { return C.find((c) => c.id === id); }
