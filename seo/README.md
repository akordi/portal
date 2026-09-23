# SEO & AEO agent for akordi.lv

A Claude Code agent that picks one page a week, audits it for Google and AI
answers, recommends one change, and measures it against **conversions**, not
just rankings. Based on the "How to automate SEO with Opus 5.5" setup, adapted
to this site (GA4 events instead of PostHog, no CMS: the site is `../src`).

Run everything from this folder: `cd seo && claude`.

## Layout

| Path | Purpose |
|------|---------|
| `CLAUDE.md` | Agent rules (read automatically) |
| `brief.md` | Business, visitor, what counts as a conversion — edit this most |
| `state.json` | Baselines, current bet, change under test |
| `log.md` | Append-only run history (hook-enforced) |
| `prompts/` | `find-page`, `audit` (four passes), `weekly` loop |
| `scripts/` | `check-page.mjs` (raw-HTML crawlability), `pagespeed.mjs` |
| `data/`, `reports/` | Raw pulls and audit reports |
| `.mcp.json` | Tool connections |
| `.claude/settings.json` + `hooks/require-approval.mjs` | Approval gate |

## Week 1 — connect tools

Export these before starting `claude` (never commit them):

| Tool | Env vars | Notes |
|------|----------|-------|
| Search Console (`mcp-server-gsc`) | `GSC_CREDENTIALS_JSON` = path to service-account JSON | Enable the Search Console API in a Google Cloud project, create a service account, add its email as a user on the akordi.lv property. |
| GA4 (`analytics-mcp`, needs `pipx`) | `GOOGLE_CLOUD_PROJECT` | `gcloud auth application-default login --scopes https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/cloud-platform`. Mark `song_action`, `autoscroll`, `play_along` as key events in GA4. |
| DataForSEO | `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` | Start with the **sandbox** (free, fake data, same shape). Set a spend limit before switching to live. |
| Firecrawl | `FIRECRAWL_API_KEY` | Renders JS — use it to compare with `check-page.mjs` raw output. |
| Parallel (web search) | `PARALLEL_API_KEY` | Finds where songs/artists/akordi.lv are discussed. |
| PageSpeed Insights | `PAGESPEED_API_KEY` | Anonymous quota is often zero. |
| Ahrefs (optional) | — | Only if already paid for; add its MCP server to `.mcp.json`. |

Then approve the servers when Claude Code asks (`/mcp` to check), and run:

> Read brief.md, pull the last 28 days of Search Console and GA4 data one day
> at a time into data/, and write baselines per page into state.json.

## Week 2 — find the page, audit it

> Run prompts/find-page.md, then prompts/audit.md on the pick.

Push back on any finding without a source.

## Week 3 — ship one change

The agent drafts the change in `../src` (the hook makes it ask first). You
review, commit, and deploy yourself. The agent logs the date and what changed.

## Week 4+ — weekly loop

**Local scheduled task (recommended, can edit with approval):** in Claude Code
desktop, create a scheduled task — folder: `seo/`, model: Opus, schedule:
Monday 07:00, permission mode: *default* (stops and waits on anything gated),
instructions: `Run prompts/weekly.md`.

**Cloud routine (read-only):** runs unattended, so it must never publish. Use
the same prompt, give it only read-only credentials, and have it report back
instead of editing `../src`.

## Approval gate

`hooks/require-approval.mjs` forces a prompt before: editing anything outside
`seo/`, git commit/push/reset, `gh` writes, HTTP write requests, URL/sitemap
submission, live (non-sandbox) DataForSEO calls, MCP tools that
submit/update/delete, rewriting `log.md`, and editing the frozen instructions.
