# Cohort media provenance notes (NIGHT-MEDIA, 2026-09-23)

Provenance-records-only. No image bytes were downloaded, no media was
copied, nothing was republished. These records exist so NIGHT-COHORT can
embed them in its acquisition JSONs and so the factory's rights gate
has something honest to grade.

Rights state for EVERY cohort reference: public-viewable-NOT-authorized.
Public viewability does NOT imply republication rights. The factory's
isAcquirable() predicate must keep these out of any manifest; they are
reference-only by construction.

Harvest method: one homepage GET per site (sequential, ~2s spacing),
robots.txt checked first, max 2MB page body, og:image / twitter:image /
image_src / JSON-LD image only. Bounded temporary derivatives for private
evaluation are permitted by policy (a handful per site, small files, never
published), but NIGHT-MEDIA created none; NIGHT-COHORT may do so only
inside its own bounded evaluation and must delete them after.

## gs-gj-hvac-stocker (Stocker Heating and Cooling)
- Page URL: https://www.stockerheating.com/
- Rights state: public-viewable-NOT-authorized
- Robots: robots.txt fetch failed (The read operation timed out); proceeding on homepage only
- [og:image] https://www.stockerheating.com/wp-content/uploads/stocker-hc-grand-junction-co-fvcn.png
  - license signal: self-hosted site media; business-published but NOT authorized for republication
- [json-ld:image] https://secure.gravatar.com/avatar/cecdde9253e9a8a612fe07447061a0743bd828bd39ece1f99310a65f30ff0822?s=96&d=mm&r=g
  - license signal: no explicit license signal observed; default: public-viewable-NOT-authorized

## gs-gj-tree-treeclimbers (Tree Climbers Services)
- Page URL: http://www.treeclimbersservices.com/
- Rights state: public-viewable-NOT-authorized
- Robots: robots.txt fetch failed (timed out); proceeding on homepage only
- [og:image] https://irp.cdn-website.com/095d49ec/dms3rep/multi/opt/tcs+-+image-1920w.png
  - license signal: no explicit license signal observed; default: public-viewable-NOT-authorized
- [json-ld:image] https://irp.cdn-website.com/095d49ec/dms3rep/multi/tree-climbers-services-47.jpg
  - license signal: no explicit license signal observed; default: public-viewable-NOT-authorized
- [json-ld:image] https://irp.cdn-website.com/095d49ec/dms3rep/multi/freshly-cut-trees-for-residential-construction-in-backhoe-clearing-forest-on-land-clearing.jpg
  - license signal: no explicit license signal observed; default: public-viewable-NOT-authorized
- [json-ld:image] https://irp.cdn-website.com/095d49ec/dms3rep/multi/tree-climbers-services-44-258x480.jpeg
  - license signal: no explicit license signal observed; default: public-viewable-NOT-authorized
- [json-ld:image] https://irp.cdn-website.com/095d49ec/import/clib/treeclimbersservices_com/dms3rep/multi/Photo-Nov-02-2024-3-15-22-PM-scaled-1920x2560.jpeg
  - license signal: no explicit license signal observed; default: public-viewable-NOT-authorized
- [json-ld:image] https://irp.cdn-website.com/095d49ec/import/clib/treeclimbersservices_com/dms3rep/multi/tree-climbers-services-13-1920x1440.jpeg
  - license signal: no explicit license signal observed; default: public-viewable-NOT-authorized

## gs-fruita-restaurant-hottomato (Hot Tomato Cafe and Pizzeria)
- Page URL: https://hottomatopizza.com/
- Rights state: public-viewable-NOT-authorized
- Robots: no robots.txt (proceed)
- [og:image] https://static.wixstatic.com/media/c4d97c_d903b0623af045ffbc997bd42517904f%7Emv2.jpg/v1/fit/w_2500,h_1330,al_c/c4d97c_d903b0623af045ffbc997bd42517904f%7Emv2.jpg
  - license signal: no explicit license signal observed; default: public-viewable-NOT-authorized
- [json-ld:image] https://static.wixstatic.com/media/c4d97c_e74603fbc17341daa67641a2f0520b33~mv2.jpg
  - license signal: no explicit license signal observed; default: public-viewable-NOT-authorized

## gs-gj-brewery-kannahcreek (Kannah Creek Brewing Company)
- Page URL: http://www.kannahcreekbrewingco.com/
- Rights state: public-viewable-NOT-authorized
- Robots: no robots.txt (proceed)
- [og:image] https://static.wixstatic.com/media/e6c39f_2452d73d7327480a97ea8234eab58d2c~mv2.jpg/v1/fill/w_2500,h_1666,al_c/e6c39f_2452d73d7327480a97ea8234eab58d2c~mv2.jpg
  - license signal: no explicit license signal observed; default: public-viewable-NOT-authorized
- [json-ld:image] https://static.wixstatic.com/media/e6c39f_43dba8672cc045c7b102ae79ccf07fa4~mv2_d_1800_1800_s_2.png
  - license signal: no explicit license signal observed; default: public-viewable-NOT-authorized

## gs-palisade-hospitality-winecountryinn (Wine Country Inn)
- Page URL: https://coloradowinecountryinn.com/
- Rights state: public-viewable-NOT-authorized
- Robots: no robots.txt (proceed)
- [og:image] http://coloradowinecountryinn.com/wp-content/uploads/2022/01/banner.jpg
  - license signal: self-hosted site media; business-published but NOT authorized for republication

## gs-gj-realestate-bray (Bray and Company)
- Page URL: https://www.brayandco.com/
- Rights state: public-viewable-NOT-authorized
- Robots: no robots.txt (proceed)
- [og:image] https://brayandco.com/wp-content/uploads/2026/03/Bray_80_full-color-scaled.png
  - license signal: self-hosted site media; business-published but NOT authorized for republication

## gs-gj-accounting-dwc (DWC CPAs and Advisors)
- Page URL: http://www.dalbycpa.com/
- Rights state: public-viewable-NOT-authorized
- Robots: robots.txt fetch failed (HTTP Error 404: Not Found); proceeding on homepage only
- Media references found: none on homepage

## gs-gj-retail-enstrom (Enstrom Candies)
- Page URL: https://www.enstrom.com/
- Rights state: public-viewable-NOT-authorized
- Robots: no robots.txt (proceed)
- Media references found: none on homepage

## gs-gj-dental-elevation (Elevation Family Dental)
- Page URL: https://www.elevationfamilydental.com/
- Rights state: public-viewable-NOT-authorized
- Robots: no robots.txt (proceed)
- [og:image] http://static1.squarespace.com/static/5f06bff354560032b2bbca68/t/5f2b279867ae5f21b58f9ac4/1596663706346/Elevation+Full+Color+Wide100.png?format=1500w
  - license signal: no explicit license signal observed; default: public-viewable-NOT-authorized
- [json-ld:image] https://images.squarespace-cdn.com/content/v1/5f06bff354560032b2bbca68/1596663704146-8RT53MRF5A3PNQDPTKVF/Elevation+Full+Color+Wide100.png
  - license signal: no explicit license signal observed; default: public-viewable-NOT-authorized
- [json-ld:image] https://static1.squarespace.com/static/5f06bff354560032b2bbca68/t/5f2b279867ae5f21b58f9ac4/1775771053579/
  - license signal: no explicit license signal observed; default: public-viewable-NOT-authorized

## gs-gj-franchise-savatree (SavATree Grand Junction)
- Page URL: https://www.savatree.com/locations/grand-junction-colorado/
- Rights state: public-viewable-NOT-authorized
- Robots: no robots.txt (proceed)
- [json-ld:image] https://www.savatree.com/img/upload/savatree_1.jpg
  - license signal: no explicit license signal observed; default: public-viewable-NOT-authorized
