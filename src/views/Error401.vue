<script setup>
import { LxErrorPage } from '@wntr/lx-ui';
import { useRouter } from 'vue-router';
import useAuthStore from '@/stores/useAuthStore';

const router = useRouter();
const authStore = useAuthStore();

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
    :action-definitions="[
      { id: 'authorize', name: 'Autorizēties', icon: 'next' },
      {
        id: 'back',
        name: 'Atgriezties atpakaļ',
        icon: 'undo',
        kind: 'secondary',
      },
    ]"
  ></LxErrorPage>
</template>
