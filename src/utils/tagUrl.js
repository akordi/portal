/**
 * Returns the `url` route param for the tagView route.
 * Falls back to the numeric id when the API has no url for the tag,
 * so a tag never produces an empty (invalid) router param.
 */
export function tagUrlParam(tag) {
  const url = tag?.url ? tag.url.replace(/^\/tag\//, '') : '';
  return url || String(tag?.id ?? '');
}
