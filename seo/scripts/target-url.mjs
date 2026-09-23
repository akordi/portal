// Both helpers only ever fetch our own site: the URL comes from the agent,
// so an unchecked one could point the request at an internal address.
// Competitor pages are read through Firecrawl instead. Extra hosts (e.g. a
// staging domain) can be allowed via SEO_ALLOWED_HOSTS=host1,host2.
const DEFAULT_HOSTS = ['www.akordi.lv', 'akordi.lv'];

export const allowedHosts = new Set([
  ...DEFAULT_HOSTS,
  ...(process.env.SEO_ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
]);

// Returns a URL rebuilt from an allow-listed origin, or throws.
export function targetUrl(input, base) {
  let parsed;
  try {
    parsed = new URL(input, base);
  } catch {
    throw new Error('not a valid URL');
  }
  if (parsed.protocol !== 'https:') throw new Error('only https URLs are allowed');
  const host = [...allowedHosts].find((h) => h === parsed.hostname.toLowerCase());
  if (!host) {
    throw new Error(`host not allowed (allowed: ${[...allowedHosts].join(', ')})`);
  }
  return new URL(`${parsed.pathname}${parsed.search}`, `https://${host}`);
}

// Strips control characters so nothing fetched can forge extra log lines.
export function safeText(value) {
  return String(value).replace(/[\u0000-\u001f\u007f]+/g, ' ');
}
