<script setup>
import { LxErrorPage } from '@wntr/lx-ui';
import { useRouter } from 'vue-router';

const router = useRouter();

function action(actionName) {
  if (actionName === 'dashboard') {
    router.push({ name: 'dashboard' });
    return;
  }
  router.go(-1);
}
</script>
<template>
  <LxErrorPage
    kind="403"
    @actionClick="action"
    :action-definitions="[
      { id: 'dashboard', name: 'Atgriezties atpakaļ', icon: 'undo' },
      {
        id: 'back',
        name: 'Atgriezties uz sākumu',
        icon: 'dashboard',
        kind: 'secondary',
      },
    ]"
  ></LxErrorPage>
</template>
