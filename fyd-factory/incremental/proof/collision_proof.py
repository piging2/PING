#!/usr/bin/env python3
"""
LANE-INCREMENTAL proof harness (part 3): adversarial digest-collision probe.

Reproduces the CLASS of attack in LANE-CLAIM finding H8 (CLAIM-VERDICT.md):
a 32-bit digest is not a semantic identity. We brute-force a real 32-bit
collision over phone-like fact strings, then show the mandated >=256-bit
digest (SHA-256 over canonical JSON) distinguishes the colliding pair.

If a 32-bit collision is found in seconds, any 32-bit content addressing in
the incremental layer would be broken by construction.
"""
import hashlib, time, json

def d32(s: str) -> str:
    """32-bit digest: low 32 bits of sha256, hex. The H8-broken construction."""
    return hashlib.sha256(s.encode()).hexdigest()[:8]

def d256_fact(s: str) -> str:
    """The mandated construction: SHA-256 over canonical JSON of the fact."""
    canon = json.dumps({"fact": s}, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canon.encode()).hexdigest()

def main():
    t0 = time.time()
    seen = {}
    collision = None
    i = 0
    while True:
        s = f"555-{i:05d}"
        h = d32(s)
        if h in seen and seen[h] != s:
            collision = (seen[h], s, h)
            break
        seen[h] = s
        i += 1
    dt = time.time() - t0
    a, b, h = collision
    print(f"32-BIT COLLISION: '{a}' and '{b}' -> digest {h}")
    print(f"  found after {i} hashes in {dt:.2f}s")
    da, db = d256_fact(a), d256_fact(b)
    print(f"  sha256(canonical({a!r})) = {da[:16]}...")
    print(f"  sha256(canonical({b!r})) = {db[:16]}...")
    assert da != db, "256-bit digests must distinguish the pair"
    print("  256-bit digests DIFFER: the mandated construction resists the H8 attack")
    # birthday bound note: expected ~2^16 = 65536 hashes for a 32-bit collision
    print(f"  (birthday expectation for 32 bits is ~65k hashes; observed {i})")
    with open("/home/hatch/workspace/fyd-factory/incremental/proof/collision-result.json", "w") as f:
        json.dump({"d32": h, "factA": a, "factB": b, "hashes": i,
                   "seconds": round(dt, 2),
                   "sha256A": da, "sha256B": db, "distinguished": da != db},
                  f, indent=1)

if __name__ == "__main__":
    main()
