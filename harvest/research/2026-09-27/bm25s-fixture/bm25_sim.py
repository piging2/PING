"""
BM25S defect-proof simulation (research space only, never run against the repo).

Part 1 - CURRENT MACHINERY (verified 2026-09-26 on fyd/sprint-integration-2026-09-24):
  sort related objects by (predicateRank, objectId), then slice(0, 8).
  Shows that the question-relevant object (pag-002, the financing page) is
  deterministically dropped by the maxRelated=8 cap for the fixture question.

Part 2 - BM25-LITE SCORER (the BACKLOG mechanism: BM25 scoring math ported to
  plain loops, the ~40-line TS proposal):
  score each neighbor's text (name + description) against the question with
  standard BM25 (k1=1.2, b=0.75), no stemming, lowercase alnum tokenization
  (the note "reuse PING's topicWords tokenizer" means: same token stream PING
  already uses for its grounding gate, not a new dependency).
  Shows pag-002 ranks first, so a rankRelatedByQuery step applied BEFORE the
  slice(0, 8) truncation keeps the relevant object in the context the composer
  sees.

This proves the defect class on a fixture modeled exactly on verified
machinery. It does NOT prove Q5 (no benchmark against real tenant data) and
does NOT prove live-tenant occurrence (Q1 stays fixture-demonstrated).
"""
import json
import math
import re
import sys

PREDICATE_PRIORITY = {"located_at": 0, "provides": 1, "works_for": 2, "links_to": 3}
MAX_RELATED = 8

def tokenize(text):
    return re.findall(r"[a-z0-9]+", text.lower())

def current_order(neighbors):
    """Verified current behavior: predicate priority, object-id tiebreak."""
    return sorted(neighbors, key=lambda o: (PREDICATE_PRIORITY[o["predicate"]], o["id"]))

def bm25_scores(query, docs, k1=1.2, b=0.75):
    """Standard BM25 over the neighbor text corpus. Plain loops: the candidate
    set is dozens of objects, so no sparse-matrix machinery is needed."""
    tok_docs = [tokenize(d["name"] + " " + d["description"]) for d in docs]
    q_terms = tokenize(query)
    n = len(tok_docs)
    avgdl = sum(len(d) for d in tok_docs) / n
    df = {}
    for d in tok_docs:
        for t in set(d):
            df[t] = df.get(t, 0) + 1
    idf = {t: math.log(1 + (n - df_t + 0.5) / (df_t + 0.5)) for t, df_t in df.items()}
    scores = []
    for d in tok_docs:
        dl = len(d)
        s = 0.0
        for t in q_terms:
            if t not in idf:
                continue
            tf = d.count(t)
            if tf == 0:
                continue
            s += idf[t] * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl / avgdl))
        scores.append(s)
    return scores

def main():
    with open("fixture.json", encoding="utf-8") as f:
        fx = json.load(f)
    neighbors = fx["one_hop_neighbors"]
    question = fx["question"]

    print("=== PART 1: current machinery (predicate priority + object-id tiebreak, cap 8) ===")
    ordered = current_order(neighbors)
    for i, o in enumerate(ordered):
        mark = "  <-- SURVIVES" if i < MAX_RELATED else "  <-- DROPPED by slice(0, 8)"
        print(f"  rank {i:2d}: {o['id']}  ({o['predicate']}, prio {PREDICATE_PRIORITY[o['predicate']]})  {o['name']}{mark}")
    surviving = {o["id"] for o in ordered[:MAX_RELATED]}
    assert "pag-002" not in surviving, "fixture broken: financing page survived"
    print(f"\nQuestion: {question!r}")
    print("Relevant object: pag-002 'Financing Options' (the only object answering the question).")
    print("DEFECT DEMONSTRATED: pag-002 is dropped by the 8-cap. The composer never sees it,")
    print("so the ask path must refuse (noEvidenceAnswer) or answer from less-relevant objects,")
    print("even though the evidence exists in the authorized graph. Question-relevance plays no role.\n")

    print("=== PART 2: BM25-lite scorer applied BEFORE truncation ===")
    scores = bm25_scores(question, neighbors)
    ranked = sorted(zip(neighbors, scores), key=lambda p: (-p[1], PREDICATE_PRIORITY[p[0]["predicate"]], p[0]["id"]))
    for i, (o, s) in enumerate(ranked):
        print(f"  rank {i:2d}: {o['id']}  score={s:.4f}  {o['name']}")
    assert ranked[0][0]["id"] == "pag-002", "unexpected: financing page not top-ranked"
    kept = [o["id"] for o, _ in ranked[:MAX_RELATED]]
    assert "pag-002" in kept
    print("\nWith a rankRelatedByQuery(question, objects) step before slice(0, 8),")
    print("pag-002 survives the cap and reaches the composer. Mechanism resolves the fixture defect.")
    print("\nNOTE: this is defect proof on a fixture, not Q5 (no benchmark on real data)")
    print("and not proof of live-tenant occurrence (Q1 stays fixture-demonstrated).")

if __name__ == "__main__":
    sys.exit(main())
