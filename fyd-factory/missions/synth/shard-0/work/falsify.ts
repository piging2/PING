/**
 * Falsification probes for the three SYNTH-shard-0 patches.
 * Tries to break each fix's logic with adversarial edge cases.
 * Self-contained ports of the patched logic (not the harness).
 * Exit 0 only if every probe passes.
 */
import { createHash } from "node:crypto";

let failures = 0;
function probe(name: string, cond: boolean, detail = ""): void {
  console.log((cond ? "PASS" : "FAIL") + " " + name + (detail ? " :: " + detail : ""));
  if (!cond) failures++;
}

// ---- Fix 2 logic: driftValuesEqual (from overlay-drift-normalization.patch)
function driftValuesEqual(a: string | null, b: string | null): boolean {
  const norm = (v: string | null): string | null => {
    if (v == null) return null;
    const t = v.replace(/[\u200E\u200F\u202A-\u202E]/g, "").replace(/\s+/g, " ").trim();
    return t.length > 0 ? t : null;
  };
  return norm(a) === norm(b);
}
probe("drift: bidi-only re-emission is not drift", driftValuesEqual("  ‎+1 (555) 0107‏  ", "+1 (555) 0107"));
probe("drift: internal double-space is not drift", driftValuesEqual("Mon  -  Fri  8a-6p", "Mon - Fri 8a-6p"));
probe("drift: en-dash vs hyphen IS drift", !driftValuesEqual("Mon–Fri 8a-6p", "Mon-Fri 8a-6p"));
probe("drift: different number IS drift", !driftValuesEqual("+1 (555) 0107", "+1 (555) 0307"));
probe("drift: case change IS drift (conservative)", !driftValuesEqual("Mon-Fri", "mon-fri"));
probe("drift: null vs null is not drift", driftValuesEqual(null, null));
probe("drift: null vs value IS drift", !driftValuesEqual(null, "+1 (555) 0107"));
probe("drift: empty vs null is not drift", driftValuesEqual("   ", null));
probe("drift: tab/newline collapse is not drift", driftValuesEqual("Mon-Fri\n\t8a-6p", "Mon-Fri 8a-6p"));

// ---- Fix 3 logic: resolveHideAssertions (from visibility-hide-reresolve.patch)
interface SiteFact { factId: string; objectId: string; field: string; index: number; value: string }
interface HAssertion { op: string; factRef: { objectId: string; field: string; index?: number }; sourceValueSeen: string | null }
const factIdFor = (o: string, f: string, i = 0) => "fact-" + createHash("sha256").update(o + "|" + f + "|" + i, "utf8").digest("hex").slice(0, 16);
const assertionFactId = (a: HAssertion) => factIdFor(a.factRef.objectId, a.factRef.field, a.factRef.index ?? 0);
const nfc = (v: string) => v.replace(/[\u200E\u200F\u202A-\u202E]/g, "").replace(/\s+/g, " ").trim();
function resolveHideAssertions(facts: SiteFact[], hideAssertions: HAssertion[]) {
  return hideAssertions.filter((a) => a.op === "HIDE").map((assertion) => {
    const direct = facts.find((f) => assertionFactId(assertion) === f.factId);
    if (direct) return { assertion, factId: direct.factId, via: "fact-id", reason: null };
    const seen = assertion.sourceValueSeen;
    const idx = assertion.factRef.index ?? 0;
    const m = seen == null ? [] : facts.filter((f) => f.field === assertion.factRef.field && f.index === idx && nfc(f.value) === nfc(seen));
    if (m.length === 1) return { assertion, factId: m[0].factId, via: "content", reason: null };
    return { assertion, factId: null, via: null, reason: m.length === 0 ? "orphan" : "ambiguous" };
  });
}
const A = (obj: string, field: string, seen: string | null): HAssertion => ({ op: "HIDE", factRef: { objectId: obj, field, index: 0 }, sourceValueSeen: seen });
const F = (obj: string, field: string, value: string): SiteFact => ({ factId: factIdFor(obj, field, 0), objectId: obj, field, index: 0, value });

// exact factId still wins (no behavior change on the happy path)
{
  const r = resolveHideAssertions([F("svc-1", "description", "Great roofs")], [A("svc-1", "description", "Great roofs")])[0];
  probe("hide: exact factId wins", r.via === "fact-id" && r.factId === factIdFor("svc-1", "description", 0));
}
// id churn: object re-keyed, same content -> content fallback hides the right fact
{
  const facts = [F("service-1", "description", "Great roofs"), F("service-2", "description", "Fine gutters")];
  const r = resolveHideAssertions(facts, [A("svc-1", "description", "Great roofs")])[0];
  probe("hide: churned id re-resolved by content", r.via === "content" && r.factId === factIdFor("service-1", "description", 0), JSON.stringify(r.via));
}
// ambiguous: two identical descriptions -> fail closed, flagged, not applied
{
  const facts = [F("service-1", "description", "Great roofs"), F("service-2", "description", "Great roofs")];
  const r = resolveHideAssertions(facts, [A("svc-1", "description", "Great roofs")])[0];
  probe("hide: identical values -> ambiguous, not guessed", r.via === null && r.reason === "ambiguous" && r.factId === null);
}
// orphan: object genuinely gone -> surfaced, not applied
{
  const r = resolveHideAssertions([F("service-9", "description", "Other")], [A("svc-1", "description", "Great roofs")])[0];
  probe("hide: no match -> orphan surfaced", r.via === null && r.reason === "orphan");
}
// no sourceValueSeen -> never guess
{
  const facts = [F("service-1", "description", "Great roofs")];
  const r = resolveHideAssertions(facts, [A("svc-1", "description", null)])[0];
  probe("hide: null sourceValueSeen -> orphan, never guessed", r.via === null && r.reason === "orphan");
}
// content match must not cross fields
{
  const facts = [F("service-1", "name", "Great roofs")];
  const r = resolveHideAssertions(facts, [A("svc-1", "description", "Great roofs")])[0];
  probe("hide: field mismatch -> orphan", r.via === null && r.reason === "orphan");
}

// ---- Fix 1 logic: orphan/ambiguity surfacing (from overlay-orphan-ambiguity.patch)
interface PObj { objectId: string; schema: string; visibility: string }
const isBiz = (o: PObj) => o.schema === "business" && o.visibility === "public";
function resolveTarget(objects: PObj[]): { target: PObj | null; orphanReason: string | null } {
  const c = objects.filter(isBiz);
  if (c.length === 1) return { target: c[0], orphanReason: null };
  return { target: null, orphanReason: c.length === 0 ? "no-business-object" : "ambiguous-target" };
}
probe("overlay: single candidate resolves", resolveTarget([{ objectId: "b", schema: "business", visibility: "public" }]).target?.objectId === "b");
probe("overlay: zero candidates -> orphan, not silent", resolveTarget([{ objectId: "b", schema: "business", visibility: "unlisted" }]).orphanReason === "no-business-object");
{
  const r = resolveTarget([
    { objectId: "hq", schema: "business", visibility: "public" },
    { objectId: "local", schema: "business", visibility: "public" },
  ]);
  probe("overlay: two candidates -> ambiguous, not first-wins", r.target === null && r.orphanReason === "ambiguous-target");
}
probe("overlay: non-business objects ignored", resolveTarget([{ objectId: "s", schema: "service", visibility: "public" }]).orphanReason === "no-business-object");
// transient disappearance: orphan appears, then clears when the object returns
{
  const t1 = resolveTarget([]);
  const t2 = resolveTarget([{ objectId: "b", schema: "business", visibility: "public" }]);
  probe("overlay: orphan clears on recovery (no stuck state)", t1.orphanReason === "no-business-object" && t2.target?.objectId === "b");
}


// ---- Patch v2: fail-closed findBusinessObject (GC-5)
interface PBObj { objectId: string; schema: string; visibility: string }
const isBizC = (o: PBObj) => o.schema === "business" && o.visibility === "public";
function findBusinessObjectV2(objects: PBObj[]): PBObj | null {
  const c = objects.filter(isBizC);
  return c.length === 1 ? c[0] : null;
}
probe("findbiz: exactly one resolves", findBusinessObjectV2([{ objectId: "b", schema: "business", visibility: "public" }])?.objectId === "b");
probe("findbiz: two candidates -> null (no first-wins)", findBusinessObjectV2([
  { objectId: "hq", schema: "business", visibility: "public" },
  { objectId: "local", schema: "business", visibility: "public" },
]) === null);
probe("findbiz: zero candidates -> null", findBusinessObjectV2([{ objectId: "b", schema: "business", visibility: "unlisted" }]) === null);
probe("findbiz: non-public duplicates ignored", findBusinessObjectV2([
  { objectId: "b", schema: "business", visibility: "public" },
  { objectId: "old", schema: "business", visibility: "unlisted" },
])?.objectId === "b");
// callers null-handle: route records sourceValue null, preview returns null
function routeSourceValue(objects: PBObj[]): string | null {
  const b = findBusinessObjectV2(objects);
  if (b) return "some-value";
  return null;
}
probe("findbiz: route caller degrades to null honestly", routeSourceValue([
  { objectId: "hq", schema: "business", visibility: "public" },
  { objectId: "local", schema: "business", visibility: "public" },
]) === null);

console.log(failures === 0 ? "ALL FALSIFICATION PROBES PASS" : `${failures} PROBES FAILED`);
process.exit(failures === 0 ? 0 : 1);

