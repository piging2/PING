#!/bin/bash
# repro-certify.sh -- reproducible-build certification harness for Oracle missions.
# Implements the mission pass criterion:
#   "Two independent builds of <component> produce identical sha256; any divergence is FAIL with diff evidence."
#
# Usage:
#   repro-certify.sh <component-def-dir> <output-evidence-json>
#
# Component definition dir must contain:
#   build.sh      -- hermetic build script: reads sources from $SRC_DIR, writes artifacts to $OUT_DIR
#                   (harness exports fixed SOURCE_DATE_EPOCH, TZ=UTC, and runs each build in a
#                    separate isolated workdir so builds cannot share state)
#   sources.list  -- manifest of pinned inputs (path sha256), one per line: "<sha256>  <relpath>"
#   artifacts.list-- newline list of artifact relpaths (relative to $OUT_DIR) expected after build
#
# Verdicts: PASS (both builds byte-identical), FAIL (divergence with diff evidence),
#           ERROR (build broke or inputs invalid -- typed, retryable distinction).
#
# Per oracle-worker duty: this attacks the HARNESS (candidate), never the baseline.
set -u
DEF="${1:?component def dir}"; EV="${2:?evidence json path}"
SRC_REAL="$(readlink -f "$DEF/sources")"
EPOCH="${SOURCE_DATE_EPOCH:-1720000000}"
FAILS=0

err() { echo "ERROR: $*" >&2; }

[ -x "$DEF/build.sh" ] || { err "missing executable build.sh in $DEF"; exit 2; }
[ -d "$SRC_REAL" ] || { err "missing sources/ dir in $DEF"; exit 2; }

# 1) verify pinned inputs (fail closed: unpinned or tampered input -> ERROR, not PASS)
verify_pins() {
  local ok=1
  while IFS= read -r line || [ -n "$line" ]; do
    [ -z "$line" ] && continue
    local want="${line%%  *}" rel="${line#*  }"
    rel="${rel## }" rel="${rel#"${rel%%[! ]*}"}"
    local f="$SRC_REAL/$rel"
    [ -f "$f" ] || { err "pinned input missing: $rel"; ok=0; continue; }
    local got; got="$(sha256sum "$f" | cut -d' ' -f1)"
    if [ "$got" != "$want" ]; then err "pin mismatch: $rel (want $want, got $got)"; ok=0; fi
  done < "$DEF/sources.list"
  [ "$ok" = 1 ]
}
verify_pins || { echo '{"verdict":"ERROR","reason":"input pin verification failed"}' > "$EV"; exit 2; }

# 2) two independent isolated builds
run_build() {
  local tag="$1" work; work="$(mktemp -d)"
  local src="$work/src" out="$work/out"
  mkdir -p "$src" "$out"
  cp -a "$SRC_REAL/." "$src/"
  # scrub nondeterminism sources from the environment
  env -i PATH="/usr/bin:/bin:/usr/local/bin" HOME="$work" TZ=UTC \
      SOURCE_DATE_EPOCH="$EPOCH" SRC_DIR="$src" OUT_DIR="$out" \
      bash "$DEF/build.sh" >"$work/build.log" 2>&1
  echo "$work"
}
W1="$(run_build build1)" || { err "build1 failed"; exit 3; }
W2="$(run_build build2)" || { err "build2 failed"; exit 3; }

# 3) compare artifact digests; divergence -> FAIL with diff evidence
compare_one() {
  local rel="$1"
  local f1="$W1/out/$rel" f2="$W2/out/$rel"
  [ -f "$f1" ] || { echo "MISSING_IN_BUILD1 $rel"; return; }
  [ -f "$f2" ] || { echo "MISSING_IN_BUILD2 $rel"; return; }
  local d1 d2; d1="$(sha256sum "$f1"|cut -d' ' -f1)"; d2="$(sha256sum "$f2"|cut -d' ' -f1)"
  if [ "$d1" = "$d2" ]; then echo "MATCH $rel $d1"; else echo "DIVERGE $rel $d1 $d2"; fi
}

DIFF_FILE="$(mktemp)"; : > "$DIFF_FILE"
while IFS= read -r rel || [ -n "$rel" ]; do
  [ -z "$rel" ] && continue
  compare_one "$rel" >> "$DIFF_FILE"
done < "$DEF/artifacts.list"

DIVERGES="$(grep -c '^DIVERGE' "$DIFF_FILE" || true)"
MISSING="$(grep -c '^MISSING' "$DIFF_FILE" || true)"

verdict=PASS
[ "$DIVERGES" != "0" ] && verdict=FAIL
[ "$MISSING" != "0" ] && verdict=FAIL

# 4) evidence JSON
{
  echo "{"
  echo "  \"harness\": \"repro-certify.sh\","
  echo "  \"def_dir\": \"$DEF\","
  echo "  \"source_date_epoch\": $EPOCH,"
  echo "  \"verdict\": \"$verdict\","
  echo "  \"divergent_artifacts\": $DIVERGES,"
  echo "  \"missing_artifacts\": $MISSING,"
  echo "  \"per_artifact\": ["
  first=1
  while IFS= read -r line || [ -n "$line" ]; do
    [ -z "$line" ] && continue
    [ "$first" = 1 ] && first=0 || echo ","
    printf '    "%s"' "$(printf '%s' "$line" | sed 's/"/\\"/g')"
  done < "$DIFF_FILE"
  echo ""
  echo "  ],"
  echo "  \"build_logs\": [\"$W1/build.log\", \"$W2/build.log\"]"
  echo "}"
} > "$EV"

echo "verdict=$verdict diverges=$DIVERGES missing=$MISSING evidence=$EV"
rm -f "$DIFF_FILE"
# keep isolated build workdirs for evidence (under fleet work dir, small)
KEEP="${FLEET_KEEP_DIR:-$DEF/../evidence-builddirs}"
mkdir -p "$KEEP"
mv "$W1" "$KEEP/$(basename "$DEF")-build1" 2>/dev/null || rm -rf "$W1"
mv "$W2" "$KEEP/$(basename "$DEF")-build2" 2>/dev/null || rm -rf "$W2"
[ "$verdict" = PASS ] && exit 0 || exit 1
