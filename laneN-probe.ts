import { verifyBinding, classifyRenderAtom } from "./src/fyd/sitespec/binding-verifier";
import type { ObjectGraph } from "./src/fyd/sitespec/types";
import type { PingObject } from "./src/lib/ping/types";

function obj(id: string, prov: PingObject["provenance"]): PingObject {
  return {
    id,
    schema: "ping.social.business@1",
    controllerId: "c",
    visibility: "public",
    title: "Acme",
    description: "d",
    fields: { phone: "555-0100" },
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
    provenance: prov,
  };
}
const g = (o: PingObject): ObjectGraph => ({ objects: [o], relationships: [] });
const NOW = "2026-09-25T16:00:00.000Z";

const stale = obj("o1", {
  kind: "website-derived",
  ref: "website-ingestion:https://example.com/",
  derivedAt: "2025-01-05T00:00:00.000Z",
});
const v1 = verifyBinding(
  { objectId: "o1", field: "title", classification: "direct" },
  g(stale),
  [],
  { now: NOW },
);
console.log("D1 stale verdict:", v1.status, v1.status === "UNBOUND" ? v1.reason : (v1 as any).source);
const a1 = classifyRenderAtom(
  { objectId: "o1", field: "title", classification: "direct" },
  g(stale),
  [],
  { now: NOW },
);
console.log("D1 stale atom:", a1.classification, a1.unknownReason ?? "");

const wrongRef = obj("o2", {
  kind: "website-derived",
  ref: "website-ingestion:https://example.com/",
  derivedAt: "2026-09-21T00:00:00.000Z",
});
const a3 = classifyRenderAtom(
  {
    objectId: "o2",
    field: "title",
    classification: "direct",
    evidenceRef: "website-ingestion:https://wrong.example/",
  },
  g(wrongRef),
  [],
  { now: NOW },
);
console.log("D3 wrong carrier:", a3.classification, "carried:", a3.evidenceRef, a3.unknownReason ?? "");

const sup = obj("o3", {
  kind: "website-derived",
  ref: "website-ingestion:https://example.com/",
  derivedAt: "2026-09-21T00:00:00.000Z",
  updatedRefs: ["ping-event:ev-9"],
});
const aS = classifyRenderAtom(
  {
    objectId: "o3",
    field: "title",
    classification: "direct",
    evidenceRef: "website-ingestion:https://example.com/",
  },
  g(sup),
  [],
  { now: NOW },
);
console.log("D1 superseded carrier:", aS.classification, aS.unknownReason ?? "");
const aS2 = classifyRenderAtom(
  {
    objectId: "o3",
    field: "title",
    classification: "direct",
    evidenceRef: "ping-event:ev-9",
  },
  g(sup),
  [],
  { now: NOW },
);
console.log("D1 current carrier (ev-9):", aS2.classification, aS2.evidenceRef ?? "", aS2.unknownReason ?? "");

const ov = obj("o4", {
  kind: "overlay-authored",
  ref: "overlay:demo-1",
  derivedAt: "2026-09-24T00:00:00.000Z",
});
const a4 = classifyRenderAtom(
  { objectId: "o4", field: "title", classification: "direct" },
  g(ov),
  [],
  { now: NOW },
);
console.log("D4 overlay-authored:", a4.classification, "kind carried:", (a4 as any).provenanceKind, a4.unknownReason ?? "");
