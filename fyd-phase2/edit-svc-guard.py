"""Fix services-branch hijacking in src/lib/ping/ask-composer.ts.

1. Compute asksProvenance early (before the services branch).
2. Guard the services branch:
   - a pure provenance question ("how do you know?") never enters via
     the broad "do" trigger;
   - a profile question about a service object ("tell me about this
     service") is answered from the service's own record, not a listing.
3. Remove the later duplicate asksProvenance definition.
"""
import sys

PATH = "/home/nolan/projects/ping/src/lib/ping/ask-composer.ts"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

edits = []

# --- 1. asksProvenance computed early, before profileIntent ---
old_prof = """    // explicit AND here: either word alone ("what services...") is not a
    // profile question.
    const asksWhatIs = hasWord(q, "what") && hasWord(q, "is");
"""
new_prof = """    // Provenance questions ("how do you know?") are identified early:
    // the services branch below must not claim them via its broad "do"
    // trigger. A provenance question is never a services question; a
    // combined question ("what services ... and how do you know?") still
    // reaches the services branch through an explicit services word.
    const asksProvenance =
      hasWord(q, "source", "sources", "sourcing", "provenance") ||
      (hasWord(q, "how") && hasWord(q, "know")) ||
      (hasWord(q, "where") && hasWord(q, "come") && hasWord(q, "from"));
    // explicit AND here: either word alone ("what services...") is not a
    // profile question.
    const asksWhatIs = hasWord(q, "what") && hasWord(q, "is");
"""
edits.append(("early-provenance", old_prof, new_prof))

# --- 2. guard the services branch ---
old_svc = """    if (hasWord(q, "service", "services", "offer", "offers", "provide", "do")) {
      const services = fieldOf(target, "services");
"""
new_svc = """    // A profile question about a service object ("tell me about this
    // service") is answered from the service's own record by the profile
    // branch above, not from a service listing.
    const targetIsService = target.schema.toLowerCase().includes("service");
    const asksServices =
      hasWord(q, "service", "services", "offer", "offers", "provide") ||
      (hasWord(q, "do") && !asksProvenance);
    if (asksServices && !(targetIsService && profileIntent)) {
      const services = fieldOf(target, "services");
"""
edits.append(("services-guard", old_svc, new_svc))

# --- 3. remove the later duplicate asksProvenance definition ---
old_dup = """    const asksProvenance =
      hasWord(q, "source", "sources", "sourcing", "provenance") ||
      (hasWord(q, "how") && hasWord(q, "know")) ||
      (hasWord(q, "where") && hasWord(q, "come") && hasWord(q, "from"));
    if (asksProvenance) {
"""
new_dup = """    if (asksProvenance) {
"""
edits.append(("dedup", old_dup, new_dup))

for name, old, new in edits:
    count = src.count(old)
    if count != 1:
        print(f"FATAL: edit {name}: found {count} occurrences (expected 1)")
        sys.exit(1)
    src = src.replace(old, new, 1)
    print(f"ok: {name}")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)
print("written", PATH)
