#!/usr/bin/env python3
"""Build seed-2026-09-23.jsonl from crx-autonomous-missions/mechanisms.jsonl.

One record per repository (normalized identity). Memory format for the
GITHUB pipeline. No READMEs copied; reproducible references only.
No vector similarity used anywhere.
"""
import json, re, os, subprocess, collections

SRC = os.path.expanduser("~/workspace/crx-autonomous-missions/mechanisms.jsonl")
RT = os.path.expanduser("~/workspace/crx-autonomous-missions/redteam/verdicts.jsonl")
REPOS = os.path.expanduser("~/workspace/crx-autonomous-missions/repos")
OUT = os.path.expanduser("~/workspace/autonomous-missions/github-corpus/seed-2026-09-23.jsonl")

SHA = re.compile(r'^[0-9a-f]{7,40}$')

# SOURCE_PROJECT label -> (normalized identity, identity note)
NORMALIZE = {
    "AIOS (devin-lai/AIOS)": ("devin-lai/AIOS", None),
    "letta-ai/letta (archive branch)": ("letta-ai/letta", "archive branch; retired V1 server"),
    "letta-ai/letta (archive branch, retired V1 server)": ("letta-ai/letta", "archive branch; retired V1 server"),
    "SWE-agent": ("SWE-agent/SWE-agent", "label lacked owner; merged with SWE-agent/SWE-agent on identical pinned SHA"),
    "Memary-Labs/memary (kingjulio8238/Memary)": ("Memary-Labs/memary", "also seen as kingjulio8238/Memary; identity unresolved, do not assume"),
    "comet-ml/opik (architecture-level finding from the repository design docs; local clone pending verification)": ("comet-ml/opik", "architecture-level finding from design docs; local clone pending verification at import"),
    "LangSmith (docs only; repository not cloned, no source inspection)": ("LangSmith", "docs only; repository not cloned, no source inspection; identity is the product, not a repo"),
    "Claude Squad": ("Claude Squad", "canonical owner/repo not verified in campaign; do not guess"),
    "Fountain": ("Fountain", "canonical owner/repo not verified in campaign; do not guess"),
    "Aider": ("Aider", "canonical owner/repo not verified in campaign; do not guess"),
    "bors-ng": ("bors-ng", "canonical owner/repo form not verified; do not assume bors-ng/bors-ng"),
    "mini-SWE-agent": ("mini-SWE-agent", "canonical owner/repo not verified in campaign; do not guess"),
    "OpenAI ChatGPT memory (documentation only, no source)": ("OpenAI ChatGPT memory", "documentation only; no source; identity is the product feature, not a repo"),
    "OpenObserve (v1.0 announcement 2026-09-22; product level, repository not cloned)": ("OpenObserve", "v1.0 product announcement level; repository not cloned"),
    "opensearch-project Agent Health (project announcement 2026-02-28; product level, repository not cloned)": ("opensearch-project Agent Health", "project announcement level; repository not cloned"),
    "openguardrails/openguardrails (protocol proposal; README level, repository not cloned)": ("openguardrails/openguardrails", "protocol proposal; README level; repository not cloned"),
    "redhatproductsecurity/ai-guardian (changelog and docs level; repository not cloned)": ("redhatproductsecurity/ai-guardian", "changelog and docs level; repository not cloned"),
    "AI45Lab/AgentDoG (research framework; paper COLM 2025, arxiv 2601.18491; repository not cloned)": ("AI45Lab/AgentDoG", "research framework; paper COLM 2025; repository not cloned"),
    "MemoriLabs/Memori": ("MemoriLabs/Memori", None),
    "zhongwanjun/MemoryBank-SiliconFriend": ("zhongwanjun/MemoryBank-SiliconFriend", None),
}

# normalized identity -> local clone dir
CLONES = {
    "alex2481kobe/orca": "alex2481kobe-orca",
    "orca-cli/orca": "orca",
    "SWE-agent/SWE-agent": "swe-agent",
    "microsoft/autogen": "autogen",
    "crewAIInc/crewAI": "crewai",
    "block/goose": "goose",
    "langchain-ai/langgraph": "langgraph",
    "OpenHands/software-agent-sdk": "openhands-sdk",
    "pydantic/pydantic-ai": "pydantic-ai",
    "microsoft/semantic-kernel": "sk",
    "huggingface/smolagents": "smolagents",
    "google/adk-python": "adk",
    "agentscope-ai/agentscope": "agentscope",
    "temporalio/sdk-python": "temporal-py",
}

L2_HINTS = ("not cloned", "pending verification", "announcement", "README level",
            "product level", "protocol proposal", "changelog and docs", "docs only",
            "documentation only", "architecture-level finding")

def trunc(s, n=220):
    s = (s or "").replace("\n", " ").strip()
    return s if len(s) <= n else s[:n-1] + "\u2026"

def git(repo_dir, *args):
    try:
        return subprocess.run(["git", "-C", repo_dir, *args],
                              capture_output=True, text=True, timeout=30).stdout.strip()
    except Exception:
        return ""

def main():
    records = []
    with open(SRC) as f:
        for line in f:
            records.append(json.loads(line))

    redteam = {}
    with open(RT) as f:
        for line in f:
            r = json.loads(line)
            redteam[r["MECHANISM_ID"]] = r

    groups = collections.OrderedDict()
    for r in records:
        label = r["SOURCE_PROJECT"]
        ident, note = NORMALIZE.get(label, (label, None))
        groups.setdefault(ident, {"labels": set(), "note": note, "recs": []})
        groups[ident]["labels"].add(label)
        groups[ident]["recs"].append(r)

    seeds = []
    for ident, g in sorted(groups.items()):
        recs = g["recs"]
        shas = collections.Counter()
        for r in recs:
            c = r.get("SOURCE_COMMIT", "")
            shas[c] += 1
        observed = shas.most_common(1)[0][0]
        full_shas = sorted({c for c in shas if SHA.fullmatch(c or "") and len(c) == 40})
        any_sha = any(SHA.fullmatch(c or "") for c in shas)

        clone_dir = CLONES.get(ident)
        clone_present = bool(clone_dir) and os.path.isdir(os.path.join(REPOS, clone_dir))
        local_head, local_head_date, pin_resolves = None, None, None
        if clone_present:
            rd = os.path.join(REPOS, clone_dir)
            local_head = git(rd, "rev-parse", "HEAD") or None
            local_head_date = git(rd, "log", "-1", "--format=%ci", "HEAD") or None
            if any_sha:
                pin_resolves = bool(git(rd, "cat-file", "-t", observed)) if SHA.fullmatch(observed or "") else None
                pin_resolves = pin_resolves if pin_resolves is not None else None

        label_blob = " | ".join(sorted(g["labels"]))
        docs_only = ("docs only" in label_blob) or ("documentation only" in label_blob)
        if docs_only:
            level, basis = ("L1_CLAIMED",
                "Docs/product announcement only; no source inspection in campaign.")
        elif any(h in label_blob for h in L2_HINTS) or not any_sha:
            level, basis = ("L2_SOURCE_STRUCTURE_VERIFIED",
                "Repository structure/docs inspected; mechanism not verified against pinned source.")
        else:
            level, basis = ("L3_SOURCE_MECHANISM_VERIFIED",
                "Mechanism inspected against pinned commit SHA.")
            if not clone_present:
                basis += " Local clone absent at import; re-verify SHA before any harvest."

        verdicts = sorted({r["HARVEST_CLASS"] for r in recs})
        rej_reasons = []
        for r in recs:
            if r["HARVEST_CLASS"] == "REJECT":
                reason = r.get("SEMANTIC_DELTA") or r.get("INVARIANT") or ""
                rej_reasons.append({"mechanism_id": r["MECHANISM_ID"], "reason": trunc(reason, 300)})

        rt = []
        for r in recs:
            v = redteam.get(r["MECHANISM_ID"])
            if v:
                rt.append({"mechanism_id": r["MECHANISM_ID"], "verdict": v["VERDICT"],
                           "hardening_required": trunc(v.get("HARDENING_REQUIRED", ""), 400),
                           "corrected_invariant": trunc(v.get("CORRECTED_INVARIANT", ""), 300)})

        def rank_key(r):
            hc = {"REUSE": 0, "ADAPT": 1, "PATTERN": 2, "WATCH": 3, "REJECT": 4}[r["HARVEST_CLASS"]]
            ev = 0 if r.get("EXPECTED_VALUE") == "High" else (1 if r.get("EXPECTED_VALUE") == "Medium" else 2)
            bonus = -1 if r["MECHANISM_ID"] in redteam else 0
            return (hc, ev, bonus)

        important = []
        for r in sorted(recs, key=rank_key)[:10]:
            important.append({
                "mechanism_id": r["MECHANISM_ID"],
                "harvest_class": r["HARVEST_CLASS"],
                "expected_value": r.get("EXPECTED_VALUE"),
                "integration_cost": r.get("INTEGRATION_COST"),
                "problem": trunc(r.get("PROBLEM"), 240),
                "invariant": trunc(r.get("INVARIANT"), 240),
                "redteam_verdict": redteam[r["MECHANISM_ID"]]["VERDICT"] if r["MECHANISM_ID"] in redteam else None,
            })

        crx_analogs = []
        for r in recs:
            a = trunc(r.get("CRX_ANALOG"), 260)
            if a and a not in crx_analogs:
                crx_analogs.append(a)

        def ev_high(v):
            v = (v or "").lower()
            return v.startswith("high") or v.startswith("very high")

        high_value = any(ev_high(r.get("EXPECTED_VALUE")) and r["HARVEST_CLASS"] in ("ADAPT", "REUSE") for r in recs)

        lic_set = sorted({r.get("LICENSE") for r in recs})
        lic_blob = " ".join(lic_set).lower()
        license_flag = None
        if "agpl" in lic_blob:
            license_flag = "COPYLEFT (AGPL): harvest as pattern only; do not vendor code"
        elif "sspl" in lic_blob or "elastic" in lic_blob:
            license_flag = "SOURCE-AVAILABLE (SSPL/Elastic): not OSI-approved; pattern only, do not vendor code"
        elif "bsl" in lic_blob:
            license_flag = "BSL: check grant terms before any reuse"
        elif "unverified" in lic_blob or "n/a" in lic_blob:
            license_flag = "LICENSE UNVERIFIED: verify before any code reuse"

        if clone_present and local_head_date:
            lmc = f"{local_head_date[:10]} (local clone HEAD {local_head[:12] if local_head else '?'}; pinned SHA resolves locally: {pin_resolves})"
        else:
            lmc = "unknown at import; CHANGE_WATCH mission must establish it"

        seeds.append({
            "repo": ident,
            "repo_labels_raw": sorted(g["labels"]),
            "identity_note": g["note"],
            "pinned_shas_full": full_shas,
            "observed_sha": observed if SHA.fullmatch(observed or "") else None,
            "observed_sha_raw": observed,
            "mechanism_count": len(recs),
            "mechanism_ids": [r["MECHANISM_ID"] for r in recs],
            "important_mechanisms": important,
            "evidence_level": level,
            "evidence_basis": basis,
            "clone_present_at_import": clone_present,
            "pinned_sha_resolves_locally": pin_resolves,
            "previous_verdicts": verdicts,
            "rejection_reasons": rej_reasons,
            "redteam": rt,
            "crx_analogs": crx_analogs[:12],
            "licenses": lic_set,
            "license_flag": license_flag,
            "last_meaningful_change": lmc,
            "suggested_watch": "daily" if high_value else "rolling",
            "record_source": "crx-autonomous-missions/mechanisms.jsonl (2026-09-23 campaign); import 2026-09-23",
            "harvest_note": "External evidence only. Nothing above L3. Re-verify pinned SHA and license before any harvest decision.",
        })

    with open(OUT, "w") as f:
        for s in seeds:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")
    dist = collections.Counter(s["evidence_level"] for s in seeds)
    print(f"wrote {len(seeds)} repo records -> {OUT}")
    print("evidence level dist:", dict(dist))
    print("watch daily:", sum(1 for s in seeds if s["suggested_watch"] == "daily"))

main()
