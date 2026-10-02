"""One-shot edit: extend Service projection + add Offer projection in proceduralizer.ts.

Idempotent guard: exits 0 without changes if the new block is already present.
"""
import io
import sys

P = "/home/nolan/projects/ping/src/fyd/proceduralize/proceduralizer.ts"
s = io.open(P, encoding="utf-8").read()

if "Service extraction lane (2026-09-21)" in s:
    print("already applied; no changes")
    sys.exit(0)

old = """  // -- Services and products: Service/Product entities (RUN-NOTES #8).
  for (const e of entities) {
    const isService = e.types.includes("Service");
    const isProduct = e.types.includes("Product");
    if (!isService && !isProduct) continue;
    const name = fieldOf(entityFields, e.key, "title")?.value;
    if (!name || asString(name) === "") continue;
    const kind = isService ? "service" : "product";
    const objId = `${businessId}-${kind}-${sha256Hex(e.key).slice(0, 12)}`;
    objectIdByEntityKey.set(e.key, objId);
    const sFields: Record<string, string | string[]> = { name: asString(name) };
    const sClasses: Record<string, FactClass> = { name: "DIRECT_FACT" };
    const desc = fieldOf(entityFields, e.key, "description")?.value;
    if (desc) {
      sFields["description"] = asString(desc);
      sClasses["description"] = "DIRECT_FACT";
    }
    mkObject(
      objId,
      `ping.social.${kind}@1`,
      asString(name),
      `${isService ? "Service" : "Product"} described in the website's structured data.`,
      { ...sFields, claimKind: "website_statement" },
      { ...sClasses, claimKind: "DIRECT_FACT" },
    );
    mkRel(businessId, "offers", objId, `proceduralizer:project:${kind}:${e.key}`);
  }
"""

new = """  // -- Services and products: Service/Product entities (RUN-NOTES #8).
  //    Service extraction lane (2026-09-21): service_type and area_served
  //    literals ride along as DIRECT_FACT fields when the JSON-LD carries
  //    them. The offers edge stays the product-facing summary edge
  //    (generator ROLE_PREDICATES accepts provides|offers).
  for (const e of entities) {
    const isService = e.types.includes("Service");
    const isProduct = e.types.includes("Product");
    if (!isService && !isProduct) continue;
    const name = fieldOf(entityFields, e.key, "title")?.value;
    if (!name || asString(name) === "") continue;
    const kind = isService ? "service" : "product";
    const objId = `${businessId}-${kind}-${sha256Hex(e.key).slice(0, 12)}`;
    objectIdByEntityKey.set(e.key, objId);
    const sFields: Record<string, string | string[]> = { name: asString(name) };
    const sClasses: Record<string, FactClass> = { name: "DIRECT_FACT" };
    const desc = fieldOf(entityFields, e.key, "description")?.value;
    if (desc) {
      sFields["description"] = asString(desc);
      sClasses["description"] = "DIRECT_FACT";
    }
    if (isService) {
      const serviceType = fieldOf(entityFields, e.key, "service_type")?.value;
      if (serviceType) {
        sFields["service_type"] = asString(serviceType);
        sClasses["service_type"] = "DIRECT_FACT";
      }
      const areaServed = allValues(entityFields, e.key, "area_served");
      if (areaServed.length > 0) {
        sFields["area_served"] = areaServed.length === 1 ? areaServed[0] : areaServed;
        sClasses["area_served"] = "DIRECT_FACT";
      }
    }
    mkObject(
      objId,
      `ping.social.${kind}@1`,
      asString(name),
      `${isService ? "Service" : "Product"} described in the website's structured data.`,
      { ...sFields, claimKind: "website_statement" },
      { ...sClasses, claimKind: "DIRECT_FACT" },
    );
    mkRel(businessId, "offers", objId, `proceduralizer:project:${kind}:${e.key}`);
  }

  // -- Offers: Offer entities (Service extraction lane, 2026-09-21). An
  //    Offer is the evidence node behind makesOffer/itemOffered chains:
  //    Business -makes_offer-> Offer -item_offered-> Service. Projected
  //    when it has a name, a description, or an itemOffered link; a bare
  //    node with none of those is noise, not evidence. The schema id
  //    ping.social.offer@1 was already known (types.ts) and already
  //    answerable (ask-composer); emission was the missing piece.
  for (const e of entities) {
    if (!e.types.includes("Offer")) continue;
    const name = fieldOf(entityFields, e.key, "title")?.value;
    const desc = fieldOf(entityFields, e.key, "description")?.value;
    const itemOffered = (opts.relationships ?? []).some(
      (r) => r.subjectKey === e.key && r.property === "itemOffered",
    );
    if ((!name || asString(name) === "") && !desc && !itemOffered) continue;
    const objId = `${businessId}-offer-${sha256Hex(e.key).slice(0, 12)}`;
    objectIdByEntityKey.set(e.key, objId);
    const oFields: Record<string, string | string[]> = {};
    const oClasses: Record<string, FactClass> = {};
    if (name && asString(name) !== "") {
      oFields["name"] = asString(name);
      oClasses["name"] = "DIRECT_FACT";
    }
    if (desc) {
      oFields["description"] = asString(desc);
      oClasses["description"] = "DIRECT_FACT";
    }
    mkObject(
      objId,
      "ping.social.offer@1",
      asString(name ?? "Offer"),
      `Offer described in the website's structured data.`,
      { ...oFields, claimKind: "website_statement" },
      { ...oClasses, claimKind: "DIRECT_FACT" },
    );
  }
"""

assert s.count(old) == 1, "services-loop anchor not found exactly once"
s = s.replace(old, new)
io.open(P, "w", encoding="utf-8").write(s)
print("proceduralizer.ts updated")
