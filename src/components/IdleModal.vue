<script setup lang="ts">
import useErrors from '@/hooks/useErrors';
import useAuthStore from '@/stores/useAuthStore';
import useNotifyStore from '@/stores/useNotifyStore';
import { invoke, until, useIdle, useIntervalFn } from '@vueuse/core';
import { LxModal } from '@akordi/lx-ui';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const secondsToIdle = 10;
const secondsCheckApiInterval = 30;
const authStore = useAuthStore();
const notification = useNotifyStore();
const errors = useErrors();
const t = useI18n();

const router = useRouter();
const { idle } = useIdle(secondsToIdle * 1000);

const idleModalOpened = ref(false);
const idleModal = ref();

onMounted(async () => {
  if (authStore.session.active) {
    authStore.keepAlive();
  }
});

const closeModal = () => {
  idleModalOpened.value = false;
  idleModal.value.close();
};

const openModal = () => {
  idleModalOpened.value = true;
  idleModal.value.open();
};

async function logout() {
  try {
    const resp = await authStore.logout();
    if (resp.status === 200 && resp.data !== '') {
      window.location.href = resp.data;
    } else {
      notification.pushSuccess(t.t('shell.notifications.logOut'));
    }
  } catch (err) {
    const error = errors.get(err);
    if (error.status !== 401 && error.data) {
      notification.pushError(error.data);
    }
  } finally {
    await router.push({ name: 'sessionEnded' });
    closeModal();
  }
}

async function getSession() {
  try {
    await authStore.fetchSession();
  } catch (err) {
    const error = errors.get(err);
    if (error.status === 401) {
      logout();
    } else if (error.data) {
      notification.pushError(error.data);
    }
  }
}

async function callKeepAlive() {
  try {
    await authStore.keepAlive();
  } catch (err) {
    const error = errors.get(err);
    if (error.status === 401) {
      logout();
    } else if (error.data) {
      notification.pushError(error.data);
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
    await authStore.keepAlive();
    notification.pushSuccess(t.t('shell.notifications.sessionContinued'));
  } catch (err) {
    notification.pushError(t.t('shell.notifications.sessionContinuedFailed'));
    if (err?.response?.status === 401) {
      logout();
    }
  } finally {
    closeModal();
  }
}

const idleModalActions = computed(() => [
  { id: 'continue', kind: 'primary', name: t.t('shell.sessionExpiring.primaryLabel') },
  { id: 'logout', kind: 'secondary', name: t.t('shell.sessionExpiring.secondaryLabel') },
]);

function idleModalActionClicked(actionId) {
  if (actionId === 'continue') {
    continueSession();
  } else if (actionId === 'logout') {
    logout();
  }
}

// Closing is disabled, but if the modal is dismissed anyway (e.g. an older
// LxModal letting Escape through) treat it as "continue" so the idle state
// doesn't stay stuck on "open". closeModal() resets the flag before closing,
// so our own closes don't land here.
function idleModalClosed() {
  if (idleModalOpened.value) {
    continueSession();
  }
}

invoke(async () => {
  // @ts-ignore
  await until(() => authStore.showSessionEndCountdown).toBe(true);
  notification.pushWarning(t.t('shell.notifications.sessionEndingSoon'));
});
</script>
<template>
  <div>
    <LxModal
      ref="idleModal"
      :label="t.t('shell.sessionExpiring.label')"
      :action-definitions="idleModalActions"
      :button-secondary-is-cancel="false"
      :disable-closing="true"
      :esc-enabled="false"
      @action-click="idleModalActionClicked"
      @close="idleModalClosed"
    >
      <p v-if="authStore.session.secondsToLive > 60">
        {{
          t.t('shell.sessionExpiring.descriptionMinutes', {
            count: Math.floor(authStore.session.secondsToLive / 60),
          })
        }}
        {{
          authStore.session.secondsToLive % 60 > 0
            ? t.t('shell.sessionExpiring.descriptionMinutesSmall', {
                count: authStore.session.secondsToLive % 60,
              })
            : null
        }}
      </p>
      <p v-else>
        {{
          t.t('shell.sessionExpiring.description', {
            count: authStore.session.secondsToLive,
          })
        }}
      </p>
    </LxModal>
  </div>
</template>
