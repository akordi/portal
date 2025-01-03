<script setup>
import useAuthStore from "@/stores/useAuthStore";
import useViewStore from "@/stores/useViewStore";
import { LxButton, LxList } from "@wntr/lx-ui";
import { onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const viewStore = useViewStore();
const authStore = useAuthStore();
const router = useRouter();
const $t = useI18n().t;

function login(id, itemId) {
  const retPath = router.currentRoute.value?.query?.returnPath;
  authStore.login(retPath);
}

onMounted(() => {
  viewStore.showBack();
  if (authStore.isAuthorized) {
    viewStore.showNavBar();
  } else {
    viewStore.hideNavBar();
  }
});
</script>
<template>
  <LxButton
    :href="{ name: 'dashboard' }"
    :label="$t('pages.home.buttons.loginUnauthorized')"
    icon="dashboard"
  />
</template>
