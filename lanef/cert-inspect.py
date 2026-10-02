import json
d = json.load(open("/home/nolan/worktrees/constitutional-convergence/releases/candidate-4d522a6b/release-certification.json"))
ss = d.get("schemaState", {})
print("migrationSources:", ss.get("migrationSources"))
stmts = ss.get("statements", [])
print("statements:", len(stmts))
for s in stmts[:5]:
    print(" ", s.get("file"), s.get("keyword"), s.get("table"), s.get("verdict"))
g = d["prePromotionGates"]["migrationTrigger"]
print("mt summary:", g.get("summary"))
print("mt detail:", str(g.get("detail"))[:800])
