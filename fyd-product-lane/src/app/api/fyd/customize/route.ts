/**
 * POST /api/fyd/customize: Lane D: customize-with-FYD approval API.
 *
 * Actions:
 *   { action: "parse", siteId, text }
 *       Plain English (possibly compound: "A and B") -> typed intents ->
 *       resolution -> digest-bound proposals -> review cards + preview.
 *       No owner action, no persistence. One bundle per request.
 *   { action: "approve", siteId, text, bundle }
 *       Re-derives the WHOLE bundle from the text against the CURRENT
 *       spec, re-verifies every digest, and only then journals every op
 *       in ONE overlay event (atomic: the journal accepts the event or
 *       nothing is recorded). DEMO OWNER MODE ONLY (localhost/private +
 *       env flag), conspicuously labeled, never real authentication.
 *       Every consequential action is logged with DEMO_AUTH=true.
 *   { action: "clear", siteId, intentId, layer }
 *       Removes an approved directive from the journal (demo only).
 *
 * GET ?siteId=<id>&view=inspect: current presentation-intent AND
 *   visibility-policy state, section order, digests.
 *
 * Failures are typed and honest: 400 (bad request / unsupported /
 * unresolved), 403 (no demo-owner mode, capability denied, public host),
 * 404 (site not found), 409 (stale digest: the spec moved since the
 * proposal was drafted), 422 (target missing from current evidence),
 * 502 (journal unreachable: nothing was recorded).
 */

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { isPrivateHost } from "@/fyd/owner-mode/gate";
import {
  DEMO_OWNER_ACTOR,
  evaluateCapability,
  resolveDemoRelationship,
} from "@/fyd/owner-mode/capability";
import {
  isVisibilityResolution,
  type ParsedIntent,
  type VisibilityProposal,
} from "@/fyd/customize/types";
import {
  parseCustomizationIntents,
  resolveCustomizationIntent,
} from "@/fyd/customize/intent";
import {
  proposeFromSiteIntent,
  proposeVisibilityDecision,
  type ReviewCard,
} from "@/fyd/customize/propose";
import { applySitePatch, type SitePatchBody, type SiteIntent } from "@/fyd/proceduralize/patch";
import {
  applyFieldVisibility,
  resolveFieldVisibility,
  type FieldVisibilityDecision,
  type FieldVisibilityPolicy,
} from "@/fyd/sitespec/field-visibility";
import { canonicalize } from "@/lib/ping/ask-composer";
import {
  buildDirective,
  buildVisibilityDirectiveOp,
  emitOverlayEvent,
  loadCustomizedSite,
  logDemoAuth,
  type CustomizedSite,
} from "@/fyd/customize/server";
import type { ViewerContext } from "@/fyd/sitespec/types";

/** Anonymous viewers: the demo has no authenticated identities. */
const PUBLIC_VIEWER: ViewerContext = {
  viewerId: null,
  displayName: null,
  role: "public",
};
const OWNER_VIEWER: ViewerContext = {
  viewerId: null,
  displayName: null,
  role: "owner",
};

export const dynamic = "force-dynamic";

const NOT_REAL_AUTH =
  "DEMO OWNER MODE - not real authentication. NOT PRODUCTION AUTH. " +
  "No identity was verified; this mode is for localhost/private-network " +
  "demonstration only.";

function demoDenied(req: Request) {
  const enabled = process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE === "1";
  const host = req.headers.get("host") ?? "";
  const privateNet = isPrivateHost(host);
  if (!enabled || !privateNet) {
    return NextResponse.json(
      {
        ok: false,
        code: "demo_owner_mode_required",
        error:
          "Customize-with-FYD approvals require DEV/DEMO OWNER MODE " +
          "(NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1) on a localhost or private-network host. " +
          NOT_REAL_AUTH,
        demoOwnerMode: enabled,
        hostPrivate: privateNet,
      },
      { status: 403 },
    );
  }
  const verdict = evaluateCapability(
    DEMO_OWNER_ACTOR,
    resolveDemoRelationship("", DEMO_OWNER_ACTOR),
    "owner.customize-approve",
  );
  if (!verdict.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: "capability_denied",
        error: "Capability denied: " + verdict.reason,
        demoOwnerMode: enabled,
      },
      { status: 403 },
    );
  }
  return null;
}

/** One item of a proposal bundle: presentation patch or visibility decision. */
export interface BundleItem {
  intent: ParsedIntent;
  intentDigest: string;
  resolutionNote: string;
  layer: "presentation" | "visibility";
  reviewCard: ReviewCard;
  /** Presentation layer only. */
  siteIntent?: SiteIntent;
  proposal?: SitePatchBody;
  /** Visibility layer only. */
  visibility?: {
    objectId: string;
    field: string;
    policy: FieldVisibilityPolicy;
    objectTitle: string;
  };
  visibilityProposal?: VisibilityProposal;
}

export interface ProposalBundle {
  siteId: string;
  items: BundleItem[];
  bundleDigest: string;
  specDigest: string;
  preview: {
    pageOrder: { before: string[]; after: string[] };
    visibilityFields: { field: string; before: string; after: string }[];
  };
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function fieldDisplayValue(
  graph: CustomizedSite["sourceGraph"],
  objectId: string,
  field: string,
): string {
  const o = graph.objects.find((x) => x.id === objectId);
  const v = o?.fields[field];
  if (v === undefined || v === null) return "(absent)";
  return Array.isArray(v) ? v.join(", ") : String(v);
}

/**
 * UNDERSTAND -> PROPOSE -> PREVIEW, stateless. Parses every segment of a
 * (possibly compound) request, resolves each against current evidence,
 * proposes each, and previews the combined effect. Any segment that is
 * unsupported, unresolvable, or a no-op fails the WHOLE bundle: the owner
 * reviews exactly what will be applied, never a silent partial set.
 */
async function deriveBundle(
  site: CustomizedSite,
  text: string,
): Promise<{ ok: true; bundle: ProposalBundle } | { ok: false; code: string; error: string; status: number }> {
  const multi = parseCustomizationIntents(text);
  if (!multi.ok) {
    return {
      ok: false,
      code: "unsupported",
      error: multi.unsupported.reason,
      status: 400,
    };
  }
  const items: BundleItem[] = [];
  // Compound requests preview jointly: visibility decisions accumulate over
  // the current ones, and each presentation intent resolves and proposes
  // against the EVOLVING preview spec (previous intents already applied),
  // so "make this more visual and put HVAC first" previews both effects
  // together instead of deriving each from the untouched original.
  const pendingDecisions: FieldVisibilityDecision[] = [...site.visibilityDecisions];
  let previewSpec = JSON.parse(JSON.stringify(site.spec)) as typeof site.spec;
  let previewProjected = site.projectedGraph;

  for (const { intent, intentDigest } of multi.intents) {
    const isVisibility = intent.kind === "hide_field" || intent.kind === "show_field";
    // Visibility intents resolve against the SOURCE graph: the fact must
    // exist in evidence, independent of current policy.
    const res = resolveCustomizationIntent(
      previewSpec,
      isVisibility ? site.sourceGraph : previewProjected,
      intent,
    );
    if (!res.resolved) {
      return { ok: false, code: "unresolved", error: res.reason, status: 422 };
    }
    if (isVisibilityResolution(res)) {
      if (!res.visibility.objectId || !res.visibility.field) {
        return {
          ok: false,
          code: "unresolved",
          error: "The visibility change names no object or field to act on.",
          status: 422,
        };
      }
      const current = resolveFieldVisibility(
        res.visibility.objectId,
        res.visibility.field,
        pendingDecisions,
      );
      const ownerObj = site.sourceGraph.objects.find(
        (o) => o.id === res.visibility.objectId,
      );
      const outcome = proposeVisibilityDecision(
        res.visibility.objectId,
        res.visibility.field,
        res.visibility.policy,
        ownerObj?.title ?? res.visibility.objectId,
        current.policy,
      );
      if (!outcome.ok) {
        return { ok: false, code: "no_op", error: outcome.error, status: 422 };
      }
      pendingDecisions.push({
        objectId: res.visibility.objectId,
        field: res.visibility.field,
        policy: res.visibility.policy,
        decidedBy: "owner",
        decidedAt: new Date().toISOString(),
        source: "owner_override",
        version:
          pendingDecisions
            .filter(
              (d) =>
                d.objectId === res.visibility.objectId &&
                d.field === res.visibility.field,
            )
            .reduce((m, d) => Math.max(m, d.version), 0) + 1,
      });
      items.push({
        intent,
        intentDigest,
        resolutionNote: res.resolutionNote,
        layer: "visibility",
        reviewCard: outcome.reviewCard,
        visibility: {
          objectId: res.visibility.objectId,
          field: res.visibility.field,
          policy: res.visibility.policy,
          objectTitle: ownerObj?.title ?? res.visibility.objectId,
        },
        visibilityProposal: outcome.proposal,
      });
      // Later presentation intents preview against the updated policy.
      previewProjected = applyFieldVisibility(site.sourceGraph, pendingDecisions, PUBLIC_VIEWER);
    } else {
      const outcome = proposeFromSiteIntent(previewSpec, res.siteIntent, previewProjected);
      if (!outcome.ok) {
        return { ok: false, code: "no_op", error: outcome.error, status: 422 };
      }
      // Apply immediately: the next intent in a compound request resolves
      // and proposes against this intent's effect, not the original spec.
      previewSpec = applySitePatch(previewSpec, outcome.proposal);
      items.push({
        intent,
        intentDigest,
        resolutionNote: res.resolutionNote,
        layer: "presentation",
        reviewCard: outcome.reviewCard,
        siteIntent: res.siteIntent,
        proposal: outcome.proposal,
      });
    }
  }

  // PREVIEW: previewSpec already carries the whole bundle's presentation
  // effects (applied sequentially above), before approval.
  const homeBefore = (site.spec.pages.find((p) => p.slug === "home")?.sections ?? []).map(
    (s) => s.component + (s.presentation.hidden === true ? " (hidden)" : ""),
  );
  const homeAfter = (previewSpec.pages.find((p) => p.slug === "home")?.sections ?? []).map(
    (s) => s.component + (s.presentation.hidden === true ? " (hidden)" : ""),
  );
  const visibilityFields = items
    .filter((i) => i.layer === "visibility" && i.visibility)
    .map((i) => {
      const v = i.visibility!;
      const beforeGraph = applyFieldVisibility(site.sourceGraph, site.visibilityDecisions, PUBLIC_VIEWER);
      const afterGraph = applyFieldVisibility(site.sourceGraph, pendingDecisions, PUBLIC_VIEWER);
      return {
        field: v.field,
        before: fieldDisplayValue(beforeGraph, v.objectId, v.field),
        after: fieldDisplayValue(afterGraph, v.objectId, v.field),
      };
    });

  const bundle: ProposalBundle = {
    siteId: site.siteId,
    items,
    bundleDigest: sha256Hex(
      canonicalize({
        intents: items.map((i) => ({ intent: i.intent, digest: i.intentDigest })),
        proposals: items.map((i) => i.proposal ?? i.visibilityProposal),
      }),
    ),
    specDigest: site.specDigest,
    preview: {
      pageOrder: { before: homeBefore, after: homeAfter },
      visibilityFields,
    },
  };
  return { ok: true, bundle };
}

async function handleParse(siteId: string, text: string) {
  logDemoAuth("customize.parse", siteId, text.slice(0, 120));
  let site: CustomizedSite;
  try {
    site = await loadCustomizedSite(siteId, PUBLIC_VIEWER);
  } catch (e) {
    return NextResponse.json(
      { ok: false, code: "site_not_found", error: e instanceof Error ? e.message : String(e), demo: true },
      { status: 404 },
    );
  }
  const derived = await deriveBundle(site, text);
  if (!derived.ok) {
    return NextResponse.json(
      { ok: false, code: derived.code, error: derived.error, demo: true },
      { status: derived.status },
    );
  }
  return NextResponse.json({ ok: true, ...derived.bundle, demo: true });
}

/**
 * APPROVE -> APPLY -> PERSIST. Re-derives the entire bundle from the text
 * against the CURRENT spec, re-verifies the bundle digest and every
 * proposal body, then journals every op in ONE overlay event. The journal
 * accepts the event or throws: an unrecorded approval is never reported
 * as recorded.
 */
async function handleApprove(
  req: Request,
  siteId: string,
  text: string,
  clientBundle: ProposalBundle,
) {
  const gate = demoDenied(req);
  if (gate) return gate;
  logDemoAuth("customize.approve", siteId, text.slice(0, 120));

  let site: CustomizedSite;
  try {
    site = await loadCustomizedSite(siteId, PUBLIC_VIEWER);
  } catch (e) {
    return NextResponse.json(
      { ok: false, code: "site_not_found", error: e instanceof Error ? e.message : String(e), demo: true },
      { status: 404 },
    );
  }
  const derived = await deriveBundle(site, text);
  if (!derived.ok) {
    return NextResponse.json(
      { ok: false, code: derived.code, error: derived.error, demo: true },
      { status: derived.status },
    );
  }
  const fresh = derived.bundle;
  if (!clientBundle || clientBundle.bundleDigest !== fresh.bundleDigest) {
    return NextResponse.json(
      {
        ok: false,
        code: "stale_digest",
        error:
          "The bundle the owner approved does not match a bundle freshly " +
          "derived from the current spec. The spec moved (or the bundle was " +
          "altered) since drafting: re-run parse and review the new bundle. " +
          "Nothing was applied.",
        expectedDigest: fresh.bundleDigest,
        receivedDigest: clientBundle?.bundleDigest,
        demo: true,
      },
      { status: 409 },
    );
  }
  // Belt and suspenders: every proposal body must equal the fresh body
  // (canonical form, so key order can never smuggle a difference through).
  const freshBodies = fresh.items.map((i) => canonicalize(i.proposal ?? i.visibilityProposal));
  const clientBodies = (clientBundle.items ?? []).map((i) =>
    canonicalize(i.proposal ?? i.visibilityProposal),
  );
  if (
    freshBodies.length !== clientBodies.length ||
    freshBodies.some((b, n) => b !== clientBodies[n])
  ) {
    return NextResponse.json(
      {
        ok: false,
        code: "proposal_altered",
        error: "A proposal body differs from the freshly derived bundle. Nothing was applied.",
        demo: true,
      },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const ops = fresh.items.map((item) => {
    if (item.layer === "presentation") {
      return buildDirective(siteId, item.siteIntent!, item.proposal!, now);
    }
    const v = item.visibility!;
    return buildVisibilityDirectiveOp(
      siteId,
      v.objectId,
      v.field,
      v.policy,
      item.visibilityProposal!.proposalDigest,
      now,
      site.visibilityDecisions,
    );
  });
  let eventId: string;
  try {
    eventId = await emitOverlayEvent(siteId, ops);
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        code: "journal_unavailable",
        error: "The approval was NOT recorded: " + (e instanceof Error ? e.message : String(e)),
        demo: true,
      },
      { status: 502 },
    );
  }
  return NextResponse.json({
    ok: true,
    siteId,
    eventId,
    opCount: ops.length,
    bundleDigest: fresh.bundleDigest,
    specDigest: fresh.specDigest,
    note:
      "Bundle journaled as overlay event (" + ops.length + " op" +
      (ops.length === 1 ? "" : "s") + "). Re-run the projection dump: the " +
      "regenerated page must show the approved changes from the preview. " +
      "The bundle was drafted against spec digest " +
      fresh.specDigest.slice(0, 16) + ".... " + NOT_REAL_AUTH,
    demo: true,
    demoOwnerMode: true,
  });
}

async function handleClear(
  req: Request,
  siteId: string,
  intentId: string,
  layer: string,
) {
  const gate = demoDenied(req);
  if (gate) return gate;
  logDemoAuth("customize.clear", siteId, intentId);
  let eventId: string;
  try {
    if (layer === "visibility") {
      const [objectId, field] = intentId.split("|");
      eventId = await emitOverlayEvent(siteId, [
        { op: "clear_field_visibility", objectId: objectId ?? "", field: field ?? "" },
      ]);
    } else {
      eventId = await emitOverlayEvent(siteId, [
        { op: "clear_presentation_intent", intentId },
      ]);
    }
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        code: "journal_unavailable",
        error: "The clear was NOT recorded: " + (e instanceof Error ? e.message : String(e)),
        demo: true,
      },
      { status: 502 },
    );
  }
  return NextResponse.json({
    ok: true,
    siteId,
    intentId,
    eventId,
    note: "Directive removal journaled. Re-run the projection dump to render. " + NOT_REAL_AUTH,
    demo: true,
    demoOwnerMode: true,
  });
}

export async function POST(req: Request) {
  let body: {
    action?: string;
    siteId?: string;
    text?: string;
    bundle?: ProposalBundle;
    intentId?: string;
    layer?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Body must be JSON.", demo: true }, { status: 400 });
  }
  const action = body.action ?? "";
  const siteId = (body.siteId ?? "").trim();
  if (!siteId) {
    return NextResponse.json({ ok: false, error: "siteId is required.", demo: true }, { status: 400 });
  }
  if (action === "parse") {
    const text = (body.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ ok: false, error: "text is required.", demo: true }, { status: 400 });
    }
    return handleParse(siteId, text);
  }
  if (action === "approve") {
    const text = (body.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ ok: false, error: "text is required.", demo: true }, { status: 400 });
    }
    if (!body.bundle) {
      return NextResponse.json(
        {
          ok: false,
          code: "no_bundle",
          error:
            "Approve requires the exact bundle the owner reviewed (from parse). " +
            "Nothing is applied without an explicit, digest-verified approval.",
          demo: true,
        },
        { status: 400 },
      );
    }
    return handleApprove(req, siteId, text, body.bundle);
  }
  if (action === "clear") {
    const intentId = (body.intentId ?? "").trim();
    if (!intentId) {
      return NextResponse.json({ ok: false, error: "intentId is required.", demo: true }, { status: 400 });
    }
    return handleClear(req, siteId, intentId, body.layer ?? "presentation");
  }
  return NextResponse.json(
    { ok: false, error: "Unknown action. Use parse, approve, or clear.", demo: true },
    { status: 400 },
  );
}

interface InspectView {
  siteId: string;
  specDigest: string;
  baseSpecDigest: string;
  pageOrder: { pageSlug: string; sections: { id: string; component: string; hidden: boolean }[] }[];
  directives: {
    intentId: string;
    siteIntent: unknown;
    proposalDigest: string;
    approvedBy: string;
    approvedAt: string;
    eventId?: string;
  }[];
  visibility: {
    objectId: string;
    objectTitle: string;
    field: string;
    policy: FieldVisibilityPolicy;
    source: "owner_override" | "conservative_default";
    approvedAt?: string;
  }[];
  appliedIntentIds: string[];
  unresolved: { intentId: string; reason: string }[];
  demoOwnerMode: boolean;
  demoAuth: string;
  demo: true;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const siteId = (url.searchParams.get("siteId") ?? "").trim();
  const view = url.searchParams.get("view") ?? "";
  if (!siteId || view !== "inspect") {
    return NextResponse.json(
      { ok: false, error: "Usage: ?siteId=<id>&view=inspect" },
      { status: 400 },
    );
  }
  try {
    // Inspect shows the OWNER view of policy: what the owner decided and
    // what the conservative default would do. The public page renders the
    // public projection.
    const site = await loadCustomizedSite(siteId, OWNER_VIEWER);
    const ownerObj = site.sourceGraph.objects.find(
      (o) => o.id === site.spec.ownerObjectId,
    );
    const visibilityFields = ["address", "street_address", "phone", "email"];
    const body: InspectView = {
      siteId,
      specDigest: site.specDigest,
      baseSpecDigest: site.baseSpecDigest,
      pageOrder: site.spec.pages.map((p) => ({
        pageSlug: p.slug,
        sections: p.sections.map((s) => ({
          id: s.id,
          component: s.component,
          hidden: s.presentation.hidden === true,
        })),
      })),
      directives: (site.presentationIntent?.directives ?? []).map((d) => ({
        intentId: d.intentId,
        siteIntent: d.siteIntent,
        proposalDigest: d.proposal.proposalDigest,
        approvedBy: d.approval.approvedBy,
        approvedAt: d.approval.approvedAt,
        eventId: d.approval.eventId,
      })),
      visibility: visibilityFields.flatMap((field) => {
        if (!ownerObj || ownerObj.fields[field] === undefined) return [];
        const r = resolveFieldVisibility(ownerObj.id, field, site.visibilityDecisions);
        const dec = site.visibilityDecisions
          .filter((d) => d.objectId === ownerObj.id && d.field === field)
          .sort((a, b) => b.version - a.version)[0];
        return [
          {
            objectId: ownerObj.id,
            objectTitle: ownerObj.title,
            field,
            policy: r.policy,
            source: r.source,
            approvedAt: dec?.decidedAt,
          },
        ];
      }),
      appliedIntentIds: site.appliedIntentIds,
      unresolved: site.unresolved,
      demoOwnerMode: process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE === "1",
      demoAuth: "NOT PRODUCTION AUTH",
      demo: true,
    };
    return NextResponse.json({ ok: true, ...body });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        demo: true,
      },
      { status: 404 },
    );
  }
}
