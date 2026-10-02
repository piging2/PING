import json
d = json.load(open("/tmp/lanef/release-certification-a9cad2663.json"))
for k in ["runtimeDepsClosure", "securityNegatives"]:
    g = d["prePromotionGates"][k]
    print("=" * 20, k, g["status"])
    print("summary:", g.get("summary"))
    print("detail:", str(g.get("detail"))[:2500])
    print()
src = d["source"]
print("source:", src)
