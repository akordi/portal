# Weekly loop

Run from the `seo/` folder. Instructions are frozen while a test is running.

1. Read `brief.md`, `state.json`, the last entries of `log.md`.
2. Pull last week's Search Console (by page, one day at a time, skip the last
   3 days) and GA4 conversions (by landing page) into `data/`.
3. Compare the page in `state.json.changeUnderTest` against its baseline.
   - Changes live for less than ~2 weeks: report numbers, make no verdict.
   - Otherwise judge search side AND business side together; record win/miss.
   - AI citation changes can't be tied to one change — note, don't claim.
4. Check the page didn't break: `node scripts/check-page.mjs <url>`.
5. Recommend **one** change, with evidence and links. If the current bet is
   exhausted, run `prompts/find-page.md` instead.
6. **Stop and wait for a human "yes"** before drafting anything in `../src` or
   publishing anything.
7. Update `state.json` and append a `weekly` entry to `log.md`.

Final message: a short summary — numbers vs baseline, verdict (if due), the one
recommended change, and what you need approved.
