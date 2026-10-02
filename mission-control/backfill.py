#!/usr/bin/env python3
"""Mission Control historical backfill runner.

Reads on-disk PING/fyd/outreach evidence and emits one MC_* event per
historical fact into the EXISTING journal via emit.py. No new store.

Every event carries:
  source_timestamp       when the thing happened
  observation_timestamp  when it was observed/recorded
  import_timestamp       when this backfill ran (journal acceptance)
  source_artifact        path + sha256 of the evidence it came from
  confidence/status      grading of the claim
  backfill marker        backfill:true, distinguishing it from live events

Deterministic and replay-safe: event_ids derive from content; re-running
skips every already-present event (duplicate-skipped, zero double writes).

What is deliberately NOT backfilled (see the final report):
  - pass-113 fb-20260924-175129 42 UNKNOWN_EXECUTION (open reconciliation, do not infer)
  - IG 429 short-circuit fix (unverified; do not claim)
  - any FYD gate PASS (no gate output file on disk for the styling commit;
    backfilled data must never upgrade a lane to GREEN)
  - email send-level detail (queue file lists drafts, not sends; HOLD covers lane state)

Usage: python3 backfill.py [--dry-run]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from emit import emit_event  # noqa: E402

WS = os.path.expanduser("~/workspace")

ART = {
    "copper1440": ("sprint-2026-09-24/support/coppersmith-proof-1440.png",
                   "804030cda07fb113d82328d20099859b0802432e183bd9d73aeb1864ad164e0a"),
    "copper375": ("sprint-2026-09-24/support/coppersmith-proof-375.png",
                  "0bf2dc2ea2bf48fee8fdc1afc56ecd902ef7a8226d840a1aa58106c0f632c335"),
    "copper390": ("sprint-2026-09-24/support/coppersmith-proof-390.png",
                  "98ce6de4d862795cedf0f3580bc4718d730b51f58a3e1577dd50a11a7e49c9ff"),
    "hpp_ref": ("sprint-2026-09-24/support/HPP-CONTRACTOR-FAMILY-REFERENCE.md",
                "9d903c77fa4d41590df331a63b9bdd1e452f8e4131f95a42085c31c4cb76c298"),
    "x_ledger": ("outreach/action-intent-ledger.jsonl",
                 "8aeb15154c245bde5b80a882d0dfaeb727f0be27946f8f9bb4a3a66571fd4d13"),
    "fb_eng": ("outreach/facebook-engagement.md",
               "268283134c4e61e65d4ab99d817b55be126a3dee89e55cffbe7a80b4259b9263"),
    "ig_eng": ("outreach/instagram-engagement.md",
               "7d8a5c20f532a5d9c590ac7510d2b964cf8892e907a607d779a7eb201f59aacf"),
    "email_q": ("outreach/email-queue-2026-09-26.md",
                "f7c57aecdb542c3cd4e9ffc8c1ff5328f73bc571dfd2f22b1928081900be14e8"),
    "distill139": ("goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/learn-round139.provenance.json",
                   "34acb2464f0c0cf1f4c77d4ec758da82c8f53290078a39918062b1c2dc057620"),
    "distill140": ("goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/learn-round140.provenance.json",
                   "bffe13791b656ecc96b08df850b2d9e45965c798ff7c51d1ed0294f0c75d9a43"),
}


def artifact(*keys, note=None):
    arts = [{"path": WS + "/" + ART[k][0], "sha256": ART[k][1]} for k in keys]
    doc = {"files": arts}
    if note:
        doc["note"] = note
    return doc


# import_timestamp fixed per run (no wall clock inside individual records).
IMPORT_TS = "2026-09-26T13:10:00Z"

RECORDS = [
    dict(
        event_type="MC_ARTIFACT_PUBLISHED", lane="fyd-product",
        summary="Styling lane commit 4eb904013ee05646c57b403fe6a2f3f2d6ffa89a on "
                "branch fyd/builder-rebuild-v1 ('Styling lane: compile real family CSS "
                "for the Coppersmith proof, Tailwind v4.3.3 + verified DTCG tokens'); "
                "proof screenshots at 1440/375/390 captured.",
        source_timestamp="2026-09-25T21:36:14-06:00",
        observation_timestamp="2026-09-26T11:33:00Z",
        source_artifact=artifact("copper1440", "copper375", "copper390", "hpp_ref",
                                 note="Commit SHA/message/time from the lane delivery "
                                      "report (2026-09-26 05:33 MDT); the FYD repo is not "
                                      "reachable from this sandbox for independent git "
                                      "cat-file verification. Screenshots digested on disk."),
        confidence="MEDIUM",
        status="ARTIFACT-PUBLISHED",
    ),
    dict(
        event_type="MC_HOLD_RAISED", lane="fyd-product",
        summary="Nolan verdict on the Coppersmith proof (2026-09-26 ~06:44 MDT): "
                "'I would not choose the FYD Coppersmith page over a strong incumbent "
                "contractor site yet.' Ordered the 10h FYD Finish Strong product push "
                "(two working URLs, generic family generator, real imagery, mobile UX, "
                "Ask FYD, demo owner mode). Proof superseded; lane held pending the push.",
        source_timestamp="2026-09-26T12:44:00Z",
        observation_timestamp="2026-09-26T12:44:00Z",
        source_artifact={"note": "Transcript-sourced: parent handoff summary of Nolan's "
                                 "06:44 MDT directive. No on-disk artifact; quoted verbatim. "
                                 "Do not treat as gate output."},
        confidence="HIGH",
        status="HOLD",
    ),
    dict(
        event_type="MC_CHECKPOINT", lane="outreach-x",
        summary="X pass x-20260926-111436: 5/5 follows EXECUTED "
                "(@RealTommyMello @AizikZimerman @WilsonCompanies @thehvacjack @tone2k18); "
                "guard 5/5 eligible; comments/likes skipped fail-closed (browser discovery "
                "probe produced no candidates in ~55 min); zero violations; caps unchanged.",
        source_timestamp="2026-09-26T12:53:03Z",
        observation_timestamp="2026-09-26T12:53:03Z",
        source_artifact=artifact("x_ledger", note="10 ledger rows: 5 intents "
                               "(ACTION_INTENT_DURABLE) + 5 OBSERVATION/EXECUTED for pass "
                               "x-20260926-111436; accounts and terminal states verified by "
                               "reading the ledger. Digest covers the whole ledger file at "
                               "backfill time."),
        confidence="HIGH",
        status="CHECKPOINT-OK",
    ),
    dict(
        event_type="MC_HOLD_RAISED", lane="outreach-facebook",
        summary="FB pass 122 NOT_ATTEMPTED (scheduled 2026-09-26 05:26 MDT): stefi proxy "
                "group-posts endpoint HTTP 500, timeline fetch HTTP 403 (server-side). "
                "Third consecutive NOT_ATTEMPTED pass (~12h provider downtime). Nothing "
                "dispatched, run_pass.sh not invoked (fail-closed). Flagged for the "
                "05:00 morning bundle; next step stefi proxy support or Meta read-path fallback.",
        source_timestamp="2026-09-26T11:26:00Z",
        observation_timestamp="2026-09-26T11:29:00Z",
        source_artifact=artifact("fb_eng", note="PASS 120/121/122 NOT_ATTEMPTED sections "
                               "with verified cause (3 probes per pass)."),
        confidence="HIGH",
        status="HOLD",
    ),
    dict(
        event_type="MC_CHECKPOINT", lane="outreach-instagram",
        summary="IG pass 129 (completed ~05:25 MDT): 0 eligible candidates, 0 actions. "
                "Guard: 13 checked, 13 blocked (12 ALREADY_ENGAGED, 1 ambiguous-identity "
                "fail-closed). Discovery regressed (17/17 typeahead search_failed) but "
                "instagram-cli enumeration healthy; no account restriction, session healthy "
                "as nolanpigi. Caps unchanged (20 likes + 5 comments).",
        source_timestamp="2026-09-26T11:25:00Z",
        observation_timestamp="2026-09-26T11:25:00Z",
        source_artifact=artifact("ig_eng", note="Pass 129 section with phase A/B detail "
                               "and tripwire evaluation."),
        confidence="HIGH",
        status="CHECKPOINT-EMPTY",
    ),
    dict(
        event_type="MC_LANE_COMPLETED", lane="tandem-distill",
        summary="Chronic DISTILL auto-close per Nolan's 2026-09-26 lifecycle directive: "
                "round 139 (5 consecutive reports, 40.5h) and round 140 (4 consecutive "
                "reports, 38.4h) recorded terminal distill_skipped at 2026-09-26T12:53:42Z "
                "via mark-distill-closed.sh/chronic-distill-close.py. Evidence preserved "
                "in sidecar transitions + reconciliation history; lifecycle records "
                "resolve on next reconcile.",
        source_timestamp="2026-09-26T12:53:42Z",
        observation_timestamp="2026-09-26T12:53:42Z",
        source_artifact=artifact("distill139", "distill140",
                                 note="distill_skipped transitions verified in both "
                                      "sidecar files; gap-lifecycle.json untouched by design."),
        confidence="HIGH",
        status="COMPLETED",
    ),
    dict(
        event_type="MC_HOLD_RAISED", lane="outreach-email",
        summary="2026-09-26 UTC email cap 10/10 consumed; the 10 already-sent F1 follow-ups "
                "STAND (no recall/compensate); campaign frozen pending classification of "
                "the authority-precedence ambiguity (MACHINE_PROPOSED_RECONCILIATION vs "
                "AUTHORIZED_RECONCILIATION; 8 machine reconciliations need human review).",
        source_timestamp="2026-09-26T02:38:00Z",
        observation_timestamp="2026-09-26T02:38:00Z",
        source_artifact=artifact("email_q", note="Queue file confirms the 2026-09-26 UTC "
                               "cap frame; the freeze decision is from the parent handoff "
                               "(Round 147 record). Send-level rows live in the outreach "
                               "pipeline, not in this queue file."),
        confidence="MEDIUM",
        status="HOLD",
    ),
]


def main():
    dry = "--dry-run" in sys.argv
    results = []
    for rec in RECORDS:
        rec = dict(rec)
        rec.setdefault("import_timestamp", IMPORT_TS)
        ev, how = emit_event(journal_file=None, dry_run=dry, **{k: v for k, v in rec.items()})
        results.append((ev["event_id"], rec["lane"], rec["event_type"], how))
    for eid, lane, etype, how in results:
        print("%s  %-18s  %-20s  %s" % (eid, lane, etype, how))
    print("done: %d records (%s)" % (len(results), "DRY RUN" if dry else "journal appended"))


if __name__ == "__main__":
    main()
