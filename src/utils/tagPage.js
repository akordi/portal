/**
 * Texts and structured data for a tag's collection page. Content entered in
 * admin (pageTitle, metaDescription, intro) wins; otherwise the generic,
 * translated texts are used.
 */

/** The page heading (layout <h1>). */
export function tagHeading(tag, t) {
  return tag.pageTitle || t('pages.tagView.title', { title: tag.title });
}

/** The document <title>. */
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

/** The intro split into paragraphs on blank lines. */
export function introParagraphs(intro) {
  return (intro || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** schema.org CollectionPage listing the page's songs. */
export function tagJsonLd(tag, songs, origin, name) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: `${origin}${tag.url}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: songs.length,
      itemListElement: songs.map((song, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${origin}${song.url}`,
        name: song.mainArtist?.title ? `${song.mainArtist.title} - ${song.title}` : song.title,
      })),
    },
  };
}
