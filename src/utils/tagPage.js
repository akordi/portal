/**
 * Texts and structured data for a tag's collection page. Content entered in
 * admin (pageTitle, metaDescription, intro) wins over the generic texts.
 */

export function tagHeading(tag, t) {
  return tag.pageTitle || t('pages.tagView.title', { title: tag.title });
}

export function tagDocumentTitle(tag, t) {
  return tag.pageTitle || t('pages.tagView.pageTitle', { title: tag.title });
}

export function tagMetaDescription(tag, songs, t) {
  if (tag.metaDescription) return tag.metaDescription;
  const songTitles = songs
    .slice(0, 10)
    .map((song) => song.title)
    .join(', ');
  return t('pages.tagView.metaDescription', { songTitles });
}

/** Paragraphs are separated by blank lines. */
export function introParagraphs(intro) {
  return (intro || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** schema.org CollectionPage of the tag's songs; `songs` may be the first page of `total`. */
export function tagJsonLd(tag, songs, total, origin, name) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: `${origin}${tag.url}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: total,
      itemListElement: songs.map((song, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${origin}${song.url}`,
        name: song.artist ? `${song.artist} - ${song.title}` : song.title,
      })),
    },
  };
}
