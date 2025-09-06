<script setup>
import useAppStore from '@/stores/useAppStore';
import useViewStore from '@/stores/useViewStore';
import { LxErrorPage } from '@wntr/lx-ui';
import { onMounted } from 'vue';

import { useRouter } from 'vue-router';

const router = useRouter();

const appStore = useAppStore();
const viewStore = useViewStore();

function action(actionName) {
  if (actionName === 'dashboard') {
    router.push({ name: 'dashboard' });
    return;
  }
  router.go(-1);
}

onMounted(() => {
  viewStore.hideHeader();
});
</script>
<template>
  <LxErrorPage
    kind="404"
    @actionClick="action"
    :action-definitions="[
      { id: 'back', name: $t('pages.error.goBack'), icon: 'undo' },
      {
        id: 'dashboard',
        name: $t('pages.error.goHome'),
        icon: 'dashboard',
        kind: 'secondary',
      },
    ]"
    :title="$t('pages.error.title')"
    :description="appStore.error"
  ></LxErrorPage>
</template>
