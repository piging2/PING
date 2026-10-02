#!/usr/bin/env node
// USAGE: node visitor-regression-check.mjs <url>
//   Fetches the visitor HTML for <url> and runs Nolan's explicit regression
//   list for the FYD template family. Each rule prints PASS or FAIL plus the
//   offending snippet. Exit code is 0 when every rule passes, 1 when any
//   rule fails, 2 on fetch/parse errors.
//   Example: node visitor-regression-check.mjs http://100.79.154.43:3100/sites/happy-place
//   Rules cover: dev/demo headings, section IDs (home:Hero:0), raw E.164
//   phones, phone duplication, empty Why-this lists, object IDs, digests,
//   journal/debug terminology, and owner/debug console markup in visitor DOM.
//   Intended gate for the 05:00 Coppersmith build: zero FAILs in visitor view.

const url = process.argv[2];
if (!url) {
  console.error('usage: node visitor-regression-check.mjs <url>');
  process.exit(2);
}

let html;
try {
  const res = await fetch(url, {
    headers: { 'user-agent': 'fyd-visitor-regression-check/1.0' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    console.error(`fetch failed: ${res.status} ${res.statusText}`);
    process.exit(2);
  }
  html = await res.text();
} catch (e) {
  console.error(`fetch error: ${e.message}`);
  process.exit(2);
}

// DOM-lite: visible text = HTML minus scripts, styles, comments, tags,
// with common entities decoded and whitespace collapsed.
function visibleText(h) {
  let t = h
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  t = t.replace(/<[^>]+>/g, ' ');
  t = t
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
  return t.replace(/\s+/g, ' ').trim();
}

const text = visibleText(html);

function snip(source, idx, len = 90) {
  const s = Math.max(0, idx - 40);
  return JSON.stringify(source.slice(s, idx + len).replace(/\s+/g, ' ').trim());
}

// Case-insensitive phrase search in visible text. Returns snippet strings.
function phrases(source, list) {
  const lower = source.toLowerCase();
  const out = [];
  for (const p of list) {
    let i = lower.indexOf(p);
    while (i !== -1) {
      out.push(`"${p}" :: ${snip(source, i, p.length + 50)}`);
      i = lower.indexOf(p, i + 1);
      if (out.length > 5) break;
    }
    if (out.length > 5) break;
  }
  return out;
}

function regexHits(source, re, label) {
  const out = [];
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let m;
  while ((m = g.exec(source)) !== null) {
    out.push(`${label || m[0]} :: ${snip(source, m.index, m[0].length + 50)}`);
    if (m[0].length === 0) g.lastIndex++;
    if (out.length > 5) break;
  }
  return out;
}

function normalizePhone(s) {
  const d = s.replace(/\D/g, '');
  return d.length === 11 && d[0] === '1' ? d.slice(1) : d;
}

const RULES = [
  {
    id: 'demo-headings',
    check: () => phrases(text, ['generated site demo', 'procedural clone proof']),
  },
  {
    id: 'dev-metadata-blocks',
    check: () => phrases(text, ['site record', 'website statement']),
  },
  {
    id: 'demo-owner-mode',
    check: () => phrases(text, ['demo owner mode']),
  },
  {
    id: 'section-ids',
    check: () => [
      ...regexHits(text, /[a-z][a-z0-9]*:[A-Z][A-Za-z0-9]*:\d+/, 'section-id'),
      ...regexHits(html, /[a-z][a-z0-9]*:[A-Z][A-Za-z0-9]*:\d+/, 'section-id'),
    ],
  },
  {
    id: 'raw-e164',
    check: () => regexHits(text, /\+1\d{10}/, 'raw-e164'),
  },
  {
    id: 'phone-duplication',
    check: () => {
      const hits = text.match(/\+1\d{10}|\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/g) || [];
      const counts = new Map();
      for (const h of hits) {
        const n = normalizePhone(h);
        if (n.length !== 10) continue;
        if (!counts.has(n)) counts.set(n, []);
        counts.get(n).push(h);
      }
      const out = [];
      for (const [n, arr] of counts) {
        if (arr.length >= 3) out.push(`phone ${n} appears ${arr.length}x :: ${JSON.stringify(arr.slice(0, 4).join(' | '))}`);
      }
      return out;
    },
  },
  {
    id: 'empty-whythis-lists',
    check: () => {
      const out = regexHits(html, /<(ol|ul)(\s[^>]*)?>\s*<\/\1>/i, 'empty-list');
      const whyCount = (text.match(/why this\?/gi) || []).length;
      if (whyCount > 3) out.push(`"Why this?" repeated ${whyCount}x (chrome, not trust UI)`);
      return out;
    },
  },
  {
    id: 'object-ids',
    check: () => [
      ...regexHits(text, /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i, 'uuid'),
      ...regexHits(text, /\bobj_[A-Za-z0-9_-]+/, 'obj_-id'),
      ...regexHits(text, /\/(objects?|graph|nodes?)\/[A-Za-z0-9_-]+/, 'object-route'),
    ],
  },
  {
    id: 'digests',
    check: () => {
      // Strip URLs (same-length spaces keep indices aligned): blob-storage
      // content hashes inside media URLs are not spec/base digests.
      const noUrls = text.replace(/https?:\/\/\S+/g, (m) => ' '.repeat(m.length));
      return [
        ...phrases(text, ['spec digest', 'base digest']),
        ...regexHits(noUrls, /\b[0-9a-f]{32,64}\b/i, 'hex-digest'),
      ];
    },
  },
  {
    id: 'journal-terminology',
    check: () => phrases(text, [
      'capability evaluation',
      'unresolved directive',
      'acceptance sequence',
      'object rail',
      'seed actor',
      'journal event',
      'event id',
      'claim classification',
    ]).concat(regexHits(text, /\bjournal\b/i, 'journal')),
  },
  {
    id: 'owner-debug-dom',
    check: () => [
      ...regexHits(html, /(id|class|data-testid|data-debug)\s*=\s*"[^"]*(debug|devtools|inspector|owner-console|acceptance-harness)[^"]*"/i, 'debug-attr'),
      ...phrases(text, ['owner console', 'debug console', 'proposal digest']),
    ],
  },
];

const results = RULES.map((rule) => ({ id: rule.id, fails: rule.check() }));

console.log(`visitor-regression-check ${url}`);
console.log(`html ${html.length} bytes, visible text ${text.length} chars, ${RULES.length} rules`);
let nfail = 0;
for (const r of results) {
  if (r.fails.length === 0) {
    console.log(`PASS ${r.id}`);
  } else {
    nfail++;
    for (const s of r.fails.slice(0, 3)) console.log(`FAIL ${r.id} :: ${s}`);
    if (r.fails.length > 3) console.log(`     ... +${r.fails.length - 3} more`);
  }
}
console.log(nfail === 0 ? 'RESULT: ALL PASS' : `RESULT: ${nfail} RULE(S) FAILED`);
process.exitCode = nfail === 0 ? 0 : 1;
