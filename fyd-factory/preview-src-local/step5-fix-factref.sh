#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
F="$WT/src/fyd/owner-mode/facts.ts"

cp "$F" "$F.orig"

python3 << 'PYEOF'
path = "/home/nolan/fyd-preview-wt/src/fyd/owner-mode/facts.ts"
with open(path) as f:
    src = f.read()

# Find the SiteFact interface and add FactRef after it
old = """export interface SiteFact {
  factId: string;
  objectId: string;
  field: string;
  /** Element index inside an array-valued field; 0 for scalar fields. */
  index: number;
  value: string;
  kind: FactKind;"""

new = """export interface SiteFact {
  factId: string;
  objectId: string;
  field: string;
  /** Element index inside an array-valued field; 0 for scalar fields. */
  index: number;
  value: string;
  kind: FactKind;

/**
 * Reference to a specific fact (object + field + optional array index).
 * Used by DraftContext.currentFactRef to bind "this" in owner commands.
 * MAIN-REPO FINDING: this type exists in the newer lane code but was missing
 * from the copied facts.ts; added here for type compatibility.
 */
export interface FactRef {
  objectId: string;
  field: string;
  index?: number;
}"""

# Actually, we need to be careful - let's just append after the SiteFact interface closes
# Find where SiteFact interface ends (the closing brace before "/** Deterministic fact id")
old_anchor = """  /** Set by applyCorrections when the owner CONFIRMs this exact value. */
  ownerConfirmation?: {
    owner: string;
    assertedAt: string;
  };
}"""

new_anchor = """  /** Set by applyCorrections when the owner CONFIRMs this exact value. */
  ownerConfirmation?: {
    owner: string;
    assertedAt: string;
  };
}

/**
 * Reference to a specific fact (object + field + optional array index).
 * Used by DraftContext.currentFactRef to bind "this" in owner commands.
 * MAIN-REPO FINDING: this type exists in the newer lane code but was missing
 * from the copied facts.ts; added here for type compatibility.
 */
export interface FactRef {
  objectId: string;
  field: string;
  index?: number;
}"""

assert old_anchor in src, "SiteFact closing anchor not found"
src = src.replace(old_anchor, new_anchor, 1)

with open(path, "w") as f:
    f.write(src)

print("FactRef type added to facts.ts")
PYEOF

echo "=== diff ==="
diff "$F.orig" "$F"
