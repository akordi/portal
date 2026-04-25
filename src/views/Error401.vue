<script setup>
import { computed } from 'vue';
import { LxErrorPage } from '@dativa-lv/lx-ui';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import useAuthStore from '@/stores/useAuthStore';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();

const actionDefinitions = computed(() => [
  { id: 'authorize', name: t('errors.error401.authorize'), icon: 'next' },
  {
    id: 'back',
    name: t('errors.error401.goBack'),
    icon: 'undo',
    kind: 'secondary',
  },
]);

function action(actionName) {
  if (actionName === 'authorize') {
    const retPath = router.currentRoute.value?.query?.returnPath;
    authStore.login(retPath);
    return;
  }
  router.go(-1);
}
</script>
<template>
  <LxErrorPage
    kind="401"
    @actionClick="action"
    :action-definitions="actionDefinitions"
  ></LxErrorPage>
</template>
