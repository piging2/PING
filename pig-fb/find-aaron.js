#!/usr/bin/env node
// find-aaron.js -- READ-ONLY profile verification for Aaron Chalfant / Jack of All Junction.
// Connects to the Pig's headed Facebook Chrome (CDP :9223), searches for the
// person and the business, and reports candidates with names, subtitles, and
// profile URLs. NEVER sends messages, clicks Message buttons, or logs out.
const { chromium } = require('playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const out = { candidates: [], errors: [] };
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  } catch (e) {
    out.errors.push('CDP connect failed: ' + String(e.message || e).slice(0, 200));
    console.log(JSON.stringify(out));
    process.exit(1);
  }
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];

  async function searchPeople(query) {
    const page = await ctx.newPage();
    try {
      await page.goto('https://www.facebook.com/search/people/?q=' + encodeURIComponent(query),
        { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(6000);
      const results = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('a[href]').forEach(a => {
          const href = a.getAttribute('href') || '';
          const m = href.match(/facebook\.com\/([^/?#]+)/);
          if (!m) return;
          const slug = m[1];
          if (['search', 'groups', 'pages', 'watch', 'marketplace', 'events'].includes(slug)) return;
          const text = (a.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 200);
          if (!text) return;
          out.push({ name: text.split('\n')[0], url: 'https://www.facebook.com/' + slug, slug });
        });
        // dedupe by slug
        const seen = new Set();
        return out.filter(r => !seen.has(r.slug) && seen.add(r.slug)).slice(0, 15);
      });
      return results;
    } catch (e) {
      out.errors.push('search failed for "' + query + '": ' + String(e.message || e).slice(0, 150));
      return [];
    } finally {
      await page.close();
    }
  }

  async function searchPages(query) {
    const page = await ctx.newPage();
    try {
      await page.goto('https://www.facebook.com/search/pages/?q=' + encodeURIComponent(query),
        { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(6000);
      const results = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('a[href]').forEach(a => {
          const href = a.getAttribute('href') || '';
          const m = href.match(/facebook\.com\/([^/?#]+)/);
          if (!m) return;
          const slug = m[1];
          if (['search', 'groups', 'pages', 'watch', 'marketplace', 'events'].includes(slug)) return;
          const text = (a.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 200);
          if (!text) return;
          out.push({ name: text.split('\n')[0], url: 'https://www.facebook.com/' + slug, slug });
        });
        const seen = new Set();
        return out.filter(r => !seen.has(r.slug) && seen.add(r.slug)).slice(0, 15);
      });
      return results;
    } catch (e) {
      out.errors.push('page search failed for "' + query + '": ' + String(e.message || e).slice(0, 150));
      return [];
    } finally {
      await page.close();
    }
  }

  const people = await searchPeople('Aaron Chalfant');
  out.candidates.push(...people.map(p => ({ ...p, type: 'people-search' })));
  const pages = await searchPages('Jack of All Junction');
  out.candidates.push(...pages.map(p => ({ ...p, type: 'page-search' })));

  // For the top people-search hit matching "Chalfant", open the profile and
  // check intro/location + whether a Message button exists (read-only check).
  const chalfant = people.find(p => /chalfant/i.test(p.name));
  if (chalfant) {
    const page = await ctx.newPage();
    try {
      await page.goto(chalfant.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(6000);
      const info = await page.evaluate(() => {
        const body = document.body.innerText.slice(0, 3000);
        const msgBtn = Array.from(document.querySelectorAll('[role="button"], a'))
          .some(el => /^(Message|Send message)$/i.test((el.innerText || '').trim()));
        return { snippet: body.replace(/\s+/g, ' ').slice(0, 600), hasMessageButton: msgBtn };
      });
      out.profile_check = { url: chalfant.url, name: chalfant.name, ...info };
    } catch (e) {
      out.errors.push('profile check failed: ' + String(e.message || e).slice(0, 150));
    } finally {
      await page.close();
    }
  }

  // Do NOT close the browser; it must stay running.
  console.log(JSON.stringify(out, null, 1));
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
