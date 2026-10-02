set -e
cat > '/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/redacted-batch-c-consultant.ts' <<'F2C_EOF'
/**
 * Redacted fixture, batch C (professional): solo business consultant.
 *
 * HAND-AUTHORED, fully synthetic. Every name, address, email, and claim
 * in this file is fictional and marked DEMO_SYNTHETIC. No real business,
 * person, credential, or outcome is described here.
 *
 * Provenance contract: all objects carry provenance.kind
 * "overlay-authored", which the FYD ask lane classifies as
 * DEMO_SYNTHETIC (never DIRECT_FACT, never website_statement). Do NOT
 * change the provenance kind to website-derived or canonical-journal.
 *
 * Shape: the sparse-evidence fixture. One person, one coarse location,
 * two minimal services, three articles with empty descriptions and no
 * dates or tags (tests UNKNOWN handling for missing optional fields).
 * No phone anywhere: contact is form-first via contact_url plus email
 * and website. Every contact method listed is renderable: website opens
 * the site, email opens a mailto, contact_url opens the contact form.
 * No hours are published.
 *
 * Redaction markers: addresses are placeholders, emails use .example.com.
 */

import type { PingObject, PingRelationship } from "../../sitespec/types";

const TS = "2026-09-24T00:30:00Z";
const CONTROLLER = "identity_fyd_factory_batch_c";
const PROV_REF = "fyd-factory:redacted:batch-c:consultant";

function provenance() {
  return {
    kind: "overlay-authored" as const,
    ref: PROV_REF,
    derivedAt: TS,
  };
}

function claimFields(extra: Record<string, string | string[]>): Record<string, string | string[]> {
  return {
    redaction_class: "DEMO_SYNTHETIC",
    synthetic_note: "Fictional demo persona; not a real person or business.",
    ...extra,
  };
}

function obj(
  id: string,
  schema: string,
  title: string,
  description: string,
  fields: Record<string, string | string[]>,
): PingObject {
  return {
    id,
    schema,
    controllerId: CONTROLLER,
    visibility: "public",
    title,
    description,
    fields: claimFields(fields),
    createdAt: TS,
    updatedAt: TS,
    provenance: provenance(),
  };
}

function rel(
  id: string,
  subject: string,
  predicate: string,
  object: string,
): PingRelationship {
  return {
    id,
    subject,
    predicate,
    object,
    status: "active",
    createdAt: TS,
    evidenceRef: "redacted-batch-c:" + predicate + ":consultant:" + id,
  };
}

const BIZ = "redacted-batch-c-consultant-biz";
const P1 = "redacted-batch-c-consultant-person-1";
const LOC = "redacted-batch-c-consultant-loc-1";

const objects: PingObject[] = [
  obj(
    BIZ,
    "ping.social.business@1",
    "High Desert Consulting Co.",
    "A fictional solo business consultant. This profile is intentionally sparse: no hours, no phone, contact by form or email.",
    {
      category: "Business consultant",
      email: "hello@highdesert-consulting.example.com",
      website: "https://highdesert-consulting.example.com",
      contact_url: "https://highdesert-consulting.example.com/contact",
      area_served: "Western Colorado",
    },
  ),
  obj(
    LOC,
    "ping.social.location@1",
    "Western Colorado",
    "Coarse service area for the fictional consultant. Not a precise location.",
    {
      kind: "service_area",
      address_region: "CO",
      address_country: "US",
      locality: "Western Colorado, US",
    },
  ),
  obj(
    P1,
    "ping.social.person@1",
    "Chris Avery",
    "Fictional founder of the demo consulting practice.",
    {
      role: "founder",
    },
  ),
  obj(
    "redacted-batch-c-consultant-svc-1",
    "ping.social.service@1",
    "Operations review",
    "A two-week look at how work actually moves through the business.",
    { name: "Operations review" },
  ),
  obj(
    "redacted-batch-c-consultant-svc-2",
    "ping.social.service@1",
    "Process documentation",
    "The important workflows written down so they survive turnover.",
    { name: "Process documentation" },
  ),
  // Sparse articles: titles only. Missing text, date, and tags on purpose
  // to exercise UNKNOWN handling for absent optional fields.
  obj(
    "redacted-batch-c-consultant-article-1",
    "ping.social.article@1",
    "Three questions before you hire a consultant",
    "",
    {},
  ),
  obj(
    "redacted-batch-c-consultant-article-2",
    "ping.social.article@1",
    "A one-page business plan template",
    "",
    {},
  ),
  obj(
    "redacted-batch-c-consultant-article-3",
    "ping.social.article@1",
    "When process beats tools",
    "",
    {},
  ),
];

const relationships: PingRelationship[] = [
  rel("redacted-batch-c-consultant-rel-001", BIZ, "located_at", LOC),
  rel("redacted-batch-c-consultant-rel-002", BIZ, "employs", P1),
  rel("redacted-batch-c-consultant-rel-003", P1, "member_of", BIZ),
  rel("redacted-batch-c-consultant-rel-004", BIZ, "offers", "redacted-batch-c-consultant-svc-1"),
  rel("redacted-batch-c-consultant-rel-005", BIZ, "offers", "redacted-batch-c-consultant-svc-2"),
  rel("redacted-batch-c-consultant-rel-006", BIZ, "publishes", "redacted-batch-c-consultant-article-1"),
  rel("redacted-batch-c-consultant-rel-007", BIZ, "publishes", "redacted-batch-c-consultant-article-2"),
  rel("redacted-batch-c-consultant-rel-008", BIZ, "publishes", "redacted-batch-c-consultant-article-3"),
];

export const REDACTED_BATCH_C_CONSULTANT_GRAPH = { objects, relationships };
F2C_EOF
sha256sum '/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/redacted-batch-c-consultant.ts'
cat > '/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/redacted-batch-c-cpa.ts' <<'F2C_EOF'
/**
 * Redacted fixture, batch C (professional): accounting / CPA practice.
 *
 * HAND-AUTHORED, fully synthetic. Every name, phone, address, email, and
 * claim in this file is fictional and marked DEMO_SYNTHETIC. No real
 * business, person, credential, or outcome is described here.
 *
 * Provenance contract: all objects carry provenance.kind
 * "overlay-authored", which the FYD ask lane classifies as
 * DEMO_SYNTHETIC (never DIRECT_FACT, never website_statement). Do NOT
 * change the provenance kind to website-derived or canonical-journal.
 *
 * Shape: 2 people plus a 5-item service list, 1 location, phone present,
 * no hours published, 1 article. The lean counterpart to the
 * dentist and law fixtures.
 *
 * Redaction markers: phones are (970) 555-01xx fictional range,
 * addresses are placeholders, emails use .example.com.
 */

import type { PingObject, PingRelationship } from "../../sitespec/types";

const TS = "2026-09-24T00:30:00Z";
const CONTROLLER = "identity_fyd_factory_batch_c";
const PROV_REF = "fyd-factory:redacted:batch-c:cpa";

function provenance() {
  return {
    kind: "overlay-authored" as const,
    ref: PROV_REF,
    derivedAt: TS,
  };
}

function claimFields(extra: Record<string, string | string[]>): Record<string, string | string[]> {
  return {
    redaction_class: "DEMO_SYNTHETIC",
    synthetic_note: "Fictional demo persona; not a real person or business.",
    ...extra,
  };
}

function obj(
  id: string,
  schema: string,
  title: string,
  description: string,
  fields: Record<string, string | string[]>,
): PingObject {
  return {
    id,
    schema,
    controllerId: CONTROLLER,
    visibility: "public",
    title,
    description,
    fields: claimFields(fields),
    createdAt: TS,
    updatedAt: TS,
    provenance: provenance(),
  };
}

function rel(
  id: string,
  subject: string,
  predicate: string,
  object: string,
): PingRelationship {
  return {
    id,
    subject,
    predicate,
    object,
    status: "active",
    createdAt: TS,
    evidenceRef: "redacted-batch-c:" + predicate + ":cpa:" + id,
  };
}

const BIZ = "redacted-batch-c-cpa-biz";
const P1 = "redacted-batch-c-cpa-person-1";
const P2 = "redacted-batch-c-cpa-person-2";
const LOC = "redacted-batch-c-cpa-loc-1";

const objects: PingObject[] = [
  obj(
    BIZ,
    "ping.social.business@1",
    "Juniper Ridge Accounting LLC",
    "A fictional two-person accounting practice: tax preparation, bookkeeping, payroll, and small-business advisory for the valley.",
    {
      category: "Accountant",
      phone: "(970) 555-0143",
      email: "hello@juniperridge-accounting.example.com",
      website: "https://juniperridge-accounting.example.com",
      area_served: "Mesa County, Colorado",
      address_placeholder: "450 Example Way, Grand Junction, CO 81501",
    },
  ),
  obj(
    LOC,
    "ping.social.location@1",
    "Grand Junction office",
    "Coarse placeholder location for the fictional office. Not a real address.",
    {
      kind: "office",
      address_locality: "Grand Junction",
      address_region: "CO",
      address_country: "US",
      locality: "Grand Junction, CO, US",
    },
  ),
  obj(
    P1,
    "ping.social.person@1",
    "Jordan Ellis",
    "Fictional owner of the demo accounting practice.",
    {
      role: "owner",
    },
  ),
  obj(
    P2,
    "ping.social.person@1",
    "Taylor Brooks",
    "Fictional bookkeeper at the demo accounting practice.",
    {
      role: "bookkeeper",
    },
  ),
  obj(
    "redacted-batch-c-cpa-svc-1",
    "ping.social.service@1",
    "Tax preparation",
    "Individual and small-business returns, e-filed with copies kept on record.",
    { name: "Tax preparation" },
  ),
  obj(
    "redacted-batch-c-cpa-svc-2",
    "ping.social.service@1",
    "Monthly bookkeeping",
    "Categorized books, reconciled accounts, and a monthly summary a non-accountant can read.",
    { name: "Monthly bookkeeping" },
  ),
  obj(
    "redacted-batch-c-cpa-svc-3",
    "ping.social.service@1",
    "Payroll processing",
    "Pay runs, filings, and year-end forms for small crews.",
    { name: "Payroll processing" },
  ),
  obj(
    "redacted-batch-c-cpa-svc-4",
    "ping.social.service@1",
    "Accounting software setup",
    "Chart of accounts and opening balances, set up so the books make sense on day one.",
    { name: "Accounting software setup" },
  ),
  obj(
    "redacted-batch-c-cpa-svc-5",
    "ping.social.service@1",
    "Business advisory check-ins",
    "A quarterly look at the numbers with plain-language next steps.",
    { name: "Business advisory check-ins" },
  ),
  obj(
    "redacted-batch-c-cpa-article-1",
    "ping.social.article@1",
    "Small-business year-end checklist",
    "Gather 1099s, reconcile December, and review estimated payments before the year closes.",
    {
      text: "Gather 1099s, reconcile December, and review estimated payments before the year closes.",
      date: "2026-09-10",
      tags: ["taxes", "year-end"],
      url: "https://juniperridge-accounting.example.com/articles/year-end-checklist",
    },
  ),
];

const relationships: PingRelationship[] = [
  rel("redacted-batch-c-cpa-rel-001", BIZ, "located_at", LOC),
  rel("redacted-batch-c-cpa-rel-002", BIZ, "employs", P1),
  rel("redacted-batch-c-cpa-rel-003", BIZ, "employs", P2),
  rel("redacted-batch-c-cpa-rel-004", P1, "member_of", BIZ),
  rel("redacted-batch-c-cpa-rel-005", P2, "member_of", BIZ),
  rel("redacted-batch-c-cpa-rel-006", BIZ, "offers", "redacted-batch-c-cpa-svc-1"),
  rel("redacted-batch-c-cpa-rel-007", BIZ, "offers", "redacted-batch-c-cpa-svc-2"),
  rel("redacted-batch-c-cpa-rel-008", BIZ, "offers", "redacted-batch-c-cpa-svc-3"),
  rel("redacted-batch-c-cpa-rel-009", BIZ, "offers", "redacted-batch-c-cpa-svc-4"),
  rel("redacted-batch-c-cpa-rel-010", BIZ, "offers", "redacted-batch-c-cpa-svc-5"),
  rel("redacted-batch-c-cpa-rel-011", BIZ, "publishes", "redacted-batch-c-cpa-article-1"),
];

export const REDACTED_BATCH_C_CPA_GRAPH = { objects, relationships };
F2C_EOF
sha256sum '/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/redacted-batch-c-cpa.ts'
cat > '/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/redacted-batch-c-dentist.ts' <<'F2C_EOF'
/**
 * Redacted fixture, batch C (professional): dental practice.
 *
 * HAND-AUTHORED, fully synthetic. Every name, phone, address, email, and
 * claim in this file is fictional and marked DEMO_SYNTHETIC. No real
 * business, person, credential, or outcome is described here.
 *
 * Provenance contract: all objects carry provenance.kind
 * "overlay-authored", which the FYD ask lane classifies as
 * DEMO_SYNTHETIC (never DIRECT_FACT, never website_statement). Do NOT
 * change the provenance kind to website-derived or canonical-journal.
 *
 * Shape: people-heavy (3 staff), 2 locations, hours present, phone
 * present, 4 services, 2 proof/case-study projects, 2 articles.
 *
 * Redaction markers: phones are (970) 555-01xx fictional range,
 * addresses are placeholders, emails use .example.com.
 */

import type { PingObject, PingRelationship } from "../../sitespec/types";

const TS = "2026-09-24T00:30:00Z";
const CONTROLLER = "identity_fyd_factory_batch_c";
const PROV_REF = "fyd-factory:redacted:batch-c:dentist";

function provenance() {
  return {
    kind: "overlay-authored" as const,
    ref: PROV_REF,
    derivedAt: TS,
  };
}

function claimFields(extra: Record<string, string | string[]>): Record<string, string | string[]> {
  return {
    redaction_class: "DEMO_SYNTHETIC",
    synthetic_note: "Fictional demo persona; not a real person or business.",
    ...extra,
  };
}

function obj(
  id: string,
  schema: string,
  title: string,
  description: string,
  fields: Record<string, string | string[]>,
): PingObject {
  return {
    id,
    schema,
    controllerId: CONTROLLER,
    visibility: "public",
    title,
    description,
    fields: claimFields(fields),
    createdAt: TS,
    updatedAt: TS,
    provenance: provenance(),
  };
}

function rel(
  id: string,
  subject: string,
  predicate: string,
  object: string,
): PingRelationship {
  return {
    id,
    subject,
    predicate,
    object,
    status: "active",
    createdAt: TS,
    evidenceRef: "redacted-batch-c:" + predicate + ":dentist:" + id,
  };
}

const BIZ = "redacted-batch-c-dentist-biz";
const P1 = "redacted-batch-c-dentist-person-1";
const P2 = "redacted-batch-c-dentist-person-2";
const P3 = "redacted-batch-c-dentist-person-3";
const LOC1 = "redacted-batch-c-dentist-loc-1";
const LOC2 = "redacted-batch-c-dentist-loc-2";

const objects: PingObject[] = [
  obj(
    BIZ,
    "ping.social.business@1",
    "Blue Spruce Dental",
    "A fictional family dental practice in the Grand Valley. Cleanings, fillings, crowns, and clear aligner consultations by appointment.",
    {
      category: "Dentist",
      phone: "(970) 555-0140",
      email: "hello@bluespruce-dental.example.com",
      website: "https://bluespruce-dental.example.com",
      hours: "Mo,Tu,We,Th 08:00-17:00; Fr 08:00-14:00",
      area_served: "Grand Junction and Fruita, Colorado",
      address_placeholder: "1200 Example Blvd, Grand Junction, CO 81501",
      price_range: "$$",
    },
  ),
  obj(
    LOC1,
    "ping.social.location@1",
    "Grand Junction office",
    "Coarse placeholder location for the fictional main office. Not a real address.",
    {
      kind: "office",
      address_locality: "Grand Junction",
      address_region: "CO",
      address_country: "US",
      locality: "Grand Junction, CO, US",
    },
  ),
  obj(
    LOC2,
    "ping.social.location@1",
    "Fruita satellite office",
    "Coarse placeholder location for the fictional satellite office. Not a real address.",
    {
      kind: "office",
      address_locality: "Fruita",
      address_region: "CO",
      address_country: "US",
      locality: "Fruita, CO, US",
    },
  ),
  obj(
    P1,
    "ping.social.person@1",
    "Avery Quinn",
    "Fictional dentist persona at the demo practice.",
    {
      role: "dentist",
    },
  ),
  obj(
    P2,
    "ping.social.person@1",
    "Morgan Ellis",
    "Fictional dental hygienist persona at the demo practice.",
    {
      role: "dental hygienist",
    },
  ),
  obj(
    P3,
    "ping.social.person@1",
    "Riley Park",
    "Fictional front desk coordinator persona at the demo practice.",
    {
      role: "front desk coordinator",
    },
  ),
  obj(
    "redacted-batch-c-dentist-svc-1",
    "ping.social.service@1",
    "Routine cleanings",
    "Twice-a-year cleanings with an exam and x-rays as needed.",
    { name: "Routine cleanings", duration: "about 60 minutes" },
  ),
  obj(
    "redacted-batch-c-dentist-svc-2",
    "ping.social.service@1",
    "Tooth-colored fillings",
    "Composite fillings matched to the shade of the tooth.",
    { name: "Tooth-colored fillings" },
  ),
  obj(
    "redacted-batch-c-dentist-svc-3",
    "ping.social.service@1",
    "Crowns",
    "Porcelain and zirconia crowns, usually two visits.",
    { name: "Crowns" },
  ),
  obj(
    "redacted-batch-c-dentist-svc-4",
    "ping.social.service@1",
    "Clear aligner consultations",
    "An evaluation to see whether clear aligners fit the case.",
    { name: "Clear aligner consultations" },
  ),
  obj(
    "redacted-batch-c-dentist-proof-1",
    "ping.social.project@1",
    "New-patient onboarding refresh",
    "Demo case study: the fictional practice rewrote its intake paperwork so first visits start on time. Fictional outcome, illustrative only.",
    { kind: "case_study" },
  ),
  obj(
    "redacted-batch-c-dentist-proof-2",
    "ping.social.project@1",
    "Family block scheduling pilot",
    "Demo case study: the fictional practice tried booking family members back-to-back to cut down on trips. Fictional outcome, illustrative only.",
    { kind: "case_study" },
  ),
  obj(
    "redacted-batch-c-dentist-article-1",
    "ping.social.article@1",
    "What to expect at your first visit",
    "A short walkthrough of a first appointment: paperwork, x-rays, exam, and a cleaning plan.",
    {
      text: "A short walkthrough of a first appointment: paperwork, x-rays, exam, and a cleaning plan.",
      date: "2026-09-01",
      tags: ["new patients", "visits"],
      url: "https://bluespruce-dental.example.com/articles/first-visit",
    },
  ),
  obj(
    "redacted-batch-c-dentist-article-2",
    "ping.social.article@1",
    "Brushing basics for busy mornings",
    "Two minutes, twice a day, with a soft brush. The demo practice keeps it simple.",
    {
      text: "Two minutes, twice a day, with a soft brush. The demo practice keeps it simple.",
      date: "2026-09-08",
      tags: ["hygiene"],
      url: "https://bluespruce-dental.example.com/articles/brushing-basics",
    },
  ),
];

const relationships: PingRelationship[] = [
  rel("redacted-batch-c-dentist-rel-001", BIZ, "located_at", LOC1),
  rel("redacted-batch-c-dentist-rel-002", BIZ, "located_at", LOC2),
  rel("redacted-batch-c-dentist-rel-003", BIZ, "employs", P1),
  rel("redacted-batch-c-dentist-rel-004", BIZ, "employs", P2),
  rel("redacted-batch-c-dentist-rel-005", BIZ, "employs", P3),
  rel("redacted-batch-c-dentist-rel-006", P1, "member_of", BIZ),
  rel("redacted-batch-c-dentist-rel-007", P2, "member_of", BIZ),
  rel("redacted-batch-c-dentist-rel-008", P3, "member_of", BIZ),
  rel("redacted-batch-c-dentist-rel-009", BIZ, "offers", "redacted-batch-c-dentist-svc-1"),
  rel("redacted-batch-c-dentist-rel-010", BIZ, "offers", "redacted-batch-c-dentist-svc-2"),
  rel("redacted-batch-c-dentist-rel-011", BIZ, "offers", "redacted-batch-c-dentist-svc-3"),
  rel("redacted-batch-c-dentist-rel-012", BIZ, "offers", "redacted-batch-c-dentist-svc-4"),
  rel("redacted-batch-c-dentist-rel-013", BIZ, "publishes", "redacted-batch-c-dentist-proof-1"),
  rel("redacted-batch-c-dentist-rel-014", BIZ, "publishes", "redacted-batch-c-dentist-proof-2"),
  rel("redacted-batch-c-dentist-rel-015", BIZ, "publishes", "redacted-batch-c-dentist-article-1"),
  rel("redacted-batch-c-dentist-rel-016", BIZ, "publishes", "redacted-batch-c-dentist-article-2"),
];

export const REDACTED_BATCH_C_DENTIST_GRAPH = { objects, relationships };
F2C_EOF
sha256sum '/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/redacted-batch-c-dentist.ts'
cat > '/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/redacted-batch-c-lawfirm.ts' <<'F2C_EOF'
/**
 * Redacted fixture, batch C (professional): law firm.
 *
 * HAND-AUTHORED, fully synthetic. Every name, phone, address, email, and
 * claim in this file is fictional and marked DEMO_SYNTHETIC. No real
 * business, person, credential, license, school, award, or outcome is
 * described here. No bar numbers or years of experience are stated.
 *
 * Provenance contract: all objects carry provenance.kind
 * "overlay-authored", which the FYD ask lane classifies as
 * DEMO_SYNTHETIC (never DIRECT_FACT, never website_statement). Do NOT
 * change the provenance kind to website-derived or canonical-journal.
 *
 * Shape: people-heavy (4 attorneys, each with a practice area), 2
 * locations, hours present, phone present, 4 practice-area services,
 * 2 proof/case-study projects, 2 articles.
 *
 * Redaction markers: phones are (970) 555-01xx fictional range,
 * addresses are placeholders, emails use .example.com.
 */

import type { PingObject, PingRelationship } from "../../sitespec/types";

const TS = "2026-09-24T00:30:00Z";
const CONTROLLER = "identity_fyd_factory_batch_c";
const PROV_REF = "fyd-factory:redacted:batch-c:lawfirm";

function provenance() {
  return {
    kind: "overlay-authored" as const,
    ref: PROV_REF,
    derivedAt: TS,
  };
}

function claimFields(extra: Record<string, string | string[]>): Record<string, string | string[]> {
  return {
    redaction_class: "DEMO_SYNTHETIC",
    synthetic_note: "Fictional demo persona; not a real person or business.",
    ...extra,
  };
}

function obj(
  id: string,
  schema: string,
  title: string,
  description: string,
  fields: Record<string, string | string[]>,
): PingObject {
  return {
    id,
    schema,
    controllerId: CONTROLLER,
    visibility: "public",
    title,
    description,
    fields: claimFields(fields),
    createdAt: TS,
    updatedAt: TS,
    provenance: provenance(),
  };
}

function rel(
  id: string,
  subject: string,
  predicate: string,
  object: string,
): PingRelationship {
  return {
    id,
    subject,
    predicate,
    object,
    status: "active",
    createdAt: TS,
    evidenceRef: "redacted-batch-c:" + predicate + ":lawfirm:" + id,
  };
}

const BIZ = "redacted-batch-c-lawfirm-biz";
const A1 = "redacted-batch-c-lawfirm-person-1";
const A2 = "redacted-batch-c-lawfirm-person-2";
const A3 = "redacted-batch-c-lawfirm-person-3";
const A4 = "redacted-batch-c-lawfirm-person-4";
const LOC1 = "redacted-batch-c-lawfirm-loc-1";
const LOC2 = "redacted-batch-c-lawfirm-loc-2";

const objects: PingObject[] = [
  obj(
    BIZ,
    "ping.social.business@1",
    "Ironwood Law Group",
    "A fictional four-attorney firm: estate planning, business law, real estate, and family law consultations by appointment.",
    {
      category: "Law firm",
      phone: "(970) 555-0145",
      email: "hello@ironwood-law.example.com",
      website: "https://ironwood-law.example.com",
      hours: "Mo,Tu,We,Th,Fr 09:00-17:00",
      area_served: "Mesa and Montrose Counties, Colorado",
      address_placeholder: "88 Example Plaza, Grand Junction, CO 81501",
    },
  ),
  obj(
    LOC1,
    "ping.social.location@1",
    "Grand Junction office",
    "Coarse placeholder location for the fictional main office. Not a real address.",
    {
      kind: "office",
      address_locality: "Grand Junction",
      address_region: "CO",
      address_country: "US",
      locality: "Grand Junction, CO, US",
    },
  ),
  obj(
    LOC2,
    "ping.social.location@1",
    "Montrose office",
    "Coarse placeholder location for the fictional second office. Not a real address.",
    {
      kind: "office",
      address_locality: "Montrose",
      address_region: "CO",
      address_country: "US",
      locality: "Montrose, CO, US",
    },
  ),
  obj(
    A1,
    "ping.social.person@1",
    "Alex Morgan",
    "Fictional attorney persona; practice area is estate planning.",
    {
      role: "attorney",
      practice_area: "estate planning",
    },
  ),
  obj(
    A2,
    "ping.social.person@1",
    "Riley Chen",
    "Fictional attorney persona; practice area is business law.",
    {
      role: "attorney",
      practice_area: "business law",
    },
  ),
  obj(
    A3,
    "ping.social.person@1",
    "Sam Delgado",
    "Fictional attorney persona; practice area is real estate.",
    {
      role: "attorney",
      practice_area: "real estate",
    },
  ),
  obj(
    A4,
    "ping.social.person@1",
    "Pat Kim",
    "Fictional attorney persona; practice area is family law.",
    {
      role: "attorney",
      practice_area: "family law",
    },
  ),
  obj(
    "redacted-batch-c-lawfirm-svc-1",
    "ping.social.service@1",
    "Estate planning",
    "Wills, trusts, and powers of attorney drafted around the family, not a template.",
    { name: "Estate planning" },
  ),
  obj(
    "redacted-batch-c-lawfirm-svc-2",
    "ping.social.service@1",
    "Business formation",
    "LLCs and operating agreements for new and growing businesses.",
    { name: "Business formation" },
  ),
  obj(
    "redacted-batch-c-lawfirm-svc-3",
    "ping.social.service@1",
    "Real estate closings",
    "Document review and closing support for residential and small commercial deals.",
    { name: "Real estate closings" },
  ),
  obj(
    "redacted-batch-c-lawfirm-svc-4",
    "ping.social.service@1",
    "Family law consultations",
    "An initial consultation to map options before anything is filed.",
    { name: "Family law consultations" },
  ),
  obj(
    "redacted-batch-c-lawfirm-proof-1",
    "ping.social.project@1",
    "Estate plan document package",
    "Demo case study: a sample package showing the documents in a typical plan. Fictional example, illustrative only.",
    { kind: "case_study" },
  ),
  obj(
    "redacted-batch-c-lawfirm-proof-2",
    "ping.social.project@1",
    "Commercial lease review",
    "Demo case study: a sample review checklist for a storefront lease. Fictional example, illustrative only.",
    { kind: "case_study" },
  ),
  obj(
    "redacted-batch-c-lawfirm-article-1",
    "ping.social.article@1",
    "Why small businesses use operating agreements",
    "An operating agreement settles ownership, money, and decisions before there is a disagreement.",
    {
      text: "An operating agreement settles ownership, money, and decisions before there is a disagreement.",
      date: "2026-09-05",
      tags: ["business law"],
      url: "https://ironwood-law.example.com/articles/operating-agreements",
    },
  ),
  obj(
    "redacted-batch-c-lawfirm-article-2",
    "ping.social.article@1",
    "What to bring to an estate planning consultation",
    "IDs, asset lists, beneficiary names, and any existing documents. A one-page checklist.",
    {
      text: "IDs, asset lists, beneficiary names, and any existing documents. A one-page checklist.",
      date: "2026-09-12",
      tags: ["estate planning"],
      url: "https://ironwood-law.example.com/articles/estate-planning-checklist",
    },
  ),
];

const relationships: PingRelationship[] = [
  rel("redacted-batch-c-lawfirm-rel-001", BIZ, "located_at", LOC1),
  rel("redacted-batch-c-lawfirm-rel-002", BIZ, "located_at", LOC2),
  rel("redacted-batch-c-lawfirm-rel-003", BIZ, "employs", A1),
  rel("redacted-batch-c-lawfirm-rel-004", BIZ, "employs", A2),
  rel("redacted-batch-c-lawfirm-rel-005", BIZ, "employs", A3),
  rel("redacted-batch-c-lawfirm-rel-006", BIZ, "employs", A4),
  rel("redacted-batch-c-lawfirm-rel-007", A1, "member_of", BIZ),
  rel("redacted-batch-c-lawfirm-rel-008", A2, "member_of", BIZ),
  rel("redacted-batch-c-lawfirm-rel-009", A3, "member_of", BIZ),
  rel("redacted-batch-c-lawfirm-rel-010", A4, "member_of", BIZ),
  rel("redacted-batch-c-lawfirm-rel-011", BIZ, "offers", "redacted-batch-c-lawfirm-svc-1"),
  rel("redacted-batch-c-lawfirm-rel-012", BIZ, "offers", "redacted-batch-c-lawfirm-svc-2"),
  rel("redacted-batch-c-lawfirm-rel-013", BIZ, "offers", "redacted-batch-c-lawfirm-svc-3"),
  rel("redacted-batch-c-lawfirm-rel-014", BIZ, "offers", "redacted-batch-c-lawfirm-svc-4"),
  rel("redacted-batch-c-lawfirm-rel-015", BIZ, "publishes", "redacted-batch-c-lawfirm-proof-1"),
  rel("redacted-batch-c-lawfirm-rel-016", BIZ, "publishes", "redacted-batch-c-lawfirm-proof-2"),
  rel("redacted-batch-c-lawfirm-rel-017", BIZ, "publishes", "redacted-batch-c-lawfirm-article-1"),
  rel("redacted-batch-c-lawfirm-rel-018", BIZ, "publishes", "redacted-batch-c-lawfirm-article-2"),
];

export const REDACTED_BATCH_C_LAWFIRM_GRAPH = { objects, relationships };
F2C_EOF
sha256sum '/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/redacted-batch-c-lawfirm.ts'
ls -la '/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__' | grep redacted-batch-c
