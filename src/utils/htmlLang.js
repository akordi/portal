/**
 * Maps a DEFAULT_LANGUAGE value to the BCP 47 tag that goes into
 * `<html lang="...">`. By infrastructure convention DEFAULT_LANGUAGE is the
 * tenant's COUNTRY code (also the i18n locale key, see createApp.js), not an
 * ISO 639 language code — they only happen to coincide for lv, lt and es.
 */
const COUNTRY_TO_LANG = {
  lv: 'lv',
  lt: 'lt',
  ee: 'et',
  es: 'es',
};

export default function htmlLang(defaultLanguage) {
  const key = String(defaultLanguage || '')
    .trim()
    .toLowerCase();
  return COUNTRY_TO_LANG[key] || COUNTRY_TO_LANG.lv;
}
