#!/usr/bin/env bash
# restore-verify.sh — restore a backup artifact and VERIFY it against the
# manifest. Fails closed on the first mismatch. Per contract v1, a backup
# is complete only when this script reports PASS.
#
# Usage: ./restore-verify.sh <artifact> <manifest.json> <keyfile> <destdir>
#   keyfile: file containing the passphrase (read directly, never echoed)
set -euo pipefail

ARTIFACT="${1:?usage: restore-verify.sh <artifact> <manifest> <keyfile> <destdir>}"
MANIFEST="${2:?usage: restore-verify.sh <artifact> <manifest> <keyfile> <destdir>}"
KEYFILE="${3:?usage: restore-verify.sh <artifact> <manifest> <keyfile> <destdir>}"
DEST="${4:?usage: restore-verify.sh <artifact> <manifest> <keyfile> <destdir>}"

[ -f "$ARTIFACT" ] || { echo "RESTORE_FAIL: artifact missing: $ARTIFACT" >&2; exit 1; }
[ -f "$MANIFEST" ] || { echo "RESTORE_FAIL: manifest missing: $MANIFEST" >&2; exit 1; }
[ -f "$KEYFILE" ] || { echo "RESTORE_FAIL: keyfile missing" >&2; exit 1; }

fail() { echo "RESTORE_FAIL: $1" >&2; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Gate 1: ciphertext digest must match the manifest.
GOT_CIPH="$(sha256sum "$ARTIFACT" | cut -d' ' -f1)"
WANT_CIPH="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["ciphertext_sha256"])' "$MANIFEST")"
[ "$GOT_CIPH" = "$WANT_CIPH" ] || fail "ciphertext digest mismatch (got $GOT_CIPH want $WANT_CIPH)"

# Gate 2: decrypt, then plaintext digest must match the manifest.
gpg --batch --yes --quiet --pinentry-mode loopback \
  --passphrase-file "$KEYFILE" -d -o "$WORK/plain.tar.gz" "$ARTIFACT" \
  || fail "decryption failed"
GOT_PLAIN="$(sha256sum "$WORK/plain.tar.gz" | cut -d' ' -f1)"
WANT_PLAIN="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["plaintext_sha256"])' "$MANIFEST")"
[ "$GOT_PLAIN" = "$WANT_PLAIN" ] || fail "plaintext digest mismatch (got $GOT_PLAIN want $WANT_PLAIN)"

# Gate 3: plaintext size sanity.
WANT_PSIZE="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["plaintext_size_bytes"])' "$MANIFEST")"
GOT_PSIZE="$(stat -c%s "$WORK/plain.tar.gz")"
[ "$GOT_PSIZE" = "$WANT_PSIZE" ] || fail "plaintext size mismatch (got $GOT_PSIZE want $WANT_PSIZE)"

# Gate 4: extract and verify every file against the manifest file list.
rm -rf "$DEST"; mkdir -p "$DEST"
tar -xzf "$WORK/plain.tar.gz" -C "$DEST" || fail "extraction failed"
python3 - "$MANIFEST" "$DEST" <<'EOF' || exit 1
import json, sys, os, hashlib
manifest = json.load(open(sys.argv[1]))
dest = sys.argv[2]
problems = []
for f in manifest["files"]:
    p = os.path.join(dest, f["path"])
    if not os.path.isfile(p):
        problems.append("missing: " + f["path"]); continue
    st = os.stat(p)
    if st.st_size != f["size_bytes"]:
        problems.append("size mismatch: %s (got %d want %d)" % (f["path"], st.st_size, f["size_bytes"]))
        continue
    h = hashlib.sha256(open(p, "rb").read()).hexdigest()
    if h != f["sha256"]:
        problems.append("digest mismatch: " + f["path"])
# Extra files not in the manifest are also a failure: the tree must match.
want = {f["path"] for f in manifest["files"]}
got = set()
for root, _, files in os.walk(dest):
    for fn in files:
        rel = os.path.relpath(os.path.join(root, fn), dest)
        got.add(rel)
for extra in sorted(got - want):
    problems.append("extra file not in manifest: " + extra)
if problems:
    print("RESTORE_FAIL: file-level verification failed:")
    for p in problems:
        print("  - " + p)
    sys.exit(1)
print("file-level verification: %d/%d files OK" % (len(manifest["files"]), len(manifest["files"])))
EOF

# Gate 5: belt-and-suspenders — byte-level cmp of decrypted payload
# against a fresh decrypt of the same artifact (detects in-flight corruption).
gpg --batch --yes --quiet --pinentry-mode loopback \
  --passphrase-file "$KEYFILE" -d -o "$WORK/plain2.tar.gz" "$ARTIFACT" \
  || fail "second decryption failed (in-flight check)"
cmp -s "$WORK/plain.tar.gz" "$WORK/plain2.tar.gz" || fail "byte-level cmp failed"

echo "RESTORE_PASS artifact=$(basename "$ARTIFACT") dest=$DEST"
echo "  ciphertext_sha256=$GOT_CIPH (matches manifest)"
echo "  plaintext_sha256=$GOT_PLAIN (matches manifest)"
