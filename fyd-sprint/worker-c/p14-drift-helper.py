p = "src/fyd/object/owner-store.ts"
s = open(p).read()

old = """/**
 * Apply one owner command. `knownServiceIds` is the current full derived +
 * added id set; commands referencing unknown ids are rejected."""
new = """/**
 * Whether the source has drifted since the owner confirmed a field.
 * Derived per read, never persisted (same semantics as the correction
 * drift flag in owner-overlay.ts): the confirmed value still wins; drift
 * only flags that the source moved under the confirmation. Seam-local
 * primitive for the read pipeline to compose after digest verification.
 */
export function confirmationSourceDrifted(
  confirmation: FieldConfirmation,
  currentSourceValue: string | null,
): boolean {
  return currentSourceValue !== confirmation.sourceValue;
}

/**
 * Apply one owner command. `knownServiceIds` is the current full derived +
 * added id set; commands referencing unknown ids are rejected."""
assert old in s, "drift helper anchor"
s = s.replace(old, new)
open(p, "w").write(s)
print("drift helper added")
