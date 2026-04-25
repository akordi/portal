import http from '@/services/http';

const serviceUrl = '/api/v2';

export default {
  getPreferences() {
    return http(serviceUrl).get('/me/preferences');
  },

  savePreferences(item) {
    return http(serviceUrl).patch('/me/preferences', item);
  },

  getSongPreferences(songId) {
    return http(serviceUrl).get(`/me/songs/${songId}/preferences`);
  },

  saveSongPreferences(songId, item) {
    return http(serviceUrl).patch(`/me/songs/${songId}/preferences`, item);
  },
};
