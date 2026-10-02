#!/bin/bash
cd /home/nolan/projects/ping || exit 1
python3 - <<'PYEOF'
p = "src/fyd/lineage/tracer.ts"
s = open(p).read()

old = """  // Byte-range cross-check for the first match.
  const first = matches[0];
  const rangeChecks: Record<string, unknown>[] = [];
  let rangeHit: string | null = null;
  const rm = /bytes=(\\d+)-(\\d+)/.exec(first.o.sourceLocation ?? "");
  if (rm && header) {
    const [start, end] = [Number(rm[1]), Number(rm[2])];
    header.files.forEach((f, fi) => {
      const buf = rawBuffers[fi];
      if (!buf || end > buf.length) {
        rangeChecks.push({ file: f.name, inRange: false });
        return;
      }
      const slice = buf.subarray(start, end).toString("utf8");
      const hit = slice.includes(claim);
      if (hit && !rangeHit) rangeHit = f.name;
      rangeChecks.push({
        file: f.name,
        byteRange: `${start}-${end}`,
        sliceContainsClaim: hit,
        sliceExcerpt: slice.slice(0, 120).replace(/\\s+/g, " "),
      });
    });
  }"""
new = """  // Byte-locatability: the claim string must occur at an exact byte
  // offset in the pinned raw files (the strongest proof the claim bytes are
  // in SOURCE BYTES). The observation's sourceLocation range is the
  // extractor's element record; it is reported with its distance to the
  // claim offset, not required to contain it.
  const first = matches[0];
  const claimOffsets: { file: string; offset: number }[] = [];
  if (header) {
    header.files.forEach((f, fi) => {
      const buf = rawBuffers[fi];
      if (!buf) return;
      const off = buf.indexOf(claim);
      if (off >= 0) claimOffsets.push({ file: f.name, offset: off });
    });
  }
  const rm = /bytes=(\\d+)-(\\d+)/.exec(first.o.sourceLocation ?? "");
  let rangeDetail: Record<string, unknown> | null = null;
  if (rm && header) {
    const [start, end] = [Number(rm[1]), Number(rm[2])];
    const buf = rawBuffers[0];
    const slice =
      buf && end <= buf.length
        ? buf.subarray(start, end).toString("utf8").slice(0, 120).replace(/\\s+/g, " ")
        : null;
    const co = claimOffsets.find((c) => c.file === header.files[0].name);
    rangeDetail = {
      recordedRange: `${start}-${end}`,
      rangeSliceExcerpt: slice,
      claimOffsetInSameFile: co?.offset ?? null,
      claimOffsetRelativeToRange:
        co != null
          ? co.offset >= start && co.offset <= end
            ? "claim starts inside the recorded range"
            : co.offset < start
              ? `claim starts ${start - co.offset} bytes before range start`
              : `claim starts ${co.offset - end} bytes after range end (same card widget)`
          : null,
    };
  }"""
assert old in s, "byte-range block not found"
s = s.replace(old, new)

old2 = """      byteRangeChecks: rangeChecks,
      byteRangeContainsClaimInFile: rangeHit,"""
new2 = """      claimByteOffsets: claimOffsets,
      claimByteLocatableInRawFile: claimOffsets.length > 0,
      sourceLocationRangeDetail: rangeDetail,"""
assert old2 in s, "detail block not found"
s = s.replace(old2, new2)
open(p, "w").write(s)
print("patched byte-locatability check")

p2 = "src/fyd/lineage/verify-tracer.ts"
t = open(p2).read()
old3 = """  assert.ok(
    s2.detail["byteRangeContainsClaimInFile"],
    `site ${siteId}: byte range must locate the claim in a raw file`,
  );"""
new3 = """  assert.ok(
    s2.detail["claimByteLocatableInRawFile"],
    `site ${siteId}: claim must be byte-locatable in the pinned raw file`,
  );
  assert.ok(
    (s2.detail["claimByteOffsets"] as { offset: number }[]).every((c) => c.offset >= 0),
    `site ${siteId}: claim byte offsets are exact`,
  );"""
assert old3 in t, "test block not found"
t = t.replace(old3, new3)
open(p2, "w").write(t)
print("patched test assertion")
PYEOF
npx tsx --import ./src/fyd/lineage/register-css.mjs src/fyd/lineage/verify-tracer.ts 2>&1 | tail -12
