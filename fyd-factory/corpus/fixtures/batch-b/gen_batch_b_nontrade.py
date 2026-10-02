#!/usr/bin/env python3
"""F2-CORPUS-B (resumed): generate 4 non-trade synthetic ObjectGraph fixtures.

Verticals: cafe/restaurant, retail shop, dental practice (professional service,
not a consultancy), hospitality inn. Each graph varies semantics on purpose:
menu items vs products vs care services vs rooms, people mixes, evidence types,
article roles, media needs, and preserved (never smoothed) source conflicts.

All businesses, people, addresses, phones, and URLs are fictional. No real
identity. No invented credentials. Demo/synthetic only, local use.

Phones use the (970) 555-01xx block reserved by the corpus validator and are
unique across the corpus: 0120, 0125, 0126, 0133 (existing: 0121, 0124, 0129,
0134, 0142).
"""
import json
import os

OUT = os.path.dirname(os.path.abspath(__file__))
TS = "2026-09-23T19:45:00Z"
CTRL = "identity_fyd_fixture_batch_b"
MARKER = "DEMO_SYNTHETIC"

# NOTE: plain ASCII only in all copy. No em dashes, no en dashes.


def obj(oid, schema, title, description, fields, site_ref):
    f = dict(fields)
    f["claimKind"] = "synthetic_statement"
    return {
        "id": oid,
        "schema": schema,
        "controllerId": CTRL,
        "visibility": "public",
        "title": title,
        "description": description,
        "fields": f,
        "createdAt": TS,
        "updatedAt": TS,
        "provenance": {
            "kind": "synthetic",
            "ref": "fixture:synthetic:%s" % site_ref,
            "derivedAt": TS,
        },
    }


def rel(rid, subject, predicate, objid, site_id, evidence):
    return {
        "id": rid,
        "subject": subject,
        "predicate": predicate,
        "object": objid,
        "status": "active",
        "createdAt": TS,
        "evidenceRef": "corpus:batch-b:%s:%s" % (site_id, evidence),
    }


def envelope(site_id, variant, objects, relationships):
    return {
        "site_id": site_id,
        "redacted": True,
        "synthetic_marker": MARKER,
        "variant": variant,
        "fixture_batch": "b",
        "generated_at": TS,
        "graph": {"objects": objects, "relationships": relationships},
    }


# ---------------------------------------------------------------- cafe ----
def build_cafe():
    sid = "f2b-copper-kettle-cafe"
    o, r = [], []
    n = [0]

    def add_rel(subject, predicate, objid, evidence):
        n[0] += 1
        r.append(rel("rel-%s-%04d" % (sid, n[0]), subject, predicate, objid, sid, evidence))

    biz = "f2b-cafe-biz"
    o.append(obj(biz, "ping.social.business@1", "Copper Kettle Cafe",
                 "Synthetic demo cafe in Grand Junction, CO. Breakfast, lunch, and espresso.",
                 {
                     "phone": "(970) 555-0120",
                     "email": "hello@copperkettle.example.com",
                     "website": "https://copperkettle.example.com",
                     "address": "1245 Synthetic Main St, Grand Junction, CO 81501",
                     "hours": "Mo,Tu,We,Th,Fr 06:30-14:00; Sa 07:00-13:00; Su closed",
                     "price_range": "$",
                     "serves": ["breakfast", "lunch", "espresso"],
                     "area_served": ["Grand Junction"],
                     "conflicts": [
                         "HOURS CONFLICT: website claims Mo-Fr 06:30-14:00, "
                         "directory listing (reserve.example.com) claims "
                         "Mo-Fr 07:00-15:00. Both claims preserved; no "
                         "canonical hours asserted."
                     ],
                 }, sid))
    loc = "f2b-cafe-loc-gj"
    o.append(obj(loc, "ping.social.location@1", "Grand Junction, CO 81501",
                 "Coarse public location claim for the synthetic cafe.",
                 {"address_locality": "Grand Junction", "address_region": "CO",
                  "postal_code": "81501", "address_country": "US",
                  "locality": "Grand Junction, CO 81501"}, sid))
    add_rel(biz, "located_at", loc, "headquarters")

    for pid, name, role in [
        ("f2b-cafe-person-owner", "Marisol Vega", "Owner"),
        ("f2b-cafe-person-barista", "Devon Park", "Head Barista"),
        ("f2b-cafe-person-pastry", "June Calloway", "Pastry Chef"),
    ]:
        o.append(obj(pid, "ping.social.person@1", name,
                     "Person listed for the synthetic cafe: %s, %s." % (name, role),
                     {"name": name, "role": role}, sid))
        add_rel(pid, "works_for", biz, "team-page")

    menu = [
        ("f2b-cafe-menu-01", "Espresso Bar", "Double shots, lattes, mochas, and seasonal syrups.", "$3-6", "vegetarian"),
        ("f2b-cafe-menu-02", "Green Chile Breakfast Burrito", "Eggs, potatoes, and roasted green chile in a flour tortilla.", "$11", "spicy"),
        ("f2b-cafe-menu-03", "Huckleberry Pancakes", "Buttermilk pancakes with huckleberry compote. Seasonal.", "$13", "seasonal; vegetarian"),
        ("f2b-cafe-menu-04", "Quinoa Power Bowl", "Quinoa, roasted vegetables, avocado, and tahini.", "$12", "vegan option"),
        ("f2b-cafe-menu-05", "Roast Turkey Club", "House-roasted turkey, bacon, lettuce, tomato on sourdough.", "$12", "none"),
        ("f2b-cafe-menu-06", "Seasonal Soup and Grilled Cheese", "Rotating soup with a three-cheese grilled sandwich.", "$11", "vegetarian"),
        ("f2b-cafe-menu-07", "Pastry Case", "Croissants, muffins, and scones baked each morning.", "$4-6", "vegetarian"),
        ("f2b-cafe-menu-08", "Cold Brew Flight", "Three single-origin cold brews over ice.", "$9", "none"),
    ]
    for mid, name, desc, price, dietary in menu:
        o.append(obj(mid, "ping.social.service@1", name, desc,
                     {"name": name, "description": desc, "category": "menu",
                      "price": price, "dietary": dietary}, sid))
        add_rel(biz, "offers", mid, "menu:" + mid.rsplit("-", 1)[-1])

    for pid_, headline, text, media in [
        ("f2b-cafe-post-01", "Saturday acoustic music returns October 3",
         "Local duo Juniper Line plays the patio 9am to noon. No cover.",
         "https://media.example.com/f2b-cafe/patio-music.jpg"),
        ("f2b-cafe-post-02", "Fall drink menu drops Monday",
         "Maple oat latte, spiced honey cappuccino, and apple cider cold brew join the board.",
         "https://media.example.com/f2b-cafe/fall-drinks.jpg"),
    ]:
        o.append(obj(pid_, "ping.social.post@1", headline, text,
                     {"headline": headline, "text": text, "posted_at": "2026-09-20",
                      "media_url": media}, sid))
        add_rel(biz, "publishes", pid_, "social-post")

    for aid, headline, dek in [
        ("f2b-cafe-article-01", "From food truck to Main Street: our story",
         "How a 2019 breakfast cart became a Grand Junction morning ritual."),
        ("f2b-cafe-article-02", "Allergen and dietary guide",
         "Which menu items are gluten-free, vegan, or nut-free, and how to ask."),
    ]:
        o.append(obj(aid, "ping.social.article@1", headline, dek,
                     {"headline": headline, "dek": dek,
                      "url": "https://copperkettle.example.com/%s" % aid}, sid))
        add_rel(biz, "publishes", aid, "site-article")

    ext1 = "f2b-cafe-ext-instagram"
    o.append(obj(ext1, "ping.social.external_identity@1",
                 "https://social.example.com/copperkettle",
                 "External social profile placeholder for the synthetic cafe.",
                 {"url": "https://social.example.com/copperkettle",
                  "platform": "social.example.com"}, sid))
    add_rel(biz, "links_to", ext1, "social-profile")

    ext2 = "f2b-cafe-ext-reserve"
    o.append(obj(ext2, "ping.social.external_identity@1",
                 "https://reserve.example.com/copper-kettle-cafe",
                 "Directory listing placeholder. Carries the conflicting hours claim.",
                 {"url": "https://reserve.example.com/copper-kettle-cafe",
                  "platform": "reserve.example.com",
                  "hours": "Mo,Tu,We,Th,Fr 07:00-15:00; Sa 07:30-13:30; Su closed",
                  "phone": "(970) 555-0120"}, sid))
    add_rel(biz, "links_to", ext2, "directory-listing")

    return envelope(sid, "cafe: menu-centric graph, hours conflict preserved", o, r)


# --------------------------------------------------------------- retail ---
def build_retail():
    sid = "f2b-mesa-iron-hardware"
    o, r = [], []
    n = [0]

    def add_rel(subject, predicate, objid, evidence):
        n[0] += 1
        r.append(rel("rel-%s-%04d" % (sid, n[0]), subject, predicate, objid, sid, evidence))

    biz = "f2b-retail-biz"
    o.append(obj(biz, "ping.social.business@1", "Mesa Iron Hardware",
                 "Synthetic demo independent hardware store in Fruita, CO.",
                 {
                     "phone": "(970) 555-0125",
                     "email": "shop@mesairon.example.com",
                     "website": "https://mesairon.example.com",
                     "address": "890 Synthetic Railroad Ave, Fruita, CO 81521",
                     "hours": "Mo,Tu,We,Th,Fr,Sa 07:00-18:00; Su 09:00-15:00",
                     "price_range": "$$",
                     "departments": ["tools", "garden", "paint", "outdoor", "gifts"],
                     "area_served": ["Fruita", "Loma", "Mack"],
                     "conflicts": [
                         "PRICE CONFLICT: 12-inch cast iron skillet listed at "
                         "$42 on the website and $46 on the marketplace "
                         "listing (sell.example.com). Both claims preserved."
                     ],
                 }, sid))
    loc = "f2b-retail-loc-fruita"
    o.append(obj(loc, "ping.social.location@1", "Fruita, CO 81521",
                 "Coarse public location claim for the synthetic hardware store.",
                 {"address_locality": "Fruita", "address_region": "CO",
                  "postal_code": "81521", "address_country": "US",
                  "locality": "Fruita, CO 81521"}, sid))
    add_rel(biz, "located_at", loc, "storefront")

    for pid, name, role in [
        ("f2b-retail-person-owner", "Ray Delgado", "Owner"),
        ("f2b-retail-person-floor", "Sam Whitaker", "Floor Manager"),
    ]:
        o.append(obj(pid, "ping.social.person@1", name,
                     "Person listed for the synthetic hardware store: %s, %s." % (name, role),
                     {"name": name, "role": role}, sid))
        add_rel(pid, "works_for", biz, "team-page")

    products = [
        ("f2b-retail-product-01", "Cast Iron Skillet 12in", "Pre-seasoned cast iron skillet for stovetop and campfire.", "$42", "cookware"),
        ("f2b-retail-product-02", "Garden Tool Set 5pc", "Trowel, transplanter, cultivator, weeder, and gloves.", "$65", "garden"),
        ("f2b-retail-product-03", "LED Shop Light 5000 lumen", "Linkable shop light with pull chain.", "$38", "electrical"),
        ("f2b-retail-product-04", "Work Gloves 3-pack", "Leather palm work gloves, assorted sizes.", "$18", "safety"),
        ("f2b-retail-product-05", "Bar and Chain Oil 1 gal", "All-season chainsaw bar and chain oil.", "$16", "outdoor power"),
        ("f2b-retail-product-06", "Local Wildflower Honey 16oz", "Raw honey from a Fruita apiary, sold in the gift corner.", "$12", "gifts"),
    ]
    for prid, name, desc, price, dept in products:
        o.append(obj(prid, "ping.social.service@1", name, desc,
                     {"name": name, "description": desc, "category": "product",
                      "price": price, "department": dept,
                      "availability": "in-store"}, sid))
        add_rel(biz, "offers", prid, "catalog:" + prid.rsplit("-", 1)[-1])

    for pid_, headline, text, media in [
        ("f2b-retail-post-01", "Fall tool tune-up clinic this Saturday",
         "Free blade sharpening and small-engine checkups, 9am to noon. Bring one tool.",
         "https://media.example.com/f2b-retail/tuneup-clinic.jpg"),
        ("f2b-retail-post-02", "Winterizing supplies just landed",
         "Pipe insulation, faucet covers, and ice melt are on the endcap by the register.",
         "https://media.example.com/f2b-retail/winterizing.jpg"),
    ]:
        o.append(obj(pid_, "ping.social.post@1", headline, text,
                     {"headline": headline, "text": text, "posted_at": "2026-09-21",
                      "media_url": media}, sid))
        add_rel(biz, "publishes", pid_, "social-post")

    aid = "f2b-retail-article-01"
    o.append(obj(aid, "ping.social.article@1",
                 "Winterizing your swamp cooler: a buying guide",
                 "What to buy and in what order before the first freeze.",
                 {"headline": "Winterizing your swamp cooler: a buying guide",
                  "dek": "What to buy and in what order before the first freeze.",
                  "url": "https://mesairon.example.com/guides/swamp-cooler"}, sid))
    add_rel(biz, "publishes", aid, "buying-guide")

    ext1 = "f2b-retail-ext-instagram"
    o.append(obj(ext1, "ping.social.external_identity@1",
                 "https://social.example.com/mesairon",
                 "External social profile placeholder for the synthetic hardware store.",
                 {"url": "https://social.example.com/mesairon",
                  "platform": "social.example.com"}, sid))
    add_rel(biz, "links_to", ext1, "social-profile")

    ext2 = "f2b-retail-ext-marketplace"
    o.append(obj(ext2, "ping.social.external_identity@1",
                 "https://sell.example.com/mesa-iron-hardware",
                 "Marketplace listing placeholder. Carries the conflicting skillet price.",
                 {"url": "https://sell.example.com/mesa-iron-hardware",
                  "platform": "sell.example.com",
                  "product": "Cast Iron Skillet 12in",
                  "price": "$46"}, sid))
    add_rel(biz, "links_to", ext2, "marketplace-listing")

    return envelope(sid, "retail: product-catalog graph, price conflict preserved", o, r)


# --------------------------------------------------------------- dental ---
def build_dental():
    sid = "f2b-canyon-view-dental"
    o, r = [], []
    n = [0]

    def add_rel(subject, predicate, objid, evidence):
        n[0] += 1
        r.append(rel("rel-%s-%04d" % (sid, n[0]), subject, predicate, objid, sid, evidence))

    biz = "f2b-dental-biz"
    o.append(obj(biz, "ping.social.business@1", "Canyon View Dental",
                 "Synthetic demo dental practice in Palisade, CO. Family and general dentistry.",
                 {
                     "phone": "(970) 555-0126",
                     "email": "frontdesk@canyonviewdental.example.com",
                     "website": "https://canyonviewdental.example.com",
                     "address": "410 Synthetic Peach Ave, Palisade, CO 81526",
                     "hours": "Mo,Tu,We,Th 08:00-17:00; Fr 08:00-13:00; Sa,Su closed",
                     "insurance_accepted": ["DeltaCare Plus", "Mountain Health PPO", "BrightSmile HMO"],
                     "new_patients": "true",
                     "area_served": ["Palisade", "Clifton", "Grand Junction"],
                     "conflicts": [
                         "PHONE CONFLICT: website lists (970) 555-0126; health "
                         "directory listing lists (970) 555-0131. Both "
                         "preserved; do not assume either is current."
                     ],
                 }, sid))
    loc = "f2b-dental-loc-palisade"
    o.append(obj(loc, "ping.social.location@1", "Palisade, CO 81526",
                 "Coarse public location claim for the synthetic dental practice.",
                 {"address_locality": "Palisade", "address_region": "CO",
                  "postal_code": "81526", "address_country": "US",
                  "locality": "Palisade, CO 81526"}, sid))
    add_rel(biz, "located_at", loc, "office")

    for pid, name, role in [
        ("f2b-dental-person-osei", "Dr. Amara Osei", "Owner, Dentist"),
        ("f2b-dental-person-kowalski", "Dr. Ben Kowalski", "Associate Dentist"),
        ("f2b-dental-person-jimenez", "Rosa Jimenez", "Lead Dental Hygienist"),
        ("f2b-dental-person-raman", "Priya Raman", "Office Manager"),
    ]:
        o.append(obj(pid, "ping.social.person@1", name,
                     "Person listed for the synthetic dental practice: %s, %s." % (name, role),
                     {"name": name, "role": role}, sid))
        add_rel(pid, "works_for", biz, "team-page")

    services = [
        ("f2b-dental-service-01", "Exams and Cleanings", "Twice-yearly exams, cleanings, and x-rays.", "preventive"),
        ("f2b-dental-service-02", "Tooth-Colored Fillings", "Composite fillings matched to your tooth shade.", "restorative"),
        ("f2b-dental-service-03", "Dental Crowns", "Porcelain and ceramic crowns, most placed in two visits.", "restorative"),
        ("f2b-dental-service-04", "Root Canal Therapy", "Single-visit root canals with same-week scheduling.", "restorative"),
        ("f2b-dental-service-05", "Clear Aligner Consultations", "Free consultation and 3D smile preview.", "orthodontic"),
        ("f2b-dental-service-06", "Emergency Dental Care", "Same-day slots held daily for toothaches and injuries.", "urgent"),
    ]
    for srid, name, desc, cat in services:
        o.append(obj(srid, "ping.social.service@1", name, desc,
                     {"name": name, "description": desc, "category": cat,
                      "accepting_new_patients": "true"}, sid))
        add_rel(biz, "offers", srid, "care-menu:" + srid.rsplit("-", 1)[-1])

    for aid, headline, dek in [
        ("f2b-dental-article-01", "What to expect at your first visit",
         "Paperwork, x-rays, and the exam, in plain language."),
        ("f2b-dental-article-02", "Dental sealants: a parent guide",
         "What sealants do, when kids need them, and what they cost."),
    ]:
        o.append(obj(aid, "ping.social.article@1", headline, dek,
                     {"headline": headline, "dek": dek,
                      "url": "https://canyonviewdental.example.com/%s" % aid}, sid))
        add_rel(biz, "publishes", aid, "patient-education")

    pid_ = "f2b-dental-post-01"
    o.append(obj(pid_, "ping.social.post@1", "Back-to-school checkup slots now open",
                 "Evening appointments added through October for school-age kids.",
                 {"headline": "Back-to-school checkup slots now open",
                  "text": "Evening appointments added through October for school-age kids.",
                  "posted_at": "2026-09-18",
                  "media_url": "https://media.example.com/f2b-dental/checkup-slots.jpg"}, sid))
    add_rel(biz, "publishes", pid_, "social-post")

    ext1 = "f2b-dental-ext-healthdir"
    o.append(obj(ext1, "ping.social.external_identity@1",
                 "https://healthdir.example.com/canyon-view-dental",
                 "Health directory listing placeholder. Carries the conflicting phone claim.",
                 {"url": "https://healthdir.example.com/canyon-view-dental",
                  "platform": "healthdir.example.com",
                  "phone": "(970) 555-0131"}, sid))
    add_rel(biz, "links_to", ext1, "directory-listing")

    ext2 = "f2b-dental-ext-instagram"
    o.append(obj(ext2, "ping.social.external_identity@1",
                 "https://social.example.com/canyonviewdental",
                 "External social profile placeholder for the synthetic dental practice.",
                 {"url": "https://social.example.com/canyonviewdental",
                  "platform": "social.example.com"}, sid))
    add_rel(biz, "links_to", ext2, "social-profile")

    return envelope(sid, "professional service: credentialed team graph, phone conflict preserved", o, r)

# ----------------------------------------------------------------- inn ----
def build_inn():
    sid = "f2b-willow-creek-inn"
    o, r = [], []
    n = [0]

    def add_rel(subject, predicate, objid, evidence):
        n[0] += 1
        r.append(rel("rel-%s-%04d" % (sid, n[0]), subject, predicate, objid, sid, evidence))

    biz = "f2b-inn-biz"
    o.append(obj(biz, "ping.social.business@1", "Willow Creek Inn",
                 "Synthetic demo bed and breakfast near Collbran, CO. Four rooms plus a cabin.",
                 {
                     "phone": "(970) 555-0133",
                     "email": "stay@willowcreekinn.example.com",
                     "website": "https://willowcreekinn.example.com",
                     "address": "77 Synthetic Creek Rd, Collbran, CO 81624",
                     "check_in": "15:00",
                     "check_out": "11:00",
                     "breakfast_included": "true",
                     "rooms_total": "4",
                     "area_served": ["Collbran", "De Beque", "Plateau Valley"],
                     "conflicts": [
                         "CHECK-IN CONFLICT: stay.example.com listing states "
                         "check-in 15:00; travel.example.com listing states "
                         "check-in 16:00. Both preserved.",
                         "SEASONAL CLOSURE CONFLICT: stay.example.com lists "
                         "winter closure Jan 5 to Feb 20; travel.example.com "
                         "lists Jan 10 to Feb 15. Both preserved.",
                     ],
                 }, sid))
    loc = "f2b-inn-loc-collbran"
    o.append(obj(loc, "ping.social.location@1", "Collbran, CO 81624",
                 "Coarse public location claim for the synthetic inn.",
                 {"address_locality": "Collbran", "address_region": "CO",
                  "postal_code": "81624", "address_country": "US",
                  "locality": "Collbran, CO 81624"}, sid))
    add_rel(biz, "located_at", loc, "property")

    for pid, name, role in [
        ("f2b-inn-person-hank", "Hank Mercer", "Innkeeper"),
        ("f2b-inn-person-dot", "Dot Mercer", "Innkeeper and Breakfast Cook"),
    ]:
        o.append(obj(pid, "ping.social.person@1", name,
                     "Person listed for the synthetic inn: %s, %s." % (name, role),
                     {"name": name, "role": role}, sid))
        add_rel(pid, "works_for", biz, "about-page")

    rooms = [
        ("f2b-inn-room-01", "The Cottonwood Room", "Queen bed, private bath, porch view of the creek.", "2", "$149/night"),
        ("f2b-inn-room-02", "The Aspen Suite", "King bed, sitting room, soaking tub, mountain view.", "4", "$219/night"),
        ("f2b-inn-room-03", "The Bunkhouse Cabin", "Detached cabin with bunks, kitchenette, and fire pit.", "6", "$249/night"),
        ("f2b-inn-room-04", "Whole-Inn Buyout", "All rooms and the cabin for weddings and reunions.", "14", "$899/night"),
    ]
    for rmid, name, desc, sleeps, price in rooms:
        o.append(obj(rmid, "ping.social.service@1", name, desc,
                     {"name": name, "description": desc, "category": "room",
                      "sleeps": sleeps, "price": price,
                      "availability": "seasonal"}, sid))
        add_rel(biz, "offers", rmid, "rooms:" + rmid.rsplit("-", 1)[-1])

    for aid, headline, dek in [
        ("f2b-inn-article-01", "Three fall hikes within 20 minutes of the inn",
         "Trailheads, mileage, and where to eat after, from your innkeepers."),
        ("f2b-inn-article-02", "Packing for a Collbran weekend",
         "Layers, boots, and the one thing every guest forgets."),
    ]:
        o.append(obj(aid, "ping.social.article@1", headline, dek,
                     {"headline": headline, "dek": dek,
                      "url": "https://willowcreekinn.example.com/%s" % aid}, sid))
        add_rel(biz, "publishes", aid, "local-guide")

    posts = [
        ("f2b-inn-post-01", "Guest review highlight: five stars for the porch sunsets",
         "Recent guest review, 5 stars: the porch sunsets alone are worth the drive.",
         "2026-09-15", "https://media.example.com/f2b-inn/porch-sunset.jpg", "5"),
        ("f2b-inn-post-02", "Winter closure: January 5 through February 20",
         "We close each winter for deep cleaning and repairs. Gift cards never expire.",
         "2026-09-19", "https://media.example.com/f2b-inn/winter-porch.jpg", None),
    ]
    for pid_, headline, text, posted_at, media, rating in posts:
        fields = {"headline": headline, "text": text, "posted_at": posted_at,
                  "media_url": media}
        if rating:
            fields["rating"] = rating
            fields["source"] = "guest review"
        o.append(obj(pid_, "ping.social.post@1", headline, text, fields, sid))
        add_rel(biz, "publishes", pid_, "inn-post")

    ext1 = "f2b-inn-ext-stay"
    o.append(obj(ext1, "ping.social.external_identity@1",
                 "https://stay.example.com/willow-creek-inn",
                 "Booking platform listing placeholder. Check-in 15:00 claim.",
                 {"url": "https://stay.example.com/willow-creek-inn",
                  "platform": "stay.example.com",
                  "check_in": "15:00",
                  "winter_closure": "Jan 5 to Feb 20",
                  "phone": "(970) 555-0133"}, sid))
    add_rel(biz, "links_to", ext1, "booking-listing")

    ext2 = "f2b-inn-ext-travel"
    o.append(obj(ext2, "ping.social.external_identity@1",
                 "https://travel.example.com/willow-creek-inn",
                 "Travel directory listing placeholder. Carries conflicting check-in and closure claims.",
                 {"url": "https://travel.example.com/willow-creek-inn",
                  "platform": "travel.example.com",
                  "check_in": "16:00",
                  "winter_closure": "Jan 10 to Feb 15",
                  "phone": "(970) 555-0133"}, sid))
    add_rel(biz, "links_to", ext2, "directory-listing")

    return envelope(sid, "hospitality: room-inventory graph, seasonal availability, review evidence, check-in conflict preserved", o, r)


BUILDERS = [
    ("f2b-copper-kettle-cafe.json", build_cafe),
    ("f2b-mesa-iron-hardware.json", build_retail),
    ("f2b-canyon-view-dental.json", build_dental),
    ("f2b-willow-creek-inn.json", build_inn),
]


def main():
    for filename, builder in BUILDERS:
        fixture = builder()
        path = os.path.join(OUT, filename)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(fixture, f, indent=2, ensure_ascii=False)
            f.write("\n")
        g = fixture["graph"]
        print("%s: %d objects, %d relationships" % (
            filename, len(g["objects"]), len(g["relationships"])))


if __name__ == "__main__":
    main()
