/**
 * HTML-injected window.config flags are strings (e.g. "true" / "false").
 * Plain !!value would treat "false" as truthy.
 * @param {string|boolean|number|undefined|null} value
 * @returns {boolean}
 */
export default function configBool(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes';
  }
  return false;
}
