#!/usr/bin/env node
// Crawlability check from the RAW HTML (what a crawler gets before any JS):
// status, redirects, robots, canonical, title, description, h1, text length.
// Usage: node scripts/check-page.mjs <url>
import { safeText, targetUrl } from './target-url.mjs';

if (!process.argv[2]) {
  console.error('Usage: node scripts/check-page.mjs <url>');
  process.exit(1);
}

let url;
try {
  url = targetUrl(process.argv[2]).href;
} catch (err) {
  console.error(`Refusing URL: ${safeText(err.message)}`);
  process.exit(1);
}

const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

// Plain indexOf scanning instead of regexes over whole documents: linear
// time however malformed the HTML is.
function elements(html, tag) {
  const lower = html.toLowerCase();
  const found = [];
  let from = 0;
  for (;;) {
    const start = lower.indexOf(`<${tag}`, from);
    if (start === -1) break;
    const next = lower[start + tag.length + 1];
    const openEnd = lower.indexOf('>', start);
    if (openEnd === -1) break;
    if (next !== '>' && next !== ' ' && next !== '\n' && next !== '\t') {
      from = start + 1;
      continue;
    }
    const close = lower.indexOf(`</${tag}>`, openEnd);
    if (close === -1) break;
    found.push({
      attrs: html.slice(start + tag.length + 1, openEnd),
      inner: html.slice(openEnd + 1, close),
      start,
      end: close + tag.length + 3,
    });
    from = close;
  }
  return found;
}

function removeElements(html, tag) {
  let out = '';
  let last = 0;
  for (const el of elements(html, tag)) {
    out += html.slice(last, el.start);
    last = el.end;
  }
  return out + html.slice(last);
}

function stripTags(html) {
  let out = '';
  let inTag = false;
  for (const ch of html) {
    if (ch === '<') inTag = true;
    else if (ch === '>' && inTag) {
      inTag = false;
      out += ' ';
    } else if (!inTag) out += ch;
  }
  return out;
}

// Single-line attribute lookups on a bounded string (one tag): safe regexes.
const attr = (tagAttrs, name) =>
  (tagAttrs.match(new RegExp(`\\b${name}="([^"]*)"`, 'i')) || [])[1] ?? null;

function metaContent(head, key, value) {
  const tag = elementsOpenOnly(head, 'meta').find((a) => attr(a, key) === value);
  return tag ? attr(tag, 'content') : null;
}

function elementsOpenOnly(html, tag) {
  const lower = html.toLowerCase();
  const found = [];
  let from = 0;
  for (;;) {
    const start = lower.indexOf(`<${tag}`, from);
    if (start === -1) break;
    const end = lower.indexOf('>', start);
    if (end === -1) break;
    found.push(html.slice(start + tag.length + 1, end));
    from = end;
  }
  return found;
}

// &amp; last, so "&amp;lt;" becomes the literal "&lt;" rather than "<".
const decode = (s) =>
  s
    ?.replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .trim() ?? null;

async function robotsAllows(target) {
  const { origin, pathname } = new URL(target);
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { 'User-Agent': UA } });
    if (!res.ok) return { status: res.status, allowed: true, sitemaps: [] };
    const txt = await res.text();
    const sitemaps = txt
      .split(/\r?\n/)
      .filter((l) => l.trim().toLowerCase().startsWith('sitemap:'))
      .map((l) => l.trim().slice('sitemap:'.length).trim());
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
      .filter(([, p]) => pathname.startsWith(p.includes('*') ? p.slice(0, p.indexOf('*')) : p))
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
  if (!(res.status >= 300 && res.status < 400 && loc)) break;
  try {
    current = targetUrl(loc, current).href;
  } catch (err) {
    hops.push({ url: safeText(loc), status: 'not followed', reason: safeText(err.message) });
    break;
  }
}

const html = await res.text();
const head = elements(html, 'head')[0]?.inner ?? '';
const bodyEl = elements(html, 'body')[0]?.inner ?? '';
const withoutCode = ['script', 'style', 'noscript'].reduce(removeElements, bodyEl);
const text = stripTags(withoutCode).split(/\s+/).join(' ').trim();
const htmlOpen = elementsOpenOnly(html, 'html')[0] ?? '';
const canonicalTag = elementsOpenOnly(head, 'link').find((a) => attr(a, 'rel') === 'canonical');

const report = {
  requested: url,
  finalUrl: current,
  redirects: hops,
  status: res.status,
  xRobotsTag: res.headers.get('x-robots-tag'),
  robotsTxt: await robotsAllows(current),
  htmlLang: attr(htmlOpen, 'lang'),
  titles: elements(head, 'title').map((t) => decode(t.inner)),
  metaDescription: decode(metaContent(head, 'name', 'description')),
  metaRobots: metaContent(head, 'name', 'robots'),
  canonical: canonicalTag ? attr(canonicalTag, 'href') : null,
  ogTitle: decode(metaContent(head, 'property', 'og:title')),
  h1: elements(html, 'h1').map((h) => decode(stripTags(h.inner).split(/\s+/).join(' '))),
  jsonLdBlocks: elements(html, 'script').filter((s) => attr(s.attrs, 'type') === 'application/ld+json')
    .length,
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

// JSON.stringify escapes control characters, so fetched text can't forge log lines.
console.log(JSON.stringify(report, null, 2));
