#!/usr/bin/env bash
# claim.sh - atomic shard claim/lock for the FYD factory mission protocol.
#
# The atomic primitive is mkdir(2): creating missions/<class>/shard-<N>/.claim
# is atomic on POSIX, so exactly one worker can win a race for a shard.
# Marker contents (worker id, pid, timestamps, lease expiry) live in
# .claim/owner, written by the claim winner only, via temp-file + rename.
#
# Usage:
#   claim.sh claim   <class> <shard-N> <worker-id> [--lease-sec SEC]
#   claim.sh renew   <class> <shard-N> <worker-id> [--lease-sec SEC]
#   claim.sh release <class> <shard-N> <worker-id>
#   claim.sh status  <class> <shard-N>
#
# claim: wins if no marker exists; takes over if the lease is stale
#        (now > expires_at); FAILS LOUDLY (exit 1) if a fresh lease exists.
# renew: owner extends the lease. release: owner removes the marker.
# status: prints current marker state, exit 0 even when unclaimed.
#
# Env: FYD_MISSIONS_DIR overrides the missions root (defaults to this script's
#      directory). FYD_CLAIM_GRACE_SEC extra seconds added to stale checks
#      (default 0).
#
# Lease default: 21600 s (6 h), longer than any wave-1 shard run. Workers must
# renew before expiry on long runs; an expired lease is takeable by design.
set -u

MISSIONS_DIR="${FYD_MISSIONS_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
GRACE="${FYD_CLAIM_GRACE_SEC:-0}"
DEFAULT_LEASE=21600

die() { echo "claim.sh: ERROR: $*" >&2; exit 1; }
say() { echo "claim.sh: $*"; }

cmd="${1:-}"; shift || true

now() { date +%s; }

shard_dir() {  # class, shard
  printf '%s/%s/shard-%s' "$MISSIONS_DIR" "$1" "$2"
}
claim_dir() { printf '%s/.claim' "$(shard_dir "$1" "$2")"; }

read_owner() { # claimdir; prints owner file or empty
  [ -f "$1/owner" ] && cat "$1/owner" || true
}
owner_field() { # claimdir field
  grep -E "^$2=" "$1/owner" 2>/dev/null | head -1 | cut -d= -f2- || true
}

write_owner() { # claimdir worker lease_sec [note]
  local dir="$1" worker="$2" lease="$3" note="${4:-}"
  local t; t="$(now)"
  local tmp="$dir/.owner.tmp.$$"
  {
    echo "worker=$worker"
    echo "pid=$$"
    echo "host=$(hostname)"
    echo "claimed_at=$t"
    echo "lease_sec=$lease"
    echo "expires_at=$(( t + lease ))"
    [ -n "$note" ] && echo "note=$note"
  } > "$tmp"
  mv "$tmp" "$dir/owner"
}

lease_state() { # claimdir -> FRESH | STALE | NONE
  local dir="$1"
  [ -d "$dir" ] || { echo NONE; return; }
  local exp; exp="$(owner_field "$dir" expires_at)"
  if [ -z "$exp" ]; then echo STALE; return; fi  # corrupt marker: treat as stale
  if [ "$(( $(now) + GRACE ))" -gt "$exp" ]; then echo STALE; else echo FRESH; fi
}

do_status() { # class shard
  local dir; dir="$(claim_dir "$1" "$2")"
  case "$(lease_state "$dir")" in
    NONE)  say "shard $1/$2: UNCLAIMED"; exit 0 ;;
    FRESH) say "shard $1/$2: CLAIMED (fresh lease)"; read_owner "$dir"; exit 0 ;;
    STALE) say "shard $1/$2: CLAIMED (STALE lease, takeable)"; read_owner "$dir"; exit 0 ;;
  esac
}

do_claim() { # class shard worker lease
  local class="$1" shard="$2" worker="$3" lease="${4:-$DEFAULT_LEASE}"
  local sdir cdir
  sdir="$(shard_dir "$class" "$shard")"
  cdir="$(claim_dir "$class" "$shard")"
  mkdir -p "$sdir" || die "cannot create shard dir $sdir"

  # Stage-then-publish: build the complete marker (owner file included) in a
  # private staging dir, then publish it with a single atomic rename. The
  # marker is therefore never visible half-written, so a concurrent loser can
  # never mistake a fresh claim for a stale one.
  try_publish() { # note -> 0 won, 1 lost
    local note="${1:-}" staged="$sdir/.claim.staged.$$.$RANDOM"
    rm -rf "$staged"
    mkdir "$staged" || die "cannot create staging dir $staged"
    write_owner "$staged" "$worker" "$lease" "$note"
    # -T (--no-target-directory): rename(2) semantics. Without it, mv would
    # silently move the staged dir INSIDE an existing .claim and report
    # success, which the post-publish check below would then (correctly)
    # reject as "not ours". With -T, publishing over an existing non-empty
    # marker fails as it must.
    if mv -T "$staged" "$cdir" 2>/dev/null; then
      # Defense in depth: confirm the published marker is ours (rename onto
      # an empty dir would also succeed; either way the content must be ours
      # or we fail closed).
      if [ "$(owner_field "$cdir" pid)" = "$$" ] && \
         [ "$(owner_field "$cdir" worker)" = "$worker" ]; then
        return 0
      fi
      die "published marker is not ours for $class/shard-$shard; failing closed"
    fi
    rm -rf "$staged"
    return 1
  }

  if try_publish; then
    say "CLAIM WON: $class/shard-$shard by $worker (lease ${lease}s)"
    exit 0
  fi

  # Lost the atomic race: a marker exists. Inspect it.
  case "$(lease_state "$cdir")" in
    FRESH)
      die "shard $class/shard-$shard is CLAIMED with a fresh lease; owner: $(owner_field "$cdir" worker) (pid $(owner_field "$cdir" pid), expires $(owner_field "$cdir" expires_at)). Take another shard."
      ;;
    STALE)
      # Stale takeover. The rm+publish sequence has an irreducible microsecond
      # race (a rival could publish between our check and our rm); we shrink it
      # by re-verifying the marker identity immediately before rm and checking
      # for a rival publish right after. The backstop is the protocol's
      # re-list-before-write rule: a worker taken over mid-flight sees the
      # foreign .claim on its next pre-write re-list and must stop.
      local prev exp attempt
      for attempt in 1 2 3; do
        prev="$(owner_field "$cdir" worker)"
        exp="$(owner_field "$cdir" expires_at)"
        [ "$(lease_state "$cdir")" = "STALE" ] || break  # no longer stale: re-inspect below
        # Identity re-check: marker must be unchanged since we decided it was stale.
        if [ "$(owner_field "$cdir" worker)" != "$prev" ] || \
           [ "$(owner_field "$cdir" expires_at)" != "$exp" ]; then
          continue
        fi
        rm -rf "$cdir" || die "cannot remove stale marker $cdir"
        if [ -e "$cdir" ]; then continue; fi  # rival published in the gap: retry
        if try_publish "takeover-from=${prev:-unknown}"; then
          echo "$(date -u +%FT%TZ) takeover: ${prev:-unknown} -> $worker" >> "$cdir/history" 2>/dev/null || true
          say "CLAIM WON (takeover): $class/shard-$shard by $worker (lease ${lease}s)"
          exit 0
        fi
        # Our publish lost (rival published first): re-inspect.
      done
      case "$(lease_state "$cdir")" in
        FRESH) die "lost the takeover race for $class/shard-$shard; fresh lease owned by $(owner_field "$cdir" worker). Take another shard." ;;
        *)     die "lost the takeover race for $class/shard-$shard; re-check status" ;;
      esac
      ;;
  esac
}

do_renew() { # class shard worker lease
  local class="$1" shard="$2" worker="$3" lease="${4:-$DEFAULT_LEASE}"
  local cdir; cdir="$(claim_dir "$class" "$shard")"
  [ "$(lease_state "$cdir")" = "FRESH" ] || die "no fresh claim on $class/shard-$shard to renew"
  [ "$(owner_field "$cdir" worker)" = "$worker" ] || die "claim on $class/shard-$shard is owned by $(owner_field "$cdir" worker), not $worker"
  write_owner "$cdir" "$worker" "$lease" "renewed"
  say "LEASE RENEWED: $class/shard-$shard by $worker (lease ${lease}s)"
}

do_release() { # class shard worker
  local class="$1" shard="$2" worker="$3"
  local cdir; cdir="$(claim_dir "$class" "$shard")"
  [ -d "$cdir" ] || die "no claim marker on $class/shard-$shard to release"
  [ "$(owner_field "$cdir" worker)" = "$worker" ] || die "claim on $class/shard-$shard is owned by $(owner_field "$cdir" worker), not $worker; refusing release"
  rm -rf "$cdir" || die "cannot remove marker $cdir"
  say "CLAIM RELEASED: $class/shard-$shard by $worker"
}

parse_lease() { # remaining args -> lease seconds
  local lease="$DEFAULT_LEASE"
  while [ $# -gt 0 ]; do
    case "$1" in
      --lease-sec) lease="${2:?missing value}"; shift 2 ;;
      *) die "unknown argument: $1" ;;
    esac
  done
  printf '%s' "$lease"
}

case "$cmd" in
  claim)
    [ $# -ge 3 ] || die "usage: claim.sh claim <class> <shard-N> <worker-id> [--lease-sec SEC]"
    do_claim "$1" "$2" "$3" "$(parse_lease "${@:4}")"
    ;;
  renew)
    [ $# -ge 3 ] || die "usage: claim.sh renew <class> <shard-N> <worker-id> [--lease-sec SEC]"
    do_renew "$1" "$2" "$3" "$(parse_lease "${@:4}")"
    ;;
  release)
    [ $# -eq 3 ] || die "usage: claim.sh release <class> <shard-N> <worker-id>"
    do_release "$1" "$2" "$3"
    ;;
  status)
    [ $# -eq 2 ] || die "usage: claim.sh status <class> <shard-N>"
    do_status "$1" "$2"
    ;;
  *) die "usage: claim.sh {claim|renew|release|status} ..." ;;
esac
