# Find the one page worth this week

Goal: one page, one main query, one written reason — with links.

1. Read `brief.md`, `state.json`, the last entries of `log.md`.
2. **Search side.** From Search Console, per page for the last 28 days
   (skip the last 3 days): impressions, clicks, CTR, average position. Save the
   daily pulls under `data/gsc/`.
3. **Business side.** From GA4, per landing page for the same window:
   sessions and sessions with a primary conversion event (see `brief.md`).
   Save under `data/ga4/`.
4. Join them by page. Look for a **killer page**: already converts the visitors
   it gets, already shows up in search, but sits at position ~5–20 so most
   searchers never see it.
   - Flag high-impression / near-zero-conversion pages as **traps**. Do not
     recommend them.
5. Shortlist 2–3 candidates. For each, use DataForSEO to get the queries behind
   it, their search volume, and the live top 10.
6. Look at the live SERP for the main query. If the top results are a
   different page type from ours (e.g. video/YouTube vs lyrics page), the
   intent doesn't match — say so.
7. If Ahrefs is connected: check whether competitors win on backlinks rather
   than content (a different job from rewriting the page).
8. Give each candidate one verdict: **keep**, **keep if <one condition>**, or
   **drop**, each with links to what you looked at.
9. Write the pick into `state.json.currentBet` and add a `find-page` entry to
   `log.md`.

Do not audit the whole site. Go narrow.
