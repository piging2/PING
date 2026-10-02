#!/usr/bin/env python3
"""fleet-acq-2 acquisition ACQ-1401..1450 (owner-uploads cases 0-49).
Deterministic upload boundary: name checks, size caps, content sniffing,
active-content scan. Never guesses: mismatches and unknowns are typed."""
import io, json, os, re, sys

from PIL import Image

Image.MAX_IMAGE_PIXELS = 10_000_000
Image.LOAD_TRUNCATED_IMAGES = False

WORK = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CAP = 8 * 1024 * 1024

EXT_FMT = {".jpg": "JPEG", ".jpeg": "JPEG", ".png": "PNG", ".gif": "GIF",
           ".webp": "WEBP", ".bmp": "BMP", ".tif": "TIFF", ".tiff": "TIFF",
           ".svg": "SVG"}
EXEC_EXTS = (".exe", ".bat", ".cmd", ".scr", ".js", ".vbs", ".ps1", ".msi", ".com")
RESERVED = {"con", "prn", "aux", "nul"} | {"com%d" % i for i in range(1, 10)} | {"lpt%d" % i for i in range(1, 10)}
SVG_ACTIVE = (b"<script", b"onload=", b"onerror=", b"onclick=", b"onmouseover=",
              b"<foreignobject", b"javascript:")

def terminal_ok(data, fmt):
    if fmt == "PNG":
        i = data.rfind(b"IEND")
        if i > 0 and len(data) > i + 8: return False, len(data) - (i + 8)
    elif fmt == "JPEG":
        i = data.rfind(b"\xff\xd9")
        if i > 0 and len(data) > i + 2: return False, len(data) - (i + 2)
    elif fmt == "GIF":
        if data.endswith(b"\x00\x3b") or data.endswith(b"\x3b"): return True, 0
        i = data.rfind(b"\x3b")
        if i > 0 and len(data) > i + 1: return False, len(data) - (i + 1)
    return True, 0

def classify(num, name, data, flags):
    cap = flags.get("size_cap", DEFAULT_CAP)
    prov = {"case": num, "name": name, "bytes": len(data)}
    # --- name checks ---
    if "\x00" in name:
        return ("QUARANTINE", "R-NULLNAME", "null byte in filename", prov)
    if ".." in name or "/" in name or "\\" in name:
        return ("QUARANTINE", "R-TRAVERSAL", "path traversal in filename", prov)
    base, dot, ext = name.rpartition(".")
    if not base and dot:
        return ("TYPED_FAILURE", "R-BADNAME", "empty basename", prov)
    if base.lower() in RESERVED:
        return ("TYPED_FAILURE", "R-RESERVED", "Windows reserved device name", prov)
    if len(name) > 255:
        return ("TYPED_FAILURE", "R-LONGNAME", "filename over 255 chars", prov)
    if ext and ("." + ext.lower()) in EXEC_EXTS:
        return ("QUARANTINE", "R-DOUBLEEXT", "executable final extension", prov)
    if re.search(r"[\u0400-\u04ff]", name) and re.search(r"[a-zA-Z]", name):
        return ("TYPED_FAILURE", "R-CONFUSABLE", "mixed-script filename; spoof risk", prov)
    # --- size ---
    if len(data) == 0:
        return ("TYPED_FAILURE", "R-EMPTY", "empty file", prov)
    if len(data) > cap:
        return ("TYPED_FAILURE", "R-OVERSIZE", "size %d over cap %d" % (len(data), cap), prov)
    ext = ("." + ext.lower()) if dot else ""
    # --- SVG path ---
    head = data[:500].lower()
    if b"<svg" in head:
        for marker in SVG_ACTIVE:
            if marker in data.lower():
                return ("QUARANTINE", "R-SVG-ACTIVE", "active content marker %s in SVG" % marker.decode(), prov)
        if ext and ext != ".svg":
            return ("TYPED_FAILURE", "R-EXTMISMATCH", "SVG content with %s extension" % ext, prov)
        return ("ACCEPT", "R-SVG-OK", "clean vector SVG", {**prov, "format": "SVG"})
    # --- content sniff ---
    try:
        im = Image.open(io.BytesIO(data))
        im.load()
        fmt = im.format
    except Exception as e:
        if type(e).__name__ == "DecompressionBombError":
            return ("TYPED_FAILURE", "R-BOMB", "dimension claim exceeds pixel cap", prov)
        if data[:2] == b"MZ" or data[:4] == b"\x7fELF" or data[:4] == b"PK\x03\x04":
            return ("QUARANTINE", "R-MASQUERADE", "executable/archive masquerading as upload", prov)
        if data[257:262] == b"ustar":
            return ("QUARANTINE", "R-MASQUERADE", "tar archive masquerading as upload", prov)
        if head.startswith(b"<html") or head.startswith(b"<!doctype html"):
            return ("QUARANTINE", "R-MASQUERADE", "HTML masquerading as upload", prov)
        if head.startswith(b"<?xml"):
            return ("QUARANTINE", "R-MASQUERADE", "XML markup masquerading as upload", prov)
        return ("TYPED_FAILURE", "R-NOTIMAGE",
                "not a parseable image: %s" % type(e).__name__, prov)
    prov.update({"format": fmt, "size": list(im.size), "mode": im.mode})
    if "exif" in im.info or getattr(im, "_exif", None):
        prov["has_exif"] = True
    try:
        if im.getexif():
            prov["exif_tags"] = len(im.getexif())
    except Exception:
        pass
    if im.format == "GIF" and getattr(im, "n_frames", 1) > 1:
        prov["animated_frames"] = im.n_frames
    if "icc_profile" in im.info:
        prov["has_icc"] = True
    ok, trailing = terminal_ok(data, fmt)
    if not ok:
        return ("QUARANTINE", "R-POLYGLOT", "%d trailing bytes after terminal marker" % trailing, prov)
    if ext:
        if ext not in EXT_FMT:
            return ("TYPED_FAILURE", "R-BADEXT", "unknown extension %s" % ext, prov)
        if EXT_FMT[ext] != fmt:
            return ("TYPED_FAILURE", "R-EXTMISMATCH",
                    "extension %s claims %s but content is %s" % (ext, EXT_FMT[ext], fmt), prov)
    detail = "%s %dx%d %s" % (fmt, im.size[0], im.size[1], im.mode)
    if not ext:
        detail += "; extension absent, type by content sniff"
    return ("ACCEPT", "R-OK", detail, prov)

def main():
    start, end = 0, 49
    manifest_name, evidence_name, labels_name = ("manifest-1401-1450.json",
        "uploads-evidence.json", "labels-1401-1450.json")
    if len(sys.argv) >= 3:
        start, end = int(sys.argv[1]), int(sys.argv[2])
    if len(sys.argv) >= 6:
        manifest_name, evidence_name, labels_name = sys.argv[3], sys.argv[4], sys.argv[5]
    manifest = json.load(open(os.path.join(WORK, manifest_name)))
    results = {}
    for num in range(start, end + 1):
        m = manifest[str(num)]
        data = open(os.path.join(WORK, m["file"]), "rb").read()
        verdict, rule, detail, prov = classify(num, m["name"], data, m.get("flags", {}))
        results[str(num)] = {"verdict": verdict, "rule": rule, "detail": detail,
                             "provenance": prov,
                             "pass": verdict in ("ACCEPT", "TYPED_FAILURE", "QUARANTINE")}
        print("case %d: %s [%s] -- %s" % (num, verdict, rule, detail))
    counts = {}
    for v in results.values():
        counts[v["verdict"]] = counts.get(v["verdict"], 0) + 1
    results["_meta"] = {"counts": counts,
                        "all_typed": all(v["pass"] for k, v in results.items() if k != "_meta")}
    json.dump(results, open(os.path.join(WORK, evidence_name), "w"), indent=1)
    labels = json.load(open(os.path.join(WORK, labels_name)))
    mism = [(k, results[k]["verdict"], labels[k]) for k in labels if results[k]["verdict"] != labels[k]]
    print(counts, "all_typed:", results["_meta"]["all_typed"], "label mismatches:", mism if mism else "none")

if __name__ == "__main__":
    main()
