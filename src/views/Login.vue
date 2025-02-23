<script setup>
import useAuthStore from '@/stores/useAuthStore';
import useViewStore from '@/stores/useViewStore';
import { LxButton } from '@wntr/lx-ui';
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const viewStore = useViewStore();
const authStore = useAuthStore();
const $t = useI18n().t;
onMounted(() => {
  viewStore.showBack();
  if (authStore.isAuthorized) {
    viewStore.showNavBar();
  } else {
    viewStore.hideNavBar();
  }
});
</script>
<template>
  <LxButton
    :href="{ name: 'dashboard' }"
    :label="$t('pages.home.buttons.loginUnauthorized')"
    icon="dashboard"
  />
</template>
