/** The site's origin for absolute URLs: the browser's, or the configured one under SSR. */
export default function siteOrigin(appConfig) {
  return typeof window !== 'undefined'
    ? window.location.origin
    : (appConfig?.publicUrl || '').replace(/\/$/, '');
}
