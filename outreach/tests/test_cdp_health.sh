#!/usr/bin/env bash
# test_cdp_health.sh -- deterministic test for cdp-health.sh.
# Plain-script style: prints PASS/FAIL lines, exits 0 only if all pass.
# The network layer (pig_ssh) is stubbed; everything else is the real code:
# probe_port + cdp_browser_of + main are exercised end to end.
set -u

SCRIPT="$HOME/workspace/pig-fb/cdp-health.sh"
failures=0

pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; failures=$((failures + 1)); }

# Fixture: real /json/version payload shape from the 2026-09-15 night watch.
FIXTURE_OK='{
   "Browser": "Chrome/153.0.8010.36",
   "Protocol-Version": "1.3",
   "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
   "V8-Version": "15.3.76.10",
   "WebKit-Version": "537.36 (@507c6ee3e2f3b2ca0e660547e5b9ea4820c67f4c)",
   "webSocketDebuggerUrl": "ws://127.0.0.1:9223/devtools/browser/a0f41642-fa32-4ac2-a5fd-18debf3ed746"
}'

export CDP_HEALTH_SOURCE_ONLY=1
# shellcheck disable=SC1091
source "$SCRIPT"

# --- cdp_browser_of unit checks ---
[ "$(cdp_browser_of "$FIXTURE_OK")" = "Chrome/153.0.8010.36" ] && pass "parse real payload" || fail "parse real payload: got '$(cdp_browser_of "$FIXTURE_OK")'"
[ -z "$(cdp_browser_of "")" ] && pass "empty body -> empty" || fail "empty body should yield empty"
[ -z "$(cdp_browser_of "CDP_DOWN: connection refused")" ] && pass "error text -> empty" || fail "error text should yield empty"
[ -z "$(cdp_browser_of '{"no_browser": true}')" ] && pass "payload without Browser -> empty" || fail "payload without Browser should yield empty"

# --- main with stubbed pig_ssh: 3 alive, 1 down ---
pig_ssh() {
  case "$1" in
    *9226*) printf '' ;;          # ig down: empty response
    *) printf '%s' "$FIXTURE_OK" ;;
  esac
}

out="$(main 9223 9225 9226 9227)"; rc=$?
[ "$rc" -eq 1 ] && pass "exit 1 when any port down" || fail "exit code should be 1, got $rc"
expected="$(printf 'PORT 9223 (fb) ALIVE Chrome/153.0.8010.36\nPORT 9225 (x) ALIVE Chrome/153.0.8010.36\nPORT 9226 (ig) DOWN\nPORT 9227 (tt) ALIVE Chrome/153.0.8010.36')"
[ "$out" = "$expected" ] && pass "typed output lines exact" || fail "output mismatch: [$out]"

# --- all alive -> exit 0 ---
pig_ssh() { printf '%s' "$FIXTURE_OK"; }
out="$(main)"; rc=$?
[ "$rc" -eq 0 ] && pass "exit 0 when all alive" || fail "exit code should be 0, got $rc"
[ "$(printf '%s\n' "$out" | wc -l)" -eq 4 ] && pass "default ports probe all four" || fail "default run should print 4 lines"

# --- bad usage ---
out="$(main abc 2>&1)"; rc=$?
[ "$rc" -eq 2 ] && pass "exit 2 on non-numeric port" || fail "exit code should be 2, got $rc"

if [ "$failures" -eq 0 ]; then echo "ALL TESTS PASSED"; exit 0; else echo "$failures FAILURES"; exit 1; fi
