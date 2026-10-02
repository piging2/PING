# Segment research 2026-09-24 15:21 — near-misses and exclusions

Two genuinely fresh segments chosen after dedupe against leads.md, pipeline.md, and the canonical JSONL:
nothing in any source for barn/post-frame builders or for a dedicated closet-organizer segment
(Mountain Sky Closets, Steamboat, already in pipeline as WATCH, is the only prior closet entry).

## Segment 1: Barn / post-frame / metal building contractors
Honest pool finding: WCO dedicated barn/post-frame market is thin. Search surface is dominated by
SEO location-spam farms, national companies, and GCs already covered by the remodeler segment.

EXCLUDED (not staged):
- Dayton Barns / Dayton Sheds (daytonbarns.com, daytonsheds.com) — AI-template SEO spam farm;
  sports-metaphor boilerplate on every location page; out-of-area dealer. Same pattern as
  budgetpolebarn.com ("we partner with the top local installation experts") and
  grandjunctionconcreteinstallers.com (form-funnel spam). Exclude per spam/template rule.
- Sunrise Structures (sunrisestructures.net / sunrisestructuresllc.com) — pole-barn/shed company
  based in Rochester IN / Hutchinson KS. Out of geography.
- Cleary Building Corp. (Delta sales office) — national post-frame company (HQ Wisconsin),
  national-corporate presence; excluded per no-chains/nationals rule.
- 285 Barn Builders LLC (BBB listing) — Kentucky-based. Out of geography.
- George T Weldon Construction — Utah-based (per BBB). Out of geography.
- Charchalis Construction — Routt/Moffat/Rio Blanco counties (per BBB); outside the target
  geography (no Tier-1/2 town). Held for future outward-expansion tiers only.
- Well Built Sheds (Delta, via This & That) — shed dealer with Facebook page only, no own site;
  weak fit, directory-only.
- Metal fabricators — Prospect Steel Co, San Juan Metals, Montrose Metal Works, Doughty Steel,
  Valley Craft Fabrications, Welfelt Fabrication, Bear Metal Worx, High Alpine Fab Werx: all
  fabricators/machine shops = welding segment (covered), not barn builders.
- General contractors — Wehling Construction, Duncan Design Build, Triple 7 Construction,
  GCS (Loma), Elam Construction, Hawk Contracting Group, San Juan Construction, Merritt and
  Associates, Schmueser and Associates, Lennar (national), DirTWorks (excavation): GC/remodeler
  segment (covered), not post-frame specialists.

STAGED: Alco Building Company Inc (GJ) — the one true independent WCO metal-building contractor
found (see JSONL).

## Segment 2: Closet & home-organization installers
EXCLUDED (not staged):
- Classy Closets of Grand Junction (classyclosets.com/locations/grand-junction) — franchise
  network location page (nearest showroom Denver); excluded per franchise rule.
- Up Closets of Mesa — franchise network (page literally contains "Franchise Info"), 602 area
  code (Arizona). Excluded: franchise + out of geography.
- Inspired Closets (Cottonwood, AZ listing) — franchise network; out of geography.
- Closet Factory (Centennial/Denver, Houzz) — franchise + Front Range; out of geography.
- Closet & Storage Concepts (Denver) — Front Range only; out of geography.
- CB Custom Closets (Crested Butte, cbcustomclosets.com) — real independent, but Crested Butte is
  outside target geography (Tier 3+). Held for future outward-expansion tiers.
- Colorado Closets and Blinds (Basalt, Jared, (800) 928-1791) — Basalt outside target towns;
  email/phone only via third-party directory (home8.org), not own-site verified.
- Closet Motives (Grand Junction, 2183 Canyon View Dr, (970) 241-5028 per Birdeye) — no own site
  found; directory-only. Held as near-miss.
- 1st Closets (Grand Junction, 1605 N 7th St, 1stclosets.com) — real local shop per directories,
  but own site failed to fetch twice (browser_open failure both attempts). Contact route
  unverified this run; NOT staged per the own-site verification rule. Retry next run.
- RZ Cabinetry and Millwork, Whitewolf Cabinets (GJ), Grand Mesa Cabinets & Countertops (Delta) —
  kitchen-cabinet shops; cabinet-maker segment covered (round 110). Not closet specialists.
- ProSpace Interiors (Delta) — office furniture / space planning; weak home-service fit.

STAGED: Mesa Closet Design (GJ) — verified live own site, independent, local (see JSONL).

## Segment health notes (for Ecosystem notes / engine awareness)
- Barn/post-frame: segment may be one-and-done for WCO; future passes should only re-check for
  new filings rather than re-sweep. Recommend NOT re-running as a full segment soon.
- Closets: pool thin but real; watch for new filings and FB group promo posts. Closet Factory /
  Classy Closets franchises are the competitive layer (position local independents against them).
- Both segments are phone/form-first with zero own-site emails found; intake is the small-team
  owner/estimator, so MISSED_CALL_LEAD_CAPTURE angles fit, but routes are form/phone only.
- New-filing radar: no business filed/opened within ~60-90 days confirmed in either segment.
