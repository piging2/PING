# Monument View Coffee Shop — Public Technology Footprint
Research date: 2026-09-09. Business: Monument View Coffee Shop, 2148 Broadway, Grand Junction (Redlands), CO 81507. Phone: 970-985-4045.
Evidence classes used: CONFIRMED (directly visible/technically verifiable), STRONG INDICATION (multiple public clues), WEAK INDICATION (one indirect clue), UNKNOWN (cannot determine).

## Per-question findings

1. **POS system** — UNKNOWN. No public evidence. Website has no e-commerce/ordering; no social posts readable; no "powered by" payment badge. TripAdvisor confirms they accept credit cards (Amex/Discover/Mastercard/Visa) but identifies no processor.
2. **Online ordering offered?** — CONFIRMED: No on their own website. The nav item labeled "ONLINE MENU" (/menu/) is a static informational menu page: no prices, no cart, no order button, no ordering widget (verified live in real browser).
3. **Online ordering platform** — N/A on their site. Only orderable channel found publicly is DoorDash (see 4).
4. **DoorDash** — STRONG INDICATION of a live listing; orderability NOT verified. The shop appears on many DoorDash category pages for Grand Junction/Fruita: "Monument View Coffee Shop / American • Cafe / $0 delivery fee" with a maintained menu (Base Camp Biscuits & Gravy Full $12.44 / Half $8.44, Echo Canyon Parfait $9.15, Otto's Scramble $12.5, Rim Rock Burrito $11.9, Cafe Latte $6.58, Almond Joy $6.99–7.03, White Chocolate Mocha $7.92–8.19). Listing is LISTED; whether orders are actually accepted today could not be checked (DoorDash blocked the real browser with an error page). No DoorDash rating shown in any indexed snippet (weak hint of low order volume).
5. **Uber Eats** — STRONG INDICATION (verified live) they are NOT on Uber Eats. On 2026-09-09, ubereats.com with delivery location set to 81507 (their own ZIP) and a full search for "Monument View Coffee" returned 29 stores (Starbucks, The Human Bean, Colorado Legacy Coffee Roasters, Mountain Air Roasters, etc.) — none was Monument View Coffee Shop.
6. **Other delivery/order platforms** — UNKNOWN for Grubhub/ChowNow/Toast. No public evidence found for any. (Yelp could not be checked — DataDome CAPTCHA.)
7. **Payment processor / ordering payment tech** — UNKNOWN. None identifiable publicly.
8. **Website platform** — CONFIRMED: self-hosted WordPress. Evidence (verified live, homepage HTML + footer): footer text "Powered by WordPress."; theme credit link "Coffee Shop: Cafe" (description="WordPress Coffee Shop: Cafe Theme"); HTML head shows `/wp-includes/css/classic-themes.min.css`, `wp-json/oembed/1.0` links, RSS feeds (`/feed/`, `/comments/feed/`), Gutenberg block CSS (`global-styles-inline-css`). Pages are clean WP permalinks (/menu/, /services/, /about/).
9. **Website manager/host** — UNKNOWN. No registrar, hosting, or developer credits visible on any public page. Notable technical issue: the `www` subdomain does NOT resolve (DNS error in real browser); only the apex domain monumentviewcoffee.com works (redirects to HTTPS). Google Business lists the site as `http://www.monumentviewcoffee.com/` — the URL Google shows does not resolve.
10. **Loyalty/rewards** — UNKNOWN. No public evidence of any loyalty program (none on website, none in indexed DoorDash/social content).
11. **Gift cards** — STRONG INDICATION they sell gift cards in-store only. TripAdvisor listing (claimed/managed by the business) has the attribute "Gift Cards Available". No gift card page, online gift card purchase link, or gift card system identified anywhere on the website.
12. **Online reservation / group-room booking system** — CONFIRMED: none. The /services/ page advertises "table and room reservations" for groups, meetings, game nights, small celebrations, but provides no booking widget, link, or form.
13. **How customers book the group room** — UNKNOWN (no published method). The website gives no instructions; the only contact paths are phone (970-985-4045), email (monumentviewcoffee@outlook.com), Facebook Page, and Instagram. Presumably phone call — but that is inference, not evidence.
14. **Catering/events/private parties/tea parties** — STRONG INDICATION for tea parties/events: TripAdvisor review (May 2025, Debbie N): "My daughters and I went to the Mothers Day Tea. It was lovely as well as a fun afternoon!" Services page advertises the space for "small celebrations," "meetings," "game nights." No catering program is advertised on the website.
15. **Contact channels** — CONFIRMED: phone (970)985-4045 (site header, TripAdvisor, Google); email monumentviewcoffee@outlook.com (site header); Facebook Page https://www.facebook.com/profile.php?id=61570211727520 (site footer; posts not publicly readable — login wall); Instagram https://www.instagram.com/monumentviewcoffeeshop/ (site footer; profile public: "Kim Riggle," 33 followers, ~12 posts Jan–Jul 2026; post content login-walled); Google Business profile exists (hours, phone, website). No website contact form, no FB Messenger link on the site, no Google Business messaging confirmed.
16. **Hours + after-hours inquiry problem** — CONFIRMED hours (Google/TripAdvisor/Restaurantji agree): Sun 8:00 AM–2:30 PM; Tue–Thu 7:00 AM–2:00 PM; Fri 7:00 AM–4:30 PM; Mon & Sat closed. After-hours inquiry problem: STRONG INDICATION by structure — the shop is closed ~20 hours/day and all of Mon/Sat, the website has no contact form or booking system, and group-room/event inquiries (their main inbound lead type) have no self-serve path; any inquiry outside 7 AM–2 PM (or on Mon/Sat) must wait for a callback. Direct evidence of unanswered night-time questions could not be obtained (Facebook posts login-walled).
17. **Other software (scheduling/payroll/inventory/accounting/CRM/messaging)** — UNKNOWN. No public evidence of any. About page notes family members and staff take orders "at the front counter," consistent with simple counter service, but that reveals no system.
18. **Integration clues** — None found. No evidence of connected systems (no shared menus between website and DoorDash beyond both listing items; website menu has no prices while DoorDash does; no online ordering widget embedded anywhere; no reservation system to integrate).
19. **Operational gaps (manual contact required)** — CONFIRMED gaps: (a) no online ordering on website — orders are walk-in, phone, or DoorDash; (b) group/back room reservations have no online booking and no published booking instructions — customer must call/message; (c) gift cards exist per TripAdvisor but cannot be bought online; (d) no contact/quote form for tea parties, meetings, or events; (e) the www subdomain doesn't resolve, and Google lists the non-resolving www URL.
20. **Most valuable improvements to investigate** — see Section E.

## A. WHAT WE KNOW (confirmed)
- Official site: https://monumentviewcoffee.com/ — self-hosted WordPress, theme "Coffee Shop: Cafe", pages: Home, Services, About, /menu/ (static menu, no prices, no ordering). Verified live 2026-09-09 (real browser).
- No online ordering, no reservation/booking system, no contact form, no gift-card purchase, no loyalty program anywhere on the website. Verified live.
- Services page text: "Monument View Coffee also offers table and room reservations, making us a perfect spot for groups, meetings, game nights, or small celebrations." No booking mechanism. Verified live.
- Listed on DoorDash with an actively maintained menu and "$0 delivery fee" (multiple indexed crawls, 23–180 days old). STRONG — listing only; orderability not verified (DoorDash blocked live check).
- NOT on Uber Eats (verified live search at 81507, 2026-09-09).
- TripAdvisor listing is claimed by the business; attributes include "Gift Cards Available," "Takeout," credit card acceptance. A May 2025 review confirms they host a "Mothers Day Tea." Verified live.
- Contact channels: phone, email (outlook.com address), Facebook Page, Instagram (@monumentviewcoffeeshop, "Kim Riggle," 33 followers, posts Jan–Jul 2026). No other digital contact paths found.
- Hours: Sun 8–2:30, Tue–Thu 7–2, Fri 7–4:30, Mon/Sat closed (Google, TripAdvisor, Restaurantji agree).
- Technical defect: www.monumentviewcoffee.com does not resolve (DNS); Google Business advertises the non-resolving www URL.

## B. WHAT WE STRONGLY SUSPECT
- Gift cards are physical/in-store only (TripAdvisor attribute exists; no online purchase path anywhere).
- Group-room bookings happen by phone call — no published process; nothing else is plausible, but no source states it.
- Their operation is low-tech overall: family-run counter service, simple brochure website, one third-party delivery listing, social accounts with tiny followings and no readable engagement.
- DoorDash menu prices are updated over time (price drift across crawls), suggesting someone maintains the listing at least intermittently.

## C. WHAT WE CANNOT DETERMINE
- POS system and payment processor; payroll/scheduling/inventory/accounting/CRM/messaging software; loyalty system; gift card system/issuer.
- Whether the DoorDash listing is actually accepting orders right now.
- Grubhub/ChowNow/Toast/other delivery presence.
- Facebook post content (how they tell customers to order/book/contact; whether there are unanswered inquiries) — login-walled.
- Instagram post captions and full bio — login-walled on interaction.
- Website hosting company/registrar/developer.
- Whether Google Business messaging is enabled.
- Who manages the website (owner vs. third party).

## D. QUESTIONS TO ASK THE OWNER IN PERSON (prioritized)
1. How do customers currently book the group/back room — phone call? How many such requests do you get per week, and do you lose any to missed calls or after-hours messages?
2. Do you run the DoorDash listing yourself? Is it actually taking orders today, and roughly how many DoorDash orders do you get?
3. Have you considered Uber Eats or your own online ordering (order-ahead/pickup)? What stopped you?
4. What POS and card processor do you use in the shop? Does it offer online ordering, gift cards, or loyalty that you haven't turned on?
5. Where do your gift cards come from (POS gift cards, paper certificates?), and would you want to sell them online?
6. Do you do catering or ticketed events like the Mother's Day Tea — and how do people inquire/book those today?
7. Who built and maintains the WordPress site? Do you know the www subdomain doesn't resolve?
8. What software do you use for scheduling, payroll, or bookkeeping — anything you'd want connected to the website?
9. Do you get Facebook/Instagram messages asking questions when you're closed? Who answers them?
10. Would a simple online form for room reservations and event inquiries (that texts/emails you) be useful, or do you prefer phone calls?

## E. POTENTIAL TECHNOLOGY OPPORTUNITIES (investigate, not a pitch)
- Online ordering for pickup: the site menu is static with no prices or cart; investigate whether their POS already includes an order-ahead module before proposing anything new.
- Group-room booking flow: advertised but not bookable; a simple availability/booking request form (or lightweight booking tool) could capture after-hours demand — but only if the owner wants fewer phone calls, not more.
- Delivery footprint: on DoorDash (unverified orderability), absent from Uber Eats; investigate whether expanding or consolidating delivery makes sense given their 2 PM closing time and family-run staffing.
- Gift cards: offered in-store per TripAdvisor but not purchasable online; investigate their POS gift-card capability.
- Website basics: fix www DNS resolution; consider whether the Google Business website link should be the resolving apex domain.
- Inquiry capture: no contact form exists anywhere; group/event/tea-party inquiries currently require a phone call during narrow open hours. A structured inquiry form could be the highest-ROI addition — validate with the owner first (see questions 1, 6, 9).
- Social presence: Instagram is a personal-name account ("Kim Riggle") with 33 followers and posts invisible to signed-out visitors; Facebook posts unreadable without login — assess whether social is an active channel or a dead end before investing.
- Before proposing replacements: their stack is minimal (brochure WordPress site + DoorDash + manual phone), so there is little to "break" — but also little proven demand for online channels; the key unknown is whether the owner actually wants more digital volume.

## Sources
- https://monumentviewcoffee.com/ (+/menu/, /services/, /about/) — verified live via real browser, 2026-09-09. Platform evidence: footer "Powered by WordPress.", theme credit "Coffee Shop: Cafe" (description="WordPress Coffee Shop: Cafe Theme"); HTML head: /wp-includes/css/classic-themes.min.css, wp-json/oembed/1.0, /feed/ RSS. Contact: (970)985-4045, monumentviewcoffee@outlook.com. Social hrefs: https://www.facebook.com/profile.php?id=61570211727520, https://www.instagram.com/monumentviewcoffeeshop/. Services quote: "Monument View Coffee also offers table and room reservations, making us a perfect spot for groups, meetings, game nights, or small celebrations."
- https://www.tripadvisor.co.nz/Restaurant_Review-g33450-d10445039-Reviews-Monument_Viewcoffee_Shop-Grand_Junction_Colorado.html — verified live via real browser, 2026-09-09. Claimed listing; "Gift Cards Available"; "Takeout"; hours; May 2025 "Mothers Day Tea" review.
- https://www.ubereats.com/search?q=Monument%20View%20Coffee (delivery location 81507) — verified live via real browser, 2026-09-09: 29 results, shop not present.
- https://www.instagram.com/monumentviewcoffeeshop/ — verified live via real browser, 2026-09-09 (profile-level only; posts login-walled).
- https://www.facebook.com/profile.php?id=61570211727520 (→ /people/Monument-View-Coffee-Shop/61570211727520/) — verified to exist, login-walled, 2026-09-09.
- DoorDash category pages (index only): https://www.doordash.com/food-delivery/grand-junction-co-restaurants/cafe/ and locale variants — shop listed "American • Cafe / $0 delivery fee" with menu items/prices, crawls 23–180 days old.
- Hours corroboration (index): Google Business data (Sun 8:00–2:30, Tue–Thu 7:00–2:00, Fri 7:00–4:30, Mon/Sat closed), https://www.restaurantji.com/co/grand-junction/monument-village-coffeeshop-/, https://maps.roadtrippers.com/us/grand-junction-co/food-drink/monument-view-coffee-shop.
- Yelp listing exists ("Monument view Coffee shop," 5.0, ~20 reviews) — index only; live page blocked by DataDome CAPTCHA.
- Access blockers disclosed: DoorDash live check blocked (error page); Yelp blocked (CAPTCHA); Facebook/Instagram post content login-walled.
