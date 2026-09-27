/** Resolves once an async (lazy-loaded) component's chunk is loaded. */
export default function whenLoaded(component) {
  // eslint-disable-next-line no-underscore-dangle
  return component?.__asyncLoader?.() ?? Promise.resolve();
}
