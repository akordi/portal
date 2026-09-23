# Four-pass checkup of the current bet

Target: `state.json.currentBet.page` and its main query. Write the result to
`reports/YYYY-MM-DD-<slug>.md`. Every claim cites its source URL or file path.
Missing data is written as "data missing".

## Pass 1 — can Google reach it?

- `node scripts/check-page.mjs <url>`: status code, robots meta, canonical,
  title, description, h1, amount of indexable text in the **raw** HTML.
- Compare with Firecrawl's rendered output. On this site only the routes in
  `SSR_ROUTE_PATTERNS` (`../server.mjs`) are server-rendered; everything else
  is an empty shell until JS runs.
- `../public/robots.txt` and sitemap: is the page allowed and listed?
- Search Console URL Inspection / Page Indexing: indexed? Which canonical did
  Google pick?
- `node scripts/pagespeed.mjs <url> mobile`: only report failures big enough to
  hurt a real visitor.

## Pass 2 — competition

- DataForSEO: top 10 for the main query.
- Firecrawl: scrape each of those pages in full. Read them side by side with ours.
- Output: what winners cover that we don't, questions they answer that we skip,
  and what our page does better than all of them.

## Pass 3 — answer engines

- DataForSEO: what AI Mode returns for the main query. Are we cited?
- Bing Webmaster Tools AI Performance report, if available.
- Parallel: where the song/artist/our brand is discussed (Reddit, forums,
  YouTube, Latvian music sites). List places with wrong details about us and
  threads where we should be present.
- Page-reading checks: answer in the first line under each heading; headings
  match how people ask; sections stand alone.
- Schema only if the page fits a rich result.

## Pass 4 — path to the conversion

- Read the page like a player with a guitar on a phone: are the chords visible
  immediately? Are transpose / autoscroll / play-along obvious and early?
- Tracking: does each conversion fire as its own named GA4 event? (see
  `../src/views/SongView.vue`)
- Internal links: which of our pages already get traffic and should link here?

## End

Rank the fixes. Recommend **one** change to make first. Add an `audit` entry to
`log.md`.
