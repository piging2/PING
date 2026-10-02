"""Extract SQL template literals from mission_runtime.js and validate each
with pglast (real PostgreSQL grammar). Also checks $N placeholder numbering
against the params arrays passed alongside each query call."""
import re, sys

PATH = "/home/nolan/ping-wave-P-20260923-106-107-108/ping-runtime/orchestration/mission_runtime.js"

src = open(PATH).read()

# Find this._pool.query(`...`, [...]) calls — SQL has no ${} interpolations,
# so a simple backtick scan is safe. Walk char by char to handle multiline.
stmts = []
i = 0
while True:
    j = src.find("this._pool.query(", i)
    if j < 0:
        break
    k = src.find("`", j)
    if k < 0:
        break
    m = src.find("`", k + 1)
    if m < 0:
        break
    sql = src[k + 1:m]
    # capture the params array that follows the template literal
    rest = src[m + 1:m + 600]
    pm = re.match(r"\s*,\s*\[([^\]]*)\]", rest, re.S)
    params = pm.group(1).strip() if pm else None
    stmts.append((sql, params))
    i = m + 1

print(f"extracted {len(stmts)} query calls")

import pglast

ok = True
for idx, (sql, params) in enumerate(stmts):
    label = sql.strip().split("\n")[0][:70]
    try:
        pglast.parse_sql(sql)
        parse = "PARSE_OK"
    except Exception as e:
        parse = f"PARSE_FAIL: {e}"
        ok = False
    # placeholder check: highest $N must equal number of params passed
    ph = sorted(set(int(n) for n in re.findall(r"\$(\d+)", sql)))
    nparams = None
    if params is not None:
        # count top-level commas in the params array text
        depth = 0
        nparams = 1 if params else 0
        instr = False
        for ch in params:
            if ch in "\"'":
                instr = not instr
            if instr:
                continue
            if ch in "([{":
                depth += 1
            elif ch in ")]}":
                depth -= 1
            elif ch == "," and depth == 0:
                nparams += 1
    expect = max(ph) if ph else 0
    match = (nparams == expect)
    if not match:
        ok = False
    print(f"[{idx}] {parse} | placeholders={ph} params_passed={nparams} match={match} | {label}")

print("ALL_SQL_VALID" if ok else "SQL_PROBLEMS_FOUND")
sys.exit(0 if ok else 1)
