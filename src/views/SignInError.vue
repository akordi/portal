<script setup>
import useViewStore from '@/stores/useViewStore';
import { LxErrorPage } from '@wntr/lx-ui';
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const viewStore = useViewStore();
const router = useRouter();
const { t } = useI18n();
const actionDefinitions = [
  {
    id: 'goBack',
    name: t('pages.error.goBack'),
    kind: 'primary',
  },
];

const actionClicked = (actionId) => {
  if (actionId === 'goBack') {
    router.push({ name: 'dashboard' });
  }
};

onMounted(() => {
  viewStore.header = false;
});
</script>
<template>
  <LxErrorPage
    :kind="500"
    :title="t('pages.error.title')"
    description=""
    :action-definitions="actionDefinitions"
    @action-click="actionClicked"
  >
  </LxErrorPage>
</template>
