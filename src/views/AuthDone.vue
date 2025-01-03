<script setup>
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LxLoader } from '@wntr/lx-ui';
import useAuthStore from '@/stores/useAuthStore';
import useNotifyStore from '@/stores/useNotifyStore';
import { useI18n } from 'vue-i18n';

import useAppStore from '@/stores/useAppStore';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const authStore = useAuthStore();
const notificationStore = useNotifyStore();
const translate = useI18n();
/**
 * @type {Record<string, () => {title: string, description: string}>}
 * @description possible error codes returned by the server: [invalid_callback, invalid_token, server_error, invalid_client, no_session, invalid_rights, blocked, invalid_request
 */
const errCodeMessage = {
  unknown: () => ({
    title: translate.t('pages.auth.errors.unknownTitle'),
    description: translate.t('pages.auth.errors.unknownDescription'),
  }),
  invalid_rights: () => ({
    title: translate.t('pages.auth.errors.invalidRightsTitle'),
    description: translate.t('pages.auth.errors.invalidRightsDescription'),
  }),
  blocked: () => ({
    title: translate.t('pages.auth.errors.blockedTitle'),
    description: translate.t('pages.auth.errors.blockedDescription'),
  }),
  invalid_request: () => ({
    title: translate.t('pages.auth.errors.invalidRequestTitle'),
    description: translate.t('pages.auth.errors.invalidRequestDescription'),
  }),
};

onMounted(async () => {
  if (route.query?.error) {
    const err = (errCodeMessage[route.query.error.toString()] || errCodeMessage.unknown)();
    appStore.setError(err.title); // ToDo: use description too when error page is ready
    return;
  }
  await authStore.fetchSession();
  if (authStore.session.st) {
    if (authStore.isAuthorized) {
      const returnPath = await authStore.getReturnPath();
      if (returnPath && returnPath !== '') {
        await authStore.clearReturnPath();
        router.push({ path: returnPath });
      } else {
        router.push({ name: 'dashboard' });
      }
    } else {
      notificationStore.pushError(translate.t('shell.notifications.unknownState'));
    }
  }
});
</script>
<template>
  <div class="lx-plate">
    <LxLoader loading size="l" />
    <p class="lx-description">{{ $t('pages.auth.description') }}</p>
  </div>
</template>
