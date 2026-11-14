/**
 * Page-view payload for vue-gtag's router tracker. Song views report the
 * canonical /song/<slug> from whichever list they were opened, keeping the
 * query (campaign parameters), and leave page_title to document.title, which
 * is the song title once it has loaded.
 */
export function pageViewFor(route, t, location) {
  if (route.meta?.songPage) {
    const url = new URL(location);
    url.pathname = `/song/${route.params.url}`;
    return { page_path: url.pathname, page_location: url.href };
  }
  return { page_path: route.path, page_title: t(route.meta?.title), page_location: location };
}

// Song routes are tracked here too, not from the view: vue-gtag sends these
// only after its config is queued, and gtag.js drops page views queued before.
export default function gtagPageTracker(router, t) {
  return {
    router,
    template: (route) => pageViewFor(route, t, window.location.href),
  };
}
