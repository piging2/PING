p = "/home/nolan/ping/runtime/constitutional/src/ping-vocabulary.test.ts"
s = open(p).read()

old = """  test('no negative predicates exist anywhere (revocation is status inactive)', () => {
    for (const p of [...CANONICAL_PREDICATES, ...FORBIDDEN_PREDICATES]) {
      expect(p.startsWith('un')).toBe(false);
    }
    expect(isCanonicalPredicate('unfollows')).toBe(false);
    expect(isCanonicalPredicate('unlikes')).toBe(false);
  });"""

new = """  test('no negative predicates exist anywhere (revocation is status inactive)', () => {
    // The canonical set contains no 'un-*' negative predicates; the only
    // 'un-*' strings in the vocabulary are the explicitly forbidden ones,
    // which are never canonical.
    for (const p of CANONICAL_PREDICATES) {
      expect(p.startsWith('un')).toBe(false);
    }
    for (const p of FORBIDDEN_PREDICATES) {
      expect(isCanonicalPredicate(p)).toBe(false);
      expect(isKnowledgePredicate(p)).toBe(false);
      expect(isSocialPredicate(p)).toBe(false);
    }
    expect(isCanonicalPredicate('unfollows')).toBe(false);
    expect(isCanonicalPredicate('unlikes')).toBe(false);
  });"""

assert old in s, "negative-predicate test not found"
s = s.replace(old, new)
open(p, "w").write(s)
print("fixed")
