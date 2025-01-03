import { defineStore } from 'pinia';
import kratosAuthStore from '@/stores/useKratosAuthStore';
import authService from '@/services/authService';

export default defineStore(
  'authStore',
  kratosAuthStore(
    authService,
    window.config.authUrl,
    window.config.publicUrl,
    window.config.clientId,
    'vpm',
    'demo-sessionkey'
  )
);
