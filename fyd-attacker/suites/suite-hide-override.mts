// SUITE 3 — hide/override (hostile).
// Attacks the owner-override model:
//   OBSERVED VALUE + VISIBILITY POLICY/DEFAULT + OWNER OVERRIDE -> PROJECTED VALUE.
// Invariants:
//   - HIDE = DO NOT PROJECT HERE (zero disclosure, incl. traversal), NOT "fact never existed"
//   - the observation SURVIVES hiding (source graph never mutated)
//   - owner override outranks conservative defaults
//   - address-shaped values fail closed even when the field name hides them
// Source under test: vendored lane-p01/tree field-visibility.ts (newest local;
// STALE RISK: re-run vs Pig HEAD on restore).
import { check, report } from "./harness.mts";
import {
  resolveFieldVisibility,
  coarsenAddress,
  applyFieldVisibility,
  applyHideTraversal,
  isAddressFamilyField,
  valueLooksLikeAddress,
} from "../vendor/src/fyd/sitespec/field-visibility.ts";

const STREET = "123 Main St, Grand Junction, CO 81501";

function graph() {
  return {
    objects: [
      {
        id: "biz-1", schema: "ping.social.business@1", title: "Acme Plumbing",
        description: "", fields: { address: STREET, phone: "555-0100" },
        provenance: { kind: "website-ingestion", ref: "website-ingestion:https://acme.example/" },
      },
      {
        id: "loc-1", schema: "ping.social.location@1", title: "Acme HQ",
        description: "", fields: { address: STREET, city: "Grand Junction" },
        provenance: { kind: "website-ingestion", ref: "website-ingestion:https://acme.example/" },
      },
    ],
    relationships: [
      { id: "r1", subject: "biz-1", object: "loc-1", predicate: "located_at", status: "active" },
    ],
  };
}
const hideAddr = (id: string, field = "address", version = 1) => ({
  objectId: id, field, policy: "hide", decidedBy: "owner",
  decidedAt: "2026-09-27T00:00:00Z", source: "owner_override", version,
});

// H1: HIDE drops the field from the projection AND the source graph is untouched.
{
  const g = graph();
  const projected = (applyHideTraversal as any)(
    (applyFieldVisibility as any)(g, [hideAddr("biz-1") as any]),
    [hideAddr("biz-1") as any],
  );
  const bizProj = projected.objects.find((o: any) => o.id === "biz-1");
  const bizSrc = g.objects.find((o: any) => o.id === "biz-1");
  check(
    "H1-hide-zero-disclosure",
    !("address" in (bizProj.fields as any)) && JSON.stringify(projected).indexOf(STREET.split(",")[0]) === -1,
    `projected biz fields=${JSON.stringify(Object.keys(bizProj.fields))}; street segment absent from projection`,
  );
  check(
    "H1-observation-survives",
    (bizSrc.fields as any).address === STREET,
    `source graph still holds verbatim value after HIDE (no mutation)`,
  );
}

// H2: HIDE on the business address must not leak via located_at -> Location.address.
{
  const g = graph();
  const projected = (applyHideTraversal as any)(
    (applyFieldVisibility as any)(g, [hideAddr("biz-1") as any]),
    [hideAddr("biz-1") as any],
  );
  const loc = projected.objects.find((o: any) => o.id === "loc-1");
  const rels = projected.relationships.filter((r: any) => r.predicate === "located_at");
  check(
    "H2-no-traversal-leak",
    loc === undefined && rels.length === 0,
    `location object ${loc === undefined ? "dropped" : "PRESENT (LEAK)"}; located_at rels remaining=${rels.length}`,
  );
}

// H3: address-shaped value in a non-address field still defaults to coarse (Q-P0-01).
{
  const { policy, source } = (resolveFieldVisibility as any)("biz-1", "location", [], "123 Main St") as any;
  const projected = (coarsenAddress as any)("123 Main St");
  check(
    "H3-value-shape-fail-closed",
    policy === "coarse" && source === "conservative_default" && projected === "",
    `resolve=${policy}/${source}; coarsen("123 Main St")=${JSON.stringify(projected)} (single-segment street suppressed, not leaked)`,
  );
}

// H4: single-comma street value drops the street lead (Q-P0-01 leak 1).
{
  const out = (coarsenAddress as any)("123 Main St, Grand Junction CO 81501");
  check(
    "H4-street-lead-dropped",
    out === "Grand Junction CO 81501",
    `coarsen => ${JSON.stringify(out)}`,
  );
}

// H5: owner SHOW override beats the conservative coarse default.
{
  const show: any = { objectId: "biz-1", field: "address", policy: "show", decidedBy: "owner", decidedAt: "2026-09-27T00:00:00Z", source: "owner_override", version: 2 };
  const g = graph();
  const projected = (applyFieldVisibility as any)(g, [show]);
  const bizProj = projected.objects.find((o: any) => o.id === "biz-1");
  check(
    "H5-owner-show-wins",
    (bizProj.fields as any).address === STREET,
    `owner SHOW override => verbatim projected despite address default`,
  );
}

// H6: version tie -> later decision wins, deterministically.
{
  const d1: any = { ...hideAddr("biz-1"), version: 3 };
  const d2: any = { objectId: "biz-1", field: "address", policy: "show", decidedBy: "owner", decidedAt: "2026-09-27T01:00:00Z", source: "owner_override", version: 3 };
  const r = (resolveFieldVisibility as any)("biz-1", "address", [d1, d2]) as any;
  check("H6-version-tie-deterministic", r.policy === "show", `tie at v3 => later array entry wins: ${r.policy}`);
}

// H7: HIDE on "city" (address-family, not named "address") hides the whole address fact.
{
  const g = graph();
  const projected = (applyHideTraversal as any)(g, [hideAddr("biz-1", "city") as any]);
  const bizProj = projected.objects.find((o: any) => o.id === "biz-1");
  const keys = Object.keys(bizProj.fields as any);
  const leaked = ["address", "city"].some((k) => keys.includes(k));
  check(
    "H7-address-family-hide",
    !leaked && (isAddressFamilyField as any)("city") === true,
    `after HIDE on "city": biz fields=${JSON.stringify(keys)}`,
  );
}

// H8: non-address, non-street values pass through coarse/defaults unmangled.
{
  const out = (coarsenAddress as any)("Grand Junction");
  const looks = (valueLooksLikeAddress as any)("Grand Junction");
  check(
    "H8-benign-passthrough",
    out === "Grand Junction" && looks === false,
    `coarsen("Grand Junction")=${JSON.stringify(out)}; valueLooksLikeAddress=false`,
  );
}

// H9: "members" policy is absent from this tree's FieldVisibilityPolicy (3-state, not 4).
// The visitor-answer.ts contract mentions "members"; a decision carrying policy
// "members" would fall through resolveFieldVisibility's owner branch verbatim and
// applyFieldVisibility would treat it as neither hide nor coarse -> SHOW verbatim.
// That is a fail-open if any producer emits "members".
{
  const d: any = { objectId: "biz-1", field: "phone", policy: "members", decidedBy: "owner", decidedAt: "2026-09-27T00:00:00Z", source: "owner_override", version: 1 };
  const r = (resolveFieldVisibility as any)("biz-1", "phone", [d]) as any;
  const g = graph();
  const projected = (applyFieldVisibility as any)(g, [d]);
  const bizProj = projected.objects.find((o: any) => o.id === "biz-1");
  const phoneVisible = (bizProj.fields as any).phone === "555-0100";
  check(
    "H9-members-policy-failopen",
    !(r.policy === "members" && phoneVisible),
    `policy "members" resolved=${r.policy}, phone visible to public=${phoneVisible} (want: not visible or not resolved)`,
  );
}

const fails = report("suite-hide-override");
process.exit(fails > 0 ? 1 : 0);
