# Facebook delta-scan #116 (round 116)

Window: creation_time > 1790086503 (2026-09-22 08:15:03 MDT) through ~11:25 MDT scan time.
Route: facebook-cli groups posts --sort-by NEW_POSTS --limit 20 x10, local filter (no --min-timestamp per rounds-88/90 unreliability). Read-only; no DMs sent.
Infra note: facebook-cli ran on the healthy local cloud-session facebook-cli, per the established round-111/112/113/114/115 path. Post content/author resolved per-post via `facebook-cli post read --url` (works live and returns caption + owner_name, faster than the round-115 social.search route). Messenger CLI (hatch_messenger_cli) present and connected; used only for contact resolution (0 DMs sent, lane read-only).

## Posts scanned per group
- Western Colorado Message Board & Classifieds (5456977881034408): 20 fetched, 10 in-window: 8 personal resale (ATV, wood stove, truck, GMC Sierra, Nikon lens, charging stand, GMC Canyon dealer, sofa), Laura Black RE/MAX 4000 land listing (realtor, non-trade), Amber Murphy unlicensed in-home childcare (non-trade). All skipped.
- Buy & Sell in Grand Junction (108728816001912): 20 fetched, 20 in-window, ALL personal resale/free (Vizio TV, Mazda CX-9, couches, blender, cooler, antiques, free pit bull, ofertas ad, cleaning bundle, maternity dress, 2x Nikon lens crosspost, Ibis bike, floor toy, diapers, Chevy 1500, skillet set, storage shelves, Cannondale bike, hit-and-run FREE post, Transition bike). All skipped.
- Delta, Colorado Community Message Board (1504277980997243): 20 fetched, 3 in-window: Starlight Home Health promo share (health service, not a home-repair trade, skipped); Paradise Theatre of Paonia literary club + Dog Stars film posts x2 (community/entertainment).
- Orchard Mesa, Colorado Message Board (486356801008208): 20 fetched, 1 in-window: Ellis Hovey empty share (personal).
- Fruita, Colorado Message Board (3741333852807065): 20 fetched, 16 in-window: Peggy Vertiz "This is so cool!" share; Gordan Thibedeau Grand Mesa bird photos; Don Davidson free grill giveaway; Susan Rawlins Workforce Colorado job-update share; Charlie Trapp lost small tan dog (community); Mescal Restaurants taco tuesday (food promo, not trade); WCAHEC opioid response share; Sarah Cooper fall greeting; Amanda Orr FMHS mural; Alls Welcome empty share; Dapper Cuts homecoming promo (barbershop, weak trade fit, observed not pursued); Maria Bunch-Quezada Chicken-N-The-Bag food truck nomination share; Janet Gordon Palm feline rescue share; Elizabeth Nunn pumpkin post; Dare to Dream Inc Cedaredge post. All skipped/observed.
- Living In Grand Junction Colorado (1082777608577867): 20 fetched, 3 in-window: Mutual Aid Partners pantry/resource distro notice (community notice); Ray Mathis empty share (personal); Smith Family Orchard Store milk-order promo (agriculture/retail, not trade).
- Colorado Business Networking (2803047646497352): 20 fetched, 20 in-window: NEXA Lending promo (mortgage); Alongside Bookkeeping (B2B, not trade); DTFXpress print B2B; Eric Goodman book promo; Tejanay Brown nonprofit-education connection request (networking ask, not a business demand); Cooperage Consulting; Bill Thompson CPA; Jonatan Carrillo-Castro server-tips share; Alma Nava financial educator; Styles Lucero empty share; David Collins / Farmers Insurance agent share; Vecinos Mexican Grill taco promo; Victoria Hernandez taco share x2; **Farmer Home Inspections LLC promo (NEW prospect, trade)**; Rhino Realty Pros Erie listing; Lyn Atlantess Ethereal Lomasi empty share; Centennial State Insurance Agency Carbondale post; Taspen's Yoga; D Christian Martinez ASTRA event space share. All skipped except Farmer.
- Colorado Business Mingle (5355730651191326): 20 fetched, 5 in-window: Jessica Mayfield Kept app launch (tech, not trade); Derick Jaroscak South Colorado Motors car video (auto dealer); Eric Goodman book promo; COS Halloween vendor call (Colorado Springs, out of corridor); Meadows Banquet Girls Night event. All skipped.
- What's Happening In Palisade, CO / Business Board (2569745986668554): 20 fetched, 0 in-window.
- Glenwood Springs Colorado Message Board (2370574193230682): 20 fetched, 1 in-window: **Dude and a Mower, LLC lawn care aeration campaign (genuine trade promo, PARKED beyond corridor; service area includes Rifle)**.

Total: 200 posts fetched, 79 in-window posts reviewed. Western Colorado groups produced zero trade promos again (resale + community only). The 1 new trade prospect came from CO Business Networking; the 1 parked trade promo from Glenwood.

## Classification summary
- Business promos (home-service trade): 2 (1 new prospect: Farmer Home Inspections LLC; 1 parked: Dude and a Mower, LLC)
- Demand/ISO signals: 0
- Personal resale: 25 (20 Buy & Sell GJ + ATV/wood stove/truck/GMC Sierra/lens/charging stand/Canyon dealer/sofa on WCMB)
- Personal shares (empty-caption, resolved via post read): 7 (Sue Goodall, Ray Mathis, Alls Welcome, Styles Lucero, Ellis Hovey, Victoria Hernandez, Lyn Lomasi)
- Personal/social content: 9 (Vertiz share, Thibedeau photos, Sarah Cooper greeting, Amanda Orr mural, server-tips share, Maria Bunch-Quezada food truck share, Janet Gordon Palm rescue, Elizabeth Nunn pumpkin, Dare to Dream)
- Personal misc (free items): 3 (Don Davidson free grill, Miranda Fortner free dog, Tyler Bowker hit-and-run FREE)
- Community/event notices: 7 (Mutual Aid pantry, Workforce Colorado job update, lost dog, Paradise Theatre x2, WCAHEC share, COS Halloween vendor call)
- Non-trade promos: 24 (NEXA Lending, Alongside Bookkeeping, DTFXpress, Eric Goodman book x2, Cooperage Consulting, CPA Thompson, Alma Nava educator, Farmers insurance, Rhino Realty, Centennial State Insurance, Taspen's Yoga, ASTRA event space, Mescal/Vecinos/Monaghan's restaurants x3, Starlight Home Health, Laura Black realtor, Amber Murphy childcare, Smith Family Orchard milk, Meadows Banquet, South Colorado Motors, Kept app)
- Edge weak fit observed, not pursued: Dapper Cuts (barbershop homecoming, Fruita)
- Networking request observed, not actionable: Tejanay Brown nonprofit-education connection request
- Grand-opening / new-business radar hits: 0
- Review/complaint threads: 0
- Hiring/growth signals: 0

## New genuine prospect (1)

1. **Farmer Home Inspections LLC** — home inspections. Posted 10:50 MDT in CO Business Networking by Brennan Farmer (personal profile, presumed owner). Caption: "Follow Farmer Home Inspections LLC for more helpful tips" (content-thin but a real trade promo; business Page tagged in the post: Page id 61578100306379). No phone/email published in the post. Trade fit: inspector in the field, missed-call profile (quote-driven service). Contact route: business Page Message button (Pig path; per AGENTS.md the Page Message button is first-choice). Post: https://facebook.com/groups/2803047646497352/permalink/4079515032183934/

## Parked (beyond-corridor, not proposed)

- **Dude and a Mower, LLC** — lawn care / aeration October 2-4 campaign. Glenwood-area (posted in Glenwood group), service area Battlement Mesa / Parachute / Rifle & surrounding. Phone (970) 404-0250 and dudeandamower@gmail.com published. Genuine seasonal trade promo with live booking urgency, but business sits outside the 2026-09-20 corridor-only town list (Glenwood Springs, Parachute, Battlement Mesa all beyond corridor; only its service area touches Rifle). Parked per corridor-only rule, same precedent as round-115's 4 Denver rows. Do not re-propose. Post: https://facebook.com/groups/2370574193230682/permalink/4484949625126451/

## Repeat sightings (not re-added)
- None. Round-115's 5 new prospects did not repost in this window.

## Demand signals
- None this window.

## Observed-but-not-pursued
- Dapper Cuts (Fruita 09:37): barbershop homecoming promo; personal-care, weak trade fit.
- Starlight Home Health (Delta 08:26): home health service promo; health service, not a home-repair trade.
- Don Davidson free grill (Fruita 08:43): personal giveaway, not a business.
- All 25 personal resale listings and 7 empty-caption personal shares: personal, ignored.
- Mescal/Vecinos/Monaghan's restaurant promos, realtor/insurance/mortgage/lender posts: non-trade.

## Dedupe
Grep across leads.md, pipeline.md, facebook-dms.md, western-co-prospects.jsonl: "Farmer Home Inspections" (0 hits), "Brennan Farmer" (0 hits), "Dude and a Mower" / "dudeandamower" / 404-0250 (0 hits). No conflicts. Pipeline adds by parent: 1 NEW (farmer-home-inspections); Dude and a Mower parked.

## Parked DM drafts
None sent (read-only lane; recipient Brennan Farmer / Farmer Home Inspections not in synced Messenger contacts, so the hard CLI constraint blocks any send; Page Message path is Pig-only and parked). DM count: 0/10. Parked for parent merge: Farmer Home Inspections LLC via business Page Message button (Pig path).

## Watermark
Old: 1790086503 (2026-09-22 08:15:03 MDT).
New: 1790097207 (2026-09-22 11:13:24 MDT, max creation_time observed across all 10 groups).

## Notes for parent
- 200 fetched / 79 in-window / 1 new prospect + 1 parked trade promo. Western Colorado groups quiet mid-morning (resale + community only); genuine trade signal again came only from the outward-expansion group.
- Suggested pipeline placement for parent merge: Farmer Home Inspections LLC under "Facebook — Colorado Business Networking (round 116 addition, 2026-09-22)", status NEW.
- No pipeline.md / facebook-dms.md edits made by this lane (read-only); parent merges.
- Raw dumps: ~/workspace/outreach/scratch/scan116-<groupid>.json (10 files); per-post resolutions: ~/workspace/outreach/scratch/scan116-posts/p1..p79.json; in-window index: ~/workspace/outreach/scratch/scan116-inwindow-summary.txt, ~/workspace/outreach/scratch/scan116-inwindow-urls.txt.
- Merge-ready rows: ~/workspace/outreach/scratch/fb-prospects-round116.md. DM log: ~/workspace/outreach/scratch/fb-dm-log-round116.md.
