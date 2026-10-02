import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const canonical = (v) => v === null || typeof v !== "object" ? JSON.stringify(v)
  : Array.isArray(v) ? "[" + v.map(canonical).join(",") + "]"
  : "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
const sha256hex = (s) => createHash("sha256").update(s, "utf8").digest("hex");

const obj = JSON.parse(readFileSync("object-snapshot.json", "utf8"));
const ev = { label: "Business record: " + obj.name, source: obj.provenance.label, basis: obj.provenance.basis, ref: obj.provenance.ref };
const surf = {
  "page-post": ["name", "summary", "services", "serviceArea", "locality", "website"],
  "profile-blurb": ["name", "summary", "services", "locality", "website", "phone", "email"],
  "story-card": ["name", "summary", "services", "locality"],
};
const out = {};
for (const [s, fields] of Object.entries(surf)) {
  const lines = [];
  if (fields.includes("name")) lines.push({ text: obj.name, grade: "SUPPORTED", fields: ["name"], evidence: ev });
  if (fields.includes("summary")) lines.push({ text: obj.summary, grade: "SUPPORTED", fields: ["summary"], evidence: ev });
  if (fields.includes("services")) {
    const names = obj.services.map((x) => x.name).sort();
    lines.push({ text: "Services: " + names.join("; ") + ".", grade: "SUPPORTED", fields: ["services.name"], evidence: ev });
    lines.push({ text: obj.name + " lists " + names.length + " service.", grade: "DERIVED", fields: ["services.name"], evidence: ev });
  }
  if (fields.includes("serviceArea")) lines.push({ text: "Serving " + obj.serviceArea + ".", grade: "SUPPORTED", fields: ["serviceArea"], evidence: ev });
  if (fields.includes("locality")) lines.push({ text: "Based in " + obj.contact.locality + ".", grade: "SUPPORTED", fields: ["contact.locality"], evidence: ev });
  if (fields.includes("website")) lines.push({ text: obj.contact.website, grade: "SUPPORTED", fields: ["contact.website"], evidence: ev });
  if (fields.includes("phone")) lines.push({ text: "Call: " + obj.contact.phone, grade: "SUPPORTED", fields: ["contact.phone"], evidence: ev });
  if (fields.includes("email")) lines.push({ text: "Email: " + obj.contact.email, grade: "SUPPORTED", fields: ["contact.email"], evidence: ev });
  out[s] = {
    draftId: "draft-" + sha256hex(canonical({ s, lines })).slice(0, 16),
    surface: s, status: "DRAFT", publishable: false, publishIntent: "none",
    projectorVersion: "soc-projector@0.1.0",
    projectionDigest: sha256hex(canonical({ s, v: "soc-projector@0.1.0", lines })),
    lines,
  };
}
writeFileSync("drafts-sample.json", JSON.stringify(out, null, 2));
console.log("wrote drafts-sample.json");
