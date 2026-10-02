#!/usr/bin/env python3
"""Test authority_search and lineage_search with new data."""
import sys, json, subprocess

# Test authority_search
p = subprocess.run(['python', '/app/runtime/tools/authority_search.py'],
    input=json.dumps({'query': 'constitution'}), capture_output=True, text=True)
try:
    r = json.loads(p.stdout)
    print("=== AUTHORITY SEARCH ===")
    print(f"Highest: {r['highest_authority'].get('title','?')}")
    print(f"Authority class: {r['authority_class']}")
    print(f"Verified overall: {r['verification']['overall']}")
    print(f"Chain length: {len(r['authority_chain'])}")
    for a in r['authority_chain'][:3]:
        print(f"  - {a.get('title','?'):30s} class={a.get('authority_class','?'):25s} verified={a.get('verification',{}).get('overall')}")
except Exception as e:
    print(f"Authority search failed: {e}")
    print(f"Stdout: {p.stdout[:500]}")
    print(f"Stderr: {p.stderr[:500]}")

# Test authority_search with Postgres match
p2 = subprocess.run(['python', '/app/runtime/tools/authority_search.py'],
    input=json.dumps({'query': 'Test Document'}), capture_output=True, text=True)
try:
    r2 = json.loads(p2.stdout)
    print("\n=== POSTGRES MATCH ===")
    print(f"Highest: {r2['highest_authority'].get('title','?')} (class={r2['authority_class']}, verified={r2['verification']['overall']})")
except Exception as e:
    print(f"Postgres search failed: {e}")
