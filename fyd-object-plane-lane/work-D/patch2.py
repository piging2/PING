import io
p = "/home/nolan/accept-protocol.mjs"
s = io.open(p, encoding="utf-8").read()

old1 = """  const trig = page.locator('[data-testid="margin-object"][data-object-id="happy-place"] button[aria-label*="Expand to show"]');"""
new1 = """  const trig = page.locator('[data-testid="margin-object"][data-object-id="happy-place"] > button');"""
assert old1 in s, "pattern1 not found"
s = s.replace(old1, new1)

old2 = """  await trig.evaluate((b) => b.click());
  await page.waitForTimeout(300);
  await page.mouse.move(box.x + box.width / 2, box.y - 80);
  await page.waitForTimeout(1200); // > COLLAPSE_DELAY_MS (300)"""
new2 = """  await trig.evaluate((b) => b.click());
  await page.waitForTimeout(300);
  const dest = await page.evaluate(() => {
    const rc = (id) => {
      const el = document.querySelector('[data-testid="margin-object"][data-object-id="' + id + '"]');
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    };
    const cu = rc("coppersmith-plumbing");
    const w = window.innerWidth, h = window.innerHeight;
    const cands = [{ x: 60, y: 60 }, { x: w - 60, y: 60 }, { x: 60, y: h - 60 }, { x: w - 60, y: h - 60 }];
    const dist = (pt) => (cu ? Math.hypot(pt.x - cu.x, pt.y - cu.y) : 1e9);
    cands.sort((a, b2) => dist(b2) - dist(a));
    return { dest: cands[0], cu };
  });
  info("7: mouse destination (far from CU slot)", JSON.stringify(dest));
  await page.mouse.move(dest.dest.x, dest.dest.y);
  await page.waitForTimeout(1200); // > COLLAPSE_DELAY_MS (300)"""
assert old2 in s, "pattern2 not found"
s = s.replace(old2, new2)

io.open(p, "w", encoding="utf-8").write(s)
print("patched ok")
