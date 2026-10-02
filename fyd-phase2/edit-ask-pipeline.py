"""Phase 2 edits for src/app/api/fyd/ask/ask-pipeline.ts.

1. Docstring body contract gains objectId.
2. Parse optional objectId, pass through to answerAskFyd.
3. Map unknown_object -> 404.
"""
import sys

PATH = "/home/nolan/projects/ping/src/app/api/fyd/ask/ask-pipeline.ts"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

edits = []

# --- 1. docstring ---
old_doc = """ * The legacy flat POST /api/fyd/ask keeps its body contract ({ siteId,
 * question, mode }) but now constructs the TenantContext server-side from
"""
new_doc = """ * The legacy flat POST /api/fyd/ask keeps its body contract ({ siteId,
 * objectId?, question, mode }) but now constructs the TenantContext
 * server-side from
"""
edits.append(("docstring", old_doc, new_doc))

# --- 1b. document object scoping after the tenant-mismatch paragraph ---
old_obj = """ * Visitor vs owner scope: mode "visitor" (default) answers from PUBLIC
"""
new_obj = """ * Object-scoped ask: the optional body objectId selects the target
 * object INSIDE the route tenant's public graph; the tenant is still
 * chosen by the route path (or the validated body siteId on the legacy
 * flat route), never by objectId. Unknown ids -> 404 unknown_object;
 * non-public objects never enter the public graph, so they fail closed
 * the same way. objectId is object identity only, never a tenant key.
 *
 * Visitor vs owner scope: mode \\"visitor\\" (default) answers from PUBLIC
"""
edits.append(("object-scope-doc", old_obj, new_obj))

# --- 2. parse + pass objectId ---
old_call = """  const question = typeof record.question === "string" ? record.question : "";
  const mode = record.mode === undefined ? "visitor" : record.mode;
"""
new_call = """  const question = typeof record.question === "string" ? record.question : "";
  const rawObjectId = typeof record.objectId === "string" ? record.objectId.trim() : "";
  const mode = record.mode === undefined ? "visitor" : record.mode;
"""
edits.append(("parse-objectId", old_call, new_call))

old_call2 = """    outcome = answerAskFyd({ siteId, question, mode: mode as AskFydMode }, ASK_DEPS);
"""
new_call2 = """    outcome = answerAskFyd(
      {
        siteId,
        objectId: rawObjectId.length > 0 ? rawObjectId : undefined,
        question,
        mode: mode as AskFydMode,
      },
      ASK_DEPS,
    );
"""
edits.append(("pass-objectId", old_call2, new_call2))

# --- 3. 404 mapping ---
old_map = """      case "projection_unavailable":
"""
new_map = """      case "unknown_object":
        return NextResponse.json({ ok: false, error: outcome.error.message }, { status: 404 });
      case "projection_unavailable":
"""
edits.append(("404", old_map, new_map))

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
