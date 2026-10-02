# Note 04 — Website technical markers (verified live 2026-09-09)
HTML head captured via real browser get_html (truncated at 12KiB, page rendered was /about/):
- `<!DOCTYPE html><html lang="en-US">`, `<meta name="robots" content="max-image-preview:large">`
- `<link rel="alternate" type="application/rss+xml" title="Monument View Coffee » Feed" href="https://monumentviewcoffee.com/feed/">`
- oEmbed links: `https://monumentviewcoffee.com/wp-json/oembed/1.0/embed?url=...`
- Inline CSS ids: `wp-img-auto-sizes-contain-inline-css`, `wp-emoji-styles-inline-css`, `classic-theme-styles-inline-css` referencing `/wp-includes/css/classic-themes.min.css`, `global-styles-inline-css` (Gutenberg block editor CSS variables)
=> CONFIRMED: self-hosted WordPress (wp-includes, wp-json REST API, RSS feeds), Gutenberg block-built content, theme "Coffee Shop: Cafe" (footer credit, description="WordPress Coffee Shop: Cafe Theme").
- No generator meta tag visible in captured head portion; no e-commerce/ordering plugin scripts visible in head portion (truncated); no visible loyalty/booking widgets anywhere on the three pages.
- Hosting/registrar/developer credits: NOT discoverable from the public pages (no "powered by" host footer, no developer credit). UNKNOWN.
