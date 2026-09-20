import { defineStore } from 'pinia';
import kratosAuthStore from '@/stores/useKratosAuthStore';
import authService from '@/services/kratosAuthService';

const config = typeof window !== 'undefined' ? window.config : {};

export default defineStore(
  'authStore',
  kratosAuthStore(authService, config.authUrl, config.publicUrl, config.clientId, '', '')
);
