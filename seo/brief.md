# Brief — akordi.lv

The agent reads this file first on every run. It judges a page only as well as
it understands what the page is for, so keep this current.

## What the site is

Akordi.lv is a free Latvian catalog of song lyrics with guitar/ukulele chords.
Visitors come from search looking for a specific song ("<song> akordi",
"<song> vārdi", "<artist> dziesmas") and play it on their instrument.

- Primary language: Latvian (`lv`). Also ships `lt`, `ee`, `es` locales.
- Live site: https://www.akordi.lv
- Source: this repo (`src/`), served by `server.mjs`.

## Who the visitor is

Someone holding a guitar or ukulele who wants to play a song right now: the
lyrics with correct chords, in a key they can sing, readable on a phone.

## What counts as a conversion

Nobody pays on this site, so a conversion is a visitor who actually *uses* a
song page instead of bouncing. Tracked as named GA4 events (see
`src/views/SongView.vue`, `src/views/SongSearch.vue`):

| Event         | Meaning                                              | Weight |
|---------------|------------------------------------------------------|--------|
| `song_action` | transpose / hide chords / instrument switch / add to songbook | primary |
| `autoscroll`  | started hands-free scrolling (they are playing)      | primary |
| `play_along`  | started the YouTube play-along                       | primary |
| `search`-type events from SongSearch | on-site search after landing  | secondary |

**Conversion rate for a page = sessions with ≥1 primary event / sessions.**
A page with lots of search traffic and a near-zero conversion rate is a trap,
not a candidate.

> TODO (owner): if there is a revenue goal (ads, donations, sign-ups for
> songbooks), add it here and give it the highest weight.

## Money pages (page types that matter)

1. Song pages — `/song/:url` (canonical). `/search/song/`, `/new/song/`,
   `/top/song/` are alternate paths to the same song; the canonical tag points
   to `/song/:url`.
2. Artist pages — `/band/:url`.
3. Tag and list pages — `/tag/:url`, `/top`, `/new`, `/tags`, `/chords`.

## Technical facts the agent must know

- Only these routes are server-rendered (see `SSR_ROUTE_PATTERNS` in
  `server.mjs`): `/song/*`, `/search/song/*`, `/new/song/*`, `/top/song/*`,
  `/band/*`. Every other route ships an empty SPA shell with the generic
  template title — compare raw HTML vs rendered before judging those.
- Song and artist pages set title, description, canonical and og tags via
  `useHead()`.
- `public/robots.txt` and any sitemap are part of this repo — check them.
- Analytics never fire during SSR; GA4 only loads after cookie consent
  (`src/components/CookiesConsent.vue`), so GA4 undercounts vs Search Console.

## Things the agent must never do

- Publish, deploy, commit, push, open PRs, submit URLs or sitemaps without an
  explicit "yes" from a human in the current session.
- Change more than one thing on a page per test.
- Report a finding without the URL (or file path) it came from.
