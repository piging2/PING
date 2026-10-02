import io
p = "/home/nolan/accept-protocol.mjs"
s = io.open(p, encoding="utf-8").read()
old = """  const regs = await page.evaluate(() => {
    const layer = document.querySelector('[data-testid="object-layer"]');
    const els = window.__scrollEls || [];
    return {
      onLayer: els.filter((el) => layer && layer.contains(el)).map((el) => el.tagName || "?"),
      onWindow: els.filter((el) => el === window).length,
      onDocument: els.filter((el) => el === document).length,
      other: els.filter((el) => el !== window && el !== document && !(layer && layer.contains(el))).map((el) => (el.tagName || "?").slice(0, 24)),
    };
  });"""
new = """  const regs = await page.evaluate(() => {
    const layer = document.querySelector('[data-testid="object-layer"]');
    const els = window.__scrollEls || [];
    const isNode = (el) => { try { return el instanceof Node; } catch (e) { return false; } };
    const inLayer = (el) => isNode(el) && !!layer && layer.contains(el);
    const tag = (el) => { try { return el.tagName || Object.prototype.toString.call(el); } catch (e) { return "?"; } };
    return {
      onLayer: els.filter(inLayer).map(tag),
      onWindow: els.filter((el) => el === window).length,
      onDocument: els.filter((el) => el === document).length,
      other: els.filter((el) => el !== window && el !== document && !inLayer(el)).map((el) => String(tag(el)).slice(0, 40)),
    };
  });"""
assert old in s, "pattern not found"
s = s.replace(old, new)
io.open(p, "w", encoding="utf-8").write(s)
print("patched ok")
