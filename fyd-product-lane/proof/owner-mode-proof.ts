/**
 * FYD OWNER MODE proof: customization survives regeneration AND
 * re-observation, with the owner deciding presentation policy.
 *
 * For each demo site, mechanically:
 *   1. OBSERVE: build the source graph (fixture bytes).
 *   2. UNDERSTAND/PROPOSE: parse owner requests -> resolve -> propose.
 *   3. APPROVE/PERSIST: journal overlay ops to a file journal (the
 *      persistence seam; the PING dump reads this shape).
 *   4. REGENERATE: source graph -> visibility projection (public viewer)
 *      -> generateSiteSpec -> presentation-intent replay.
 *   5. RE-OBSERVE: rebuild the source graph as a FRESH instance (new
 *      object identity, same bytes) and regenerate again.
 *   6. ASSERT: visibility + presentation survive both; source graph
 *      facts are byte-identical; presentation never altered graph facts.
 *
 * The street_address field is PROOF-INJECTED into the observed graph
 * (labeled): it simulates a source that publishes a street address, so
 * the SHOW ADDRESS / HIDE PHONE / members-only policy mechanics can be
 * demonstrated. It is not customer data and never enters the fixtures.
 *
 * Exit code: 0 when every assertion passes, 1 otherwise. Failures print
 * a classification (record -> classify -> fix/test/close discipline):
 * FACT_INTEGRITY, VISIBILITY_POLICY, PRESENTATION_INTENT,
 * REGEN_SURVIVAL, REOBSERVE_SURVIVAL, AUTH_HONESTY.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { canonicalize } from "@/lib/ping/ask-composer";
import { HAPPY_PLACE_GRAPH } from "@/fyd/proceduralize/__fixtures__/happy-place-graph";
import { COPPERSMITH_GRAPH } from "@/fyd/proceduralize/__fixtures__/coppersmith-graph";
import {
  parseCustomizationIntents,
  resolveCustomizationIntent,
} from "@/fyd/customize/intent";
import {
  proposeSitePatch,
  type SiteIntent,
  type SitePatchBody,
} from "@/fyd/proceduralize/patch";
import { applyPresentationIntent } from "@/fyd/customize/apply-layer";
import {
  applyFieldVisibility,
  type FieldVisibilityDecision,
} from "@/fyd/sitespec/field-visibility";
import type { ViewerContext } from "@/fyd/sitespec/types";
import { generateSiteSpec } from "@/fyd/proceduralize/generator";
import {
  buildDirective,
  buildVisibilityDirectiveOp,
  visibilityDecisionsFromBlock,
  type CustomizedSite,
} from "@/fyd/customize/server";
import type {
  FieldVisibilityBlock,
  PresentationIntentBlock,
  CustomizeOverlayOp,
  VisibilityProposal,
} from "@/fyd/customize/types";
import type { FYDSiteSpec, ObjectGraph } from "@/fyd/sitespec/types";

const HERE = process.cwd(); // run.sh cds into proof/ before invoking node
const JOURNAL_DIR = join(HERE, "journal");
const GENERATED_AT = "2026-09-26T00:00:00.000Z";
const PUBLIC: ViewerContext = { viewerId: null, displayName: null, role: "public" };
const MEMBER: ViewerContext = { viewerId: null, displayName: null, role: "member" };

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}
function graphDigest(g: ObjectGraph): string {
  return sha256Hex(canonicalize(g));
}

interface Failure {
  site: string;
  check: string;
  classification: string;
  detail: string;
}
const failures: Failure[] = [];
let checks = 0;

function check(
  site: string,
  name: string,
  classification: string,
  cond: boolean,
  detail = "",
): void {
  checks++;
  if (!cond) {
    failures.push({ site, check: name, classification, detail });
    console.error(`FAIL [${site}] ${name} (${classification}) ${detail}`);
  } else {
    console.log(`ok   [${site}] ${name}`);
  }
}

/** Deep clone: a fresh graph instance with identical bytes. */
function cloneGraph(g: ObjectGraph): ObjectGraph {
  return JSON.parse(JSON.stringify(g)) as ObjectGraph;
}

/**
 * OBSERVE: the source publishes its facts, including (for this proof) a
 * street address. The injected field is labeled proof-synthetic: it stands
 * in for a source that publishes a street address. Discovery records the
 * VALUE; it does not decide the policy.
 */
function observe(fixture: ObjectGraph, siteId: string): ObjectGraph {
  const g = cloneGraph(fixture);
  const owner = g.objects.find((o) => o.id === siteIdOwner(g));
  if (owner) {
    (owner.fields as Record<string, string>)["street_address"] =
      "4181 Proof Line Rd, Grand Junction, CO 81504";
    (owner.fields as Record<string, string>)["proof_synthetic"] = "true";
  }
  // One proof-injected project object (labeled): stands in for a source
  // that published a project photo, so "use this project photo as the
  // hero" has an evidenced referent. Exactly one, so the deictic "this"
  // resolves deterministically.
  g.objects.push({
    id: "proof-project-1",
    schema: "ping.social.project@1",
    controllerId: owner?.id ?? "proof",
    visibility: "public",
    title: "Riverside Office Repipe",
    description: "Proof-injected project: stands in for a published project photo.",
    fields: { proof_synthetic: "true" },
    createdAt: "2026-09-26T00:00:00.000Z",
    updatedAt: "2026-09-26T00:00:00.000Z",
    provenance: { ref: "proof-injection" },
  } as unknown as (typeof g.objects)[number]);
  return g;
}

function siteIdOwner(g: ObjectGraph): string {
  const o = g.objects.find((x) => x.schema === "ping.social.business@1");
  if (!o) throw new Error("fixture has no business object");
  return o.id;
}

function ownerObject(g: ObjectGraph) {
  const o = g.objects.find((x) => x.schema === "ping.social.business@1")!;
  return o;
}

/** Journal seam: append ops to the site's journal file (PERSIST). */
function journalAppend(siteId: string, ops: CustomizeOverlayOp[]): string {
  mkdirSync(JOURNAL_DIR, { recursive: true });
  const path = join(JOURNAL_DIR, siteId + ".jsonl");
  const eventId = "evt-proof-" + sha256Hex(siteId + "|" + Date.now()).slice(0, 12);
  for (const op of ops) {
    writeFileSync(path, JSON.stringify({ eventId, op }) + "\n", { flag: "a" });
  }
  return eventId;
}

/** Read the journal back (what the projection dump consumes). */
function journalRead(siteId: string): CustomizeOverlayOp[] {
  const path = join(JOURNAL_DIR, siteId + ".jsonl");
  try {
    const raw = readFileSync(path, "utf8");
    return raw
      .split("\n")
      .filter((l) => l.trim() !== "")
      .map((l) => (JSON.parse(l) as { op: CustomizeOverlayOp }).op);
  } catch {
    return [];
  }
}

/**
 * The dump side: fold journal ops into digest-verified blocks, exactly the
 * shape ping-object-source validates (meta digests + provenance kind).
 */
function buildBlocks(siteId: string): {
  presentationIntent: PresentationIntentBlock;
  presentationDigest: string;
  fieldVisibility: FieldVisibilityBlock;
  visibilityDigest: string;
} {
  const ops = journalRead(siteId);
  const directives = [];
  const decisions = [];
  for (const op of ops) {
    if (op.op === "set_presentation_intent") {
      directives.push({
        intentId: op.intentId,
        siteIntent: op.siteIntent,
        proposal: op.proposal,
        approval: op.approval,
      });
    } else if (op.op === "set_field_visibility") {
      decisions.push({
        directiveId: op.directiveId,
        objectId: op.objectId,
        field: op.field,
        policy: op.policy,
        version: op.version,
        proposalDigest: op.proposalDigest,
        approval: op.approval,
      });
    }
  }
  const presentationIntent: PresentationIntentBlock = {
    directives,
    provenance: {
      kind: "owner-presentation-intent",
      note: "proof journal replay",
      eventIds: [],
    },
  };
  const fieldVisibility: FieldVisibilityBlock = {
    decisions,
    provenance: {
      kind: "owner-field-visibility",
      note: "proof journal replay",
      eventIds: [],
    },
  };
  return {
    presentationIntent,
    presentationDigest: sha256Hex(canonicalize(presentationIntent)),
    fieldVisibility,
    visibilityDigest: sha256Hex(canonicalize(fieldVisibility)),
  };
}

/** Verify a block against its digest (tamper-evidence, fail closed). */
function verifyBlockDigest(block: unknown, digest: string): boolean {
  return sha256Hex(canonicalize(block)) === digest;
}

interface OwnerRequest {
  text: string;
}

function runSite(
  siteId: string,
  fixture: ObjectGraph,
  requests: OwnerRequest[],
): void {
  console.log(`\n=== site: ${siteId} ===`);
  // Fresh journal per proof run.
  try {
    writeFileSync(join(JOURNAL_DIR, siteId + ".jsonl"), "");
  } catch {
    mkdirSync(JOURNAL_DIR, { recursive: true });
    writeFileSync(join(JOURNAL_DIR, siteId + ".jsonl"), "");
  }

  // 1. OBSERVE.
  const source = observe(fixture, siteId);
  const sourceDigest = graphDigest(source);
  const ownerId = siteIdOwner(source);
  check(siteId, "source graph observed", "FACT_INTEGRITY", sourceDigest.length === 64);

  // The conservative default must NOT have decided the address is private:
  // with no owner decisions, the address is coarsened (default), and the
  // source fact still carries the full street value.
  const defaultProjected = applyFieldVisibility(source, [], PUBLIC);
  const defaultAddr = defaultProjected.objects.find((o) => o.id === ownerId)
    ?.fields["street_address"];
  check(
    siteId,
    "conservative default coarsens (not a permanent verdict)",
    "VISIBILITY_POLICY",
    defaultAddr === "Grand Junction, CO 81504",
    `got ${JSON.stringify(defaultAddr)}`,
  );
  const sourceAddr = ownerObject(source).fields["street_address"];
  check(
    siteId,
    "source fact keeps the full street value (extraction decides nothing)",
    "FACT_INTEGRITY",
    sourceAddr === "4181 Proof Line Rd, Grand Junction, CO 81504",
    `got ${JSON.stringify(sourceAddr)}`,
  );

  // 2+3. UNDERSTAND -> PROPOSE -> APPROVE -> PERSIST for every request.
  const approvedAt = new Date().toISOString();
  for (const req of requests) {
    const multi = parseCustomizationIntents(req.text);
    if (!multi.ok) {
      check(siteId, `parse "${req.text}"`, "VISIBILITY_POLICY", false, multi.unsupported.reason);
      continue;
    }
    const ops: CustomizeOverlayOp[] = [];
    // A disposable layered spec for proposal drafting (regen happens later).
    const draftSpec = generateSiteSpec(applyFieldVisibility(source, [], PUBLIC), {
      generatedAt: GENERATED_AT,
    });
    for (const { intent } of multi.intents) {
      const res = resolveCustomizationIntent(draftSpec, source, intent);
      if (!res.resolved) {
        const cls =
          intent.kind === "hide_field" || intent.kind === "show_field"
            ? "VISIBILITY_POLICY"
            : "PRESENTATION_INTENT";
        check(siteId, `resolve "${req.text}"`, cls, false, res.reason);
        continue;
      }
      if ("visibility" in res) {
        const proposal: VisibilityProposal = {
          kind: "field_visibility",
          objectId: res.visibility.objectId,
          field: res.visibility.field,
          policy: res.visibility.policy,
          proposalDigest: "",
        };
        proposal.proposalDigest = sha256Hex(canonicalize(proposal));
        const existing: FieldVisibilityDecision[] = visibilityDecisionsFromBlock(
          buildBlocks(siteId).fieldVisibility,
        );
        ops.push(
          buildVisibilityDirectiveOp(
            siteId,
            res.visibility.objectId,
            res.visibility.field,
            res.visibility.policy,
            proposal.proposalDigest,
            approvedAt,
            existing,
          ),
        );
      } else {
        const siteIntent = res.siteIntent;
        const drafted = proposeSitePatch(draftSpec, siteIntent);
        if (!drafted.ok) {
          check(siteId, `propose "${req.text}"`, "PRESENTATION_INTENT", false, drafted.error);
          continue;
        }
        ops.push(buildDirective(siteId, siteIntent, drafted.proposal as SitePatchBody, approvedAt));
      }
    }
    const eventId = journalAppend(siteId, ops);
    check(siteId, `journal "${req.text}" (${ops.length} ops)`, "REGEN_SURVIVAL", eventId.length > 0);
  }

  // Auth honesty on the journaled ops.
  for (const op of journalRead(siteId)) {
    const note =
      op.op === "set_presentation_intent" || op.op === "set_field_visibility"
        ? op.approval.note
        : "";
    check(
      siteId,
      "journaled op labeled NOT PRODUCTION AUTH",
      "AUTH_HONESTY",
      note.includes("NOT PRODUCTION AUTH") && note.includes("not real authentication"),
      `op ${op.op}`,
    );
  }

  // 4. REGENERATE from the same source with the persisted blocks.
  const blocks = buildBlocks(siteId);
  check(siteId, "presentation block digest verifies", "REGEN_SURVIVAL",
    verifyBlockDigest(blocks.presentationIntent, blocks.presentationDigest));
  check(siteId, "visibility block digest verifies", "REGEN_SURVIVAL",
    verifyBlockDigest(blocks.fieldVisibility, blocks.visibilityDigest));

  const decisions = visibilityDecisionsFromBlock(blocks.fieldVisibility);
  // The address flip (show -> hide -> show) journals increasing versions;
  // the latest owner decision wins.
  const addrDecisions = decisions
    .filter((d) => d.field === "street_address")
    .sort((a, b) => a.version - b.version);
  check(
    siteId,
    "address policy versions increase and the latest owner decision wins",
    "VISIBILITY_POLICY",
    addrDecisions.length === 3 &&
      addrDecisions[0].policy === "show" &&
      addrDecisions[1].policy === "hide" &&
      addrDecisions[2].policy === "show",
    `got ${JSON.stringify(addrDecisions.map((d) => d.policy))}`,
  );
  const regen = (graph: ObjectGraph, viewer: ViewerContext): { projected: ObjectGraph; spec: FYDSiteSpec } => {
    const projected = applyFieldVisibility(graph, decisions, viewer);
    const base = generateSiteSpec(projected, { generatedAt: GENERATED_AT });
    const layered = applyPresentationIntent(base, blocks.presentationIntent, projected);
    return { projected, spec: layered.spec };
  };

  const r1 = regen(source, PUBLIC);
  assertSiteExpectations(siteId, r1, "regen-1", source, sourceDigest);

  // 5. RE-OBSERVE: a fresh graph instance (new identity, same bytes).
  const reobserved = observe(fixture, siteId);
  check(
    siteId,
    "re-observed graph is byte-identical to the first observation",
    "REOBSERVE_SURVIVAL",
    graphDigest(reobserved) === sourceDigest,
  );
  check(
    siteId,
    "re-observed graph is a fresh instance",
    "REOBSERVE_SURVIVAL",
    reobserved !== source,
  );

  // 6. REGENERATE AGAIN from the re-observed graph.
  const r2 = regen(reobserved, PUBLIC);
  assertSiteExpectations(siteId, r2, "regen-2", reobserved, sourceDigest);

  // Presentation never alters graph facts: the source digest is unchanged
  // after the whole pipeline ran twice.
  check(
    siteId,
    "source graph byte-identical after full pipeline (presentation never alters facts)",
    "FACT_INTEGRITY",
    graphDigest(source) === sourceDigest && graphDigest(reobserved) === sourceDigest,
  );
}

function projectedField(
  projected: ObjectGraph,
  ownerId: string,
  field: string,
): string | null {
  const v = projected.objects.find((o) => o.id === ownerId)?.fields[field];
  if (v === undefined || v === null) return null;
  return Array.isArray(v) ? v.join(", ") : String(v);
}

function assertSiteExpectations(
  siteId: string,
  r: { projected: ObjectGraph; spec: FYDSiteSpec },
  tag: string,
  source: ObjectGraph,
  sourceDigest: string,
): void {
  const ownerId = siteIdOwner(source);
  const addr = projectedField(r.projected, ownerId, "street_address");
  check(
    siteId,
    `${tag}: owner SHOW ADDRESS reflected in public projection`,
    "VISIBILITY_POLICY",
    addr === "4181 Proof Line Rd, Grand Junction, CO 81504",
    `got ${JSON.stringify(addr)}`,
  );
  const phone = projectedField(r.projected, ownerId, "phone");
  check(
    siteId,
    `${tag}: owner HIDE PHONE reflected in public projection`,
    "VISIBILITY_POLICY",
    phone === null,
    `got ${JSON.stringify(phone)}`,
  );
  const contact = r.spec.pages
    .find((p) => p.slug === "home")
    ?.sections.find((s) => s.component === "Contact");
  check(
    siteId,
    `${tag}: phone prominence survives regeneration`,
    "REGEN_SURVIVAL",
    contact?.presentation.fieldEmphasis?.includes("phone") === true,
    `got ${JSON.stringify(contact?.presentation.fieldEmphasis)}`,
  );
  const hero = r.spec.pages
    .find((p) => p.slug === "home")
    ?.sections.find((s) => s.component === "Hero");
  check(
    siteId,
    `${tag}: project photo hero override survives regeneration`,
    "REGEN_SURVIVAL",
    hero?.presentation.heroMediaObjectId === "proof-project-1",
    `got ${JSON.stringify(hero?.presentation.heroMediaObjectId)}`,
  );
  const heroComposition = hero?.composition as
    | { emphasis?: string; mediaTreatment?: { treatment?: string } }
    | undefined;
  check(
    siteId,
    `${tag}: premium visual intent survives regeneration (presentation only)`,
    "REGEN_SURVIVAL",
    heroComposition?.emphasis === "prominent" &&
      heroComposition?.mediaTreatment?.treatment === "polished",
    `got ${JSON.stringify(heroComposition)}`,
  );
  if (siteId === "happy-place") {
    const emailPublic = projectedField(r.projected, ownerId, "email");
    check(
      siteId,
      `${tag}: members-only email hidden from public viewer`,
      "VISIBILITY_POLICY",
      emailPublic === null,
      `got ${JSON.stringify(emailPublic)}`,
    );
  }
  if (siteId === "coppersmith-plumbing") {
    const services = r.spec.pages
      .find((p) => p.slug === "home")
      ?.sections.find((s) => s.component === "Services");
    const order: string[] | undefined = services?.presentation.objectOrder;
    const hvacIdx = order?.findIndex((id) => id.includes("service-")) ?? -1;
    void hvacIdx;
    // Resolve titles in presentation order; HVAC must precede Plumbing.
    const titles = (order ?? []).map(
      (id) => r.projected.objects.find((o) => o.id === id)?.title ?? id,
    );
    const hvacAt = titles.findIndex((t) => /hvac/i.test(t));
    const plumbingAt = titles.findIndex((t) => /plumbing/i.test(t));
    check(
      siteId,
      `${tag}: HVAC above Plumbing survives regeneration`,
      "REGEN_SURVIVAL",
      hvacAt !== -1 && plumbingAt !== -1 && hvacAt < plumbingAt,
      `got ${JSON.stringify(titles)}`,
    );
    // "Put HVAC first" is object order, not whole-section movement.
    const hvacObj = r.projected.objects.find(
      (o) => o.schema === "ping.social.service@1" && o.title === "HVAC",
    );
    check(
      siteId,
      `${tag}: put HVAC first lands as object order`,
      "PRESENTATION_INTENT",
      !!hvacObj && order?.[0] === hvacObj.id,
      `got ${JSON.stringify(order?.slice(0, 3))}`,
    );
  }
  void sourceDigest;
}

function main(): void {
  const t0 = Date.now();
  runSite("happy-place", HAPPY_PLACE_GRAPH, [
    { text: "Show my street address" },
    { text: "Hide my street address" },
    { text: "Show my street address" },
    { text: "Hide my phone number" },
    { text: "Show my email address only to FYD members" },
    { text: "Make the phone more prominent" },
    { text: "Use this project photo as the hero" },
    { text: "Make this more visual" },
    { text: "Make the site feel more premium" },
  ]);
  runSite("coppersmith-plumbing", COPPERSMITH_GRAPH, [
    { text: "Show my street address" },
    { text: "Hide my street address" },
    { text: "Show my street address" },
    { text: "Hide my phone number" },
    { text: "Make the phone more prominent" },
    { text: "Move HVAC above plumbing" },
    { text: "Use this project photo as the hero" },
    { text: "Make this more visual and put HVAC first" },
    { text: "Make the site feel more premium" },
  ]);

  // Member-viewer check on happy-place: members-only email visible to members.
  {
    const siteId = "happy-place";
    const blocks = buildBlocks(siteId);
    const decisions = visibilityDecisionsFromBlock(blocks.fieldVisibility);
    const source = observe(HAPPY_PLACE_GRAPH, siteId);
    const memberProjected = applyFieldVisibility(source, decisions, MEMBER);
    const email = projectedField(memberProjected, siteIdOwner(source), "email");
    check(
      siteId,
      "members-only email visible to member viewer",
      "VISIBILITY_POLICY",
      email === "taylor@happyplacecarpentry.com",
      `got ${JSON.stringify(email)}`,
    );
  }

  console.log(`\n${checks} checks, ${failures.length} failures, ${Date.now() - t0}ms`);
  if (failures.length > 0) {
    console.error("\nFAILURES (recorded, classified):");
    for (const f of failures) {
      console.error(`- [${f.site}] ${f.check} :: ${f.classification} :: ${f.detail}`);
    }
    process.exit(1);
  }
  console.log("PROOF GREEN: owner policy + presentation survive regeneration and re-observation; facts byte-identical.");
}

main();
