import axios from 'axios';

// See http.js — same SSR base URL problem, same fix.
let ssrBaseUrl = '';
export function setSsrApiBaseUrl(url) {
  ssrBaseUrl = url || '';
}

export default (baseUri) => {
  const resolvedBaseUri = baseUri || (typeof window === 'undefined' ? ssrBaseUrl : baseUri);
  const http = axios.create({
    baseURL: resolvedBaseUri,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  return http;
};
