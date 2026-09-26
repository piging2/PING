/**
 * FYD media bind pass: manifest -> bound manifest.
 *
 * Post-ingest step (build host; run from the repo root):
 *
 *   npx tsx src/fyd/media/run-bind.ts happy-place
 *   npx tsx src/fyd/media/run-bind.ts coppersmith-plumbing
 *
 * For each site it applies an EVIDENCE-DRIVEN binding table:
 * - classification (LOGO/HERO/SERVICE/PROJECT/PERSON/LOCATION/GENERAL)
 * - richer roles from the FydMediaRole vocabulary (project/service/team
 *   where the filename/alt/source-page evidence supports it)
 * - depicts[] -> graph object ids (business, service, location)
 * - title/alt refinements where the ingest-derived value is poor
 *
 * RIGHTS NARROWING (2026-09-26 media rights directive): the bind step may
 * only NARROW rights, never broaden. Assets identified by evidence as
 * third-party/non-owner media (manufacturer catalog/brand imagery the
 * business publishes as a dealer, placeholder graphics) are DEMOTED:
 * the media object is removed, its derivative directory deleted, and a
 * "rejected" observation appended citing the directive. The original
 * "ingested" observation stays in history; the demotion is appended, not
 * rewritten. Reference + rights context are preserved; bytes are no
 * longer served as FYD media.
 *
 * Finally it wires planner roles: scoreAsset() (pure) runs for every
 * surviving asset with the site's canonical trade, and the scorecards are
 * stored in manifest.scorecards. owner-portrait eligibility comes only
 * from real depicts-person evidence (named owners in alt text), never
 * from pixels.
 *
 * Deterministic: same manifest bytes in -> same manifest bytes out.
 * The binding tables are keyed by media id (digest prefix) AND verify the
 * expected source basename; a mismatch fails loudly instead of binding
 * the wrong asset.
 */

import { readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { scoreAsset } from "./score";
import {
  MEDIA_MODULE_VERSION,
  type FydMediaObject,
  type FydMediaRole,
  type MediaManifest,
} from "./types";

export type AssetClassification =
  | "LOGO"
  | "HERO"
  | "SERVICE"
  | "PROJECT"
  | "PERSON"
  | "LOCATION"
  | "GENERAL";

interface BindRule {
  /** Media id suffix (digest prefix) this rule binds. */
  idSuffix: string;
  /** Expected source basename; mismatch fails the run. */
  expectBasename: string;
  classification: AssetClassification;
  /** Full role set (replaces the ingest-assigned roles). */
  roles: FydMediaRole[];
  /** Graph object ids this media depicts. */
  depicts: string[];
  /** Human evidence note, recorded in the report (not the manifest). */
  evidence: string;
  title?: string;
  altText?: string;
  rightsBasisAppend?: string;
}

interface DemoteRule {
  idSuffix: string;
  expectBasename: string;
  reason: string;
}

interface SiteBinding {
  trade: string;
  businessId: string;
  rules: BindRule[];
  demotions: DemoteRule[];
}

const HPP = "website-business-6fa5ebd99d72c4cb";
const HPP_SVC = {
  repairs: HPP + "-service-3263502c8175",
  fencing: HPP + "-service-340c39513223",
  painting: HPP + "-service-7f1139c11dab",
  drywall: HPP + "-service-c63c87ed8420",
  restoration: HPP + "-service-cd28e52699a5",
};

const CS = "website-business-2f1327c09d622175";
const CS_SVC = {
  plumbing: CS + "-service-139408827c27",
  heatingCooling: CS + "-service-2dbc12c16f83",
  hvac: CS + "-service-78962f315c55",
  ventilation: CS + "-service-a2008c93fb04",
};

const DEMOTE_THIRD_PARTY =
  "Third-party manufacturer catalog/brand imagery published on the business site as dealer marketing. " +
  "Per the 2026-09-26 media rights directive (publicly reachable is not republication permission; " +
  "third-party/non-owner media: preserve reference and rights context, do not copy): FYD republication " +
  "authorization is unclear, so the reference and rights context are preserved here while the bytes " +
  "and derivatives are no longer served as FYD media.";

const BINDINGS: Record<string, SiteBinding> = {
  "happy-place": {
    trade: "carpentry",
    businessId: HPP,
    rules: [
      {
        idSuffix: "2ae2a4014e626e2d",
        expectBasename: "logo.png",
        classification: "LOGO",
        roles: ["logo"],
        depicts: [HPP],
        evidence: "alt='Happy Place Carpentry logo' on the business site header; logo-like filename rescued by business-name-in-alt rule",
      },
      {
        idSuffix: "16052e5f595077bf",
        expectBasename: "hero-background-enhanced.jpg",
        classification: "PROJECT",
        roles: ["hero", "project"],
        depicts: [HPP],
        evidence: "alt describes a completed deck project; used as the site hero background",
      },
      {
        idSuffix: "8b10a331c651857a",
        expectBasename: "2a1d4ae6e3b81282259174af113bac3c-1080-d420ae91d8e4.webp",
        classification: "PROJECT",
        roles: ["project"],
        depicts: [HPP, HPP_SVC.painting],
        evidence: "alt='HP016_ExteriorPainting_HouseRefresh_Before.jpg' (project bento grid)",
        title: "Exterior painting / house refresh (before)",
      },
      {
        idSuffix: "8071322c6849680a",
        expectBasename: "6fd33914d4c27fbf71871bbc6405ff1c-1080-77bad689a781.webp",
        classification: "PROJECT",
        roles: ["project"],
        depicts: [HPP, HPP_SVC.repairs],
        evidence: "alt='HP011_SubfloorReplacement_After.jpg' (project bento grid)",
        title: "Subfloor replacement (after)",
      },
      {
        idSuffix: "0814931246c2c278",
        expectBasename: "8151ae20b8c6b889b35dbd5571fa4d84-1080-93a3c6b3011d.webp",
        classification: "PROJECT",
        roles: ["project"],
        depicts: [HPP, HPP_SVC.repairs],
        evidence: "alt='HP007_SidingRotRepair_After.jpeg' (project bento grid)",
        title: "Siding rot repair (after)",
      },
      {
        idSuffix: "65195680aa8dd73a",
        expectBasename: "f3272a08fa5696f588d0780b26d34381-1080-65195680aa8d.webp",
        classification: "PROJECT",
        roles: ["project"],
        depicts: [HPP, HPP_SVC.drywall],
        evidence: "alt='HP001_DrywallRepair_WallDamage_After.jpg' (project bento grid)",
        title: "Drywall repair (after)",
      },
      {
        idSuffix: "c588c3642476b638",
        expectBasename: "a2e488b435a03af26f7f75df8606f517-1080-fe45a5cee603.webp",
        classification: "PROJECT",
        roles: ["project"],
        depicts: [HPP, HPP_SVC.fencing],
        evidence: "alt='HP0018_FenceInstallation_Interior_WalkwayStained_After.jpg' (project bento grid)",
        title: "Fence installation, stained walkway (after)",
      },
      {
        idSuffix: "53a4ae9b18a8111b",
        expectBasename: "HOMESERVICEPROJECTPERGOLAS-1080.webp",
        classification: "PROJECT",
        roles: ["project"],
        depicts: [HPP],
        evidence: "alt='Completed pergola construction project' (services section)",
        title: "Completed pergola construction",
      },
      {
        idSuffix: "8ea630c93e213c23",
        expectBasename: "IMG_0535-480.webp",
        classification: "PROJECT",
        roles: ["project"],
        depicts: [HPP, HPP_SVC.painting],
        evidence: "alt='Exterior painting work in progress' (services section)",
        title: "Exterior painting work in progress",
      },
      {
        idSuffix: "eecbf99794e531e3",
        expectBasename: "portrait-480.webp",
        classification: "PERSON",
        roles: ["team"],
        depicts: [HPP],
        evidence:
          "OWNER-PORTRAIT with real depicts-person evidence: alt='Portrait of Taylor and Lanie, the owners of Happy Place Carpentry, standing together in front of a completed carpentry project'",
        title: "Taylor and Lanie, owners of Happy Place Carpentry",
      },
    ],
    demotions: [],
  },
  "coppersmith-plumbing": {
    trade: "plumbing",
    businessId: CS,
    rules: [
      {
        idSuffix: "36e4ff5cab1bafa8",
        expectBasename: "coppersmith-logo-black-n-copper.png",
        classification: "LOGO",
        roles: ["logo"],
        depicts: [CS],
        evidence: "business-name-matching logo file on the business site",
      },
      {
        idSuffix: "381a361fbdbd5713",
        expectBasename: "coppersmith-new-logo-white.png",
        classification: "LOGO",
        roles: ["logo"],
        depicts: [CS],
        evidence: "business-name-matching logo file (white variant) on the business site",
      },
      {
        idSuffix: "db347abf5ab76b99",
        expectBasename: "hvac-heat.jpg",
        classification: "SERVICE",
        roles: ["hero", "service"],
        depicts: [CS, CS_SVC.hvac, CS_SVC.heatingCooling],
        evidence: "largest landscape image on the homepage; HVAC/heating subject matter",
        title: "HVAC heating service imagery",
      },
      {
        idSuffix: "38f755e10aae77ee",
        expectBasename: "Kitchen-sml.jpg",
        classification: "SERVICE",
        roles: ["service"],
        depicts: [CS, CS_SVC.plumbing],
        evidence: "homepage service-card background for the plumbing/kitchen section",
        title: "Kitchen plumbing service",
      },
      {
        idSuffix: "aac0516cae30ebfe",
        expectBasename: "Ventilation.jpg",
        classification: "SERVICE",
        roles: ["service"],
        depicts: [CS, CS_SVC.ventilation],
        evidence: "homepage service-card background for the ventilation section",
        title: "Ventilation service",
      },
      {
        idSuffix: "89c41c8a408448ed",
        expectBasename: "Digital-Thermostate.jpg",
        classification: "SERVICE",
        roles: ["service"],
        depicts: [CS, CS_SVC.heatingCooling],
        evidence: "homepage service-card background; thermostat subject matter",
        title: "Digital thermostat / heating & cooling",
      },
      {
        idSuffix: "23dfb99470347f65",
        expectBasename: "Air-Conditioners.jpg",
        classification: "SERVICE",
        roles: ["service"],
        depicts: [CS, CS_SVC.hvac],
        evidence: "homepage service-card background for the cooling section",
        title: "Air conditioning service",
      },
      {
        idSuffix: "16cdf138eef40f2d",
        expectBasename: "Coppersmith-Team-Bob-Kleeman.jpg",
        classification: "PERSON",
        roles: ["team"],
        depicts: [CS],
        evidence: "about-us team portrait; filename names Bob Kleeman (real depicts-person evidence)",
        title: "Bob Kleeman — Coppersmith team",
      },
      {
        idSuffix: "2a65428b5cb7b6a7",
        expectBasename: "Coppersmith-Team-Joey-Turner.jpg",
        classification: "PERSON",
        roles: ["team"],
        depicts: [CS],
        evidence: "about-us team portrait; filename names Joey Turner (real depicts-person evidence)",
        title: "Joey Turner — Coppersmith team",
      },
      {
        idSuffix: "59768395fa3b4ce9",
        expectBasename: "IMG_0102.jpg",
        classification: "PROJECT",
        roles: ["project"],
        depicts: [CS],
        evidence: "gallery lightbox photo (job-site/work photography)",
        title: "Job-site photo (gallery)",
      },
      {
        idSuffix: "41fc530aaeffe988",
        expectBasename: "IMG_0278.jpg",
        classification: "PROJECT",
        roles: ["project"],
        depicts: [CS],
        evidence: "gallery lightbox photo (job-site/work photography)",
        title: "Job-site photo (gallery)",
      },
      {
        idSuffix: "a77c0be3e8bec9d4",
        expectBasename: "IMG_7030.jpg",
        classification: "PROJECT",
        roles: ["project"],
        depicts: [CS],
        evidence: "gallery lightbox photo (job-site/work photography)",
        title: "Job-site photo (gallery)",
      },
      {
        idSuffix: "6569239fa39eeffd",
        expectBasename: "IMG_4426.jpg",
        classification: "PROJECT",
        roles: ["project"],
        depicts: [CS],
        evidence: "gallery lightbox photo (job-site/work photography)",
        title: "Job-site photo (gallery)",
      },
    ],
    demotions: [
      { idSuffix: "b3beba4b81105a97", expectBasename: "RInnai_edited.webp", reason: DEMOTE_THIRD_PARTY },
      { idSuffix: "b49b3a3300637f10", expectBasename: "Rheem_edited.webp", reason: DEMOTE_THIRD_PARTY },
      { idSuffix: "e5b72e531e63a027", expectBasename: "Burnham_edited.webp", reason: DEMOTE_THIRD_PARTY },
      { idSuffix: "2d8d7c11188b3b9e", expectBasename: "Breezair_edited.webp", reason: DEMOTE_THIRD_PARTY },
      { idSuffix: "9791fe1664630072", expectBasename: "AOSmith_edited.webp", reason: DEMOTE_THIRD_PARTY },
      { idSuffix: "6d27edae022c3868", expectBasename: "Kohler-Tournant.jpg", reason: DEMOTE_THIRD_PARTY },
      { idSuffix: "3bf9466d3e1be98c", expectBasename: "Trinsic-9159TV-DST-B1.png", reason: DEMOTE_THIRD_PARTY },
      { idSuffix: "992d1fa19a675f01", expectBasename: "Trinsic-9659T-DST-B1.png", reason: DEMOTE_THIRD_PARTY },
      {
        idSuffix: "1a8352b9372452ab",
        expectBasename: "placeholder.png",
        reason:
          "Placeholder graphic (not content imagery): indiscriminate discovery pickup. " +
          "Per the 2026-09-26 directive, placeholder graphics are never acquired as FYD media; " +
          "reference preserved here, bytes not served.",
      },
    ],
  },
};

function basenameOf(url: string): string {
  try {
    const u = new URL(url);
    const inner = u.searchParams.get("url");
    const path = inner ? new URL(inner, u.origin).pathname : u.pathname;
    return decodeURIComponent(path.split("/").pop() ?? "");
  } catch {
    return url.split("/").pop() ?? url;
  }
}

async function main() {
  const siteId = process.argv[2];
  const binding = siteId ? BINDINGS[siteId] : undefined;
  if (!binding) {
    console.error("usage: tsx src/fyd/media/run-bind.ts <siteId>");
    console.error("known: " + Object.keys(BINDINGS).join(", "));
    process.exit(2);
  }
  const manifestPath = join(process.cwd(), "src", "fyd", "media", "manifests", siteId + ".json");
  const publicSiteDir = join(process.cwd(), "public", "fyd-media", siteId);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as MediaManifest;
  if (manifest.pipelineVersion !== MEDIA_MODULE_VERSION || manifest.preview === true) {
    throw new Error("Refusing to bind a non-production manifest: " + manifestPath);
  }
  const byId = new Map(manifest.media.map((m) => [m.id, m]));
  const now = new Date().toISOString();
  const bound: string[] = [];
  const demoted: string[] = [];

  for (const rule of binding.rules) {
    const asset = [...byId.values()].find((m) => m.id.endsWith(rule.idSuffix));
    if (!asset) throw new Error("Bind rule matched no asset: " + rule.idSuffix);
    const base = basenameOf(asset.provenance.sourceUrl);
    if (base !== rule.expectBasename) {
      throw new Error(
        "Bind rule basename mismatch for " + asset.id + ": expected " + rule.expectBasename + ", got " + base,
      );
    }
    asset.roles = rule.roles.slice();
    asset.depicts = rule.depicts.slice();
    if (rule.title) asset.title = rule.title;
    if (rule.altText) {
      asset.altText = rule.altText;
      asset.altTextSource = "generated";
    }
    if (rule.rightsBasisAppend) asset.rightsBasis += " " + rule.rightsBasisAppend;
    // Classification is lane metadata: recorded on the object for the
    // report/planner without touching the pipeline's role vocabulary.
    (asset as FydMediaObject & { classification?: AssetClassification }).classification = rule.classification;
    bound.push(asset.id + " -> " + rule.classification + " [" + rule.roles.join(",") + "] depicts " + rule.depicts.length);
  }

  for (const d of binding.demotions) {
    const asset = [...byId.values()].find((m) => m.id.endsWith(d.idSuffix));
    if (!asset) throw new Error("Demote rule matched no asset: " + d.idSuffix);
    const base = basenameOf(asset.provenance.sourceUrl);
    if (base !== d.expectBasename) {
      throw new Error(
        "Demote rule basename mismatch for " + asset.id + ": expected " + d.expectBasename + ", got " + base,
      );
    }
    manifest.media = manifest.media.filter((m) => m.id !== asset.id);
    byId.delete(asset.id);
    await rm(join(publicSiteDir, asset.digest), { recursive: true, force: true });
    manifest.observations.push({
      sourceUrl: asset.provenance.sourceUrl,
      sourcePage: asset.provenance.sourcePage,
      observedAt: now,
      outcome: "rejected",
      reason: "Rights demotion on 2026-09-26 review: " + d.reason,
      digest: asset.digest,
    });
    demoted.push(asset.id + " (" + base + ")");
  }

  // Planner role wiring: pure scorecards for every surviving asset.
  const survivors = manifest.media;
  manifest.scorecards = survivors.map((asset) =>
    scoreAsset(asset, binding.trade, survivors.filter((s) => s.id !== asset.id), null),
  );

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    JSON.stringify({ siteId, bound: bound.length, demoted: demoted.length, surviving: survivors.length, scorecards: manifest.scorecards.length }),
  );
  for (const b of bound) console.log(" bound:", b);
  for (const d of demoted) console.log(" demoted:", d);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
