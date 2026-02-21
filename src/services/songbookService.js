import http from '@/services/http';

const serviceUrl = '/api/v2';

export default {
  findAll() {
    return http(serviceUrl).get('/me/songbooks');
  },

  findOne(id) {
    return http(serviceUrl).get(`/me/songbooks/${id}`);
  },

  save(item) {
    if (item.id) {
      return http(serviceUrl).patch(`/me/songbooks/${item.id}`, item);
    }
    return http(serviceUrl).post('/me/songbooks', item);
  },

  delete(itemId) {
    return http(serviceUrl).delete(`/me/songbooks/${itemId}`);
  },

  getSongs(id) {
    return http(serviceUrl).get(`/me/songbooks/${id}/songs`);
  },

  addSong(id, songId) {
    return http(serviceUrl).put(`/me/songbooks/${id}/songs/${songId}`);
  },

  removeSong(id, songId) {
    return http(serviceUrl).delete(`/me/songbooks/${id}/songs/${songId}`);
  },

  getSongSongbooks(songId) {
    return http(serviceUrl).get(`/me/songs/${songId}/songbooks`);
  },
};
