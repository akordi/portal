/**
 * Footer site map columns, in display order. A route joins a column by
 * carrying its `category` in meta (the key LxSiteMap filters on) and is
 * placed within it by `meta.siteMapOrder`.
 */
export const SITE_MAP_GROUPS = [
  { category: 'songs', label: 'siteMap.songs' },
  { category: 'chords', label: 'siteMap.chords' },
  { category: 'site', label: 'siteMap.site' },
];

function flattenRoutes(routes) {
  return routes.flatMap((route) => [route, ...flattenRoutes(route.children ?? [])]);
}

/**
 * Groups the route tree into the footer site map's columns.
 * Routes marked `anonymous: false` are left out unless the user is signed in,
 * and columns that end up empty are dropped.
 * @param {import('vue-router').RouteRecordRaw[]} routes
 * @param {boolean} isAuthorized
 */
export default function buildSiteMap(routes, isAuthorized) {
  const linked = flattenRoutes(routes).filter(
    (route) =>
      route.name && route.meta?.category && (isAuthorized || route.meta.anonymous !== false)
  );
  return SITE_MAP_GROUPS.map((group) => ({
    ...group,
    routes: linked
      .filter((route) => route.meta.category === group.category)
      .sort((a, b) => (a.meta.siteMapOrder ?? 0) - (b.meta.siteMapOrder ?? 0)),
  })).filter((group) => group.routes.length > 0);
}
