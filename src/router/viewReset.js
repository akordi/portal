import { START_LOCATION } from 'vue-router';

/**
 * Views set the page heading (viewStore) themselves, and most never clear
 * it, so a page that sets none showed the previous page's heading. Clear it
 * on every completed move to another page; the first navigation keeps the
 * server-rendered state the page hydrates with.
 */
export default function shouldResetView(to, from, failure) {
  return !failure && from !== START_LOCATION && to.path !== from.path;
}
