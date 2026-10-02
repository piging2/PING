# FYD Circle visual-correction lane: staged work + collision notes

Date: 2026-09-22. Branch: fyd/builder-composition. HEAD 0dec40f5c5823a8040bcd1f710e25c3103d499c3 (unchanged).

## What this staged set implements (Nolan's 2026-09-22 visual correction)

RESTING (40px quiet circle) -> OBJECT (compact 300x400 light card) -> ASK (300x460 ask oval).
No peek card, no Expand action. Hover/focus/tap opens the compact card directly
(internal peek/pinned phases kept only for hover persistence; both render the same card).

Files (staged under ~/workspace/fyd-object-primitive-lane/work-circle/):

- ObjectCircle.tsx
  - New: OBJECT_W=300, OBJECT_H=400, SHORT_DESC_MAX=140, light surface (#FBFAF7/#1A1729).
  - New: compactActionsFor (schema + evidence + capabilities -> Website, Contact,
    Follow, Like, Ask last; view never renders; call+email collapse to Contact;
    address/location schemas suppress Like/Follow; unsafe URLs gated by
    isSafeWebHref), shortDescriptionFor (owner > derived > excerpt, one sentence,
    word-boundary budget), compactProjectionFor (display_name, object_type,
    short_description, location_summary, contact_summary, primary_url,
    available_actions).
  - New: ObjectCardBody (STATE 2, scroll-free, two-column action grid, full-width
    Ask FYD), AskModeBody (STATE 3, suggestions only here), FydOvalFrame (quiet
    gold oval edge, no gems/sparkles/tab), ObjectRichCard (askOpen/onAskChange,
    askStyle placement).
  - FollowButton/LikeButton/BackButton gained a `light` prop.
  - REMOVED: ObjectPeekCard, PeekEntryButton, PEEK_W, PEEK_H_EST, CapabilityAction,
    RichCardBody, OrnateExpandRing, richCardDataFor/richActionsFor.
  - MarginObject: no peekStyle; renders the compact card for both hover and pin.
  - ClusterSlot/ClusterMemberCard: askStyleFor/askStyle; member tap opens the
    compact card.
- types.ts: MarginObjectDescriptor gains optional `shortDescription` (owner override).
- MarginObjectLayer.tsx: cardStyle clamped at OBJECT_W/OBJECT_H, askStyle at
  RICH_W/RICH_H; both passed down. No peekStyle.
- MobileSheet.tsx: list -> compact card -> Ask mode. Light sheet chrome.
- object-cards.test.tsx: rewritten for the new architecture (action ranking,
  short-description precedence/budget, Happy Place + Coppersmith projections,
  STATE 2 markup rules incl. no-scroll, no Ask suggestions in compact card).
- royal-mirror.test.tsx: updated (object/ask frame geometry, no peek tests).

## COLLISION (transfer blocked)

Pre-transfer hash check at ~16:54 MDT found the Pig's target files were modified at
16:02-16:03 MDT by another active agent (Royal Mirror / object-primitive lane):

- src/fyd/ui/object-layer/ObjectCircle.tsx  db799a3d... (was 79dfc759... at copy time)
- src/fyd/ui/object-layer/MobileSheet.tsx   c9cb481a...
- src/fyd/ui/__tests__/object-cards.test.tsx 87741707...
- src/fyd/ui/__tests__/royal-mirror.test.tsx  c5f55d6c...
- src/fyd/ui/object-layer/types.ts          f03db06b... (mtime 15:26)

Per lane rules ("recheck hashes, stop on drift, do not overwrite newer edits")
NOTHING was transferred, committed, or pushed. Tests and tsc were not run on the
Pig (they require the transfer).

## Merge guidance

- The removed exports (ObjectPeekCard, PEEK_W/PEEK_H_EST, peekStyle) are consumed
  ONLY by the six files in this transfer set; no other src or test file imports
  them (verified on the Pig). The transfer set is self-contained.
- To reconcile: diff the Pig's current files against this staged set, then either
  rebase this lane's changes onto the other agent's versions or sequence the two
  lanes so only one writes these paths at a time.
- Open design point resolved in this staged set per the latest directive: the old
  Ask/Follow/Expand peek card is deleted entirely (the directive said "Do not
  preserve the old Ask/Follow/Expand peek card"), not merely hidden.

## Staged file hashes (final)

- ObjectCircle.tsx: 4fa536adfb3c8d355067a3c50f51b0d00fb043eabfb55ad823e6d89f22df9fe2
- MarginObjectLayer.tsx: 2afbfd46f17225f2594d25e00946d783b6fbbf8a5ec350856d6b836d40cbc203
- MobileSheet.tsx: 7d1a03613d04b9492eec656dc6eba48f93325231b3d64e0fb71852ff2795ec06
- types.ts: 53023f02ec5354eece74165fe2b6d6b1d1cbf090d5d92578a945eff7848870c5
- object-cards.test.tsx: 02cf59152761007f12d68b250f774cd94d3cea432256d69200c2d07e454ac187
- royal-mirror.test.tsx: b6e38da1acf5d76a67bba7651c584d20716450c2043bbb7ee7c90e14199f6bd6
