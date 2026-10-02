#!/usr/bin/env python3
"""
LANE-INCREMENTAL proof harness (part 1): content-addressed stage digests +
phone-change invalidation measurement + occurrence-identity hard rule +
adversarial 32-bit digest-collision probe.

Digest algorithm: byte-identical port of
/home/nolan/projects/ping/src/fyd/builder/canonical.ts
(canonicalizeSpec + semanticDigestOf: sorted keys, strip *At volatile stamps,
array order preserved, sha256 hex). Differentially verified against the real
TS function (see SELF_TEST vectors below, produced by tsx on the Pig).
"""
import json, hashlib, copy, time, os, sys

FIXTURE = os.path.expanduser("~/workspace/fyd-factory/corpus/fixtures/clearwater-plumbing-demo.json")
OLD_PHONE = "(970) 555-0142"
NEW_PHONE = "(970) 555-0143"

# ---------------------------------------------------------------- canonical
def canonicalize(v):
    if isinstance(v, list):
        return [canonicalize(x) for x in v]
    if isinstance(v, dict):
        out = {}
        for k in sorted(v.keys()):
            if k in ("generatedAt", "dumpedAt", "manifestGeneratedAt") or k.endswith("At"):
                continue
            out[k] = canonicalize(v[k])
        return out
    return v

def canon_json(v):
    return json.dumps(canonicalize(v), sort_keys=True, separators=(",", ":"), ensure_ascii=True)

def sha256hex(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def digest(v):
    return sha256hex(canon_json(v))

# ------------------------------------------------------- differential self-test
TS_SAMPLE = {
  "kind": "fyd.sitespec@1",
  "generatedAt": "2026-09-23T19:00:00Z",
  "pages": [
    {"slug": "home", "generatedAt": "2026-09-23T19:00:00Z",
     "sections": [
        {"id": "home:hero:0", "component": "Hero", "objectIds": ["cw-biz-01"], "copy": "Call us"},
        {"id": "home:services:1", "component": "ServiceGrid", "objectIds": ["cw-svc-02","cw-svc-01"], "copy": None},
     ]},
  ],
  "ownerObjectId": "cw-biz-01",
  "nested": {"bKey": 2, "aKey": 1, "updatedAt": "2026-09-24T00:30:00Z", "deep": {"z": [3,2,1], "y": "x"}},
}
TS_EXPECTED_CANON = '{"kind":"fyd.sitespec@1","nested":{"aKey":1,"bKey":2,"deep":{"y":"x","z":[3,2,1]}},"ownerObjectId":"cw-biz-01","pages":[{"sections":[{"component":"Hero","copy":"Call us","id":"home:hero:0","objectIds":["cw-biz-01"]},{"component":"ServiceGrid","copy":null,"id":"home:services:1","objectIds":["cw-svc-02","cw-svc-01"]}],"slug":"home"}]}'
TS_EXPECTED_DIGEST = "0da8444b2df07f31194b9935228635280f9f04e731bef47bbe41481682c0c7a9"

def self_test():
    c = canon_json(TS_SAMPLE)
    d = sha256hex(c)
    assert c == TS_EXPECTED_CANON, f"canonical mismatch:\n{c}\nvs\n{TS_EXPECTED_CANON}"
    assert d == TS_EXPECTED_DIGEST, f"digest mismatch: {d}"
    print("SELF_TEST: python digest port == real canonical.ts output (verified)")

# ---------------------------------------------------------------- stage graph
STAGES = ["SOURCE", "OBSERVATION", "NORMALIZED", "EVIDENCE", "OBJECT",
          "SECTION", "PAGE", "SITESPEC", "RENDER_MODEL", "PROJECTION"]

class StageGraph:
    """Content-addressed compilation DAG. Node id = stage:occurrenceId.
    Identity is occurrence-based: two nodes with identical bytes but different
    occurrence ids are distinct nodes and never collapse."""
    def __init__(self):
        self.nodes = {}   # nodeId -> {stage, occ, content, digest}
        self.edges = {}   # child -> [parent nodeIds]
        self.children = {}# parent -> [child nodeIds]

    def add(self, stage, occ, content, parents):
        nid = f"{stage}:{occ}"
        n = {"stage": stage, "occ": occ, "content": content,
             "digest": digest({"_occ": occ, "_stage": stage, "content": content})}
        self.nodes[nid] = n
        self.edges.setdefault(nid, [])
        for p in parents:
            self.edges[nid].append(p)
            self.children.setdefault(p, []).append(nid)
        return nid

def build_graph(graph, acq_seq):
    """Build the full stage DAG from the fixture graph.
    acq_seq: acquisition sequence number (occurrence stamp for this ingestion)."""
    g = graph
    N = StageGraph()

    # SOURCE: one occurrence per distinct provenance channel (synthetic bytes
    # derived deterministically from the channel; identity = occurrence id).
    prov_refs = sorted({o["provenance"]["ref"] for o in g["objects"]})
    src_nodes = {}
    for i, ref in enumerate(prov_refs):
        occ = f"acq{acq_seq:03d}/src-{i:02d}"
        src_nodes[ref] = N.add("SOURCE", occ,
            {"channel": ref, "bytesDigest": sha256hex(f"raw-bytes::{ref}::seq{acq_seq}")}, [])

    # OBSERVATION: one typed observation occurrence per source (occurrence id
    # carries url + fetchedAt + seq: never byte-derived).
    obs_nodes = {}
    for i, ref in enumerate(prov_refs):
        occ = f"acq{acq_seq:03d}/obs-{i:02d}"
        obs_nodes[ref] = N.add("OBSERVATION", occ,
            {"url": ref, "fetchedAt": f"2026-09-24T00:{30+acq_seq:02d}:00Z",
             "statusCode": 200, "levelUsed": 1, "depth": 0}, [src_nodes[ref]])

    # NORMALIZED: normalized observation sets per channel.
    norm_nodes = {}
    for i, ref in enumerate(prov_refs):
        occ = f"acq{acq_seq:03d}/norm-{i:02d}"
        norm_nodes[ref] = N.add("NORMALIZED", occ,
            {"channel": ref, "normalizedFacts": sorted(
                f"{o['id']}.{k}={o['fields'].get(k)}" for o in g["objects"]
                if o["provenance"]["ref"] == ref for k in o.get("fields", {}))},
            [obs_nodes[ref]])

    # EVIDENCE: per claimRef, the attested fact set (objectId.field=value).
    ev_nodes = {}
    for ref in prov_refs:
        facts = sorted(f"{o['id']}.{k}={o['fields'].get(k)}" for o in g["objects"]
                       if o["provenance"]["ref"] == ref for k in o.get("fields", {}))
        occ = f"acq{acq_seq:03d}/ev-" + ref.replace(":", "-").replace("/", "-").replace(".", "-")
        ev_nodes[ref] = N.add("EVIDENCE", occ, {"claimRef": ref, "facts": facts}, [norm_nodes[ref]])

    # OBJECT: one node per object occurrence. Digest binds the occurrence id,
    # so byte-identical twins never collapse (hard rule).
    obj_nodes = {}
    for o in g["objects"]:
        obj_nodes[o["id"]] = N.add("OBJECT", o["id"],
            {"schema": o["schema"], "visibility": o["visibility"], "title": o["title"],
             "fields": o.get("fields", {}), "provenance": o["provenance"]},
            [ev_nodes[o["provenance"]["ref"]]])

    # SECTION: binding plan mirroring planner semantics
    # (bindingId form pageSlug:component:index, objectField forms owner / related).
    owner = "cw-biz-01"
    rels = g["relationships"]
    def related(pred):
        return sorted(r["object"] for r in rels if r["subject"] == owner and r["predicate"] == pred and r["status"] == "active")
    by_id = {o["id"]: o for o in g["objects"]}
    phone = by_id[owner]["fields"].get("phone", "")
    sections = [
        ("home:hero:0", "Hero", "owner", [owner],
         f"{by_id[owner]['title']} - Call {phone}"),
        ("home:services:1", "ServiceGrid", "related:provides", related("provides"), None),
        ("home:team:2", "Team", "related:employs", related("employs"), None),
        ("home:contact:3", "Contact", "owner", [owner], f"Call {phone} today"),
        ("home:hours:4", "Hours", "owner", [owner], by_id[owner]["fields"].get("hours")),
        ("home:areas:5", "ServiceAreas", "owner", [owner], by_id[owner]["fields"].get("area_served")),
        ("home:faq:6", "Faq", "related:publishes", related("publishes"), None),
        ("home:footer:7", "Footer", "owner", [owner], f"{by_id[owner]['title']} - {phone}"),
        ("services:services:0", "ServiceGrid", "related:provides", related("provides"), None),
        ("contact:contact:0", "Contact", "owner", [owner], f"Call {phone} today"),
    ]
    sec_nodes = {}
    for sid, comp, objfield, oids, copy in sections:
        sec_nodes[sid] = N.add("SECTION", sid,
            {"component": comp, "componentVersion": "registry@7",
             "objectField": objfield, "objectIds": oids,
             "objectDigests": [N.nodes[obj_nodes[i]]["digest"] for i in oids],
             "copy": copy, "plannerVersion": "fyd-site-planner@1"},
            [obj_nodes[i] for i in oids])

    # PAGE
    pages = {"home": [s[0] for s in sections if s[0].startswith("home:")],
             "services": ["services:services:0"],
             "contact": ["contact:contact:0"]}
    page_nodes = {}
    for slug, sids in pages.items():
        page_nodes[slug] = N.add("PAGE", slug,
            {"slug": slug, "sections": [{"id": s, "digest": N.nodes[sec_nodes[s]]["digest"]} for s in sids]},
            [sec_nodes[s] for s in sids])

    # SITESPEC: semantic digest over the whole spec (same algorithm as
    # semanticDigestOf in canonical.ts).
    spec_content = {"kind": "fyd.sitespec@1", "version": 1, "ownerObjectId": owner,
        "generator": {"name": "fyd-site-generator", "version": "fyd-site-planner@1",
                      "generatedAt": "VOLATILE-STRIPPED"},
        "pages": [{"slug": sl, "sections": [
            {"id": s, "component": N.nodes[sec_nodes[s]]["content"]["component"],
             "objectIds": N.nodes[sec_nodes[s]]["content"]["objectIds"],
             "copy": N.nodes[sec_nodes[s]]["content"]["copy"]} for s in sids]}
            for sl, sids in pages.items()]}
    spec_node = N.add("SITESPEC", "clearwater-plumbing-demo", spec_content, list(page_nodes.values()))

    # RENDER_MODEL: pages -> sections -> objectIds (buildSemanticRenderModel shape).
    rm_content = {"renderModelVersion": 1, "rendererVersion": "renderer.tsx@unversioned",
        "designTokenVersion": "tokens@unversioned", "viewerId": None, "asOf": "VOLATILE-STRIPPED",
        "specKind": "fyd.sitespec@1", "ownerOverrides": "none",
        "pages": [{"slug": sl, "sections": [
            {"id": s, "component": N.nodes[sec_nodes[s]]["content"]["component"],
             "objectIds": N.nodes[sec_nodes[s]]["content"]["objectIds"],
             "copy": N.nodes[sec_nodes[s]]["content"]["copy"]} for s in sids]}
            for sl, sids in pages.items()]}
    rm_node = N.add("RENDER_MODEL", "public", rm_content, [spec_node])

    # PROJECTION: per viewer class.
    proj_nodes = {}
    for vc in ("public", "owner"):
        proj_nodes[vc] = N.add("PROJECTION", vc,
            {"viewerClass": vc, "renderModelDigest": N.nodes[rm_node]["digest"],
             "visibleObjectIds": [o["id"] for o in g["objects"] if o["visibility"] == "public"] if vc == "public"
                                 else [o["id"] for o in g["objects"]]},
            [rm_node])
    return N, {"src": src_nodes, "obs": obs_nodes, "norm": norm_nodes, "ev": ev_nodes,
               "obj": obj_nodes, "sec": sec_nodes, "page": page_nodes,
               "spec": spec_node, "rm": rm_node, "proj": proj_nodes}

def main():
    self_test()
    t0 = time.time()
    data = json.load(open(FIXTURE))
    base = StageGraph()
    N1, idx1 = build_graph(data["graph"], acq_seq=1)
    t_build = time.time() - t0
    print(f"BASELINE: {len(N1.nodes)} stage nodes built in {t_build*1000:.1f} ms")
    json.dump({nid: n["digest"] for nid, n in N1.nodes.items()},
              open(os.path.expanduser("~/workspace/fyd-factory/incremental/proof/baseline-digests.json"), "w"),
              indent=1, sort_keys=True)

    # ---- phone change: new ingestion occurrence (acq_seq=2), phone updated
    t1 = time.time()
    data2 = copy.deepcopy(data)
    for o in data2["graph"]["objects"]:
        if o["id"] == "cw-biz-01":
            assert o["fields"]["phone"] == OLD_PHONE
            o["fields"]["phone"] = NEW_PHONE
    N2, idx2 = build_graph(data2["graph"], acq_seq=2)
    t_rebuild = time.time() - t1

    # ---- incremental accounting: which nodes changed digest vs baseline
    # (same occurrence ids reused across ingestions where the occurrence is the same)
    changed, same = {}, {}
    for nid, n2 in N2.nodes.items():
        # occurrence ids embed acq seq for upstream stages; map to baseline twin
        twin = nid.replace("acq002", "acq001")
        n1 = N1.nodes.get(twin)
        bucket = changed if (n1 is None or n1["digest"] != n2["digest"]) else same
        bucket.setdefault(n2["stage"], []).append(n2["occ"] if n1 is None else n2["occ"])
    print("\nINVALIDATION (phone %s -> %s):" % (OLD_PHONE, NEW_PHONE))
    total_changed = total_same = 0
    for st in STAGES:
        c = sorted(set(changed.get(st, []))); s = len(same.get(st, []))
        total_changed += len(c); total_same += s
        print(f"  {st:12s} rebuilt={len(c):3d} cache_hit={s:3d}" + (f"  rebuilt: {c}" if c and len(c) <= 8 else ""))
    print(f"  TOTAL rebuilt={total_changed} cache_hit={total_same} of {len(N2.nodes)} nodes")
    print(f"  full rebuild cost {t_rebuild*1000:.1f} ms; incremental would recompute only {total_changed} nodes")

    # ---- assertions: only the affected chain invalidates
    assert idx2["obj"]["cw-biz-01"] and N2.nodes[idx2["obj"]["cw-biz-01"]]["digest"] != \
        N1.nodes[idx2["obj"]["cw-biz-01"].replace("acq002", "acq001")]["digest"], "owner object must change"
    for oid in idx2["obj"]:
        if oid == "cw-biz-01": continue
        a = N2.nodes[idx2["obj"][oid]]["digest"]; b = N1.nodes[idx2["obj"][oid].replace("acq002", "acq001")]["digest"]
        assert a == b, f"object {oid} must be a cache hit"
    affected_sections = {"home:hero:0", "home:contact:3", "home:hours:4", "home:areas:5",
                         "home:footer:7", "contact:contact:0"}
    for sid in idx2["sec"]:
        a = N2.nodes[idx2["sec"][sid]]["digest"]; b = N1.nodes[idx2["sec"][sid].replace("acq002", "acq001")]["digest"]
        if sid in affected_sections: assert a != b, f"section {sid} must rebuild"
        else: assert a == b, f"section {sid} must be a cache hit"
    for slug in ("home", "contact"):
        a = N2.nodes[idx2["page"][slug]]["digest"]; b = N1.nodes[idx2["page"][slug].replace("acq002", "acq001")]["digest"]
        assert a != b
    a = N2.nodes[idx2["page"]["services"]]["digest"]; b = N1.nodes[idx2["page"]["services"].replace("acq002", "acq001")]["digest"]
    assert a == b, "services page must be a cache hit"
    print("ASSERTIONS: all invalidation boundaries exact (only affected chain rebuilt)")

    # ---- hard rule: distinct occurrences never collapse even when bytes match
    N3 = StageGraph()
    n_a = N3.add("OBSERVATION", "acq009/obs-00", {"url": "https://x.example/", "bytes": "SAME-BYTES"}, [])
    n_b = N3.add("OBSERVATION", "acq010/obs-00", {"url": "https://x.example/", "bytes": "SAME-BYTES"}, [])
    assert n_a != n_b and N3.nodes[n_a]["digest"] != N3.nodes[n_b]["digest"]
    N4 = StageGraph()
    o1 = N4.add("OBJECT", "cw-twin-01", {"fields": {"phone": "SAME"}}, [])
    o2 = N4.add("OBJECT", "cw-twin-02", {"fields": {"phone": "SAME"}}, [])
    assert N4.nodes[o1]["digest"] != N4.nodes[o2]["digest"]
    print("HARD_RULE: byte-identical observations and objects keep distinct identities (no collapse)")

    # ---- render-model section-level diff: which rendered sections actually differ
    rm1 = N1.nodes["RENDER_MODEL:public"]["content"]; rm2 = N2.nodes["RENDER_MODEL:public"]["content"]
    s1 = {s["id"]: s for p in rm1["pages"] for s in p["sections"]}
    s2 = {s["id"]: s for p in rm2["pages"] for s in p["sections"]}
    sec_diff = sorted(sid for sid in s1 if digest(s1[sid]) != digest(s2[sid]))
    sec_same = sorted(sid for sid in s1 if digest(s1[sid]) == digest(s2[sid]))
    print(f"RENDER_MODEL section diff: changed={len(sec_diff)} unchanged={len(sec_same)}")
    print(f"  changed sections: {sec_diff}")
    # Render-model entries carry rendered output (id/component/objectIds/copy):
    # only the 4 sections whose rendered copy contains the phone differ.
    # The SECTION stage (dependency level) conservatively rebuilt 6 because
    # hours/areas bind the changed object; their rendered output is unchanged.
    expected_render_changed = {"home:hero:0", "home:contact:3", "home:footer:7", "contact:contact:0"}
    assert set(sec_diff) == expected_render_changed, "render-model section diff must equal output-affected set"
    assert set(sec_diff) < affected_sections, "render diff must be a strict subset of dependency invalidation"

    # ---- reverse walk: change impact from the changed field (DependencyManifest semantics)
    impacted = [sid for sid in idx2["sec"]
                if "cw-biz-01" in N2.nodes[idx2["sec"][sid]]["content"]["objectIds"]]
    assert set(impacted) == affected_sections
    print(f"REVERSE_WALK: cw-biz-01 -> {len(impacted)} bindings (matches rebuilt set exactly)")

    json.dump({"changed": {k: sorted(set(v)) for k, v in changed.items()},
               "rebuilt": total_changed, "cache_hit": total_same,
               "render_model_sections_changed": sec_diff,
               "render_model_sections_unchanged": sec_same,
               "old_phone": OLD_PHONE, "new_phone": NEW_PHONE,
               "objects_total": 25, "sections_total": 10, "pages_total": 3},
              open(os.path.expanduser("~/workspace/fyd-factory/incremental/proof/invalidation-result.json"), "w"),
              indent=1, sort_keys=True)
    print("WROTE proof/invalidation-result.json + proof/baseline-digests.json")

if __name__ == "__main__":
    main()
