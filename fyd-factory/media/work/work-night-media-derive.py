#!/usr/bin/env python3
"""NIGHT-MEDIA derivation stage: authorized demo media -> digest -> provenance -> derivatives.

Source set: canonical PING pig brand images + PING Social logo from
~/workspace/ping-content/inbox/ (PING Social owned assets, authorized by
owner Nolan Geske, 2026-09-14).

Derivation ladder (mirrors repo pipeline constants thumbnail 480 / card 768 /
hero 1600 / blur 10, never upscales): WebP q82 primary, JPEG q75 fallback at
the card width, WebP q20 10px blur-up placeholder.

Outputs:
  media/sources/<slug>.png                copied authorized sources
  media/sources/<slug>.provenance.json    provenance record sidecar
  media/derivatives/<sha256>/<file>       content-addressed derivatives
  media/derivatives/manifest.json         full manifest with servedFrom paths
"""
import hashlib
import json
import os
import shutil
import sys
import time
from datetime import datetime, timezone

from PIL import Image

INBOX = "/home/hatch/workspace/ping-content/inbox"
MEDIA = "/home/hatch/workspace/fyd-factory/media"
SOURCES = os.path.join(MEDIA, "sources")
DERIVS = os.path.join(MEDIA, "derivatives")

NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# Authorized demo set: (slug, inbox filename, role, notes)
ASSETS = [
    ("ping-pig-suit", "ping-pig-suit.png", "hero",
     "Chosen front-desk image (2026-09-14). Canonical PING mascot."),
    ("ping-pig-president", "ping-pig-president.png", "gallery",
     "Nolan's upload (2026-09-14). PING mascot, presidential variant."),
    ("ping-pig-beggar", "ping-pig-beggar.png", "gallery",
     "Nolan's upload (2026-09-14). PING mascot, beggar variant."),
    ("ping-pig-plumber", "ping-pig-plumber.png", "gallery",
     "Posted to socials. PING mascot, plumber trade variant."),
    ("ping-pig-mason", "ping-pig-mason.png", "gallery",
     "Masonry variant, Nolan-approved 2026-09-14."),
    ("ping-pig-electrician", "ping-pig-electrician.png", "gallery",
     "PING mascot, electrician trade variant."),
    ("ping-pig-hvac", "ping-pig-hvac.png", "gallery",
     "PING mascot, HVAC trade variant."),
    ("ping-pig-crew", "ping-pig-crew.png", "gallery",
     "PING mascot crew scene."),
    ("ping-pig-electricians", "ping-pig-electricians.png", "gallery",
     "PING mascot, electricians scene variant."),
    ("ping-pig-pole", "ping-pig-pole.png", "gallery",
     "PING mascot, pole scene variant."),
    ("ping-social-logo", "ping-social-logo.png", "logo",
     "PING Social brand logo. Logos are brand assets, never heroes."),
]

AUTH_BASIS = ("PING Social brand asset, created 2026-09-14 through the PING "
              "media-generation pipeline for PING Social's own marketing. "
              "Commissioned by the business owner. Owned by PING Social; "
              "FYD may derive, optimize, and serve controlled derivatives "
              "for authorized demo previews. Public viewability of any "
              "derivative does NOT imply republication rights for anyone else.")
AUTHORIZER = "Nolan Geske (owner/operator, PING Social)"

TARGET_WIDTHS = [1600, 768, 480]
BLUR_WIDTH = 10
WEBP_Q = 82
WEBP_BLUR_Q = 20
JPEG_Q = 75

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()

def check_budget():
    st = os.statvfs(MEDIA)
    free_gb = st.f_bavail * st.f_frsize / 1e9
    print(f"budget guard: {free_gb:.1f} GB free at {MEDIA}", flush=True)
    assert free_gb > 10, "budget guard tripped: less than 10GB free"

def widths_for(src_w):
    out = [w for w in TARGET_WIDTHS if w < src_w]
    if src_w not in TARGET_WIDTHS and src_w not in out:
        out.append(src_w)  # serve native width when it is not a ladder rung
    return sorted(set(out), reverse=True)

def main():
    os.makedirs(SOURCES, exist_ok=True)
    os.makedirs(DERIVS, exist_ok=True)
    check_budget()

    seen_digests = {}
    manifest = {
        "manifestVersion": 1,
        "pipeline": "night-media authorized ingest/derive (PIL 10.2.0, WebP)",
        "generatedAt": NOW,
        "ladder": {"webp": widths_for(10**9), "quality": {"webp": WEBP_Q, "jpeg": JPEG_Q, "blur": WEBP_BLUR_Q}},
        "rightsPolicy": {
            "authorized-owned": "PING/FYD-owned asset; digest, derive, serve allowed",
            "authorized-demo": "owner-authorized demo asset; digest, derive, serve allowed",
            "public-viewable-NOT-authorized": "bytes never acquired, derivatives never made, never served",
            "unknown": "treated as NOT authorized; hard refusal",
        },
        "assets": [],
    }
    manifest["ladder"]["webp"] = TARGET_WIDTHS

    total_deriv_bytes = 0
    for slug, fname, role, note in ASSETS:
        src_path = os.path.join(INBOX, fname)
        if not os.path.exists(src_path):
            print(f"SKIP {slug}: source missing {src_path}")
            continue
        digest = sha256_file(src_path)
        if digest in seen_digests:
            print(f"DEDUPE {slug}: identical bytes to {seen_digests[digest]} (digest {digest[:16]}...)")
            continue
        seen_digests[digest] = slug

        dest = os.path.join(SOURCES, f"{slug}.png")
        if not os.path.exists(dest):
            shutil.copy2(src_path, dest)

        im = Image.open(dest)
        im.load()
        if im.mode != "RGB":
            im = im.convert("RGB")
        src_w, src_h = im.size

        prov = {
            "id": f"fyd-media-{digest[:16]}",
            "slug": slug,
            "role": role,
            "note": note,
            "source": {"inboxPath": src_path, "copiedTo": dest},
            "digest": {"algorithm": "sha256", "value": digest},
            "dimensions": {"width": src_w, "height": src_h, "originalFormat": "PNG"},
            "rightsState": "authorized-owned",
            "authorization": {
                "basis": AUTH_BASIS,
                "authorizedBy": AUTHORIZER,
                "authorizedAt": "2026-09-14",
                "observedAt": NOW,
            },
            "synthetic": {
                "kind": "ai-generated",
                "generator": "PING media-generation pipeline (2026-09-14)",
                "caption": "AI-generated PING brand artwork. Not a photograph of a business.",
            },
            "serving": {"basePath": f"/fyd-media/{digest}", "controlled": True},
        }
        with open(os.path.join(SOURCES, f"{slug}.provenance.json"), "w") as f:
            json.dump(prov, f, indent=2)

        asset_dir = os.path.join(DERIVS, digest)
        os.makedirs(asset_dir, exist_ok=True)
        variants = []
        for w in widths_for(src_w):
            h = round(src_h * w / src_w)
            frame = im.resize((w, h), Image.LANCZOS)
            # WebP primary
            wp = os.path.join(asset_dir, f"{slug}-{w}w.webp")
            frame.save(wp, "WEBP", quality=WEBP_Q, method=6)
            vb = open(wp, "rb").read()
            variants.append({
                "name": f"{slug}-{w}w", "width": w, "height": h,
                "format": "webp", "quality": WEBP_Q,
                "bytes": len(vb), "digest": sha256_bytes(vb),
                "derivedFrom": digest,
                "servedFrom": f"/fyd-media/{digest}/{slug}-{w}w.webp",
            })
            total_deriv_bytes += len(vb)
            # JPEG fallback at the card width (largest ladder rung <= 768)
            if w <= 768 and not any(v["format"] == "jpeg" for v in variants):
                jp = os.path.join(asset_dir, f"{slug}-{w}w.jpg")
                frame.save(jp, "JPEG", quality=JPEG_Q, optimize=True, progressive=True)
                jb = open(jp, "rb").read()
                variants.append({
                    "name": f"{slug}-{w}w", "width": w, "height": h,
                    "format": "jpeg", "quality": JPEG_Q,
                    "bytes": len(jb), "digest": sha256_bytes(jb),
                    "derivedFrom": digest,
                    "servedFrom": f"/fyd-media/{digest}/{slug}-{w}w.jpg",
                })
                total_deriv_bytes += len(jb)
        # blur-up placeholder
        bh = max(1, round(src_h * BLUR_WIDTH / src_w))
        blur = im.resize((BLUR_WIDTH, bh), Image.LANCZOS)
        bp = os.path.join(asset_dir, f"{slug}-blur.webp")
        blur.save(bp, "WEBP", quality=WEBP_BLUR_Q, method=6)
        bb = open(bp, "rb").read()
        variants.append({
            "name": f"{slug}-blur", "width": BLUR_WIDTH, "height": bh,
            "format": "webp", "quality": WEBP_BLUR_Q,
            "bytes": len(bb), "digest": sha256_bytes(bb),
            "derivedFrom": digest,
            "servedFrom": f"/fyd-media/{digest}/{slug}-blur.webp",
        })
        total_deriv_bytes += len(bb)

        manifest["assets"].append({
            "id": prov["id"], "slug": slug, "role": role,
            "digest": digest, "width": src_w, "height": src_h,
            "rightsState": "authorized-owned",
            "syntheticCaption": prov["synthetic"]["caption"],
            "variants": variants,
        })
        print(f"OK {slug}: {src_w}x{src_h} digest {digest[:16]}... "
              f"{len(variants)} variants", flush=True)

    with open(os.path.join(DERIVS, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"manifest: {len(manifest['assets'])} assets, "
          f"{sum(len(a['variants']) for a in manifest['assets'])} variants, "
          f"{total_deriv_bytes/1e6:.1f} MB derivatives")

if __name__ == "__main__":
    sys.exit(main())
