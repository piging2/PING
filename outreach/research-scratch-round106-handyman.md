# Research scratch: round 106, handyman segment
# Segment: HANDYMAN, Mesa County corridor re-run, strict own-site rule
# Date: 2026-09-21
#
# Hard constraints applied this round:
# - Geography only: Grand Junction, Fruita, Palisade, Clifton, Collbran, Loma,
#   Mack, De Beque, Delta, Montrose, Rifle, Carbondale, Colorado. No other towns.
# - Residential handyman, repair, and maintenance contractors only.
# - Pure home-watch and property-management businesses excluded.
# - Qualifier must have its own live website (own domain or dedicated hosted
#   business site) that renders and publishes either a verbatim contact email or
#   a real contact/estimate form. Phone-only sites, directory-only businesses,
#   dead sites, parked sites, and lead brokers are exclusions.
# - No franchises or chains. No invented emails, addresses, or owner names.
# - Each qualifier grepped against
#   ~/workspace/outreach/research-scratch-round106-dedupe.txt (963 lines)
#   immediately before being added. All three qualifiers below were dedupe-clean
#   on 2026-09-21.
# - No new-filing hits surfaced this round (no Colorado SOS lookup ran; flag as a
#   gap for the next round, not as evidence of absence).
#
# QUALIFIERS (3, thin yield reported honestly; no padding)

- **Kokopelli Home Services** | handyman | Grand Junction | own-site contact form at https://kokopellihomeservices.com/get-a-custom-quote | owner: Dana & Ben Russell (published on own site) | independence evidence: own site presents a single local Grand Junction/Mesa County team, names its local owners, and shows no franchise or chain affiliation; local ownership is KNOWN from the own site, any real-estate-group connection is INFERRED from third-party material and not shown on the own site | MISSED_CALL_LEAD_CAPTURE (high confidence; own-site quote form is CONFIRMED live, no evidence of missed-call capture or instant follow-up on the own site) | stack: quote form CONFIRMED (https://kokopellihomeservices.com/get-a-custom-quote); site platform UNKNOWN; email UNKNOWN; no franchise/chain signals | HOT (source=research-round106, segment=handyman; form-route; dedupe clean) | 2026-09-21 | NEW

- **Jack of All Junction** | handyman | Grand Junction | own-site "Request A Free Quote" form rendered on homepage at http://www.jackofalljunction.com/ (fields: full name, phone, short message, text consent) | owner: unstated | independence evidence: own site presents a single local Grand Junction handyman business with no franchise or chain indicators; independence is INFERRED from the own-site presentation, not independently verified | AUTOMATION (high confidence; structured quote form is CONFIRMED live on the own site, so follow-up automation is the natural next step) | stack: quote form CONFIRMED; LeadConnectorHQ image/form assets visible, STRONG INDICATION of HighLevel/LeadConnector infrastructure; email UNKNOWN | HOT (source=research-round106, segment=handyman; form-route; dedupe clean) | 2026-09-21 | NEW

- **Four Seasons Maintenance LLC** | handyman | Montrose | own-site contact form at https://www.fourseasonsmaintenancellc.com/contact-5 (fields: first name, last name, email, subject, message) | owner: unstated | independence evidence: single-location Montrose LLC with a self-built Wix site and no chain indicators; INFERRED | WEBSITE_REVAMP (moderate confidence; Wix site is CONFIRMED but its public copy is thin and generic, which suggests a weak first impression; note: handyman segment fit rests on secondary-category evidence, see caveat) | stack: Wix CONFIRMED (Wix asset URLs); contact form CONFIRMED; email UNKNOWN | WARM (source=research-round106, segment=handyman; form-route; dedupe clean) | 2026-09-21 | NEW
# Caveat on Four Seasons Maintenance LLC: third-party categorization lists
# handyman as a secondary category alongside local services and property
# management; the own-site homepage text fetched this round was generic and did
# not enumerate specific handyman services. It is included as a WARM qualifier
# because the own site does render a real form and shows no pure home-watch or
# property-management-only positioning, but the outreach layer should confirm
# the residential handyman scope from an own-site services page before treating
# it as a strong handyman fit.

# NEAR-MISSES AND EXCLUSIONS (researched, not added)
# - Woodland Handyman (Grand Junction/Mesa County): extensive handyman own site,
#   but already in the dedupe file. Excluded as duplicate.
# - McCants Home Maintenance & Repair (Montrose): own site publishes verbatim
#   email Info@mccantshomemaintenance.org and states local ownership, 10+ years,
#   insured. Excluded: exact dedupe hit (line 572).
# - Little Lions Handyman Service (Montrose): own site confirms owner-operator
#   Ken, insured, no storefront. Excluded: phone-only own site, no email or form
#   rendered. Strong WEBSITE_REVAMP-style near-miss; keep on the radar for a
#   future pass if a form or email appears.
# - Hammer & Neill LLC (Montrose): own site confirms local ownership and home
#   maintenance/repair focus (Squarespace CONFIRMED), but no email or real form
#   rendered. Excluded under the strict contact-route rule.
# - Handy Does It: nationwide SEO lead-generation network with rotating
#   "local specialist" names and identical copy across towns. Excluded as lead
#   broker.
# - Bro's Handyman Service: form exists on broshandymanservice.com/contact/, but
#   the site positions itself as connecting users with "top rated local handyman
#   companies" and routes through the nationwide number 1-855-661-3672.
#   Excluded as lead broker.
# - Roberts Maintenance Service / Grand Junction Handyman (gjhandyman.com):
#   licensed, insured, serving Grand Junction since 1992, but phone-only own
#   site. Excluded.
# - Redtail Home Solutions (Grand Junction): own site explicitly says family
#   owned, locally started in Grand Junction, not corporately owned, not a
#   franchise (sister company to Penguin Pest Control; serves a broad multi-state
#   area; WordPress CONFIRMED). Excluded: no contact email or real form rendered;
#   only phone contact visible. Dedupe-clean if a route appears later.
# - ServiceKing (Grand Junction): own site says locally owned and explicitly
#   says it is not connected to the national auto-body chain, but primary
#   emphasis is HVAC, plumbing, restoration, cleaning, and construction rather
#   than core handyman work; no email or form rendered. Excluded (phone-only,
#   weak segment fit).
# - Home Again Handyman Services (Grand Junction): directory evidence only, no
#   own website surfaced. Excluded under strict own-site rule.
# - 2nd To None Handyman/Yards (Grand Junction): directory claims
#   http://2ndtononehandyman.com/ but the own domain could not be live-verified
#   this pass. Excluded as unverified.
# - NSO Construction LLC (Delta): own domain nsoconstruction.com would not load
#   in the browser this pass. Excluded as inaccessible/unverified own site.
# - Handy Dan's Construction (Montrose): own domain handydansconst.com would not
#   load in the browser this pass. Excluded as inaccessible/unverified own site.
# - Ward's Painting & Home Repair (Fruita, wards.com): primary category handyman
#   per listing data, Ken Ward named on review platforms, but only phone contact
#   surfaced; no verifiable own-site email or form this pass. Excluded as
#   phone-only. Revisit if a contact route appears on wards.com.
# - Jones Construction Services (Delta): own domain jcsiremodeling.com referenced
#   in directory material and email contact@jcsiremodeling.com appears only in a
#   directory listing, not verified on the own site. Excluded as unverified
#   contact route.
# - All Seasons Maintenance (Grand Junction): Wix-hosted business site at
#   rickspencer88.wixsite.com/all-seasons-handyman confirmed via search snippet,
#   but no email or real form verified on the own site this pass. Excluded as
#   unverified contact route. Dedupe-clean if verified later.
# - Ajax Handyman Services (Carbondale, 168 Vaquero Rd): listing data names
#   theprepacademy.org as its website, which does not match the business. No
#   credible own site. Excluded.
# - Noelhouse Creative (Carbondale): directory-only presence
#   (towncontractors.com), no own site surfaced. Excluded.
# - Tag Home Repair LLC (Fruita): directory/phone-only presence, no own site
#   surfaced. Excluded.
# - L&M Maintenance and Repair (Fruita, gjrepairpros.com): domain surfaced in
#   listing data but own-site contact route not verified this pass. Excluded as
#   unverified.
# - Directory-only or social-only names with no own-site route surfaced this
#   pass (excluded under strict own-site rule): Honey Do List Handyman Services
#   (Clifton), Johnson's Remodeling and Handyman Services (Clifton), J D Lawn &
#   Handyman Service (Clifton), Efficiant Handyman Services (Montrose), Dan's
#   Handyman Services (Montrose), Howard Tate Handyman Services (Delta-serving),
#   Sarvis & Sons Enterprises (Grand Junction), Unique Solutions Handyman and
#   Remodeling (Grand Junction), See The Light Window Cleaning and Handyman
#   Services (Grand Junction), All Around Handyman (Grand Junction), D&A
#   Maintenance (Grand Junction), Wilson's Handyman LLC (Delta), Fairview Home
#   Repair (Montrose).
#
# YIELD COUNT
# - Researched this round: 3 qualified + 31 excluded/near-misses = 34 names.
# - Qualified: 3 (Kokopelli Home Services, Jack of All Junction, Four Seasons
#   Maintenance LLC). Thin yield is reported honestly; no padding.
# - Website-revamp candidates among exclusions (do NOT add without a contact
#   route, but keep for re-check): Little Lions Handyman Service (Montrose,
#   phone-only Wix), Hammer & Neill LLC (Montrose, no email/form found),
#   Redtail Home Solutions (Grand Junction, phone-only).
# - New-filing hits: none surfaced this round.
#
# ECOSYSTEM NOTES (2026-09-21, handyman segment)
# - Booking timing: late September on the Western Slope is the last warm-weather
#   window for exterior work (decks, fences, painting, swamp-cooler shutdowns)
#   before winter; handymen stack jobs and run behind in this stretch, which is
#   exactly when estimate follow-up slips.
# - Repeat pattern: the dominant skip reason this round was phone-only own
#   sites. A meaningful cluster of one-operator shops (Little Lions, Roberts
#   Maintenance, Ward's Painting, Redtail) have real local reputations but no
#   email or form. These are the highest-value WEBSITE_REVAMP or lead-capture
#   conversations IF a compliant contact route is later verified; until then
#   they cannot enter the qualifier set.
# - Estimate follow-up and missed calls: every qualified business this round
#   already runs a form on its own site, which makes the honest pitch angle
#   speed-to-lead (form and missed-call follow-up while the owner is on a job),
#   not building the website from zero.
# - Lead-broker noise is heavy in this segment (Handy Does It, Bro's Handyman
#   Service): any "local handyman" landing page with a nationwide 855 number or
#   "we'll connect you with local pros" language should be treated as a broker
#   until proven otherwise.
# - Independence verification stays important: Redtail turned out to be a
#   legitimate local non-franchise despite a corporate-looking name, and
#   Kokopelli Home Services needed a check against the Kokopelli Real Estate
#   name. Chain/franchise re-verification at outreach time remains the rule.
