# Open observations

Seeds for the future continuity layer. Things that are true, bounded, and
not yet fully explained. Do not let these get forgotten; do not block
productivity on them either.

## OPEN: Pig headed-Chrome process periodically disappears
- First seen: 2026-09-13 (~10:25 MDT, then ~11:00, ~11:36, ~11:41)
- Symptom: the fb-profile headed Chrome (CDP :9223) is gone entirely;
  watchdog log reports "no fb-profile chrome process running".
- Ruled out: the watchdog itself (zero "stopping fb-profile chrome PIDs"
  entries in the full log as of 2026-09-13 11:45 MDT; it has never killed
  the process). Not a reboot (Pig uptime continuous since 2026-09-12).
- Recovery: VERIFIED. The repaired 5-minute PigiFBLogin repetition
  relaunches it; on-demand `schtasks /run` also works but is slower than
  the 90s preflight window in ensure-cdp.sh.
- Root cause: UNKNOWN.
- Impact: bounded by watchdog. Worst case is a failed preflight (clean
  INFRA exit, no false success) and a retry after recovery.
- Investigation priority: opportunistic, not blocking.

## META-AI CAPTURE
- previous: false-success possible (completion gate measured total page
  text; prompt echo alone satisfied it)
- current: false-success prevented (gate measures growth beyond prompt
  echo; validate-meta-answer.py presence check; capture_failed sidecar
  state; .CAPTURE_FAILED quarantine suffix)
- live verification: pending (two clean INFRA preflight failures on
  2026-09-13, 11:38 and 11:42 MDT, both during substrate flapping; no
  false success in either case; retry scheduled after substrate
  stabilizes across watchdog cycles)

## 2026-09-13 ~12:07 MDT: third natural disappearance, full recovery chain proven
Timeline: CDP up at 12:04 (manual check, HTTP 200). Verification run's ensure-cdp.sh found CDP down ~12:07 and fired PigiFBLogin on demand; 90s wait expired before Chrome finished starting (INFRA cdp_down_after_relaunch, exit 2). By 12:10 CDP was 200 again. check_cdp.js on the Pig reported LOGIN ok at ~12:12.
Chain observed in the wild: disappears → detected (preflight) → recovered (on-demand task fire) → CDP reconnects → login remains valid → worker can continue on next attempt. Recovery did not come from a scheduled tick this time (no watchdog log entries; the on-demand fire did it), but the mechanism is the same task. This is the first disappearance AFTER the 5-min repetition repair; two earlier events (10:03, 10:04) were pre-repair. Per steering: record and move on. If disappearances repeat post-repair with this frequency, then investigate cause with this reproducible observation. Verification attempt telemetry: attempt=a-weak-website-hunt 12:06 MDT, classification=INFRA cdp_down_after_relaunch (environmental, retryable), evidence=run stdout (no capture file, correctly), resumable=rotation unchanged at a-weak-website-hunt, substrate healthy.

## CORRECTION 2026-09-13 ~12:25 MDT: the 12:06 "disappearance" never happened
Reclassification of the above 12:07 entry. While migrating ensure-cdp.sh to the
shared SSH helper, the probe was found to return "200\r" (PowerShell CRLF over
SSH); the `[ "$(probe)" = "200" ]` comparison could never match, so EVERY
preflight since ensure-cdp.sh was written failed closed as cdp_down_after_relaunch
even with CDP up. This was a pre-existing bug in our probe, not a substrate fault.
Corrected telemetry:
- Real Chrome disappearances: 2, both pre-repair (10:03, 10:04), both recovered via on-demand task fires.
- Post-repair (11:39+): zero disappearances; watchdog log has no new entries; CDP continuously up.
- The 12:06 verification failure is reclassified: TOOL probe_bug (broken comparison), not INFRA. CDP was up throughout.
- The full natural recovery chain post-repair is therefore still UNOBSERVED (no natural disappearance to recover from). Stability across ticks is proven; the disappearance half of the proof awaits a real event.
Fix: probe() now pipes through `tr -d '\r'`; ensure-cdp.sh verified exit 0 in 1.6s with CDP up. Lesson for the telemetry discipline: "clean preflight failure" is not the same as "correct failure classification"; the classifier itself needs testing.
