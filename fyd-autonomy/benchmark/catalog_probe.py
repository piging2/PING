#!/usr/bin/env python3
"""No-spend catalog probe: list :free variants and deepseek entries."""
import run_openrouter_pig as r

key = r.load_key()
models = r.api_get(key, "/models")["data"]
free = sorted(m["id"] for m in models if m["id"].endswith(":free"))
ds = sorted(m["id"] for m in models if "deepseek" in m["id"].lower())
print("FREE_COUNT:", len(free))
for m in free[:25]:
    print("FREE:", m)
print("DEEPSEEK_COUNT:", len(ds))
for m in ds[:15]:
    print("DS:", m)
