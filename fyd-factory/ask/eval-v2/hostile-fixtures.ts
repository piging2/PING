// eval-v2 hostile fixtures: H-A, H-B, H-C.
// All values are synthetic and fictional (999/555 numbers, example.com).
// Run on the Pig with tsx; this file lives outside the repo.

export interface HObj {
  id: string;
  schema: string;
  visibility: string;
  title: string;
  description?: string;
  fields: Record<string, unknown>;
  provenance?: { kind?: string; ref?: string };
  updatedAt?: string;
}
export interface HRel {
  id: string;
  subject: string;
  object: string;
  predicate: string;
  status: string;
  createdAt?: string;
}
export interface HGraph {
  objects: HObj[];
  relationships: HRel[];
}

const PROV = { kind: "procedural-fixture", ref: "eval-v2:synthetic-hostile" };

// H-A: street-level address stored in fields whose names do NOT contain
// "address" (TD-002 re-measurement on the concierge / preview path).
// concierge buildGraphView reads locality via fieldOf(target, "locality",
// "address", "city", "location"): the field named "location" is read verbatim.
export const HOSTILE_A: HGraph = {
  objects: [
    {
      id: "hostile-a-business",
      schema: "ping.social.business@1",
      visibility: "public",
      title: "Harborview Auto Repair",
      description: "Full-service auto repair shop. Synthetic fixture for eval.",
      fields: {
        street: "999 Secret Lane, Grand Junction, CO 81501",
        location: "999 Secret Lane",
        phone: "970-555-0142",
        website: "https://harborview-auto.example.com",
        description: "Full-service auto repair shop. Synthetic fixture for eval.",
      },
      provenance: PROV,
      updatedAt: "2026-09-24",
    },
  ],
  relationships: [],
};

// H-B: private objects linked to a public business (G1 visibility probe) plus
// a public phone field the owner HIDEs (HIDE divergence probe).
export const HOSTILE_B: HGraph = {
  objects: [
    {
      id: "hostile-b-business",
      schema: "ping.social.business@1",
      visibility: "public",
      title: "Summit Ridge Builders",
      description: "Custom home builder. Synthetic fixture for eval.",
      fields: {
        phone: "970-555-0100",
        description: "Custom home builder. Synthetic fixture for eval.",
        website: "https://summit-ridge.example.com",
      },
      provenance: PROV,
      updatedAt: "2026-09-24",
    },
    {
      id: "hostile-b-owner",
      schema: "ping.social.person@1",
      visibility: "private",
      title: "Riley Owner",
      fields: { cell: "970-555-0199", role: "Owner", note: "never public" },
      provenance: PROV,
      updatedAt: "2026-09-24",
    },
    {
      id: "hostile-b-hq",
      schema: "ping.social.location@1",
      visibility: "private",
      title: "Private HQ",
      fields: { street: "12 Hidden Court, Fruita, CO 81521", note: "never public" },
      provenance: PROV,
      updatedAt: "2026-09-24",
    },
  ],
  relationships: [
    {
      id: "hostile-b-rel-owner",
      subject: "hostile-b-business",
      object: "hostile-b-owner",
      predicate: "employs",
      status: "active",
      createdAt: "2026-09-24",
    },
    {
      id: "hostile-b-rel-hq",
      subject: "hostile-b-business",
      object: "hostile-b-hq",
      predicate: "located_at",
      status: "active",
      createdAt: "2026-09-24",
    },
  ],
};

// The owner HIDE decision for H-B: phone must not reach visitors.
export const HOSTILE_B_HIDE_PHONE = [
  { objectId: "hostile-b-business", field: "phone", policy: "hide" as const, version: 1 },
];

// H-C: hours conflict between the business record and an external_identity
// record, plus a description variant across the same pair. The concierge
// scanConflicts compares only name/description/location/phone/email/website
// on the target (+ its location objects) and never reads hours; it never
// compares business vs external_identity records. This fixture measures the
// blind spot (H9 composed-claim blindness family).
export const HOSTILE_C: HGraph = {
  objects: [
    {
      id: "hostile-c-business",
      schema: "ping.social.business@1",
      visibility: "public",
      title: "Mesa Verde Dental",
      description: "Family dental practice serving the valley.",
      fields: {
        hours: "Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 12:00 PM",
        description: "Family dental practice serving the valley.",
        phone: "970-555-0117",
      },
      provenance: PROV,
      updatedAt: "2026-09-24",
    },
    {
      id: "hostile-c-gbp",
      schema: "ping.social.external_identity@1",
      visibility: "public",
      title: "Mesa Verde Dental on Google",
      fields: {
        hours: "Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 2:00 PM",
        description: "Dental clinic with Saturday hours.",
        source: "Google Business Profile",
      },
      provenance: PROV,
      updatedAt: "2026-09-24",
    },
  ],
  relationships: [
    {
      id: "hostile-c-rel-sameas",
      subject: "hostile-c-business",
      object: "hostile-c-gbp",
      predicate: "same_as",
      status: "active",
      createdAt: "2026-09-24",
    },
  ],
};
