import http from '@/services/httpAnon';

const serviceUrl = '';
let abortController = null;
export default {
  parseUrl(url) {
    const regex = /(\d+).*/;
    if (!regex.exec(url)) {
      return null;
    }
    return +regex.exec(url)[1];
  },

  getArtist(id) {
    return http(serviceUrl).get(`/api/v2/artists/${id}`);
  },

  getArtists(reqParams) {
    let params = reqParams;
    if (!params) {
      params = {
        size: 20,
        page: 0,
        sort: 'createdDate,desc',
      };
    }
    return http(serviceUrl).get('/api/v2/artists', { params });
  },

  getTags(reqParams) {
    let params = reqParams;
    if (!params) {
      params = {
        size: 20,
        page: 0,
        sort: 'title,asc',
      };
    }
    return http(serviceUrl).get('/api/v2/tags', { params });
  },

  getTag(id) {
    return http(serviceUrl).get(`/api/v2/tags/${id}`);
  },

  getSongs(reqParams) {
    let params = reqParams;
    if (!params) {
      params = {
        size: 20,
        page: 0,
        sort: 'createdDate,desc',
      };
    }
    return http(serviceUrl).get('/api/v2/songs', { params });
  },

  getSongsCount() {
    const params = {
      size: 0,
      page: 0,
    };
    return http(serviceUrl).get('/api/v2/songs', { params });
  },

  getSong(id) {
    return http(serviceUrl).get(`/api/v2/songs/${id}`);
  },

  saveEdit(item) {
    return http(serviceUrl).post('/api/v2/admin/edits', item);
  },

  searchArtist(query) {
    return http(serviceUrl).get('/api/v2/artists', { params: { titleStartsWith: query } });
  },

  search(q, params) {
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    const searchParams = { ...params, q };

    return http(serviceUrl).get('/api/v2/admin/search', {
      params: searchParams,
      signal: abortController.signal,
    });
  },
};
