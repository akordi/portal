/**
 * Page-view payload for vue-gtag's router tracker.
 *
 * Song routes (meta.songPage) report the canonical /song/<slug> path and
 * location (GA4 derives page path from page_location) whichever list they
 * were opened from, and no page_title, so GA takes document.title: on a
 * landing that is the server-rendered song title. Other routes send their
 * translated route title.
 */
export function pageViewFor(route, t, location) {
  if (route.meta?.songPage) {
    const path = `/song/${route.params.url}`;
    return { page_path: path, page_location: new URL(path, location).href };
  }
  return { page_path: route.path, page_title: t(route.meta?.title), page_location: location };
}

/**
 * Router tracker options. Every route is tracked here — including songs — so
 * the landing page_view is sent by vue-gtag itself once it has queued its
 * config (on consent, or on load for returning visitors). A page_view pushed
 * before that is dropped by gtag.js, which left consenting first-time visitors
 * with no landing page in GA ("(not set)").
 */
export default function gtagPageTracker(router, t) {
  return {
    router,
    template: (route) => pageViewFor(route, t, window.location.href),
  };
}
