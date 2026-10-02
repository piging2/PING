#!/bin/bash
set -e
cd /home/nolan/projects/ping
python3 << 'PYEOF'
import sys
T = "src/fyd/ui/__tests__/placement.test.ts"
src = open(T).read()
old = """      // glyph rect stays inside the viewport and clear of center (center
      // column is [208, 1072] at 1280px: max-w-5xl centered)
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + 40).toBeLessThanOrEqual(1280);
      if (p.rail === "right") expect(x).toBeGreaterThanOrEqual(1072);
      else expect(x + 40).toBeLessThanOrEqual(208);"""
new = """      // glyph rect stays inside the viewport and clear of center (center
      // column is [128, 1152] at 1280px: max-w-5xl centered)
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + 40).toBeLessThanOrEqual(1280);
      if (p.rail === "right") expect(x).toBeGreaterThanOrEqual(1152);
      else expect(x + 40).toBeLessThanOrEqual(128);"""
assert src.count(old) == 1
open(T, "w").write(src.replace(old, new, 1))
print("test numbers fixed")
PYEOF
echo "exit: $?"