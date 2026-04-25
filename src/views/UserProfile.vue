<script setup>
import router from '@/router';
import useAccountPreferencesStore from '@/stores/useAccountPreferencesStore';
import useAuthStore from '@/stores/useAuthStore';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';
import { LxContentSwitcher, LxForm, LxLoaderView, LxRow } from '@dativa-lv/lx-ui';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const authStore = useAuthStore();
const preferencesStore = useAccountPreferencesStore();

const notification = useNotifyStore();
const t = useI18n();
const viewStore = useViewStore();
const loading = ref(true);

const instrumentOptions = [
  { id: 'guitar', name: t.t('pages.chordsLibrary.showGuitarChords.label') },
  { id: 'ukulele', name: t.t('pages.chordsLibrary.showUkuleleChords.label') },
  { id: 'baritone-ukulele', name: t.t('pages.chordsLibrary.showBaritoneUkuleleChords.label') },
];

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

async function loadProfileData() {
  loading.value = true;
  try {
    await preferencesStore.loadPreferences();
  } catch (err) {
    notification.pushError(`${t.t('errors.unexpectedError')} ${err.message}`);
  } finally {
    loading.value = false;
  }
}

async function selectInstrument(instrument) {
  try {
    await preferencesStore.saveInstrument(instrument);
    notification.pushSuccess(t.t('pages.userProfile.preferences.saveSuccess'));
  } catch (err) {
    notification.pushError(t.t('pages.userProfile.preferences.saveError'));
  }
}

const formButtons = ref([
  {
    id: 'logout',
    name: t.t('lx.shell.logOut'),
    icon: 'logout',
    kind: 'tertiary',
    destructive: true,
  },
]);

onMounted(() => {
  viewStore.goBack = true;
  loadProfileData();
});
</script>
<template>
  <LxLoaderView :loading="loading">
    <LxForm
      :action-definitions="formButtons"
      :show-header="true"
      :showPreHeaderInfo="true"
      :column-count="1"
      @buttonClick="buttonClicked"
    >
      <template #pre-header
        >{{ t.t('pages.userProfile.sessionTime') }} {{ authStore.session.secondsToLive }}</template
      >
      <template #header>{{ authStore.fullName }}</template>

      <LxRow :label="$t('pages.userProfile.givenNameLabel')">
        <p class="lx-data">{{ authStore.session.given_name }}</p>
      </LxRow>
      <LxRow :label="$t('pages.userProfile.familyNameLabel')">
        <p class="lx-data">{{ authStore.session.family_name }}</p>
      </LxRow>
      <LxRow :label="$t('pages.userProfile.emailLabel')">
        <p class="lx-data">{{ authStore.session.email }}</p>
      </LxRow>

      <div class="lx-divider"></div>

      <LxRow :label="$t('pages.userProfile.preferences.instrument')">
        <LxContentSwitcher
          :items="instrumentOptions"
          :model-value="preferencesStore.preferences.instrument"
          id="profile-instrument-switcher"
          @update:model-value="selectInstrument"
        />
      </LxRow>
    </LxForm>
  </LxLoaderView>
</template>
