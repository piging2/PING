// Smoke test for authorized-media-pipeline.ts (run with node on the .ts directly).
import {
  ingestAuthorizedMedia,
  planDerivatives,
  registerDerivative,
  buildManifest,
  servingPath,
  gateMediaUrlForPreview,
  refuseCohortAcquisition,
  isAcquirableState,
  MediaRightsRefusal,
} from "./authorized-media-pipeline.ts";

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass++; }
  else { fail++; console.log("FAIL:", label); }
}

// 1. Happy path: authorized ingest -> digest stability -> plan -> register -> manifest
const fakePng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const rec = ingestAuthorizedMedia({
  slug: "smoke",
  bytes: fakePng,
  originalFormat: "PNG",
  width: 1280,
  height: 1920,
  rightsState: "authorized-owned",
  authorization: { basis: "owner-commissioned brand art", authorizedBy: "Owner", authorizedAt: "2026-09-14" },
  synthetic: { kind: "ai-generated", generator: "test", caption: "AI-generated artwork. Not a photograph." },
  sourceNote: "smoke test",
  observedAt: "2026-09-23T00:00:00Z",
});
ok(/^[0-9a-f]{64}$/.test(rec.digest), "digest is sha256 hex");
ok(rec.id === "fyd-media-" + rec.digest.slice(0, 16), "id derives from digest");
const rec2 = ingestAuthorizedMedia({
  slug: "smoke", bytes: fakePng, originalFormat: "PNG", width: 1280, height: 1920,
  rightsState: "authorized-owned",
  authorization: { basis: "b", authorizedBy: "o", authorizedAt: "2026-09-14" },
  sourceNote: "s", observedAt: "t",
});
ok(rec2.digest === rec.digest, "digest stable across runs");

const plans = planDerivatives(rec);
ok(plans.length === 5, "plan has 5 renditions (768, 480, native-1280, blur, jpeg fallback)");
ok(plans.every((p) => p.width <= 1280), "never upscales");
ok(plans.some((p) => p.format === "jpeg"), "jpeg fallback planned");
ok(plans.every((p) => p.servedFrom.startsWith(`/fyd-media/${rec.digest}/`)), "servedFrom under digest path");

const variants = plans.slice(0, 2).map((p) => registerDerivative(rec, p, new Uint8Array([9, 9, 9])));
ok(variants[0].derivedFrom === rec.digest, "variant stamps derivedFrom");
ok(variants[0].digest !== rec.digest, "variant has own digest");
const manifest = buildManifest(rec, variants);
ok(manifest.manifestVersion === 1 && manifest.variants.length === 2, "manifest assembles");

// 2. Refusals
function expectRefusal(fn, label) {
  try { fn(); ok(false, label + " (did not throw)"); }
  catch (e) { ok(e instanceof MediaRightsRefusal, label + " throws MediaRightsRefusal"); }
}
expectRefusal(() => ingestAuthorizedMedia({
  slug: "x", bytes: fakePng, originalFormat: "PNG", width: 1, height: 1,
  rightsState: "unknown", sourceNote: "s", observedAt: "t",
}), "unknown state refused");
expectRefusal(() => ingestAuthorizedMedia({
  slug: "x", bytes: fakePng, originalFormat: "PNG", width: 1, height: 1,
  rightsState: "authorized-owned", sourceNote: "s", observedAt: "t",
}), "missing authorization refused");
expectRefusal(() => ingestAuthorizedMedia({
  slug: "x", bytes: fakePng, originalFormat: "PNG", width: 1, height: 1,
  rightsState: "public-viewable-not-authorized", sourceNote: "s", observedAt: "t",
}), "public-viewable refused");
expectRefusal(() => ingestAuthorizedMedia({
  slug: "x", bytes: fakePng, originalFormat: "PNG", width: 1, height: 1,
  rightsState: "authorized-demo",
  authorization: { basis: "b", authorizedBy: "o", authorizedAt: "t" },
  synthetic: { kind: "ai-generated", generator: "g", caption: "  " },
  sourceNote: "s", observedAt: "t",
}), "empty synthetic caption refused");
expectRefusal(() => refuseCohortAcquisition({
  businessId: "b", kind: "og:image", url: "https://x/y.jpg", pageUrl: "https://x/",
  licenseSignal: "none", rightsState: "public-viewable-not-authorized",
}), "cohort acquisition refused");
expectRefusal(() => planDerivatives({ ...rec, rightsState: "unknown", authorization: null }), "plan refuses unauthorized");
ok(!isAcquirableState("unknown") && isAcquirableState("authorized-demo"), "isAcquirableState correct");

// 3. URL gate adapter
ok(gateMediaUrlForPreview("/fyd-media/abc/file.webp").kind === "pass", "same-origin path passes");
ok(gateMediaUrlForPreview("javascript:alert('A44')").kind === "refuse", "A44 javascript: refused");
ok(gateMediaUrlForPreview("data:image/png;base64,xx").kind === "refuse", "data: refused");
ok(gateMediaUrlForPreview("https://cdn.example.com/a.webp").kind === "pass", "https passes");
ok(gateMediaUrlForPreview("//evil.com/x").kind === "refuse", "protocol-relative refused");
ok(gateMediaUrlForPreview("  ").kind === "refuse", "blank refused");
ok(gateMediaUrlForPreview(null).kind === "refuse", "non-string refused");

// 4. servingPath validation
ok(servingPath(rec.digest, "a-480w.webp") === `/fyd-media/${rec.digest}/a-480w.webp`, "servingPath shape");
try { servingPath("short", "a.webp"); ok(false, "short digest rejected"); }
catch { ok(true, "short digest rejected"); }
try { servingPath(rec.digest, "../evil"); ok(false, "traversal rejected"); }
catch { ok(true, "traversal rejected"); }

console.log(`smoke: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
