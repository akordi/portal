/**
 * Only these stores cross from the server to the browser. Deliberately a
 * whitelist: e.g. settingsStore is backed by localStorage via useStorage, and
 * hydrating it with the server's defaults would overwrite the visitor's own
 * saved settings.
 */
export const TRANSFERRED_STORES = ['songStore', 'viewStore'];

export function pickTransferredState(piniaState) {
  return TRANSFERRED_STORES.reduce((state, id) => {
    if (piniaState[id] !== undefined) {
      state[id] = piniaState[id];
    }
    return state;
  }, {});
}

/**
 * JSON for embedding inside an inline <script>. JSON.stringify alone is not
 * safe there: a "</script>" inside a string value (e.g. song lyrics) would end
 * the script element early and let the rest of the value run as HTML. Escaping
 * "<" (and the JS line terminators JSON allows but JS source doesn't) closes
 * that off; JSON.parse / a JS parser reads the escapes back to the same text.
 */
export function serializeState(state) {
  return JSON.stringify(state)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
