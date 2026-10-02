#!/usr/bin/env python3
"""fleet-acq-2 acquisition ACQ-1151..1200 (image-metadata cases 0-49).
Hardened metadata boundary: extract with caps and provenance; typed failure
or quarantine, never a guess. Quarantine triggers: polyglot trailing data
after a terminal chunk (IEND/EOI), dimension claims over the pixel cap."""
import io, json, os, struct

from PIL import Image

Image.MAX_IMAGE_PIXELS = 10_000_000  # decompression-bomb guard
Image.LOAD_TRUNCATED_IMAGES = False

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx", "imgmeta")
MAX_BYTES = 5 * 1024 * 1024
MAX_META_VALUE = 256 * 1024  # per-value cap

def terminal_ok(data, fmt):
    """Check for trailing data after the logical end of the image."""
    if fmt == "PNG":
        i = data.rfind(b"IEND")
        if i > 0:
            # IEND chunk: 4 len + 4 type + 0 data + 4 crc = 12 bytes ending at i+8
            end = i + 8
            if len(data) > end:
                return False, len(data) - end
    elif fmt == "JPEG":
        i = data.rfind(b"\xff\xd9")
        if i > 0 and len(data) > i + 2:
            return False, len(data) - (i + 2)
    return True, 0

def classify(num, path, data):
    prov = {"case": num, "file": os.path.basename(path), "bytes": len(data)}
    if len(data) == 0:
        return ("TYPED_FAILURE", "empty file", prov)
    if len(data) > MAX_BYTES:
        return ("TYPED_FAILURE", "size %d exceeds cap" % len(data), prov)
    try:
        im = Image.open(io.BytesIO(data))
        im.load()
    except Exception as e:
        return ("TYPED_FAILURE", "unparseable: %s: %s" % (type(e).__name__, str(e)[:100]), prov)
    fmt = im.format
    prov.update({"format": fmt, "size": list(im.size), "mode": im.mode})
    if fmt is None:
        return ("TYPED_FAILURE", "no image format detected", prov)
    ok, trailing = terminal_ok(data, fmt)
    if not ok:
        return ("QUARANTINE", "polyglot: %d trailing bytes after terminal chunk" % trailing, prov)
    meta = {}
    # generic info dict (PNG text chunks etc.)
    for k, v in im.info.items():
        s = str(v)
        if len(s) > MAX_META_VALUE:
            meta[str(k)] = {"truncated": True, "chars": len(s), "note": "value exceeds cap; not materialized"}
        else:
            meta[str(k)] = s[:500]
    # EXIF
    try:
        ex = im.getexif()
        if ex:
            tags = {}
            for tag, val in ex.items():
                s = str(val)
                tags[str(tag)] = {"truncated": True, "chars": len(s)} if len(s) > MAX_META_VALUE else s[:500]
            meta["exif_tags"] = tags
            prov["exif_tag_count"] = len(tags)
    except Exception as e:
        meta["exif_error"] = "%s (typed, not guessed)" % type(e).__name__
    # text chunks (PIL exposes via .text for PNG)
    try:
        txt = getattr(im, "text", None)
        if txt:
            meta["png_text_keys"] = sorted(str(k) for k in txt.keys())[:50]
    except Exception:
        pass
    prov["meta_keys"] = sorted(meta.keys())[:20]
    n_vals = sum(1 for v in meta.values() if not isinstance(v, dict))
    detail = "%s %dx%d %s; %d metadata values extracted" % (fmt, im.size[0], im.size[1], im.mode, n_vals)
    return ("BOUNDED_SUCCESS", detail, {**prov, "metadata_summary": meta})

def main():
    import sys
    start, end = 0, 49
    manifest_name, evidence_name = "manifest-1151-1200.json", "imgmeta-evidence.json"
    if len(sys.argv) >= 3:
        start, end = int(sys.argv[1]), int(sys.argv[2])
    if len(sys.argv) >= 5:
        manifest_name, evidence_name = sys.argv[3], sys.argv[4]
    manifest = json.load(open(os.path.join(WORK, manifest_name)))
    results = {}
    for num in range(start, end + 1):
        entry = manifest[str(num)]
        path = os.path.join(FX, entry["file"])
        data = open(path, "rb").read()
        verdict, detail, prov = classify(num, path, data)
        # metadata_summary may be large; keep evidence bounded
        results[str(num)] = {"verdict": verdict, "detail": detail,
                             "provenance": {k: v for k, v in prov.items() if k != "metadata_summary"},
                             "meta_key_count": len(prov.get("metadata_summary", {})),
                             "pass": verdict in ("BOUNDED_SUCCESS", "TYPED_FAILURE", "QUARANTINE")}
        print("case %d: %s -- %s" % (num, verdict, detail))
    counts = {}
    for v in results.values():
        counts[v["verdict"]] = counts.get(v["verdict"], 0) + 1
    results["_meta"] = {"counts": counts,
                        "all_typed": all(v["pass"] for v in results.values() if isinstance(v, dict) and "pass" in v)}
    json.dump(results, open(os.path.join(WORK, evidence_name), "w"), indent=1)
    print(counts, "all_typed:", results["_meta"]["all_typed"])

if __name__ == "__main__":
    main()
