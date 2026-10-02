# What Cannot Be Captured Retroactively

Read this BEFORE the next incident, so the responder runs
capture-evidence.sh immediately instead of discovering these gaps afterward.

## Evidence with a hard expiry

1. **docker events history is in-memory only.** The daemon keeps a bounded
   ring buffer of past events. It is NOT persisted to disk. If dockerd
   restarts, everything before the restart is gone permanently. If the
   incident is old enough that the ring has wrapped, the incident window is
   gone. There is no flag to recover it afterward. This is the single most
   important reason the capture script must run FIRST.
2. **docker logs of a removed container are gone.** If the incident involved
   `compose down` (containers removed) or any `docker rm`, the container's
   log files were deleted with it. `docker logs` afterward returns nothing.
   The json-file log driver also rotates; old rotations are deleted per
   max-file/max-size settings.
3. **dmesg is a kernel ring buffer.** OOM killer lines and other kernel
   messages are overwritten as new messages arrive. On a busy or long-uptime
   host, the OOM line from the incident may already be gone. journald's
   persistent kernel log (50-journal/kernel.txt) is the more durable copy,
   but see below.
4. **journald retention is bounded.** If journald uses volatile storage
   (/run/log/journal) everything is lost on reboot. Even with persistent
   storage, SystemMaxUse caps total size and old entries rotate out.
   `journalctl --list-boots` shows how far back you can actually reach.
5. **auth.log / secure rotate via logrotate.** Typically weekly with a few
   compressed generations kept. An incident older than the retained
   generations has no SSH/auth trail. The script grabs auth.log.1's tail as a
   fallback, but that is the last fallback.
6. **wtmp/last is finite.** `last` output covers recent logins only; old
   entries age out.
7. **docker inspect of a removed container is impossible.** Exit codes,
   OOMKilled flags, restart counts, and network attachments for a container
   that no longer exists cannot be reconstructed. `docker ps -a` only helps
   while the (stopped) container still exists.

## Evidence that never existed (structural gaps)

8. **dockerd does not log who issued a stop/kill via the API.** There is no
   built-in audit trail mapping an API call to a user, source IP, or SSH
   session. The decision tree's SSH/operator branch can only do timing
   correlation, never proof. Closing this gap requires a deliberate change
   (dockerd debug logging, an auditd rule on the docker socket, or a
   reverse-proxy with auth logging). That is a host change and a decision for
   the operator; it is NOT installed by the capture script.
9. **Ephemeral container forensics evaporate.** Randomly-named short-lived
   containers (as seen in the reference incident) leave almost nothing behind
   once removed: no logs, no inspect, only their create/die lines in docker
   events, and only while the ring buffer retains them.
10. **Process-level attribution is absent by default.** Without auditd or
    similar, there is no record of which local process opened the docker
    socket and when. A stop issued by a local agent process vs a human over
    SSH is indistinguishable after the fact.

## What the capture script assumes

- The script must run ON the host with docker access. Run from anywhere else,
  it captures nothing useful.
- It needs the incident window. "Sometime last night" is not a window; pin
  it from the first alert, health-check failure, or log timestamp, minus
  15 minutes of margin.
- It is a one-shot snapshot, not monitoring. It does not watch for the next
  incident. (A lightweight alert on correlated stops is a separate backlog
  item, deliberately out of scope for this lane: no new daemons, no new
  dependencies, no surveillance software.)

## Bottom line for the next responder

Run the script the moment a correlated stop is detected, before any restart.
Every section of the runbook's decision tree depends on evidence that is
already decaying. A perfect capture taken late is worth less than an
adequate capture taken immediately.
