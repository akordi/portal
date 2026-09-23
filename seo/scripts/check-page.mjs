#!/usr/bin/env node
// Crawlability check from the RAW HTML (what a crawler gets before any JS):
// status, redirects, robots, canonical, title, description, h1, text length.
// Usage: node scripts/check-page.mjs <url>

const url = process.argv[2];
if (!url) {
  console.error('Usage: node scripts/check-page.mjs <url>');
  process.exit(1);
}

const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const first = (html, re) => (html.match(re) || [])[1]?.trim() ?? null;
const all = (html, re) => [...html.matchAll(re)].map((m) => m[1].trim());
const decode = (s) =>
  s
    ?.replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>') ?? null;

async function robotsAllows(target) {
  const { origin, pathname } = new URL(target);
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { 'User-Agent': UA } });
    if (!res.ok) return { status: res.status, allowed: true, sitemaps: [] };
    const txt = await res.text();
    const sitemaps = all(txt, /^sitemap:\s*(\S+)/gim);
    // Minimal parser: rules in groups for "*" or "googlebot"; longest match wins.
    let applies = false;
    const rules = [];
    for (const line of txt.split(/\r?\n/)) {
      const [key, ...rest] = line.split(':');
      const value = rest.join(':').trim();
      const k = key.trim().toLowerCase();
      if (k === 'user-agent') applies = ['*', 'googlebot'].includes(value.toLowerCase());
      else if (applies && (k === 'allow' || k === 'disallow') && value) rules.push([k, value]);
    }
    const match = rules
      .filter(([, p]) => pathname.startsWith(p.replace(/\*.*$/, '')))
      .sort((a, b) => b[1].length - a[1].length)[0];
    return { status: res.status, allowed: !match || match[0] === 'allow', sitemaps };
  } catch (err) {
    return { error: String(err), allowed: true, sitemaps: [] };
  }
}

const hops = [];
let current = url;
let res;
for (let i = 0; i < 10; i += 1) {
  res = await fetch(current, { redirect: 'manual', headers: { 'User-Agent': UA } });
  hops.push({ url: current, status: res.status });
  const loc = res.headers.get('location');
  if (res.status >= 300 && res.status < 400 && loc) current = new URL(loc, current).href;
  else break;
}

const html = await res.text();
// Only <head> counts for <title> — inline SVG icons carry their own <title>.
const head = first(html, /<head[^>]*>([\s\S]*?)<\/head>/i) ?? '';
const body = first(html, /<body[^>]*>([\s\S]*)<\/body>/i) ?? '';
const text = body
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const report = {
  requested: url,
  finalUrl: current,
  redirects: hops,
  status: res.status,
  xRobotsTag: res.headers.get('x-robots-tag'),
  robotsTxt: await robotsAllows(current),
  htmlLang: first(html, /<html[^>]*\slang="([^"]*)"/i),
  titles: all(head, /<title[^>]*>([^<]*)<\/title>/gi).map(decode),
  metaDescription: decode(first(html, /<meta\s+name="description"\s+content="([^"]*)"/i)),
  metaRobots: first(html, /<meta\s+name="robots"\s+content="([^"]*)"/i),
  canonical: first(html, /<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i),
  ogTitle: decode(first(html, /<meta\s+property="og:title"\s+content="([^"]*)"/i)),
  h1: all(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi).map((h) => decode(h.replace(/<[^>]+>/g, '').trim())),
  jsonLdBlocks: all(html, /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi).length,
  indexableTextChars: text.length,
  textSample: text.slice(0, 300),
};

report.warnings = [
  report.status !== 200 && `status ${report.status}`,
  !report.robotsTxt.allowed && 'blocked by robots.txt',
  /noindex/i.test(`${report.metaRobots} ${report.xRobotsTag}`) && 'noindex',
  report.titles.length !== 1 && `${report.titles.length} <title> elements`,
  !report.metaDescription && 'no meta description',
  !report.canonical && 'no canonical',
  report.canonical && report.canonical !== report.finalUrl && `canonical points elsewhere: ${report.canonical}`,
  report.h1.length === 0 && 'no <h1> in raw HTML',
  report.indexableTextChars < 500 && 'little or no text in raw HTML (client-rendered only?)',
].filter(Boolean);

console.log(JSON.stringify(report, null, 2));
