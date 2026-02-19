<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { LxList, LxLoader, LxForm, LxTextInput, LxRow } from '@dativa-lv/lx-ui';
import { useRouter, useRoute } from 'vue-router';
import { Configuration, FrontendApi } from '@ory/client';
import { useI18n } from 'vue-i18n';
import useViewStore from '@/stores/useViewStore';
import useAuthStore from '@/stores/useAuthStore';
import useNotifyStore from '@/stores/useNotifyStore';

const $t = useI18n().t;
const route = useRoute();
const notify = useNotifyStore();
const router = useRouter();
const viewStore = useViewStore();
const authStore = useAuthStore();

const loading = ref(true);
const flowId = computed(() => route.query.flow);
const flow = ref();
const oidcForm = ref();
const passwordForm = ref();
const oidcNodes = ref([]);
const csrfToken = ref(null);
const selectedProvider = ref(null);
const identifierNode = ref(null);
const passwordNode = ref({});
const { authUrl } = window.config;
const ory = new FrontendApi(
  new Configuration({
    basePath: authUrl,
    baseOptions: {
      // Ensures we send cookies in the CORS requests.
      withCredentials: true,
    },
  })
);
const busy = ref(false);
const resolveProviderAttributes = (code) => {
  switch (code) {
    case 'google':
      return {
        iconSet: 'brand',
        icon: 'google',
      };
    default:
      return null;
  }
};

function getMappedMessage(messageKey, defaultText) {
  const translatedMessage = $t(`pages.login.errors.${messageKey}`);
  if (translatedMessage === `pages.login.errors.${messageKey}`) {
    return defaultText;
  }
  return translatedMessage;
}
function getErrorMessage(node) {
  if (!node.messages.length) {
    return '';
  }
  const messageKey = node.messages[0].id;
  return getMappedMessage(messageKey, node.messages[0].text);
}

function notifyMappedError(message) {
  const messageKey = message.id;
  const mappedMessage = getMappedMessage(messageKey, message.text);
  switch (message.type) {
    case 'error':
      notify.pushError(mappedMessage);
      break;
    case 'success':
      notify.pushSuccess(mappedMessage);
      break;
    case 'info':
      notify.pushInfo(mappedMessage);
      break;
    case 'warning':
      notify.pushWarning(mappedMessage);
      break;
    default:
      notify.pushError(mappedMessage);
      break;
  }
}

function parseFlow() {
  if (flow.value.ui.messages && flow.value.ui.messages.length > 0) {
    flow.value.ui.messages.forEach((message) => {
      notifyMappedError(message);
    });
  }
  flow.value.ui.nodes.forEach((node) => {
    if (node.group === 'oidc') {
      const providerAttributes = resolveProviderAttributes(node.attributes.value);
      oidcNodes.value.push({
        id: node.attributes.value,

        name: $t(`pages.login.options.${node.attributes.value}.name`),
        description: $t(`pages.login.options.${node.attributes.value}.description`),
        clickable: true,
        iconSet: providerAttributes?.iconSet || undefined,
        icon: providerAttributes?.icon || 'next',
      });
    }
    if (node.group === 'default' && node.attributes.name === 'csrf_token') {
      csrfToken.value = node.attributes.value;
    }
    if (node.group === 'password' && node.attributes.type === 'password') {
      passwordNode.value = node;
    }
    if (node.group === 'default' && node.attributes.name === 'identifier') {
      identifierNode.value = node;
    }
  });
}

async function initFlow() {
  try {
    const { data } = await ory.createBrowserLoginFlow();
    router.replace({ query: { flow: data.id } });
    flow.value = data;
    parseFlow();
    loading.value = false;
  } catch (err) {
    if (err?.response?.data?.error?.id === 'session_already_available') {
      router.push({ name: 'dashboard' });
      return;
    }
    router.push('/error');
  }
}

onMounted(() => {
  viewStore.showBack();
  if (authStore.isAuthorized) {
    viewStore.showNavBar();
  } else {
    viewStore.hideNavBar();
  }

  if (!flowId.value) {
    initFlow();
    return;
  }

  ory
    .getLoginFlow({ id: flowId.value })
    .then(({ data }) => {
      flow.value = data;
      parseFlow();
      loading.value = false;
    })
    .catch(() => {
      router.push('/error');
    });
});
function selectProvider(id, itemId) {
  selectedProvider.value = itemId;
  nextTick(() => {
    if (oidcForm.value) {
      oidcForm.value.submit();
    }
  });
}

function passwordFormSubmit(actionId) {
  if (actionId === 'register') {
    window.location.href = `${authUrl}self-service/registration/browser`;
    return;
  }
  if (actionId === 'recovery') {
    window.location.href = `${authUrl}self-service/recovery/browser`;
    return;
  }
  nextTick(() => {
    busy.value = true;
    if (passwordForm.value) {
      passwordForm.value.submit();
    }
  });
}
const passwordFormActions = computed(() => [
  {
    id: 'submit',
    icon: 'next',
    name: $t('pages.login.buttons.signIn'),
    kind: 'primary',
    busy: busy.value,
  },
  // {
  //   id: 'register',
  //   icon: 'add-user',
  //   name: $t('pages.login.buttons.register'),
  //   kind: 'secondary',
  // },
  // {
  //   id: 'recovery',
  //   icon: 'help',
  //   name: $t('pages.login.buttons.forgotPassword'),
  //   kind: 'tertiary',
  // },
]);
</script>
<template>
  <LxLoader :loading="loading" />
  <div v-if="!loading">
    <LxList
      v-if="oidcNodes.length > 0"
      :items="oidcNodes"
      @actionClick="selectProvider"
      style="margin-bottom: 20px"
    >
    </LxList>
    <LxForm
      id="signin-form"
      :showHeader="false"
      :stickyFooter="false"
      :action-definitions="passwordFormActions"
      @actionClick="passwordFormSubmit"
      v-if="identifierNode && passwordNode"
    >
      <LxRow :label="$t('pages.login.email')">
        <LxTextInput
          id="username"
          v-model="identifierNode.attributes.value"
          :required="identifierNode.attributes.required"
          :invalid="identifierNode.messages.length > 0"
          :invalidationMessage="getErrorMessage(identifierNode)"
        />
      </LxRow>
      <LxRow :label="$t('pages.login.password')">
        <LxTextInput
          id="password"
          kind="password"
          @keyup.enter="passwordFormSubmit()"
          v-model="passwordNode.attributes.value"
          :invalid="passwordNode.messages.length > 0"
          :invalidationMessage="getErrorMessage(passwordNode)"
        />
      </LxRow>
    </LxForm>
  </div>

  <form :action="flow.ui.action" :method="flow.ui.method" ref="oidcForm" v-if="flow">
    <input type="hidden" name="provider" :value="selectedProvider" />
    <input type="hidden" name="csrf_token" :value="csrfToken" />
  </form>
  <form
    :action="flow.ui.action"
    :method="flow.ui.method"
    ref="passwordForm"
    v-if="flow && identifierNode && passwordNode"
  >
    <input type="hidden" name="method" value="password" />
    <input type="hidden" name="identifier" :value="identifierNode.attributes.value" />
    <input type="hidden" name="password" :value="passwordNode.attributes.value" />
    <input type="hidden" name="csrf_token" :value="csrfToken" />
  </form>
</template>
