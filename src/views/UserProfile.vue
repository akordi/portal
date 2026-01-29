<script setup>
import router from '@/router';
import useAuthStore from '@/stores/useAuthStore';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';
import { LxForm, LxRow, LxTextInput } from '@dativa-lv/lx-ui';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const authStore = useAuthStore();

const notification = useNotifyStore();
const t = useI18n();
const viewStore = useViewStore();

const logout = async () => {
  try {
    const resp = await authStore.logout();
    if (resp.status === 200 && resp.data !== '') {
      window.location.href = resp.data.logout_url;
    } else {
      await router.push({ name: 'home' });
      notification.pushSuccess(t.t('shell.notifications.logOut'));
    }
  } catch (err) {
    notification.pushError(`${t.t('errors.unexpectedError')} ${err.message}`);
  }
};
function buttonClicked(actionName) {
  if (actionName === 'logout') {
    logout();
  }
}

const formButtons = ref([
  {
    id: 'logout',
    name: t.t('shell.logOut'),
    icon: 'logout',
    kind: 'tertiary',
    destructive: true,
  },
]);

onMounted(() => {
  viewStore.goBack = true;
});
</script>
<template>
  <LxForm
    :action-definitions="formButtons"
    :show-header="true"
    :showPreHeaderInfo="true"
    :column-count="2"
    @buttonClick="buttonClicked"
  >
    <template #pre-header
      >{{ t.t('pages.userProfile.sessionTime') }} {{ authStore.session.secondsToLive }}</template
    >
    <template #header>{{ authStore.fullName }}</template>
    <LxRow :label="$t('pages.userProfile.givenNameLabel')">
      <LxTextInput v-model="authStore.session.given_name" :read-only="true" />
    </LxRow>
    <LxRow :label="$t('pages.userProfile.familyNameLabel')">
      <LxTextInput v-model="authStore.session.family_name" :read-only="true" />
    </LxRow>
    <LxRow :label="$t('pages.userProfile.emailLabel')">
      <LxTextInput v-model="authStore.session.email" :read-only="true" />
    </LxRow>
  </LxForm>
</template>
