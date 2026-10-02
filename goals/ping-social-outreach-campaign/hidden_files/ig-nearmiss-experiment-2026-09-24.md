# IG near-miss follow-up experiment (2026-09-24)

Hypothesis under test: the ig-discover.js firstPost gate ("no post link found") is a defective
observer. The current IG DOM does not render /p/ or /reel/ anchors in the CDP session, so the gate
fires on extraction failure, not on empty feeds. 41 of 49 near-misses on 2026-09-24 died at this gate.

Method: for each of the 49 09-24 near-miss handles, ran the documented (but never implemented)
follow-up: `instagram-cli user-profile` + `instagram-cli posts --username`, and compared DOM gate
result vs follow-up result.

## Result: the failure mode is proven

| disposition | n |
|---|---|
| CONFIRMED_EMPTY | 1 |
| CONFIRMED_EXCLUDE | 36 |
| RECOVERED_CANDIDATE | 10 |
| STILL_UNKNOWN | 2 |

DOM said "no post link found" for all 41 firstPost-gate handles below. The follow-up found real,
fresh posts for many of them (10 recovered as candidates, e.g. @scenicstudiosalons with 31 posts
posted today, @bobbycutz posted 10 days ago), and confirmed real exclusions for others (wrong country,
stale feed, private). The gate was measuring DOM surface drift, not feed emptiness.

| handle | DOM observation | follow-up observation | classification | reason | final disposition |
|---|---|---|---|---|---|
| @adriaticosclifton | no post link found | Adriatico’s Pizza & Sports Bar / business / US / posts=176 / private=False / newest=2026-07-13 (73d) https://www.instagram.com/p/Dav0m9EAWWC/ | RECOVERED_CANDIDATE | verified business, fresh posts | route to A2, NOT skip |
| @akgarlandworld | location not Western CO | dry fruits with vetiver garland / business / IN / posts=11 / private=False / newest=2024-12-10 (653d) https://www.instagram.com/p/DDZX21LJZ29/ | CONFIRMED_EXCLUDE | wrong country IN | skip-eligible (confirmed) |
| @black_rifle_painter246 | no post link found | Sean Neblett / business / BB / posts=56 / private=False / newest=2020-01-11 (2448d) https://www.instagram.com/p/B7Msm-aHFaH/ | CONFIRMED_EXCLUDE | wrong country BB | skip-eligible (confirmed) |
| @blackriflecoffeeshops | no post link found | Black Rifle Coffee Shops / business / US / posts=370 / private=False / newest=2023-09-05 (1115d) https://www.instagram.com/p/Cw0On1jLIZS/ | CONFIRMED_EXCLUDE | stale feed (2023-09-05) | skip-eligible (confirmed) |
| @blackrifleslc | no post link found | Black Rifle Coffee Shop SLC / personal / US / posts=24 / private=True / posts API returned no feed items (metadata/API disagreement) | CONFIRMED_EXCLUDE | private account confirmed | skip-eligible (confirmed) |
| @bobbycutz | no post link found | Bobby Villarreal • Montrose CA Barber / business / US / posts=14 / private=False / newest=2026-09-13 (10d) https://www.instagram.com/reel/DdQOR4MBYXC/ | RECOVERED_CANDIDATE | verified business, fresh posts | route to A2, NOT skip |
| @bostonpizzacliftonhill | no post link found | Boston Pizza, Clifton Hill / business / CA / posts=719 / private=False / newest=2026-09-24 (0d) https://www.instagram.com/p/Ddl5huWRdf2/ | CONFIRMED_EXCLUDE | wrong country CA | skip-eligible (confirmed) |
| @brunospizzaclifton | no post link found | Bruno’s Pizza Clifton / business / US / posts=77 / private=False / newest=2023-02-07 (1325d) https://www.instagram.com/p/CoXY-lZOUz-/ | CONFIRMED_EXCLUDE | stale feed (2023-02-07) | skip-eligible (confirmed) |
| @calvetfruits | location not Western CO | Calvet Fruits / business / ES / posts=594 / private=False / newest=2026-05-16 (131d) https://www.instagram.com/p/DYaJRfvov-w/ | CONFIRMED_EXCLUDE | wrong country ES | skip-eligible (confirmed) |
| @cliftoncrust | no post link found | Clifton Crust Pizza / business / US / posts=6 / private=False / newest=2026-01-17 (250d) https://www.instagram.com/p/DToiEQXDqo9/ | CONFIRMED_EXCLUDE | stale feed (2026-01-17) | skip-eligible (confirmed) |
| @cpvillapizza | no post link found | Clifton Park Villa Pizza / personal / US / posts=5 / private=False / newest=2021-01-14 (2079d) https://www.instagram.com/p/CKCMIVYBaeE/ | CONFIRMED_EXCLUDE | stale feed (2021-01-14) | skip-eligible (confirmed) |
| @culturakutz | no post link found | Cultura Kutz by Julio. Montrose Barber / personal / US / posts=50 / private=False / newest=2024-03-02 (936d) https://www.instagram.com/p/C4AUwWiOPLz/ | CONFIRMED_EXCLUDE | stale feed (2024-03-02) | skip-eligible (confirmed) |
| @delta.cafe | no post link found | Delta Cafe / personal / ID / posts=12 / private=True / posts API returned no feed items (metadata/API disagreement) | CONFIRMED_EXCLUDE | private account confirmed | skip-eligible (confirmed) |
| @delta_.cafe | no post link found | DELTA CAFE / business / IN / posts=32 / private=False / newest=2026-08-29 (26d) https://www.instagram.com/p/Dcnh3yvq_Qh/ | CONFIRMED_EXCLUDE | wrong country IN | skip-eligible (confirmed) |
| @delta_cafe | no post link found |  / personal / ID / posts=1 / private=False / newest=2020-06-26 (2281d) https://www.instagram.com/p/CB6AkQfHuso/ | CONFIRMED_EXCLUDE | wrong country ID | skip-eligible (confirmed) |
| @deltaautocambridge | no post link found | Delta Auto Repair / business / CA / posts=11 / private=False / newest=2026-07-09 (77d) https://www.instagram.com/p/DalfWszv1q2/ | CONFIRMED_EXCLUDE | wrong country CA | skip-eligible (confirmed) |
| @deltaautorepair | no posts | profile lookup empty/failed | STILL_UNKNOWN | CLI returned no profile; cannot confirm or deny | pending re-verify, NOT skip |
| @deltacafe | no post link found | profile lookup empty/failed | STILL_UNKNOWN | CLI returned no profile; cannot confirm or deny | pending re-verify, NOT skip |
| @deltacafesetif | no post link found | Delta Cafe / creator / DZ / posts=33 / private=False / newest=2023-07-19 (1163d) https://www.instagram.com/p/Cu4EkhJof0s/ | CONFIRMED_EXCLUDE | wrong country DZ | skip-eligible (confirmed) |
| @deltaconcreteservices | no post link found | Delta Concrete Services / business / US / posts=3 / private=False / newest=2022-11-03 (1421d) https://www.instagram.com/p/CkhOKtUuSOO/ | CONFIRMED_EXCLUDE | stale feed (2022-11-03) | skip-eligible (confirmed) |
| @deltaservice.az | no post link found | Delta Service / business / AZ / posts=43 / private=False / newest=2025-10-11 (348d) https://www.instagram.com/p/DPqtUauDeP5/ | CONFIRMED_EXCLUDE | wrong country AZ | skip-eligible (confirmed) |
| @deltaservicos.ce | no post link found | Delta Serviços / business / BR / posts=9 / private=False / newest=2026-08-19 (36d) https://www.instagram.com/p/DcPT_99tQKI/ | CONFIRMED_EXCLUDE | wrong country BR | skip-eligible (confirmed) |
| @deltaservicoscolchaoltda | no posts | Delta Serviços / business / BR / posts=0 / private=False | CONFIRMED_EXCLUDE | wrong country BR | skip-eligible (confirmed) |
| @deltatireusa | no post link found | Delta Tire and Auto Repair / business / US / posts=1403 / private=False / newest=2026-09-21 (3d) https://www.instagram.com/p/Ddjm2qHE1HB/ | RECOVERED_CANDIDATE | verified business, fresh posts | route to A2, NOT skip |
| @dogalvetaze | location not Western CO | Sunfarm Dried Fruits / business / TR / posts=15 / private=False / newest=2020-07-09 (2268d) https://www.instagram.com/p/CCa1fR2HvyT/ | CONFIRMED_EXCLUDE | wrong country TR | skip-eligible (confirmed) |
| @ellarosecarbondale | no post link found | Ellarose Salon / business / US / posts=26 / private=False / newest=2026-07-20 (65d) https://www.instagram.com/p/DbCZlIbDfG2/ | RECOVERED_CANDIDATE | verified business, fresh posts | route to A2, NOT skip |
| @finesse_barbershop_montrose | no post link found | Finesse Barbershop Montrose / business / US / posts=29 / private=False / newest=2026-08-14 (41d) https://www.instagram.com/p/DcBWTylkXYv/ | RECOVERED_CANDIDATE | verified business, fresh posts | route to A2, NOT skip |
| @fringecarbondale | no post link found | Fringe The Salon / business / US / posts=132 / private=False / newest=2026-06-29 (86d) https://www.instagram.com/p/DaMYXpXkV-U/ | RECOVERED_CANDIDATE | verified business, fresh posts | route to A2, NOT skip |
| @fruit_a__gym | location not Western CO | fruit_ a _gym / personal / IN / posts=4 / private=False / newest=2026-02-04 (231d) https://www.instagram.com/reel/DUXDXx6AaIu/ | CONFIRMED_EXCLUDE | wrong country IN | skip-eligible (confirmed) |
| @fruit_a_gym | location not Western CO |  / personal / KR / posts=23 / private=True / posts API returned no feed items (metadata/API disagreement) | CONFIRMED_EXCLUDE | private account confirmed | skip-eligible (confirmed) |
| @fruitandfitness.gym | no post link found | Fruit and Fitness palestra Via Nizza 69 Roma / business / IT / posts=72 / private=False / newest=2026-07-07 (79d) https://www.instagram.com/p/DaflnN8MaQ7/ | CONFIRMED_EXCLUDE | wrong country IT | skip-eligible (confirmed) |
| @hairwearesalon.gj | no post link found | Grand Junction Specialty Salon / business / US / posts=1040 / private=False / newest=2026-09-22 (1d) https://www.instagram.com/p/DdnFH5jlD9J/ | RECOVERED_CANDIDATE | verified business, fresh posts | route to A2, NOT skip |
| @jmu_dpe | no post link found | Delta Phi Epsilon Foreign Service, Chi Chapter / business / US / posts=230 / private=False / newest=2026-09-20 (4d) https://www.instagram.com/p/Ddgu2b0Fqwu/ | RECOVERED_CANDIDATE | verified business, fresh posts | route to A2, NOT skip |
| @kentuckylongrifle65 | no posts | ME Painter / personal / US / posts=0 / private=False | CONFIRMED_EMPTY | post_count 0 confirmed | skip-eligible (confirmed) |
| @leticiahairapysalon | no post link found | Grand Junction Hairstylist / creator / US / posts=541 / private=False / newest=2026-09-09 (15d) https://www.instagram.com/p/DdFAmozgr2m/ | RECOVERED_CANDIDATE | verified business, fresh posts | route to A2, NOT skip |
| @lorn__house__gym001 | no post link found | Rajputana_Rifles❤️❤️💪 / personal / IN / posts=7 / private=False / newest=2026-03-01 (207d) https://www.instagram.com/p/DVVrtC9ErYK/ | CONFIRMED_EXCLUDE | wrong country IN | skip-eligible (confirmed) |
| @montrose_barbershop | no post link found | Kirsty Van Den Essen / business / AU / posts=50 / private=False / newest=2025-10-31 (328d) https://www.instagram.com/p/DQdxfT7E_GW/ | CONFIRMED_EXCLUDE | wrong country AU | skip-eligible (confirmed) |
| @montrosebikeshop | no post link found | Montrose Bike Shop / business / US / posts=552 / private=False / newest=2025-02-26 (575d) https://www.instagram.com/p/DGip2SXRZtz/ | CONFIRMED_EXCLUDE | stale feed (2025-02-26) | skip-eligible (confirmed) |
| @montrosebikeshopwomen | no post link found | montrose bike shop women / personal / US / posts=110 / private=False / newest=2015-07-17 (4087d) https://www.instagram.com/p/5QQCY2qZ_-/ | CONFIRMED_EXCLUDE | stale feed (2015-07-17) | skip-eligible (confirmed) |
| @nutriflex_gym | no post link found |  / personal / IN / posts=2 / private=True / posts API returned no feed items (metadata/API disagreement) | CONFIRMED_EXCLUDE | private account confirmed | skip-eligible (confirmed) |
| @origens_miravet | no post link found | toni i Ana fruita / personal / ES / posts=69 / private=False / newest=2026-06-04 (112d) https://www.instagram.com/p/DZKkTQSFwNW/ | CONFIRMED_EXCLUDE | wrong country ES | skip-eligible (confirmed) |
| @repairdeltaauto | no post link found | Hernandez Deltah / business / US / posts=19 / private=False / newest=2025-12-08 (289d) https://www.instagram.com/p/DSBrxQwDpYb/ | CONFIRMED_EXCLUDE | stale feed (2025-12-08) | skip-eligible (confirmed) |
| @scenicstudiosalons | no post link found | Luxury Studio Salons / Grand Junction, CO / Move-In Ready / creator / US / posts=31 / private=False / newest=2026-09-20 (4d) https://www.instagram.com/p/Ddg9J4Jxgow/ | RECOVERED_CANDIDATE | verified business, fresh posts | route to A2, NOT skip |
| @shadesaloncarbondale | no post link found | Shade Salon / business / US / posts=191 / private=False / newest=2024-09-10 (744d) https://www.instagram.com/p/C_vT6s8vBw-/ | CONFIRMED_EXCLUDE | stale feed (2024-09-10) | skip-eligible (confirmed) |
| @squatchoftheshop | no post link found | Lefty the Black Rifle Coffee Sasquatch / personal / US / posts=7 / private=False / newest=2023-08-26 (1125d) https://www.instagram.com/p/CwbSFRNPnCZ/ | CONFIRMED_EXCLUDE | stale feed (2023-08-26) | skip-eligible (confirmed) |
| @surreydelta_auto_repair | no post link found | Surrey Delta Auto Repair / business / CA / posts=227 / private=False / newest=2025-07-17 (434d) https://www.instagram.com/p/DMOKjFbTSNw/ | CONFIRMED_EXCLUDE | wrong country CA | skip-eligible (confirmed) |
| @thetrendspa | no post link found | FELICIA / ESTHETICIAN / GRAND JUNCTION CO / business / US / posts=120 / private=False / newest=2024-12-12 (651d) https://www.instagram.com/p/DDfcgMpuSyo/ | CONFIRMED_EXCLUDE | stale feed (2024-12-12) | skip-eligible (confirmed) |
| @vibfacc | no post link found | Veterans In Business By The Fruita Area Chamber of Commerce / business / US / posts=30 / private=False / newest=2024-07-12 (803d) https://www.instagram.com/p/C9V_nxyoN_f/ | CONFIRMED_EXCLUDE | stale feed (2024-07-12) | skip-eligible (confirmed) |
| @zonal_barbers | no post link found | Montrose - Barber - Austin / business / GB / posts=33 / private=False / newest=2026-08-21 (34d) https://www.instagram.com/p/DcSy7zosoas/ | CONFIRMED_EXCLUDE | wrong country GB | skip-eligible (confirmed) |

Raw evidence: `ig-nearmiss-raw-2026-09-24/` (profiles/ and posts/ JSON per handle).
Handles file: `ig-nearmiss-handles-2026-09-24.txt`.

## Conclusion

The "no post link found" near-miss is a false negative at scale: handles the DOM called empty
have dozens to hundreds of posts, many posted within days. The gate must emit FOLLOWUP_REQUIRED,
never a durable skip. Implemented in ig-discover.js (observation_status), ig-nearmiss-followup.js
(CLI verification before any skip decision), ig-disposition.js (disposition rules), and
ig-observation.test.js (regression invariant).
