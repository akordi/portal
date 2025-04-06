<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
// ToDo: develop login & get session
// eslint-disable-next-line no-unused-vars
import CoverBackground from '@/components/CoverBackground.vue';
import { invoke, until, useIdle, useIntervalFn } from '@vueuse/core';
import { LxModal, LxShell } from '@wntr/lx-ui';
import { useConsent } from 'vue-gtag';

import useErrors from '@/hooks/useErrors';
import useAppStore from '@/stores/useAppStore';
import useAuthStore from '@/stores/useAuthStore';
import useConfirmStore from '@/stores/useConfirmStore';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';
import LoginView from '@/views/Login.vue';

const authStore = useAuthStore();
const notify = useNotifyStore();
const viewStore = useViewStore();
const errors = useErrors();
const router = useRouter();
const confirmStore = useConfirmStore();
const appStore = useAppStore();

const secondsToIdle = 10;
const secondsCheckApiInterval = 30;

const { idle } = useIdle(secondsToIdle * 1000);

const { acceptAll, rejectAll, hasConsent } = useConsent();

const idleModalOpened = ref(false);
const translate = useI18n();
const $t = translate.t;
const route = useRoute();
const shellMode = computed(() => {
  let ret = 'public';
  if (route.path === '/') {
    ret = 'cover';
  }
  return ret;
});

const nav = [
  {
    label: $t('pages.dashboard.title'),
    icon: 'dashboard',
    to: { name: 'dashboard' },
  },
  {
    label: $t('pages.songs.title'),
    icon: 'search-details',
    to: { name: 'songSearch' },
  },
  {
    label: $t('pages.akordiArtistLetter.title'),
    icon: 'users',
    to: { name: 'akordiArtistLetter', params: { letter: '0' } },
  },
  {
    label: $t('pages.tagList.title'),
    icon: 'tag',
    to: { name: 'tagList' },
  },
  {
    label: $t('pages.songNew.title'),
    icon: 'add-item',
    to: { name: 'songNew' },
  },
  {
    label: 'Skatīt profilu',
    icon: 'user-profile',
    to: { name: 'userProfile' },
    type: 'user-menu',
  },
];

const coverLogo = ref('/imgs/logo-50.svg');

const bodyObserver = new MutationObserver((mutationsList) => {
  const classMutation = mutationsList.find(
    (mutation) => mutation.type === 'attributes' && mutation.attributeName === 'class'
  );

  if (classMutation) {
    const newClass = document.body.className;

    if (newClass.includes('theme-dark')) {
      coverLogo.value = '/imgs/logo-50.svg';
    } else if (newClass.includes('theme-contrast')) {
      coverLogo.value = '/imgs/logo-50.svg';
    } else {
      coverLogo.value = '/imgs/logo-50-dark.svg';
    }
  }
});
const cookieConsentModal = ref(null);
onMounted(() => {
  // Observe when the html body element class changes so we can reliably detect which theme is active
  bodyObserver?.observe(document.body, { attributes: true });
  if (!hasConsent.value) {
    cookieConsentModal.value.open();
  }
});

const systemName = computed(() => $t('title.shortName'));
const pageTitle = computed(() => viewStore.title || $t(router.currentRoute.value.meta.title));
const pageDescription = computed(
  () =>
    viewStore.description ||
    (router.currentRoute.value.meta.description
      ? $t(router.currentRoute.value.meta.description)
      : '')
);

const breadcrumbs = computed(() => {
  const ret = [];
  if (route.meta.breadcrumbs) {
    route.meta.breadcrumbs.forEach((item) => {
      const to = item.retainQueryParams ? { ...item.to, query: route.query } : item.to;
      ret.push({
        label: $t(item.text),
        to,
      });
    });
  }
  return ret;
});

const showBackButton = computed(() => breadcrumbs.value.length > 0);

const selectedNavItems = computed(() => {
  const ret = {};
  ret[router.currentRoute.value.name] = true;
  if (route.meta?.breadcrumbs) {
    route.meta?.breadcrumbs.forEach((item) => {
      ret[item.to?.name] = true;
    });
  }
  return ret;
});

function goBack(path) {
  if (path !== -1) {
    router.push(path);
  } else {
    router.back();
  }
}
function goHome() {
  router.push({ name: 'dashboard' });
}

const userInfo = computed(() => {
  if (authStore.isAuthorized) {
    return {
      firstName: authStore.session?.given_name,
      lastName: authStore.session?.family_name,
      description: authStore.session?.role ? $t(`roles.${authStore.session?.role}`) : null,
      institution: null,
    };
  }
  return null;
});

const theme = ref('auto');

const closeModal = () => {
  idleModalOpened.value = false;
};

const openModal = () => {
  idleModalOpened.value = true;
};

async function logout(redirectPath = '') {
  try {
    const resp = await authStore.logout(redirectPath);
    if (resp.status === 200) {
      closeModal();
      window.location.href = resp.data.logout_url;
    }
  } catch (err) {
    const error = errors.get(err);
    if (error.status === 401) {
      authStore.$reset();
      router.push({ name: 'sessionEnded' });
      return;
    }
    if (error.status !== 401 && error.data) {
      notify.pushError(error.data);
    }
  } finally {
    closeModal();
  }
}

async function primary() {
  await logout();
  confirmStore.$state.isOpen = false;
}
async function secondary() {
  confirmStore.$state.isOpen = false;
}

function openConfirmModal() {
  confirmStore.push('Iziet', 'Vai tiešām vēlaties iziet?', 'Jā', 'Nē', primary, secondary);
}

function confirmModalClosed() {
  confirmStore.$state.isOpen = false;
}

async function getSession() {
  try {
    await authStore.fetchSession();
  } catch (err) {
    const error = errors.get(err);
    if (error.status === 401) {
      logout();
    } else if (error.data) {
      notify.pushError(error.data);
    }
  }
}

async function callKeepAlive() {
  try {
    await authStore.extendSession();
  } catch (err) {
    const error = errors.get(err);
    if (error.status === 401) {
      logout();
    } else if (error.data) {
      notify.pushError(error.data);
    }
  }
}

const checkApiSession = () => {
  if (idle.value || idleModalOpened.value) {
    getSession();
  } else {
    callKeepAlive();
  }
};

useIntervalFn(() => {
  if (!authStore.session.active) {
    if (idleModalOpened.value) {
      closeModal();
      router.push({ name: 'sessionEnded' });
    }
    return;
  }
  if (authStore.session.secondsToLive < 1) {
    logout();
    closeModal();
    return;
  }
  if (authStore.session.secondsToLive < authStore.session.secondsToCountdown) {
    if (!idleModalOpened.value) {
      openModal();
    }
  } else if (idleModalOpened.value) {
    closeModal();
    return;
  }
  const refreshIntervals = authStore.session.secondsToLive % secondsCheckApiInterval === 0;
  const refreshBeforeWarn =
    authStore.session.secondsToLive - 3 < authStore.session.secondsToCountdown && !idle.value;
  const refreshBeforeLogout = authStore.session.secondsToLive === 3;
  if (refreshIntervals || refreshBeforeWarn || refreshBeforeLogout) {
    checkApiSession();
  }
  authStore.session.secondsToLive -= 1;
}, 1000);

async function continueSession() {
  try {
    await authStore.extendSession();
    notify.pushSuccess($t('shell.notifications.sessionContinued'));
  } catch (err) {
    notify.pushError($t('shell.notifications.sessionContinuedFailed'));
    if (err.response.status === 401) {
      logout();
    }
  } finally {
    closeModal();
  }
}

invoke(async () => {
  // @ts-ignore
  await until(() => authStore.showSessionEndCountdown).toBe(true);
  notify.pushWarning($t('shell.notifications.sessionEndingSoon'));
});

function idleModalPrimary() {
  continueSession();
}
function idleModalSecondary() {
  logout();
}
</script>
<template>
  <div>
    <div>
      <LxShell
        :system-name="$t('title.fullName')"
        :system-subheader="$t('title.subheader')"
        :system-name-short="systemName"
        :user-info="userInfo"
        :nav-items="nav"
        :nav-items-selected="selectedNavItems"
        :mode="shellMode"
        :page-label="pageTitle"
        :page-description="pageDescription"
        :page-back-button-visible="showBackButton"
        :page-breadcrumbs="breadcrumbs"
        :page-index-path="{ name: 'dashboard' }"
        :has-language-picker="false"
        :has-cover-logo="true"
        cover-image="/imgs/cover-light.jpg"
        cover-image-dark="/imgs/cover-dark.jpg"
        :cover-logo="coverLogo"
        :has-alerts="false"
        :has-help="false"
        :has-theme-picker="true"
        :navigating="appStore.$state.isNavigating"
        :showIdleModal="idleModalOpened"
        :secondsToLive="authStore.session.secondsToLive"
        :confirmDialogData="confirmStore"
        :confirmPrimaryButtonBusy="false"
        :confirmPrimaryButtonDestructive="true"
        v-model:notifications="notify.notifications"
        v-model:theme="theme"
        @confirmModalClosed="confirmModalClosed"
        @go-home="goHome"
        @go-back="goBack"
        @log-out="openConfirmModal"
        @idleModalPrimary="idleModalPrimary"
        @idleModalSecondary="idleModalSecondary"
      >
        <template #backdrop>
          <CoverBackground />
        </template>
        <template #coverArea>
          <div class="lx-button-set">
            <LoginView></LoginView>
          </div>
        </template>

        <template #logoSmall>
          <img id="logo-light" src="/imgs/logo-50-dark.svg" alt="Logo" />
          <img id="logo-dark" src="/imgs/logo-50.svg" alt="Logo" />
          <img id="logo-contrast" src="/imgs/logo-50-contrast.svg" alt="Logo" />
        </template>

        <router-view />
      </LxShell>
      <LxModal
        ref="cookieConsentModal"
        :label="$t('cookieConsent.title')"
        size="s"
        :button-primary-visible="true"
        :button-primary-label="$t('cookieConsent.accept')"
        @primary-action="acceptAll"
        :button-secondary-visible="true"
        :button-secondary-label="$t('cookieConsent.reject')"
        @secondary-action="rejectAll"
      >
        <p style="white-space: pre-wrap">{{ $t('cookieConsent.description') }}</p>
      </LxModal>
    </div>
  </div>
</template>
