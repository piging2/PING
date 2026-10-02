#!/usr/bin/env python3
"""
gen-batch-d.py - F2-CORPUS-D fixture generator (technology/creator batch).

Deterministic and rerun-safe: pinned timestamps, no randomness, no network.
Re-running regenerates byte-identical fixtures and manifest.

Layout written under ~/workspace/fyd-factory/corpus/:
  fixtures/batch-d/d1-it-services-provider.json
  fixtures/batch-d/d2-marketing-consultant-creator.json
  fixtures/batch-d/d3-software-company.json
  fixtures/batch-d/d4-photographer-minimal.json
  manifests/batch-d.json        (written by this script; validation block
                                 filled by validate-batch-d.py)
"""
import hashlib
import json
import os
import sys

TS = "2026-09-23T18:30:00Z"
CONTROLLER = "identity_fyd_corpus_batch_d"
BASE = os.path.expanduser("~/workspace/fyd-factory/corpus")
FIX_DIR = os.path.join(BASE, "fixtures", "batch-d")
MAN_DIR = os.path.join(BASE, "manifests")

SCHEMAS = {
    "business": "ping.social.business@1",
    "service": "ping.social.service@1",
    "product": "ping.social.product@1",
    "article": "ping.social.article@1",
    "post": "ping.social.post@1",
    "person": "ping.social.person@1",
    "location": "ping.social.location@1",
}

# Predicate vocabulary harvested from src/fyd/sitespec/schemas.ts (2026-09-23)
# plus the fixture-precedent predicates from __fixtures__/coppersmith-graph.ts.
SUBJECT_PREDICATES = {
    SCHEMAS["business"]: {"provides", "publishes", "located_at", "employs", "links_to"},
    SCHEMAS["service"]: {"provided_by"},
    SCHEMAS["post"]: {"published_by", "replies_to"},
}


def prov(ref):
    return {"kind": "overlay-authored", "ref": ref, "derivedAt": TS}


def obj(oid, schema, title, description, fields, ref):
    return {
        "id": oid,
        "schema": schema,
        "controllerId": CONTROLLER,
        "visibility": "public",
        "title": title,
        "description": description,
        "fields": fields,
        "createdAt": TS,
        "updatedAt": TS,
        "provenance": prov(ref),
    }


def rel(rid, subject, predicate, object_, ref):
    return {
        "id": rid,
        "subject": subject,
        "predicate": predicate,
        "object": object_,
        "status": "active",
        "createdAt": TS,
        "evidenceRef": ref,
    }


def fixture_envelope(fid, variant, notes):
    return {
        "id": fid,
        "batch": "D",
        "variant": variant,
        "synthetic": "DEMO_SYNTHETIC",
        "generated_at": TS,
        "generator": "fyd-factory/corpus/tools/gen-batch-d.py",
        "schema_contract": "ObjectGraph (src/fyd/sitespec/types.ts) + fixture envelope",
        "notes": notes,
    }


def build_graph(objects, relationships):
    return {"objects": objects, "relationships": relationships}


# ---------------------------------------------------------------- D1: IT services provider, 50 services (stress)
def d1():
    b = "fyd-d1"
    eref = "fyd-factory:corpus:batch-d:d1"
    biz = f"{b}-business"
    loc = f"{b}-location"
    per = f"{b}-person-owner"

    services = [
        ("managed-it-support", "Managed IT support", "Proactive monitoring, patching, and day-to-day support for your workstations and servers."),
        ("network-monitoring", "24/7 network monitoring", "Round-the-clock monitoring of networks and critical systems with alerting."),
        ("helpdesk", "Helpdesk support", "Friendly remote helpdesk for staff tech issues during business hours."),
        ("cybersecurity-assessment", "Cybersecurity assessment", "A structured review of your current security posture with a prioritized fix list."),
        ("firewall-management", "Firewall management", "Firewall selection, configuration, and ongoing rule maintenance."),
        ("endpoint-protection", "Endpoint protection", "Antivirus and endpoint detection deployed and managed across devices."),
        ("email-security", "Email security", "Spam filtering, attachment scanning, and spoofing protection for company email."),
        ("phishing-training", "Phishing awareness training", "Simulated phishing and short training modules for staff."),
        ("data-backup", "Data backup", "Automated local and offsite backups with verified restore testing."),
        ("disaster-recovery", "Disaster recovery planning", "A written recovery plan with roles, priorities, and test schedules."),
        ("cloud-migration", "Cloud migration", "Move files, email, and line-of-business apps to the cloud with minimal downtime."),
        ("m365-management", "Microsoft 365 management", "Licensing, setup, and administration of Microsoft 365 tenants."),
        ("google-workspace", "Google Workspace management", "Setup and administration of Google Workspace for small teams."),
        ("voip", "VoIP phone systems", "Business phone systems with desk phones, mobile apps, and call routing."),
        ("network-design", "Network design", "Design of office networks sized for your headcount and growth."),
        ("wifi-optimization", "Wi-Fi optimization", "Site surveys and tuning so Wi-Fi works everywhere in the building."),
        ("server-management", "Server management", "On-prem and virtual server maintenance, updates, and monitoring."),
        ("virtualization", "Virtualization", "Consolidate servers with virtualization to cut hardware costs."),
        ("patch-management", "Patch management", "Scheduled operating system and application patching with reporting."),
        ("vulnerability-scanning", "Vulnerability scanning", "Regular scans that surface missing patches and misconfigurations."),
        ("it-consulting", "IT consulting", "Independent advice on technology decisions, vendor selection, and budgets."),
        ("tech-roadmapping", "Technology roadmapping", "A 12 to 36 month plan aligning technology spending with business goals."),
        ("hardware-procurement", "Hardware procurement", "Sourcing laptops, desktops, and networking gear at fair pricing."),
        ("workstation-setup", "Workstation setup", "New-hire computer setup with standard software and security baselines."),
        ("printer-management", "Printer management", "Network printer setup, driver deployment, and troubleshooting."),
        ("mdm", "Mobile device management", "Enroll and secure company phones and tablets with remote wipe."),
        ("remote-workforce", "Remote workforce setup", "Secure remote access, VPN, and collaboration tools for remote staff."),
        ("vpn-config", "VPN configuration", "Site-to-site and remote-access VPN setup with documented credentials."),
        ("mfa-setup", "Multi-factor authentication setup", "Roll out MFA across email, VPN, and key applications."),
        ("password-management", "Password manager rollout", "Team password manager deployment with training and policies."),
        ("access-reviews", "Access reviews", "Quarterly reviews of who can access what, with offboarding checks."),
        ("compliance-readiness", "Compliance readiness", "Prepare for HIPAA, PCI, or CMMC style requirements with gap lists."),
        ("incident-response", "Incident response planning", "A playbook for detecting, containing, and recovering from incidents."),
        ("ransomware-recovery", "Ransomware recovery", "Isolation, eradication, and restore procedures after ransomware."),
        ("data-migration", "Data migration", "Move data between systems with validation and rollback plans."),
        ("database-management", "Database management", "Backup, tuning, and maintenance for small business databases."),
        ("hosting-management", "Website hosting management", "Managed hosting setup, SSL, and uptime monitoring for business sites."),
        ("dns-management", "DNS management", "Domain registration, DNS records, and email authentication records."),
        ("network-cabling", "Network cabling", "Cat6 cabling runs for offices, shops, and warehouses."),
        ("pos-systems", "Point-of-sale systems", "POS selection, setup, and networking for retail and restaurants."),
        ("camera-systems", "Surveillance camera systems", "Camera selection, placement, and recording setup."),
        ("access-control", "Access control systems", "Keycard and keypad door systems with audit logs."),
        ("smart-office", "Smart office setup", "Conference room AV, displays, and meeting room booking tools."),
        ("licensing-management", "Software licensing management", "Track licenses and subscriptions so nothing lapses or duplicates."),
        ("asset-inventory", "IT asset inventory", "A living inventory of computers, phones, and network gear."),
        ("it-documentation", "IT documentation", "Documented networks, passwords vaulting, and runbooks for your business."),
        ("vendor-management", "Vendor management", "One point of contact to coordinate your technology vendors."),
        ("onboarding-it", "Employee onboarding IT", "Checklist-driven IT setup for every new hire."),
        ("offboarding-it", "Employee offboarding IT", "Account deactivation and device recovery when staff leave."),
        ("email-migration", "Email migration", "Move mailboxes between providers with minimal interruption."),
    ]
    assert len(services) == 50, f"expected 50 services, got {len(services)}"

    products = [
        ("plan-essentials", "Essentials managed plan", "Monitoring, patching, and helpdesk for up to 10 users.", "per user per month"),
        ("plan-growth", "Growth managed plan", "Everything in Essentials plus backup and security training.", "per user per month"),
        ("plan-complete", "Complete managed plan", "Full managed IT with on-site visits and vCIO planning.", "per user per month"),
        ("bundle-security", "Security bundle", "MFA, endpoint protection, email security, and quarterly reviews.", "flat annual"),
        ("bundle-backup", "Backup bundle", "Local plus cloud backup with monthly restore tests.", "per device per month"),
        ("project-starter", "Starter project block", "Prepaid hours for projects and upgrades.", "per block"),
    ]

    articles = [
        ("kb-mfa", "MFA rollout checklist", "The order of operations we use when enabling multi-factor authentication.", "2026-06-02", ["security", "how-to"]),
        ("kb-backup-321", "The 3-2-1 backup rule explained", "Three copies, two media types, one offsite: what it means in practice.", "2026-07-14", ["backup", "how-to"]),
        ("kb-ransomware", "What to do in the first hour of ransomware", "Isolate, preserve, and call: a one-page response order.", "2026-08-05", ["security", "incident-response"]),
        ("kb-managed-it", "What managed IT actually includes", "Monitoring, patching, helpdesk, and planning, defined without jargon.", "2026-09-01", ["managed-it", "explainer"]),
    ]

    objects = [
        obj(biz, SCHEMAS["business"], "Canyonline IT Services",
            "DEMO_SYNTHETIC: fictional IT services provider for the FYD factory corpus. Managed IT, cybersecurity, and cloud services for small businesses.",
            {"claimKind": "synthetic_demo", "synthetic_marker": "DEMO_SYNTHETIC", "category": "IT services",
             "website": "https://canyonline-it.example.com", "phone": "+19705550160",
             "email": "hello@canyonline-it.example.com",
             "hours": "Mo-Fr 08:00-17:00", "service_area": "Grand Junction, Colorado"}, eref),
        obj(loc, SCHEMAS["location"], "Grand Junction, Colorado",
            "Service area claimed by the synthetic fixture; no street address recorded.",
            {"claimKind": "synthetic_demo", "kind": "service_area", "address_locality": "Grand Junction",
             "address_region": "CO", "address_country": "US"}, eref),
        obj(per, SCHEMAS["person"], "Alex Moreno",
            "Synthetic persona for the demo corpus; not a real person.",
            {"claimKind": "synthetic_demo", "role": "Owner",
             "persona_note": "Fictional owner persona for fixture purposes only."}, eref),
    ]
    for slug, name, desc in services:
        objects.append(obj(f"{b}-service-{slug}", SCHEMAS["service"], name, desc,
                           {"claimKind": "synthetic_demo", "name": name, "description": desc}, eref))
    for slug, name, desc, price in products:
        objects.append(obj(f"{b}-product-{slug}", SCHEMAS["product"], name, desc,
                           {"claimKind": "synthetic_demo", "name": name, "description": desc,
                            "price_hint": price}, eref))
    for slug, title, text, date, tags in articles:
        objects.append(obj(f"{b}-article-{slug}", SCHEMAS["article"], title, text,
                           {"claimKind": "synthetic_demo", "title": title, "text": text,
                            "date": date, "tags": tags}, eref))

    relationships = []
    n = 0
    def add(subject, predicate, object_):
        nonlocal n
        n += 1
        relationships.append(rel(f"{b}-rel-{n:03d}-{predicate}", subject, predicate, object_, eref))

    add(biz, "located_at", loc)
    add(biz, "employs", per)
    for slug, _, _ in services:
        oid = f"{b}-service-{slug}"
        add(biz, "provides", oid)
        add(oid, "provided_by", biz)
    for slug, _, _, _ in products:
        oid = f"{b}-product-{slug}"
        add(biz, "provides", oid)
    for slug, _, _, _, _ in articles:
        add(biz, "publishes", f"{b}-article-{slug}")
        add(f"{b}-article-{slug}", "published_by", biz)

    return build_graph(objects, relationships), fixture_envelope(
        "fyd-corpus-d1", "it-services-provider-50-services-stress",
        "Stress variant: 50 service objects. Products, documentation articles, one person, one location.")


# ------------------------------------------------- D2: solo marketing consultant/creator, dense articles
def d2():
    b = "fyd-d2"
    eref = "fyd-factory:corpus:batch-d:d2"
    biz = f"{b}-business"
    loc = f"{b}-location"
    per = f"{b}-person-creator"

    services = [
        ("strategy-audit", "Marketing strategy audit", "A two-week audit of your messaging, channels, and funnel with a prioritized action list."),
        ("messaging-workshop", "Brand messaging workshop", "A half-day workshop that turns what you do into words customers repeat."),
        ("content-system", "Content system setup", "A repeatable weekly content workflow built around one hour of your time."),
    ]
    products = [
        ("playbook-90day", "90-day content playbook", "A fill-in-the-blank 90-day content plan for service businesses.", "one-time"),
        ("email-pack", "Welcome email sequence templates", "Five proven welcome emails you customize in an afternoon.", "one-time"),
        ("seo-checklist", "Local SEO checklist", "The 40-point checklist used in every client audit.", "one-time"),
        ("swipe-file", "Ad creative swipe file", "Fifty annotated local ad examples with notes on why each worked.", "one-time"),
    ]
    articles = [
        ("local-seo-playbook", "The local SEO playbook for service businesses",
         "Profiles, reviews, citations, and pages: the complete order of operations for ranking in your town, with the five numbers to check weekly.",
         "2026-03-10", ["seo", "local", "playbook"], "12"),
        ("gbp-homepage", "Why your Google Business Profile is your real homepage",
         "Most customers meet you on Google before your website. Photos, posts, Q and A, and review replies done right.",
         "2026-04-02", ["seo", "google-business-profile"], "8"),
        ("email-from-zero", "Email list building from zero: a 90-day plan",
         "Lead magnets that work for trades, the welcome sequence, and the weekly rhythm that keeps the list warm without burning it.",
         "2026-04-28", ["email", "lead-generation"], "10"),
        ("ad-teardown", "Ad creative teardown: five local ads that worked",
         "Screenshots and notes on five real-shaped local ads: hook, proof, offer, and the one change that lifted each one.",
         "2026-05-19", ["ads", "creative", "teardown"], "9"),
        ("pricing-value", "Pricing your services: value-based vs hourly",
         "When hourly billing costs you money, how to package outcomes, and scripts for the pricing conversation.",
         "2026-06-09", ["pricing", "positioning"], "11"),
        ("followup-system", "The follow-up system that books more jobs",
         "Speed to lead, the three-touch sequence, and the CRM fields that matter. Built for owners, not marketers.",
         "2026-07-07", ["sales", "follow-up", "systems"], "10"),
        ("content-repurposing", "Content repurposing: one video, nine assets",
         "Record once on a Tuesday. Clips, quotes, emails, and posts for the rest of the month with a simple checklist.",
         "2026-07-29", ["content", "repurposing"], "7"),
        ("review-generation", "Review generation without awkward asks",
         "Timing, wording, and the QR code card. How to ask at the moment customers are happiest.",
         "2026-08-20", ["reviews", "reputation"], "8"),
        ("stop-price-competition", "Positioning: how to stop competing on price",
         "Specialize the offer, name the enemy, and publish proof. Price becomes the fourth thing they ask about.",
         "2026-09-08", ["positioning", "strategy"], "12"),
        ("analytics-five", "Analytics that matter: five numbers to watch weekly",
         "Calls, booked jobs, close rate, average ticket, and repeat rate. Ignore everything else until these move.",
         "2026-09-15", ["analytics", "metrics"], "9"),
    ]
    assert len(articles) == 10
    posts = [
        ("launch-playbook", "The 90-day content playbook is live", "New template pack: the exact planning system from the studio.", "2026-09-02", ["announcement", "templates"]),
        ("workshop-recap", "Workshop recap: messaging in half a day", "Three before-and-after homepage headlines from last week's session.", "2026-08-27", ["workshop", "messaging"]),
        ("seo-win", "From page three to the map pack", "What changed in 60 days for one service business. Process, not luck.", "2026-08-12", ["seo", "case-study"]),
        ("email-open-rates", "Subject lines that beat 50 percent opens", "Five subject lines from client welcome sequences and why they work.", "2026-07-22", ["email"]),
        ("behind-scenes", "How I plan a month of content in one hour", "The actual checklist, screen by screen.", "2026-07-02", ["content", "process"]),
        ("q-and-a", "Ask me anything: pricing edition", "Answering the five pricing questions I hear most from owners.", "2026-06-18", ["pricing", "q-and-a"]),
    ]

    objects = [
        obj(biz, SCHEMAS["business"], "Fieldnote Studio",
            "DEMO_SYNTHETIC: fictional solo marketing consultancy for the FYD factory corpus. Practical marketing systems for independent service businesses.",
            {"claimKind": "synthetic_demo", "synthetic_marker": "DEMO_SYNTHETIC", "category": "Marketing consultant",
             "website": "https://fieldnote-studio.example.com", "phone": "+19705550161",
             "email": "hello@fieldnote-studio.example.com",
             "hours": "By appointment", "service_area": "Palisade, Colorado"}, eref),
        obj(loc, SCHEMAS["location"], "Palisade, Colorado",
            "Service area claimed by the synthetic fixture; no street address recorded.",
            {"claimKind": "synthetic_demo", "kind": "service_area", "address_locality": "Palisade",
             "address_region": "CO", "address_country": "US"}, eref),
        obj(per, SCHEMAS["person"], "Jordan Ellis",
            "Synthetic persona for the demo corpus; not a real person.",
            {"claimKind": "synthetic_demo", "role": "Owner and marketing consultant",
             "persona_note": "Fictional solo-creator persona for fixture purposes only."}, eref),
    ]
    for slug, name, desc in services:
        objects.append(obj(f"{b}-service-{slug}", SCHEMAS["service"], name, desc,
                           {"claimKind": "synthetic_demo", "name": name, "description": desc}, eref))
    for slug, name, desc, price in products:
        objects.append(obj(f"{b}-product-{slug}", SCHEMAS["product"], name, desc,
                           {"claimKind": "synthetic_demo", "name": name, "description": desc,
                            "price_hint": price}, eref))
    for slug, title, text, date, tags, minutes in articles:
        objects.append(obj(f"{b}-article-{slug}", SCHEMAS["article"], title, text,
                           {"claimKind": "synthetic_demo", "title": title, "text": text,
                            "date": date, "tags": tags, "read_minutes": minutes,
                            "author": "Jordan Ellis"}, eref))
    for slug, title, text, date, tags in posts:
        objects.append(obj(f"{b}-post-{slug}", SCHEMAS["post"], title, text,
                           {"claimKind": "synthetic_demo", "title": title, "text": text,
                            "date": date, "tags": tags}, eref))

    relationships = []
    n = 0
    def add(subject, predicate, object_):
        nonlocal n
        n += 1
        relationships.append(rel(f"{b}-rel-{n:03d}-{predicate}", subject, predicate, object_, eref))

    add(biz, "located_at", loc)
    add(biz, "employs", per)
    for slug, _, _ in services:
        oid = f"{b}-service-{slug}"
        add(biz, "provides", oid)
        add(oid, "provided_by", biz)
    for slug, _, _, _ in products:
        add(biz, "provides", f"{b}-product-{slug}")
    for slug, _, _, _, _, _ in articles:
        add(biz, "publishes", f"{b}-article-{slug}")
        add(f"{b}-article-{slug}", "published_by", biz)
    for slug, _, _, _, _ in posts:
        add(biz, "publishes", f"{b}-post-{slug}")
        add(f"{b}-post-{slug}", "published_by", biz)

    return build_graph(objects, relationships), fixture_envelope(
        "fyd-corpus-d2", "marketing-consultant-creator-dense-articles",
        "Solo creator variant: one person, ten long-form articles, three services, four products, six posts.")


# ------------------------------------------------- D3: software company, conflicting hours evidence
def d3():
    b = "fyd-d3"
    eref = "fyd-factory:corpus:batch-d:d3"
    biz = f"{b}-business"
    loc_web = f"{b}-location-hours-website"
    loc_dir = f"{b}-location-hours-directory"
    per1 = f"{b}-person-founder"
    per2 = f"{b}-person-engineer"

    services = [
        ("custom-web", "Custom web applications", "Design and build of internal tools and customer portals."),
        ("api-integrations", "API integrations", "Connect your CRM, accounting, and dispatch tools so data flows once."),
        ("legacy-modernization", "Legacy system modernization", "Rebuild aging software in stages without stopping the business."),
        ("mobile-apps", "Mobile app development", "Field and customer apps for iOS and Android from one codebase."),
        ("data-pipelines", "Data pipeline engineering", "Nightly syncs and reporting pipelines you can trust."),
        ("ecommerce", "E-commerce builds", "Online stores with quotes, deposits, and service scheduling."),
        ("a11y-audits", "Accessibility audits", "WCAG reviews with a prioritized remediation plan."),
        ("product-support", "Ongoing product support", "Monthly retainer for fixes, small features, and monitoring."),
    ]
    products = [
        ("crm", "Sagebrush CRM", "A simple CRM for trade businesses: contacts, jobs, and follow-ups.", "per user per month"),
        ("dispatch", "Dispatch Board", "Drag-and-drop scheduling for crews and technicians.", "per user per month"),
        ("invoiceflow", "InvoiceFlow", "Estimates to invoices to payments with reminders.", "per user per month"),
        ("crewchat", "CrewChat", "Job-based messaging that keeps office and field in sync.", "per user per month"),
        ("estimat
...[truncated 16079 chars]