#!/usr/bin/env node
// partial-pages fixture lab, batch 1: case-prt-0..49 (missions ACQ-2051..ACQ-2100).
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });
const SEC = (name, status) => ({ name, status });
const EXT = (field, value, section) => ({ field, value, section });

add("case-prt-0", "complete page",
  "All sections complete: complete verdict, fields claimed.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("header", "complete"), SEC("body", "complete")],
    extractions: [EXT("title", "Shop", "header"), EXT("phone", "555-1", "body")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "complete", prt_title: "Shop", prt_phone: "555-1" } });

add("case-prt-1", "complete no extractions",
  "Complete verdict with zero field claims.",
  { url: "https://x.com/a", complete: true, sections: [SEC("body", "complete")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "complete", prt_page_url: "https://x.com/a" },
    absent_claims: ["prt_title"] });

add("case-prt-2", "incomplete fetch",
  "complete=false: partial verdict.",
  { url: "https://x.com/a", complete: false,
    sections: [SEC("body", "complete")],
    extractions: [EXT("title", "Shop", "body")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "partial", prt_title: "Shop" } });

add("case-prt-3", "partial section held",
  "Extraction from a partial section is held, never claimed.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("header", "complete"), SEC("body", "partial")],
    extractions: [EXT("title", "Shop", "header"), EXT("phone", "555-1", "body")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "partial", prt_title: "Shop" },
    absent_claims: ["prt_phone"] });

add("case-prt-4", "missing section extraction",
  "Extraction from a missing section is a typed failure.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("body", "missing")],
    extractions: [EXT("title", "Shop", "body")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "extraction-from-missing-section" });

add("case-prt-5", "unknown section",
  "Extractions must reference declared sections.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("body", "complete")],
    extractions: [EXT("title", "Shop", "nope")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-section" });

add("case-prt-6", "missing section quiet",
  "Missing sections without extractions: partial, no failure.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("header", "complete"), SEC("footer", "missing")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "partial" } });

add("case-prt-7", "unknown field",
  "Fields outside the allowlist are typed failures.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("body", "complete")],
    extractions: [EXT("email", "a@b.c", "body")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-field" });

add("case-prt-8", "not an object",
  "Arrays are not observations.",
  [],
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-prt-9", "bad url",
  "URLs must be absolute HTTP(S).",
  { url: "/rel", complete: true, sections: [SEC("body", "complete")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-prt-10", "bad complete",
  "complete must be a boolean.",
  { url: "https://x.com/a", complete: "yes", sections: [SEC("body", "complete")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-complete" });

add("case-prt-11", "sections not array",
  "sections must be an array.",
  { url: "https://x.com/a", complete: true, sections: "body" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-sections" });

add("case-prt-12", "sections empty",
  "At least one section is required.",
  { url: "https://x.com/a", complete: true, sections: [] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-sections" });

add("case-prt-13", "too many sections",
  "At most 20 sections.",
  { url: "https://x.com/a", complete: true,
    sections: Array.from({ length: 21 }, (_, i) => SEC("s" + i, "complete")) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-sections" });

add("case-prt-14", "twenty sections",
  "Boundary: exactly 20 sections is accepted.",
  { url: "https://x.com/a", complete: true,
    sections: Array.from({ length: 20 }, (_, i) => SEC("s" + i, "complete")) },
  { outcome: "bounded_success", claims: { prt_verdict: "complete" } });

add("case-prt-15", "duplicate section",
  "Section names must be unique.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("body", "complete"), SEC("body", "partial")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "duplicate-section" });

add("case-prt-16", "bad status",
  "Section status must be a known value.",
  { url: "https://x.com/a", complete: true, sections: [SEC("body", "half")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-section-entry" });

add("case-prt-17", "section name over cap",
  "101-char section names are rejected.",
  { url: "https://x.com/a", complete: true, sections: [SEC("n".repeat(101), "complete")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-section-entry" });

add("case-prt-18", "section name at cap",
  "Boundary: exactly 100 chars is accepted.",
  { url: "https://x.com/a", complete: true, sections: [SEC("n".repeat(100), "complete")] },
  { outcome: "bounded_success", claims: { prt_verdict: "complete" } });

add("case-prt-19", "empty value",
  "Empty extraction values are rejected.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("body", "complete")],
    extractions: [EXT("title", "", "body")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-extraction-entry" });

add("case-prt-20", "whitespace value",
  "Whitespace-only values are rejected.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("body", "complete")],
    extractions: [EXT("title", "   ", "body")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-extraction-entry" });

add("case-prt-21", "value over cap",
  "501-char values are rejected.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("body", "complete")],
    extractions: [EXT("title", "v".repeat(501), "body")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-extraction-entry" });

add("case-prt-22", "value at cap",
  "Boundary: exactly 500 chars is accepted.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("body", "complete")],
    extractions: [EXT("title", "v".repeat(500), "body")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "complete", prt_title: "v".repeat(500) } });

add("case-prt-23", "nul in value",
  "NUL bytes are rejected.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("body", "complete")],
    extractions: [EXT("title", "a\0b", "body")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-prt-24", "marker in value",
  "Active content quarantines.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("body", "complete")],
    extractions: [EXT("title", "Shop <script>", "body")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "quarantine" },
    required_quarantined: [{ property: "partial-page-input", reason: "active-content" }] });

add("case-prt-25", "marker in section name",
  "Section names are scanned.",
  { url: "https://x.com/a", complete: true, sections: [SEC("bod<script>y", "complete")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "quarantine" },
    required_quarantined: [{ property: "partial-page-input", reason: "active-content" }] });

add("case-prt-26", "uppercase marker",
  "Marker scan is case-insensitive.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("body", "complete")],
    extractions: [EXT("hours", "9-5 <IFRAME>", "body")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "quarantine" },
    required_quarantined: [{ property: "partial-page-input", reason: "active-content" }] });

add("case-prt-27", "onload marker",
  "Event-handler markers fire.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("body", "complete")],
    extractions: [EXT("address", "1 Main onerror=x", "body")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "quarantine" },
    required_quarantined: [{ property: "partial-page-input", reason: "active-content" }] });

add("case-prt-28", "benign html",
  "Benign HTML is not a marker.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("body", "complete")],
    extractions: [EXT("title", "<b>Shop</b>", "body")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "complete", prt_title: "<b>Shop</b>" } });

add("case-prt-29", "all fields",
  "Every allowlisted field extracts.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("s", "complete")],
    extractions: [EXT("title", "T", "s"), EXT("phone", "P", "s"), EXT("hours", "H", "s"),
                  EXT("address", "A", "s"), EXT("url", "https://x.com/u", "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "complete", prt_title: "T", prt_phone: "P",
              prt_hours: "H", prt_address: "A", prt_url: "https://x.com/u" } });

add("case-prt-30", "mixed sections",
  "Complete sections claim, partial sections hold.",
  { url: "https://x.com/a", complete: false,
    sections: [SEC("a", "complete"), SEC("b", "partial"), SEC("c", "missing")],
    extractions: [EXT("title", "T", "a"), EXT("phone", "P", "b")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "partial", prt_title: "T" },
    absent_claims: ["prt_phone"] });

add("case-prt-31", "unicode values",
  "Unicode values extract.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("s", "complete")],
    extractions: [EXT("title", "Café Ünï", "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "complete", prt_title: "Café Ünï" } });

add("case-prt-32", "extra fields ignored",
  "Unknown top-level and entry fields are ignored.",
  { url: "https://x.com/a", complete: true, fetched_at: "t",
    sections: [{ name: "s", status: "complete", note: 1 }],
    extractions: [{ field: "title", value: "T", section: "s", at: "t" }] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "complete", prt_title: "T" } });

add("case-prt-33", "fifty extractions",
  "Boundary: exactly 50 extractions is accepted.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("s", "complete")],
    extractions: Array.from({ length: 50 }, (_, i) => EXT("title", "T" + i, "s")) },
  { outcome: "bounded_success", claims: { prt_verdict: "complete" } });

add("case-prt-34", "fifty-one extractions",
  "At most 50 extractions.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("s", "complete")],
    extractions: Array.from({ length: 51 }, (_, i) => EXT("title", "T" + i, "s")) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-extractions" });

add("case-prt-35", "url over cap",
  "2001-char URLs are rejected.",
  { url: "https://x.com/" + "a".repeat(1990), complete: true,
    sections: [SEC("s", "complete")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-prt-36", "nul in url",
  "NUL in URLs is rejected.",
  { url: "https://x.com/a\0b", complete: true, sections: [SEC("s", "complete")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-prt-37", "null section entry",
  "Section entries must be objects.",
  { url: "https://x.com/a", complete: true, sections: [null] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-section-entry" });

add("case-prt-38", "null extraction entry",
  "Extraction entries must be objects.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("s", "complete")], extractions: [null] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-extraction-entry" });

add("case-prt-39", "section missing name",
  "Sections need names.",
  { url: "https://x.com/a", complete: true, sections: [{ status: "complete" }] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-section-entry" });

add("case-prt-40", "numeric value",
  "Extraction values must be strings.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("s", "complete")],
    extractions: [EXT("phone", 42, "s")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-extraction-entry" });

add("case-prt-41", "php marker",
  "PHP markers fire.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("s", "complete")],
    extractions: [EXT("title", "T <?php", "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "quarantine" },
    required_quarantined: [{ property: "partial-page-input", reason: "active-content" }] });

add("case-prt-42", "split marker",
  "Split markers are not markers.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("s", "complete")],
    extractions: [EXT("title", "<scr ipt>", "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "complete", prt_title: "<scr ipt>" } });

add("case-prt-43", "partial all held",
  "All extractions from partial sections are held.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("s", "partial")],
    extractions: [EXT("title", "T", "s"), EXT("phone", "P", "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "partial", prt_page_url: "https://x.com/a" },
    absent_claims: ["prt_title", "prt_phone"] });

add("case-prt-44", "extractions not array",
  "extractions must be an array when present.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("s", "complete")], extractions: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-extractions" });

add("case-prt-45", "kitchen sink complete",
  "Full complete observation.",
  { url: "https://x.com/shop", complete: true,
    sections: [SEC("header", "complete"), SEC("main", "complete"), SEC("footer", "complete")],
    extractions: [EXT("title", "Shop", "header"), EXT("phone", "555-1234", "main"),
                  EXT("hours", "9-5", "main"), EXT("address", "1 Main", "footer")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "complete", prt_title: "Shop", prt_phone: "555-1234",
              prt_hours: "9-5", prt_address: "1 Main" } });

add("case-prt-46", "kitchen sink partial",
  "Full partial observation: one held.",
  { url: "https://x.com/shop", complete: false,
    sections: [SEC("header", "complete"), SEC("main", "partial")],
    extractions: [EXT("title", "Shop", "header"), EXT("phone", "555-1234", "main")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "partial", prt_title: "Shop" },
    absent_claims: ["prt_phone"] });

add("case-prt-47", "kitchen sink quarantine",
  "Markers beat classification.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("s", "complete")],
    extractions: [EXT("title", "T", "s"), EXT("phone", "P<script>", "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "quarantine" },
    required_quarantined: [{ property: "partial-page-input", reason: "active-content" }] });

add("case-prt-48", "final typed failure",
  "Closing typed failure: bad section status type.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", 42)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-section-entry" });

add("case-prt-49", "final accept",
  "Closing accept: complete page, url field extraction.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("s", "complete")],
    extractions: [EXT("url", "https://x.com/b", "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "complete", prt_url: "https://x.com/b" } });

// ---- manifest: missions ACQ-2051..ACQ-2100 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(2051 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestPrt = manifest;

export { C, manifest, manifestPrt };
export function getCase(id) { return C.find((c) => c.id === id); }
