<script setup lang="ts">
import { ref, onMounted } from 'vue';
import useAuthStore from '@/stores/useAuthStore';
import useNotifyStore from '@/stores/useNotifyStore';
import { LxButton } from '@wntr/lx-ui';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const menuOpen = ref(false);
const authStore = useAuthStore();
const router = useRouter();
const notification = useNotifyStore();
const translate = useI18n();

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

const logout = async () => {
  try {
    const resp = await authStore.logout();
    if (resp.status === 200 || resp.status === 204) {
      authStore.$reset();
      await router.push({ name: 'home' });
      notification.pushSuccess(translate.t('shell.notifications.logOut'));
    }
  } catch (err) {
    window.location.reload();
  }
};

onMounted(() => {
  window.onclick = (event) => {
    if (!event.target.matches('#userMenu') && !event.target.matches('#userMenuButton')) {
      menuOpen.value = false;
    }
  };
});
</script>

<template>
  <div class="lx-context-container" :class="[{ 'lx-selected': menuOpen }]">
    <div class="lx-group">
      <div class="lx-divider"></div>
      <lx-button
        v-if="authStore.isAuthorized"
        id="userMenuButton"
        :label="authStore.fullName"
        kind="navbar"
        icon="user"
        @click="toggleMenu()"
      ></lx-button>
    </div>
    <div id="userMenu" class="lx-dropdown-panel" v-show="menuOpen">
      <div class="lx-region" id="userInfo">
        <strong>{{ authStore.session.given_name }} {{ authStore.session.family_name }}</strong>
        <p class="lx-description" v-if="authStore.session.org_name">
          {{ authStore.session.org_name }}
        </p>
      </div>

      <div class="lx-button-set">
        <lx-button
          icon="user-profile"
          :label="$t('shell.userProfile')"
          kind="ghost"
          :href="{ name: 'userProfile' }"
        />
        <div class="lx-divider"></div>
        <lx-button
          icon="logout"
          :destructive="true"
          :label="$t('shell.logOut')"
          kind="ghost"
          @click="logout"
        />
      </div>
    </div>
  </div>
</template>
