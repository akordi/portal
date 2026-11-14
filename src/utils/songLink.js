import { songUrlParam } from '@/ssr/prefetch';

/** Router location of a song's own page. */
export default function songLink(song) {
  return { name: 'akordiSongView', params: { url: songUrlParam(song) } };
}
