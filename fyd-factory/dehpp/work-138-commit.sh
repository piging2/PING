#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
git -c user.name="Pigi" -c user.email="pigi@ping.social" commit -m "DEHPP: data-plane parameterization of the HPP route

Implements dehpp/parameterization-spec.md: 13 typed parameters, 7 replacement
mechanisms, 5 dangerous couplings removed.

- B1: split CustomerSite and DemoChrome; P2 chromeMode gates demo tooling
- B5: renderer voice moved to src/fyd/copy tables (P5/P6/P7)
- B4: composeSite populates hero/gallery/object media at the server seam
- B3: route composes through strategyForSite/planner via composition profile
- B6: SocialProof emits only behind the verified-testimonials gate
- B7: honest composition comments; DC1-DC5 removed from the customer path
- HPP composition pinned as data; golden replay through the new seam is
  SPEC_IDENTICAL with zero validation findings and renderable=true

Tests: 1157/1157 across all lanes, tsc clean. No main/master commits, no push." 2>&1 | tail -3
git log --oneline -2
git status --porcelain | grep -v "^?? node_modules" | head -3
echo "(empty above = clean)"