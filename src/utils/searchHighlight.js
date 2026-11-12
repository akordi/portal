const HIGHLIGHTS_KEY = '@search.highlights';

// The search API (Bleve's HTML highlighter) escapes text with Go's
// html.EscapeString and wraps matches in <mark>…</mark>; these are the only
// entities it produces.
const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&#34;': '"',
  '&#39;': "'",
};

function decodeEntities(text) {
  return text.replace(/&(amp|lt|gt|#34|#39);/g, (entity) => ENTITIES[entity]);
}

/** First server highlight fragment for a song field, or null when there is none. */
export function firstHighlight(song, field) {
  const highlights = song?.[HIGHLIGHTS_KEY]?.[field];
  return highlights?.length ? highlights[0] : null;
}

/**
 * Splits a server highlight fragment into plain-text segments, so it can be
 * rendered with text interpolation instead of v-html: odd segments are the
 * <mark>ed matches. Returns null for a missing fragment.
 * Line breaks are normalized to \n the way the HTML parser did for v-html,
 * since lyrics are stored with \r\n.
 */
export function parseHighlight(fragment) {
  if (typeof fragment !== 'string') return null;
  return fragment
    .replace(/\r\n?/g, '\n')
    .split(/<mark>([\s\S]*?)<\/mark>/)
    .map((text, index) => ({ text: decodeEntities(text), marked: index % 2 === 1 }))
    .filter((segment) => segment.text);
}
