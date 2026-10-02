"""Surgical edit: add initialQuestion to AskObjectPanel (FYD grill lane)."""
from pathlib import Path

p = Path("/home/nolan/projects/ping/src/fyd/ui/ask-object-panel.tsx")
s = p.read_text()
orig = s

s = s.replace(
    'import { useState } from "react";',
    'import { useEffect, useRef, useState } from "react";',
    1,
)
s = s.replace(
    "  pageContext,\n}: {",
    "  pageContext,\n  initialQuestion,\n}: {",
    1,
)
s = s.replace(
    "  pageContext?: AskPageContext;\n}) {",
    "  pageContext?: AskPageContext;\n"
    "  /** A question engaged from the peek: asked once automatically on mount\n"
    "   * so the workspace opens mid-conversation. */\n"
    "  initialQuestion?: string;\n}) {",
    1,
)
s = s.replace(
    '  const busy = status === "loading";\n',
    '  const busy = status === "loading";\n'
    "\n"
    "  // A peek-engaged question starts the conversation on mount. Once only:\n"
    "  // re-renders must not re-ask.\n"
    "  const initialAskedRef = useRef(false);\n"
    "  useEffect(() => {\n"
    "    if (initialAskedRef.current) return;\n"
    '    const q = (initialQuestion ?? "").trim();\n'
    "    if (q.length === 0) return;\n"
    "    initialAskedRef.current = true;\n"
    "    void ask(q);\n"
    "  }, [initialQuestion]);\n",
    1,
)
checks = [
    'import { useEffect, useRef, useState } from "react";',
    "  pageContext,\n  initialQuestion,\n}: {",
    "  initialQuestion?: string;",
    "const initialAskedRef = useRef(false);",
    "void ask(q);",
]
for c in checks:
    assert c in s, f"missing: {c[:40]}"
p.write_text(s)
print("ask-object-panel edit applied OK")
