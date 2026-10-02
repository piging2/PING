/**
 * Lane F spike: synthetic corpus generator (deterministic, seeded PRNG).
 *
 * 500 objects across 3 tenants, schemas business/service/post, Western Slope
 * flavor. Records ground-truth intents alongside the corpus so recall is
 * measurable without a live corpus.
 */

import type { SearchableObject } from "./types.ts";

export interface GroundTruth {
  identityQueries: Array<{ label: string; query: Record<string, string>; expectId: string }>;
  textQueries: Array<{ label: string; text: string; bestId: string; relevantIds: string[] }>;
  negativeQueries: Array<{ label: string; text: string }>;
}

// Deterministic PRNG (mulberry32). Same seed => same corpus.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TRADES = [
  "Plumbing", "HVAC", "Electrical", "Roofing", "Landscaping", "Painting",
  "Tree Service", "Pest Control", "Concrete", "Fencing", "Garage Doors", "Septic",
];
const TOWNS = [
  "Grand Junction", "Fruita", "Palisade", "Clifton", "Delta", "Montrose",
  "Rifle", "Carbondale", "Collbran", "Loma", "Mack", "De Beque",
];
const FIRST = [
  "Copper", "Mesa", "Redlands", "Monument", "Grand Valley", "Western Slope",
  "Bookcliff", "Juniper", "Cottonwood", "Adobe", "Peach", "High Desert",
];
const SERVICE_WORDS = [
  "repair", "installation", "maintenance", "inspection", "replacement",
  "emergency service", "tune-up", "cleaning", "remodel", "upgrade",
];

export function generateCorpus(seed = 20260923): { objects: SearchableObject[]; truth: GroundTruth } {
  const rand = mulberry32(seed);
  const objects: SearchableObject[] = [];
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

  const tenants = ["tenant-a", "tenant-b", "tenant-c"];
  const businessIds: Record<string, string[]> = { "tenant-a": [], "tenant-b": [], "tenant-c": [] };
  let n = 0;
  const nextId = (prefix: string) => `${prefix}-${String(n++).padStart(4, "0")}`;

  // Businesses: 60 per tenant.
  for (const tenant of tenants) {
    for (let i = 0; i < 60; i++) {
      const trade = pick(TRADES);
      const town = pick(TOWNS);
      const brand = pick(FIRST);
      const name = `${brand} ${trade}`;
      const id = nextId("biz");
      businessIds[tenant].push(id);
      const phoneDigits = `970${String(200 + Math.floor(rand() * 799))}${String(1000 + Math.floor(rand() * 9000))}`;
      objects.push({
        id,
        tenantId: tenant,
        schema: "ping.social.business@1",
        name,
        description: `${trade} contractor serving ${town} and the surrounding Western Slope. Family owned and operated.`,
        extra: [`${trade.toLowerCase()} services in ${town}`, "licensed insured local business"],
        url: `https://www.${brand.toLowerCase().replace(/\s+/g, "")}${trade.toLowerCase().replace(/\s+/g, "")}.com`,
        phone: `+1${phoneDigits}`,
        sourceIdentity: { provider: "manual", providerId: `biz-${tenant}-${i}` },
        visibility: i % 20 === 0 ? "owner" : "public",
        relationships: [],
        eventTime: `2026-09-${String(1 + (i % 22)).padStart(2, "0")}T${String(i % 24).padStart(2, "0")}:00:00.000Z`,
      });
    }
  }

  // Services: 2 per business, linked by "offers" relationships.
  const serviceIds: string[] = [];
  for (const tenant of tenants) {
    for (const bizId of businessIds[tenant]) {
      const biz = objects.find((o) => o.id === bizId)!;
      const trade = biz.name.split(" ").slice(1).join(" ");
      for (let s = 0; s < 2; s++) {
        const svcWord = SERVICE_WORDS[(n + s) % SERVICE_WORDS.length];
        const svcId = nextId("svc");
        serviceIds.push(svcId);
        objects.push({
          id: svcId,
          tenantId: tenant,
          schema: "ping.social.service@1",
          name: `${trade} ${svcWord}`,
          description: `Professional ${trade.toLowerCase()} ${svcWord} from ${biz.name}. Upfront pricing, satisfaction guaranteed.`,
          extra: [trade.toLowerCase(), svcWord],
          url: null,
          phone: null,
          sourceIdentity: null,
          visibility: "public",
          relationships: [{ predicate: "offered_by", targetId: bizId }],
          eventTime: biz.eventTime,
        });
        biz.relationships.push({ predicate: "offers", targetId: svcId });
      }
    }
  }

  // Posts: 140 across tenants, some hidden/owner-only for visibility tests.
  for (let i = 0; i < 140; i++) {
    const tenant = tenants[i % 3];
    const bizPool = businessIds[tenant];
    const bizId = bizPool[i % bizPool.length];
    const biz = objects.find((o) => o.id === bizId)!;
    const trade = biz.name.split(" ").slice(1).join(" ");
    const id = nextId("post");
    objects.push({
      id,
      tenantId: tenant,
      schema: "ping.social.post@1",
      name: `${biz.name} update`,
      description: `Latest news from ${biz.name}: seasonal ${trade.toLowerCase()} tips, current promotions, and scheduling availability this month.`,
      extra: ["announcement", trade.toLowerCase()],
      url: null,
      phone: null,
      sourceIdentity: null,
      visibility: i % 17 === 0 ? "hidden" : i % 11 === 0 ? "owner" : "public",
      relationships: [{ predicate: "posted_by", targetId: bizId }],
      eventTime: `2026-09-${String(1 + (i % 22)).padStart(2, "0")}T${String((i + 6) % 24).padStart(2, "0")}:00:00.000Z`,
    });
  }

  // Hand-planted deterministic fixtures for ground truth.
  const fixtures: SearchableObject[] = [
    {
      id: "biz-coppersmith",
      tenantId: "tenant-a",
      schema: "ping.social.business@1",
      name: "Coppersmith Plumbing & HVAC",
      description: "Full service plumbing and heating contractor in Grand Junction. Water heaters, drain cleaning, furnace repair.",
      extra: ["plumber grand junction", "emergency plumbing"],
      url: "https://www.coppersmithplumbing.com/",
      phone: "+19705550134",
      sourceIdentity: { provider: "sos", providerId: "co-2024-88123" },
      visibility: "public",
      relationships: [{ predicate: "offers", targetId: "svc-water-heater" }],
      eventTime: "2026-09-20T10:00:00.000Z",
    },
    {
      id: "svc-water-heater",
      tenantId: "tenant-a",
      schema: "ping.social.service@1",
      name: "Water Heater Installation",
      description: "Tank and tankless water heater installation by Coppersmith Plumbing & HVAC. Same day service available.",
      extra: ["water heater", "hot water"],
      url: null,
      phone: null,
      sourceIdentity: null,
      visibility: "public",
      relationships: [{ predicate: "offered_by", targetId: "biz-coppersmith" }],
      eventTime: "2026-09-20T10:00:00.000Z",
    },
    {
      id: "biz-monument-coffee",
      tenantId: "tenant-a",
      schema: "ping.social.business@1",
      name: "Monument View Coffee Shop",
      description: "Family run coffee shop in the Redlands with mountain views. Espresso, pastries, community gathering space.",
      extra: ["coffee grand junction redlands", "cafe"],
      url: "https://monumentviewcoffee.example.com",
      phone: "+19705550177",
      sourceIdentity: { provider: "sos", providerId: "co-2023-55201" },
      visibility: "public",
      relationships: [],
      eventTime: "2026-09-18T09:00:00.000Z",
    },
    {
      // Same trade, different tenant: the tenant-leakage trap.
      id: "biz-coppersmith-b",
      tenantId: "tenant-b",
      schema: "ping.social.business@1",
      name: "Coppersmith Plumbing & HVAC",
      description: "Plumbing contractor serving the tenant-b market. Not affiliated with the Grand Junction shop.",
      extra: ["plumber"],
      url: "https://coppersmith.example-b.com",
      phone: "+19705550999",
      sourceIdentity: { provider: "sos", providerId: "co-2025-11002" },
      visibility: "public",
      relationships: [],
      eventTime: "2026-09-19T10:00:00.000Z",
    },
  ];
  objects.push(...fixtures);

  const truth: GroundTruth = {
    identityQueries: [
      { label: "id exact", query: { id: "biz-coppersmith" }, expectId: "biz-coppersmith" },
      { label: "url scheme/www variant", query: { url: "http://coppersmithplumbing.com" }, expectId: "biz-coppersmith" },
      { label: "url with path query", query: { url: "https://www.coppersmithplumbing.com/?utm=x#top" }, expectId: "biz-coppersmith" },
      { label: "phone formatted", query: { phone: "(970) 555-0134" }, expectId: "biz-coppersmith" },
      { label: "phone digits", query: { phone: "19705550134" }, expectId: "biz-coppersmith" },
      { label: "source identity", query: {}, expectId: "biz-coppersmith" },
      { label: "exact name with suffix", query: { text: "Coppersmith Plumbing & HVAC LLC" }, expectId: "biz-coppersmith" },
      { label: "exact name lowercase", query: { text: "coppersmith plumbing and hvac" }, expectId: "biz-coppersmith" },
      { label: "coffee shop url", query: { url: "monumentviewcoffee.example.com/" }, expectId: "biz-monument-coffee" },
    ],
    textQueries: [
      { label: "distinctive service", text: "water heater installation", bestId: "svc-water-heater", relevantIds: ["svc-water-heater", "biz-coppersmith"] },
      { label: "name mention", text: "Coppersmith", bestId: "biz-coppersmith", relevantIds: ["biz-coppersmith", "svc-water-heater"] },
      { label: "coffee shop", text: "coffee shop redlands mountain views", bestId: "biz-monument-coffee", relevantIds: ["biz-monument-coffee"] },
      { label: "trade keyword", text: "plumbing contractor grand junction", bestId: "biz-coppersmith", relevantIds: ["biz-coppersmith"] },
      { label: "generic trade", text: "tree service", bestId: "", relevantIds: [] },
    ],
    negativeQueries: [
      { label: "no match", text: "quantum locksmith alpaca ranch" },
      { label: "empty-ish", text: "zzzzqqq" },
    ],
  };
  // Attach the source-identity query separately (needs nested shape).
  (truth.identityQueries[5] as { query: Record<string, unknown> }).query = {
    sourceIdentity: { provider: "sos", providerId: "co-2024-88123" },
  } as unknown as Record<string, string>;

  return { objects, truth };
}
