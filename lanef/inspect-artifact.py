import json
d = json.load(open("/tmp/lanef/release-certification-a9cad2663.json"))
print("verdict:", d.get("verdict"))
for k in ["eventIdentity", "witnessReplay"]:
    print("=" * 10, k)
    print(json.dumps(d.get(k), indent=1)[:1200])
print("=" * 10, "distribution")
print(json.dumps(d.get("distribution"), indent=1))
print("=" * 10, "baseline certifiedImage:", d.get("baseline", {}).get("certifiedImage"))
