#!/usr/bin/env node
// partial-pages fixture lab, batch 2: case-prt-50..99 (missions ACQ-2101..ACQ-2150).
// Second wave: check-ordering, per-field matrix, held-vs-claimed edges.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });
const SEC = (name, status) => ({ name, status });
const EXT = (field, value, section) => ({ field, value, section });

add("case-prt-50", "complete beats marker",
  "Check order: envelope/sections (4) precede marker scan (6).",
  { url: "https://x.com/a", complete: true, sections: [],
    extractions: [EXT("title", "T<script>", "s")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-sections" });

add("case-prt-51", "url beats marker",
  "Check order: URL (2) precedes marker scan (6).",
  { url: "notaurl<script>", complete: true, sections: [SEC("s", "complete")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-prt-52", "complete beats section marker",
  "Check order: complete type (3) precedes marker scan (6).",
  { url: "https://x.com/a", complete: "yes", sections: [SEC("s<script>", "complete")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-complete" });

add("case-prt-53", "section entry beats marker",
  "Check order: section shape (4) precedes marker scan (6).",
  { url: "https://x.com/a", complete: true, sections: [null],
    extractions: [EXT("title", "T<script>", "s")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-section-entry" });

add("case-prt-54", "extraction shape beats marker",
  "Check order: extraction shape (5) precedes marker scan (6).",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "complete")],
    extractions: [{ field: "title", value: "T<script>", section: "nope" }] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-section" });

add("case-prt-55", "value cap beats marker",
  "Check order: value caps (5) precede marker scan (6).",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "complete")],
    extractions: [EXT("title", "v".repeat(501) + "<script>", "s")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-extraction-entry" });

add("case-prt-56", "field title",
  "Per-field matrix: title.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "complete")],
    extractions: [EXT("title", "T", "s")] },
  { outcome: "bounded_success", claims: { prt_verdict: "complete", prt_title: "T" } });

add("case-prt-57", "field phone",
  "Per-field matrix: phone.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "complete")],
    extractions: [EXT("phone", "555", "s")] },
  { outcome: "bounded_success", claims: { prt_verdict: "complete", prt_phone: "555" } });

add("case-prt-58", "field hours",
  "Per-field matrix: hours.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "complete")],
    extractions: [EXT("hours", "9-5", "s")] },
  { outcome: "bounded_success", claims: { prt_verdict: "complete", prt_hours: "9-5" } });

add("case-prt-59", "field address",
  "Per-field matrix: address.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "complete")],
    extractions: [EXT("address", "1 Main", "s")] },
  { outcome: "bounded_success", claims: { prt_verdict: "complete", prt_address: "1 Main" } });

add("case-prt-60", "field url",
  "Per-field matrix: url.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "complete")],
    extractions: [EXT("url", "https://x.com/b", "s")] },
  { outcome: "bounded_success", claims: { prt_verdict: "complete", prt_url: "https://x.com/b" } });

add("case-prt-61", "held title",
  "Held matrix: title from a partial section.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "partial")],
    extractions: [EXT("title", "T", "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "partial" }, absent_claims: ["prt_title"] });

add("case-prt-62", "held phone",
  "Held matrix: phone from a partial section.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "partial")],
    extractions: [EXT("phone", "555", "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "partial" }, absent_claims: ["prt_phone"] });

add("case-prt-63", "held hours",
  "Held matrix: hours from a partial section.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "partial")],
    extractions: [EXT("hours", "9-5", "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "partial" }, absent_claims: ["prt_hours"] });

add("case-prt-64", "held address",
  "Held matrix: address from a partial section.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "partial")],
    extractions: [EXT("address", "1 Main", "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "partial" }, absent_claims: ["prt_address"] });

add("case-prt-65", "held url",
  "Held matrix: url from a partial section.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "partial")],
    extractions: [EXT("url", "https://x.com/b", "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "partial" }, absent_claims: ["prt_url"] });

add("case-prt-66", "same field two sections",
  "Same field from two complete sections: both claimed.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("a", "complete"), SEC("b", "complete")],
    extractions: [EXT("title", "T1", "a"), EXT("title", "T2", "b")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "complete", prt_title: "T1" } });

add("case-prt-67", "same field split held",
  "Same field: complete section claims, partial holds.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("a", "complete"), SEC("b", "partial")],
    extractions: [EXT("title", "T1", "a"), EXT("title", "T2", "b")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "partial", prt_title: "T1" } });

add("case-prt-68", "section name unicode",
  "Unicode section names are fine.",
  { url: "https://x.com/a", complete: true, sections: [SEC("sëctíon", "complete")],
    extractions: [EXT("title", "T", "sëctíon")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "complete", prt_title: "T" } });

add("case-prt-69", "section name newline",
  "Newlines are control characters: rejected.",
  { url: "https://x.com/a", complete: true, sections: [SEC("a\nb", "complete")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-prt-70", "section name nul",
  "NUL in section names is rejected.",
  { url: "https://x.com/a", complete: true, sections: [SEC("a\0b", "complete")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-prt-71", "extraction missing section key",
  "Extractions need a section.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "complete")],
    extractions: [{ field: "title", value: "T" }] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-section" });

add("case-prt-72", "extraction numeric section",
  "Section references must be strings.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "complete")],
    extractions: [{ field: "title", value: "T", section: 42 }] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-section" });

add("case-prt-73", "missing section with others",
  "One missing section poisons the verdict, not the claims.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("a", "complete"), SEC("b", "missing")],
    extractions: [EXT("title", "T", "a")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "partial", prt_title: "T" } });

add("case-prt-74", "incomplete with missing",
  "complete=false plus missing section: partial.",
  { url: "https://x.com/a", complete: false,
    sections: [SEC("a", "complete"), SEC("b", "missing")],
    extractions: [EXT("title", "T", "a")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "partial", prt_title: "T" } });

add("case-prt-75", "incomplete all complete",
  "complete=false alone forces partial.",
  { url: "https://x.com/a", complete: false,
    sections: [SEC("a", "complete"), SEC("b", "complete")] },
  { outcome: "bounded_success", claims: { prt_verdict: "partial" } });

add("case-prt-76", "section status case",
  "Statuses are case-sensitive: 'Complete' is invalid.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "Complete")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-section-entry" });

add("case-prt-77", "field case",
  "Fields are case-sensitive: 'Title' is unknown.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "complete")],
    extractions: [EXT("Title", "T", "s")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-field" });

add("case-prt-78", "onload in section name",
  "Section names are scanned for handlers.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s onload=x", "complete")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "quarantine" },
    required_quarantined: [{ property: "partial-page-input", reason: "active-content" }] });

add("case-prt-79", "iframe in value",
  "Iframe markers fire.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "complete")],
    extractions: [EXT("hours", "9-5 <iframe>", "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "quarantine" },
    required_quarantined: [{ property: "partial-page-input", reason: "active-content" }] });

add("case-prt-80", "long url at cap",
  "Boundary: 2000-char page URL accepted.",
  { url: "https://x.com/" + "a".repeat(1986), complete: true,
    sections: [SEC("s", "complete")] },
  { outcome: "bounded_success", claims: { prt_verdict: "complete" } });

add("case-prt-81", "extraction value json",
  "JSON-looking values are literal strings.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "complete")],
    extractions: [EXT("title", '{"t":"x"}', "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "complete", prt_title: '{"t":"x"}' } });

add("case-prt-82", "value with quotes",
  "Quotes are literal content.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "complete")],
    extractions: [EXT("address", '1 "Main" St', "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "complete", prt_address: '1 "Main" St' } });

add("case-prt-83", "kitchen sink held mix",
  "Three sections: claim, hold, and quiet missing.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("a", "complete"), SEC("b", "partial"), SEC("c", "missing")],
    extractions: [EXT("title", "T", "a"), EXT("phone", "P", "b"),
                  EXT("hours", "H", "a"), EXT("address", "A", "b")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "partial", prt_title: "T", prt_hours: "H" },
    absent_claims: ["prt_phone", "prt_address"] });

add("case-prt-84", "kitchen sink complete",
  "Full complete observation with extras ignored.",
  { url: "https://x.com/a", complete: true, at: "t",
    sections: [SEC("a", "complete"), SEC("b", "complete")],
    extractions: [EXT("title", "T", "a"), EXT("phone", "P", "b"),
                  EXT("url", "https://x.com/u", "a")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "complete", prt_title: "T", prt_phone: "P",
              prt_url: "https://x.com/u" } });

add("case-prt-85", "kitchen sink quarantine",
  "Marker in second extraction quarantines the page.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("a", "complete"), SEC("b", "complete")],
    extractions: [EXT("title", "T", "a"), EXT("phone", "P", "b"),
                  EXT("hours", "H<script>", "a")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "quarantine" },
    required_quarantined: [{ property: "partial-page-input", reason: "active-content" }] });

add("case-prt-86", "zero-width value",
  "Invisible characters are literal content.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "complete")],
    extractions: [EXT("title", "Shop​", "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "complete", prt_title: "Shop​" } });

add("case-prt-87", "emoji held",
  "Emoji values hold like any other.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "partial")],
    extractions: [EXT("title", "Shop \u{1F600}", "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "partial" }, absent_claims: ["prt_title"] });

add("case-prt-88", "sections 21st",
  "21 sections are rejected.",
  { url: "https://x.com/a", complete: true,
    sections: Array.from({ length: 21 }, (_, i) => SEC("s" + i, "complete")) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-sections" });

add("case-prt-89", "extraction array",
  "Extraction entries must be objects.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "complete")],
    extractions: [["title", "T", "s"]] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-extraction-entry" });

add("case-prt-90", "section array",
  "Section entries must be objects.",
  { url: "https://x.com/a", complete: true, sections: [["s", "complete"]] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-section-entry" });

add("case-prt-91", "missing complete key",
  "complete is required.",
  { url: "https://x.com/a", sections: [SEC("s", "complete")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-complete" });

add("case-prt-92", "missing url key",
  "url is required.",
  { complete: true, sections: [SEC("s", "complete")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-prt-93", "numeric url",
  "URLs must be strings.",
  { url: 42, complete: true, sections: [SEC("s", "complete")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-prt-94", "final accept",
  "Closing accept: partial page, one claimed field.",
  { url: "https://x.com/a", complete: false,
    sections: [SEC("s", "complete")],
    extractions: [EXT("title", "Done", "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "partial", prt_title: "Done" } });

add("case-prt-95", "final held",
  "Closing held: partial section extraction unclaimed.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("s", "partial")],
    extractions: [EXT("phone", "555", "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "partial" }, absent_claims: ["prt_phone"] });

add("case-prt-96", "final quarantine",
  "Closing quarantine: marker in section name.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s<?php", "complete")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "quarantine" },
    required_quarantined: [{ property: "partial-page-input", reason: "active-content" }] });

add("case-prt-97", "final typed failure",
  "Closing typed failure: extraction from missing section.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("s", "missing")],
    extractions: [EXT("title", "T", "s")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "extraction-from-missing-section" });

add("case-prt-98", "final unknown field",
  "Closing typed failure: unknown field.",
  { url: "https://x.com/a", complete: true, sections: [SEC("s", "complete")],
    extractions: [EXT("fax", "1", "s")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-field" });

add("case-prt-99", "final complete",
  "Closing accept: complete page.",
  { url: "https://x.com/a", complete: true,
    sections: [SEC("s", "complete")],
    extractions: [EXT("title", "Fin", "s")] },
  { outcome: "bounded_success",
    claims: { prt_verdict: "complete", prt_title: "Fin" } });

// ---- manifest: missions ACQ-2101..ACQ-2150 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(2101 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestPrt2 = manifest;

export { C, manifest, manifestPrt2 };
export function getCase(id) { return C.find((c) => c.id === id); }
