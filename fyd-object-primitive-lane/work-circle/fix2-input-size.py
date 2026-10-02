import sys
p = "/home/nolan/projects/ping/src/fyd/ui/ask-object-panel.tsx"
src = open(p).read()
old = '''          className={inputCls}
        />
        <button
          type="submit"'''
new = '''          className={compact ? compactInputCls : inputCls}
        />
        <button
          type="submit"'''
assert src.count(old) == 1, "anchor1"
src = src.replace(old, new)
old2 = '''  const submitCls = dark'''
new2 = '''  // Compact card: the ~300px oval leaves ~200px of input text area, but the
  // placeholder ("What do you want to know?") measures ~225px at text-base.
  // Slightly smaller text and tighter padding keep the full placeholder
  // visible; portal surfaces keep text-base.
  const compactInputCls = inputCls.replace("px-5", "px-4").replace("text-base", "text-sm");

  const submitCls = dark'''
assert src.count(old2) == 1, "anchor2"
src = src.replace(old2, new2)
open(p, "w").write(src)
print("OK")
