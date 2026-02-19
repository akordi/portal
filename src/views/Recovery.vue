<script setup>
import useAuthStore from '@/stores/useAuthStore';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';
import { Configuration, FrontendApi } from '@ory/client';
import { LxForm, LxLoader, LxRow, LxTextInput } from '@dativa-lv/lx-ui';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

const $t = useI18n().t;
const route = useRoute();
const notify = useNotifyStore();
const router = useRouter();
const viewStore = useViewStore();
const authStore = useAuthStore();
const loading = ref(true);
const flowId = computed(() => route.query.flow);
const flow = ref();
const emailNode = ref(null);
const codeNode = ref(null);
const submitEmailForm = ref(null);
const submitCodeForm = ref(null);
const resendForm = ref(null);
const csrfToken = ref(null);

const { authUrl } = window.config;
const ory = new FrontendApi(
  new Configuration({
    basePath: authUrl,
    baseOptions: {
      withCredentials: true,
    },
  })
);
const busy = ref(false);

function getMappedMessage(messageKey, defaultText) {
  const translatedMessage = $t(`pages.login.errors.${messageKey}`);
  if (translatedMessage === `pages.login.errors.${messageKey}`) {
    return defaultText;
  }
  return translatedMessage;
}
function getErrorMessage(node) {
  if (!node || !node.messages || !node.messages.length) {
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
    if (node.group === 'default' && node.attributes.name === 'csrf_token') {
      csrfToken.value = node.attributes.value;
    }
    if (node.attributes.name === 'email') {
      emailNode.value = node;
    }
    if (node.attributes.name === 'code') {
      codeNode.value = node;
    }
  });
}

async function initFlow() {
  try {
    const { data } = await ory.createBrowserRecoveryFlow();
    router.replace({ query: { flow: data.id } });
    flow.value = data;
    parseFlow();
    loading.value = false;
  } catch (err) {
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
    .getRecoveryFlow({ id: flowId.value })
    .then(({ data }) => {
      flow.value = data;

      if (data.state === 'passed_challenge') {
        // Recovery completed
        return;
      }
      parseFlow();
      loading.value = false;
    })
    .catch(() => {
      initFlow();
    });
});

function formSubmit(actionId) {
  if (actionId === 'submit') {
    nextTick(() => {
      busy.value = true;
      if (submitEmailForm.value) {
        submitEmailForm.value.submit();
      }
    });
    return;
  }
  if (actionId === 'verify') {
    nextTick(() => {
      busy.value = true;
      if (submitCodeForm.value) {
        submitCodeForm.value.submit();
      }
    });
    return;
  }
  if (actionId === 'resend') {
    nextTick(() => {
      busy.value = true;
      if (resendForm.value) {
        resendForm.value.submit();
      }
    });
  }
}

const formActions = computed(() => {
  if (codeNode.value) {
    return [
      {
        id: 'resend',
        icon: 'next',
        name: $t('pages.recovery.buttons.resend'),
        kind: 'tertiary',
        busy: busy.value,
      },
      {
        id: 'verify',
        icon: 'next',
        name: $t('pages.recovery.buttons.verify'),
        kind: 'primary',
        busy: busy.value,
      },
    ];
  }
  return [
    {
      id: 'submit',
      icon: 'next',
      name: $t('pages.recovery.buttons.submit'),
      kind: 'primary',
      busy: busy.value,
    },
  ];
});
</script>

<template>
  <LxLoader :loading="loading" />
  <div v-if="!loading">
    <LxForm
      id="recovery-form"
      :showHeader="false"
      :stickyFooter="false"
      :action-definitions="formActions"
      @actionClick="formSubmit"
    >
      <LxRow
        v-if="emailNode && emailNode.attributes.type === 'email'"
        :label="$t('pages.recovery.email')"
      >
        <LxTextInput
          id="email"
          v-model="emailNode.attributes.value"
          :required="emailNode.attributes.required"
          :invalid="emailNode.messages.length > 0"
          @keyup.enter="formSubmit('submit')"
          :invalidationMessage="getErrorMessage(emailNode)"
        />
      </LxRow>
      <LxRow v-if="codeNode" :label="$t('pages.recovery.code')">
        <LxTextInput
          id="code"
          v-model="codeNode.attributes.value"
          :required="codeNode.attributes.required"
          :invalid="codeNode.messages.length > 0"
          @keyup.enter="formSubmit('verify')"
          :invalidationMessage="getErrorMessage(codeNode)"
        />
      </LxRow>
    </LxForm>
  </div>

  <form :action="flow.ui.action" :method="flow.ui.method" ref="submitEmailForm" v-if="flow">
    <input type="hidden" name="csrf_token" :value="csrfToken" />
    <input type="hidden" name="method" value="code" />
    <input v-if="emailNode" type="hidden" name="email" :value="emailNode.attributes.value" />
  </form>

  <form :action="flow.ui.action" :method="flow.ui.method" ref="submitCodeForm" v-if="flow">
    <input type="hidden" name="csrf_token" :value="csrfToken" />
    <input type="hidden" name="method" value="code" />
    <input v-if="codeNode" type="hidden" name="code" :value="codeNode.attributes.value" />
  </form>

  <form :action="flow.ui.action" :method="flow.ui.method" ref="resendForm" v-if="flow && emailNode">
    <input type="hidden" name="csrf_token" :value="csrfToken" />
    <input type="hidden" name="method" value="code" />
    <input type="hidden" name="email" :value="emailNode.attributes.value" />
  </form>
</template>
