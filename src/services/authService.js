import http from '@/services/http';

const serviceUrl = '/api/v1/';

export default () => {
  const { publicUrl, authUrl } = typeof window !== 'undefined' ? window.config : {};

  return {
    authorize() {
      window.location.href = `${authUrl}self-service/login/browser?return_to=${publicUrl}auth-done`;
    },

    session() {
      return http(authUrl).get('/sessions/whoami');
    },

    extendSession() {
      return http(serviceUrl).post('/session/extend');
    },

    logout(routePath) {
      return http(authUrl).get(
        `self-service/logout/browser?return_to=${publicUrl}${routePath ?? ''}`
      );
    },
  };
};
