# Pig AC-only no-sleep power policy change — 2026-09-27

Authority: Nolan's explicit approval, 2026-09-27 16:09 MDT.
Scope granted: AC ONLY. Battery (DC) behavior unchanged. If AC-only could not be
expressed cleanly, the order was to STOP rather than apply a broader change.
AC-only expression confirmed clean via powercfg /setacvalueindex (per-power-source indexes).

## Evidence that crossed the threshold

- 2026-09-24 sleepstudy (36 entries): Enter Reason = "Video Idle Timeout"; 506 events
  Reason=12 at 2-min display-off cadence. On this S0 Modern Standby Dell, display-off
  triggers standby entry despite AC sleep-after=Never. WiFi low-power during standby
  stalls Tailscale -> proxy CONNECT fails -> SSH unreachable. (power-policy.log)
- 2026-09-27: three wedges at ~30-35 min cadence (standby entries 10:41:25, 13:13:27,
  ~14:05-14:08 MDT; route failures ~30-35 min later); physical touchpad wake restores
  service each time. Watchdog cannot repair a suspended host.

## BEFORE (captured 2026-09-27 ~16:10 MDT, before change)

- Scheme: Balanced (381b4222-f694-41f0-9685-ff5bb260df2e), power source: Online (AC)
- Sleep states available: Standby (S0 Low Power Idle) Network Connected; Hibernate; Fast Startup. S1/S2/S3 unavailable.
- STANDBYIDLE (Sleep after): AC = 0x00000708 (1800s = 30 min), DC = 0x000004b0 (1200s = 20 min)
- VIDEOIDLE (Turn off display after): AC = 0x00000078 (120s = 2 min), DC = 0x00000078 (2 min)
- HIBERNATEIDLE (Hibernate after): AC = 0x00000000 (Never), DC = 0x7fffffff (Never)

Note: on 2026-09-24 the AC sleep-after was already Never; it had reverted to 30 min by
today. That reversion is the direct trigger for the 30-35 min wedge cadence.

## CHANGE APPLIED (~16:11 MDT)

powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP STANDBYIDLE 0
powercfg /setacvalueindex SCHEME_CURRENT SUB_VIDEO VIDEOIDLE 0
Apply rc=0.

Rationale: STANDBYIDLE AC=Never removes the 30-min automatic S0 entry. VIDEOIDLE AC=Never
removes the display-off-triggered S0 entry (the 2026-09-24 proven bypass path on this
S0 Dell). Both are AC-only indexes; DC indexes untouched. Hibernate AC was already Never.

## AFTER (verified ~16:11 MDT via powercfg /query)

- STANDBYIDLE: AC = 0x00000000 (Never), DC = 0x000004b0 (20 min, UNCHANGED)
- VIDEOIDLE: AC = 0x00000000 (Never), DC = 0x00000078 (2 min, UNCHANGED)
- HIBERNATEIDLE: untouched.

Effective policy proven: no automatic sleep/Modern Standby while on AC; battery behavior identical.

## Stated side effect

The display now stays on while the Pig is on AC power (this is what closes the
video-idle standby trigger on this hardware). Screen timeout/lock on battery unchanged.
Manual sleep/shutdown/lid-close unaffected.

## ROLLBACK (exact commands to restore previous values)

powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP STANDBYIDLE 1800
powercfg /setacvalueindex SCHEME_CURRENT SUB_VIDEO VIDEOIDLE 120

Run via: pig_ssh 'powershell -NoProfile -Command "powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP STANDBYIDLE 1800; powercfg /setacvalueindex SCHEME_CURRENT SUB_VIDEO VIDEOIDLE 120"'
Then verify with powercfg /query as above.

## Soak proof (pending, >90 min untouched from ~16:18 MDT)

Criteria: no Kernel-Power 506 since change; tunnel continuously healthy; health heartbeat
continuously healthy; workspace mirror succeeds; one representative Pig automation job
survives. Soak verification scheduled as a one-shot check after the window closes
(window: ~16:11 MDT to ~17:45 MDT).
No synthetic keep-awake input; the policy itself is the fix under test.

---

## SUPERSESSION 2026-09-27 ~16:55 MDT: ALWAYS-ON NODE (Nolan override)

Nolan overrode the 16:11 AC-only policy with a direct order: the Pig is an
automation node and MUST keep working on AC and on battery. Idle sleep is
now NEVER on both AC and DC. Display stays independent (screen may turn off).

BEFORE (effective, read back via powercfg /query 16:52 MDT):
- Sleep after: AC 0x00000000 (Never), DC 0x000004b0 (20 min)
- Turn off display: AC 0x00000000 (Never), DC 0x00000078 (2 min)
- Hibernate after: AC 0x00000000 (Never), DC 0x7fffffff (max/effectively never)
- Battery: 100%, PowerOnLine=True

APPLIED 16:53 MDT via powercfg /change:
- standby-timeout-ac 0 (no-op, already Never)
- standby-timeout-dc 0 (20 min -> Never)
- monitor-timeout-ac 15 (Never -> 15 min; screen may turn off, stays independent)

AFTER (effective, read back via powercfg /query 16:54 MDT):
- Sleep after: AC 0x00000000 (Never), DC 0x00000000 (Never)
- Turn off display: AC 0x00000384 (15 min), DC 0x00000078 (2 min)
- Hibernate after: unchanged (AC Never, DC max). Critical-battery protection,
  thermal protection, emergency shutdown: NOT touched.

NOT changed: hibernate timeouts, lid/power-button behavior, critical-battery
action, thermal controls, browser-worker lock, dead-page recovery,
checkpoints/idempotency. No reboot (not required by this change).

Rollback to AC-only: powercfg /change standby-timeout-dc 20 (minutes);
powercfg /change monitor-timeout-ac 0. Rollback to pre-2026-09-27: also
powercfg /change standby-timeout-ac 30.
