#!/usr/bin/env node
// PageSpeed Insights summary: Core Web Vitals (field data when Google has it)
// plus failing Lighthouse audits that cost meaningful time.
// Usage: node scripts/pagespeed.mjs <url> [mobile|desktop]
// Needs PAGESPEED_API_KEY: anonymous quota is often 0/day.
import { safeText, targetUrl } from './target-url.mjs';

const [input, strategyArg = 'mobile'] = process.argv.slice(2);
if (!input) {
  console.error('Usage: node scripts/pagespeed.mjs <url> [mobile|desktop]');
  process.exit(1);
}

let url;
try {
  url = targetUrl(input).href;
} catch (err) {
  console.error(`Refusing URL: ${safeText(err.message)}`);
  process.exit(1);
}
const strategy = strategyArg === 'desktop' ? 'desktop' : 'mobile';

const api = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
api.searchParams.set('url', url);
api.searchParams.set('strategy', strategy);
api.searchParams.append('category', 'performance');
api.searchParams.append('category', 'seo');
if (process.env.PAGESPEED_API_KEY) api.searchParams.set('key', process.env.PAGESPEED_API_KEY);

const res = await fetch(api);
const data = await res.json();
if (!res.ok) {
  console.error(`PageSpeed API error ${res.status}: ${safeText(data.error?.message ?? 'unknown')}`);
  process.exit(1);
}

const lh = data.lighthouseResult;
const field = data.loadingExperience?.metrics ?? {};
const fieldMetric = (key) =>
  field[key] ? { p75: field[key].percentile, category: field[key].category } : 'no field data';

const failing = Object.values(lh.audits)
  .filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative')
  .map((a) => ({
    id: a.id,
    title: a.title,
    score: a.score,
    savingsMs: a.details?.overallSavingsMs ?? a.numericValue ?? null,
  }))
  .filter((a) => a.savingsMs === null || a.savingsMs >= 300 || a.score < 0.5)
  .sort((a, b) => (b.savingsMs ?? 0) - (a.savingsMs ?? 0));

console.log(
  JSON.stringify(
    {
      url: safeText(url),
      finalUrl: safeText(lh.finalDisplayedUrl ?? url),
      strategy,
      fetchedAt: lh.fetchTime,
      scores: {
        performance: lh.categories.performance?.score,
        seo: lh.categories.seo?.score,
      },
      fieldData: {
        LCP_ms: fieldMetric('LARGEST_CONTENTFUL_PAINT_MS'),
        INP_ms: fieldMetric('INTERACTION_TO_NEXT_PAINT'),
        CLS_x100: fieldMetric('CUMULATIVE_LAYOUT_SHIFT_SCORE'),
      },
      lab: {
        LCP: lh.audits['largest-contentful-paint']?.displayValue,
        TBT: lh.audits['total-blocking-time']?.displayValue,
        CLS: lh.audits['cumulative-layout-shift']?.displayValue,
      },
      failingAudits: failing,
    },
    null,
    2
  )
);
