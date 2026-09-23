// Helpers for strings that end up in v-html. Anything user-supplied must go
// through one of these first.

const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\u0027': '&#39;', // '
};

/** Escapes a plain-text value so it renders literally as HTML. */
export function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

const ALLOWED_TAG = /^<\/?(em|mark)>$/i;
const TOKEN = /<\/?(?:em|mark)>|&(?:#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});|[&<>"']/gi;

/**
 * Sanitizes a search highlight fragment (e.g. from bleve). Only bare
 * <em>/<mark> open/close tags survive; every other `<`, `>`, quote and bare
 * `&` is escaped. Existing entities (`&amp;`, `&#39;`, ...) are kept as-is so
 * an already-escaped fragment is not double-escaped.
 */
export function sanitizeHighlight(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(TOKEN, (match) => {
    if (ALLOWED_TAG.test(match)) {
      return match.toLowerCase();
    }
    if (match.length > 1) {
      // A well-formed entity.
      return match;
    }
    return ESCAPES[match];
  });
}

const HIGHLIGHTS_KEY = '@search.highlights';

function firstHighlight(song, field) {
  const highlights = song?.[HIGHLIGHTS_KEY]?.[field];
  return highlights?.length ? highlights[0] : null;
}

/** Highlight fragment for `field` (sanitized) or the raw field value (escaped). */
function fieldHtml(song, field) {
  const highlight = firstHighlight(song, field);
  return highlight !== null ? sanitizeHighlight(highlight) : escapeHtml(song?.[field]);
}

/** "Artist - Title" for a search hit, safe for v-html. */
export function searchResultTitleHtml(song) {
  return `${fieldHtml(song, 'mainArtistTitle')} - ${fieldHtml(song, 'title')}`;
}

/** Lyrics highlight for a search hit, safe for v-html ('' when none). */
export function searchResultDescriptionHtml(song) {
  const highlight = firstHighlight(song, 'bodyLyrics');
  return highlight !== null ? sanitizeHighlight(highlight) : '';
}
