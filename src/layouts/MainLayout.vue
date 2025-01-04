<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
// ToDo: develop login & get session
// eslint-disable-next-line no-unused-vars
import CoverBackground from "@/components/CoverBackground.vue";
import { invoke, until, useIdle, useIntervalFn } from "@vueuse/core";
import { LxShell } from "@wntr/lx-ui";

import useErrors from "@/hooks/useErrors";
import useAppStore from "@/stores/useAppStore";
import useAuthStore from "@/stores/useAuthStore";
import useConfirmStore from "@/stores/useConfirmStore";
import useNotifyStore from "@/stores/useNotifyStore";
import useViewStore from "@/stores/useViewStore";
import LoginView from "@/views/Login.vue";

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

const idleModalOpened = ref(false);
const translate = useI18n();
const $t = translate.t;
const route = useRoute();
const shellMode = computed(() => {
  let ret = "default";
  if (route.path === "/") {
    ret = "cover";
  }
  return ret;
});

const nav = [
  {
    label: $t("pages.dashboard.title"),
    icon: "dashboard",
    to: { name: "dashboard" },
  },
  {
    label: $t("pages.akordiSongList.title"),
    icon: "search-details",
    to: { name: "akordiSongList" },
  },
  {
    label: $t("pages.akordiSongListNew.title"),
    icon: "time",
    to: { name: "akordiSongListNew" },
  },
  {
    label: $t("pages.akordiSongListTop.title"),
    icon: "star-filled",
    to: { name: "akordiSongListTop" },
  },
  {
    label: $t("pages.akordiArtistLetter.title"),
    icon: "users",
    to: { name: "akordiArtistLetter", params: { letter: "0" } },
  },
  {
    label: $t("pages.tagList.title"),
    icon: "tag",
    to: { name: "tagList" },
  },
  {
    label: $t("pages.songNew.title"),
    icon: "add-item",
    to: { name: "songNew" },
  },
  {
    label: "Skatīt profilu",
    icon: "user-profile",
    to: { name: "userProfile" },
    type: "user-menu",
  },
];

const coverLogo = ref("/imgs/logo-50.svg");

const bodyObserver = new MutationObserver((mutationsList) => {
  const classMutation = mutationsList.find(
    (mutation) =>
      mutation.type === "attributes" && mutation.attributeName === "class"
  );

  if (classMutation) {
    const newClass = document.body.className;

    if (newClass.includes("theme-dark")) {
      coverLogo.value = "/imgs/logo-50.svg";
    } else if (newClass.includes("theme-contrast")) {
      coverLogo.value = "/imgs/logo-50.svg";
    } else {
      coverLogo.value = "/imgs/logo-50-dark.svg";
    }
  }
});
onMounted(() => {
  // Observe when the html body element class changes so we can reliably detect which theme is active
  bodyObserver?.observe(document.body, { attributes: true });
});

const systemName = computed(() => $t("title.shortName"));
const pageTitle = computed(
  () => viewStore.title || $t(router.currentRoute.value.meta.title)
);
const pageDescription = computed(() => viewStore.description);

const breadcrumbs = computed(() => {
  const ret = [];

  if (route.meta.breadcrumbs) {
    route.meta.breadcrumbs.forEach((item) => {
      ret.push({
        label: $t(item.text),
        to: item.to,
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
  router.push({ name: "dashboard" });
}

const userInfo = computed(() => {
  if (authStore.isAuthorized) {
    return {
      firstName: authStore.session?.given_name,
      lastName: authStore.session?.family_name,
      description: authStore.session?.role
        ? t(`roles.${authStore.session?.role}`)
        : null,
      institution: null,
    };
  }
  return null;
});

const theme = ref("auto");

const closeModal = () => {
  idleModalOpened.value = false;
};

const openModal = () => {
  idleModalOpened.value = true;
};

async function logout(redirectPath = "") {
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
      router.push({ name: "sessionEnded" });
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
  confirmStore.push(
    "Iziet",
    "Vai tiešām vēlaties iziet?",
    "Jā",
    "Nē",
    primary,
    secondary
  );
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
      router.push({ name: "sessionEnded" });
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
  const refreshIntervals =
    authStore.session.secondsToLive % secondsCheckApiInterval === 0;
  const refreshBeforeWarn =
    authStore.session.secondsToLive - 3 <
    authStore.session.secondsToCountdown && !idle.value;
  const refreshBeforeLogout = authStore.session.secondsToLive === 3;
  if (refreshIntervals || refreshBeforeWarn || refreshBeforeLogout) {
    checkApiSession();
  }
  authStore.session.secondsToLive -= 1;
}, 1000);

async function continueSession() {
  try {
    await authStore.extendSession();
    notify.pushSuccess($t("shell.notifications.sessionContinued"));
  } catch (err) {
    notify.pushError($t("shell.notifications.sessionContinuedFailed"));
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
  notify.pushWarning($t("shell.notifications.sessionEndingSoon"));
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
      <LxShell :system-name="$t('title.fullName')" :system-subheader="$t('title.subheader')"
        :system-name-short="systemName" :user-info="userInfo" :nav-items="nav" :nav-items-selected="selectedNavItems"
        :mode="shellMode" :page-label="pageTitle" :page-description="pageDescription"
        :page-back-button-visible="showBackButton" :page-breadcrumbs="breadcrumbs"
        :page-index-path="{ name: 'dashboard' }" :has-language-picker="false" :has-cover-logo="true" :cover-image="null"
        :cover-image-dark="null" :cover-logo="coverLogo" :has-alerts="false" :has-help="false" :has-theme-picker="true"
        :navigating="appStore.$state.isNavigating" :showIdleModal="idleModalOpened"
        :secondsToLive="authStore.session.secondsToLive" :confirmDialogData="confirmStore"
        :confirmPrimaryButtonBusy="false" :confirmPrimaryButtonDestructive="true"
        v-model:notifications="notify.notifications" v-model:theme="theme" @confirmModalClosed="confirmModalClosed"
        @go-home="goHome" @go-back="goBack" @log-out="openConfirmModal" @idleModalPrimary="idleModalPrimary"
        @idleModalSecondary="idleModalSecondary">
        <template #backdrop>
          <CoverBackground />
        </template>
        <template #coverArea>
          <div class="lx-button-set">
            <LoginView></LoginView>
          </div>
        </template>

        <template #logoSmall>
          <img id="logo-light"
            src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pgo8c3ZnIHZlcnNpb249IjEuMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogdmlld0JveD0iMCAwIDE4MC4wMDAwMDAgMTgwLjAwMDAwMCIKIHByZXNlcnZlQXNwZWN0UmF0aW89InhNaWRZTWlkIG1lZXQiPgo8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLjAwMDAwMCwxODAuMDAwMDAwKSBzY2FsZSgwLjEwMDAwMCwtMC4xMDAwMDApIgpmaWxsPSIjZmZmIiBzdHJva2U9Im5vbmUiPgo8cGF0aCBkPSJNODAxIDE2NTAgYy0xMzAgLTYyIC0yODMgLTI1NSAtNDE2IC01MjUgLTExMCAtMjIzIC0xNTUgLTM4NyAtMTU1Ci01NTkgMCAtMTc1IDM5IC0yNTAgMTY4IC0zMTkgNTIgLTI4IDIyMiAtOTAgMjI5IC04MyAyIDIgLTUgMjQgLTE2IDQ5IC01NwoxMzQgLTQ5IDIyOCAzMCAzNTIgNTMgODMgNTQgODUgMjQgMTY0IC0yNyA3NCAwIDE0MSA1OCAxNDEgMzIgMCAxMTcgLTQ0IDExNwotNjAgMCAtNiA1IC0xMCAxMiAtMTAgMTUgMCA0IDM5NSAtMTEgNDE0IC02IDcgLTggMTYgLTMgMjAgNCA0IC0xIDEyIC0xMSAxNwotMjQgMTQgLTIxIDI5IDUgMjkgMjEgMCAyMSAwIDIgMTQgLTE4IDE0IC0xOCAxNSA2IDI1IDE0IDUgMTkgMTAgMTMgMTAgLTcgMQotMTMgOCAtMTMgMTcgMCAxMCA2IDE0IDE1IDEwIDggLTMgMTUgLTEgMTUgNCAwIDYgLTQgMTAgLTEwIDEwIC01IDAgLTEwIDcKLTEwIDE1IDAgOCA4IDE1IDE3IDE1IDEzIDAgMTQgMyA1IDEyIC0xNyAxNyAtMTUgMjggNiAyOSAxMCAwIDEyIDMgNSA2IC0xOCA3Ci0xNiAzMyAyIDMzIDkgMCAyNyA3IDQwIDE2IDIzIDE1IDI3IDE1IDUwIDAgMzAgLTIwIDMzIC01NiA2IC04MCAtMTggLTE3IC0xOQotMjEgLTUgLTY0IDE5IC02NSAxOCAtODcgLTggLTEwNSAtMjMgLTE1IC0yMyAtMTUgLTIyIC0yNzEgMSAtMTQyIDQgLTI1OSA3Ci0yNjIgMyAtMyAyNCA0IDQ3IDE2IDIzIDEyIDU0IDIwIDY4IDE4IDM2IC00IDQwIC00NCAxMiAtMTExIC0yNyAtNjEgLTIzIC04NwoyNiAtMTYzIDQ3IC03MyA4MiAtMTYwIDk3IC0yNDAgbDEyIC02MyA4OSAzNCBjMTgxIDY4IDI0OCAxNDEgMjYzIDI4NiAyNCAyMzEKLTcwIDUyMiAtMjc4IDg1OCAtMTE1IDE4NyAtMjgzIDMzMSAtMzg1IDMzMSAtMjMgMCAtNjYgLTEzIC0xMDMgLTMweiIvPgo8L2c+Cjwvc3ZnPgo="
            alt="Logo" />
          <img id="logo-dark"
            src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pgo8c3ZnIHZlcnNpb249IjEuMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogd2lkdGg9IjE4MC4wMDAwMDBwdCIgaGVpZ2h0PSIxODAuMDAwMDAwcHQiIHZpZXdCb3g9IjAgMCAxODAuMDAwMDAwIDE4MC4wMDAwMDAiCiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJ4TWlkWU1pZCBtZWV0Ij4KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMC4wMDAwMDAsMTgwLjAwMDAwMCkgc2NhbGUoMC4xMDAwMDAsLTAuMTAwMDAwKSIKZmlsbD0iI2ZmZiIgc3Ryb2tlPSJub25lIj4KPHBhdGggZD0iTTgwMSAxNjUwIGMtMTMwIC02MiAtMjgzIC0yNTUgLTQxNiAtNTI1IC0xMTAgLTIyMyAtMTU1IC0zODcgLTE1NQotNTU5IDAgLTE3NSAzOSAtMjUwIDE2OCAtMzE5IDUyIC0yOCAyMjIgLTkwIDIyOSAtODMgMiAyIC01IDI0IC0xNiA0OSAtNTcKMTM0IC00OSAyMjggMzAgMzUyIDUzIDgzIDU0IDg1IDI0IDE2NCAtMjcgNzQgMCAxNDEgNTggMTQxIDMyIDAgMTE3IC00NCAxMTcKLTYwIDAgLTYgNSAtMTAgMTIgLTEwIDE1IDAgNCAzOTUgLTExIDQxNCAtNiA3IC04IDE2IC0zIDIwIDQgNCAtMSAxMiAtMTEgMTcKLTI0IDE0IC0yMSAyOSA1IDI5IDIxIDAgMjEgMCAyIDE0IC0xOCAxNCAtMTggMTUgNiAyNSAxNCA1IDE5IDEwIDEzIDEwIC03IDEKLTEzIDggLTEzIDE3IDAgMTAgNiAxNCAxNSAxMCA4IC0zIDE1IC0xIDE1IDQgMCA2IC00IDEwIC0xMCAxMCAtNSAwIC0xMCA3Ci0xMCAxNSAwIDggOCAxNSAxNyAxNSAxMyAwIDE0IDMgNSAxMiAtMTcgMTcgLTE1IDI4IDYgMjkgMTAgMCAxMiAzIDUgNiAtMTggNwotMTYgMzMgMiAzMyA5IDAgMjcgNyA0MCAxNiAyMyAxNSAyNyAxNSA1MCAwIDMwIC0yMCAzMyAtNTYgNiAtODAgLTE4IC0xNyAtMTkKLTIxIC01IC02NCAxOSAtNjUgMTggLTg3IC04IC0xMDUgLTIzIC0xNSAtMjMgLTE1IC0yMiAtMjcxIDEgLTE0MiA0IC0yNTkgNwotMjYyIDMgLTMgMjQgNCA0NyAxNiAyMyAxMiA1NCAyMCA2OCAxOCAzNiAtNCA0MCAtNDQgMTIgLTExMSAtMjcgLTYxIC0yMyAtODcKMjYgLTE2MyA0NyAtNzMgODIgLTE2MCA5NyAtMjQwIGwxMiAtNjMgODkgMzQgYzE4MSA2OCAyNDggMTQxIDI2MyAyODYgMjQgMjMxCi03MCA1MjIgLTI3OCA4NTggLTExNSAxODcgLTI4MyAzMzEgLTM4NSAzMzEgLTIzIDAgLTY2IC0xMyAtMTAzIC0zMHoiLz4KPC9nPgo8L3N2Zz4K"
            alt="Logo" />
          <img id="logo-contrast"
            src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pgo8c3ZnIHZlcnNpb249IjEuMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogdmlld0JveD0iMCAwIDE4MC4wMDAwMDAgMTgwLjAwMDAwMCIKIHByZXNlcnZlQXNwZWN0UmF0aW89InhNaWRZTWlkIG1lZXQiPgo8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLjAwMDAwMCwxODAuMDAwMDAwKSBzY2FsZSgwLjEwMDAwMCwtMC4xMDAwMDApIgpmaWxsPSIjZmZmIiBzdHJva2U9Im5vbmUiPgo8cGF0aCBkPSJNODAxIDE2NTAgYy0xMzAgLTYyIC0yODMgLTI1NSAtNDE2IC01MjUgLTExMCAtMjIzIC0xNTUgLTM4NyAtMTU1Ci01NTkgMCAtMTc1IDM5IC0yNTAgMTY4IC0zMTkgNTIgLTI4IDIyMiAtOTAgMjI5IC04MyAyIDIgLTUgMjQgLTE2IDQ5IC01NwoxMzQgLTQ5IDIyOCAzMCAzNTIgNTMgODMgNTQgODUgMjQgMTY0IC0yNyA3NCAwIDE0MSA1OCAxNDEgMzIgMCAxMTcgLTQ0IDExNwotNjAgMCAtNiA1IC0xMCAxMiAtMTAgMTUgMCA0IDM5NSAtMTEgNDE0IC02IDcgLTggMTYgLTMgMjAgNCA0IC0xIDEyIC0xMSAxNwotMjQgMTQgLTIxIDI5IDUgMjkgMjEgMCAyMSAwIDIgMTQgLTE4IDE0IC0xOCAxNSA2IDI1IDE0IDUgMTkgMTAgMTMgMTAgLTcgMQotMTMgOCAtMTMgMTcgMCAxMCA2IDE0IDE1IDEwIDggLTMgMTUgLTEgMTUgNCAwIDYgLTQgMTAgLTEwIDEwIC01IDAgLTEwIDcKLTEwIDE1IDAgOCA4IDE1IDE3IDE1IDEzIDAgMTQgMyA1IDEyIC0xNyAxNyAtMTUgMjggNiAyOSAxMCAwIDEyIDMgNSA2IC0xOCA3Ci0xNiAzMyAyIDMzIDkgMCAyNyA3IDQwIDE2IDIzIDE1IDI3IDE1IDUwIDAgMzAgLTIwIDMzIC01NiA2IC04MCAtMTggLTE3IC0xOQotMjEgLTUgLTY0IDE5IC02NSAxOCAtODcgLTggLTEwNSAtMjMgLTE1IC0yMyAtMTUgLTIyIC0yNzEgMSAtMTQyIDQgLTI1OSA3Ci0yNjIgMyAtMyAyNCA0IDQ3IDE2IDIzIDEyIDU0IDIwIDY4IDE4IDM2IC00IDQwIC00NCAxMiAtMTExIC0yNyAtNjEgLTIzIC04NwoyNiAtMTYzIDQ3IC03MyA4MiAtMTYwIDk3IC0yNDAgbDEyIC02MyA4OSAzNCBjMTgxIDY4IDI0OCAxNDEgMjYzIDI4NiAyNCAyMzEKLTcwIDUyMiAtMjc4IDg1OCAtMTE1IDE4NyAtMjgzIDMzMSAtMzg1IDMzMSAtMjMgMCAtNjYgLTEzIC0xMDMgLTMweiIvPgo8L2c+Cjwvc3ZnPgo="
            alt="Logo" />
        </template>

        <router-view />
      </LxShell>
    </div>
  </div>
</template>
