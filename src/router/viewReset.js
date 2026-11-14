import { START_LOCATION } from 'vue-router';

/**
 * Views set the page heading (viewStore) themselves, and most never clear it,
 * so a view that sets none showed the previous one's heading. Clear it when
 * another view opens; a view that stays (new params) keeps managing its own,
 * and the first navigation keeps the server-rendered state.
 */
export default function shouldResetView(to, from, failure) {
  return !failure && from !== START_LOCATION && to.name !== from.name;
}
