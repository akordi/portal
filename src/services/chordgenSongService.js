import http from '@/services/http';
import httpAnon from '@/services/httpAnon';

const serviceUrl = '/api/v2';

export default {
  // Public — no auth required.
  findAll(params) {
    return httpAnon(serviceUrl).get('/chordgen-songs', { params });
  },

  findOne(id) {
    return httpAnon(serviceUrl).get(`/chordgen-songs/${id}`);
  },

  getQueue() {
    return httpAnon(serviceUrl).get('/chordgen-songs/queue');
  },

  // Authenticated — requires a Kratos session.
  submit(payload) {
    return http(serviceUrl).post('/me/chordgen-songs', payload);
  },

  getMyJob(jobId) {
    return http(serviceUrl).get(`/me/chordgen-songs/jobs/${jobId}`);
  },

  getMyRating(id) {
    return http(serviceUrl).get(`/me/chordgen-songs/${id}/rating`);
  },

  submitRating(id, rating) {
    return http(serviceUrl).put(`/me/chordgen-songs/${id}/rating`, { rating });
  },
};
