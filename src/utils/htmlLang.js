/**
 * Maps a DEFAULT_LANGUAGE value to the BCP 47 tag that goes into
 * `<html lang="...">`. By infrastructure convention DEFAULT_LANGUAGE is the
 * tenant's COUNTRY code (also the i18n locale key, see createApp.js), not an
 * ISO 639 language code — they only happen to coincide for lv, lt and es.
 *
 * Kept free of imports: server.mjs and vite.config.mjs load it directly,
 * outside Vite's '@' alias.
 */
const COUNTRY_TO_LANG = {
  lv: 'lv',
  lt: 'lt',
  ee: 'et',
  es: 'es',
};

/**
 * Normalizes a DEFAULT_LANGUAGE value to a tenant country code (lv, lt, ee,
 * es), falling back to lv. Pure, so server.mjs's readConfig() and the
 * browser's window.config resolve the same raw value to the same country.
 */
export function countryCode(defaultLanguage) {
  const key = String(defaultLanguage || '')
    .trim()
    .toLowerCase();
  return Object.hasOwn(COUNTRY_TO_LANG, key) ? key : 'lv';
}

export default function htmlLang(defaultLanguage) {
  return COUNTRY_TO_LANG[countryCode(defaultLanguage)];
}
