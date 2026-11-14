/**
 * The fields song lists render. Lists keep only these, as their state is
 * serialized into the server-rendered page.
 */
export default function songSummary(song) {
  return {
    id: song.id,
    title: song.title,
    url: song.url,
    artist: song.mainArtist?.title ?? '',
    youtubeLink: song.youtubeLink || '',
    weeklyVisits: song.songTop?.visitsWeekly ?? 0,
    playAlong: Boolean(song.chordTimeline?.segments?.length),
  };
}
