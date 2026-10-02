/**
 * FYD mobile-overflow instrumentation (FL-20260921-033).
 *
 * Run at 375px viewport in the browser console (or via CDP evaluate) on
 * the composed demo page (/sites/happy-place, /sites/coppersmith-plumbing).
 *
 * Walks from the hero h1 up to <html>, capturing per-ancestor:
 *   tag, classes, display, computed width/min-width/max-width,
 *   clientWidth, scrollWidth, offsetWidth, flex-basis, flex-shrink,
 *   grid template tracks, white-space, overflow-wrap, position, transform.
 *
 * Verdict rule: the FIRST ancestor (closest to the hero text) where
 * scrollWidth > clientWidth, or whose intrinsic min-content exceeds the
 * containing width, OWNS the bug. Only that element may receive a
 * min-width:0 / min-inline-size:0 (flex/grid child) or minmax(0,1fr)
 * (grid track) fix. Do not apply CSS blindly.
 *
 * Usage (console):
 *   copy the function below, paste, then call:
 *     fydOverflowTrace()
 *   Optionally start from a different element:
 *     fydOverflowTrace(document.querySelector('main'))
 */
function fydOverflowTrace(startEl) {
  var start = startEl || document.querySelector("main h1") || document.querySelector("h1") || document.body;
  var rows = [];
  var el = start;
  while (el && el !== document.documentElement.parentNode) {
    var cs = window.getComputedStyle(el);
    var row = {
      tag: el.tagName ? el.tagName.toLowerCase() : "?",
      id: el.id || "",
      classes: el.className && el.className.baseVal !== undefined ? el.className.baseVal : String(el.className || ""),
      display: cs.display,
      position: cs.position,
      width: cs.width,
      minWidth: cs.minWidth,
      maxWidth: cs.maxWidth,
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      offsetWidth: el.offsetWidth,
      flexBasis: cs.flexBasis,
      flexShrink: cs.flexShrink,
      gridTemplateColumns: cs.gridTemplateColumns,
      whiteSpace: cs.whiteSpace,
      overflowWrap: cs.overflowWrap,
      overflowX: cs.overflowX,
      transform: cs.transform,
      overflows: el.scrollWidth > el.clientWidth,
    };
    rows.push(row);
    if (el === document.documentElement) break;
    el = el.parentElement;
  }
  // Verdict: first ancestor (nearest the hero text) that overflows.
  var owner = null;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].overflows) { owner = { depth: i, row: rows[i] }; break; }
  }
  console.log("=== FYD overflow trace (" + rows.length + " ancestors) ===");
  console.table(rows.map(function (r, i) {
    return {
      depth: i,
      el: r.tag + (r.id ? "#" + r.id : "") + (r.classes ? "." + String(r.classes).split(/\s+/).slice(0, 4).join(".") : ""),
      display: r.display,
      width: r.width,
      minWidth: r.minWidth,
      clientW: r.clientWidth,
      scrollW: r.scrollWidth,
      flexShrink: r.flexShrink,
      ws: r.whiteSpace,
      overflows: r.overflows ? "YES <--" : "",
    };
  }));
  if (owner) {
    console.log("%cOVERFLOW OWNER at depth " + owner.depth + ":",
      "font-weight:bold;color:red",
      owner.row.tag,
      owner.row.classes);
    console.log("Full owner row:", owner.row);
  } else {
    console.log("%cNo ancestor overflows: document.scrollWidth=" +
      document.documentElement.scrollWidth +
      " vs viewport=" + window.innerWidth,
      "font-weight:bold;color:green");
  }
  return { rows: rows, owner: owner };
}
