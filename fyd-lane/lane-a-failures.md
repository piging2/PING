# Lane A failure log

## 2026-09-21 ~13:50 MDT — projection clobbered by wrong-journal dump, recovered

What happened: while gathering proof (a), the lane ran
`python3 /home/nolan/ping/tools/fyd-site-projection/dump.py happy-place`
WITHOUT `FYD_OVERLAY_JOURNAL=demo`. The default journal target (8080
deployment DB) has no FYD_SITE_OVERLAY events, so the dump rewrote
`/home/nolan/ping/var/fyd-projections/happy-place.json` with
`overlayEventIds: []`, dropping the "Pergola Design Consultations"
service object from the live projection.

Detection: the proof command itself printed `overlayEventIds: []` and an
empty service list, contradicting the trace report.

Recovery: re-ran with the correct env,
`FYD_OVERLAY_JOURNAL=demo python3 .../dump.py happy-place`, which
re-read the overlay event 39fc9971a47f807ef38cf8976cb9d4ff4360c27b52bf14f4cc1f4393094d78fd
from the demo journal (ping-fyd-demo) and rewrote the projection.

Verification: live projection now shows
- overlayEventIds = ["39fc9971...d78fd"] (matches trace report),
- graphDigest = 8f4737d846b4e75491b2f8092fabd8d792bb4c896e1e331dd2aac58b38be3607 (matches trace report exactly),
- graph bytes identical to the unit-test fixture copy.

Lesson (durable): dump.py's journal target is env-selected; the bare
`dump.py <slug>` form is NOT the demo-journal form. Always use
`FYD_OVERLAY_JOURNAL=demo` when the demo overlay must survive, and always
re-verify overlayEventIds after any dump.
