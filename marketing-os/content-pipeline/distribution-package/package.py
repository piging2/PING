"""Distribution package builder (MarketingOS content pipeline, idea #7).

After visual approval, MarketingOS ingests the approved master and prepares
the distribution package: transcript/alignment + factual re-verification
against the final cut, title/hook/caption variants per destination,
thumbnails/cover concepts, chaptering for long-form, short-form cut
candidates from SEMANTIC moments (never arbitrary timestamps),
captions/subtitles, platform-specific framing, CTA variants tied to the
objective, a source/evidence appendix for technical long-form, a publication
proposal with experiment metadata, expected observation window + metrics,
and a post-publication monitoring plan.

Pure stdlib Python, deterministic functions over dict/JSON. No network, no
DB, no new authorities/stores, no LLM.

Claim-invariance hard rule (enforced in code): a cut candidate or caption
may OMIT claims but may never introduce a claim id absent from the master
ledger. `validate_package()` raises ValueError on any violation.

Claim provenance: every generated copy unit is a dict with
``{"text": ..., "claim_ids": [...], "generated_copy": True}``.
``generated_copy=True`` marks phrasing invented by the deterministic
templates (not a fact); any factual phrase traces to the listed claim ids.
Generated copy must never introduce a claim id, and must never present a
factual phrase under an empty ``claim_ids`` list: factual phrases come from
semantic-moment labels, which carry their own claim ids.

Template mechanism: all variants are drawn from fixed template pools in this
module. Selection is deterministic via sha256(master_id + platform + field +
variant_index) modulo pool length. Same master + destinations -> same
package, always.
"""

from __future__ import annotations

import copy
import hashlib
import json

# ---------------------------------------------------------------------------
# Fixed bounds and defaults
# ---------------------------------------------------------------------------

SHORT_CUT_MIN_S = 5       # shortest short-form cut we will propose
SHORT_CUT_MAX_S = 60      # longest short-form cut we will propose
OBSERVATION_WINDOW_DAYS = 14

# Aspect -> format classification. Chaptering exists for long-form only.
LONG_FORM_ASPECTS = ("horizontal", "widescreen", "16:9")

# ---------------------------------------------------------------------------
# Deterministic template pools
# ---------------------------------------------------------------------------
#
# Every template is documented here. {label}, {audience}, {platform},
# {duration}, {chapter}, {moment_id}, {objective}, {master_id} are the only
# placeholders; templates never invent factual claims.

TITLE_TEMPLATES = [
    "Why {label} matters for {audience}",
    "{label}: what the numbers actually show",
    "The honest take on {label}",
    "{label}, explained in plain terms",
    "What {audience} should know about {label}",
    "The evidence behind {label}",
]

HOOK_TEMPLATES = [
    "If you run {audience}, {label} is worth {duration}.",
    "Here is what the evidence says about {label}.",
    "{label} is not what most people assume. Here is why.",
    "For {audience}: a straight look at {label}.",
    "Stop guessing about {label}; start with the evidence.",
    "The part of {label} nobody talks about.",
]

CAPTION_TEMPLATES = [
    "Full breakdown of {label} on {platform}. Built from the verified evidence set.",
    "{label}, discussed for {audience}. Claims and evidence are cited in the appendix.",
    "What {audience} need to know about {label} - no hype, evidence first.",
    "A look at {label} ({duration} watch). Every claim below links to its evidence.",
]

CTA_TEMPLATES = [
    "See the full evidence set linked below.",
    "Watch the full breakdown on {platform}.",
    "Share this with an {audience} owner who needs it.",
    "Follow for more evidence-first breakdowns.",
    "Ask your question in the comments; answers cite the appendix.",
]

THUMBNAIL_TEMPLATES = [
    "{label}: the evidence",
    "What {audience} get wrong about {label}",
    "{label} in plain terms",
]

FRAMING_TEMPLATES = [
    "Frame for {audience} on {platform}: lead with the result, then the evidence.",
    "Frame for {audience} on {platform}: problem-first, evidence-second, CTA last.",
    "Frame for {audience} on {platform}: one moment, one claim, one CTA.",
]

EXPERIMENT_HYPOTHESIS_TEMPLATES = [
    "Title/hook variant testing on {platform} to {audience} over {window} days.",
    "Variant comparison across destinations for {master_id}, observation window {window} days.",
]

# Metric bundles per format. Metrics are observational, never invented claims.
METRICS_SHORT_FORM = ["views", "average_watch_time_s", "completion_rate", "likes", "comments", "shares", "saves"]
METRICS_LONG_FORM = ["views", "average_view_duration_s", "ctr_impressions", "likes", "comments", "shares", "subscribers_gained", "chapters_engagement"]


def _pick(pool, master_id, platform, field, index):
    """Deterministic template selection."""
    seed = f"{master_id}|{platform}|{field}|{index}"
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    return pool[int.from_bytes(digest[:8], "big") % len(pool)]


def _fill(template, **kwargs):
    return template.format(**kwargs)


def _short_dur(seconds):
    seconds = int(round(seconds))
    m, s = divmod(seconds, 60)
    return f"{m}m{s:02d}s" if m else f"{s}s"


# ---------------------------------------------------------------------------
# Claim ledger normalization
# ---------------------------------------------------------------------------

def normalize_ledger(claim_ledger_ref):
    """Normalize the master claim ledger reference to {claim_id: evidence_refs}.

    Accepts:
      - {"claims": {cid: {"evidence_refs": [...]}}} (canonical)
      - {"claims": {cid: {...}}}                       (evidence refs optional)
      - {"claims": [cid, ...]}                         (no evidence refs)
      - [cid, ...]                                     (bare list of claim ids)
      - a plain string reference (e.g. ledger file id) -> ids are taken from
        the master's semantic moments; evidence refs marked as "by_reference".
    """
    if isinstance(claim_ledger_ref, str):
        return None  # resolved by caller against moments
    if isinstance(claim_ledger_ref, list):
        return {cid: [] for cid in claim_ledger_ref}
    if isinstance(claim_ledger_ref, dict):
        claims = claim_ledger_ref.get("claims", claim_ledger_ref)
        if isinstance(claims, list):
            return {cid: [] for cid in claims}
        if isinstance(claims, dict):
            out = {}
            for cid, entry in claims.items():
                refs = []
                if isinstance(entry, dict):
                    refs = list(entry.get("evidence_refs", []))
                elif isinstance(entry, list):
                    refs = list(entry)
                out[cid] = refs
            return out
    raise ValueError(f"unrecognized claim_ledger_ref shape: {type(claim_ledger_ref).__name__}")


def ledger_claim_ids(master):
    """Authoritative set of claim ids for the master.

    The ledger reference wins when it resolves to claim ids; otherwise the
    union of claim ids on the semantic moments is used. This is the
    no-new-claims boundary enforced by validate_package().
    """
    ledger = normalize_ledger(master["claim_ledger_ref"])
    if ledger is None:
        ledger = {}
    moment_ids = {cid for m in master.get("semantic_moments", []) for cid in m.get("claim_ids", [])}
    if not ledger:
        return set(moment_ids)
    return set(ledger.keys())


# ---------------------------------------------------------------------------
# Structural re-verification against the final cut
# ---------------------------------------------------------------------------

def verify_master(master):
    """Structural re-verification of the approved master.

    Checks digest/transcript presence, moment bounds against duration,
    unique moment ids, and that every moment claim id is in the ledger.
    Returns {"ok": bool, "findings": [...]}. This is the deterministic
    portion of "transcript/alignment and factual re-verification against the
    final cut"; semantic video verification lives upstream (idea #6).
    """
    findings = []
    if not master.get("master_id"):
        findings.append({"code": "MISSING_MASTER_ID", "detail": "master has no master_id"})
    if not master.get("digest"):
        findings.append({"code": "MISSING_DIGEST", "detail": "master has no digest; cannot tie package to the final cut"})
    if not master.get("transcript"):
        findings.append({"code": "MISSING_TRANSCRIPT", "detail": "master has no transcript; alignment unverifiable"})
    duration = master.get("duration_s", 0)
    if not isinstance(duration, (int, float)) or duration <= 0:
        findings.append({"code": "BAD_DURATION", "detail": f"duration_s={duration!r} is not positive"})

    ledger_ids = ledger_claim_ids(master) if master.get("claim_ledger_ref") is not None else set()
    seen = set()
    for m in master.get("semantic_moments", []):
        mid = m.get("id")
        if mid in seen:
            findings.append({"code": "DUPLICATE_MOMENT_ID", "detail": f"moment id {mid!r} appears twice"})
        seen.add(mid)
        ts, te = m.get("t_start"), m.get("t_end")
        if not isinstance(ts, (int, float)) or not isinstance(te, (int, float)) or not (0 <= ts < te):
            findings.append({"code": "BAD_MOMENT_BOUNDS", "detail": f"moment {mid!r} has bad bounds t_start={ts!r} t_end={te!r}"})
        elif isinstance(duration, (int, float)) and duration > 0 and te > duration:
            findings.append({"code": "MOMENT_EXCEEDS_DURATION", "detail": f"moment {mid!r} ends at {te}s beyond duration {duration}s"})
        for cid in m.get("claim_ids", []):
            if ledger_ids and cid not in ledger_ids:
                findings.append({"code": "CLAIM_NOT_IN_LEDGER", "detail": f"moment {mid!r} cites claim {cid!r} absent from the claim ledger"})

    return {"ok": not findings, "findings": findings}


# ---------------------------------------------------------------------------
# Package builders
# ---------------------------------------------------------------------------

def _copy_unit(text, claim_ids):
    return {"text": text, "claim_ids": list(claim_ids), "generated_copy": True}


def _truncate(text, max_len):
    if max_len and len(text) > max_len:
        return text[: max(0, max_len - 1)].rstrip() + "…"
    return text


def build_destination_block(master, dest, ledger_ids):
    """Build the per-destination block for one destination."""
    master_id = master["master_id"]
    platform = dest["platform"]
    audience = dest.get("audience", "viewers")
    aspect = dest.get("aspect", "")
    is_long = aspect in LONG_FORM_ASPECTS

    moments = master.get("semantic_moments", [])
    # Representative label + claim set for generic copy: the longest moment.
    anchor = max(moments, key=lambda m: m.get("t_end", 0) - m.get("t_start", 0)) if moments else {"label": "the topic", "claim_ids": []}
    label = anchor.get("label", "the topic")
    anchor_claims = [c for c in anchor.get("claim_ids", []) if c in ledger_ids]
    ctx = {
        "label": label,
        "audience": audience,
        "platform": platform,
        "duration": _short_dur(master.get("duration_s", 0)),
    }

    def variants(pool, field, n):
        out = []
        for i in range(n):
            text = _truncate(_fill(_pick(pool, master_id, platform, field, i), **ctx), dest.get("max_title_len") if field == "title" else None)
            out.append(_copy_unit(text, anchor_claims))
        return out

    block = {
        "platform": platform,
        "aspect": aspect,
        "audience": audience,
        "format": "long-form" if is_long else "short-form",
        "title_variants": variants(TITLE_TEMPLATES, "title", 3),
        "hook_variants": variants(HOOK_TEMPLATES, "hook", 3),
        "framing": _copy_unit(_fill(_pick(FRAMING_TEMPLATES, master_id, platform, "framing", 0), **ctx), anchor_claims),
        "cta_variants": variants(CTA_TEMPLATES, "cta", 3),
        "thumbnail_concepts": variants(THUMBNAIL_TEMPLATES, "thumbnail", 2),
    }

    # Caption: factual phrasing only via the anchor moment's claim ids;
    # otherwise GENERATED_COPY phrasing with the same claim set.
    caption_text = _truncate(_fill(_pick(CAPTION_TEMPLATES, master_id, platform, "caption", 0), **ctx), dest.get("max_caption_len"))
    block["caption"] = _copy_unit(caption_text, anchor_claims)

    if is_long:
        block["chaptering"] = build_chaptering(master, ledger_ids)
    return block


def build_chaptering(master, ledger_ids):
    """Chaptering for long-form destinations, derived from semantic moments."""
    chapters = []
    intro_claims = []
    moments = sorted(master.get("semantic_moments", []), key=lambda m: m.get("t_start", 0))
    for m in moments:
        claims = [c for c in m.get("claim_ids", []) if c in ledger_ids]
        chapters.append({
            "t_start": m["t_start"],
            "t_end": m["t_end"],
            "title": m.get("label", f"segment {m.get('id')}"),
            "moment_id": m.get("id"),
            "claim_ids": claims,
        })
        intro_claims.extend(c for c in claims if c not in intro_claims)
    return {"chapters": chapters, "chapter_claim_ids_union": intro_claims}


def build_cut_candidates(master, ledger_ids):
    """Short-form cut candidates from SEMANTIC moments within length bounds.

    Each candidate cites its moment id and claim ids. A candidate may omit
    claims (subset); it may never add a claim id outside ledger_ids.
    """
    cuts = []
    for m in master.get("semantic_moments", []):
        dur = m.get("t_end", 0) - m.get("t_start", 0)
        if not (SHORT_CUT_MIN_S <= dur <= SHORT_CUT_MAX_S):
            continue
        claims = [c for c in m.get("claim_ids", []) if c in ledger_ids]
        ctx = {"label": m.get("label", f"moment {m.get('id')}")}
        title = _fill(_pick(TITLE_TEMPLATES, master["master_id"], "cut", "cut-title", 0), audience="viewers", platform="short-form", duration=_short_dur(dur), **ctx)
        cuts.append({
            "moment_id": m.get("id"),
            "t_start": m["t_start"],
            "t_end": m["t_end"],
            "duration_s": dur,
            "label": m.get("label", ""),
            "claim_ids": claims,
            "suggested_title": _copy_unit(title, claims),
            "rationale": f"semantic moment {_short_dur(dur)} within short-form bounds [{SHORT_CUT_MIN_S}s, {SHORT_CUT_MAX_S}s]",
        })
    return cuts


def build_evidence_appendix(master):
    """Claim ids -> evidence refs passthrough (no invention, no upgrading)."""
    ledger = normalize_ledger(master["claim_ledger_ref"])
    if ledger is None:
        # String reference: passthrough marks evidence as carried by reference.
        return {cid: ["by_reference:" + str(master["claim_ledger_ref"])]
                for cid in sorted(ledger_claim_ids(master))}
    return {cid: list(refs) for cid, refs in sorted(ledger.items())}


def build_publication_proposal(master, destinations):
    """Publication proposal + experiment metadata + observation window/metrics."""
    platforms = [d["platform"] for d in destinations]
    long_form = any(d.get("aspect") in LONG_FORM_ASPECTS for d in destinations)
    metrics = list(METRICS_LONG_FORM) if long_form else list(METRICS_SHORT_FORM)
    hypothesis = _fill(
        _pick(EXPERIMENT_HYPOTHESIS_TEMPLATES, master["master_id"], "proposal", "hypothesis", 0),
        platform=", ".join(platforms),
        audience=destinations[0].get("audience", "viewers") if destinations else "viewers",
        master_id=master["master_id"],
        window=OBSERVATION_WINDOW_DAYS,
    )
    return {
        "proposed_destinations": platforms,
        "master_id": master["master_id"],
        "master_digest": master.get("digest"),
        "experiment_metadata": {
            "experiment_id": "exp-" + hashlib.sha256(master["master_id"].encode()).hexdigest()[:12],
            "hypothesis": {"text": hypothesis, "claim_ids": [], "generated_copy": True},
            "arms": [f"{p}-v{i}" for p in platforms for i in range(3)],
            "primary_metric": metrics[0],
            "guardrails": "caps, pacing, and eligibility rails unchanged; variants differ in copy only, never in claims",
        },
        "observation_window_days": OBSERVATION_WINDOW_DAYS,
        "metrics": metrics,
    }


def build_monitoring_plan(master, destinations):
    """Post-publication monitoring plan over the observation window."""
    return {
        "window_days": OBSERVATION_WINDOW_DAYS,
        "cadence": "daily snapshot of all metrics; mid-window review at day 7",
        "checks": [
            "metric snapshot recorded per destination per day",
            "flag metric anomalies vs. baseline (>2x or <0.5x expected range)",
            "track disagreement/adversarial response classes per comments",
            "record any correction or takedown request as evidence, not as claim",
            "at day 7: decide continue / extend window / pull a variant",
        ],
        "decision_points": [
            {"day": 7, "action": "mid-window review: keep, adjust variants, or stop"},
            {"day": OBSERVATION_WINDOW_DAYS, "action": "final read: promote learnings to candidate learnings, never directly to policy"},
        ],
        "escalation_rule": "any privacy, credential, or platform-flag event escalates to owner immediately; does not alter claim state",
    }


# ---------------------------------------------------------------------------
# Validation (hard rule enforcement)
# ---------------------------------------------------------------------------

def _collect_claim_usages(package):
    """Walk all claim-carrying fields of the package, yielding (path, claim_id)."""
    usages = []
    for key in ("title_variants", "hook_variants", "cta_variants", "thumbnail_concepts"):
        for i, dest in enumerate(package.get("destinations", [])):
            for j, unit in enumerate(dest.get(key, [])):
                for cid in unit.get("claim_ids", []):
                    usages.append((f"destinations[{i}].{key}[{j}]", cid))
    for i, dest in enumerate(package.get("destinations", [])):
        for cid in dest.get("caption", {}).get("claim_ids", []):
            usages.append((f"destinations[{i}].caption", cid))
        for cid in dest.get("framing", {}).get("claim_ids", []):
            usages.append((f"destinations[{i}].framing", cid))
        for ch in dest.get("chaptering", {}).get("chapters", []):
            for cid in ch.get("claim_ids", []):
                usages.append((f"destinations[{i}].chaptering[{ch.get('moment_id')}]", cid))
    for i, cut in enumerate(package.get("cut_candidates", [])):
        for cid in cut.get("claim_ids", []):
            usages.append((f"cut_candidates[{i}]", cid))
        for cid in cut.get("suggested_title", {}).get("claim_ids", []):
            usages.append((f"cut_candidates[{i}].suggested_title", cid))
    return usages


def validate_package(package, master):
    """Enforce the hard rule. Returns list of violations; raises ValueError.

    A cut candidate or caption (or any generated unit) may OMIT claims but
    may never introduce a claim id absent from the master ledger. Title
    lengths are also checked against each destination's max_title_len.
    """
    violations = []
    ledger_ids = ledger_claim_ids(master)
    for path, cid in _collect_claim_usages(package):
        if cid not in ledger_ids:
            violations.append(f"UNKNOWN_CLAIM_ID at {path}: {cid!r} not in master ledger")

    for i, dest in enumerate(package.get("destinations", [])):
        max_title = dest.get("max_title_len") or 0
        for j, unit in enumerate(dest.get("title_variants", [])):
            if max_title and len(unit.get("text", "")) > max_title:
                violations.append(f"TITLE_TOO_LONG at destinations[{i}].title_variants[{j}]: {len(unit['text'])} > {max_title}")
        max_cap = dest.get("max_caption_len") or 0
        cap = dest.get("caption", {}).get("text", "")
        if max_cap and len(cap) > max_cap:
            violations.append(f"CAPTION_TOO_LONG at destinations[{i}].caption: {len(cap)} > {max_cap}")

    if not package.get("publication_proposal", {}).get("observation_window_days"):
        violations.append("MISSING_OBSERVATION_WINDOW: publication_proposal.observation_window_days is required")

    if violations:
        raise ValueError("distribution package violations:\n- " + "\n- ".join(violations))
    return violations


# ---------------------------------------------------------------------------
# Top-level entry point
# ---------------------------------------------------------------------------

def build_package(master, destinations):
    """Build the full distribution package for an approved master.

    master: {master_id, digest, duration_s, transcript, semantic_moments
             [{id, t_start, t_end, label, claim_ids[]}], claim_ledger_ref}
    destinations: [{platform, aspect, max_title_len, max_caption_len, audience}]

    Raises ValueError if the master fails structural re-verification or if
    any generated unit violates the claim-invariance hard rule.
    """
    master = copy.deepcopy(master)
    destinations = copy.deepcopy(destinations or [])

    verification = verify_master(master)
    if not verification["ok"]:
        raise ValueError("master failed re-verification:\n- " + "\n- ".join(
            f["code"] + ": " + f["detail"] for f in verification["findings"]))

    ledger_ids = ledger_claim_ids(master)

    package = {
        "package_id": "dist-" + hashlib.sha256(
            (master["master_id"] + "|" + json.dumps(destinations, sort_keys=True)).encode()
        ).hexdigest()[:12],
        "master_id": master["master_id"],
        "master_digest": master.get("digest"),
        "verification": verification,
        "destinations": [build_destination_block(master, d, ledger_ids) for d in destinations],
        "cut_candidates": build_cut_candidates(master, ledger_ids),
        "evidence_appendix": build_evidence_appendix(master),
        "publication_proposal": build_publication_proposal(master, destinations),
        "monitoring_plan": build_monitoring_plan(master, destinations),
    }
    validate_package(package, master)
    return package


if __name__ == "__main__":
    demo = {
        "master_id": "master-demo-001",
        "digest": "sha256:demo",
        "duration_s": 600,
        "transcript": "Demo transcript of the approved master cut.",
        "semantic_moments": [
            {"id": "m1", "t_start": 10, "t_end": 45, "label": "missed calls cost revenue", "claim_ids": ["c1"]},
            {"id": "m2", "t_start": 120, "t_end": 240, "label": "AI answering demo", "claim_ids": ["c2", "c3"]},
        ],
        "claim_ledger_ref": {"claims": {"c1": {"evidence_refs": ["ev-1"]}, "c2": {"evidence_refs": ["ev-2"]}, "c3": {"evidence_refs": []}}},
    }
    dests = [
        {"platform": "youtube", "aspect": "horizontal", "max_title_len": 100, "max_caption_len": 5000, "audience": "home-service owners"},
        {"platform": "tiktok", "aspect": "vertical", "max_title_len": 150, "max_caption_len": 2200, "audience": "home-service owners"},
    ]
    print(json.dumps(build_package(demo, dests), indent=2, sort_keys=True))
