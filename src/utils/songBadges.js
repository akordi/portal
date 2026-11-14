/**
 * Badges for a song in a list: weekly popularity (top ranks only, and only
 * with enough visits that it means something), synced play-along, and
 * lyrics-only songs (by the site's "no chords" tag, if it has one).
 */
export const POPULAR_RANKS = 3;
export const POPULAR_MIN_WEEKLY_VISITS = 10;

export function hasPlayAlong(song) {
  return Boolean(song.chordTimeline?.segments?.length);
}

export default function songBadges(song, { rank = null, noChordsTag = '' } = {}) {
  const badges = [];
  if (
    rank !== null &&
    rank <= POPULAR_RANKS &&
    (song.songTop?.visitsWeekly ?? 0) >= POPULAR_MIN_WEEKLY_VISITS
  ) {
    badges.push('popular');
  }
  if (hasPlayAlong(song)) {
    badges.push('playAlong');
  }
  const noChords = noChordsTag.trim().toLowerCase();
  if (noChords && (song.tags || []).some((t) => t.title?.trim().toLowerCase() === noChords)) {
    badges.push('noChords');
  }
  return badges;
}
