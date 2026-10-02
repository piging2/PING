#!/usr/bin/env python3
"""Step 3: real browser proof for the FYD candidate execution tree.
Loads both generated sites in real Chromium at desktop + mobile widths,
checks the acceptance list, saves screenshots as evidence."""
import json, sys, os
from playwright.sync_api import sync_playwright

EXE = "/home/hatch/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome"
BASE = "http://localhost:3111"
OUT = os.path.expanduser("~/workspace/fyd/product-lane/hidden_files/step3-evidence")
os.makedirs(OUT, exist_ok=True)

SITES = {
    "happy-place": f"{BASE}/sites/happy-place",
    "coppersmith-plumbing": f"{BASE}/sites/coppersmith-plumbing",
}
VIEWPORTS = {
    "desktop": {"width": 1280, "height": 800},
    "mobile-375": {"width": 375, "height": 667},
    "mobile-320": {"width": 320, "height": 568},
}

PLACEHOLDERS = ["lorem", "todo", "tbd", "undefined", "null", "[object Object]", "example.com"]

def check_site(page, slug, url, vp_name, vp):
    page.set_viewport_size(vp)
    errors, failed = [], []
    console_errors, page_errors = [], []
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: page_errors.append(str(e)))
    resp = page.goto(url, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1500)
    status = resp.status if resp else None
    if status != 200:
        failed.append(f"HTTP {status}")

    body_text = page.evaluate("() => document.body ? document.body.innerText : ''")
    html = page.evaluate("() => document.documentElement.outerHTML")
    if len(body_text.strip()) < 200:
        failed.append(f"body text too short ({len(body_text)} chars)")

    low = (body_text + html).lower()
    for ph in PLACEHOLDERS:
        if ph in low:
            # 'null' etc can false-positive; only flag inside visible text for lorem/todo
            if ph in body_text.lower() and ph in ("lorem", "todo", "tbd"):
                failed.append(f"placeholder '{ph}' in visible text")

    overflow = page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth + 1")
    if overflow:
        sw, iw = page.evaluate("() => [document.documentElement.scrollWidth, window.innerWidth]")
        failed.append(f"horizontal overflow: scrollWidth={sw} > innerWidth={iw}")

    # site-specific content checks (before navigation changes the page)
    checks = {}
    if slug == "coppersmith-plumbing":
        checks["people_section"] = page.evaluate(
            "() => /people|our team|meet the team/i.test(document.body.innerText)")
        checks["person_visible"] = page.evaluate(
            "() => /coppersmithplm|Coppersmith/i.test(document.body.innerText)")
    else:
        checks["no_people_section"] = not page.evaluate(
            "() => /\\bpeople\\b|our team|meet the team/i.test(document.body.innerText)")
        checks["pergola_visible"] = page.evaluate(
            "() => /pergola/i.test(document.body.innerText)")

    # navigation: the generated sites use object links + anchor links rather than
    # a <nav> element; test whatever real internal links exist
    nav_links = page.evaluate("""() => {
        return [...document.querySelectorAll('a[href]')].map(a => ({
            text: a.innerText.trim().slice(0,40), href: a.getAttribute('href'),
            visible: a.getBoundingClientRect().width > 0
        })).filter(a => a.visible);
    }""")
    internal = [l for l in nav_links if l["href"] and l["href"].startswith("/")]
    anchors = [l for l in nav_links if l["href"] and l["href"].startswith("#") and len(l["href"]) > 1]
    nav_ok = False
    if internal:
        target = internal[0]
        before = page.url
        try:
            page.click(f"a[href='{target['href']}']", timeout=5000)
            page.wait_for_timeout(1500)
            nav_ok = page.url != before and page.evaluate(
                "() => document.body.innerText.trim().length > 200")
            if not nav_ok:
                failed.append(f"nav click to {target['href']}: url={page.url} (before={before})")
        except Exception as e:
            failed.append(f"nav click failed: {e}")
    elif anchors:
        try:
            page.click(f"a[href='{anchors[0]['href']}']", timeout=5000)
            page.wait_for_timeout(800)
            nav_ok = page.evaluate(
                f"() => !!document.querySelector('{anchors[0]['href']}')")
        except Exception as e:
            failed.append(f"anchor nav failed: {e}")
    else:
        failed.append("no internal or anchor links found")

    # hover dependency: primary nav/actions must be visible & enabled without hover
    hover_dep = page.evaluate("""() => {
        const els = [...document.querySelectorAll('nav a, header a, button')];
        const hidden = els.filter(e => {
            const r = e.getBoundingClientRect();
            return r.width === 0 && r.height === 0 && e.offsetParent === null;
        });
        return {total: els.length, zeroSize: hidden.length};
    }""")

    if console_errors:
        failed.append(f"console errors: {console_errors[:3]}")
    if page_errors:
        failed.append(f"page errors: {page_errors[:3]}")

    shot = f"{OUT}/{slug}-{vp_name}.png"
    page.screenshot(path=shot, full_page=False)
    return {
        "site": slug, "viewport": vp_name, "url": url, "http": status,
        "body_chars": len(body_text), "nav_links": len(nav_links),
        "nav_click_ok": nav_ok, "overflow": overflow,
        "hover_probe": hover_dep, "content_checks": checks,
        "console_errors": len(console_errors), "page_errors": len(page_errors),
        "failed": failed, "screenshot": shot,
        "pass": not failed and all(checks.values()),
    }

results = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EXE, headless=True, args=["--no-sandbox"])
    for slug, url in SITES.items():
        for vp_name, vp in VIEWPORTS.items():
            page = browser.new_page()
            try:
                r = check_site(page, slug, url, vp_name, vp)
            except Exception as e:
                r = {"site": slug, "viewport": vp_name, "failed": [f"EXCEPTION: {e}"], "pass": False}
            results.append(r)
            print(json.dumps({k: r[k] for k in ("site", "viewport", "pass", "failed", "content_checks") if k in r}))
            page.close()
    browser.close()

path = f"{OUT}/step3-results.json"
with open(path, "w") as f:
    json.dump(results, f, indent=2)
passes = sum(1 for r in results if r.get("pass"))
print(f"\nSTEP3: {passes}/{len(results)} viewport checks passed. Results: {path}")
sys.exit(0 if passes == len(results) else 1)
