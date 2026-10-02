#!/usr/bin/env python3
"""LANE-ACQ: generate the 8 sanitized acquisition fixtures.

All identities fictional/redacted. Neutral names, (970) 555-01xx phones in
0180-0199 (unique per fixture), placeholder addresses, .example.com emails,
DEMO_SYNTHETIC marker. Real-world source weirdness is preserved, not cleaned.
No em dashes used anywhere in generated content.
"""
import json, os, hashlib

ROOT = os.path.expanduser("~/workspace/fyd-factory/corpus/fixtures")
MANIFEST_DIR = os.path.expanduser("~/workspace/fyd-factory/corpus/manifests")
OBSERVED = "2026-09-23T18:30:00Z"

def write(slug, html, provenance):
    d = os.path.join(ROOT, slug)
    os.makedirs(d, exist_ok=True)
    hp = os.path.join(d, "index.html")
    with open(hp, "w", encoding="utf-8") as f:
        f.write(html)
    digest = hashlib.sha256(open(hp, "rb").read()).hexdigest()
    provenance = dict(provenance)
    provenance["evidenceHash"] = "sha256:" + digest
    with open(os.path.join(d, "provenance.json"), "w", encoding="utf-8") as f:
        json.dump(provenance, f, indent=2, sort_keys=True)
        f.write("\n")
    return digest

def prov(slug, source_url, weirdness, layers):
    return {
        "marker": "DEMO_SYNTHETIC",
        "fixtureSlug": slug,
        "lane": "LANE-ACQ",
        "sourceUrl": source_url,
        "fetchedAt": OBSERVED,
        "levelUsed": 1,
        "acquisitionSchema": "fyd.proceduralize.AcquiredSource@fyd-factory",
        "structuredLayers": layers,
        "weirdnessPreserved": weirdness,
    }

def page(title, head_extra, body):
    return (
        "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
        f"<title>{title}</title>\n{head_extra}\n</head>\n<body>\n{body}\n</body>\n</html>\n"
    )

def ld(blocks):
    out = []
    for b in blocks:
        out.append('<script type="application/ld+json">' + json.dumps(b, indent=2) + "</script>")
    return "\n".join(out)

SYNTH = "<!-- DEMO_SYNTHETIC: sanitized fixture, all identities fictional -->"

# ---------------------------------------------------------------- 1. rank-math-graph
org_id = "https://redlands-plumbing.example.com/#organization"
rankmath_blocks = [
    {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "Organization", "@id": org_id,
             "name": "Redlands Plumbing Co.",
             "url": "https://redlands-plumbing.example.com/",
             "logo": {"@type": "ImageObject", "@id": "https://redlands-plumbing.example.com/#logo",
                      "url": "https://redlands-plumbing.example.com/logo.png"},
             "sameAs": ["https://www.facebook.com/redlandsplumbing",
                        "https://www.instagram.com/redlandsplumbing"]},
            # Real weirdness: a second SEO plugin emitted a near-duplicate
            # Organization node with an http @id and a slightly different name.
            {"@type": "Organization", "@id": "http://redlands-plumbing.example.com/#organization",
             "name": "Redlands Plumbing Co",
             "url": "http://redlands-plumbing.example.com/"},
            {"@type": ["Plumber", "LocalBusiness"],
             "@id": "https://redlands-plumbing.example.com/#localbusiness",
             "name": "Redlands Plumbing Co.",
             "telephone": "(970) 555-0181",
             "email": "dispatch@redlands-plumbing.example.com",
             "priceRange": "$$",
             "url": "https://redlands-plumbing.example.com/",
             "image": {"@id": "https://redlands-plumbing.example.com/#logo"},
             "address": {"@type": "PostalAddress",
                         "streetAddress": "4100 Placeholder Rd",
                         "addressLocality": "Grand Junction",
                         "addressRegion": "CO",
                         "postalCode": "81501",
                         "addressCountry": "US"},
             "geo": {"@type": "GeoCoordinates", "latitude": 39.06, "longitude": -108.55},
             "hasMap": "https://maps.example.com/?q=Redlands+Plumbing",
             "openingHoursSpecification": [
                 {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
                  "opens": "07:00", "closes": "17:00"},
                 {"@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday",
                  "opens": "08:00", "closes": "12:00"}],
             "department": [{"@id": "https://redlands-plumbing.example.com/#service-drain"}],
             "parentOrganization": {"@id": org_id}},
            {"@type": "Service", "@id": "https://redlands-plumbing.example.com/#service-drain",
             "name": "Drain Cleaning", "provider": {"@id": "https://redlands-plumbing.example.com/#localbusiness"},
             "areaServed": "Mesa County, CO",
             "description": "Clears slow and blocked drains across the home."},
            {"@type": "Service", "@id": "https://redlands-plumbing.example.com/#service-heater",
             "name": "Water Heater Installation", "provider": {"@id": "https://redlands-plumbing.example.com/#localbusiness"},
             "description": "Tank and tankless water heater installs."},
            {"@type": "Service", "@id": "https://redlands-plumbing.example.com/#service-sewer",
             "name": "Sewer Line Repair", "provider": {"@id": "https://redlands-plumbing.example.com/#localbusiness"},
             "description": "Trenchless sewer line repair and replacement."},
            {"@type": "WebSite", "@id": "https://redlands-plumbing.example.com/#website",
             "url": "https://redlands-plumbing.example.com/",
             "name": "Redlands Plumbing Co.",
             "publisher": {"@id": org_id},
             "inLanguage": "en-US"},
            {"@type": "WebPage", "@id": "https://redlands-plumbing.example.com/#webpage",
             "url": "https://redlands-plumbing.example.com/",
             "name": "Plumber in Grand Junction, CO | Redlands Plumbing Co.",
             "isPartOf": {"@id": "https://redlands-plumbing.example.com/#website"},
             "about": {"@id": org_id},
             "author": {"@id": "https://redlands-plumbing.example.com/#author"},
             "breadcrumb": {"@id": "https://redlands-plumbing.example.com/#breadcrumb"},
             "inLanguage": "en-US"},
            {"@type": "BreadcrumbList", "@id": "https://redlands-plumbing.example.com/#breadcrumb",
             "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home",
                                  "item": "https://redlands-plumbing.example.com/"}]},
            {"@type": "Person", "@id": "https://redlands-plumbing.example.com/#author",
             "name": "Casey Morgan", "jobTitle": "Owner",
             "worksFor": {"@id": org_id}},
            {"@type": "Article", "@id": "https://redlands-plumbing.example.com/blog/winterize#article",
             "headline": "How to winterize your outdoor spigots",
             "author": {"@id": "https://redlands-plumbing.example.com/#author"},
             "publisher": {"@id": org_id},
             "datePublished": "2026-09-10"},
        ],
    }
]
rankmath_head = SYNTH + "\n" + ld(rankmath_blocks) + """
<meta property="og:title" content="Plumber in Grand Junction, CO | Redlands Plumbing Co.">
<meta property="og:description" content="Family-run plumbing shop serving Mesa County since 2004.">
<meta property="og:url" content="https://redlands-plumbing.example.com/">
<meta property="og:type" content="website">
<meta property="og:image" content="https://redlands-plumbing.example.com/logo.png">"""
rankmath_body = """
<header><h1>Redlands Plumbing Co.</h1></header>
<main><p>Family-run plumbing shop serving Mesa County since 2004.</p>
<p>Call <a href="tel:+19705550181">(970) 555-0181</a> for same-day service.</p>
<p>Visit us at 4100 Placeholder Rd, Grand Junction, CO 81501.</p></main>"""
write("rank-math-graph",
      page("Plumber in Grand Junction, CO | Redlands Plumbing Co.", rankmath_head, rankmath_body),
      prov("rank-math-graph", "https://redlands-plumbing.example.com/",
           ["Nested @graph with Organization, LocalBusiness (multi @type Plumber+LocalBusiness), "
            "and 3 Service entities cross-referenced by @id",
            "Near-duplicate Organization node emitted by a second SEO plugin "
            "(http vs https @id, name missing the trailing period): entity-resolution stress case",
            "SEO chrome nodes (BreadcrumbList, Article, WebPage, WebSite) that the pipeline "
            "must skip as unsupported evidence, not project as business objects",
            "Person author node leaking a real name pattern (Casey Morgan, Owner) via worksFor @id",
            "openingHoursSpecification with dayOfWeek arrays and a single-day string variant",
            "Private streetAddress present: pipeline must classify and withhold it"],
           ["json-ld(@graph)", "opengraph(thin)", "html-text"]))

# ---------------------------------------------------------------- 2. simple-jsonld
simple_block = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Mesa County Septic Pros",
    "url": "https://mesa-septic.example.com",
    "telephone": "(970) 555-0182",
    "address": {"@type": "PostalAddress",
                "addressLocality": "Fruita", "addressRegion": "CO",
                "postalCode": "81521", "addressCountry": "US"},
    "areaServed": "Mesa County, Colorado",
    "priceRange": "$$",
}
simple_body = """
<header><h1>Mesa County Septic Pros</h1></header>
<main><p>Septic pumping, inspections, and repairs across Mesa County.</p>
<p>Phone: (970) 555-0182. Based in Fruita, Colorado.</p></main>"""
write("simple-jsonld",
      page("Mesa County Septic Pros | Septic Service Fruita CO",
           SYNTH + "\n" + ld([simple_block]), simple_body),
      prov("simple-jsonld", "https://mesa-septic.example.com/",
           ["Single flat LocalBusiness block, minimal fields: the Happy Place shape. "
            "Tests the flat path without any @graph machinery",
            "No hours, no services, no people in structured data: pipeline must not invent them"],
           ["json-ld(flat)", "html-text"]))

# ---------------------------------------------------------------- 3. opengraph-heavy
og_head = SYNTH + """
<meta property="og:title" content="Palisade Orchard HVAC | Heating and Cooling Done Right">
<meta property="og:description" content="Boutique HVAC shop in Palisade. Heat pumps, mini splits, and honest maintenance plans.">
<meta property="og:url" content="https://palisade-hvac.example.com/">
<meta property="og:type" content="business.business">
<meta property="og:site_name" content="Palisade Orchard HVAC">
<meta property="og:locale" content="en_US">
<meta property="og:image" content="https://palisade-hvac.example.com/hero.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="business:contact_data:street_address" content="900 Vineyard Placeholder Ave">
<meta property="business:contact_data:locality" content="Palisade">
<meta property="business:contact_data:region" content="CO">
<meta property="business:contact_data:postal_code" content="81526">
<meta property="business:contact_data:country_name" content="USA">
<meta property="business:contact_data:phone_number" content="(970) 555-0183">
<meta property="business:contact_data:email" content="hello@palisade-hvac.example.com">
<meta property="business:contact_data:website" content="https://palisade-hvac.example.com/">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Palisade Orchard HVAC">
<meta name="twitter:description" content="Boutique HVAC in Palisade. Heat pumps and mini splits.">
<meta name="twitter:image" content="https://palisade-hvac.example.com/hero.jpg">
<link rel="canonical" href="https://palisade-hvac.example.com/">""" + "\n" + ld([{
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://palisade-hvac.example.com/#website",
    "url": "https://palisade-hvac.example.com/",
    "name": "Palisade Orchard HVAC",
}])
og_body = """
<header><h1>Palisade Orchard HVAC</h1></header>
<main><p>Boutique HVAC shop in Palisade. Heat pumps, mini splits, and honest maintenance plans.</p>
<p>Call (970) 555-0183.</p></main>"""
write("opengraph-heavy",
      page("Palisade Orchard HVAC | Heating and Cooling Done Right", og_head, og_body),
      prov("opengraph-heavy", "https://palisade-hvac.example.com/",
           ["Rich OG layer (Facebook business:contact_data extension tags) carries identity, "
            "address, phone, and email; JSON-LD carries only a WebSite node with no business facts",
            "og:description vs twitter:description disagree slightly: layer-priority stress case "
            "inside the same fetch, not across sources",
            "Thin structured data forces the pipeline to grade OG facts below JSON-LD facts "
            "per SOURCE_PRIORITY"],
           ["opengraph(rich)", "json-ld(WebSite-only)", "twitter-card", "html-text"]))

# ---------------------------------------------------------------- 4. metadata-poor
poor_body = """
<header><h1>Grand Valley Appliance Repair</h1></header>
<main>
<p>We fix washers, dryers, ovens, and dishwashers. Family owned since 2011.</p>
<p>Give us a ring at 970.555.0184 and we will get you on the schedule.</p>
<p>Our shop is at 2200 Fake Street in Clifton, CO 81520, right off the highway.</p>
<p>Hours: Mon-Fri 8am to 6pm, Saturday by appointment, closed Sundays.</p>
<p>Email terry@grandvalley-appliance.example.com for parts questions.</p>
</main>
<footer><p>Grand Valley Appliance Repair. Serving Clifton and the Grand Valley.</p></footer>"""
write("metadata-poor",
      page("Grand Valley Appliance Repair - Home",
           SYNTH + '\n<meta name="generator" content="OldSiteBuilder 2.1">', poor_body),
      prov("metadata-poor", "https://grandvalley-appliance.example.com/",
           ["Almost no structured metadata: no JSON-LD, no OG, no twitter tags. "
            "Facts live only in raw text fields",
            "Phone written with dots (970.555.0184), address embedded in a sentence, "
            "hours in prose with a Saturday-by-appointment exception",
            "Tests the lowest tier: html sourceType facts, the weakest per SOURCE_PRIORITY"],
           ["html-text-only"]))

# ---------------------------------------------------------------- 5. multi-location
locs = [
    ("Grand Junction", "Blue Sky HVAC", "Grand Junction"),
    ("Fruita", "Blue Sky HVAC - Fruita", "Fruita"),
    ("Redlands", "BlueSky HVAC Redlands", "Grand Junction"),
    ("Palisade", "BLUE SKY HVAC (Palisade)", "Palisade"),
]
loc_nodes = [{
    "@type": "Organization", "@id": "https://bluesky-hvac.example.com/#organization",
    "name": "Blue Sky HVAC", "url": "https://bluesky-hvac.example.com/",
}]
for i, (key, name, town) in enumerate(locs, start=1):
    loc_nodes.append({
        "@type": "HVACBusiness", "@id": f"https://bluesky-hvac.example.com/#location-{i}",
        "name": name,
        "telephone": "(970) 555-0185",
        "email": "service@bluesky-hvac.example.com",
        "url": f"https://bluesky-hvac.example.com/locations/{key.lower()}/",
        "address": {"@type": "PostalAddress",
                    "streetAddress": f"{100+i} Placeholder Blvd",
                    "addressLocality": town, "addressRegion": "CO",
                    "postalCode": "81501", "addressCountry": "US"},
        "parentOrganization": {"@id": "https://bluesky-hvac.example.com/#organization"},
        "openingHours": "Mo-Fr 08:00-17:00",
    })
multi_body = "<header><h1>Blue Sky HVAC</h1></header><main><p>Four shops across the valley. Call (970) 555-0185.</p><ul>" + "".join(
    f"<li>{name}: {town}</li>" for _, name, town in locs) + "</ul></main>"
write("multi-location",
      page("Blue Sky HVAC | 4 Valley Locations",
           SYNTH + "\n" + ld([{"@context": "https://schema.org", "@graph": loc_nodes}]),
           multi_body),
      prov("multi-location", "https://bluesky-hvac.example.com/",
           ["4 location entities with slightly inconsistent naming: missing spaces "
            "('BlueSky HVAC Redlands'), suffix style drift ('- Fruita' vs '(Palisade)' vs bare), "
            "all-caps variant. Same phone and parentOrganization across all four",
            "Location 3 sits in the Redlands (part of Grand Junction) but its addressLocality "
            "says 'Grand Junction': locality-label drift vs marketing label",
            "parentOrganization @id back-reference on every location: graph-cycle safety check"],
           ["json-ld(@graph)", "html-text"]))

# ---------------------------------------------------------------- 6. person-heavy
people = [
    {"name": "Dana Whitfield", "jobTitle": "Owner", "telephone": "(970) 555-0186",
     "email": "dana@clifton-electric.example.com", "works": True},
    {"name": "Marcus Webb", "jobTitle": "Office Manager", "works": True},
    {"name": "Priya Nair", "jobTitle": "Lead Electrician", "works": True},
    {"name": "Tom Becker", "jobTitle": "Electrician", "works": True},
    {"name": "Luis Herrera", "jobTitle": "Electrician", "works": True},
    {"name": "Grace Okafor", "jobTitle": "Apprentice Electrician", "works": True},
    {"name": "Sam Delgado", "jobTitle": "Sales Estimator", "works": True},
    # Weirdness: a Person with a role but no name (real sites do this).
    {"jobTitle": "Dispatcher", "works": True},
    {"name": "Nina Petrova", "jobTitle": "Bookkeeper", "works": True},
    {"name": "Mr. Alan Vance", "jobTitle": "Founder (retired)", "works": False,
     "note": "honorific baked into the name string"},
    {"name": "Jess Kim", "jobTitle": "Marketing Coordinator", "works": False,
     "note": "orphan: no worksFor reference at all"},
    {"name": "Rosa Jimenez", "jobTitle": "Customer Service Rep",
     "sameAs": ["https://www.linkedin.com/in/rosa-jimenez-example"], "works": True},
]
person_nodes = [{
    "@type": "ElectricalContractor",
    "@id": "https://clifton-electric.example.com/#business",
    "name": "Clifton Electric LLC",
    "telephone": "(970) 555-0186",
    "url": "https://clifton-electric.example.com/",
    "address": {"@type": "PostalAddress", "addressLocality": "Clifton",
                "addressRegion": "CO", "postalCode": "81520", "addressCountry": "US"},
}]
for i, p in enumerate(people, start=1):
    node = {"@type": "Person", "@id": f"https://clifton-electric.example.com/#person-{i}"}
    if "name" in p:
        node["name"] = p["name"]
    node["jobTitle"] = p["jobTitle"]
    if p.get("telephone"):
        node["telephone"] = p["telephone"]
    if p.get("email"):
        node["email"] = p["email"]
    if p.get("sameAs"):
        node["sameAs"] = p["sameAs"]
    if p["works"]:
        node["worksFor"] = {"@id": "https://clifton-electric.example.com/#business"}
    if p.get("note"):
        node["description"] = p["note"]
    person_nodes.append(node)
assert sum(1 for n in person_nodes if n["@type"] == "Person") == 12
person_body = ("<header><h1>Clifton Electric LLC</h1></header><main>"
               "<h2>Meet the crew</h2><ul>" +
               "".join(f"<li>{p.get('name', '(name not listed)')} - {p['jobTitle']}</li>" for p in people) +
               "</ul><p>Call (970) 555-0186.</p></main>")
write("person-heavy",
      page("Clifton Electric LLC | Meet the Crew",
           SYNTH + "\n" + ld([{"@context": "https://schema.org", "@graph": person_nodes}]),
           person_body),
      prov("person-heavy", "https://clifton-electric.example.com/",
           ["12 Person entities with varying role completeness: full contact details on the owner, "
            "name+title only on most staff, one Person with a jobTitle and NO name "
            "(real pattern: 'Dispatcher' with no name listed)",
            "Honorific baked into a name string ('Mr. Alan Vance'): name-normalization stress",
            "One orphan Person with no worksFor reference: must not attach to the business "
            "by guessing",
            "A sameAs LinkedIn URL on one person: external-identity candidate, not a fact"],
           ["json-ld(@graph)", "html-text"]))

# ---------------------------------------------------------------- 7. service-heavy
base_services = [
    ("Furnace Repair", "Title"), ("furnace tune-up", "lower"), ("FURNACE REPLACEMENT", "upper"),
    ("AC Tune-Up", "Title"), ("A/C Tune Up", "Title"), ("Air Conditioner Tune-Up", "Title"),
    ("ac repair", "lower"), ("Heat Pump Service", "Title"), ("HEAT PUMP INSTALL", "upper"),
    ("thermostat replacement", "lower"), ("Duct Cleaning", "Title"), ("DUCT SEALING", "upper"),
    ("gas line repair", "lower"), ("Sump Pump Install", "Title"), ("Garbage Disposal Replacement", "Title"),
    ("toilet repair", "lower"), ("Faucet Installation", "Title"), ("WATER SOFTENER INSTALL", "upper"),
    ("boiler service", "lower"), ("Mini Split Install", "Title"), ("air quality testing", "lower"),
    ("Carbon Monoxide Testing", "Title"), ("pipe leak detection", "lower"), ("Fixture Replacement", "Title"),
    ("water filtration", "lower"), ("Humidifier Install", "Title"), ("DEHUMIDIFIER INSTALL", "upper"),
    ("vent cleaning", "lower"), ("Exhaust Fan Install", "Title"), ("water pressure fix", "lower"),
    ("Backflow Testing", "Title"), ("hydronic heating", "lower"), ("Radiant Floor Install", "Title"),
    ("emergency plumbing", "lower"), ("Camera Inspection", "Title"),
]
assert len(base_services) == 35
svc_nodes = [{
    "@type": "Organization", "@id": "https://delta-mechanical.example.com/#organization",
    "name": "Delta Mechanical Services", "url": "https://delta-mechanical.example.com/",
    "telephone": "(970) 555-0187",
    "email": "office@delta-mechanical.example.com",
}]
for i, (name, _case) in enumerate(base_services, start=1):
    node = {"@type": "Service",
            "@id": f"https://delta-mechanical.example.com/#service-{i}",
            "name": name,
            "provider": {"@id": "https://delta-mechanical.example.com/#organization"}}
    if i % 3 == 0:
        node["description"] = f"Professional {name.lower()} for homes and small businesses."
    if i % 5 == 0:
        node["areaServed"] = "Delta County, CO"
    svc_nodes.append(node)
# Real weirdness: the same offering ALSO typed as a Product by the theme.
svc_nodes.append({"@type": "Product",
                  "@id": "https://delta-mechanical.example.com/#product-softener",
                  "name": "WATER SOFTENER INSTALL",
                  "brand": {"@id": "https://delta-mechanical.example.com/#organization"}})
assert sum(1 for n in svc_nodes if n["@type"] == "Service") == 35
svc_body = ("<header><h1>Delta Mechanical Services</h1></header><main>"
            "<p>Full-service mechanical contractor. Call (970) 555-0187.</p>"
            "<h2>Services</h2><ul>" +
            "".join(f"<li>{n}</li>" for n, _ in base_services) + "</ul></main>")
write("service-heavy",
      page("Delta Mechanical Services | All Services",
           SYNTH + "\n" + ld([{"@context": "https://schema.org", "@graph": svc_nodes}]),
           svc_body),
      prov("service-heavy", "https://delta-mechanical.example.com/",
           ["35 Service entities with inconsistent naming and casing: Title, lower, UPPER mixed; "
            "'AC Tune-Up' vs 'A/C Tune Up' vs 'Air Conditioner Tune-Up' as three separate nodes "
            "for near-identical offerings",
            "Same offering typed twice: 'WATER SOFTENER INSTALL' as both Service and Product "
            "(theme double-emit): type-reconciliation stress",
            "Sparse optional fields (description on every 3rd, areaServed on every 5th): "
            "no uniform template to lean on"],
           ["json-ld(@graph)", "html-text"]))

# ---------------------------------------------------------------- 8. conflicting-source
conflict_head = SYNTH + "\n" + ld([{
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://rifle-appliance.example.com/#business",
    "name": "Rifle Appliance Repair",
    "telephone": "(970) 555-0188",
    "url": "https://rifle-appliance.example.com/",
    "address": {"@type": "PostalAddress", "addressLocality": "Rifle",
                "addressRegion": "CO", "postalCode": "81650", "addressCountry": "US"},
    "openingHoursSpecification": [
        {"@type": "OpeningHoursSpecification",
         "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
         "opens": "08:00", "closes": "17:00"}],
}] ) + """
<meta property="og:title" content="Rifle Appliance Repair">
<meta property="og:description" content="Appliance repair in Rifle, CO.">
<meta property="og:url" content="https://rifle-appliance.example.com/">
<meta property="og:type" content="business.business">
<meta property="business:contact_data:phone_number" content="(970) 555-0189">
<meta property="business:contact_data:locality" content="Rifle">
<meta property="business:contact_data:region" content="CO">
<meta name="opening_hours" content="Mo-Sa 08:00-18:00">"""
conflict_body = """
<header><h1>Rifle Appliance Repair</h1></header>
<main><p>Appliance repair in Rifle, Colorado.</p>
<p>Call us at (970) 555-0188.</p>
<p>Open Monday through Friday, 8am to 5pm.</p></main>"""
write("conflicting-source",
      page("Rifle Appliance Repair", conflict_head, conflict_body),
      prov("conflicting-source", "https://rifle-appliance.example.com/",
           ["Two sources disagree on phone AND hours inside one fetch; both preserved, "
            "neither silently dropped: JSON-LD says (970) 555-0188 / Mo-Fr 08:00-17:00; "
            "OG/meta layer says (970) 555-0189 / Mo-Sa 08:00-18:00",
            "Provenance sidecar records both values with their layers: the fixture "
            "refuses to pick a winner",
            "Known pipeline behavior to verify in validation: SOURCE_PRIORITY resolves "
            "json-ld over opengraph over html-meta with no conflict record in PipelineReport"],
           ["json-ld(flat)", "opengraph", "html-meta", "html-text"]))

print("fixtures written to", ROOT)
