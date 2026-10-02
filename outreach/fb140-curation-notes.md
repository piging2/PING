# FB pass-140 curation notes (2026-09-28 ~13:35 MDT)

Provisional: /tmp/fb-job-20260928-193550-provisional.json (67 likes from build-fb140-job.py;
pre-filter 532 -> 391 fresh; blocked engaged-name 82, ledger-engaged 55, engaged-post-id 4).
Curated job: fb140-curated-job.json — 9 likes + 2 comments (honest below-cap count).

## Recency rule applied this pass (7-day same-business window)
A business engaged (like or comment) within the last 7 days is excluded from
curation, even on a new post. Window chosen to be consistent with pass-139's
"same-business recency" drops while letting genuinely stale businesses
(9+ days) back in. Hard drops regardless of window: explicitly blocked
businesses (Western Colorado Chimney, AG Property Services do-not-retry).

## Keeps (9 likes + 2 comments)
- Colorado Disposal Services (Fruita, junk removal discount, 970) — first engagement.
- Haul It 4 Less (Roofing A, fall hauling promo) — first engagement.
- Sexy Cat Esthetics (GJ Message Board, now booking lash/brow/wax/facials) — first.
- Thai yoga bodywork (GJ Message Board, new in GJ, Orange Door studio) — first.
- Mesa View Venue (Orchard Mesa, reduced 2026 wedding rates; collapsed WesternCO Msg cross-post L55).
- Poor Man's Acres (Ridgway, Delta laying hens; last engaged 2026-09-19, 9 days — outside window).
- Josh Waalkes (Fruita, fall cleanup pitch, personal profile — group promo post, like-eligible per standing practice).
- Forget Me Not Colorado (Ridgway, in-home care $20/hr new-client special; business Page, first engagement) + comment.
- Efird Family Homestead (Ridgway Sunday farm stand sourdough; business Page, last engaged 2026-09-19, 9 days) + comment.

## Drops
- Western Colorado Chimney pellet-stove ad posts (Ridgway L10, Redlands L19): BLOCKED BUSINESS.
  Owner lookup (facebook-cli post read) showed owner_name "Western Colorado Chimney",
  owner Page ID 61565264274777 — a NEW Page ID not in the builder's WCO_CHIMNEY_IDS
  set and invisible to the builder's name check (page_name is built from group+text,
  owner name is not in candidate data). Both posts dropped manually. Added
  61565264274777 to WCO_CHIMNEY_IDS in build-fb-job.py (canonical template) with a
  note that pellet-stove/chimney posts need owner-name verification every pass —
  the mechanical checks cannot see owner IDs from URL-derived post IDs alone.
- AG Property Services 7x cross-posts (GJ Message Board, Ridgway, Delta, Orchard Mesa,
  GJ community, GJ Events, Redlands): do-not-retry honored (engaged pass-138).
- Excavation/grading 3x cross-posts (GJ Message Board, GJ community, Roofing A):
  720 (Denver) phone number + near-dup collapse — dropped.
- Blessed Harvest 2x, Rise and Shine Bakes, Korean corn dogs, pool-winterization 2x,
  New Maker (Smith Family Orchard Store), Maxie pet business: engaged within 7 days.
- Doughbra's 5x: last engagement 2026-09-22; kept dropped for consistency with
  pass-139's recency drop (re-eligible once outside a full 7-day window).
- The Bread Basket Farm Stand 2x: commented 2026-09-24 (4 days) — inside window, dropped.
- Real-estate listings 2x (Ridgway), lost pet (Betty, Palisade), butter-braids
  fundraiser 2x, Bethel Assembly of God church event 2x, Medicare enrollment,
  CJ-7 for-sale, ISO picture buy, mother-daughter event, Stone House one-liner,
  recommendation asks (dryer, irrigation, truck repair), mattress-haul personal ask,
  lilac advice post, Little League giving solicitation, Applefest car-show raffle,
  Palisade Community Garden director announcement: not genuine business promos.
- Dance workshop registration (bit.ly link): event solicitation, no business identity.
- Greenwood Village acupuncture (CO BizNet): Denver-metro address, out-of-corridor.
- CO BizNet: Rise N Grind podcast promo, Haley Martin junk haul (719 number):
  out-of-corridor group/number.
- Durango: Rock bottom junk removal (505 NM number), Dark Side event update,
  Story Tree Animal Healers: out-of-corridor group.
- CO Desi Garba event: out-of-corridor group.
- Ridgway "Free estimate" one-liner: ambiguous/unverifiable, fail-closed.

## Comments
2 comments, both on verified business-Page-author posts (owner_name from post read):
Forget Me Not Colorado and Efird Family Homestead. Under 20 words, punchy,
non-selling, no PING/link/contact. Page timelines still 0 posts (persistent since
pass 115), so no Page-timeline comment candidates.
