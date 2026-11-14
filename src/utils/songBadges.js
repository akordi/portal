const POPULAR_RANKS = 3;
// Below this, "popular" would rest on a handful of visits.
const POPULAR_MIN_WEEKLY_VISITS = 10;

/** Badge keys for a song summary (see songSummary), optionally at a popularity rank. */
export default function songBadges(song, rank = null) {
  const badges = [];
  if (rank !== null && rank <= POPULAR_RANKS && song.weeklyVisits >= POPULAR_MIN_WEEKLY_VISITS) {
    badges.push('popular');
  }
  if (song.playAlong) {
    badges.push('playAlong');
  }
  return badges;
}
