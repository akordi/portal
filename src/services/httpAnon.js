import axios from 'axios';

export default (baseUri) => {
  const http = axios.create({
    baseURL: baseUri,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  return http;
};
