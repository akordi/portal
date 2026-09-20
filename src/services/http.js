import axios from 'axios';

// Services that call http('') rely on the browser resolving a relative
// baseURL against the current page — there's no such resolution in Node, so
// SSR needs an absolute internal URL instead. Set once at SSR startup from
// config.serviceUrl (see entry-server.js); irrelevant in the browser.
let ssrBaseUrl = '';
export function setSsrApiBaseUrl(url) {
  ssrBaseUrl = url || '';
}

export default (baseUri) => {
  const resolvedBaseUri = baseUri || (typeof window === 'undefined' ? ssrBaseUrl : baseUri);
  const http = axios.create({
    baseURL: resolvedBaseUri,
    withCredentials: true,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  return http;
};
